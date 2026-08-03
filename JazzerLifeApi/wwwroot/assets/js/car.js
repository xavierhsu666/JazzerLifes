// ! -- Global Area --------------------------------------------------------------------------
var OilData, vehicalsTable;
var oilUnitPrice = 0; // Oil Record 目前選定油品的單價（由 Google Sheet 抓取）
var dashMaint = []; // Dashboard 目前載入的保養紀錄（供分類月份篩選用）
var partCategories = []; // 目前使用者的保養分類清單（例行/保養/維修...），供新增保養表單下拉選單使用
var editingCycleId = null; // 保養週期目前編輯中的 CycleID（null=新增模式）
// 實際加油花費 = 加油量 × 每公升單價（FuelConsumption.FuelCost 欄位存的是「單價」）
function fuelCostTotal(r) {
    return Number(r.FuelAmount || 0) * Number(r.FuelCost || 0);
}
document.querySelectorAll(".dropdown-toggle").forEach((dropdownToggleEl) => {
    dropdownToggleEl.addEventListener("click", function () {
        if ($(".dropdown-menu").hasClass("show")) {
            $(".dropdown-menu").removeClass("show");
        } else {
            $(".dropdown-menu").addClass("show");
        }
    });
});
document.querySelectorAll(".dropdown-item").forEach((dropdownToggleEl) => {
    dropdownToggleEl.addEventListener("click", function () {
        $("#btnText").prop("text", dropdownToggleEl.innerHTML);
        $(".dropdownMenuButton").attr("aria-expanded", "false");
        $(".dropdown-menu").removeClass("show");
    });
});
var tmp_aggrid;
// ! -- Function Area ----------------------------------------------------------------------
function checkSignInStatus() {
    return $.get("/api/auth/me").fail(function () {
        alert("請先登入");
        window.location.assign("/signin.html#car/car");
    });
}

function swipeMainSection(ele) {
    $(".nav-link").removeClass("active");
    $(ele).addClass("active");
    var key = $(ele).attr("data-view");
    var ActiveSection = key ? String(key).toUpperCase() : String($(ele).children("text").html()).replaceAll(" ", "").toUpperCase();
    $("section").addClass("d-none");
    $("section").each(function (i, val) {
        if ($(val).prop("id").trim().toUpperCase() == ActiveSection) {
            $(val).removeClass("d-none");
        } else {
            $(val).addClass("d-none");
        }
    });
    $("#navbar-toggler").click();
    load_to_page(ActiveSection);
}
function load_to_page(ActiveSection) {
    var uid = sessionStorage.getItem("uid");
    var vid = $("#vehiclesSelect").val().split("_")[0].replace("#", "");
    console.log(ActiveSection);

    switch (ActiveSection) {
        case "HOME":
            console.log("click home");
            break;
        case "DASHBOARD":
            loader_animate.load_start();
            loadDashboard(vid, uid)
                .then(function () {
                    loader_animate.load_end();
                })
                .catch(function (error) {
                    console.error("[car] DASHBOARD -> loadDashboard 失敗:", error, "vid=", vid, "uid=", uid);
                    loader_animate.load_end();
                    alert("讀取儀表板失敗，請洽系統管理員");
                });
            break;
        case "OILRECORD":
            loader_animate.load_start();
            loadOilRecord(vid)
                .then(function () {
                    loader_animate.load_end();
                })
                .catch(function (error) {
                    console.error("[car] OILRECORD -> loadOilRecord 失敗:", error, "vid=", vid);
                    loader_animate.load_end();
                    alert("讀取油耗紀錄失敗，請洽系統管理員");
                });
            break;
        case "VEHICLES":
            console.log("click VEHICLES");
            break;
        case "PARTSINSPECTTABLE":
            loader_animate.load_start();
            loadPartsCycles(vid, uid)
                .then(function () {
                    loader_animate.load_end();
                })
                .catch(function (error) {
                    console.error("[car] PARTSINSPECTTABLE -> loadPartsCycles 失敗:", error, "uid=", uid, "vid=", vid);
                    loader_animate.load_end();
                    alert("讀取保養週期失敗，請洽系統管理員");
                });
            break;
        case "MAINTAINTABLE":
            loader_animate.load_start();
            loadMaintenance(vid, uid)
                .then(function () {
                    loader_animate.load_end();
                })
                .catch(function (error) {
                    console.error("[car] MAINTAINTABLE -> loadMaintenance 失敗:", error, "uid=", uid, "vid=", vid);
                    loader_animate.load_end();
                    alert("讀取保養紀錄失敗，請洽系統管理員");
                });
            break;
        case "CATEGORYTABLE":
            loader_animate.load_start();
            loadCategoryPage()
                .then(function () {
                    loader_animate.load_end();
                })
                .catch(function (error) {
                    console.error("[car] CATEGORYTABLE -> loadCategoryPage 失敗:", error);
                    loader_animate.load_end();
                    alert("讀取保養分類失敗，請洽系統管理員");
                });
            break;
    }
}

function create_VehiclesTable() {
    vehicalsTable.forEach(function (i, val) {
        var tr = document.createElement("tr");
        $(tr).empty();
        $(tr).html(
            "<th scope='row'>" +
                val +
                "</th>" +
                "<td id='vMake_" +
                i.VehicleId +
                "'>" +
                i.Make +
                "</td>" +
                "<td id='vModel_" +
                i.VehicleId +
                "'>" +
                i.Model +
                "</td>" +
                "<td id='vYear_" +
                i.VehicleId +
                "'>" +
                i.Year +
                "</td>" +
                "<td id='vLicensePlate_" +
                i.VehicleId +
                "'>" +
                i.LicensePlate +
                "</td>" +
                "<td>" +
                "<button id='vid_" +
                i.VehicleId +
                "' class='btn btn-primary' onclick='edit_Vehicles(this)'>EDIT</button>" +
                "</td>",
        );
        $("#vehiclesTable>tbody").append($(tr));
    });
}
function create_VehiclesSelectOption() {
    $("#vehiclesSelect").children("option").remove();
    vehicalsTable.forEach(function (i, val) {
        var option = document.createElement("option");
        $(option).html("#" + i.VehicleId + "_" + i.Model);
        if (val == 0) {
            $(option).prop("selected", true);
        }
        $("#vehiclesSelect").append(option);
    });
}
function dropdown_oilRecord(ele, id) {
    if ($("#" + id).hasClass("d-none")) {
        $(ele).val("不新增油耗");
    } else {
        $(ele).val("新增油耗");
    }
    show_toggleEle(id);
}
function show_toggleEle(id) {
    if ($("#" + id).hasClass("d-none")) {
        $("#" + id).removeClass("d-none");
    } else {
        $("#" + id).addClass("d-none");
    }
}
function getOilPrice(data, type) {
    const headers = data.values[0];
    const prices = data.values[1];

    const index = headers.findIndex((header) => header.includes(type));
    if (index !== -1) {
        return prices[index];
    } else {
        return "Type not found";
    }
}
function submitOilRecord() {
    var vidRaw = $("#vehiclesSelect").val();
    if (!vidRaw) {
        alert("請先選擇車輛");
        return;
    }
    var vid = vidRaw.split("_")[0].replace("#", "");
    var date = $("#oilForm_date").val();
    var odo = Number($("#oilForm_odometer").val() || 0);
    var fuel = Number($("#oilForm_fuel").val() || 0);
    var unitPrice = Number($("#oilForm_cost").val() || 0);
    var lastOdo = Number(String($("#oilForm_lastOdo").text() || "0").replace(/,/g, "")) || 0;

    if (!date || odo <= 0 || fuel <= 0) {
        alert("請填寫日期、里程數與加油量（公升）");
        return;
    }

    var distance = odo - lastOdo;
    if (distance <= 0 && !confirm("新里程 " + odo + " 未大於上次里程 " + lastOdo + "，行駛距離不合理，仍要送出嗎？")) {
        return;
    }

    loader_animate.load_start();
    $.ajax({
        url: "/api/vehicles/" + vid + "/fuel",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            odometerReading: odo,
            fuelAmount: fuel,
            fuelCost: unitPrice,
            date: date,
        }),
    })
        .done(function () {
            loader_animate.load_end();
            alert("新增成功");
            $("#oilForm_odometer, #oilForm_fuel, #oilForm_cost").val("");
            loadOilRecord(vid);
        })
        .fail(function (xhr) {
            loader_animate.load_end();
            if (xhr.status === 401) {
                alert("請先登入");
                window.location.assign("/signin.html");
            } else {
                alert("新增失敗，請洽系統管理員");
            }
        });
}

// ---------- Oil Record（優化版：KPI + 趨勢圖 + 明細 + 新增表單） ----------

function loadOilRecord(vid) {
    return $.get("/api/vehicles/" + vid + "/fuel").then(function (data) {
        OilData = Array.isArray(data) ? data : [];
        renderOilKpis(OilData);
        renderOilChart(OilData, $("#oilDimension").val() || "month");
        renderOilGrid(OilData);
        prefillOilForm(OilData);
    });
}

function renderOilKpis(records) {
    records = Array.isArray(records) ? records : [];
    var count = records.length;
    var totalCost = records.reduce(function (s, r) {
        return s + fuelCostTotal(r);
    }, 0);
    var totalDist = records.reduce(function (s, r) {
        return s + Number(r.DistanceTravelled || 0);
    }, 0);
    var totalFuel = records.reduce(function (s, r) {
        return s + Number(r.FuelAmount || 0);
    }, 0);
    var avgEff = totalFuel > 0 ? totalDist / totalFuel : 0;
    var costPerKm = totalDist > 0 ? totalCost / totalDist : 0;

    $("#oilKpiAvgEff").text(avgEff.toFixed(2) + " km/L");
    $("#oilKpiTotalCost").text("$" + Math.round(totalCost).toLocaleString());
    $("#oilKpiCostPerKm").text("$" + costPerKm.toFixed(2) + "/km");
    $("#oilKpiDistance").text(Math.round(totalDist).toLocaleString() + " km");
    $("#oilKpiCount").text(count.toLocaleString());
}

function oilGetISOWeek(d) {
    var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return date.getUTCFullYear() + "-W" + String(weekNo).padStart(2, "0");
}

function oilPeriodKey(rec, dimension) {
    var raw = rec.RecordDate || rec.CreatedAt;
    var d = new Date(raw);
    if (isNaN(d.getTime())) {
        return String(raw || "");
    }
    if (dimension === "year") {
        return String(d.getFullYear());
    }
    if (dimension === "week") {
        return oilGetISOWeek(d);
    }
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

// 根因：xAxis 用 categories 畫圖時，容器沒有明確寬度規劃，Highcharts 預設會把所有類別硬擠進
// 目前可視寬度，累積月份一多（例如超過一年的紀錄）柱子會被壓到不到 1px、刻度文字也會被自動略過，
// 視覺上像是「只顯示了十幾個單位」，但其實資料都還在，只是畫不出來。
// 解法比照 finance.js 的 getMobileChartTweaks：改用 scrollablePlotArea 保留每個類別足夠寬度，
// 超出可視範圍時橫向捲動查看，而不是硬擠進固定寬度。
function carScrollableChartTweaks(categoryCount, pxPerCategory, minWidth) {
    pxPerCategory = pxPerCategory || 50;
    minWidth = minWidth || 320;
    return {
        scrollablePlotArea: {
            minWidth: Math.max((categoryCount || 0) * pxPerCategory, minWidth),
            scrollPositionX: 1, // 預設捲到最右邊（最新月份），趨勢圖優先看近期資料
        },
    };
}

function renderOilChart(records, dimension) {
    records = Array.isArray(records) ? records : [];
    dimension = dimension || "month";
    if (typeof Highcharts === "undefined") {
        return;
    }

    var groups = {};
    records.forEach(function (r) {
        var key = oilPeriodKey(r, dimension);
        if (!key) {
            return;
        }
        if (!groups[key]) {
            groups[key] = { dist: 0, fuel: 0, cost: 0 };
        }
        groups[key].dist += Number(r.DistanceTravelled || 0);
        groups[key].fuel += Number(r.FuelAmount || 0);
        groups[key].cost += fuelCostTotal(r);
    });
    var keys = Object.keys(groups).sort();
    var effData = keys.map(function (k) {
        return groups[k].fuel > 0 ? Number((groups[k].dist / groups[k].fuel).toFixed(2)) : 0;
    });
    var costData = keys.map(function (k) {
        return Math.round(groups[k].cost);
    });

    Highcharts.chart("oilTrendChart", {
        chart: Object.assign(
            { backgroundColor: "transparent", style: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" } },
            carScrollableChartTweaks(keys.length),
        ),
        title: { text: "油耗趨勢", style: { color: "#e6edf3" } },
        credits: { enabled: false },
        xAxis: {
            categories: keys,
            labels: { style: { color: "#8b98a9" } },
            lineColor: "#2c3a4d",
            tickColor: "#2c3a4d",
        },
        yAxis: [
            { title: { text: "油耗 (km/L)", style: { color: "#8b98a9" } }, labels: { style: { color: "#8b98a9" } }, gridLineColor: "#2c3a4d" },
            { title: { text: "花費 (NT$)", style: { color: "#8b98a9" } }, labels: { style: { color: "#8b98a9" } }, opposite: true, gridLineColor: "#2c3a4d" },
        ],
        legend: { itemStyle: { color: "#8b98a9" }, itemHoverStyle: { color: "#fff" } },
        tooltip: { shared: true, backgroundColor: "#1a2332", borderColor: "#2c3a4d", style: { color: "#fff" } },
        series: [
            { name: "花費", type: "column", yAxis: 1, data: costData, color: "#ff5722", tooltip: { valuePrefix: "NT$ " } },
            { name: "平均油耗", type: "line", yAxis: 0, data: effData, color: "#00bcd4", tooltip: { valueSuffix: " km/L" } },
        ],
    });
}

function renderOilGrid(records) {
    $("#c_table").empty();
    var rows = (records || [])
        .slice()
        .reverse()
        .map(function (r) {
            return {
                日期: r.RecordDate || (r.CreatedAt ? String(r.CreatedAt).slice(0, 10) : ""),
                里程: Number(r.OdometerReading || 0),
                距離: Number(r.DistanceTravelled || 0),
                加油量: Number(r.FuelAmount || 0),
                單價: Number(r.FuelCost || 0),
                花費: fuelCostTotal(r),
                油耗: Number(r.FuelEfficiency || 0),
            };
        });
    if (!rows.length) {
        return;
    }
    tmp_aggrid = agGrid_maker.quick_Update("c_table", rows);
}

function prefillOilForm(records) {
    var last = records && records.length ? records[records.length - 1] : null;
    var lastOdo = last ? Number(last.OdometerReading || 0) : 0;
    $("#oilForm_lastOdo").text(lastOdo.toLocaleString());
    if (!$("#oilForm_date").val()) {
        $("#oilForm_date").val(new Date().toISOString().slice(0, 10));
    }
    updateOilPreview();
}

function updateOilPreview() {
    var lastOdo = Number(String($("#oilForm_lastOdo").text() || "0").replace(/,/g, "")) || 0;
    var odo = Number($("#oilForm_odometer").val() || 0);
    var fuel = Number($("#oilForm_fuel").val() || 0);
    var unitPrice = Number($("#oilForm_cost").val() || 0);
    var dist = odo - lastOdo;
    if (dist < 0) {
        dist = 0;
    }
    var total = fuel * unitPrice;
    var eff = fuel > 0 ? dist / fuel : 0;
    var cpk = dist > 0 ? total / dist : 0;
    $("#oilForm_distance").text(dist.toLocaleString() + " km");
    $("#oilForm_totalCost").text("$" + Math.round(total).toLocaleString());
    $("#oilForm_efficiency").text(eff.toFixed(2) + " km/L");
    $("#oilForm_costPerKm").text("$" + cpk.toFixed(2) + "/km");
}

// 依選定油品從 Google Sheet 抓取單價，並自動帶入花費
function loadOilUnitPrice() {
    var type = $("#oilForm_type").val();
    if (!type) {
        oilUnitPrice = 0;
        $("#oilForm_unitPrice").text("$0/L");
        return;
    }
    loader_animate.load_start();
    sel_gsht("工作表1", "K1:N2")
        .then(function (data) {
            var price = getOilPrice(data, type);
            oilUnitPrice = Number(price) || 0;
            $("#oilForm_unitPrice").text("$" + oilUnitPrice + "/L");
            autofillOilCost();
            loader_animate.load_end();
        })
        .catch(function (error) {
            console.error("[car] loadOilUnitPrice 抓油價失敗:", error);
            oilUnitPrice = 0;
            $("#oilForm_unitPrice").text("讀取失敗");
            loader_animate.load_end();
        });
}

// 有抓到單價時，自動帶入「每公升單價」欄位（可再手動覆寫）
function autofillOilCost() {
    if (oilUnitPrice > 0) {
        $("#oilForm_cost").val(oilUnitPrice);
    }
    updateOilPreview();
}

// 加油量輸入：更新預覽（總花費 = 加油量 × 單價）
function onOilFuelInput() {
    updateOilPreview();
}

// 頂部車輛下拉切換：重新載入目前所在的分頁
function onVehicleChange() {
    var active = $(".nav-link.active").children("text").html();
    if (active) {
        load_to_page(String(active).replaceAll(" ", "").toUpperCase());
    }
}

// 依 Google Sheet 抓油價使用的查詢工具
function sel_gsht(sht, rng = "") {
    return new Promise((resolve, reject) => {
        // sht in ['工作表1','工作表2','車用開銷','需更換']
        var head = "https://sheets.googleapis.com/v4/spreadsheets/1re_Na3c34juFKTxicbN2fbV5q1lTvl0zCcVjO_reN3k/values/";
        var range = rng ? "!" + rng : "";
        var body = sht + range;
        var footer = "?alt=json&key=AIzaSyC_BNFoQ9IjBzRETQGiMJ83c_1wWYpuM-M";
        var url = head + body + footer;

        $.get(url)
            .done(function (data) {
                console.log("GET OK.");
                resolve(data);
            })
            .fail(function () {
                console.log("GET Failed.");
                reject(new Error("GET Failed."));
            });
    });
}

// ==================== Dashboard（KPI + 保養提醒 + 圖表 + 最近活動） ====================

function loadDashboard(vid, uid) {
    return $.get("/api/dashboard/" + vid)
        .then(function (res) {
            var fuel = Array.isArray(res.fuel) ? res.fuel : [];
            var maint = Array.isArray(res.maintenance) ? res.maintenance : [];
            var cycles = Array.isArray(res.cycles) ? res.cycles : [];
            dashMaint = maint;
            var currentOdo = dashComputeCurrentOdo(fuel, maint);
            var reminders = dashComputeReminders(cycles, maint, currentOdo);
            renderDashKpis(fuel, currentOdo, reminders);
            renderDashReminders(reminders);
            populateDashCatMonths(maint);
            renderDashCategoryPie(maint);
            renderDashFuelTrend(fuel);
            renderDashCostChart(fuel, maint);
            renderDashRecent(fuel, maint);
        })
        .fail(function (xhr) {
            if (xhr.status === 401) {
                alert("請先登入");
                window.location.assign("/signin.html");
            } else if (xhr.status === 403) {
                alert("無權限存取此車輛");
            }
            throw new Error("loadDashboard failed");
        });
}

function dashComputeCurrentOdo(fuel, maint) {
    var max = 0;
    (fuel || []).forEach(function (r) {
        max = Math.max(max, Number(r.OdometerReading || 0));
    });
    (maint || []).forEach(function (r) {
        max = Math.max(max, Number(r.OdometerReading || 0));
    });
    return max;
}

function dashComputeReminders(cycles, maint, currentOdo) {
    var today = new Date();
    var order = { red: 0, yellow: 1, green: 2, none: 3 };
    return (cycles || [])
        .map(function (c) {
            var part = c.PartName;
            var mileageCycle = Number(c.MileageCycle || 0);
            var timeCycle = Number(c.TimeCycle || 0);
            var last = null;
            (maint || []).forEach(function (m) {
                if (m.PartName !== part) {
                    return;
                }
                if (!last || new Date(m.MaintenanceDate) > new Date(last.MaintenanceDate)) {
                    last = m;
                }
            });
            var result = {
                part: part,
                mileageCycle: mileageCycle,
                timeCycle: timeCycle,
                hasHistory: !!last,
                kmRemain: null,
                daysRemain: null,
                status: "none",
                lastDate: last ? last.MaintenanceDate : null,
                lastOdo: last ? Number(last.OdometerReading || 0) : null,
            };
            if (!last) {
                return result;
            }
            var statuses = [];
            if (mileageCycle > 0 && result.lastOdo != null) {
                result.kmRemain = mileageCycle - (currentOdo - result.lastOdo);
                statuses.push(result.kmRemain <= 0 ? "red" : result.kmRemain <= mileageCycle * 0.2 ? "yellow" : "green");
            }
            if (timeCycle > 0 && last.MaintenanceDate) {
                var daysSince = Math.floor((today - new Date(last.MaintenanceDate)) / 86400000);
                result.daysRemain = timeCycle - daysSince;
                statuses.push(result.daysRemain <= 0 ? "red" : result.daysRemain <= timeCycle * 0.2 ? "yellow" : "green");
            }
            result.status = statuses.indexOf("red") >= 0 ? "red" : statuses.indexOf("yellow") >= 0 ? "yellow" : statuses.length ? "green" : "none";
            return result;
        })
        .sort(function (a, b) {
            return order[a.status] - order[b.status];
        });
}

function renderDashKpis(fuel, currentOdo, reminders) {
    fuel = fuel || [];
    var now = new Date();
    var ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    var monthCost = fuel
        .filter(function (r) {
            return String(r.RecordDate || "").slice(0, 7) === ym;
        })
        .reduce(function (s, r) {
            return s + fuelCostTotal(r);
        }, 0);
    var totalDist = fuel.reduce(function (s, r) {
        return s + Number(r.DistanceTravelled || 0);
    }, 0);
    var totalFuel = fuel.reduce(function (s, r) {
        return s + Number(r.FuelAmount || 0);
    }, 0);
    var totalCost = fuel.reduce(function (s, r) {
        return s + fuelCostTotal(r);
    }, 0);
    var avgEff = totalFuel > 0 ? totalDist / totalFuel : 0;
    var costPerKm = totalDist > 0 ? totalCost / totalDist : 0;
    var dueCount = (reminders || []).filter(function (r) {
        return r.status === "red" || r.status === "yellow";
    }).length;

    $("#dashKpiOdo").text(Math.round(currentOdo).toLocaleString() + " km");
    $("#dashKpiMonthCost").text("$" + Math.round(monthCost).toLocaleString());
    $("#dashKpiAvgEff").text(avgEff.toFixed(2) + " km/L");
    $("#dashKpiCostPerKm").text("$" + costPerKm.toFixed(2) + "/km");
    $("#dashKpiDueCount").text(dueCount.toLocaleString());
}

function renderDashReminders(reminders) {
    var el = $("#dashReminders");
    el.empty();
    if (!reminders || !reminders.length) {
        el.html('<div class="dash-empty">尚無保養週期設定</div>');
        return;
    }
    var labels = { red: "已超標", yellow: "即將到期", green: "正常", none: "尚無紀錄" };
    reminders.forEach(function (r) {
        var detail = [];
        if (r.kmRemain != null) {
            detail.push(r.kmRemain <= 0 ? "超標 " + Math.abs(Math.round(r.kmRemain)).toLocaleString() + " km" : "剩 " + Math.round(r.kmRemain).toLocaleString() + " km");
        }
        if (r.daysRemain != null) {
            detail.push(r.daysRemain <= 0 ? "超標 " + Math.abs(r.daysRemain) + " 天" : "剩 " + r.daysRemain + " 天");
        }
        if (!r.hasHistory) {
            detail.push("尚無保養紀錄");
        }
        var item = $('<div class="dash-reminder-item"></div>');
        item.html(
            '<span class="dash-dot dash-' + r.status + '"></span>' +
                '<span class="dash-reminder-part"></span>' +
                '<span class="dash-reminder-status dash-badge-' + r.status + '">' + labels[r.status] + "</span>" +
                '<span class="dash-reminder-detail"></span>',
        );
        item.find(".dash-reminder-part").text(r.part || "");
        item.find(".dash-reminder-detail").text(detail.join("｜"));
        el.append(item);
    });
}

function renderDashCategoryPie(maint) {
    if (typeof Highcharts === "undefined") {
        return;
    }
    var groups = {};
    (maint || []).forEach(function (m) {
        var c = m.CategoryName || "未分類";
        groups[c] = (groups[c] || 0) + Number(m.Cost || 0);
    });
    var data = Object.keys(groups).map(function (k) {
        return { name: k, y: Math.round(groups[k]) };
    });
    Highcharts.chart("dashCategoryChart", {
        chart: { backgroundColor: "transparent", style: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" } },
        title: { text: null },
        credits: { enabled: false },
        tooltip: { pointFormat: "<b>NT$ {point.y:,.0f}</b>（{point.percentage:.1f}%）", backgroundColor: "#1a2332", borderColor: "#2c3a4d", style: { color: "#fff" } },
        legend: { itemStyle: { color: "#8b98a9" }, itemHoverStyle: { color: "#fff" } },
        plotOptions: { pie: { innerSize: "55%", dataLabels: { style: { color: "#e6edf3", textOutline: "none" }, distance: 12 } } },
        series: [{ type: "pie", name: "花費", data: data }],
    });
}

// 依保養紀錄產生月份下拉選項
function populateDashCatMonths(maint) {
    var months = [
        ...new Set(
            (maint || []).map(function (m) {
                return String(m.MaintenanceDate || "").slice(0, 7);
            }).filter(Boolean),
        ),
    ].sort().reverse();
    var sel = $("#dashCatMonth");
    if (!sel.length) {
        return;
    }
    var cur = sel.val();
    sel.empty().append('<option value="">全部月份</option>');
    months.forEach(function (m) {
        sel.append($("<option></option>").attr("value", m).text(m));
    });
    if (months.indexOf(cur) >= 0) {
        sel.val(cur);
    }
}

// 切換保養分類的月份篩選
function onDashCatMonthChange() {
    var m = $("#dashCatMonth").val();
    var filtered = m
        ? (dashMaint || []).filter(function (x) {
              return String(x.MaintenanceDate || "").slice(0, 7) === m;
          })
        : dashMaint;
    renderDashCategoryPie(filtered);
}

function renderDashFuelTrend(fuel) {
    if (typeof Highcharts === "undefined") {
        return;
    }
    var groups = {};
    (fuel || []).forEach(function (r) {
        var key = String(r.RecordDate || "").slice(0, 7);
        if (!key) {
            return;
        }
        if (!groups[key]) {
            groups[key] = { dist: 0, fuel: 0 };
        }
        groups[key].dist += Number(r.DistanceTravelled || 0);
        groups[key].fuel += Number(r.FuelAmount || 0);
    });
    var keys = Object.keys(groups).sort();
    var eff = keys.map(function (k) {
        return groups[k].fuel > 0 ? Number((groups[k].dist / groups[k].fuel).toFixed(2)) : 0;
    });
    var dist = keys.map(function (k) {
        return Math.round(groups[k].dist);
    });
    Highcharts.chart("chart_area", {
        chart: Object.assign(
            { backgroundColor: "transparent", style: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" } },
            carScrollableChartTweaks(keys.length),
        ),
        title: { text: null },
        credits: { enabled: false },
        xAxis: { categories: keys, labels: { style: { color: "#8b98a9" } }, lineColor: "#2c3a4d", tickColor: "#2c3a4d" },
        yAxis: [
            { title: { text: "油耗 (km/L)", style: { color: "#8b98a9" } }, labels: { style: { color: "#8b98a9" } }, gridLineColor: "#2c3a4d" },
            { title: { text: "行駛距離 (km)", style: { color: "#8b98a9" } }, labels: { style: { color: "#8b98a9" } }, opposite: true, gridLineColor: "#2c3a4d" },
        ],
        legend: { itemStyle: { color: "#8b98a9" }, itemHoverStyle: { color: "#fff" } },
        tooltip: { shared: true, backgroundColor: "#1a2332", borderColor: "#2c3a4d", style: { color: "#fff" } },
        series: [
            { name: "行駛距離", type: "column", yAxis: 1, data: dist, color: "#455a72", tooltip: { valueSuffix: " km" } },
            { name: "平均油耗", type: "line", yAxis: 0, data: eff, color: "#00bcd4", tooltip: { valueSuffix: " km/L" } },
        ],
    });
}

function renderDashCostChart(fuel, maint) {
    if (typeof Highcharts === "undefined") {
        return;
    }
    var months = {};
    (fuel || []).forEach(function (r) {
        var k = String(r.RecordDate || "").slice(0, 7);
        if (!k) {
            return;
        }
        months[k] = months[k] || { fuel: 0, maint: 0 };
        months[k].fuel += fuelCostTotal(r);
    });
    (maint || []).forEach(function (m) {
        var k = String(m.MaintenanceDate || "").slice(0, 7);
        if (!k) {
            return;
        }
        months[k] = months[k] || { fuel: 0, maint: 0 };
        months[k].maint += Number(m.Cost || 0);
    });
    var keys = Object.keys(months).sort();
    Highcharts.chart("dashCostChart", {
        chart: { type: "column", backgroundColor: "transparent", style: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" } },
        title: { text: null },
        credits: { enabled: false },
        xAxis: { categories: keys, labels: { style: { color: "#8b98a9" } }, lineColor: "#2c3a4d", tickColor: "#2c3a4d" },
        yAxis: {
            title: { text: "花費 (NT$)", style: { color: "#8b98a9" } },
            labels: { style: { color: "#8b98a9" } },
            gridLineColor: "#2c3a4d",
            stackLabels: { enabled: false },
        },
        legend: { itemStyle: { color: "#8b98a9" }, itemHoverStyle: { color: "#fff" } },
        tooltip: { shared: true, backgroundColor: "#1a2332", borderColor: "#2c3a4d", style: { color: "#fff" }, valuePrefix: "NT$ " },
        plotOptions: { column: { stacking: "normal", borderWidth: 0 } },
        series: [
            { name: "加油", data: keys.map(function (k) { return Math.round(months[k].fuel); }), color: "#00bcd4" },
            { name: "保養", data: keys.map(function (k) { return Math.round(months[k].maint); }), color: "#ff9800" },
        ],
    });
}

function renderDashRecent(fuel, maint) {
    var recentFuel = (fuel || []).slice().reverse().slice(0, 5);
    var recentMaint = (maint || []).slice().reverse().slice(0, 5);

    var $f = $("#dashRecentFuel");
    $f.empty();
    if (!recentFuel.length) {
        $f.html('<div class="dash-empty">無資料</div>');
    } else {
        recentFuel.forEach(function (r) {
            var item = $('<div class="dash-recent-item"></div>');
            item.append($("<span></span>").text(r.RecordDate || ""));
            item.append($("<span></span>").text(Number(r.FuelAmount || 0) + " L"));
            item.append($("<span></span>").text("$" + Math.round(fuelCostTotal(r)).toLocaleString()));
            item.append($("<span></span>").text(Number(r.FuelEfficiency || 0) + " km/L"));
            $f.append(item);
        });
    }

    var $m = $("#dashRecentMaint");
    $m.empty();
    if (!recentMaint.length) {
        $m.html('<div class="dash-empty">無資料</div>');
    } else {
        recentMaint.forEach(function (r) {
            var item = $('<div class="dash-recent-item"></div>');
            item.append($("<span></span>").text(r.MaintenanceDate || ""));
            item.append($("<span></span>").text(r.PartName || ""));
            item.append($("<span></span>").text("$" + Math.round(Number(r.Cost || 0)).toLocaleString()));
            $m.append(item);
        });
    }
}

// ==================== 通用 ag-Grid 建立器（含操作按鈕） ====================

function carGrid(eleId, columnDefs, rowData) {
    var div = document.getElementById(eleId);
    if (!div) {
        return null;
    }
    window._carGrids = window._carGrids || {};
    var existing = window._carGrids[eleId];

    // 如果表格已存在且欄位結構相同，直接更新資料（不重建整個表格）
    if (existing && typeof existing.setGridOption === "function") {
        existing.setGridOption("rowData", rowData || []);
        return existing;
    }

    if (existing && typeof existing.destroy === "function") {
        existing.destroy();
    }
    div.innerHTML = "";
    var api = agGrid.createGrid(div, {
        columnDefs: columnDefs,
        rowData: rowData || [],
        defaultColDef: { sortable: true, filter: true, resizable: true },
        animateRows: true,
    });
    window._carGrids[eleId] = api;
    return api;
}

function carActionButton(text, cls, onClick) {
    var btn = document.createElement("button");
    btn.textContent = text;
    btn.className = "btn " + cls;
    btn.addEventListener("click", onClick);
    var wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.justifyContent = "center";
    wrap.appendChild(btn);
    return wrap;
}

function carActionButtons(defs) {
    var wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "6px";
    wrap.style.justifyContent = "center";
    (defs || []).forEach(function (d) {
        var btn = document.createElement("button");
        btn.textContent = d.text;
        btn.className = "btn " + d.cls;
        btn.addEventListener("click", d.onClick);
        wrap.appendChild(btn);
    });
    return wrap;
}

function carVid() {
    var v = $("#vehiclesSelect").val();
    return v ? v.split("_")[0].replace("#", "") : "";
}

// ==================== 保養週期設定（MaintenanceCycles） ====================

function loadPartsCycles(vid, uid) {
    return Promise.all([
        $.get("/api/vehicles/" + vid + "/cycles"),
        $.get("/api/vehicles/" + vid + "/cycles/recommend"),
    ]).then(function (res) {
        var cyclesData = res[0].cycles || [];
        var lastMaintList = res[0].lastMaintenance || [];
        var rec = res[1] || [];

        var lastMap = {};
        lastMaintList.forEach(function (l) {
            lastMap[l.PartName] = { LastDate: l.LastDate, LastOdo: l.LastOdo };
        });

        var currentOdo = Number(sessionStorage.getItem("latest_odometer") || 0);
        renderCycleGrid(
            cyclesData.map(function (c) {
                return { CycleID: c.CycleId, PartName: c.PartName, MileageCycle: c.MileageCycle, TimeCycle: c.TimeCycle };
            }),
            lastMap,
            currentOdo,
        );
        renderRecommendGrid(
            rec.map(function (r) {
                return { PartName: r.PartName, avgCost: r.AvgCost, avgOdo: r.AvgOdo, avgDate: r.AvgDate, CntPart: r.CntPart };
            }),
        );
    });
}

function renderCycleGrid(cycles, lastMap, currentOdo) {
    var today = new Date();
    var statusLabel = { red: "已超標", yellow: "即將到期", green: "正常", none: "尚無紀錄" };
    var statusColor = { 已超標: "#f44336", 即將到期: "#ffbf00", 正常: "#4caf50", 尚無紀錄: "#8b98a9" };
    var rows = (cycles || []).map(function (c) {
        var last = lastMap[c.PartName];
        var lastOdo = last ? Number(last.LastOdo || 0) : null;
        var lastDate = last ? last.LastDate : null;
        var mileageCycle = Number(c.MileageCycle || 0);
        var timeCycle = Number(c.TimeCycle || 0);
        var st = [];
        if (mileageCycle > 0 && lastOdo != null) {
            var kmRemain = mileageCycle - (currentOdo - lastOdo);
            st.push(kmRemain <= 0 ? "red" : kmRemain <= mileageCycle * 0.2 ? "yellow" : "green");
        }
        if (timeCycle > 0 && lastDate) {
            var daysRemain = timeCycle - Math.floor((today - new Date(lastDate)) / 86400000);
            st.push(daysRemain <= 0 ? "red" : daysRemain <= timeCycle * 0.2 ? "yellow" : "green");
        }
        var status = st.indexOf("red") >= 0 ? "red" : st.indexOf("yellow") >= 0 ? "yellow" : st.length ? "green" : "none";
        return {
            CycleID: c.CycleID,
            零件: c.PartName,
            里程週期: mileageCycle,
            時間週期: timeCycle,
            上次里程: lastOdo != null ? lastOdo : "",
            上次日期: lastDate || "",
            狀態: statusLabel[status],
        };
    });
    var cols = [
        { field: "零件", flex: 1, minWidth: 120 },
        { field: "里程週期", width: 120, valueFormatter: function (p) { return Number(p.value || 0).toLocaleString() + " km"; } },
        { field: "時間週期", width: 110, valueFormatter: function (p) { return Number(p.value || 0) + " 天"; } },
        { field: "上次里程", width: 120, valueFormatter: function (p) { return p.value === "" ? "—" : Number(p.value).toLocaleString(); } },
        { field: "上次日期", width: 120, valueFormatter: function (p) { return p.value || "—"; } },
        { field: "狀態", width: 110, cellStyle: function (p) { return { color: statusColor[p.value] || "#e6edf3", fontWeight: "700" }; } },
        {
            field: "操作",
            width: 160,
            sortable: false,
            filter: false,
            cellRenderer: function (p) {
                return carActionButtons([
                    { text: "編輯", cls: "btn-primary", onClick: function () { editCycle(p.data); } },
                    { text: "刪除", cls: "btn-danger", onClick: function () { confirmDeleteCycle(p.data.CycleID, p.data["零件"]); } },
                ]);
            },
        },
    ];
    carGrid("cycleGrid", cols, rows);
}

function renderRecommendGrid(rec) {
    var rows = (rec || []).map(function (r) {
        return {
            零件: r.PartName,
            平均里程週期: Math.round(Number(r.avgOdo || 0)),
            平均時間週期: Math.round(Number(r.avgDate || 0)),
            平均花費: Math.round(Number(r.avgCost || 0)),
            次數: Number(r.CntPart || 0),
        };
    });
    var cols = [
        { field: "零件", flex: 1, minWidth: 120 },
        { field: "平均里程週期", width: 140, valueFormatter: function (p) { return Number(p.value || 0).toLocaleString() + " km"; } },
        { field: "平均時間週期", width: 130, valueFormatter: function (p) { return Number(p.value || 0) + " 天"; } },
        { field: "平均花費", width: 120, valueFormatter: function (p) { return "$" + Number(p.value || 0).toLocaleString(); } },
        { field: "次數", width: 90 },
        {
            field: "操作",
            width: 110,
            sortable: false,
            filter: false,
            cellRenderer: function (p) {
                return carActionButton("採用", "btn-primary", function () {
                    adoptRecommend(p.data["零件"], p.data["平均里程週期"], p.data["平均時間週期"]);
                });
            },
        },
    ];
    carGrid("recommendGrid", cols, rows);
}

// 開啟「新增週期」表單（清空、切回新增模式）
function openNewCycleForm() {
    editingCycleId = null;
    $("#cycleForm_part, #cycleForm_km, #cycleForm_day").val("");
    var btn = document.getElementById("cycleSubmitBtn");
    if (btn) {
        btn.textContent = "送出";
    }
    show_toggleEle("cycleForm");
}

// 編輯既有週期：帶入表單並切換為編輯模式
function editCycle(data) {
    editingCycleId = data.CycleID;
    $("#cycleForm_part").val(data["零件"] || "");
    $("#cycleForm_km").val(Number(data["里程週期"] || 0));
    $("#cycleForm_day").val(Number(data["時間週期"] || 0));
    $("#cycleForm").removeClass("d-none");
    var btn = document.getElementById("cycleSubmitBtn");
    if (btn) {
        btn.textContent = "更新週期";
    }
    var el = document.getElementById("cycleForm");
    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}
function submitNewCycle() {
    var vid = carVid();
    var part = ($("#cycleForm_part").val() || "").trim();
    var km = Number($("#cycleForm_km").val() || 0);
    var day = Number($("#cycleForm_day").val() || 0);
    if (!part || (km <= 0 && day <= 0)) {
        alert("請填寫零件名稱，且里程或時間週期至少一項");
        return;
    }
    var isEdit = !!editingCycleId;
    var payload = { partName: part, mileageCycle: km, timeCycle: day };

    loader_animate.load_start();
    var request = isEdit
        ? $.ajax({ url: "/api/cycles/" + editingCycleId, type: "PUT", contentType: "application/json", data: JSON.stringify(payload) })
        : $.ajax({ url: "/api/vehicles/" + vid + "/cycles", type: "POST", contentType: "application/json", data: JSON.stringify(payload) });

    request
        .done(function () {
            loader_animate.load_end();
            alert(isEdit ? "已更新週期" : "已新增週期");
            editingCycleId = null;
            var btn = document.getElementById("cycleSubmitBtn");
            if (btn) {
                btn.textContent = "送出";
            }
            $("#cycleForm_part, #cycleForm_km, #cycleForm_day").val("");
            loadPartsCycles(vid, null);
        })
        .fail(function (xhr) {
            loader_animate.load_end();
            if (xhr.status === 401) {
                alert("請先登入");
                window.location.assign("/signin.html");
            } else {
                alert((isEdit ? "更新" : "新增") + "失敗，請洽系統管理員");
            }
        });
}

// 採用建議週期：帶入新增表單（供使用者確認/調整後再送出）
function adoptRecommend(part, km, day) {
    editingCycleId = null;
    $("#cycleForm_part").val(part || "");
    $("#cycleForm_km").val(Number(km || 0));
    $("#cycleForm_day").val(Number(day || 0));
    $("#cycleForm").removeClass("d-none");
    var btn = document.getElementById("cycleSubmitBtn");
    if (btn) {
        btn.textContent = "送出";
    }
    var el = document.getElementById("cycleForm");
    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

function confirmDeleteCycle(cycleId, part) {
    var vid = carVid();
    if (!cycleId) {
        return;
    }
    if (!confirm("確定刪除週期「" + (part || "") + "」？")) {
        return;
    }
    loader_animate.load_start();
    $.ajax({ url: "/api/cycles/" + cycleId, type: "DELETE" })
        .done(function () {
            loader_animate.load_end();
            loadPartsCycles(vid, null);
        })
        .fail(function () {
            loader_animate.load_end();
            alert("刪除失敗，請洽系統管理員");
        });
}
// ==================== 保養紀錄（PartsMaintenance） ====================

function loadMaintenance(vid, uid) {
    return Promise.all([
        $.get("/api/vehicles/" + vid + "/maintenance"),
        $.get("/api/vehicles/" + vid + "/maintenance/part-names"),
        $.get("/api/part-categories"),
        $.get("/api/vehicles/" + vid + "/latest-odometer"),
    ]).then(function (res) {
        var maint = res[0].map(function (r) {
            return {
                MaintenanceID: r.MaintenanceId,
                PartName: r.PartName,
                MaintenanceDate: r.MaintenanceDate,
                Cost: r.Cost,
                OdometerReading: r.OdometerReading,
                Store: r.Store,
                Notes: r.Notes,
                CategoryId: r.CategoryId,
                CategoryName: r.CategoryName,
            };
        });
        var parts = res[1].map(function (p) {
            return { PartName: p };
        });
        partCategories = res[2] || [];
        var latestOdo = Number((res[3] && res[3].maxOdo) || 0);

        renderMaintKpis(maint);
        renderMaintGrid(maint);
        populateMaintPartList(parts);
        // 分類下拉選單仍在此頁使用；分類「管理」(新增/刪除)已移到獨立的「保養分類」頁籤，
        // 那裡的 categoryGrid 只在該頁籤被點開、DOM 可見時才初始化(ag-Grid 在隱藏容器裡量不到寬高會建錯)。
        populateMaintCategorySelect(partCategories);
        prefillMaintForm(latestOdo);
    });
}

// 里程欄位預設帶入目前已知最大里程(油耗+保養兩者取大者)，方便同一天/同次進廠多筆保養時不用重複輸入；
// 使用者仍可自行覆寫成其他里程數。日期欄位維持原本「沒填才帶入今天」的邏輯。
function prefillMaintForm(latestOdo) {
    if (!$("#maintForm_date").val()) {
        $("#maintForm_date").val(new Date().toISOString().slice(0, 10));
    }
    if (!$("#maintForm_odo").val() && latestOdo > 0) {
        $("#maintForm_odo").val(latestOdo);
    }
}

// ==================== 保養分類（獨立頁籤：分類管理，跨車輛共用） ====================

function loadCategoryPage() {
    return $.get("/api/part-categories").then(function (categories) {
        partCategories = categories || [];
        renderCategoryGrid(partCategories);
    });
}

function renderCategoryGrid(categories) {
    var rows = (categories || []).map(function (c) {
        return { CategoryId: c.CategoryId, 分類名稱: c.CategoryName };
    });
    var cols = [
        { field: "分類名稱", flex: 1, minWidth: 140 },
        {
            field: "操作",
            width: 110,
            sortable: false,
            filter: false,
            cellRenderer: function (p) {
                return carActionButton("刪除", "btn-danger", function () {
                    confirmDeleteCategory(p.data.CategoryId, p.data["分類名稱"]);
                });
            },
        },
    ];
    carGrid("categoryGrid", cols, rows);
}

// 填入「新增保養」表單的分類下拉選單；重新整理時盡量保留使用者原本選取的值
function populateMaintCategorySelect(categories) {
    var sel = $("#maintForm_category");
    if (!sel.length) {
        return;
    }
    var current = sel.val();
    sel.empty().append($("<option></option>").attr("value", "").text("（未分類）"));
    (categories || []).forEach(function (c) {
        sel.append($("<option></option>").attr("value", c.CategoryId).text(c.CategoryName));
    });
    if (current) {
        sel.val(current);
    }
}

function submitNewCategory() {
    var name = ($("#categoryForm_name").val() || "").trim();
    if (!name) {
        alert("請輸入分類名稱");
        return;
    }
    loader_animate.load_start();
    $.ajax({
        url: "/api/part-categories",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ categoryName: name }),
    })
        .done(function () {
            loader_animate.load_end();
            $("#categoryForm_name").val("");
            $("#categoryForm").addClass("d-none");
            loadCategoryPage();
        })
        .fail(function (xhr) {
            loader_animate.load_end();
            if (xhr.status === 401) {
                alert("請先登入");
                window.location.assign("/signin.html");
            } else {
                alert((xhr.responseJSON && xhr.responseJSON.message) || "新增分類失敗，請洽系統管理員");
            }
        });
}

function confirmDeleteCategory(categoryId, name) {
    if (!categoryId) {
        return;
    }
    if (!confirm("確定刪除分類「" + (name || "") + "」？")) {
        return;
    }
    loader_animate.load_start();
    $.ajax({ url: "/api/part-categories/" + categoryId, type: "DELETE" })
        .done(function () {
            loader_animate.load_end();
            loadCategoryPage();
        })
        .fail(function (xhr) {
            loader_animate.load_end();
            // 使用中禁止刪除時，後端會回傳 400 + 明確訊息，直接顯示給使用者
            alert((xhr.responseJSON && xhr.responseJSON.message) || "刪除失敗，請洽系統管理員");
        });
}

function renderMaintKpis(maint) {
    maint = maint || [];
    var count = maint.length;
    var cost = maint.reduce(function (s, r) {
        return s + Number(r.Cost || 0);
    }, 0);
    var last = maint.length ? maint[0].MaintenanceDate : "-";
    $("#maintKpiCount").text(count.toLocaleString());
    $("#maintKpiCost").text("$" + Math.round(cost).toLocaleString());
    $("#maintKpiLast").text(last || "-");
}

function renderMaintGrid(maint) {
    var rows = (maint || []).map(function (r) {
        return {
            MaintenanceID: r.MaintenanceID,
            日期: r.MaintenanceDate || "",
            零件: r.PartName || "",
            分類: r.CategoryName || "未分類",
            里程: Number(r.OdometerReading || 0),
            花費: Number(r.Cost || 0),
            店家: r.Store || "",
            備註: r.Notes || "",
        };
    });
    var cols = [
        { field: "日期", width: 120, sort: "desc" },
        { field: "零件", flex: 1, minWidth: 120 },
        { field: "分類", width: 110 },
        { field: "里程", width: 120, valueFormatter: function (p) { return Number(p.value || 0).toLocaleString(); } },
        { field: "花費", width: 120, valueFormatter: function (p) { return "$" + Number(p.value || 0).toLocaleString(); } },
        { field: "店家", width: 140 },
        { field: "備註", flex: 1, minWidth: 120 },
        {
            field: "操作",
            width: 110,
            sortable: false,
            filter: false,
            cellRenderer: function (p) {
                return carActionButton("刪除", "btn-danger", function () {
                    confirmDeleteMaintenance(p.data.MaintenanceID, p.data["零件"]);
                });
            },
        },
    ];
    carGrid("maintGrid", cols, rows);
}

function populateMaintPartList(parts) {
    var dl = $("#maintPartList");
    if (!dl.length) {
        return;
    }
    dl.empty();
    (parts || []).forEach(function (p) {
        dl.append($("<option></option>").attr("value", p.PartName));
    });
}

function submitMaintenance() {
    var vid = carVid();
    if (!vid) {
        alert("請先選擇車輛");
        return;
    }
    var date = $("#maintForm_date").val();
    var part = ($("#maintForm_part").val() || "").trim();
    var categoryIdRaw = $("#maintForm_category").val();
    var categoryId = categoryIdRaw ? Number(categoryIdRaw) : null;
    var odo = Number($("#maintForm_odo").val() || 0);
    var cost = Number($("#maintForm_cost").val() || 0);
    var store = ($("#maintForm_store").val() || "").trim();
    var note = ($("#maintForm_note").val() || "").trim();
    if (!date || !part) {
        alert("請填寫日期與零件");
        return;
    }

    loader_animate.load_start();
    $.ajax({
        url: "/api/vehicles/" + vid + "/maintenance",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            partName: part,
            maintenanceDate: date,
            cost: cost,
            odometerReading: odo,
            store: store,
            notes: note,
            categoryId: categoryId,
        }),
    })
        .done(function () {
            loader_animate.load_end();
            alert("已新增保養紀錄");
            $("#maintForm_part, #maintForm_odo, #maintForm_cost, #maintForm_store, #maintForm_note").val("");
            $("#maintForm_category").val("");
            loadMaintenance(vid, null);
        })
        .fail(function (xhr) {
            loader_animate.load_end();
            if (xhr.status === 401) {
                alert("請先登入");
                window.location.assign("/signin.html");
            } else {
                alert("新增失敗，請洽系統管理員");
            }
        });
}

function confirmDeleteMaintenance(mid, part) {
    var vid = carVid();
    if (!mid) {
        return;
    }
    if (!confirm("確定刪除保養紀錄「" + (part || "") + "」？")) {
        return;
    }
    loader_animate.load_start();
    $.ajax({ url: "/api/maintenance/" + mid, type: "DELETE" })
        .done(function () {
            loader_animate.load_end();
            loadMaintenance(vid, null);
        })
        .fail(function () {
            loader_animate.load_end();
            alert("刪除失敗，請洽系統管理員");
        });
}

function edit_Vehicles(ele) {
    var oldVid = $("#edit_vID").val();
    var newVid = $(ele).prop("id").split("_")[1];
    if (oldVid == newVid) {
        show_toggleEle("Vehicle_edit_area");
    } else {
        $("#edit_vID").val(newVid);
        $("#edit_vMake").val($("#vMake_" + newVid).html());
        $("#edit_vModel").val($("#vModel_" + newVid).html());
        $("#edit_vYear").val($("#vYear_" + newVid).html());
        $("#edit_vPlate").val($("#vLicensePlate_" + newVid).html());
        $("#Vehicle_edit_area").removeClass("d-none");
    }
    console.log($(ele).prop("id"));
}
function upd_Vehicle() {
    var vid = $("#edit_vID").val();
    var payload = {
        make: $("#edit_vMake").val(),
        model: $("#edit_vModel").val(),
        year: Number($("#edit_vYear").val()),
        licensePlate: $("#edit_vPlate").val(),
    };

    loader_animate.load_start();
    var request = vid === ""
        ? $.ajax({ url: "/api/vehicles", type: "POST", contentType: "application/json", data: JSON.stringify(payload) })
        : $.ajax({ url: "/api/vehicles/" + vid, type: "PUT", contentType: "application/json", data: JSON.stringify(payload) });

    request
        .done(function () {
            loader_animate.load_end();
            reload_toDash();
        })
        .fail(function (xhr) {
            loader_animate.load_end();
            if (xhr.status === 401) {
                alert("請先登入");
                window.location.assign("/signin.html");
            } else if (xhr.status === 403) {
                alert("無權限修改此車輛");
            } else {
                alert("上傳失敗，請洽系統管理員");
            }
            reload_toDash();
        });
}
function del_Vehicle() {
    var vid = $("#edit_vID").val();
    if (vid == "") {
        return;
    }
    if (!confirm("確定刪除這台車輛？")) {
        return;
    }
    loader_animate.load_start();
    $.ajax({ url: "/api/vehicles/" + vid, type: "DELETE" })
        .done(function () {
            loader_animate.load_end();
            reload_toDash();
        })
        .fail(function (xhr) {
            loader_animate.load_end();
            if (xhr.status === 403) {
                alert("無權限刪除此車輛");
            } else {
                alert("刪除失敗，請洽系統管理員");
            }
            reload_toDash();
        });
}
function add_Vihecle() {
    $("#edit_vID").val(null);
    $("#edit_vMake").val(null);
    $("#edit_vModel").val(null);
    $("#edit_vYear").val(null);
    $("#edit_vPlate").val(null);
    show_toggleEle("Vehicle_edit_area");
}
function reload_toDash() {
    refreshAllData();
    swipeMainSection($("<div><text>Dashboard</text></div>"));
}
function reload_toOilRecord() {
    swipeMainSection($("<div><text>Oil Record</text></div>"));
}
function get_latest_odometer() {
    var vid = $("#vehiclesSelect").val().split("_")[0].replace("#", "");
    $.get("/api/vehicles/" + vid + "/latest-odometer")
        .done(function (data) {
            sessionStorage.setItem("latest_odometer", data.maxOdo || 0);
        })
        .fail(function () {
            // 靜默失敗即可，不影響主要流程
        });
}
function refreshAllData() {
    sel_Vehicles()
        .then(function () {
            create_VehiclesSelectOption();
            create_VehiclesTable();
            get_latest_odometer();
            // 初始載入目前選中的分頁（預設 Dashboard）
            if ($("#vehiclesSelect").val()) {
                var active = $(".nav-link.active").children("text").html() || "Dashboard";
                load_to_page(String(active).replaceAll(" ", "").toUpperCase());
            }
        })
        .catch((error) => {
            console.error("有一個 Promise 失敗了:", error);
        });
}
function sel_Vehicles() {
    return new Promise((resolve, reject) => {
        loader_animate.load_start();
        $.get("/api/my-vehicles")
            .done(function (data) {
                vehicalsTable = data;
                loader_animate.load_end();
                resolve();
            })
            .fail(function (xhr) {
                loader_animate.load_end();
                if (xhr.status === 401) {
                    alert("請先登入");
                    window.location.assign("/signin.html");
                } else {
                    alert("讀取車輛清單失敗，請洽系統管理員");
                }
                reject(xhr);
            });
    });
}

function switchSection(ele) {
    var view = $(ele).attr("data-view");
    if (!view) {
        return;
    }

    $(".app-nav-item, .app-bottom-nav-item").removeClass("active");
    $('[data-view="' + view + '"]').addClass("active");

    $("section").addClass("d-none");
    $("#" + view).removeClass("d-none");

    load_to_page(view.toUpperCase());
}

// ! -- Main Area ------------------------------------------------------------------------------
$(document).ready(function () {
    checkSignInStatus().then(function () {
        refreshAllData();
    });
});