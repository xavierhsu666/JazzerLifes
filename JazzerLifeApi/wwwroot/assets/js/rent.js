/**
 * JazzerLife Rent（租屋處電費管理）前端邏輯
 * 比照 macro.js 的輕量寫法：jQuery + 簡單 DOM 操作，不使用完整 class 架構
 *
 * Tab1「電費計算」的表格刻意不用 ag-Grid：ag-Grid 有虛擬捲動，畫面外的列不會真的存在於 DOM，
 * 用 html2canvas 擷取「複製表格圖片」時會漏掉看不到的列；房間數量本來就不多，
 * 改用一般 <table> 最單純可靠，也比較好排成帳單樣式。
 */

var RentApp = {
    state: {
        properties: [],
        currentPropertyId: null,
        billMonth: null, // "yyyy-MM"
        billRows: [],     // 目前畫面上的帳單列（含草稿列）
        showInactiveRooms: false,
    },

    init: function () {
        var self = this;
        $.get("/api/auth/me")
            .done(function (data) {
                $("#sidebarUserName").text(data.account || "已登入");
                self.state.billMonth = self.getCurrentYearMonth();
                $("#billMonthInput").val(self.state.billMonth);
                self.bindNav();
                self.bindBillView();
                self.bindRoomsView();
                self.bindMasterMeterView();
                self.loadProperties();
            })
            .fail(function () {
                window.location.assign("/signin.html#rent/rent");
            });
    },

    getCurrentYearMonth: function () {
        var d = new Date();
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, "0");
        return y + "-" + m;
    },

    /** ==================== 側邊欄/底部導覽列 ==================== */
    bindNav: function () {
        var self = this;

        $("#sidebarToggle, #floatingMenuBtn").on("click", function () {
            $("#sidebar").toggleClass("active");
            $("#floatingMenuBtn").toggleClass("active");
        });

        $(document).on("click", function (e) {
            var $sidebar = $("#sidebar");
            if (!$sidebar.hasClass("active")) return;
            var clickedInsideSidebar = $sidebar.is(e.target) || $sidebar.has(e.target).length > 0;
            var clickedToggle = $("#sidebarToggle").is(e.target) || $("#sidebarToggle").has(e.target).length > 0;
            var clickedFloating = $("#floatingMenuBtn").is(e.target) || $("#floatingMenuBtn").has(e.target).length > 0;
            if (!clickedInsideSidebar && !clickedToggle && !clickedFloating) {
                $sidebar.removeClass("active");
                $("#floatingMenuBtn").removeClass("active");
            }
        });

        $(".nav-item, .app-bottom-nav-item").on("click", function () {
            var feature = $(this).data("feature");
            if (!feature) return;
            self.switchFeature(feature);
            $("#sidebar").removeClass("active");
            $("#floatingMenuBtn").removeClass("active");
        });

        $("#propertySelect").on("change", function () {
            self.state.currentPropertyId = Number($(this).val());
            self.reloadCurrentView();
        });
    },

    switchFeature: function (feature) {
        $(".nav-item").removeClass("active");
        $(".nav-item[data-feature='" + feature + "']").addClass("active");
        $(".app-bottom-nav-item").removeClass("active");
        $(".app-bottom-nav-item[data-feature='" + feature + "']").addClass("active");

        $(".content-view").addClass("hidden");
        $("#view-" + feature).removeClass("hidden");

        this.reloadCurrentView(feature);
    },

    reloadCurrentView: function (feature) {
        var current = feature || $(".content-view:not(.hidden)").data("view");
        if (!this.state.currentPropertyId) return;
        if (current === "rooms") {
            this.loadRooms();
        } else if (current === "master") {
            this.loadMasterMeterView();
        } else {
            this.loadBill();
        }
    },

    /** ==================== 出租物件 ==================== */
    loadProperties: function () {
        var self = this;
        $.get("/api/rent/properties").done(function (properties) {
            if (!properties || properties.length === 0) {
                // 使用者第一次使用本模組，還沒有任何出租物件，先自動建立一筆預設物件，
                // 避免使用者一進頁面就要先搞懂「物件」是什麼才能開始用
                $.ajax({
                    url: "/api/rent/properties",
                    method: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({ PropertyName: "我的租屋處", Address: null }),
                }).done(function () {
                    self.loadProperties();
                });
                return;
            }

            self.state.properties = properties;
            if (!self.state.currentPropertyId || !properties.some(function (p) { return p.PropertyId === self.state.currentPropertyId; })) {
                var active = properties.find(function (p) { return p.IsActive; }) || properties[0];
                self.state.currentPropertyId = active.PropertyId;
            }

            self.renderPropertySelect();
            self.loadBill();
        }).fail(function (xhr) {
            if (xhr.status === 401) {
                window.location.assign("/signin.html#rent/rent");
            }
        });
    },

    renderPropertySelect: function () {
        var self = this;
        var html = "";
        this.state.properties.forEach(function (p) {
            var sel = (p.PropertyId === self.state.currentPropertyId) ? " selected" : "";
            var label = p.PropertyName + (p.IsActive ? "" : "（已停用）");
            html += '<option value="' + p.PropertyId + '"' + sel + '>' + label + '</option>';
        });
        $("#propertySelect").html(html);
    },

    /** ==================== Tab1：電費計算 ==================== */
    bindBillView: function () {
        var self = this;

        $("#billMonthInput").on("change", function () {
            var v = $(this).val();
            if (!v) return;
            self.state.billMonth = v;
            self.loadBill();
        });

        $("#btnReloadBill").on("click", function () { self.loadBill(); });

        $("#btnSaveBill").on("click", function () { self.saveBill(); });

        $("#btnApplyPublicElectricity").on("click", function () {
            self.applyPublicElectricityToBill($(this));
        });

        $("#btnCopyWholeTable").on("click", function () {
            self.copyWholeTable($(this));
        });

        $("#btnCopyElectricityOnly").on("click", function () {
            self.copyElectricityOnly($(this));
        });
    },

    loadBill: function () {
        var self = this;
        if (!self.state.currentPropertyId) return;

        $("#billCaptureTitle").text(self.state.billMonth + " 電費／房租帳單");
        $("#billTableBody").html('<tr><td colspan="12" style="text-align:center;color:var(--color-text-secondary);">載入中...</td></tr>');

        $.get("/api/rent/bills", { propertyId: self.state.currentPropertyId, month: self.state.billMonth })
            .done(function (rows) {
                self.state.billRows = rows || [];
                self.renderBillTable();
            })
            .fail(function (xhr) {
                if (xhr.status === 401) {
                    window.location.assign("/signin.html#rent/rent");
                    return;
                }
                $("#billTableBody").html('<tr><td colspan="12" style="text-align:center;color:var(--color-text-secondary);">載入失敗，請稍後重試</td></tr>');
            });
    },

    renderBillTable: function () {
        var self = this;
        var rows = self.state.billRows;

        if (!rows || rows.length === 0) {
            $("#billTableBody").html('<tr><td colspan="12" style="text-align:center;color:var(--color-text-secondary);">此物件尚無啟用中的房間，請先到「房間設定」新增</td></tr>');
            $("#billTotalAmount").text("0");
            return;
        }

        var html = "";
        rows.forEach(function (r) {
            var paidBtn = r.BillId
                ? '<button type="button" class="paid-badge ' + (r.IsPaid ? "is-paid" : "is-unpaid") + '" data-bill-id="' + r.BillId + '">' + (r.IsPaid ? "已收" : "未收") + '</button>'
                : '<span class="paid-badge is-unpaid" style="opacity:0.5;">尚未建立</span>';

            html += '<tr data-room-id="' + r.RoomId + '">' +
                '<td>' + self.escapeHtml(r.RoomAlias) + '</td>' +
                '<td>' + self.fmtNum(r.PrevReading) + '</td>' +
                '<td><input type="number" step="0.01" class="current-reading-input" value="' + r.CurrentReading + '" /></td>' +
                '<td class="usage-cell">' + self.fmtNum(r.UsageUnits) + '</td>' +
                '<td><input type="number" step="1" class="public-electricity-input" value="' + r.PublicElectricityFee + '" /></td>' +
                '<td class="fee-cell">' + self.fmtMoney(r.ElectricityFee + r.PublicElectricityFee) + '</td>' +
                '<td>' + self.fmtMoney(r.RentSnapshot) + '</td>' +
                '<td>' + self.fmtMoney(r.AdjustmentSnapshot) + '</td>' +
                '<td class="total-cell">' + self.fmtMoney(r.TotalAmount) + '</td>' +
                '<td>' + paidBtn + '</td>' +
                '<td><input type="text" class="note-input" value="' + self.escapeHtml(r.Note || "") + '" placeholder="備註" /></td>' +
                '<td class="action-col"><button type="button" class="btn-secondary row-copy-btn">複製</button></td>' +
                '</tr>';
        });
        $("#billTableBody").html(html);
        self.recalcTotal();
        self.checkRowWarnings();

        $("#billTableBody tr").each(function () {
            var $tr = $(this);
            var roomId = Number($tr.data("room-id"));

            $tr.find(".current-reading-input").on("input", function () {
                self.recalcRow(roomId);
            });

            $tr.find(".public-electricity-input").on("input", function () {
                self.recalcRow(roomId);
            });

            $tr.find(".paid-badge[data-bill-id]").on("click", function () {
                var billId = $(this).data("bill-id");
                self.togglePaid(billId);
            });

            $tr.find(".row-copy-btn").on("click", function () {
                self.copySingleRow(roomId);
            });
        });
    },

    /** 依目前輸入的本月讀數，即時重算用電度數/電費/應繳合計（送出儲存前的前端預覽，正式金額仍以後端計算為準） */
    recalcRow: function (roomId) {
        var self = this;
        var row = self.state.billRows.find(function (r) { return r.RoomId === roomId; });
        if (!row) return;

        var $tr = $("#billTableBody tr[data-room-id='" + roomId + "']");
        var currentReading = parseFloat($tr.find(".current-reading-input").val());
        if (isNaN(currentReading)) currentReading = 0;
        var publicElectricityFee = parseFloat($tr.find(".public-electricity-input").val());
        if (isNaN(publicElectricityFee)) publicElectricityFee = 0;

        var usage = currentReading - row.PrevReading;
        var fee = usage * row.RateSnapshot;
        var totalElectricity = fee + publicElectricityFee; // 總電費 = 本月電費 + 公共電費
        var total = totalElectricity + row.RentSnapshot + row.AdjustmentSnapshot;

        $tr.find(".usage-cell").text(self.fmtNum(usage));
        $tr.find(".fee-cell").text(self.fmtMoney(totalElectricity));
        $tr.find(".total-cell").text(self.fmtMoney(total));

        $tr.toggleClass("bill-row-warning", currentReading < row.PrevReading);

        self.recalcTotal();
    },

    checkRowWarnings: function () {
        var self = this;
        $("#billTableBody tr").each(function () {
            var roomId = Number($(this).data("room-id"));
            self.recalcRow(roomId);
        });
    },

    recalcTotal: function () {
        var self = this;
        var total = 0;
        $("#billTableBody tr .total-cell").each(function () {
            total += self.parseMoney($(this).text());
        });
        $("#billTotalAmount").text(self.fmtMoney(total));
    },

    saveBill: function () {
        var self = this;
        var rows = [];
        $("#billTableBody tr").each(function () {
            var $tr = $(this);
            var roomId = Number($tr.data("room-id"));
            if (!roomId) return;
            var currentReading = parseFloat($tr.find(".current-reading-input").val());
            var publicElectricityFee = parseFloat($tr.find(".public-electricity-input").val());
            rows.push({
                RoomId: roomId,
                CurrentReading: isNaN(currentReading) ? 0 : currentReading,
                PublicElectricityFee: isNaN(publicElectricityFee) ? 0 : publicElectricityFee,
                PrevReadingOverride: null,
                Note: $tr.find(".note-input").val() || null,
            });
        });

        if (rows.length === 0) return;

        var $btn = $("#btnSaveBill");
        $btn.prop("disabled", true).text("儲存中...");

        $.ajax({
            url: "/api/rent/bills",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ PropertyId: self.state.currentPropertyId, BillMonth: self.state.billMonth, Rows: rows }),
        }).done(function () {
            self.loadBill();
        }).fail(function (xhr) {
            alert("儲存失敗：" + (xhr.responseJSON?.message || xhr.statusText));
        }).always(function () {
            $btn.prop("disabled", false).text("儲存本月帳單");
        });
    },

    togglePaid: function (billId) {
        var self = this;
        $.post("/api/rent/bills/" + billId + "/toggle-paid")
            .done(function () { self.loadBill(); })
            .fail(function (xhr) { alert("更新繳費狀態失敗：" + (xhr.responseJSON?.message || xhr.statusText)); });
    },

    /** 加總 Tab1 帳單表格目前畫面上（不管有沒有存檔）的本月用電度數，供試算公共電費時優先使用即時輸入值 */
    computeLiveCurrentMonthUsageSum: function () {
        var self = this;
        var sum = 0;
        $("#billTableBody tr").each(function () {
            var $tr = $(this);
            var roomId = Number($tr.data("room-id"));
            if (!roomId) return;
            var row = self.state.billRows.find(function (r) { return r.RoomId === roomId; });
            if (!row) return;
            var currentReading = parseFloat($tr.find(".current-reading-input").val());
            if (isNaN(currentReading)) currentReading = row.PrevReading;
            sum += (currentReading - row.PrevReading);
        });
        return sum;
    },

    /** Tab1 用的按鈕：直接試算目前月份的公共電費並帶入每一列，不用切去「公共電費」頁籤 */
    applyPublicElectricityToBill: function ($btn) {
        var self = this;
        if (!self.state.currentPropertyId) return;

        $btn.prop("disabled", true).text("試算中...");

        var currentMonthUsage = self.computeLiveCurrentMonthUsageSum();
        $.get("/api/rent/public-electricity-estimate", { propertyId: self.state.currentPropertyId, month: self.state.billMonth, currentMonthUsage: currentMonthUsage })
            .done(function (est) {
                if (!est.HasData) {
                    // 尚無主表資料可試算時，直接把每一列的公共電費當 0 帶入，不跳出中斷操作的提示框
                    self.applyZeroToBillRows();
                    return;
                }
                self.applyEstimateToBillRows(est);
            })
            .fail(function (xhr) {
                if (xhr.status === 401) {
                    window.location.assign("/signin.html#rent/rent");
                    return;
                }
                alert("試算公共電費失敗：" + (xhr.responseJSON?.message || xhr.statusText));
            })
            .always(function () {
                $btn.prop("disabled", false).text("帶入公共電費");
            });
    },

    /** 尚無主表資料可試算時，把每一列的公共電費直接當 0 帶入（使用者仍可自行手動輸入覆蓋） */
    applyZeroToBillRows: function () {
        var self = this;
        $("#billTableBody tr").each(function () {
            var $tr = $(this);
            var roomId = Number($tr.data("room-id"));
            if (!roomId) return;
            $tr.find(".public-electricity-input").val(0);
            self.recalcRow(roomId);
        });
    },

    /** 共用：把試算結果（每房個別金額）套進 Tab1 帳單表格目前顯示的每一列，回傳實際套用的列數 */
    applyEstimateToBillRows: function (est) {
        var self = this;
        var appliedCount = 0;
        $("#billTableBody tr").each(function () {
            var $tr = $(this);
            var roomId = Number($tr.data("room-id"));
            if (!roomId) return;
            var match = (est.RoomBreakdown || []).find(function (b) { return b.RoomId === roomId; });
            if (!match) return;
            $tr.find(".public-electricity-input").val(match.PublicElectricityFee);
            self.recalcRow(roomId);
            appliedCount++;
        });
        return appliedCount;
    },

    /** 複製整表圖片：跟「複製電費圖片」一樣，另外組一份離屏的靜態表格（自然寬度、不放在
     * overflow-x:auto 的捲動容器內）再擷取，不要直接擷取畫面上那個會橫向捲動的即時表格。
     * 原本直接擷取畫面上的 #billCaptureArea，在手機上因為它的父層 .table-container 是
     * overflow-x:auto，表格實際寬度（12 欄）遠超過手機螢幕寬度，html2canvas 對「內容比目前
     * 可視窗口寬、且包在可捲動容器裡」的情境常常算錯尺寸，導致複製失敗或圖片被裁切；
     * 「複製電費圖片」／「複製單一房間」原本就是各自組一份獨立的離屏表格才能穩定運作，這裡統一比照辦理 */
    copyWholeTable: function ($btn) {
        var self = this;
        $btn.prop("disabled", true).text("複製中...");

        var rowsHtml = "";
        $("#billTableBody tr").each(function () {
            var $tr = $(this);
            var roomId = Number($tr.data("room-id"));
            if (!roomId) return;
            var row = self.state.billRows.find(function (r) { return r.RoomId === roomId; });
            if (!row) return;

            var currentReading = parseFloat($tr.find(".current-reading-input").val());
            if (isNaN(currentReading)) currentReading = 0;
            var publicElectricityFee = parseFloat($tr.find(".public-electricity-input").val());
            if (isNaN(publicElectricityFee)) publicElectricityFee = 0;
            var note = $tr.find(".note-input").val() || "";
            var isPaid = $tr.find(".paid-badge").hasClass("is-paid");
            var paidText = row.BillId ? (isPaid ? "已收" : "未收") : "尚未建立";

            var usage = currentReading - row.PrevReading;
            var fee = usage * row.RateSnapshot;
            var totalElectricity = fee + publicElectricityFee; // 總電費 = 本月電費 + 公共電費
            var total = totalElectricity + row.RentSnapshot + row.AdjustmentSnapshot;

            rowsHtml += "<tr>" +
                "<td>" + self.escapeHtml(row.RoomAlias) + "</td>" +
                "<td>" + self.fmtNum(row.PrevReading) + "</td>" +
                "<td>" + self.fmtNum(currentReading) + "</td>" +
                "<td>" + self.fmtNum(usage) + "</td>" +
                "<td>" + self.fmtMoney(publicElectricityFee) + "</td>" +
                "<td>" + self.fmtMoney(totalElectricity) + "</td>" +
                "<td>" + self.fmtMoney(row.RentSnapshot) + "</td>" +
                "<td>" + self.fmtMoney(row.AdjustmentSnapshot) + "</td>" +
                "<td>" + self.fmtMoney(total) + "</td>" +
                "<td>" + paidText + "</td>" +
                "<td>" + self.escapeHtml(note) + "</td>" +
                "</tr>";
        });

        var totalAmountText = $("#billTotalAmount").text();

        var $temp = $('<div class="offscreen-capture" id="tempWholeTableCapture"></div>');
        var innerHtml = '<div id="tempWholeTableInner" style="background-color:var(--color-secondary);padding:24px;width:1080px;">' +
            '<div class="bill-capture-title">' + self.state.billMonth + ' 電費／房租帳單</div>' +
            '<table class="bill-table"><thead><tr>' +
            "<th>房間</th><th>上月讀數</th><th>本月讀數</th><th>用電度數</th><th>公共電費</th><th>總電費</th>" +
            "<th>房租</th><th>調整金額</th><th>應繳合計</th><th>繳費狀態</th><th>備註</th>" +
            "</tr></thead><tbody>" + rowsHtml + "</tbody>" +
            '<tfoot><tr><td colspan="8">總計</td><td>' + self.escapeHtml(totalAmountText) + '</td><td colspan="2"></td></tr></tfoot>' +
            "</table></div>";
        $temp.html(innerHtml);
        $("body").append($temp);

        self.copyElementAsImage(document.getElementById("tempWholeTableInner"), "rent_bill_" + self.state.billMonth)
            .then(function (mode) {
                $btn.text(mode === "clipboard" ? "已複製到剪貼簿！" : "已下載圖片");
                setTimeout(function () { $btn.text("複製整表圖片"); }, 1800);
            })
            .catch(function () {
                alert("複製圖片失敗，請確認瀏覽器支援度或改用下載");
                $btn.text("複製整表圖片");
            })
            .finally(function () {
                $temp.remove();
                $btn.prop("disabled", false);
            });
    },

    /** 複製單一房間帳單：組一份只有該房間的迷你表格，離屏渲染後擷取成圖片 */
    copySingleRow: function (roomId) {
        var self = this;
        var row = self.state.billRows.find(function (r) { return r.RoomId === roomId; });
        if (!row) return;

        var $tr = $("#billTableBody tr[data-room-id='" + roomId + "']");
        var currentReading = parseFloat($tr.find(".current-reading-input").val()) || 0;
        var publicElectricityFee = parseFloat($tr.find(".public-electricity-input").val()) || 0;
        var note = $tr.find(".note-input").val() || "";
        var usage = currentReading - row.PrevReading;
        var fee = usage * row.RateSnapshot;
        var totalElectricity = fee + publicElectricityFee; // 總電費 = 本月電費 + 公共電費
        var total = totalElectricity + row.RentSnapshot + row.AdjustmentSnapshot;

        var $temp = $('<div class="offscreen-capture" id="tempSingleRowCapture"></div>');
        var innerHtml = '<div id="tempSingleRowInner" style="background-color:var(--color-secondary);padding:24px;width:420px;">' +
            '<div class="bill-capture-title">' + self.state.billMonth + ' ' + self.escapeHtml(row.RoomAlias) + ' 電費帳單</div>' +
            '<table class="bill-table"><tbody>' +
            '<tr><td>上月讀數</td><td>' + self.fmtNum(row.PrevReading) + '</td></tr>' +
            '<tr><td>本月讀數</td><td>' + self.fmtNum(currentReading) + '</td></tr>' +
            '<tr><td>用電度數</td><td>' + self.fmtNum(usage) + '</td></tr>' +
            '<tr><td>公共電費</td><td>' + self.fmtMoney(publicElectricityFee) + '</td></tr>' +
            '<tr><td>總電費</td><td>' + self.fmtMoney(totalElectricity) + '</td></tr>' +
            '<tr><td>房租</td><td>' + self.fmtMoney(row.RentSnapshot) + '</td></tr>' +
            '<tr><td>調整金額</td><td>' + self.fmtMoney(row.AdjustmentSnapshot) + '</td></tr>' +
            '<tr><td>備註</td><td>' + self.escapeHtml(note) + '</td></tr>' +
            '</tbody><tfoot><tr><td>應繳合計</td><td>' + self.fmtMoney(total) + '</td></tr></tfoot>' +
            '</table></div>';
        $temp.html(innerHtml);
        $("body").append($temp);

        self.copyElementAsImage(document.getElementById("tempSingleRowInner"), "rent_bill_" + self.state.billMonth + "_" + row.RoomAlias)
            .then(function (mode) {
                alert(mode === "clipboard" ? "已複製到剪貼簿！" : "已下載圖片");
            })
            .catch(function () {
                alert("複製圖片失敗，請確認瀏覽器支援度或改用下載");
            })
            .finally(function () {
                $temp.remove();
            });
    },

    /** 複製「只有電費相關欄位」的整表圖片：房租/調整金額/應繳合計/繳費狀態/備註都不含，
     * 用於單獨傳電費明細給房客對帳，不曝露房租等其他資訊 */
    copyElectricityOnly: function ($btn) {
        var self = this;
        $btn.prop("disabled", true).text("複製中...");

        var rowsHtml = "";
        var totalElectricity = 0;
        $("#billTableBody tr").each(function () {
            var $tr = $(this);
            var roomId = Number($tr.data("room-id"));
            if (!roomId) return;
            var row = self.state.billRows.find(function (r) { return r.RoomId === roomId; });
            if (!row) return;

            var currentReading = parseFloat($tr.find(".current-reading-input").val()) || 0;
            var publicElectricityFee = parseFloat($tr.find(".public-electricity-input").val()) || 0;
            var usage = currentReading - row.PrevReading;
            var fee = usage * row.RateSnapshot;
            var rowTotalElectricity = fee + publicElectricityFee; // 總電費 = 本月電費 + 公共電費
            totalElectricity += rowTotalElectricity;

            rowsHtml += "<tr>" +
                "<td>" + self.escapeHtml(row.RoomAlias) + "</td>" +
                "<td>" + self.fmtNum(row.PrevReading) + "</td>" +
                "<td>" + self.fmtNum(currentReading) + "</td>" +
                "<td>" + self.fmtNum(usage) + "</td>" +
                "<td>" + self.fmtMoney(publicElectricityFee) + "</td>" +
                "<td>" + self.fmtMoney(rowTotalElectricity) + "</td>" +
                "</tr>";
        });

        var $temp = $('<div class="offscreen-capture" id="tempElectricityCapture"></div>');
        var innerHtml = '<div id="tempElectricityInner" style="background-color:var(--color-secondary);padding:24px;width:640px;">' +
            '<div class="bill-capture-title">' + self.state.billMonth + ' 電費明細</div>' +
            '<table class="bill-table"><thead><tr>' +
            "<th>房間</th><th>上月讀數</th><th>本月讀數</th><th>用電度數</th><th>公共電費</th><th>總電費</th>" +
            "</tr></thead><tbody>" + rowsHtml + "</tbody>" +
            '<tfoot><tr><td colspan="5">總計</td><td>' + self.fmtMoney(totalElectricity) + '</td></tr></tfoot>' +
            "</table></div>";
        $temp.html(innerHtml);
        $("body").append($temp);

        self.copyElementAsImage(document.getElementById("tempElectricityInner"), "rent_electricity_" + self.state.billMonth)
            .then(function (mode) {
                $btn.text(mode === "clipboard" ? "已複製到剪貼簿！" : "已下載圖片");
                setTimeout(function () { $btn.text("複製電費圖片"); }, 1800);
            })
            .catch(function () {
                alert("複製圖片失敗，請確認瀏覽器支援度或改用下載");
                $btn.text("複製電費圖片");
            })
            .finally(function () {
                $temp.remove();
                $btn.prop("disabled", false);
            });
    },

    /** ==================== Tab2：房間設定 ==================== */
    bindRoomsView: function () {
        var self = this;

        $("#btnReloadRooms").on("click", function () { self.loadRooms(); });

        $("#btnToggleShowInactive").on("click", function () {
            self.state.showInactiveRooms = !self.state.showInactiveRooms;
            $(this).text(self.state.showInactiveRooms ? "只顯示啟用中房間" : "顯示已退租房間");
            self.loadRooms();
        });

        $("#addRoomForm").on("submit", function (e) {
            e.preventDefault();
            var alias = $("#newRoomAlias").val().trim();
            var rent = parseFloat($("#newRoomRent").val());
            var rate = parseFloat($("#newRoomRate").val());
            var adjustment = parseFloat($("#newRoomAdjustment").val()) || 0;
            var sort = parseInt($("#newRoomSort").val(), 10) || 0;

            if (!alias || isNaN(rent) || isNaN(rate)) {
                alert("請完整填寫房間別名、房租與每度電費");
                return;
            }

            $.ajax({
                url: "/api/rent/rooms",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({
                    PropertyId: self.state.currentPropertyId,
                    RoomAlias: alias,
                    MonthlyRent: rent,
                    ElectricityRate: rate,
                    AdjustmentAmount: adjustment,
                    SortOrder: sort,
                }),
            }).done(function () {
                $("#addRoomForm")[0].reset();
                $("#newRoomAdjustment").val("0");
                $("#newRoomSort").val("0");
                self.loadRooms();
            }).fail(function (xhr) {
                alert("新增房間失敗：" + (xhr.responseJSON?.message || xhr.statusText));
            });
        });
    },

    loadRooms: function () {
        var self = this;
        if (!self.state.currentPropertyId) return;

        $("#roomTableBody").html('<tr><td colspan="7" style="text-align:center;color:var(--color-text-secondary);">載入中...</td></tr>');

        $.get("/api/rent/rooms", { propertyId: self.state.currentPropertyId, includeInactive: self.state.showInactiveRooms })
            .done(function (rooms) {
                self.renderRoomTable(rooms || []);
            })
            .fail(function (xhr) {
                if (xhr.status === 401) {
                    window.location.assign("/signin.html#rent/rent");
                    return;
                }
                $("#roomTableBody").html('<tr><td colspan="7" style="text-align:center;color:var(--color-text-secondary);">載入失敗，請稍後重試</td></tr>');
            });
    },

    renderRoomTable: function (rooms) {
        var self = this;
        if (rooms.length === 0) {
            $("#roomTableBody").html('<tr><td colspan="7" style="text-align:center;color:var(--color-text-secondary);">尚無房間，請用上方表單新增</td></tr>');
            return;
        }

        var html = "";
        rooms.forEach(function (r) {
            var rowClass = r.IsActive ? "" : " class='inactive-row'";
            html += '<tr' + rowClass + ' data-room-id="' + r.RoomId + '">' +
                '<td><input type="text" class="room-alias-input" value="' + self.escapeHtml(r.RoomAlias) + '" /></td>' +
                '<td><input type="number" step="1" class="room-rent-input" value="' + r.MonthlyRent + '" /></td>' +
                '<td><input type="number" step="0.01" class="room-rate-input" value="' + r.ElectricityRate + '" /></td>' +
                '<td><input type="number" step="1" class="room-adjustment-input" value="' + r.AdjustmentAmount + '" /></td>' +
                '<td><input type="number" step="1" class="room-sort-input" value="' + r.SortOrder + '" /></td>' +
                '<td>' + (r.IsActive ? "啟用中" : "已退租") + '</td>' +
                '<td class="action-col">' +
                '<div class="row-actions">' +
                '<button type="button" class="btn-secondary btn-save-room">儲存</button>' +
                '<button type="button" class="btn-danger btn-toggle-room-active">' + (r.IsActive ? "退租" : "啟用") + '</button>' +
                '</div>' +
                '</td>' +
                '</tr>';
        });
        $("#roomTableBody").html(html);

        $("#roomTableBody tr").each(function () {
            var $tr = $(this);
            var roomId = Number($tr.data("room-id"));
            var currentActive = r_isActive($tr, rooms, roomId);

            $tr.find(".btn-save-room").on("click", function () {
                self.saveRoom(roomId, $tr, currentActive);
            });
            $tr.find(".btn-toggle-room-active").on("click", function () {
                var confirmMsg = currentActive ? "確定要將此房間標記為已退租嗎？（歷史帳單紀錄不受影響）" : "確定要重新啟用此房間嗎？";
                if (!confirm(confirmMsg)) return;
                self.saveRoom(roomId, $tr, !currentActive);
            });
        });

        function r_isActive($tr, rooms, roomId) {
            var room = rooms.find(function (x) { return x.RoomId === roomId; });
            return room ? room.IsActive : true;
        }
    },

    saveRoom: function (roomId, $tr, isActive) {
        var self = this;
        var alias = $tr.find(".room-alias-input").val().trim();
        var rent = parseFloat($tr.find(".room-rent-input").val());
        var rate = parseFloat($tr.find(".room-rate-input").val());
        var adjustment = parseFloat($tr.find(".room-adjustment-input").val()) || 0;
        var sort = parseInt($tr.find(".room-sort-input").val(), 10) || 0;

        if (!alias || isNaN(rent) || isNaN(rate)) {
            alert("請完整填寫房間別名、房租與每度電費");
            return;
        }

        $.ajax({
            url: "/api/rent/rooms/" + roomId,
            method: "PUT",
            contentType: "application/json",
            data: JSON.stringify({
                RoomAlias: alias,
                MonthlyRent: rent,
                ElectricityRate: rate,
                AdjustmentAmount: adjustment,
                SortOrder: sort,
                IsActive: isActive,
            }),
        }).done(function () {
            self.loadRooms();
        }).fail(function (xhr) {
            alert("更新房間設定失敗：" + (xhr.responseJSON?.message || xhr.statusText));
        });
    },

    /** ==================== Tab3：公共電費 ==================== */
    bindMasterMeterView: function () {
        var self = this;

        $("#btnReloadMaster").on("click", function () { self.loadMasterMeterView(); });

        $("#masterMeterForm").on("submit", function (e) {
            e.preventDefault();
            var month = $("#masterMonthInput").val();
            var usage = parseFloat($("#masterUsageInput").val());
            var amount = parseFloat($("#masterAmountInput").val());
            var note = $("#masterNoteInput").val();

            if (!month || isNaN(usage) || isNaN(amount)) {
                alert("請完整填寫期間、主表總用電度數與總電費金額");
                return;
            }

            $.ajax({
                url: "/api/rent/master-meter",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({
                    PropertyId: self.state.currentPropertyId,
                    BillMonth: month,
                    TotalUsageUnits: usage,
                    TotalAmount: amount,
                    Note: note || null,
                }),
            }).done(function () {
                $("#masterMeterForm")[0].reset();
                self.loadMasterMeterView();
            }).fail(function (xhr) {
                alert("儲存主表電費紀錄失敗：" + (xhr.responseJSON?.message || xhr.statusText));
            });
        });
    },

    /** 進入「公共電費」頁籤時，同時載入試算明細（用目前電費計算頁選擇的月份）與主表紀錄清單 */
    loadMasterMeterView: function () {
        this.loadPublicElectricityEstimate();
        this.loadMasterMeterList();
    },

    loadPublicElectricityEstimate: function () {
        var self = this;
        if (!self.state.currentPropertyId) return;

        $("#publicEstimatePanel").html('<p style="color:var(--color-text-secondary);">試算中...</p>');

        // Tab1 的帳單表格 DOM 即使目前沒顯示也還在（只是被 CSS 隱藏），可以直接讀取本月即時輸入的讀數
        var currentMonthUsage = self.computeLiveCurrentMonthUsageSum();
        $.get("/api/rent/public-electricity-estimate", { propertyId: self.state.currentPropertyId, month: self.state.billMonth, currentMonthUsage: currentMonthUsage })
            .done(function (est) {
                self.renderEstimatePanel(est);
            })
            .fail(function (xhr) {
                if (xhr.status === 401) {
                    window.location.assign("/signin.html#rent/rent");
                    return;
                }
                $("#publicEstimatePanel").html('<p style="color:var(--color-text-secondary);">試算失敗，請稍後重試</p>');
            });
    },

    renderEstimatePanel: function (est) {
        var self = this;
        var html = '<h3 style="font-size:0.95rem;margin-bottom:10px;">' + self.state.billMonth + ' 電費月試算</h3>';

        if (!est.HasData) {
            html += '<p style="color:var(--color-text-secondary);">' + self.escapeHtml(est.Message || "尚無法試算") + '</p>';
            $("#publicEstimatePanel").html(html);
            return;
        }

        // 公共部分度數是「整體」算出來的，平均分給每間房後，再各自用房間自己的電價換算金額，
        // 所以每間房的公共電費金額可能不同（電價不同），這裡列出每間房各自的試算結果
        var breakdownRows = (est.RoomBreakdown || []).map(function (b) {
            return "<tr><td>" + self.escapeHtml(b.RoomAlias) + "</td><td>" + b.ElectricityRate.toFixed(2) +
                " 元/度</td><td>" + self.fmtNum(b.UsageShare) + " 度</td><td>" + self.fmtMoney(b.PublicElectricityFee) + "</td></tr>";
        }).join("");

        html += '<p style="color:var(--color-text-secondary);font-size:0.8rem;margin-bottom:10px;">' +
            "主表兩個月抄一次表，所以是拿「本月＋上月」各房用電加總去跟主表總用電比較差額。</p>" +
            '<table class="room-table"><tbody>' +
            "<tr><td>主表總用電度數</td><td colspan=\"3\">" + self.fmtNum(est.MasterTotalUsageUnits) + " 度</td></tr>" +
            "<tr><td>本月各房用電加總</td><td colspan=\"3\">" + self.fmtNum(est.CurrentMonthRoomUsage) + " 度</td></tr>" +
            "<tr><td>上月各房用電加總</td><td colspan=\"3\">" + self.fmtNum(est.PrevMonthRoomUsage) + " 度（無資料時當 0）</td></tr>" +
            "<tr><td>本月＋上月合計</td><td colspan=\"3\">" + self.fmtNum(est.CombinedRoomUsage) + " 度</td></tr>" +
            "<tr><td>公共部分度數</td><td colspan=\"3\">" + self.fmtNum(est.ExcessUsage) + " 度</td></tr>" +
            "<tr><td>目前啟用中房間數</td><td colspan=\"3\">" + est.ActiveRoomCount + " 間</td></tr>" +
            "<tr><td>每房分配度數</td><td colspan=\"3\">" + self.fmtNum(est.PerRoomUsageShare) + " 度（度數平均分攤，金額再各自依房間電價換算）</td></tr>" +
            "</tbody></table>" +
            '<h4 style="font-size:0.85rem;margin:14px 0 8px;color:var(--color-text-secondary);">各房間試算結果</h4>' +
            '<table class="room-table"><thead><tr><th>房間</th><th>每度電費</th><th>分配度數</th><th>公共電費</th></tr></thead>' +
            "<tbody>" + breakdownRows + "</tbody></table>" +
            '<div style="margin-top:12px;"><button type="button" class="btn-primary" id="btnApplyEstimate">套用到電費計算表</button></div>';

        $("#publicEstimatePanel").html(html);

        $("#btnApplyEstimate").on("click", function () {
            self.applyEstimateToBillRows(est);
            alert("已套用到「電費計算」頁的每一列，記得切換過去按「儲存本月帳單」才會存檔");
        });
    },

    loadMasterMeterList: function () {
        var self = this;
        if (!self.state.currentPropertyId) return;

        $("#masterMeterTableBody").html('<tr><td colspan="6" style="text-align:center;color:var(--color-text-secondary);">載入中...</td></tr>');

        $.get("/api/rent/master-meter", { propertyId: self.state.currentPropertyId })
            .done(function (records) {
                self.renderMasterMeterTable(records || []);
            })
            .fail(function (xhr) {
                if (xhr.status === 401) {
                    window.location.assign("/signin.html#rent/rent");
                    return;
                }
                $("#masterMeterTableBody").html('<tr><td colspan="6" style="text-align:center;color:var(--color-text-secondary);">載入失敗，請稍後重試</td></tr>');
            });
    },

    renderMasterMeterTable: function (records) {
        var self = this;
        if (records.length === 0) {
            $("#masterMeterTableBody").html('<tr><td colspan="6" style="text-align:center;color:var(--color-text-secondary);">尚無主表電費紀錄，請用上方表單新增</td></tr>');
            return;
        }

        var html = "";
        records.forEach(function (m) {
            var unitCost = m.TotalUsageUnits > 0 ? (m.TotalAmount / m.TotalUsageUnits).toFixed(2) : "-";
            html += '<tr data-master-id="' + m.MasterBillId + '">' +
                "<td>" + m.BillMonth + "</td>" +
                "<td>" + self.fmtNum(m.TotalUsageUnits) + "</td>" +
                "<td>" + self.fmtMoney(m.TotalAmount) + "</td>" +
                "<td>" + unitCost + "</td>" +
                "<td>" + self.escapeHtml(m.Note || "") + "</td>" +
                '<td class="action-col"><button type="button" class="btn-danger btn-delete-master">刪除</button></td>' +
                "</tr>";
        });
        $("#masterMeterTableBody").html(html);

        $("#masterMeterTableBody .btn-delete-master").on("click", function () {
            var id = $(this).closest("tr").data("master-id");
            if (!confirm("確定要刪除這筆主表電費紀錄嗎？")) return;
            $.ajax({ url: "/api/rent/master-meter/" + id, method: "DELETE" })
                .done(function () { self.loadMasterMeterView(); })
                .fail(function (xhr) { alert("刪除失敗：" + (xhr.responseJSON?.message || xhr.statusText)); });
        });
    },

    /** ==================== 複製圖片共用工具 ==================== */
    copyElementAsImage: function (el, filenamePrefix) {
        return html2canvas(el, { backgroundColor: "#1a1a1a", scale: 2 }).then(function (canvas) {
            return new Promise(function (resolve, reject) {
                canvas.toBlob(function (blob) {
                    if (!blob) { reject(new Error("canvas toBlob failed")); return; }

                    if (navigator.clipboard && window.ClipboardItem) {
                        navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
                            .then(function () { resolve("clipboard"); })
                            .catch(function () {
                                // Clipboard 權限被拒或非安全環境（例如測試機用 http 存取），退回直接下載 PNG
                                RentApp.downloadBlob(blob, filenamePrefix);
                                resolve("download");
                            });
                    } else {
                        RentApp.downloadBlob(blob, filenamePrefix);
                        resolve("download");
                    }
                }, "image/png");
            });
        });
    },

    downloadBlob: function (blob, filenamePrefix) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filenamePrefix + "_" + Date.now() + ".png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    },

    /** ==================== 格式化工具 ==================== */
    fmtNum: function (v) {
        var n = Number(v);
        if (isNaN(n)) return v;
        return n.toLocaleString("zh-TW", { maximumFractionDigits: 2 });
    },

    fmtMoney: function (v) {
        var n = Number(v);
        if (isNaN(n)) return v;
        return n.toLocaleString("zh-TW", { maximumFractionDigits: 0 });
    },

    // 反算 fmtMoney 輸出的字串為數字，用於加總（拿掉千分位逗號）
    parseMoney: function (text) {
        var n = parseFloat(String(text).replace(/,/g, ""));
        return isNaN(n) ? 0 : n;
    },

    escapeHtml: function (str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    },
};

$(document).ready(function () {
    RentApp.init();
});
