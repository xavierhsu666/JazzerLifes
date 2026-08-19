/**
 * JazzerLife Finance 主應用程式
 * 使用 Class 架構管理整個應用程式狀態與行為
 */

class FinanceApp {
    /**
     * 建構子 - 初始化應用程式
     */
    constructor() {
        // DOM 元素參照
        this.elements = {
            sidebar: document.getElementById("sidebar"),
            sidebarToggle: document.getElementById("sidebarToggle"),
            floatingMenuBtn: document.getElementById("floatingMenuBtn"),
            navItems: document.querySelectorAll(".nav-item"),
            tabList: document.getElementById("tabList"),
            mainContent: document.getElementById("mainContent"),
            modalOverlay: document.getElementById("modalOverlay"),
            modal: document.getElementById("modal"),
            modalTitle: document.getElementById("modalTitle"),
            modalBody: document.getElementById("modalBody"),
            modalClose: document.getElementById("modalClose"),
            modalCancel: document.getElementById("modalCancel"),
            modalConfirm: document.getElementById("modalConfirm"),
            sidebarUserStatus: document.getElementById("sidebarUserStatus"),
            navbarUserStatus: document.getElementById("navbarUserStatus"),
            sidebarLoginBtn: document.getElementById("sidebarLoginBtn"),
            navbarLoginBtn: document.getElementById("navbarLoginBtn"),
            statMoM: document.getElementById("statMoM"),
            statYoY: document.getElementById("statYoY"),
            statBalance: document.getElementById("statBalance"),
        };
        this.gridDefsMap = {
            "transaction-income-details": [
                { field: "YearMonth", headerName: "年月", width: 120, sort: "desc", filter: "agSetColumnFilter", mobileHide: true },
                { field: "TransactionDate", headerName: "日期", width: 120, minWidth: 120, sort: "desc", valueFormatter: (params) => this.formatDate(params.value) },
                { field: "Category", headerName: "類別", width: 105 },
                { field: "OrganizationName", headerName: "銀行", width: 100, mobileHide: true },
                { field: "AccountName", headerName: "帳戶", width: 100, mobileHide: true },
                { field: "Description", headerName: "描述", width: 180, minWidth: 110, flex: 1 },
                {
                    field: "Amount",
                    headerName: "金額",
                    width: 105,
                    valueFormatter: (params) => this.formatCurrency(params.value),
                    cellStyle: (params) => this.getCellStyle(params.value),
                },
                { field: "Tag", headerName: "標註", width: 150, mobileHide: true },
                { field: "Notes", headerName: "筆記", width: 150, mobileHide: true },
                {
                    field: "_exclude",
                    headerName: "操作",
                    width: 105,
                    minWidth: 105,
                    pinned: "right",
                    sortable: false,
                    filter: false,
                    editable: false,
                    cellRenderer: (params) => this._excludeCellRenderer(params),
                },
            ],
            "transaction-expense-details": [
                { field: "YearMonth", headerName: "年月", width: 120, sort: "desc", filter: "agSetColumnFilter", mobileHide: true },
                { field: "TransactionDate", headerName: "日期", width: 120, minWidth: 120, sort: "desc", valueFormatter: (params) => this.formatDate(params.value) },
                { field: "Category", headerName: "類別", width: 105 },
                { field: "OrganizationName", headerName: "銀行", width: 100, mobileHide: true },
                { field: "AccountName", headerName: "帳戶", width: 100, mobileHide: true },
                { field: "Description", headerName: "描述", width: 180, minWidth: 110, flex: 1 },
                {
                    field: "Amount",
                    headerName: "金額",
                    width: 105,
                    valueFormatter: (params) => this.formatCurrency(params.value),
                    cellStyle: (params) => this.getCellStyle(params.value),
                },
                { field: "Tag", headerName: "標註", width: 150, mobileHide: true },
                { field: "Notes", headerName: "筆記", width: 150, mobileHide: true },
                {
                    field: "_exclude",
                    headerName: "操作",
                    width: 105,
                    minWidth: 105,
                    pinned: "right",
                    sortable: false,
                    filter: false,
                    editable: false,
                    cellRenderer: (params) => this._excludeCellRenderer(params),
                },
            ],
            "transaction-details": [
                { field: "YearMonth", headerName: "年月", width: 120, sort: "desc", filter: "agSetColumnFilter", mobileHide: true },
                { field: "TransactionDate", headerName: "日期", width: 120, minWidth: 120, sort: "desc", valueFormatter: (params) => this.formatDate(params.value) },
                { field: "Category", headerName: "類別", width: 105 },
                { field: "OrganizationName", headerName: "銀行", width: 100, mobileHide: true },
                { field: "AccountName", headerName: "帳戶", width: 100, mobileHide: true },
                { field: "Description", headerName: "描述", width: 180, minWidth: 110, flex: 1 },
                {
                    field: "Amount",
                    headerName: "金額",
                    width: 105,
                    valueFormatter: (params) => this.formatCurrency(params.value),
                    cellStyle: (params) => this.getCellStyle(params.value),
                },
                { field: "Tag", headerName: "標註", width: 150, mobileHide: true },
                { field: "Notes", headerName: "筆記", width: 150, mobileHide: true },
                {
                    field: "_exclude",
                    headerName: "操作",
                    width: 105,
                    minWidth: 105,
                    pinned: "right",
                    sortable: false,
                    filter: false,
                    editable: false,
                    cellRenderer: (params) => this._excludeCellRenderer(params),
                },
            ],
            "account-list": [
                { field: "YearMonth", headerName: "年月", width: 110, sort: "desc", filter: "agSetColumnFilter" },
                { field: "OrganizationName", headerName: "銀行", flex: 1.2, minWidth: 130 },
                { field: "AccountName", headerName: "帳戶", flex: 1.2, minWidth: 130 },
                { field: "Category", headerName: "分類", width: 110, minWidth: 100 },
                { field: "Currency", headerName: "幣別", width: 90 },
                {
                    field: "AccountBalance",
                    headerName: "金額",
                    flex: 1.5,
                    minWidth: 140,
                    valueFormatter: (params) => {
                        return "$" + Math.round(Number(params.value || 0)).toLocaleString();
                    },
                    cellStyle: (params) => this.getCellStyle(params.value),
                    sort: "desc",
                },
                {
                    field: "Activate",
                    headerName: "操作",
                    width: 140,
                    minWidth: 140,
                    pinned: "right",
                    sortable: false,
                    filter: false,
                    editable: false,
                    cellRenderer: (params) => {
                        const editButton = document.createElement("button");
                        editButton.textContent = "修改結餘";
                        editButton.classList.add("btn", "btn-primary");
                        editButton.addEventListener("click", () => {
                            this.openAccountBalanceModal(params.data);
                        });
                        const buttonArea = document.createElement("div");
                        $(buttonArea).css({ display: "flex", gap: "8px", justifyContent: "center" });
                        buttonArea.appendChild(editButton);
                        return buttonArea;
                    },
                },
            ],
            "portfolio-overview": [
                { field: "yyyymm", headerName: "時間", width: 130, sort: "desc" },
                { field: "Code", headerName: "股票代號", width: 180, sort: "desc" },
                { field: "Unit", headerName: "單位", width: 100 },
                {
                    field: "Cost",
                    headerName: "成本",
                    width: 150,
                    valueFormatter: (params) => this.formatCurrency(params.value),
                },
                {
                    field: "MarketValue",
                    headerName: "市值",
                    width: 150,
                    valueFormatter: (params) => this.formatCurrency(params.value),
                },
                {
                    field: "UnRealizedBenefit",
                    headerName: "未實現損益",
                    width: 150,
                    valueFormatter: (params) => this.formatCurrency(params.value),
                    cellStyle: (params) => this.getCellStyle(params.value),
                },
            ],
            "project-management": [
                { field: "BillProjectId", headerName: "專案名稱", flex: 1.6, minWidth: 140, sort: "desc" },
                { field: "KeyWord", headerName: "關鍵字", flex: 1.2, minWidth: 110 },
                { field: "Status", headerName: "狀態", width: 100, minWidth: 90 },
                {
                    // 改為「上個月預期資產」：取該專案「預期資產變化」子系統實際有資料的最新月份期末推算值，不再是建立專案時的預算
                    field: "PrevMonthExpectedAsset",
                    headerName: "上月預期資產",
                    flex: 1.2,
                    minWidth: 130,
                    valueFormatter: (params) => "NT$" + Math.round(Number(params.value || 0)).toLocaleString(),
                },
                {
                    // 改為「上個月實際資產」：取該專案「資產流」子系統實際有綁定資料的最新月份帳戶餘額合計，不再是關鍵字命中交易的淨收支。
                    // 專案若勾了「將現金流計入上月實際資產」，數字會多加現金流累計淨額，標註出來才不會看不出兩個專案的口徑不同
                    field: "PrevMonthActualAsset",
                    headerName: "上月實際資產",
                    flex: 1.2,
                    minWidth: 130,
                    valueFormatter: (params) => {
                        const base = "NT$" + Math.round(Number(params.value || 0)).toLocaleString();
                        return params.data?.IncludeCashflowInActualAsset ? base + "（含現金流）" : base;
                    },
                    cellStyle: (params) => this.getCellStyle(params.value),
                },
                {
                    // 達成率改由「上月實際資產 / 上月預期資產」計算（後端算好直接回傳）
                    field: "FullfillRatio",
                    headerName: "達成率",
                    width: 100,
                    minWidth: 90,
                    valueFormatter: (params) => (Number(params.value || 0) * 100).toFixed(2) + "%",
                    cellStyle: (params) => this.getCellStyle(params.value),
                },
                {
                    field: "Activate",
                    headerName: "操作",
                    width: 170,
                    minWidth: 170,
                    pinned: "right",
                    sortable: false,
                    filter: false,
                    editable: false,
                    cellRenderer: (params) => {
                        const detailButton = document.createElement("button");
                        detailButton.textContent = "詳情";
                        detailButton.classList.add("btn", "btn-primary");
                        detailButton.addEventListener("click", () => {
                            this.openProjectDetail(params.data);
                        });

                        const deleteButton = document.createElement("button");
                        deleteButton.textContent = "刪除";
                        deleteButton.classList.add("btn", "btn-danger");
                        deleteButton.addEventListener("click", () => {
                            this.confirmDeleteProject(params.data);
                        });

                        const buttonArea = document.createElement("div");
                        $(buttonArea).css({
                            display: "flex",
                            gap: "8px",
                            justifyContent: "center",
                        });
                        buttonArea.appendChild(detailButton);
                        buttonArea.appendChild(deleteButton);
                        return buttonArea;
                    },
                },
            ],
            "bill-management": [
                { field: "BillProjectId", headerName: "專案名稱", width: 150, sort: "desc" },
                { field: "BillName", headerName: "帳單名稱", width: 150 },
                { field: "Frequency", headerName: "頻率", width: 400 },
                { field: "BillStartTime", headerName: "開始日期", width: 130, valueFormatter: (params) => this.formatDate(params.value) },
                { field: "BillEndTime", headerName: "結束日期", width: 130, valueFormatter: (params) => this.formatDate(params.value) },
                {
                    field: "BillAmount",
                    headerName: "金額",
                    width: 200,
                    valueFormatter: (params) => "NT$" + Math.round(Number(params.value || 0)).toLocaleString(),
                },
                { field: "Note", headerName: "備註", width: 200 },
                {
                    field: "BillId",
                    headerName: "操作",
                    width: 170,
                    minWidth: 170,
                    pinned: "right",
                    sortable: false,
                    filter: false,
                    editable: false,
                    cellRenderer: (params) => {
                        const editButton = document.createElement("button");
                        editButton.textContent = "編輯";
                        editButton.classList.add("btn", "btn-primary");
                        editButton.addEventListener("click", () => {
                            this.openEditBillModal(params.data);
                        });

                        const deleteButton = document.createElement("button");
                        deleteButton.textContent = "刪除";
                        deleteButton.classList.add("btn", "btn-danger");
                        deleteButton.addEventListener("click", () => {
                            this.confirmDeleteBill(params.data);
                        });

                        const buttonArea = document.createElement("div");
                        $(buttonArea).css({
                            display: "flex",
                            gap: "8px",
                            justifyContent: "center",
                        });
                        buttonArea.appendChild(editButton);
                        buttonArea.appendChild(deleteButton);
                        return buttonArea;
                    },
                },
            ],
            "bills-expense-monthly": [
                { field: "billProject", headerName: "專案名稱", width: 150, sort: "asc" },
                { field: "name", headerName: "帳單名稱", width: 150, sort: "asc" },
                { field: "january", headerName: "January", width: 100, cellStyle: (p) => (p.value > 0 ? { backgroundColor: "#ffbf00ff", color: "#ff0000ff", fontWeight: "bold" } : null) },
                { field: "february", headerName: "February", width: 100, cellStyle: (p) => (p.value > 0 ? { backgroundColor: "#ffbf00ff", color: "#ff0000ff", fontWeight: "bold" } : null) },
                { field: "march", headerName: "March", width: 100, cellStyle: (p) => (p.value > 0 ? { backgroundColor: "#ffbf00ff", color: "#ff0000ff", fontWeight: "bold" } : null) },
                { field: "april", headerName: "April", width: 100, cellStyle: (p) => (p.value > 0 ? { backgroundColor: "#ffbf00ff", color: "#ff0000ff", fontWeight: "bold" } : null) },
                { field: "may", headerName: "May", width: 100, cellStyle: (p) => (p.value > 0 ? { backgroundColor: "#ffbf00ff", color: "#ff0000ff", fontWeight: "bold" } : null) },
                { field: "june", headerName: "June", width: 100, cellStyle: (p) => (p.value > 0 ? { backgroundColor: "#ffbf00ff", color: "#ff0000ff", fontWeight: "bold" } : null) },
                { field: "july", headerName: "July", width: 100, cellStyle: (p) => (p.value > 0 ? { backgroundColor: "#ffbf00ff", color: "#ff0000ff", fontWeight: "bold" } : null) },
                { field: "august", headerName: "August", width: 100, cellStyle: (p) => (p.value > 0 ? { backgroundColor: "#ffbf00ff", color: "#ff0000ff", fontWeight: "bold" } : null) },
                { field: "september", headerName: "September", width: 100, cellStyle: (p) => (p.value > 0 ? { backgroundColor: "#ffbf00ff", color: "#ff0000ff", fontWeight: "bold" } : null) },
                { field: "october", headerName: "October", width: 100, cellStyle: (p) => (p.value > 0 ? { backgroundColor: "#ffbf00ff", color: "#ff0000ff", fontWeight: "bold" } : null) },
                { field: "november", headerName: "November", width: 100, cellStyle: (p) => (p.value > 0 ? { backgroundColor: "#ffbf00ff", color: "#ff0000ff", fontWeight: "bold" } : null) },
                { field: "december", headerName: "December", width: 100, cellStyle: (p) => (p.value > 0 ? { backgroundColor: "#ffbf00ff", color: "#ff0000ff", fontWeight: "bold" } : null) },
            ],
            "bluepicture-schedule": [
                { field: "Name", headerName: "計畫名稱", width: 200, sort: "asc" },
                { field: "Type", headerName: "計畫類型", width: 150 },
                { field: "bTimeBase", headerName: "時間單位", width: 150 },
                { field: "bStart", headerName: "起始時間", width: 150 },
                { field: "bEnd", headerName: "結束時間", width: 150 },
                { field: "initCapital", headerName: "初始資本", width: 150 },
                { field: "rewardRatio", headerName: "報酬率", width: 150 },
                { field: "monthlyInput", headerName: "月投入", width: 150 },
                { field: "inflationRatio", headerName: "通膨率", width: 150 },
                {
                    field: "Activate",
                    headerName: "操作",
                    width: 200,
                    cellRenderer: (params) => {
                        const button = document.createElement("button");
                        button.textContent = "Edit";
                        button.classList.add("btn", "btn-primary");
                        button.addEventListener("click", () => {
                            this.openEditScheduleModal(params.data);
                        });
                        const delButton = document.createElement("button");
                        delButton.textContent = "Delete";
                        delButton.classList.add("btn", "btn-secondary");
                        delButton.addEventListener("click", () => {
                            this.deleteSchedule(params.data);
                        });

                        const buttonArea = document.createElement("div");
                        $(buttonArea).css({ display: "flex", gap: "8px", justifyContent: "center" });
                        buttonArea.appendChild(button);
                        buttonArea.appendChild(delButton);
                        return buttonArea;
                    },
                },
            ],
            "investment-by-loan-tracking": [
                { field: "month", headerName: "期數", width: 120, sort: "asc" },
                { field: "payment", headerName: "期款", width: 120, valueFormatter: (params) => this.formatCurrency(params.value), editable: true },
                { field: "interestPayment", headerName: "利息", width: 120, valueFormatter: (params) => this.formatCurrency(params.value), editable: true },
                { field: "principalPayment", headerName: "本金", width: 120, valueFormatter: (params) => this.formatCurrency(params.value), editable: true },
                { field: "remainingPrincipal", headerName: "未償本金", width: 120, valueFormatter: (params) => this.formatCurrency(params.value), editable: true },
                { field: "cumulativeLoanInterest", headerName: "累計利息成本", width: 150, valueFormatter: (params) => this.formatCurrency(params.value), editable: true },
                { field: "monthlyInvestmentIncome", headerName: "每月投資收入", width: 150, valueFormatter: (params) => this.formatCurrency(params.value), editable: true },
                { field: "notes", headerName: "備註", width: 200, editable: true },
            ],
        };

        // 應用程式狀態
        this.state = {
            currentFeature: "overview",
            currentView: "asset-trend",
            isLoggedIn: false,
            user: null,
            charts: {},
            grids: {},
            selectedProjectId: null,
            projectDetailDraft: null,
            projectDetailMode: "asset",
            projectDetailMonth: "",
            projectDetailDirty: false,
            pdCashflowAllMonths: false,
            pdCashflowShowExcluded: false,
            accountSnapshotMonth: "",
            accountCategoryOptions: [],
            accountCategoryMap: {},
            accountCategoryFilter: "",
            financialData: {
                currentMonth: { Assets: null, Income: null, Expense: null, Time: null },
                lastMonth: { Assets: null, Income: null, Expense: null, Time: null },
                lastYearSameMonth: { Assets: null, Income: null, Expense: null, Time: null },
            },
        };
        this.data = { details: [], stocks: [], account: [], projects: [], bills: [], assets: [] };

        this.detailViewConfig = {
            "transaction-details": { grid: "transactionDetailsGrid", keyword: "txKeyword_all", month: "txMonth_all", panel: "txDetailPanel_all", sign: "all", showExcludedBtn: "txShowExcluded_all", chart: "transactionDetailsTrendChart" },
            "transaction-income-details": { grid: "transactionDetailsGrid_income", keyword: "txKeyword_income", month: "txMonth_income", panel: "txDetailPanel_income", sign: "income", showExcludedBtn: "txShowExcluded_income", chart: "transactionIncomeDetailsTrendChart" },
            "transaction-expense-details": { grid: "transactionDetailsGrid_expense", keyword: "txKeyword_expense", month: "txMonth_expense", panel: "txDetailPanel_expense", sign: "expense", showExcludedBtn: "txShowExcluded_expense", chart: "transactionExpenseDetailsTrendChart" },
        };
        this.txFilters = {
            "transaction-details": { keyword: "", month: "" },
            "transaction-income-details": { keyword: "", month: "" },
            "transaction-expense-details": { keyword: "", month: "" },
        };
        this.txShowExcluded = {
            "transaction-details": false,
            "transaction-income-details": false,
            "transaction-expense-details": false,
        };

        const caDefaultRange = this._defaultCategoryAnalysisRange("month");
        this.categoryAnalysis = {
            mode: "expense",
            granularity: "month",
            start: caDefaultRange.start,
            end: caDefaultRange.end,
            selectedPeriod: null,
            lastData: null,
        };

        this.featureViewsMap = {
            overview: [
                { id: "asset-trend", label: "資產" },
                { id: "cash-flow", label: "現金流" },
                { id: "expense-forecast", label: "預估支出" },
            ],
            details: [
                { id: "transaction-details", label: "總收支明細" },
                { id: "transaction-income-details", label: "收入明細" },
                { id: "transaction-expense-details", label: "支出明細" },
                { id: "transaction-category-analysis", label: "分類分析" },
            ],
            projects: [{ id: "project-management", label: "專案列表" }],
            bills: [
                { id: "bill-management", label: "帳單列表" },
                { id: "bills-expense-monthly", label: "每月支出" },
            ],
            accounts: [{ id: "account-list", label: "帳戶總覽" }],
            settings: [
                { id: "account-category", label: "帳戶分類" },
                { id: "auto-rule", label: "自動分類規則" },
                { id: "settings-general", label: "一般設定" },
            ],
            upload: [
                { id: "upload-detail", label: "麻布資料" },
                { id: "upload-tdcc", label: "集保存摺" },
            ],
        };

        this.init();
    }

    /**
     * 初始化應用程式
     */
    init() {
        this.bindEvents();
        this.renderTabs();
        this.enhanceAllDropdowns();
        var self = this;
        $.get("/api/auth/me")
            .done(function (data) {
                self.state.user = { name: data.account, userId: Number(data.userId) };
                self.state.isLoggedIn = true;
                self.updateUserStatus();
                self.switchView("asset-trend");
            })
            .fail(function () {
                self.state.isLoggedIn = false;
                $("#navbarLoginBtn").click();
            });
    }

    /**
     * 讀取資料
     */
    load_data(dataName) {
        var selfObj = this;
        switch (dataName) {
            case "accounts":
                return $.get("/api/finance/accounts", { month: this.state.accountSnapshotMonth || "" }).then(function (data) {
                    selfObj.data.account = data;
                });
            case "bills":
                return $.get("/api/finance/bills").then(function (data) {
                    selfObj.data.bills = data;
                });
            case "detail":
                return $.get("/api/finance/details", { sign: "all", keyword: "", month: "", showExcluded: false }).then(function (data) {
                    selfObj.data.details = data;
                });
            case "projects":
                return $.get("/api/finance/projects").then(function (data) {
                    selfObj.data.projects = data;
                });
            case "assets":
                return $.get("/api/finance/overview").then(function (data) {
                    selfObj.data.assets = data;
                });
            default:
                return $.Deferred().resolve().promise();
        }
    }

    /**
     * 綁定事件監聽器
     */
    bindEvents() {
        var self = this;


        this.elements.sidebarToggle.addEventListener("click", () => this.toggleSidebar());

        this.elements.floatingMenuBtn.addEventListener("click", () => {
            this.toggleSidebar();
            this.elements.floatingMenuBtn.classList.toggle("active");
        });

        // 手機版底部導覽列的「更多」：獨立的 bottom sheet 選單（上傳/設定），
        // 不依賴側邊欄的滑出動畫，避免在部分手機瀏覽器上點了卻「沒跑出東西」
        const bottomNavMore = document.getElementById("appBottomNavMore");
        const moreMenuOverlay = document.getElementById("moreMenuOverlay");
        const closeMoreMenu = () => {
            moreMenuOverlay?.classList.add("hidden");
            bottomNavMore?.classList.remove("active");
        };
        if (bottomNavMore && moreMenuOverlay) {
            bottomNavMore.addEventListener("click", () => {
                const isOpen = !moreMenuOverlay.classList.contains("hidden");
                if (isOpen) {
                    closeMoreMenu();
                } else {
                    moreMenuOverlay.classList.remove("hidden");
                    bottomNavMore.classList.add("active");
                }
            });
            // 點背景（選單本身以外的地方）關閉
            moreMenuOverlay.addEventListener("click", (e) => {
                if (e.target === moreMenuOverlay) {
                    closeMoreMenu();
                }
            });
            moreMenuOverlay.querySelectorAll(".more-menu-item").forEach((item) => {
                item.addEventListener("click", () => {
                    closeMoreMenu();
                    this.switchFeature(item.dataset.feature);
                });
            });
        }

        this.elements.navItems.forEach((item) => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                const feature = item.dataset.feature;
                this.switchFeature(feature);
            });
        });

        // 手機/桌面斷點切換時（例如旋轉手機或縮放視窗跨過 767px），重繪目前的明細表格，
        // 讓 mobileHide 欄位（銀行/帳戶/標註/筆記）能正確顯示或隱藏
        let wasMobileViewport = window.innerWidth <= 767;
        let resizeDebounce;
        window.addEventListener("resize", () => {
            clearTimeout(resizeDebounce);
            resizeDebounce = setTimeout(() => {
                const isMobileViewport = window.innerWidth <= 767;
                if (isMobileViewport !== wasMobileViewport) {
                    wasMobileViewport = isMobileViewport;
                    if (this.detailViewConfig[this.state.currentView]) {
                        this.renderDetailGrid(this.state.currentView);
                    }
                }
            }, 200);
        });

        this.elements.modalClose.addEventListener("click", () => this.closeModal());
        this.elements.modalCancel.addEventListener("click", () => this.closeModal());
        this.elements.modalOverlay.addEventListener("click", (e) => {
            if (e.target === this.elements.modalOverlay) {
                this.closeModal();
            }
        });

        this.elements.sidebarLoginBtn.addEventListener("click", () => this.showLoginModal());
        this.elements.navbarLoginBtn.addEventListener("click", () => this.showLoginModal());

        document.addEventListener("click", (e) => {
            if (window.innerWidth < 1200) {
                const isClickInsideSidebar = this.elements.sidebar.contains(e.target);
                const isToggleButton = this.elements.sidebarToggle.contains(e.target);
                const isFloatingButton = this.elements.floatingMenuBtn.contains(e.target);

                if (!isClickInsideSidebar && !isToggleButton && !isFloatingButton && this.elements.sidebar.classList.contains("active")) {
                    this.elements.sidebar.classList.remove("active");
                    this.elements.floatingMenuBtn.classList.remove("active");
                }
            }
        });

        $("#btnBackToProjectList").on("click", () => {
            if (!this.canLeaveProjectDetail("目前專案詳情有未儲存變更，確定要返回嗎？")) {
                return;
            }
            this.switchView("project-management");
        });
        $("#btnAddProjectList").on("click", () => this.openAddProjectModal());
        $("#projectSort").on("change", () => this.refreshProjectListView());
        $("#accountSnapshotMonth").on("change", (e) => {
            this.state.accountSnapshotMonth = e.target.value;
            this.refreshAccountUI();
        });
        $("#accountCategoryFilterSelect").on("change", (e) => {
            this.state.accountCategoryFilter = e.target.value;
            this.renderAccountListGrid();
        });

        Object.keys(this.detailViewConfig).forEach((viewId) => {
            const cfg = this.detailViewConfig[viewId];
            $("#" + cfg.keyword).on("input", (e) => {
                this.txFilters[viewId].keyword = e.target.value;
                this.renderDetailGrid(viewId);
            });
            $("#" + cfg.month).on("change", (e) => {
                this.txFilters[viewId].month = e.target.value;
                this.renderDetailGrid(viewId);
                this.highlightDetailTrendChartPeriod(viewId, e.target.value);
            });
            if (cfg.showExcludedBtn) {
                $("#" + cfg.showExcludedBtn).on("click", () => {
                    this.setDetailShowExcluded(viewId, !this.txShowExcluded[viewId]);
                });
            }
        });

        $("#caModeExpense").on("click", () => {
            this.categoryAnalysis.mode = "expense";
            this.categoryAnalysis.selectedPeriod = null;
            this.renderCategoryAnalysis();
        });
        $("#caModeIncome").on("click", () => {
            this.categoryAnalysis.mode = "income";
            this.categoryAnalysis.selectedPeriod = null;
            this.renderCategoryAnalysis();
        });
        $("#caGranMonth").on("click", () => {
            this.categoryAnalysis.granularity = "month";
            const range = this._defaultCategoryAnalysisRange("month");
            this.categoryAnalysis.start = range.start;
            this.categoryAnalysis.end = range.end;
            this.categoryAnalysis.selectedPeriod = null;
            this.renderCategoryAnalysis();
        });
        $("#caGranYear").on("click", () => {
            this.categoryAnalysis.granularity = "year";
            const range = this._defaultCategoryAnalysisRange("year");
            this.categoryAnalysis.start = range.start;
            this.categoryAnalysis.end = range.end;
            this.categoryAnalysis.selectedPeriod = null;
            this.renderCategoryAnalysis();
        });
        $("#caStart").on("change", (e) => {
            this.categoryAnalysis.start = e.target.value;
            this.categoryAnalysis.selectedPeriod = null;
            this.renderCategoryAnalysis();
        });
        $("#caEnd").on("change", (e) => {
            this.categoryAnalysis.end = e.target.value;
            this.categoryAnalysis.selectedPeriod = null;
            this.renderCategoryAnalysis();
        });
        $("#caClearSelection").on("click", () => {
            this.categoryAnalysis.selectedPeriod = null;
            this.applyCategoryAnalysisSelection();
        });

        $("#btnSaveProjectDetail").on("click", () => this.saveProjectDetail());
        $("#pdModeAsset").on("click", () => this.setProjectDetailMode("asset"));
        $("#pdModeCashflow").on("click", () => this.setProjectDetailMode("cashflow"));
        $("#pdModeExpected").on("click", () => this.setProjectDetailMode("expected"));
        $("#pdMonth").on("change", (e) => {
            this.state.projectDetailMonth = e.target.value;
            this.renderAssetPanelSummary();
            this.refreshAssetGrid();
            this.refreshCashflowGrid();
            this.updateProjectDetailSummary();
        });
        $("#pdAddRule").on("click", () => this.addCashflowRuleCard());
        $("#btnAddAutoRule").on("click", () => this.openAutoRuleModal(null));
        $("#btnRunAllAutoRules").on("click", () => this.runAllAutoRules());
        $("#pdOpenAssetModal").on("click", () => this.openAssetBindingModal());
        $("#pdClearAssetsAllMonths").on("click", () => this.clearAssetBindingsAllMonths());
        $("#pdCashflowAllMonths").on("click", () => {
            this.state.pdCashflowAllMonths = !this.state.pdCashflowAllMonths;
            const btn = document.getElementById("pdCashflowAllMonths");
            if (btn) {
                btn.textContent = this.state.pdCashflowAllMonths ? "只顯示目前月份" : "顯示所有月份命中";
                btn.classList.toggle("active", this.state.pdCashflowAllMonths);
            }
            this.refreshCashflowGrid();
        });
        $("#pdCashflowShowExcluded").on("click", () => {
            this.state.pdCashflowShowExcluded = !this.state.pdCashflowShowExcluded;
            const btn = document.getElementById("pdCashflowShowExcluded");
            if (btn) {
                btn.textContent = this.state.pdCashflowShowExcluded ? "隱藏已排除" : "顯示已排除";
                btn.classList.toggle("active", this.state.pdCashflowShowExcluded);
            }
            this.refreshCashflowGrid();
        });
        $("#pdGenerateDraft").on("click", () => this.generateExpectedDraftFromRates());
        ["pdName", "pdStatus", "pdBudget", "pdStartDate", "pdEndDate", "pdTagPrefix", "pdIncludeCashflow"].forEach((id) => {
            $("#" + id).on("input change", () => this.setProjectDetailDirty(true));
        });

        const btnAddTransaction = document.getElementById("btnAddTransaction");
        if (btnAddTransaction) {
            btnAddTransaction.addEventListener("click", () => {
                this.showModal("新增交易", this.getTransactionForm(), () => {
                    this.closeModal();
                });
            });
        }

        const btnAddBill = document.getElementById("btnAddBill");
        if (btnAddBill) {
            btnAddBill.addEventListener("click", () => this.openAddBillModal());
        }
    }

    toggleSidebar() {
        if (window.innerWidth < 768) {
            this.elements.sidebar.classList.toggle("active");
        } else {
            this.elements.sidebar.classList.toggle("collapsed");
        }
    }

    switchFeature(feature) {
        if (!this.canLeaveProjectDetail("目前專案詳情有未儲存變更，確定要切換嗎？")) {
            return;
        }

        this.elements.navItems.forEach((item) => {
            if (item.dataset.feature === feature) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        this.state.currentFeature = feature;
        this.renderTabs();

        const firstView = this.featureViewsMap[feature]?.[0];
        if (firstView) {
            this.switchView(firstView.id);
        }

        if (window.innerWidth < 1200) {
            this.elements.sidebar.classList.remove("active");
            this.elements.floatingMenuBtn.classList.remove("active");
            document.getElementById("appBottomNavMore")?.classList.remove("active");
        }
    }

    renderTabs() {
        const views = this.featureViewsMap[this.state.currentFeature] || [];

        this.elements.tabList.innerHTML = views
            .map(
                (view) => `
            <li class="tab-item ${view.id === this.state.currentView ? "active" : ""}" data-view="${view.id}">
                <a href="#" class="tab-link">${view.label}</a>
            </li>
        `,
            )
            .join("");

        this.elements.tabList.querySelectorAll(".tab-item").forEach((tab) => {
            tab.addEventListener("click", (e) => {
                e.preventDefault();
                const viewId = tab.dataset.view;
                this.switchView(viewId);
            });
        });
    }

    bindEvents_by_view(viewId) {
        var selfObj = this;
        const cfg = this.detailViewConfig[viewId];
        if (!cfg) {
            return;
        }

        var editBtnId = {
            "transaction-details": "btnEditTransaction_details",
            "transaction-income-details": "btnEditTransaction_income_details",
            "transaction-expense-details": "btnEditTransaction_expense_details",
        }[viewId];

        var editBtn = $("#" + editBtnId);
        editBtn.off("click");
        editBtn.on("click", function () {
            var aggrid_api = selfObj.state.grids[viewId];
            var editedData = [];
            aggrid_api.forEachNode((node) => {
                if (node.data && node.data._isEdited) {
                    editedData.push({
                        DetailId: node.data.DetailId,
                        Category: node.data.Category,
                        Description: node.data.Description,
                        Amount: node.data.Amount,
                        Tag: node.data.Tag,
                        Notes: node.data.Notes,
                    });
                }
            });

            if (editedData.length === 0) {
                alert("沒有修改的資料");
                return;
            }

            if (confirm("確定要更新資料庫嗎(共" + editedData.length + "筆)？")) {
                $.ajax({
                    url: "/api/finance/details/batch",
                    type: "PUT",
                    contentType: "application/json",
                    data: JSON.stringify(editedData),
                })
                    .done(function (res) {
                        alert(res.message || "更新成功");
                        selfObj.renderDetailGrid(viewId);
                    })
                    .fail(function () {
                        alert("更新失敗，請洽系統管理員");
                    });
            }
        });
    }

    _transformExpenseData(data) {
        const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        const itemMap = new Map();

        data.forEach((mGroup) => {
            const monthKey = months[mGroup.month - 1];
            mGroup.items.forEach((item) => {
                if (!itemMap.has(item.name)) {
                    const row = { billProject: item.billProject || "一般支出", name: item.name, total: 0 };
                    months.forEach((m) => (row[m] = 0));
                    itemMap.set(item.name, row);
                }
                const targetRow = itemMap.get(item.name);
                targetRow[monthKey] = item.subtotal;
                targetRow.total += item.subtotal;
            });
        });

        return Array.from(itemMap.values()).sort((a, b) => a.billProject.localeCompare(b.billProject, "zh-Hant"));
    }

    /**
     * 切換視窗
     */
    switchView(viewId) {
        this.elements.tabList.querySelectorAll(".tab-item").forEach((tab) => {
            if (tab.dataset.view === viewId) {
                tab.classList.add("active");
            } else {
                tab.classList.remove("active");
            }
        });

        const allViews = this.elements.mainContent.querySelectorAll(".content-view");
        allViews.forEach((view) => {
            if (view.dataset.view === viewId) {
                view.classList.remove("hidden");
            } else {
                view.classList.add("hidden");
            }
        });

        var selfObj = this;
        switch (viewId) {

            case "upload-detail":
                this.bindUploadEvents();
                break;
            case "upload-tdcc":
                this.bindTdccUploadEvents();
                break;
            case "settings-general":
                this.bindGeneralSettingsEvents();
                break;
            case "asset-trend":
                $("#assetTrendChart").empty();
                selfObj.load_data("assets").then(function () {
                    var data = selfObj.data.assets;
                    selfObj.initCharts_byViewId(data, viewId, "assetTrendChart");
                    selfObj.updateStatCards(viewId);
                });
                break;
            case "cash-flow":
                $("#cashFlowChart").empty();
                selfObj.load_data("assets").then(function () {
                    var data = selfObj.data.assets;
                    selfObj.initCharts_byViewId(data, viewId, "cashFlowChart");
                    selfObj.updateStatCards(viewId);
                });
                break;
            case "expense-forecast":
                // 「下月預估開支」卡片與逐月圖表都要用到 assets(月支出實際值)/bills(固定帳單)/detail(變動支出)，
                // 這裡統一先載好資料再各自 render，避免 renderExpenseForecast 內部再重複打一次 bills/detail API
                $("#expenseForecastChart").empty();
                $.when(selfObj.load_data("assets"), selfObj.load_data("bills"), selfObj.load_data("detail")).then(function () {
                    selfObj.renderExpenseForecast();
                    var chartData = selfObj._buildExpenseForecastChartData();
                    selfObj.initCharts_byViewId(chartData, viewId, "expenseForecastChart");
                });
                break;
            case "transaction-income-details":
            case "transaction-expense-details":
            case "transaction-details":
                selfObj.load_data("detail").then(function () {
                    selfObj.populateDetailMonths(viewId);
                    selfObj.renderDetailGrid(viewId);
                    selfObj.renderDetailTrendChart(viewId);
                });
                break;
            case "transaction-category-analysis":
                selfObj.renderCategoryAnalysis();
                break;
            case "account-list":
                $("#account_balance").empty();
                selfObj.populateAccountMonths().then(function () {
                    selfObj.load_data("accounts").then(function () {
                        selfObj.loadAccountCategoryMap().then(function () {
                            selfObj.renderAccountListGrid();
                        });
                    });
                });
                break;
            case "account-category":
                selfObj.renderAccountCategoryGrid();
                break;
            case "auto-rule":
                selfObj.renderAutoRuleList();
                break;
            case "project-management":
                $("#project_list").empty();
                $("#projectComparisonChart").empty();
                selfObj.load_data("projects").then(function () {
                    selfObj.refreshProjectListView();
                });
                break;
            case "project-detail":
                selfObj.refreshProjectDetailUI();
                break;
            case "bill-management":
                selfObj.refreshBillListView();
                break;
            case "bills-expense-monthly":
                $("#bills_yearly_expense_list").empty();
                selfObj.load_data("bills").then(function () {
                    var data = computeMonthlyForecast(selfObj.data.bills, new Date().getFullYear());
                    var dataBreakdown = selfObj._transformExpenseData(data.breakdown);
                    selfObj.initGrids_by_viewId(dataBreakdown, viewId, "bills_yearly_expense_list");
                    selfObj.initCharts_byViewId(data.monthlyTotals, viewId, "billTrendChart");
                });
                break;
            default:
                break;
        }

        this.state.currentView = viewId;

        if (this.state.charts[viewId]) {
            setTimeout(() => {
                this.state.charts[viewId].reflow();
            }, 100);
        }
        this.bindEvents_by_view(viewId);
    }

    /**
     * 集保存摺 PDF 月結流程（上傳多份 → 結算成一筆帳戶）
     *
     * 與麻布 CSV 上傳分開寫，不共用 bindUploadEvents：
     * 集保是單檔逐份上傳、要帶密碼、還多了「已上傳清單 + 結算」的狀態，塞進去只會把原本的多檔邏輯弄複雜。
     */
    bindTdccUploadEvents() {
        const self = this;

        if (!$("#tdccMonth").val()) {
            // 日期用字串截取而非 new Date().toISOString()，避免時區換算讓月份在月初/月底跳掉
            const now = new Date();
            $("#tdccMonth").val(now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0"));
        }

        this.refreshTdccPasswordHint();
        this.loadTdccImports();

        if (this._tdccBound) {
            return;
        }
        this._tdccBound = true;

        let selectedFile = null;
        let isBusy = false;

        function showMessage(msg, type) {
            const div = $('<div class="message ' + type + '"></div>');
            div.text(msg);
            $("#tdcc-message-area").prepend(div);
            setTimeout(function () {
                div.fadeOut(function () {
                    $(this).remove();
                });
            }, 8000);
        }

        function setFile(file) {
            if (!file) return;
            if (!/\.pdf$/i.test(file.name)) {
                showMessage("只接受 PDF 檔", "error");
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                showMessage('檔案 "' + file.name + '" 超過大小上限 (10MB)', "error");
                return;
            }
            selectedFile = file;
            $("#tdcc-file-list").html(
                '<div class="file-item"><div style="flex:1;"><strong>' + file.name + "</strong><br><small>大小: " +
                (file.size / 1024).toFixed(1) + " KB</small></div></div>"
            );
        }

        function clearSelection() {
            selectedFile = null;
            $("#tdcc-file-input").val("");
            $("#tdcc-file-list").empty();
            $("#tdcc-result-wrap").hide();
            $("#tdcc-result-table tbody").empty();
        }

        $("#tdcc-upload-area").off("click").on("click", function () {
            if (!isBusy) $("#tdcc-file-input").click();
        });

        $("#tdcc-file-input").off("change").on("change", function (e) {
            setFile(e.target.files[0]);
        });

        $("#tdcc-upload-area").off("dragover").on("dragover", function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (!isBusy) $(this).addClass("dragover");
        });

        $("#tdcc-upload-area").off("dragleave").on("dragleave", function (e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).removeClass("dragover");
        });

        $("#tdcc-upload-area").off("drop").on("drop", function (e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).removeClass("dragover");
            if (!isBusy) setFile(e.originalEvent.dataTransfer.files[0]);
        });

        $("#tdcc-clear-btn").off("click").on("click", function () {
            if (!isBusy) clearSelection();
        });

        $("#tdccMonth").off("change").on("change", function () {
            self.loadTdccImports();
        });

        function renderPreviewRows(rows) {
            const cell = 'padding:8px; border-bottom:1px solid #333;';
            const body = (rows || []).map(function (r) {
                function num(v) {
                    return v === null || v === undefined ? "" : Number(v).toLocaleString("zh-TW", { maximumFractionDigits: 4 });
                }
                return "<tr>" +
                    '<td style="' + cell + '">' + r.Code + "</td>" +
                    '<td style="' + cell + '">' + r.Name + "</td>" +
                    '<td style="' + cell + ' text-align:right;">' + num(r.Unit) + "</td>" +
                    '<td style="' + cell + ' text-align:right;">' + num(r.Price) + "</td>" +
                    '<td style="' + cell + ' text-align:right;">' + num(r.MarketValue) + "</td>" +
                    "</tr>";
            }).join("");
            $("#tdcc-result-table tbody").html(body);
            $("#tdcc-result-wrap").toggle((rows || []).length > 0);
        }

        function buildFormData(replaceImportId) {
            const fd = new FormData();
            fd.append("file", selectedFile);
            fd.append("password", $("#tdccPassword").val() || "");
            // 快照日期不讓使用者填：一律用 PDF 上的收盤價日期，避免多份存摺被歸到不同月份
            if (replaceImportId) fd.append("replaceImportId", replaceImportId);
            return fd;
        }

        function send(url, replaceImportId, okHandler) {
            if (!selectedFile) {
                showMessage("請先選擇 PDF 檔案", "error");
                return;
            }
            if (isBusy) return;
            isBusy = true;
            $("#tdcc-preview-btn, #tdcc-import-btn").prop("disabled", true);

            $.ajax({
                url: url,
                type: "POST",
                data: buildFormData(replaceImportId),
                processData: false,
                contentType: false,
                success: function (res) {
                    (res.warnings || res.Warnings || []).forEach(function (w) {
                        showMessage("⚠ " + w, "error");
                    });
                    okHandler(res);
                },
                error: function (xhr) {
                    const res = xhr.responseJSON || {};
                    // 同來源的存摺重複上傳：問過使用者才以新檔取代舊的（其餘重複情形一律直接擋掉）
                    if (xhr.status === 409 && res.code === "SAME_SOURCE") {
                        if (confirm(res.message)) {
                            isBusy = false;
                            $("#tdcc-preview-btn, #tdcc-import-btn").prop("disabled", false);
                            send(url, res.importId, okHandler);
                            return;
                        }
                        showMessage("已取消，未寫入", "info");
                        return;
                    }
                    showMessage(res.message || "處理失敗", "error");
                },
                complete: function () {
                    isBusy = false;
                    $("#tdcc-preview-btn, #tdcc-import-btn").prop("disabled", false);
                },
            });
        }

        $("#tdcc-preview-btn").off("click").on("click", function () {
            send("/api/finance/stock-pdf/preview", 0, function (res) {
                renderPreviewRows(res.Rows);
                showMessage(
                    "辨識完成，共 " + (res.Rows || []).length + " 筆" +
                    (res.DetectedSource ? "（來源：" + res.DetectedSource + "）" : "") + "，尚未寫入資料庫",
                    "success"
                );
            });
        });

        $("#tdcc-import-btn").off("click").on("click", function () {
            send("/api/finance/stock-pdf/import", 0, function (res) {
                renderPreviewRows(res.rows);
                showMessage(res.message || "寫入完成", "success");
                if (res.needsResettle) {
                    showMessage("當月已結算過，庫存有變動，請重新結算", "error");
                }
                clearSelection();
                // 上傳的月份以 PDF 的快照日為準，可能和畫面選的月份不同，直接跟著切過去
                if (res.yearMonth) $("#tdccMonth").val(res.yearMonth);
                self.loadTdccImports();
            });
        });

        $("#tdcc-settle-btn").off("click").on("click", function () {
            self.settleTdccMonth(false);
        });

        // 刪除單筆匯入用事件委派，因為清單是每次重新載入後動態產生的
        $("#tdcc-import-table").off("click", ".tdcc-delete-import").on("click", ".tdcc-delete-import", function () {
            const importId = $(this).data("import-id");
            const fileName = $(this).data("file-name");
            if (!confirm("確定刪除「" + fileName + "」？這份存摺寫入的庫存也會一併刪除。")) return;

            $.ajax({
                url: "/api/finance/stock-pdf/imports/" + importId,
                type: "DELETE",
                success: function (res) {
                    showMessage(res.message || "已刪除", "success");
                    self.loadTdccImports();
                },
                error: function (xhr) {
                    const msg = xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : "刪除失敗";
                    showMessage(msg, "error");
                },
            });
        });
    }

    /** 載入當月已上傳的存摺清單與結算狀態 */
    loadTdccImports() {
        const month = $("#tdccMonth").val();
        $("#tdccListMonth").text(month || "");

        $.get("/api/finance/stock-pdf/imports", { month: month }).done(function (data) {
            const cell = 'padding:8px; border-bottom:1px solid #333;';
            const rows = data.imports || [];

            $("#tdcc-import-table tbody").html(
                rows.length === 0
                    ? '<tr><td colspan="7" style="' + cell + ' color:#888;">本月尚未上傳任何存摺</td></tr>'
                    : rows.map(function (i) {
                        return "<tr>" +
                            '<td style="' + cell + '">' + i.FileName + "</td>" +
                            '<td style="' + cell + '">' + (i.SourceKey || i.OrganizationName || "") + "</td>" +
                            '<td style="' + cell + '">' + i.SnapshotDate + "</td>" +
                            '<td style="' + cell + ' text-align:right;">' + i.StockCount + "</td>" +
                            '<td style="' + cell + ' text-align:right;">' + Number(i.TotalMarketValue).toLocaleString("zh-TW") + "</td>" +
                            '<td style="' + cell + '">' + (i.SettlementId ? "已結算" : "未結算") + "</td>" +
                            '<td style="' + cell + '"><button class="btn btn-danger tdcc-delete-import" data-import-id="' + i.ImportId +
                            '" data-file-name="' + i.FileName + '">刪除</button></td>' +
                            "</tr>";
                    }).join("")
            );

            let status = "合計 " + rows.length + " 份、市值 " +
                Number(data.totalMarketValue || 0).toLocaleString("zh-TW");

            if (data.settlement) {
                status += "｜已於 " + String(data.settlement.SettledAt).replace("T", " ").slice(0, 16) +
                    " 結算，寫入帳戶「" + data.settlement.AccountName + "」市值 " +
                    Number(data.settlement.TotalMarketValue).toLocaleString("zh-TW");
                $("#tdcc-settle-btn").text("重新結算本月");
            } else {
                status += "｜尚未結算";
                $("#tdcc-settle-btn").text("結算本月");
            }
            if (data.needsResettle) {
                status += "⚠ 結算後庫存有異動，請重新結算";
            }
            $("#tdccSettlementStatus").text(status);
        });
    }

    /** 當月結算：force=true 代表使用者已確認要覆蓋既有結算 */
    settleTdccMonth(force) {
        const self = this;
        const month = $("#tdccMonth").val();

        function showMessage(msg, type) {
            const div = $('<div class="message ' + type + '"></div>');
            div.text(msg);
            $("#tdcc-settle-message").prepend(div);
            setTimeout(function () {
                div.fadeOut(function () {
                    $(this).remove();
                });
            }, 8000);
        }

        $.ajax({
            url: "/api/finance/stock-pdf/settle",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ month: month, force: !!force }),
            success: function (res) {
                showMessage(res.message || "結算完成", "success");
                self.loadTdccImports();
            },
            error: function (xhr) {
                const res = xhr.responseJSON || {};
                // 同月重複結算預設擋下，確認後才帶 force 覆蓋
                if (xhr.status === 409 && res.code === "ALREADY_SETTLED") {
                    if (confirm(res.message)) {
                        self.settleTdccMonth(true);
                        return;
                    }
                    showMessage("已取消，未重新結算", "info");
                    return;
                }
                showMessage(res.message || "結算失敗", "error");
            },
        });
    }

    /** 顯示「是否已儲存集保 PDF 密碼」，讓使用者知道可以不用填密碼欄 */
    refreshTdccPasswordHint() {
        $.get("/api/finance/settings")
            .done(function (data) {
                $("#tdccPasswordHint").html(
                    data.TdccPasswordSaved
                        ? "🔐 已使用「設定 → 一般設定」儲存的密碼，密碼欄可留空。"
                        : "🔓 尚未儲存密碼。若 PDF 有加密，請在下方填入，或到「設定 → 一般設定」存起來免得每次都輸入。"
                );
            })
            .fail(function () {
                $("#tdccPasswordHint").text("");
            });
    }

    /** 一般設定：集保 PDF 密碼的儲存／清除 */
    bindGeneralSettingsEvents() {
        const self = this;
        this.refreshGeneralSettings();

        if (this._generalSettingsBound) {
            return;
        }
        this._generalSettingsBound = true;

        function showMessage(msg, type) {
            const div = $('<div class="message ' + type + '"></div>');
            div.text(msg);
            $("#generalTdccMessage").prepend(div);
            setTimeout(function () {
                div.fadeOut(function () {
                    $(this).remove();
                });
            }, 5000);
        }

        function save(password) {
            $.ajax({
                url: "/api/finance/settings/tdcc-password",
                type: "PUT",
                contentType: "application/json",
                data: JSON.stringify({ password: password }),
                success: function (res) {
                    showMessage(res.message || "已儲存", "success");
                    $("#generalTdccPassword").val("");
                    self.refreshGeneralSettings();
                },
                error: function (xhr) {
                    const msg = xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : "儲存失敗";
                    showMessage(msg, "error");
                },
            });
        }

        $("#generalTdccSaveBtn").off("click").on("click", function () {
            const password = $("#generalTdccPassword").val();
            if (!password) {
                showMessage("請先輸入密碼", "error");
                return;
            }
            save(password);
        });

        $("#generalTdccClearBtn").off("click").on("click", function () {
            if (!confirm("確定要清除已儲存的集保 PDF 密碼？之後上傳需自行輸入。")) return;
            save("");
        });
    }

    refreshGeneralSettings() {
        $.get("/api/finance/settings")
            .done(function (data) {
                if (data.TdccPasswordSaved) {
                    const updatedAt = data.TdccPasswordUpdatedAt ? String(data.TdccPasswordUpdatedAt).slice(0, 10) : "";
                    $("#generalTdccStatus").text("目前狀態：已儲存密碼" + (updatedAt ? "（最後更新 " + updatedAt + "）" : ""));
                } else {
                    $("#generalTdccStatus").text("目前狀態：尚未儲存密碼");
                }
            })
            .fail(function () {
                $("#generalTdccStatus").text("目前狀態：讀取失敗");
            });
    }

    bindUploadEvents() {
        if (this._uploadBound) {
            return;
        }
        this._uploadBound = true;

        if (!$("#uploadSnapshotDate").val()) {
            $("#uploadSnapshotDate").val(new Date().toISOString().slice(0, 10));
        }

        let selectedFiles = [];
        let isUploading = false;

        $("#upload-area").off("click").on("click", function () {
            if (!isUploading) {
                $("#file-input").click();
            }
        });

        $("#file-input").off("change").on("change", function (e) {
            handleFiles(e.target.files);
        });

        $("#upload-area").off("dragover").on("dragover", function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (!isUploading) {
                $(this).addClass("dragover");
            }
        });

        $("#upload-area").off("dragleave").on("dragleave", function (e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).removeClass("dragover");
        });

        $("#upload-area").off("drop").on("drop", function (e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).removeClass("dragover");
            if (!isUploading) {
                handleFiles(e.originalEvent.dataTransfer.files);
            }
        });

        function handleFiles(files) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const maxSize = 10 * 1024 * 1024;
                if (file.size > maxSize) {
                    showMessage('檔案 "' + file.name + '" 超過大小上限 (10MB)', "error");
                    continue;
                }
                const exists = selectedFiles.some((f) => f.name === file.name && f.size === file.size);
                if (!exists) {
                    file.fileId = "file-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
                    selectedFiles.push(file);
                    addFileToList(file);
                } else {
                    showMessage('檔案 "' + file.name + '" 已經選過了', "error");
                }
            }
        }

        function addFileToList(file) {
            const fileSize = formatFileSize(file.size);
            const fileItem = $('<div class="file-item" data-file-id="' + file.fileId + '"></div>');
            const fileInfo = $('<div style="flex: 1;"></div>');
            fileInfo.html(
                "<strong>" + file.name + "</strong><br>" +
                "<small>大小: " + fileSize + "</small>" +
                '<div class="file-status" data-status="' + file.fileId + '"></div>'
            );
            const removeBtn = $('<button class="btn btn-danger">移除</button>');
            removeBtn.click(function () {
                if (!isUploading) {
                    selectedFiles = selectedFiles.filter((f) => f.fileId !== file.fileId);
                    $('[data-file-id="' + file.fileId + '"]').remove();
                }
            });
            fileItem.append(fileInfo);
            fileItem.append(removeBtn);
            $("#file-list").append(fileItem);
        }

        $("#clear-btn").off("click").on("click", function () {
            if (!isUploading) {
                selectedFiles = [];
                $("#file-list").empty();
                $("#file-input").val("");
            }
        });

        $("#upload-btn").off("click").on("click", function () {
            if (selectedFiles.length === 0) {
                showMessage("請先選擇檔案", "error");
                return;
            }
            const snapshotDate = $("#uploadSnapshotDate").val();
            if (!snapshotDate) {
                showMessage("請選擇快照日期", "error");
                return;
            }
            if (isUploading) {
                return;
            }
            uploadToServer(snapshotDate);
        });

        function uploadToServer(snapshotDate) {
            isUploading = true;
            $("#upload-btn").prop("disabled", true);

            const formData = new FormData();
            selectedFiles.forEach(function (file) {
                formData.append("files", file);
            });
            formData.append("snapshotDate", snapshotDate);

            $.ajax({
                url: "/api/finance/upload-details",
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function () {
                    showMessage("正在上傳 " + selectedFiles.length + " 個檔案...", "info");
                },
                success: function (response) {
                    showMessage(response.message || "上傳完成", "success");
                    if (response.errors) {
                        response.errors.forEach((e) => showMessage(e, "error"));
                    }
                    selectedFiles = [];
                    $("#file-list").empty();
                    $("#file-input").val("");
                },
                error: function (xhr) {
                    var msg = xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : "上傳失敗";
                    showMessage(msg, "error");
                },
                complete: function () {
                    isUploading = false;
                    $("#upload-btn").prop("disabled", false);
                },
            });
        }

        function showMessage(msg, type) {
            const messageDiv = $('<div class="message ' + type + '"></div>');
            messageDiv.text(msg);
            $("#message-area").prepend(messageDiv);
            setTimeout(function () {
                messageDiv.fadeOut(function () {
                    $(this).remove();
                });
            }, 5000);
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return "0 Bytes";
            const k = 1024;
            const sizes = ["Bytes", "KB", "MB", "GB"];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
        }
    }

    _getChartParams_byViewId(ViewId, data) {
        var categories = [];
        var series = [];
        var seriesData = [];
        switch (ViewId) {
            case "bills-expense-monthly": {
                const months = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
                categories = months;
                seriesData = (data || []).map((v) => Math.round(Number(v) || 0));
                series.push({ name: "月支出", data: seriesData, color: "#00bcd4", marker: { symbol: "circle" } });
                break;
            }
            case "asset-trend":
                categories = [...new Set(data.map((x) => x["YearMonth"]))];
                seriesData = data.filter((x) => x.Type == "NetAssets").map((x) => Math.round(Number(x["total"]) || 0));
                series.push({ name: "淨資產", data: seriesData, color: "#00bcd4", marker: { symbol: "circle" } });
                seriesData = data.filter((x) => x.Type == "Debt").map((x) => Math.round(Number(x["total"]) || 0));
                series.push({ name: "總債務", data: seriesData, color: "#ff5722", marker: { symbol: "circle" } });
                seriesData = data.filter((x) => x.Type == "Assets").map((x) => Math.round(Number(x["total"]) || 0));
                series.push({ name: "總資產", data: seriesData, color: "#4caf50", marker: { symbol: "circle" } });
                break;
            case "cash-flow":
                categories = [...new Set(data.map((x) => x["YearMonth"]))];
                seriesData = data.filter((x) => x.Type == "Net").map((x) => Math.round(Number(x["total"]) || 0));
                series.push({ name: "收支結餘", data: seriesData, color: "#00bcd4", marker: { symbol: "circle" } });
                seriesData = data.filter((x) => x.Type == "Expense").map((x) => Math.round(Number(x["total"]) || 0));
                series.push({ name: "總支出", data: seriesData, color: "#ff5722", marker: { symbol: "circle" } });
                seriesData = data.filter((x) => x.Type == "Income").map((x) => Math.round(Number(x["total"]) || 0));
                series.push({ name: "總收入", data: seriesData, color: "#4caf50", marker: { symbol: "circle" } });
                break;
            case "expense-forecast": {
                // 資料由 _buildExpenseForecastChartData() 組好：{ actual: [12], forecast: [12] }，
                // 兩個 series 在「本月」的前一個月共用同一個數值當銜接點，圖表上線才不會斷開
                const months = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
                categories = months;
                series.push({ name: "實際支出", data: data.actual, color: "#ff5722", marker: { symbol: "circle" } });
                series.push({ name: "預估支出", data: data.forecast, color: "#ffab91", dashStyle: "Dash", marker: { symbol: "diamond" } });
                break;
            }
            case "project-management":
                categories = data.map((x) => x["BillProjectId"]);
                series.push({ name: "收入", data: data.map((x) => Math.round(Math.abs(Number(x["Income"] || 0)))), color: "#4caf50" });
                series.push({ name: "支出", data: data.map((x) => Math.round(Math.abs(Number(x["Expense"] || 0)))), color: "#ff5722" });
                series.push({ name: "淨收入", data: data.map((x) => Math.round(Number(x["Net"] || 0))), color: "#00bcd4" });
                break;
            default:
                break;
        }
        return { categories, series };
    }

    initCharts_byViewId(data, viewId, chartId) {
        var title = {
            "asset-trend": "總資產走勢",
            "cash-flow": "現金流量走勢",
            "project-management": "專案收支對比",
            "bills-expense-monthly": "每月支出預測",
            "expense-forecast": "本年度支出：實際 vs 預估",
        };
        var type = {
            "asset-trend": "line",
            "cash-flow": "line",
            "project-management": "column",
            "bills-expense-monthly": "column",
            "expense-forecast": "line",
        };
        var self = this;
        var { categories, series } = this._getChartParams_byViewId(viewId, data);
        var mobileTweaks = this.getMobileChartTweaks(categories.length);

        this.state.charts[chartId] = Highcharts.chart(chartId, {
            chart: {
                type: type[viewId] || "line",
                backgroundColor: "transparent",
                style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
                ...mobileTweaks.chart,
            },
            title: { text: title[viewId] || null },
            credits: { enabled: false },
            xAxis: {
                categories: categories,
                gridLineColor: "#424242",
                lineColor: "#757575",
                tickColor: "#757575",
                labels: { style: { color: "#b0b0b0" }, ...mobileTweaks.xAxisLabels },
            },
            yAxis: {
                title: { text: "金額 (NT$)", style: { color: "#b0b0b0" }, ...mobileTweaks.yAxisTitle },
                gridLineColor: "#424242",
                labels: { style: { color: "#b0b0b0" }, formatter: function () { return self.formatAxisCurrency(this.value); } },
            },
            tooltip: {
                backgroundColor: "#2a2a2a",
                borderColor: "#757575",
                style: { color: "#ffffff" },
                shared: true,
                // 觸控裝置預設 followTouchMove:true 會把手指移動當成「拖曳看提示框」，
                // 跟 scrollablePlotArea 的橫向滑動搶手勢，導致點擊事件跟提示框都不穩定觸發；
                // 關掉後改成「點一下＝顯示提示框並觸發點擊」，滑動交給圖表捲動處理
                followTouchMove: false,
                // scrollablePlotArea 會把提示框限制在圖表自己的（會被捲動裁切的）SVG範圍內，
                // 導致提示框位置算到看不見的地方或直接被裁掉；outside:true 讓提示框改成掛在整個網頁上，不受圖表捲動範圍限制
                outside: true,
                formatter: function () {
                    // 分類座標軸的 tooltip formatter 裡 this.x 本身就已經是解析好的類別文字（跟其他圖表一致），
                    // 不需要（也不能）再拿去查 categories 陣列，之前 categories[this.x] 會查到 undefined
                    let s = "<b>" + this.x + "</b>";
                    this.points.forEach((point) => {
                        s += '<br/><span style="color:' + point.color + '">●</span> ' + point.series.name + ": " + self.formatAxisCurrency(point.y);
                    });
                    return s;
                },
            },
            legend: { itemStyle: { color: "#b0b0b0" }, itemHoverStyle: { color: "#ffffff" } },
            plotOptions: { line: { marker: { enabled: true, radius: 4 }, lineWidth: 2 } },
            series: series,
        });
    }

    initGrids_by_viewId(data, viewId, eleId) {
        const rowData = data;
        const isMobile = window.innerWidth <= 767;
        // 手機上把 mobileHide 標記的欄位（銀行/帳戶/標註/筆記等次要資訊）先隱藏，減少橫向捲動的資料量；
        // 這些欄位點列還是看得到，因為點一列會在下方交易明細卡片顯示完整資料
        //
        // 另外，手機螢幕寬度有限，pinned:"right" 的「操作」欄位會固定佔用一塊寬度，
        // 導致可捲動的其餘欄位被壓得更窄；手機上改成不 pinned，讓「操作」欄跟著其他欄位一起橫向捲動
        const columnDefs = (this.gridDefsMap[viewId] || []).map((col) => {
            let next = col;
            if (col.mobileHide) {
                next = { ...next, hide: isMobile };
            }
            if (isMobile && next.pinned) {
                next = { ...next, pinned: undefined };
            }
            return next;
        });
        const self = this;

        const gridOptions = {
            columnDefs: columnDefs,
            rowData: rowData,
            // 手機上關閉 resizable：觸控裝置的拖曳手勢很容易誤觸欄位邊界的縮放熱區，
            // 尤其欄位變窄之後熱區占比更高，一拖就把欄位擠壓成 0 寬造成內容重疊；
            // 手機上本來就靠橫向捲動看完整表格，不需要讓使用者手動調欄寬
            defaultColDef: { sortable: true, filter: true, resizable: !isMobile, editable: true },
            rowSelection: "single",
            animateRows: true,
            stopEditingWhenCellsLoseFocus: true,
            onRowClicked: function (params) {
                self.handleGridRowClicked(viewId, params.data);
            },
            onCellValueChanged: function (params) {
                params.data._isEdited = true;
            },
        };

        const div = document.getElementById(eleId);
        this.state.grids[viewId] = agGrid.createGrid(div, gridOptions);
    }

    _getFinancialData(viewId) {
        var selfObj = this;
        var col = [...new Set(this.data.assets.map((x) => x.YearMonth))];
        col.sort((a, b) => new Date(b) - new Date(a));

        switch (viewId) {
            case "asset-trend":
                if (col.length >= 2) {
                    var currentMonth = col[0];
                    var lastMonth = col[1];
                    var curMonData = selfObj.data.assets.filter((x) => x.YearMonth == currentMonth);
                    var lastMonData = selfObj.data.assets.filter((x) => x.YearMonth == lastMonth);
                    selfObj.state.financialData.currentMonth = {
                        NetAssets: curMonData.find((x) => x.Type == "NetAssets")?.total || 0,
                        Assets: curMonData.find((x) => x.Type == "Assets")?.total || 0,
                        Debt: curMonData.find((x) => x.Type == "Debt")?.total || 0,
                        UnclassifiedCount: curMonData.find((x) => x.Type == "UnclassifiedCount")?.total || 0,
                        UnclassifiedAmount: curMonData.find((x) => x.Type == "UnclassifiedAmount")?.total || 0,
                        ExcludedCount: curMonData.find((x) => x.Type == "ExcludedCount")?.total || 0,
                        ExcludedAmount: curMonData.find((x) => x.Type == "ExcludedAmount")?.total || 0,
                        Time: currentMonth,
                    };
                    selfObj.state.financialData.lastMonth = {
                        NetAssets: lastMonData.find((x) => x.Type == "NetAssets")?.total || 0,
                        Assets: lastMonData.find((x) => x.Type == "Assets")?.total || 0,
                        Debt: lastMonData.find((x) => x.Type == "Debt")?.total || 0,
                        Time: lastMonth,
                    };
                }
                if (col.length >= 13) {
                    var lastYearSameMonth = col[12];
                    var d = selfObj.data.assets.filter((x) => x.YearMonth == lastYearSameMonth);
                    selfObj.state.financialData.lastYearSameMonth = {
                        NetAssets: d.find((x) => x.Type == "NetAssets")?.total || 0,
                        Assets: d.find((x) => x.Type == "Assets")?.total || 0,
                        Debt: d.find((x) => x.Type == "Debt")?.total || 0,
                        Time: lastYearSameMonth,
                    };
                }
                break;
            case "cash-flow":
                if (col.length >= 2) {
                    var currentMonth = col[0];
                    var lastMonth = col[1];
                    var curMonData = selfObj.data.assets.filter((x) => x.YearMonth == currentMonth);
                    var lastMonData = selfObj.data.assets.filter((x) => x.YearMonth == lastMonth);
                    selfObj.state.financialData.currentMonth = {
                        Net: curMonData.find((x) => x.Type == "Net")?.total || 0,
                        Income: curMonData.find((x) => x.Type == "Income")?.total || 0,
                        Expense: curMonData.find((x) => x.Type == "Expense")?.total || 0,
                        Time: currentMonth,
                    };
                    selfObj.state.financialData.lastMonth = {
                        Net: lastMonData.find((x) => x.Type == "Net")?.total || 0,
                        Income: lastMonData.find((x) => x.Type == "Income")?.total || 0,
                        Expense: lastMonData.find((x) => x.Type == "Expense")?.total || 0,
                        Time: lastMonth,
                    };
                }
                if (col.length >= 13) {
                    var lastYearSameMonth = col[12];
                    var d = selfObj.data.assets.filter((x) => x.YearMonth == lastYearSameMonth);
                    selfObj.state.financialData.lastYearSameMonth = {
                        Net: d.find((x) => x.Type == "Net")?.total || 0,
                        Income: d.find((x) => x.Type == "Income")?.total || 0,
                        Expense: d.find((x) => x.Type == "Expense")?.total || 0,
                        Time: lastYearSameMonth,
                    };
                }
                break;
            default:
                break;
        }
    }

    updateStatCards(viewId) {
        var self = this;
        switch (viewId) {
            case "asset-trend": {
                self._getFinancialData(viewId);
                var { currentMonth, lastMonth, lastYearSameMonth } = self.state.financialData;

                // 卡片精簡：只留「淨資產差」與相較月份的漲跌百分比，資產差/負債差不再顯示（避免卡片資訊過多）
                var momDiff = currentMonth.NetAssets - lastMonth.NetAssets;
                var momPercentage = ((momDiff / lastMonth.NetAssets) * 100).toFixed(1);
                var momClass = momDiff >= 0 ? "positive" : "negative";

                self.elements.statMoM.innerHTML = `
            <span class="stat-amount">淨資產差 ${momDiff >= 0 ? "+" : ""}${self.formatAxisCurrency(momDiff)}</span>
            <span class="stat-percentage ${momClass}">${momDiff >= 0 ? "+" : ""}${momPercentage}%</span>
            <p class="stat-description">相較上月 (${lastMonth["Time"]})</p>
        `;

                var yoyDiff = currentMonth.NetAssets - lastYearSameMonth.NetAssets;
                var yoyPercentage = ((yoyDiff / lastYearSameMonth.NetAssets) * 100).toFixed(1);
                var yoyClass = yoyDiff >= 0 ? "positive" : "negative";

                self.elements.statYoY.innerHTML = `
            <span class="stat-amount">淨資產差 ${yoyDiff >= 0 ? "+" : ""}${self.formatAxisCurrency(yoyDiff)}</span>
            <span class="stat-percentage ${yoyClass}">${yoyDiff >= 0 ? "+" : ""}${yoyPercentage}%</span>
            <p class="stat-description">相較去年同期 (${lastYearSameMonth["Time"]})</p>
        `;

                // 「本月資產結餘」卡片：只留結餘金額與資產/負債大小關係，不再列資產/負債個別金額。
                // Debt 由 API 回傳時已經是負值，所以是相加而不是相減（原本寫成 Assets - Debt，
                // 等於把負債金額又加了一次，結餘永遠為正、狀態文字也永遠顯示「資產 > 負債」）
                var balance = currentMonth.Assets + currentMonth.Debt;
                var balanceClass = balance >= 0 ? "positive" : "negative";
                var balanceText = balance >= 0 ? "資產 > 負債" : "負債 > 資產";

                self.elements.statBalance.innerHTML = `
            <span class="stat-amount">結餘 ${balance >= 0 ? "+" : ""}${self.formatAxisCurrency(balance)}</span>
            <span class="stat-percentage ${balanceClass}">${balanceText}</span>
        `;

                // 資產／負債改以帳戶分類判定，沒設定分類的帳戶不會被計入，這裡明講筆數與金額，
                // 免得使用者以為數字憑空少了一塊
                // 分成兩種：分類為「忽視」是使用者刻意不計入（例如被集保庫存取代的舊帳），只做中性說明；
                // 真正需要提醒的是沒設分類、或分類名稱看不出資產/負債的帳戶
                var unclassifiedCount = currentMonth.UnclassifiedCount || 0;
                var excludedCount = currentMonth.ExcludedCount || 0;
                var baseText = "統計依「設定 › 帳戶分類」歸類：分類名稱含「資產」計入總資產、含「負債」計入總負債。";
                var excludedText = excludedCount > 0
                    ? `另有 ${excludedCount} 個帳戶分類為忽視（餘額合計 ${self.formatAxisCurrency(currentMonth.ExcludedAmount || 0)}），依設定不計入。`
                    : "";

                if (unclassifiedCount === 0) {
                    $("#assetCategoryHint").text(baseText + excludedText);
                } else {
                    // 只講「N 個未計入」很難查，另外撈一次清單，把分類名稱也列出來，
                    // 才分得出是「完全沒設分類」還是「分類名稱不含資產/負債」
                    $("#assetCategoryHint").text(
                        `⚠ ${currentMonth.Time} 有 ${unclassifiedCount} 個帳戶未歸類，未計入統計。` + excludedText
                    );
                    $.get("/api/finance/overview/uncounted", { month: currentMonth.Time }).done(function (res) {
                        var breakdown = (res.byCategory || [])
                            .map((c) => `${c.category} ${c.count} 筆`)
                            .join("、");
                        var excluded = res.excludedCount > 0
                            ? `另有 ${res.excludedCount} 個帳戶分類為忽視（${self.formatAxisCurrency(res.excludedBalance || 0)}），依設定不計入。`
                            : "";
                        $("#assetCategoryHint").html(
                            `⚠ ${res.yearMonth} 有 ${res.count} 個帳戶未計入統計（餘額合計 ${self.formatAxisCurrency(res.totalBalance || 0)}）：${breakdown}。` +
                            `請到「設定 › 帳戶分類」補上分類。<br>${excluded}`
                        );
                    });
                }
                break;
            }
            case "cash-flow": {
                self._getFinancialData(viewId);
                var { currentMonth, lastMonth, lastYearSameMonth } = self.state.financialData;

                var momDiff = currentMonth.Net - lastMonth.Net;
                var momDiff_income = currentMonth.Income - lastMonth.Income;
                var momDiff_expense = currentMonth.Expense - lastMonth.Expense;
                var momPercentage = ((momDiff / lastMonth.Net) * 100).toFixed(1);
                var momClass = momDiff >= 0 ? "positive" : "negative";

                $("#cash_statMoM").html(`
            <span>收入差 ${momDiff_income >= 0 ? "+" : ""}${self.formatAxisCurrency(momDiff_income)}</span>
            <span>支出差 ${momDiff_expense >= 0 ? "+" : ""}${self.formatAxisCurrency(momDiff_expense)}</span>
            <span class="stat-amount">淨收支 ${momDiff >= 0 ? "+" : ""}${self.formatAxisCurrency(momDiff)}</span>
            <span class="stat-percentage ${momClass}">${momDiff >= 0 ? "+" : ""}${momPercentage}%</span>
            <p class="stat-description">相較上月 (${lastMonth["Time"]})</p>
        `);

                var yoyDiff = currentMonth.Net - lastYearSameMonth.Net;
                var yoyDiff_income = currentMonth.Income - lastYearSameMonth.Income;
                var yoyDiff_expense = currentMonth.Expense - lastYearSameMonth.Expense;
                var yoyPercentage = ((yoyDiff / lastYearSameMonth.Net) * 100).toFixed(1);
                var yoyClass = yoyDiff >= 0 ? "positive" : "negative";

                $("#cash_statYoY").html(`
            <span>收入差 ${yoyDiff_income >= 0 ? "+" : ""}${self.formatAxisCurrency(yoyDiff_income)}</span>
            <span>支出差 ${yoyDiff_expense >= 0 ? "+" : ""}${self.formatAxisCurrency(yoyDiff_expense)}</span>
            <span class="stat-amount">淨收支差 ${yoyDiff >= 0 ? "+" : ""}${self.formatAxisCurrency(yoyDiff)}</span>
            <span class="stat-percentage ${yoyClass}">${yoyDiff >= 0 ? "+" : ""}${yoyPercentage}%</span>
            <p class="stat-description">相較去年同期 (${lastYearSameMonth["Time"]})</p>
        `);

                var balance = currentMonth.Income - currentMonth.Expense;
                var balanceClass = balance >= 0 ? "positive" : "negative";
                var balanceText = balance >= 0 ? "收入 > 支出" : "支出 > 收入";

                $("#cash_statBalance").html(`
            <span>收入 ${currentMonth.Income >= 0 ? "+" : ""}${self.formatAxisCurrency(currentMonth.Income)}</span>
            <span>支出 ${currentMonth.Expense >= 0 ? "-" : ""}${self.formatAxisCurrency(currentMonth.Expense)}</span>
            <span class="stat-amount">結餘 ${balance >= 0 ? "+" : ""}${self.formatAxisCurrency(balance)}</span>
            <span class="stat-percentage ${balanceClass}">${balanceText}</span>`);
                break;
            }
        }
    }

    formatCurrency(value) {
        if (value === null || value === undefined) return "";
        const rounded = Math.round(Number(value) || 0);
        const prefix = rounded >= 0 ? "+" : "";
        return prefix + "NT$ " + rounded.toLocaleString();
    }

    // 表格用的日期格式化：一律只顯示 yyyy-MM-dd，不要後面的時間或時區資訊。
    // 後端回傳的可能是 "2026-07-12T00:00:00" 這種 ISO 字串，也可能已經是純日期，兩種都要能處理
    formatDate(value) {
        if (value === null || value === undefined || value === "") return "";
        const str = String(value);
        // 已經是 yyyy-MM-dd 開頭的字串（含 ISO 格式）直接截前 10 碼，避開時區換算造成日期跳掉的問題
        const m = str.match(/^(\d{4}-\d{2}-\d{2})/);
        if (m) return m[1];
        const d = new Date(str);
        if (isNaN(d.getTime())) return str;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    // 圖表座標軸用的精簡單位：四捨五入到整數 K，破百萬才切到 M（最多留 1 位小數），
    // 避免出現像 "12.345K" 這種又長又有小數點的軸標籤
    // 把使用者輸入的文字（專案名稱、銀行/帳戶名稱、分類等）安全地放進 innerHTML 用
    escapeHtml(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    formatAxisCurrency(value) {
        const num = Math.round(Number(value) || 0);
        const abs = Math.abs(num);
        if (abs >= 1000000) {
            const m = num / 1000000;
            return "NT$ " + (Number.isInteger(m) ? m : m.toFixed(1)) + "M";
        }
        if (abs >= 1000) {
            return "NT$ " + Math.round(num / 1000) + "K";
        }
        return "NT$ " + num;
    }

    getCellStyle(value) {
        if (value > 0) {
            return { color: "#4caf50" };
        } else if (value < 0) {
            return { color: "#f44336" };
        }
        return { color: "#b0b0b0" };
    }

    updateUserStatus() {
        const userStatusHTML = this.state.isLoggedIn
            ? `
            <div class="user-info">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(this.state.user.name)}&background=00bcd4&color=fff"
                     alt="${this.state.user.name}"
                     class="user-avatar">
                <span class="user-name">${this.state.user.name}</span>
            </div>
        `
            : `<button class="login-btn" id="sidebarLoginBtn">登入</button>`;

        const navbarUserStatusHTML = this.state.isLoggedIn
            ? `
            <div class="user-info">
                <span class="user-name">${this.state.user.name}</span>
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(this.state.user.name)}&background=00bcd4&color=fff"
                     alt="${this.state.user.name}"
                     class="user-avatar">
            </div>
        `
            : `<button class="login-btn" id="navbarLoginBtn">登入</button>`;

        this.elements.sidebarUserStatus.innerHTML = userStatusHTML;
        this.elements.navbarUserStatus.innerHTML = navbarUserStatusHTML;

        if (!this.state.isLoggedIn) {
            document.getElementById("sidebarLoginBtn")?.addEventListener("click", () => this.showLoginModal());
            document.getElementById("navbarLoginBtn")?.addEventListener("click", () => this.showLoginModal());
        }
    }

    showLoginModal() {
        const loginForm = `
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label for="loginUsername" style="display: block; margin-bottom: 8px; color: #b0b0b0;">使用者名稱</label>
                    <input type="text" id="loginUsername" placeholder="請輸入使用者名稱"
                           style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px;">
                </div>
                <div>
                    <label for="loginPassword" style="display: block; margin-bottom: 8px; color: #b0b0b0;">密碼</label>
                    <input type="password" id="loginPassword" placeholder="請輸入密碼"
                           style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px;">
                </div>
            </div>
        `;

        this.showModal("登入", loginForm, () => {
            const username = document.getElementById("loginUsername").value;
            const password = document.getElementById("loginPassword").value;

            if (!username || !password) {
                alert("請輸入使用者名稱和密碼");
                return;
            }

            const confirmBtn = this.elements.modalConfirm;
            const originalText = confirmBtn.textContent;
            confirmBtn.disabled = true;
            confirmBtn.textContent = "登入中...";

            $.ajax({
                url: "/api/auth/login",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({ account: username, password: password }),
            })
                .done(() => {
                    window.location.reload();
                })
                .fail(() => {
                    alert("使用者名稱或密碼錯誤");
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = originalText;
                });
        });
    }

    showScheduleBody(ele) {
        var self = this;
        var html = "";
        switch (ele.value) {
            case "retirement":
                html = `
            <div style="display: flex; flex-direction: column; gap: 16px; max-width: 460px; background-color: #1e1e1e; padding: 20px; border-radius: 12px;">
            <div>
                <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">計畫名稱</label>
                <input type="text" id="planName" placeholder="例如：我的環遊世界退休夢"
                      style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
            </div>
            <div style="display: flex; gap: 12px;">
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">目前年齡</label>
                    <input type="number" id="currentAge" placeholder="30"
                          style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
                </div>
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">預計退休</label>
                    <input type="number" id="retireAge" placeholder="65"
                          style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
                </div>
            </div>
            <div style="display: flex; gap: 12px;">
              <div style="flex: 2;">
                <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">現有本金 (TWD)</label>
                <input type="number" id="initialCapital" placeholder="0"
                      style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
              </div>
              <div style="flex: 1;">
                <button id="autoFillBtn" style="margin-top: 32px; width: 100%; padding: 12px; background-color: #007bff; border: none; border-radius: 8px; color: #ffffff; font-size: 14px; cursor: pointer;">自動填入</button>
              </div>
            </div>
            <div>
                <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">每月預計投入</label>
                <input type="number" id="monthlyContribution" placeholder="10000"
                      style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
            </div>
            <div style="display: flex; gap: 12px;">
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">預期年報酬 (%)</label>
                    <input type="number" id="expectedReturn" placeholder="6" step="0.1"
                          style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
                </div>
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">通膨率 (%)</label>
                    <input type="number" id="inflationRate" placeholder="2" step="0.1"
                          style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
                </div>
            </div>
        </div>
        `;
                break;
            case "InvestmentByLoan":
                html = `
            <div style="display: flex; flex-direction: column; gap: 16px; max-width: 460px; background-color: #1e1e1e; padding: 20px; border-radius: 12px;">
            <div>
                <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">計畫名稱</label>
                <input type="text" id="planName" placeholder="例如：我的環遊世界退休夢"
                      style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
            </div>
            <div>
                <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">自投入本金</label>
                <input type="number" id="selfContribution" placeholder="10000"
                      style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
            </div>
            <div style="display: flex; gap: 12px;">
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">貸款金額</label>
                    <input type="number" id="loanAmount" placeholder="1000000" step="10000"
                          style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
                </div>
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">貸款期數</label>
                    <input type="number" id="loanTerm" placeholder="84"
                          style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
                </div>
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">貸款利率 (%)</label>
                    <input type="number" id="loanInterestRate" placeholder="5" step="0.1"
                          style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
                </div>
            </div>
            <div style="display: flex; gap: 12px;">
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">目標整體獲利率 (%)</label>
                    <input type="number" id="expectedOverallReturn" placeholder="10" step="0.1"
                          style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
                </div>
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">目標貸款獲利率 (%)</label>
                    <input type="number" id="expectedLoanReturn" placeholder="12" step="0.1"
                          style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
                </div>
            </div>
        </div>
        `;
                break;
            default:
                break;
        }
        $("#scheduleFormContainer").html(html);

        $("#autoFillBtn").on("click", () => {
            var assetsList = self.data.assets.filter((x) => x.Type == "Assets");
            if (assetsList.length) {
                document.getElementById("initialCapital").value = assetsList[assetsList.length - 1].total;
            }
        });
    }

    openEditScheduleModal(data) {
        var self = this;
        var typemapper = { retirement: "退休計畫", InvestmentByLoan: "借款投資" };
        const ScheduleForm = `<div style="display: flex; flex-direction: column; gap: 16px; max-width: 460px; background-color: #1e1e1e; padding: 20px; border-radius: 12px;">
            <div>
                <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">計畫類型</label>
                <select id="schduleType" onchange="window.app.showScheduleBody(this)"
                      style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
                    <option value="${data.Type}">${typemapper[data.Type]}</option>
                </select>
            </div>
            <div id='scheduleFormContainer'></div>
        </div>
        `;
        this.showModal("編輯計畫", ScheduleForm, () => {
            this.closeModal();
        });
    }

    handleRetirementSubmit() {
        const data = {
            type: document.getElementById("schduleType").value,
            name: document.getElementById("planName").value,
            currentAge: parseInt(document.getElementById("currentAge").value),
            retireAge: parseInt(document.getElementById("retireAge").value),
            initialCapital: parseFloat(document.getElementById("initialCapital").value) || 0,
            monthlyContribution: parseFloat(document.getElementById("monthlyContribution").value) || 0,
            expectedReturn: parseFloat(document.getElementById("expectedReturn").value) / 100,
            inflationRate: parseFloat(document.getElementById("inflationRate").value) / 100,
        };

        if (!data.name || isNaN(data.currentAge)) {
            alert("請填寫完整資訊");
            return;
        }
        const result = this.calculateRetirement(data);
        const resultWithHTML = this.generateYearlyTargetHTML({ ...data, ...result });
        document.getElementById("bluepicture-schedule-draft").innerHTML = `
        <h3 style="color: #ffffff;"><a onclick="window.app.switchView('bluepicture-schedule');">計畫制定</a> ➡️ ${data.name}</h3>
        ${resultWithHTML.tableHTML}
        `;
        alert(`根據推算，您的退休金實質購買力約為：$${result.total.toLocaleString()} TWD`);
    }

    handleInvestmentByLoanSubmit() {
        const data = {
            type: document.getElementById("schduleType").value,
            name: document.getElementById("planName").value,
            selfContribution: parseFloat(document.getElementById("selfContribution").value) || 0,
            loanAmount: parseFloat(document.getElementById("loanAmount").value) || 0,
            loanTerm: parseInt(document.getElementById("loanTerm").value, 10) || 0,
            loanInterestRate: parseFloat(document.getElementById("loanInterestRate").value) / 100 || 0,
            expectedOverallReturn: parseFloat(document.getElementById("expectedOverallReturn").value) / 100 || 0,
            expectedLoanReturn: parseFloat(document.getElementById("expectedLoanReturn").value) / 100 || 0,
        };

        if (!data.name || isNaN(data.loanAmount) || isNaN(data.loanTerm)) {
            alert("請填寫完整資訊");
            return;
        }

        const result = this.calculateInvestByLoan(data);
        document.getElementById("bluepicture-schedule-draft").innerHTML = `
        <h3 style="color: #ffffff;"><a onclick="window.app.switchView('bluepicture-schedule');">計畫制定</a> ➡️ ${data.name}</h3>
        ${result.summaryHTML}
        `;
        this.initGrids_by_viewId(result.monthlyData, "investment-by-loan-tracking", "investment-by-loan-grid");
        alert(`根據推算，您每月需要的投資收入目標約為：${this.formatCurrency(result.monthlyOverallTarget)}`);
    }

    showScheduleForm() {
        const ScheduleForm = `
            <div style="display: flex; flex-direction: column; gap: 16px; max-width: 460px; background-color: #1e1e1e; padding: 20px; border-radius: 12px;">
              <div>
                  <label style="display: block; margin-bottom: 8px; color: #b0b0b0; font-size: 14px;">計畫類型</label>
                  <select id="schduleType" onchange="window.app.showScheduleBody(this)"
                        style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;">
                      <option value="" style="display:none">計畫種類</option>
                      <option value="retirement">退休計畫</option>
                      <option value="InvestmentByLoan">借款投資</option>
                  </select>
              </div>
              <div id='scheduleFormContainer'></div>
            </div>
        `;

        this.showModal("新增計畫", ScheduleForm, () => {
            const self = this;
            const BP_Type = document.getElementById("schduleType").value;
            switch (BP_Type) {
                case "retirement":
                    self.handleRetirementSubmit();
                    break;
                case "InvestmentByLoan":
                    self.handleInvestmentByLoanSubmit();
                    break;
                default:
                    break;
            }
            this.closeModal();
        });
    }

    calculateRetirement(params) {
        const { currentAge, retireAge, initialCapital, monthlyContribution, expectedReturn, inflationRate } = params;
        const years = retireAge - currentAge;
        const months = years * 12;
        const realRateYear = (1 + expectedReturn) / (1 + inflationRate) - 1;
        const realRateMonth = realRateYear / 12;
        const fvInitial = initialCapital * Math.pow(1 + realRateYear, years);
        const fvMonthly = (monthlyContribution * (Math.pow(1 + realRateMonth, months) - 1)) / realRateMonth;
        const totalRetirementFund = Math.round(fvInitial + fvMonthly);

        return { total: totalRetirementFund, years: years, details: { fvInitial, fvMonthly } };
    }

    generateYearlyTargetHTML(params) {
        const { currentAge, retireAge, initialCapital, monthlyContribution, expectedReturn, inflationRate } = params;
        const r = (1 + expectedReturn) / (1 + inflationRate) - 1;
        const yearlyContribution = monthlyContribution * 12;
        const startYear = new Date().getFullYear();

        let currentBalance = initialCapital;
        let cumulativeInput = initialCapital;
        let htmlRows = "";
        let yearlyData = [];

        for (let age = currentAge; age <= retireAge; age++) {
            const year = startYear + (age - currentAge);
            const totalInterest = currentBalance - cumulativeInput;

            yearlyData.push({ year, age, balance: Math.round(currentBalance), principal: Math.round(cumulativeInput), interest: Math.round(totalInterest) });

            htmlRows += `
      <tr style="border-bottom: 1px solid #3d3d3d;">
        <td style="padding: 10px; color: #ffffff;">${year}<br><span style="font-size: 11px; color: #757575;">${age} 歲</span></td>
        <td style="padding: 10px; color: #b0b0b0; text-align: right;">$${Math.round(cumulativeInput).toLocaleString()}</td>
        <td style="padding: 10px; color: #ffab40; text-align: right;">+$${Math.round(totalInterest).toLocaleString()}</td>
        <td style="padding: 10px; color: #4caf50; text-align: right; font-weight: bold;">$${Math.round(currentBalance).toLocaleString()}</td>
      </tr>`;

            if (age < retireAge) {
                currentBalance = (currentBalance + yearlyContribution) * (1 + r);
                cumulativeInput += yearlyContribution;
            }
        }

        const tableHTML = `
    <div style="margin-top: 20px; background-color: #2a2a2a; border-radius: 8px; overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; min-width: 400px;">
        <thead>
          <tr style="background-color: #333333; color: #b0b0b0; text-align: right;">
            <th style="padding: 12px; text-align: left;">年份 / 年齡</th>
            <th style="padding: 12px;">累積投入本金</th>
            <th style="padding: 12px;">累積利息 (增值)</th>
            <th style="padding: 12px;">預計目標 (總額)</th>
          </tr>
        </thead>
        <tbody>${htmlRows}</tbody>
      </table>
    </div>
  `;

        return { yearlyData, tableHTML };
    }

    calculateInvestByLoan(params) {
        const { selfContribution = 0, loanAmount = 0, loanTerm = 0, loanInterestRate = 0, expectedOverallReturn = 0, expectedLoanReturn = 0 } = params;

        const totalCapital = selfContribution + loanAmount;
        const loanTermMonths = Math.max(1, parseInt(loanTerm, 10) || 0);
        const monthlyLoanRate = loanInterestRate / 12;

        const monthlyLoanPayment =
            loanInterestRate === 0 ? loanAmount / loanTermMonths : loanAmount * (monthlyLoanRate / (1 - Math.pow(1 + monthlyLoanRate, -loanTermMonths)));

        let remainingPrincipal = loanAmount;
        let cumulativeLoanInterest = 0;
        const monthlyData = [];

        for (let month = 1; month <= loanTermMonths; month++) {
            const interestPayment = monthlyLoanRate === 0 ? 0 : remainingPrincipal * monthlyLoanRate;
            let principalPayment = monthlyLoanPayment - interestPayment;
            if (month === loanTermMonths) {
                principalPayment = remainingPrincipal;
            }
            const payment = interestPayment + principalPayment;
            remainingPrincipal = Math.max(0, remainingPrincipal - principalPayment);
            cumulativeLoanInterest += interestPayment;

            monthlyData.push({
                month, payment, interestPayment, principalPayment, remainingPrincipal, cumulativeLoanInterest,
                monthlyInvestmentIncome: 0, notes: "", _isEdited: false,
            });
        }

        const totalLoanInterestCost = monthlyData.reduce((sum, item) => sum + item.interestPayment, 0);
        const loanTermYears = loanTermMonths / 12;
        const annualLoanInterestCost = loanTermYears > 0 ? totalLoanInterestCost / loanTermYears : 0;

        const annualLoanRevenueTarget = loanAmount * expectedLoanReturn + annualLoanInterestCost;
        const annualOverallRevenueTarget = totalCapital * expectedOverallReturn + annualLoanInterestCost;

        const monthlyLoanTarget = annualLoanRevenueTarget / 12;
        const monthlyOverallTarget = annualOverallRevenueTarget / 12;
        const monthlyOwnTarget = monthlyOverallTarget - monthlyLoanTarget;

        monthlyData.forEach((item) => {
            item.monthlyInvestmentIncome = Math.round(monthlyOverallTarget);
        });

        const formatCurrency = (value) => `NT$ ${Math.round(value || 0).toLocaleString()}`;

        const summaryHTML = `
      <div style="margin-top: 20px; background-color: #2a2a2a; border-radius: 8px; overflow-x: auto; padding: 16px;">
        <div style="color: #ffffff; margin-bottom: 16px;">
          <div>自有資金：${formatCurrency(selfContribution)}</div>
          <div>貸款金額：${formatCurrency(loanAmount)}</div>
          <div>貸款期數：${loanTermMonths} 個月</div>
          <div>貸款利率：${(loanInterestRate * 100).toFixed(2)}%</div>
          <div>每月目標投資收入（整體）：${formatCurrency(monthlyOverallTarget)}</div>
          <div>每月目標投資收入（貸款部分）：${formatCurrency(monthlyLoanTarget)}</div>
          <div>每月目標投資收入（自有資金部分）：${formatCurrency(monthlyOwnTarget)}</div>
        </div>
        <div id="investment-by-loan-grid" style="width: 100%;"></div>
      </div>
    `;

        return {
            totalCapital, loanTermMonths,
            totalLoanInterestCost: Math.round(totalLoanInterestCost),
            annualLoanInterestCost: Math.round(annualLoanInterestCost),
            monthlyLoanPayment: Math.round(monthlyLoanPayment),
            monthlyLoanTarget: Math.round(monthlyLoanTarget),
            monthlyOverallTarget: Math.round(monthlyOverallTarget),
            monthlyOwnTarget: Math.round(monthlyOwnTarget),
            monthlyData, summaryHTML,
        };
    }

    /**
     * @param {object} [options]
     *   options.confirmText  自訂確認鈕文字（預設維持原本的「確認」）
     *   options.wide         寬版 modal（表格類內容用）
     *   options.extraActions [{ label, onClick }]，額外插在確認鈕左邊的次要按鈕。
     *                        資產綁定需要「套用到所有月份」「套用至版本月份」兩個動作，
     *                        原本的單一確認鈕不夠用，才加這個選項；不傳時行為與改動前完全相同。
     */
    showModal(title, content, onConfirm, options) {
        const opts = options || {};
        this.elements.modalTitle.textContent = title;
        this.elements.modalBody.innerHTML = content;
        this.elements.modalOverlay.classList.remove("hidden");
        document.getElementById("modal")?.classList.toggle("modal-wide", !!opts.wide);

        const newConfirmBtn = this.elements.modalConfirm.cloneNode(true);
        this.elements.modalConfirm.parentNode.replaceChild(newConfirmBtn, this.elements.modalConfirm);
        this.elements.modalConfirm = newConfirmBtn;
        this.elements.modalConfirm.textContent = opts.confirmText || "確認";
        this.elements.modalConfirm.addEventListener("click", onConfirm);

        // 上一次開啟時加的額外按鈕要先清掉，否則會一直累積
        document.querySelectorAll(".modal-footer .modal-extra-action").forEach((el) => el.remove());
        (opts.extraActions || []).forEach((action) => {
            const btn = document.createElement("button");
            btn.className = "btn-secondary modal-extra-action";
            btn.textContent = action.label;
            btn.addEventListener("click", action.onClick);
            this.elements.modalConfirm.parentNode.insertBefore(btn, this.elements.modalConfirm);
        });
    }

    closeModal() {
        this.elements.modalOverlay.classList.add("hidden");
        this.elements.modalBody.innerHTML = "";
        document.getElementById("modal")?.classList.remove("modal-wide");
        document.querySelectorAll(".modal-footer .modal-extra-action").forEach((el) => el.remove());
    }

    // ==================== 自訂下拉選單 ====================
    // 原生 <select> 展開後的選項清單是瀏覽器/OS 自己畫的，網頁 CSS 幾乎完全套不上去（手機上常常看起來
    // 又小又不清楚，甚至跟頁面的橫向捲動版面衝突而跑版）。這裡改成：保留原本的 <select> 元素不刪
    // （值、change 事件、既有綁定的邏輯全部不用動），只是把它藏起來，另外疊一個自己畫的按鈕+清單，
    // 兩邊互相同步。這樣清單本身完全是我們自己的 HTML/CSS，样式在任何裝置上都一致。

    // 頁面上所有「版本月份」「排序依據」「起/迄」等下拉選單都套用這個外觀
    enhanceAllDropdowns() {
        document.querySelectorAll(".sort-control select, #pdMonth").forEach((el) => this.enhanceSelectDropdown(el));
    }

    enhanceSelectDropdown(selectEl) {
        if (!selectEl || selectEl._customDropdownWired) {
            return;
        }
        selectEl._customDropdownWired = true;

        const wrapper = document.createElement("div");
        wrapper.className = "custom-select";
        selectEl.parentNode.insertBefore(wrapper, selectEl);
        wrapper.appendChild(selectEl);
        selectEl.classList.add("custom-select-native");

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "custom-select-trigger";
        const triggerLabel = document.createElement("span");
        triggerLabel.className = "custom-select-trigger-label";
        const triggerArrow = document.createElement("span");
        triggerArrow.className = "custom-select-trigger-arrow";
        triggerArrow.textContent = "▾";
        trigger.appendChild(triggerLabel);
        trigger.appendChild(triggerArrow);
        wrapper.appendChild(trigger);

        const list = document.createElement("div");
        list.className = "custom-select-list hidden";
        wrapper.appendChild(list);

        const closeList = () => {
            list.classList.add("hidden");
            trigger.classList.remove("open");
        };

        const syncFromSelect = () => {
            list.innerHTML = "";
            Array.from(selectEl.options).forEach((opt, idx) => {
                const item = document.createElement("div");
                item.className = "custom-select-option" + (idx === selectEl.selectedIndex ? " selected" : "");
                item.textContent = opt.textContent;
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (selectEl.value !== opt.value) {
                        selectEl.value = opt.value;
                        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                    // 選完立刻更新按鈕上顯示的文字，不然要等下次點開才會刷新（會看起來像選了上一次的項目）
                    triggerLabel.textContent = opt.textContent;
                    closeList();
                });
                list.appendChild(item);
            });
            const selectedOpt = selectEl.options[selectEl.selectedIndex];
            triggerLabel.textContent = selectedOpt ? selectedOpt.textContent : "";
        };

        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = !list.classList.contains("hidden");
            // 同一時間只開一個自訂下拉選單
            document.querySelectorAll(".custom-select-list").forEach((el) => el.classList.add("hidden"));
            document.querySelectorAll(".custom-select-trigger").forEach((el) => el.classList.remove("open"));
            if (!isOpen) {
                syncFromSelect();
                list.classList.remove("hidden");
                trigger.classList.add("open");
            }
        });

        document.addEventListener("click", (e) => {
            if (!wrapper.contains(e.target)) {
                closeList();
            }
        });

        // 外部程式重新產生 <select> 的 options 或改變 value 之後，呼叫這個讓自訂 UI 同步更新
        selectEl._refreshCustomDropdown = syncFromSelect;

        syncFromSelect();
    }

    // 在任何重新填充 <select> options 或改變其 value 的地方之後呼叫，讓自訂下拉 UI 顯示最新狀態
    refreshCustomDropdown(selectId) {
        const el = document.getElementById(selectId);
        if (el && el._refreshCustomDropdown) {
            el._refreshCustomDropdown();
        }
    }

    // ==================== 專案詳情頁 ====================

    canLeaveProjectDetail(message) {
        if (this.state.currentView !== "project-detail") {
            return true;
        }
        if (!this.state.projectDetailDirty) {
            return true;
        }
        const ok = window.confirm(message || "有未儲存變更，確定要離開嗎？");
        if (ok) {
            this.setProjectDetailDirty(false);
        }
        return ok;
    }

    setProjectDetailDirty(isDirty) {
        this.state.projectDetailDirty = Boolean(isDirty);
        const btn = document.getElementById("btnSaveProjectDetail");
        if (btn) {
            btn.textContent = this.state.projectDetailDirty ? "儲存變更 *" : "儲存變更";
        }
    }

    openProjectDetail(project) {
        const projectId = project.ProjectId;
        if (!projectId) {
            return;
        }
        if (!this.canLeaveProjectDetail("目前專案詳情有未儲存變更，確定要切換嗎？")) {
            return;
        }

        this.state.selectedProjectId = projectId;
        this.state.projectDetailDraft = {
            projectId,
            name: String(project.BillProjectId || ""),
            keyword: project.KeyWord || "",
            budget: Number(project.BillBudget || 0),
            income: Math.abs(Number(project.Income || 0)),
            expense: Math.abs(Number(project.Expense || 0)),
            net: Number(project.Net || 0),
            status: project.Status || "進行中",
            startDate: project.BillStartTime ? String(project.BillStartTime).slice(0, 10) : "",
            endDate: project.BillEndTime ? String(project.BillEndTime).slice(0, 10) : "",
            includeCashflowInActualAsset: !!project.IncludeCashflowInActualAsset,
        };

        this.state.projectDetailMonth = "";
        this.state.projectDetailMode = "asset";
        this.setProjectDetailDirty(false);
        this.switchView("project-detail");
    }

    refreshProjectDetailUI() {
        const draft = this.state.projectDetailDraft;
        if (!draft) {
            return;
        }
        var self = this;

        const titleEl = document.getElementById("projectDetailTitle");
        if (titleEl) {
            titleEl.textContent = `專案詳情 - ${draft.name || ""}`;
        }
        this._setValue("pdName", draft.name);
        this._setValue("pdStatus", draft.status);
        this._setValue("pdBudget", Number(draft.budget || 0));
        this._setValue("pdStartDate", draft.startDate);
        this._setValue("pdEndDate", draft.endDate);
        const includeCashflowEl = document.getElementById("pdIncludeCashflow");
        if (includeCashflowEl) {
            includeCashflowEl.checked = !!draft.includeCashflowInActualAsset;
        }

        // 資產流月份下拉，改抓資產流趨勢 API 拿到的月份清單
        $.get(`/api/finance/projects/${draft.projectId}/assets/trend`).then(function (trend) {
            const months = (trend || []).map((t) => t.Month);
            if (!months.includes(self.state.projectDetailMonth)) {
                self.state.projectDetailMonth = months[months.length - 1] || "";
            }
            const monthSelect = document.getElementById("pdMonth");
            if (monthSelect) {
                monthSelect.innerHTML = months.map((m) => `<option value="${m}">${m}</option>`).join("");
                monthSelect.value = self.state.projectDetailMonth;
            }
            self.refreshCustomDropdown("pdMonth");

            self.renderAssetPanelSummary();
            self.refreshAssetGrid();
            self.renderCashflowRuleCards();
            self.refreshCashflowGrid();
            self.refreshExpectedGrid();
            self.updateProjectDetailSummary();
            self.refreshProjectDetailModeUI();
        });
    }

    _setValue(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.value = value ?? "";
        }
    }

    setProjectDetailMode(mode) {
        if (!["asset", "cashflow", "expected"].includes(mode)) {
            return;
        }
        this.state.projectDetailMode = mode;
        if (mode === "expected") {
            this.refreshExpectedGrid();
        }
        this.refreshProjectDetailModeUI();
    }

    refreshProjectDetailModeUI() {
        const mode = this.state.projectDetailMode;
        const toggle = (id, cls, on) => document.getElementById(id)?.classList.toggle(cls, on);
        toggle("pdModeAsset", "active", mode === "asset");
        toggle("pdModeCashflow", "active", mode === "cashflow");
        toggle("pdModeExpected", "active", mode === "expected");

        const show = (id, on) => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = on ? "block" : "none";
            }
        };
        show("pdAssetPanel", mode === "asset");
        show("pdCashflowPanel", mode === "cashflow");
        show("pdExpectedPanel", mode === "expected");

        const monthControl = document.getElementById("pdMonthControl");
        if (monthControl) {
            monthControl.style.display = mode === "expected" ? "none" : "inline-flex";
        }
    }

    // ---------- 資產流：追蹤淨資產實際變化 ----------

    // 資產綁定改成彈窗操作（原本是一排 checkbox 直接鋪在頁面上，而且每勾一下就立刻存檔，
    // 使用者無法先看完整份清單再決定，也沒辦法反悔）。彈窗裡的勾選只存在記憶體，
    // 按下「套用至版本月份」或「套用到所有月份」才會送出。
    renderAssetPanelSummary() {
        const draft = this.state.projectDetailDraft;
        const month = this.state.projectDetailMonth;
        this._setText("pdAssetMonthChip", `版本月份：${month || "-"}`);
        if (!draft || !month) {
            this._setText("pdAssetBoundChip", "已綁定帳戶：0");
            this._setText("pdAssetBoundAmountChip", "綁定餘額合計：NT$ 0");
            return;
        }

        var self = this;
        $.get(`/api/finance/projects/${draft.projectId}/assets`, { month: month }).then((accounts) => {
            const bound = (accounts || []).filter((a) => a.IsBound);
            const sum = bound.reduce((s, a) => s + Number(a.AccountBalance || 0), 0);
            self._setText("pdAssetBoundChip", `已綁定帳戶：${bound.length}`);
            self._setText("pdAssetBoundAmountChip", `綁定餘額合計：${self.formatCurrency(sum)}`);
        });
    }

    openAssetBindingModal() {
        const draft = this.state.projectDetailDraft;
        const month = this.state.projectDetailMonth;
        if (!draft) {
            return;
        }
        if (!month) {
            this.showModal("尚無可綁定的月份", "<p>此專案目前沒有可綁定的版本月份，請先上傳帳戶餘額資料。</p>", () => this.closeModal());
            return;
        }

        var self = this;
        $.get(`/api/finance/projects/${draft.projectId}/assets`, { month: month }).then((accounts) => {
            const rows = accounts || [];
            const body = rows.length
                ? rows
                      .map((a, i) => {
                          const category = a.Category || "";
                          // 「上月實際資產」只加總分類為「資產」的帳戶，其他分類（含未分類）綁了也不會計入，
                          // 在這裡就標示出來，避免使用者綁了一堆卻發現達成率沒動
                          const categoryCell = category
                              ? (category === "資產"
                                  ? `<span class="asset-cat is-asset">${self.escapeHtml(category)}</span>`
                                  : `<span class="asset-cat">${self.escapeHtml(category)}</span>`)
                              : '<span class="asset-cat is-none">未分類</span>';
                          return `
                            <tr>
                              <td class="asset-check-col">
                                <input type="checkbox" class="asset-bind-check" data-idx="${i}"
                                       data-org="${encodeURIComponent(a.OrganizationName)}"
                                       data-acc="${encodeURIComponent(a.AccountName)}"
                                       ${a.IsBound ? "checked" : ""} />
                              </td>
                              <td>${categoryCell}</td>
                              <td>${self.escapeHtml(a.OrganizationName)}｜${self.escapeHtml(a.AccountName)}</td>
                              <td class="asset-amount-col">${self.formatCurrency(Number(a.AccountBalance || 0))}</td>
                            </tr>`;
                      })
                      .join("")
                : '<tr><td colspan="4" style="text-align:center; color:#b0b0b0;">此月份沒有帳戶資料</td></tr>';

            const content = `
                <p class="pd-muted" style="margin-bottom:10px;">
                  版本月份 <strong>${month}</strong>　·　只有分類為「資產」的帳戶會計入專案列表的上月實際資產
                </p>
                <div class="asset-bind-table-wrap">
                  <table class="asset-bind-table">
                    <thead>
                      <tr>
                        <th class="asset-check-col"><input type="checkbox" id="assetBindCheckAll" /></th>
                        <th>資產分類</th>
                        <th>資產</th>
                        <th class="asset-amount-col">對應餘額</th>
                      </tr>
                    </thead>
                    <tbody>${body}</tbody>
                  </table>
                </div>
                <p class="pd-muted" style="margin-top:10px;">
                  「套用至版本月份」只更新 ${month}；「套用到所有月份」會把目前勾選套用到每一個月份（各月僅套用該月實際存在的帳戶）。
                </p>`;

            self.showModal("綁定資產帳戶", content, () => self.applyAssetBindings("month"), {
                wide: true,
                confirmText: `套用至版本月份（${month}）`,
                extraActions: [{ label: "套用到所有月份", onClick: () => self.applyAssetBindings("all") }],
            });

            const checkAll = document.getElementById("assetBindCheckAll");
            if (checkAll) {
                checkAll.addEventListener("change", () => {
                    document.querySelectorAll(".asset-bind-check").forEach((cb) => {
                        cb.checked = checkAll.checked;
                    });
                });
            }
        });
    }

    /** 讀取彈窗目前的勾選；scope = "month" 只更新版本月份，"all" 套用到所有月份 */
    applyAssetBindings(scope) {
        const draft = this.state.projectDetailDraft;
        const month = this.state.projectDetailMonth;
        if (!draft || !month) {
            return;
        }

        const accounts = [];
        document.querySelectorAll(".asset-bind-check:checked").forEach((cb) => {
            accounts.push({
                OrganizationName: decodeURIComponent(cb.dataset.org),
                AccountName: decodeURIComponent(cb.dataset.acc),
            });
        });

        if (scope === "all" && !accounts.length) {
            alert("目前沒有勾選任何帳戶，無法套用到所有月份；若要清空綁定請改用「清除所有月份綁定」。");
            return;
        }

        var self = this;
        const request = scope === "all"
            ? $.ajax({
                  url: `/api/finance/projects/${draft.projectId}/assets/apply-all-months`,
                  type: "POST",
                  contentType: "application/json",
                  data: JSON.stringify({ accounts: accounts }),
              })
            : $.ajax({
                  url: `/api/finance/projects/${draft.projectId}/assets`,
                  type: "PUT",
                  contentType: "application/json",
                  data: JSON.stringify({ month: month, accounts: accounts }),
              });

        request
            .done(function (res) {
                self.closeModal();
                self.renderAssetPanelSummary();
                self.refreshAssetGrid();
                self.updateProjectDetailSummary();
                self.showModal("已套用", `<p>${(res && res.message) || `已更新 ${month} 的資產綁定`}</p>`, () => self.closeModal());
            })
            .fail(function (xhr) {
                alert("套用失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
            });
    }

    refreshAssetGrid() {
        const draft = this.state.projectDetailDraft;
        if (!draft) {
            return;
        }
        $.get(`/api/finance/projects/${draft.projectId}/assets/trend`).then((trend) => {
            this.createDetailGrid(
                "pdAssetGrid",
                "pdAssetGrid",
                [
                    { field: "Month", headerName: "月份", width: 120 },
                    {
                        field: "NetAsset",
                        headerName: "淨資產",
                        flex: 1,
                        minWidth: 160,
                        valueFormatter: (params) => this.formatCurrency(params.value),
                        cellStyle: (params) => this.getCellStyle(params.value),
                    },
                ],
                trend,
            );
        });
    }

    clearAssetBindingsAllMonths() {
        const draft = this.state.projectDetailDraft;
        if (!draft) {
            return;
        }
        if (!window.confirm("確定要清除所有月份的資產綁定嗎？")) {
            return;
        }
        var self = this;
        $.ajax({ url: `/api/finance/projects/${draft.projectId}/assets`, type: "DELETE" }).then(function () {
            self.renderAssetPanelSummary();
            self.refreshAssetGrid();
            self.updateProjectDetailSummary();
        });
    }

    // ---------- 現金流：追蹤每月實際收支 ----------

    renderCashflowRuleCards() {
        const draft = this.state.projectDetailDraft;
        const list = document.getElementById("pdRuleList");
        if (!draft || !list) {
            return;
        }

        $.get(`/api/finance/projects/${draft.projectId}/cashflow-rules`).then((rules) => {
            const keywords = rules.length ? rules.map((r) => r.Keyword) : [""];
            list.innerHTML = keywords
                .map(
                    (kw, index) => `
                <div class="pd-rule-card">
                    <input type="text" data-pd-rule-index="${index}" value="${String(kw || "").replace(/"/g, "&quot;")}" placeholder="例如：房租" />
                    <button class="btn btn-danger" data-pd-rule-remove="${index}">移除</button>
                </div>`,
                )
                .join("");

            var self = this;
            const saveRules = () => {
                const values = [];
                list.querySelectorAll("[data-pd-rule-index]").forEach((input) => values.push(input.value));
                $.ajax({
                    url: `/api/finance/projects/${draft.projectId}/cashflow-rules`,
                    type: "PUT",
                    contentType: "application/json",
                    data: JSON.stringify({ keywords: values }),
                }).then(() => {
                    self.refreshCashflowGrid();
                    self.updateProjectDetailSummary();
                });
            };

            list.querySelectorAll("[data-pd-rule-index]").forEach((input) => {
                input.addEventListener("change", saveRules);
            });
            list.querySelectorAll("[data-pd-rule-remove]").forEach((button) => {
                button.addEventListener("click", () => {
                    const idx = Number(button.dataset.pdRuleRemove);
                    const values = [];
                    list.querySelectorAll("[data-pd-rule-index]").forEach((input, i) => {
                        if (i !== idx) values.push(input.value);
                    });
                    $.ajax({
                        url: `/api/finance/projects/${draft.projectId}/cashflow-rules`,
                        type: "PUT",
                        contentType: "application/json",
                        data: JSON.stringify({ keywords: values.length ? values : [""] }),
                    }).then(() => {
                        self.renderCashflowRuleCards();
                        self.refreshCashflowGrid();
                        self.updateProjectDetailSummary();
                    });
                });
            });
        });
    }

    addCashflowRuleCard() {
        const list = document.getElementById("pdRuleList");
        if (!list) {
            return;
        }
        const card = document.createElement("div");
        card.className = "pd-rule-card";
        const idx = list.querySelectorAll("[data-pd-rule-index]").length;
        card.innerHTML = `<input type="text" data-pd-rule-index="${idx}" value="" placeholder="例如：房租" /><button class="btn btn-danger" data-pd-rule-remove="${idx}">移除</button>`;
        list.appendChild(card);
    }

    refreshCashflowGrid() {
        const draft = this.state.projectDetailDraft;
        const month = this.state.projectDetailMonth;
        if (!draft) {
            return;
        }
        const allMonths = Boolean(this.state.pdCashflowAllMonths);
        const showExcluded = Boolean(this.state.pdCashflowShowExcluded);
        var self = this;

        $.get(`/api/finance/projects/${draft.projectId}/cashflow-matches`, { month: allMonths ? "" : month, showExcluded }).then((res) => {
            this.createDetailGrid(
                "pdCashflowGrid",
                "pdCashflowGrid",
                [
                    { field: "YearMonth", headerName: "年月", width: 100, sort: "desc" },
                    { field: "TransactionDate", headerName: "日期", width: 120, sort: "desc" },
                    { field: "Category", headerName: "類別", width: 120 },
                    { field: "AccountName", headerName: "帳戶", width: 120 },
                    { field: "Description", headerName: "描述", flex: 1, minWidth: 160 },
                    {
                        field: "Amount",
                        headerName: "金額",
                        width: 130,
                        valueFormatter: (params) => self.formatCurrency(params.value),
                        cellStyle: (params) => self.getCellStyle(params.value),
                    },
                    {
                        // 「專案層面排除」欄：只影響這個專案的命中金額/現金流統計，不動到 Detail.IsExcluded，
                        // 也不影響其他專案（沿用一般明細頁「排除」按鈕同一套一鍵切換寫法）
                        field: "IsProjectExcluded",
                        headerName: "本專案排除",
                        width: 130,
                        sortable: false,
                        filter: false,
                        editable: false,
                        cellStyle: (params) => (params.value ? { color: "#f44336" } : null),
                        cellRenderer: (params) => self._cashflowExcludeCellRenderer(params),
                    },
                ],
                res.matched || [],
            );

            self._setText("pdHitCount", `命中筆數：${res.hitCount || 0}`);
            self._setText("pdHitAmount", `命中金額：${self.formatCurrency(res.hitAmount || 0)}`);
            self._setText("pdMissCount", `未命中筆數：${res.missCount || 0}`);
        });
    }

    _cashflowExcludeCellRenderer(params) {
        const excluded = params.data?.IsProjectExcluded === true;
        const btn = document.createElement("button");
        btn.textContent = excluded ? "取消排除" : "排除";
        btn.classList.add("btn", excluded ? "btn-secondary" : "btn-danger");
        btn.addEventListener("click", (event) => {
            event.stopPropagation();
            this.toggleCashflowExcluded(params.data);
        });
        const area = document.createElement("div");
        $(area).css({ display: "flex", justifyContent: "center" });
        area.appendChild(btn);
        return area;
    }

    toggleCashflowExcluded(row) {
        const draft = this.state.projectDetailDraft;
        if (!draft || !row || !row.DetailId) {
            alert("找不到明細識別碼，無法變更排除狀態");
            return;
        }
        var self = this;
        $.post(`/api/finance/projects/${draft.projectId}/cashflow-matches/${row.DetailId}/toggle-exclude`)
            .done(function () {
                self.refreshCashflowGrid();
                self.updateProjectDetailSummary();
            })
            .fail(function (xhr) {
                alert("操作失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
            });
    }

    _setText(id, text) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = text;
        }
    }

    // ---------- 預期資產變化：驗證財務規劃假設(期初 = 專案預算) ----------

    refreshExpectedGrid() {
        const draft = this.state.projectDetailDraft;
        if (!draft) {
            return;
        }
        var self = this;

        $.get(`/api/finance/projects/${draft.projectId}/expected`).then((res) => {
            self._setValue("pdInflowRate", Number(res.annualInflowRate || 0));
            self._setValue("pdOutflowRate", Number(res.annualOutflowRate || 0));

            const rows = res.rows || [];
            self.createDetailGrid(
                "pdExpectedGrid",
                "pdExpectedGrid",
                [
                    { field: "Month", headerName: "月份", width: 110, editable: false },
                    { field: "OpeningAsset", headerName: "期初資產", width: 140, editable: false, valueFormatter: (p) => self.formatCurrency(Math.round(Number(p.value || 0))) },
                    { field: "Inflow", headerName: "預期流入", width: 130, editable: true, valueFormatter: (p) => self.formatCurrency(Math.round(Number(p.value || 0))) },
                    { field: "Outflow", headerName: "預期流出", width: 130, editable: true, valueFormatter: (p) => self.formatCurrency(Math.round(Number(p.value || 0))) },
                    { field: "ManualFlow", headerName: "手動調整", width: 130, editable: true, valueFormatter: (p) => self.formatCurrency(Math.round(Number(p.value || 0))) },
                    {
                        field: "NetChange",
                        headerName: "淨變化",
                        width: 130,
                        editable: false,
                        valueFormatter: (p) => self.formatCurrency(Math.round(Number(p.value || 0))),
                        cellStyle: (p) => self.getCellStyle(p.value),
                    },
                    { field: "ClosingAsset", headerName: "預期期末", width: 150, editable: false, valueFormatter: (p) => self.formatCurrency(Math.round(Number(p.value || 0))) },
                ],
                rows,
                (event) => self.handleExpectedCellEdit(event),
            );

            if (rows.length) {
                const totalChange = rows[rows.length - 1].ClosingAsset - rows[0].OpeningAsset;
                const best = rows.reduce((b, c) => (c.NetChange > b.NetChange ? c : b), rows[0]);
                const worst = rows.reduce((w, c) => (c.NetChange < w.NetChange ? c : w), rows[0]);
                self._setText("pdTotalChange", `期間總淨變化：${self.formatCurrency(Math.round(totalChange))}（基準：專案預算 ${self.formatCurrency(Math.round(res.baseAsset))}）`);
                self._setText("pdBestMonth", `最大增幅月份：${best.Month}（${self.formatCurrency(Math.round(best.NetChange))}）`);
                self._setText("pdWorstMonth", `最大減幅月份：${worst.Month}（${self.formatCurrency(Math.round(worst.NetChange))}）`);
            } else {
                self._setText("pdTotalChange", `尚未產生預期草稿（期初資產將採用專案預算 ${self.formatCurrency(Math.round(res.baseAsset))}）`);
                self._setText("pdBestMonth", "最大增幅月份：-");
                self._setText("pdWorstMonth", "最大減幅月份：-");
            }
        });
    }

    generateExpectedDraftFromRates() {
        const draft = this.state.projectDetailDraft;
        if (!draft) {
            return;
        }
        const inflowRate = Math.max(0, Number(document.getElementById("pdInflowRate")?.value || 0));
        const outflowRate = Math.max(0, Number(document.getElementById("pdOutflowRate")?.value || 0));

        var self = this;
        $.ajax({
            url: `/api/finance/projects/${draft.projectId}/expected/generate`,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ annualInflowRate: inflowRate, annualOutflowRate: outflowRate }),
        })
            .done(function (res) {
                alert(res.message || "已產生預期草稿");
                self.refreshExpectedGrid();
            })
            .fail(function (xhr) {
                alert(xhr.responseJSON?.message || "產生失敗，請先確認專案已設定開始/結束日期");
            });
    }

    handleExpectedCellEdit(event) {
        const draft = this.state.projectDetailDraft;
        if (!draft || !event || !event.data) {
            return;
        }
        const month = event.data.Month;
        const field = String(event.colDef?.field || "");
        const parsed = Number(event.newValue);
        const safeValue = Number.isFinite(parsed) ? parsed : 0;

        const payload = {};
        if (field === "Inflow") payload.inflow = Math.max(0, safeValue);
        if (field === "Outflow") payload.outflow = Math.max(0, safeValue);
        if (field === "ManualFlow") payload.manualFlow = safeValue;

        var self = this;
        $.ajax({
            url: `/api/finance/projects/${draft.projectId}/expected/rows/${month}`,
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify(payload),
        }).then(function () {
            self.refreshExpectedGrid();
        });
    }

    updateProjectDetailSummary() {
        const draft = this.state.projectDetailDraft;
        if (!draft) {
            return;
        }
        var self = this;

        $.get(`/api/finance/projects/${draft.projectId}/cashflow-rules`).then((rules) => {
            self._setText("pdRuleCount", String(rules.length));
        });

        const month = this.state.projectDetailMonth;
        if (month) {
            $.get(`/api/finance/projects/${draft.projectId}/assets`, { month: month }).then((accounts) => {
                const bound = accounts.filter((a) => a.IsBound);
                self._setText("pdAssetCount", String(bound.length));
                self._setText("pdAssetValue", self.formatCurrency(bound.reduce((s, a) => s + Number(a.AccountBalance || 0), 0)));
            });
        }

        $.get(`/api/finance/projects/${draft.projectId}/cashflow-matches`, { month: "", showExcluded: false }).then((res) => {
            self._setText("pdTxCount", String(res.hitCount || 0));
        });
    }

    createDetailGrid(viewKey, eleId, columnDefs, rowData, onCellValueChanged) {
        const div = document.getElementById(eleId);
        if (!div) {
            return;
        }
        const existing = this.state.grids[viewKey];
        if (existing && typeof existing.destroy === "function") {
            existing.destroy();
        }
        div.innerHTML = "";
        const options = {
            columnDefs,
            rowData: rowData || [],
            defaultColDef: { sortable: true, filter: true, resizable: window.innerWidth > 767, editable: false },
            animateRows: true,
            stopEditingWhenCellsLoseFocus: true,
            // 分類分析樞紐表的「＝ 合計 ＝」列用專屬 class 加底色標示，其他表格沒有 category 欄位或不會有這個值，不受影響
            getRowClass: (params) => {
                if (!params.data) return undefined;
                // 分類分析樞紐表用 category 欄位標示合計列；其他表格（如下月預估開支）可直接掛 _isTotal 旗標
                return params.data._isTotal || params.data.category === "＝ 合計 ＝" ? "ca-total-row" : undefined;
            },
        };
        if (typeof onCellValueChanged === "function") {
            options.onCellValueChanged = onCellValueChanged;
        }
        this.state.grids[viewKey] = agGrid.createGrid(div, options);
    }

    // ---------- 明細（關鍵字/月份篩選 + 明細面板） ----------

    populateDetailMonths(viewId) {
        const cfg = this.detailViewConfig[viewId];
        if (!cfg) {
            return;
        }
        var rows = this.data.details || [];
        if (cfg.sign === "income") rows = rows.filter((x) => Number(x.Amount || 0) >= 0);
        if (cfg.sign === "expense") rows = rows.filter((x) => Number(x.Amount || 0) < 0);

        const months = [...new Set(rows.map((x) => String(x.YearMonth || "").trim()).filter(Boolean))].sort((a, b) => b.localeCompare(a));
        const select = document.getElementById(cfg.month);
        if (select) {
            const current = this.txFilters[viewId].month;
            select.innerHTML = ['<option value="">全部月份</option>', ...months.map((m) => `<option value="${m}">${m}</option>`)].join("");
            select.value = months.includes(current) ? current : "";
            this.txFilters[viewId].month = select.value;
            this.refreshCustomDropdown(cfg.month);
        }
    }

    _isExcluded(row) {
        return row?.IsExcluded === true;
    }

    _excludeCellRenderer(params) {
        const excluded = this._isExcluded(params.data);
        const btn = document.createElement("button");
        btn.textContent = excluded ? "取消排除" : "排除";
        btn.classList.add("btn", excluded ? "btn-secondary" : "btn-danger");
        btn.addEventListener("click", (event) => {
            event.stopPropagation();
            this.toggleDetailExcluded(params.data);
        });
        const area = document.createElement("div");
        $(area).css({ display: "flex", justifyContent: "center" });
        area.appendChild(btn);
        return area;
    }

    toggleDetailExcluded(row) {
        if (!row || !row.DetailId) {
            alert("找不到明細識別碼，無法變更排除狀態");
            return;
        }
        var self = this;
        $.post("/api/finance/details/" + row.DetailId + "/toggle-exclude")
            .done(function () {
                self.renderDetailGrid(self.state.currentView);
            })
            .fail(function () {
                alert("操作失敗，請洽系統管理員");
            });
    }

    setDetailShowExcluded(viewId, showExcluded) {
        this.txShowExcluded[viewId] = Boolean(showExcluded);
        const cfg = this.detailViewConfig[viewId];
        const btn = cfg ? document.getElementById(cfg.showExcludedBtn) : null;
        if (btn) {
            btn.textContent = this.txShowExcluded[viewId] ? "顯示正常項目" : "顯示已排除";
            btn.classList.toggle("active", this.txShowExcluded[viewId]);
        }
        this.renderDetailGrid(viewId);
    }

    renderDetailGrid(viewId) {
        const cfg = this.detailViewConfig[viewId];
        if (!cfg) {
            return;
        }
        const filter = this.txFilters[viewId] || { keyword: "", month: "" };
        const sign = cfg.sign;
        const showExcluded = Boolean(this.txShowExcluded[viewId]);

        $.get("/api/finance/details", {
            sign: sign,
            keyword: filter.keyword || "",
            month: filter.month || "",
            showExcluded: showExcluded,
        }).then((data) => {
            $("#" + cfg.grid).empty();
            this.initGrids_by_viewId(data, viewId, cfg.grid);
        });
    }

    // 點擊明細頁面上方走勢圖的某個月份：把該月同步到「版本月份」下拉選單，並套用到下方表格篩選
    // 再點一次同一個月份 = 取消篩選，回到「全部月份」
    onDetailTrendChartPeriodClick(viewId, period) {
        const cfg = this.detailViewConfig[viewId];
        if (!cfg) return;
        const current = this.txFilters[viewId].month;
        const next = current === period ? "" : period;

        this.txFilters[viewId].month = next;
        const select = document.getElementById(cfg.month);
        if (select) select.value = next;

        this.renderDetailGrid(viewId);
        this.highlightDetailTrendChartPeriod(viewId, next);
    }

    // 用透明度標示走勢圖目前選取（＝表格正在篩選）的月份
    highlightDetailTrendChartPeriod(viewId, selectedPeriod) {
        const cfg = this.detailViewConfig[viewId];
        const chart = cfg && this.state.charts[cfg.chart];
        if (!chart) return;
        chart.series.forEach((series) => {
            series.points.forEach((point) => {
                const el = point.graphic;
                if (el) {
                    el.attr({ opacity: !selectedPeriod || point.category === selectedPeriod ? 1 : 0.35 });
                }
            });
        });
    }

    // 手機上月份一多，直接把柱子/折線擠進窄螢幕會完全看不清楚。
    // 改用 Highcharts 的 scrollablePlotArea：圖表畫成「每個月份都有足夠寬度」的完整寬度，
    // 超出螢幕的部分左右滑動查看（跟表格的橫向拖曳是同一種操作邏輯），Y 軸維持固定不跟著捲動。
    getMobileChartTweaks(categoryCount, pxPerCategory = 42, minWidth = 320) {
        if (window.innerWidth > 767) {
            return { chart: {}, xAxisLabels: {}, yAxisTitle: undefined };
        }
        return {
            chart: {
                scrollablePlotArea: {
                    minWidth: Math.max(categoryCount * pxPerCategory, minWidth),
                    scrollPositionX: 0, // 預設捲到最左邊（最早月份），避免手機上初次進來時位置飄在中間
                },
            },
            xAxisLabels: { rotation: -45 },
            // 手機版空間有限，Y 軸的「金額 (NT$)」直向標題會跟刻度數字擠在一起、還會被 Y 軸固定+橫向捲動的版面蓋住，直接拿掉
            // （刻度數字本身已經有 "NT$" 開頭，不會看不懂單位）
            yAxisTitle: { text: null },
        };
    }

    // 明細頁面上方的「各月收支走勢」圖表，用已載入的 this.data.details（未排除項目、不受頁面上關鍵字/月份篩選影響）計算
    renderDetailTrendChart(viewId) {
        const self = this;
        const cfg = this.detailViewConfig[viewId];
        if (!cfg || !cfg.chart) return;
        const container = document.getElementById(cfg.chart);
        if (!container) return;

        const allRows = this.data.details || [];
        const byMonth = {};
        allRows.forEach((row) => {
            const ym = String(row.YearMonth || "").trim();
            if (!ym) return;
            const amount = Number(row.Amount || 0);
            if (!byMonth[ym]) byMonth[ym] = { income: 0, expense: 0 };
            if (amount >= 0) byMonth[ym].income += amount;
            else byMonth[ym].expense += -amount;
        });
        const months = Object.keys(byMonth).sort();

        $(container).empty();
        if (months.length === 0) {
            return;
        }

        let series;
        let title;
        if (cfg.sign === "income") {
            series = [{ name: "收入", data: months.map((m) => Math.round(byMonth[m].income)), color: "#4caf50" }];
            title = "每月收入走勢";
        } else if (cfg.sign === "expense") {
            series = [{ name: "支出", data: months.map((m) => Math.round(byMonth[m].expense)), color: "#ff5722" }];
            title = "每月支出走勢";
        } else {
            series = [
                { name: "收入", data: months.map((m) => Math.round(byMonth[m].income)), color: "#4caf50" },
                { name: "支出", data: months.map((m) => Math.round(byMonth[m].expense)), color: "#ff5722" },
                { name: "結餘", data: months.map((m) => Math.round(byMonth[m].income - byMonth[m].expense)), color: "#00bcd4", type: "line" },
            ];
            title = "每月收支走勢";
        }

        const mobileTweaks = this.getMobileChartTweaks(months.length);

        this.state.charts[cfg.chart] = Highcharts.chart(cfg.chart, {
            chart: {
                type: "column",
                backgroundColor: "transparent",
                style: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
                ...mobileTweaks.chart,
            },
            title: { text: title, style: { color: "#ffffff" } },
            credits: { enabled: false },
            xAxis: {
                categories: months,
                gridLineColor: "#424242",
                lineColor: "#757575",
                tickColor: "#757575",
                labels: { style: { color: "#b0b0b0" }, ...mobileTweaks.xAxisLabels },
            },
            yAxis: {
                title: { text: "金額 (NT$)", style: { color: "#b0b0b0" }, ...mobileTweaks.yAxisTitle },
                gridLineColor: "#424242",
                labels: { style: { color: "#b0b0b0" }, formatter: function () { return self.formatAxisCurrency(this.value); } },
            },
            legend: { itemStyle: { color: "#b0b0b0" }, itemHoverStyle: { color: "#ffffff" } },
            tooltip: {
                backgroundColor: "#2a2a2a",
                borderColor: "#757575",
                style: { color: "#ffffff" },
                shared: true,
                // 觸控裝置預設 followTouchMove:true 會把手指移動當成「拖曳看提示框」，
                // 跟 scrollablePlotArea 的橫向滑動搶手勢，導致點擊事件跟提示框都不穩定觸發；
                // 關掉後改成「點一下＝顯示提示框並觸發點擊」，滑動交給圖表捲動處理
                followTouchMove: false,
                // scrollablePlotArea 會把提示框限制在圖表自己的（會被捲動裁切的）SVG範圍內，
                // 導致提示框位置算到看不見的地方或直接被裁掉；outside:true 讓提示框改成掛在整個網頁上，不受圖表捲動範圍限制
                outside: true,
                formatter: function () {
                    let s = "<b>" + this.x + "</b>";
                    this.points.forEach((point) => {
                        s += '<br/><span style="color:' + point.color + '">●</span> ' + point.series.name + ": " + self.formatAxisCurrency(point.y);
                    });
                    return s;
                },
            },
            plotOptions: {
                column: {
                    borderWidth: 0,
                    cursor: "pointer",
                    point: {
                        events: {
                            click: function () {
                                var point = this;
                                self.onDetailTrendChartPeriodClick(viewId, point.category);
                                // 觸控裝置上 Highcharts 內建的「點一下顯示提示框」偵測跟 scrollablePlotArea 的橫向捲動衝突，
                                // 常常導致提示框根本不出現；既然點擊事件本身已經確定會穩定觸發，改成點擊時手動叫出提示框，
                                // 不再依賴 Highcharts 自己判斷要不要顯示
                                var chart = point.series.chart;
                                var sharedPoints = chart.series.map((s) => s.points[point.index]).filter(Boolean);
                                chart.tooltip.refresh(sharedPoints.length ? sharedPoints : point);
                            },
                        },
                    },
                },
            },
            series: series,
        });

        // 若切換頁面前已經有月份篩選在生效，圖表畫好後要立刻反映選取狀態
        this.highlightDetailTrendChartPeriod(viewId, this.txFilters[viewId].month);
    }

    handleGridRowClicked(viewId, data) {
        const cfg = this.detailViewConfig[viewId];
        if (!cfg || !data) {
            return;
        }
        this.showTransactionDetailPanel(cfg.panel, data);
    }

    showTransactionDetailPanel(panelId, data) {
        const panel = document.getElementById(panelId);
        if (!panel) {
            return;
        }
        const fields = [
            ["年月", data.YearMonth],
            ["日期", data.TransactionDate],
            ["類別", data.Category],
            ["銀行", data.OrganizationName],
            ["帳戶", data.AccountName],
            ["描述", data.Description],
            ["金額", this.formatCurrency(Number(data.Amount || 0))],
            ["標註", data.Tag],
            ["筆記", data.Notes],
        ];
        panel.innerHTML = `<div class="tx-detail-grid">${fields
            .map(
                ([label, value]) => `<div class="tx-detail-item"><span class="label">${label}</span><span class="value">${value === null || value === undefined || value === "" ? "—" : value}</span></div>`,
            )
            .join("")}</div>`;
    }

    // ---------- 分類分析 ----------

    // 分類分析「起/迄」的預設範圍：依月份時預設「今年 1 月 ~ 最新月份（本月）」；
    // 依年份時維持原本行為（不限制範圍，顯示全部歷史年份），因為單一年份區間沒有對應的「當年度」概念
    _defaultCategoryAnalysisRange(granularity) {
        const now = new Date();
        const currentYear = String(now.getFullYear());
        if (granularity === "year") {
            return { start: "", end: "" };
        }
        const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
        return { start: `${currentYear}-01`, end: `${currentYear}-${currentMonth}` };
    }

    renderCategoryAnalysis() {
        var self = this;
        $.get("/api/finance/category-analysis", {
            mode: this.categoryAnalysis.mode,
            granularity: this.categoryAnalysis.granularity,
            start: this.categoryAnalysis.start || "",
            end: this.categoryAnalysis.end || "",
        }).then(function (data) {
            var periods = [...new Set(data.map((d) => d.Period))].sort();
            var categories = [...new Set(data.map((d) => d.Category))];

            var sums = {};
            categories.forEach((cat) => {
                sums[cat] = {};
            });
            data.forEach((d) => {
                sums[d.Category][d.Period] = d.Total;
            });

            categories.sort((a, b) => {
                var ta = periods.reduce((s, p) => s + (sums[a][p] || 0), 0);
                var tb = periods.reduce((s, p) => s + (sums[b][p] || 0), 0);
                return tb - ta;
            });

            var fillSelect = (id, value) => {
                var el = document.getElementById(id);
                if (el) {
                    el.innerHTML = periods.map((p) => `<option value="${p}">${p}</option>`).join("");
                    if (periods.includes(value)) {
                        el.value = value;
                    }
                }
            };
            fillSelect("caStart", self.categoryAnalysis.start || periods[0]);
            fillSelect("caEnd", self.categoryAnalysis.end || periods[periods.length - 1]);
            self.refreshCustomDropdown("caStart");
            self.refreshCustomDropdown("caEnd");

            document.getElementById("caModeExpense")?.classList.toggle("active", self.categoryAnalysis.mode === "expense");
            document.getElementById("caModeIncome")?.classList.toggle("active", self.categoryAnalysis.mode === "income");
            document.getElementById("caGranMonth")?.classList.toggle("active", self.categoryAnalysis.granularity === "month");
            document.getElementById("caGranYear")?.classList.toggle("active", self.categoryAnalysis.granularity === "year");

            self.categoryAnalysis.lastData = { periods, categories, sums };
            if (self.categoryAnalysis.selectedPeriod && !periods.includes(self.categoryAnalysis.selectedPeriod)) {
                self.categoryAnalysis.selectedPeriod = null;
            }

            self.renderCategoryAnalysisChart(periods, categories, sums);
            self.applyCategoryAnalysisSelection();
        });
    }

    // 依目前選取的月份/年份，重繪明細表格與選取狀態列（不重新打 API，直接用上次抓回的資料）
    applyCategoryAnalysisSelection() {
        if (!this.categoryAnalysis.lastData) return;
        const { periods, categories, sums } = this.categoryAnalysis.lastData;
        const selected = this.categoryAnalysis.selectedPeriod;

        const bar = document.getElementById("caSelectionBar");
        const label = document.getElementById("caSelectionLabel");
        if (bar && label) {
            if (selected) {
                bar.classList.remove("hidden");
                label.textContent = `已選取：${selected}（依 ${this.categoryAnalysis.mode === "income" ? "收入" : "支出"}佔比排序）`;
            } else {
                bar.classList.add("hidden");
                label.textContent = "";
            }
        }

        this.highlightCategoryAnalysisChartPeriod(selected);

        if (selected) {
            this.renderCategoryPivotGridForPeriod(selected, categories, sums);
        } else {
            this.renderCategoryPivotGrid(periods, categories, sums);
        }
    }

    // 點擊圖表某個月/年時觸發，切換選取狀態（再點一次同一個月份會取消選取）
    onCategoryAnalysisPeriodClick(period) {
        this.categoryAnalysis.selectedPeriod = this.categoryAnalysis.selectedPeriod === period ? null : period;
        this.applyCategoryAnalysisSelection();
    }

    // 用透明度標示目前選取的月份，讓圖表與下方表格的連動更明顯
    highlightCategoryAnalysisChartPeriod(selectedPeriod) {
        const chart = this.state.charts["categoryAnalysisChart"];
        if (!chart) return;
        chart.series.forEach((series) => {
            series.points.forEach((point) => {
                const el = point.graphic;
                if (el) {
                    el.attr({ opacity: !selectedPeriod || point.category === selectedPeriod ? 1 : 0.35 });
                }
            });
        });
    }

    renderCategoryAnalysisChart(periods, categories, sums) {
        const self = this;
        const palette = ["#00bcd4", "#4caf50", "#ff5722", "#9c27b0", "#ff9800", "#3f51b5", "#e91e63", "#009688", "#cddc39", "#795548", "#607d8b", "#f44336"];
        const series = categories.map((cat, i) => ({
            name: cat,
            data: periods.map((p) => Math.round(sums[cat][p] || 0)),
            color: palette[i % palette.length],
        }));
        // 操作說明拿掉：手機上標題文字太長會跟圖表區重疊，且這個提示不影響實際操作
        const title = (this.categoryAnalysis.mode === "income" ? "收入" : "支出") + "分類分析";
        const mobileTweaks = this.getMobileChartTweaks(periods.length);
        this.state.charts["categoryAnalysisChart"] = Highcharts.chart("categoryAnalysisChart", {
            chart: {
                type: "column",
                backgroundColor: "transparent",
                style: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
                ...mobileTweaks.chart,
            },
            title: { text: title, style: { color: "#ffffff" } },
            credits: { enabled: false },
            xAxis: {
                categories: periods,
                gridLineColor: "#424242",
                lineColor: "#757575",
                tickColor: "#757575",
                labels: { style: { color: "#b0b0b0" }, ...mobileTweaks.xAxisLabels },
            },
            yAxis: {
                title: { text: "金額 (NT$)", style: { color: "#b0b0b0" }, ...mobileTweaks.yAxisTitle },
                gridLineColor: "#424242",
                labels: { style: { color: "#b0b0b0" }, formatter: function () { return self.formatAxisCurrency(this.value); } },
            },
            // 分類數量一多，圖例會佔掉一大塊畫面（尤其手機），且點柱狀圖已經能篩選/查看下方明細，
            // 圖例本身資訊量不高，直接關閉
            legend: { enabled: false },
            tooltip: {
                backgroundColor: "#2a2a2a",
                borderColor: "#757575",
                style: { color: "#ffffff" },
                shared: true,
                // 觸控裝置預設 followTouchMove:true 會把手指移動當成「拖曳看提示框」，
                // 跟 scrollablePlotArea 的橫向滑動搶手勢，導致點擊事件跟提示框都不穩定觸發；
                // 關掉後改成「點一下＝顯示提示框並觸發點擊」，滑動交給圖表捲動處理
                followTouchMove: false,
                // scrollablePlotArea 會把提示框限制在圖表自己的（會被捲動裁切的）SVG範圍內，
                // 導致提示框位置算到看不見的地方或直接被裁掉；outside:true 讓提示框改成掛在整個網頁上，不受圖表捲動範圍限制
                outside: true,
                formatter: function () {
                    let s = "<b>" + this.x + "</b>";
                    this.points.forEach((point) => {
                        if (point.y) {
                            s += '<br/><span style="color:' + point.color + '">●</span> ' + point.series.name + ": " + self.formatAxisCurrency(point.y);
                        }
                    });
                    return s;
                },
            },
            plotOptions: {
                column: {
                    stacking: "normal",
                    borderWidth: 0,
                    cursor: "pointer",
                    point: {
                        events: {
                            click: function () {
                                var point = this;
                                self.onCategoryAnalysisPeriodClick(point.category);
                                // 同步明細走勢圖的做法：觸控裝置上 Highcharts 內建的提示框偵測跟 scrollablePlotArea 衝突，
                                // 改成點擊時手動叫出提示框
                                var chart = point.series.chart;
                                var sharedPoints = chart.series.map((s) => s.points[point.index]).filter(Boolean);
                                chart.tooltip.refresh(sharedPoints.length ? sharedPoints : point);
                            },
                        },
                    },
                },
            },
            series: series,
        });
        // 圖表剛畫好時，若已有選取的月份要立刻套用淡出效果
        this.highlightCategoryAnalysisChartPeriod(this.categoryAnalysis.selectedPeriod);
    }

    // 樞紐表的期間欄位 header 精簡化："2025-11" -> "25/11"、"2025" -> "25"，減少表頭寬度
    _formatCaPeriodHeader(p) {
        if (/^\d{4}-\d{2}$/.test(p)) {
            return p.slice(2).replace("-", "/");
        }
        if (/^\d{4}$/.test(p)) {
            return p.slice(2);
        }
        return p;
    }

    // 未選取任何月份時：完整的 分類 x 期間 樞紐表
    // 欄寬加大（92 -> 120）：原本 92px 在數字較大時（例如 6 位數金額）會被截斷顯示不全
    renderCategoryPivotGrid(periods, categories, sums) {
        const cols = [{ field: "category", headerName: "分類", pinned: "left", minWidth: 140, flex: 1 }];
        periods.forEach((p) => {
            cols.push({
                field: p,
                headerName: this._formatCaPeriodHeader(p),
                width: 120,
                minWidth: 120,
                valueFormatter: (params) => "NT$ " + Math.round(Number(params.value || 0)).toLocaleString(),
            });
        });
        // pinRight 欄位改為「平均值」（期間金額平均），不再顯示合計值
        cols.push({
            field: "__avg",
            headerName: "平均值",
            width: 150,
            minWidth: 150,
            pinned: "right",
            valueFormatter: (params) => "NT$ " + Math.round(Number(params.value || 0)).toLocaleString(),
            cellStyle: () => ({ fontWeight: "bold", color: "#00bcd4" }),
        });

        const periodCount = periods.length || 1;
        const rows = categories.map((cat) => {
            const row = { category: cat };
            let total = 0;
            periods.forEach((p) => {
                const v = Math.round(sums[cat][p] || 0);
                row[p] = v;
                total += v;
            });
            row.__avg = Math.round(total / periodCount);
            return row;
        });
        if (rows.length) {
            const totalRow = { category: "＝ 合計 ＝" };
            let grand = 0;
            periods.forEach((p) => {
                const colSum = rows.reduce((s, r) => s + Number(r[p] || 0), 0);
                totalRow[p] = colSum;
                grand += colSum;
            });
            totalRow.__avg = Math.round(grand / periodCount);
            rows.push(totalRow);
        }

        this.createDetailGrid("categoryPivotGrid", "categoryPivotGrid", cols, rows);
    }

    // 已選取某個月/年時：只顯示該期間的各分類金額與佔比，依金額由大到小排序
    renderCategoryPivotGridForPeriod(period, categories, sums) {
        const isYearGranularity = this.categoryAnalysis.granularity === "year";
        const year = isYearGranularity ? period : period.slice(0, 4);
        // 該年度所有月份（依目前已抓回的資料範圍，可能因為「起/迄」篩選而不滿 12 個月）
        const periodsInYear = isYearGranularity
            ? [period]
            : (this.categoryAnalysis.lastData?.periods || []).filter((p) => p.startsWith(year + "-"));

        const cols = [
            { field: "category", headerName: "分類", pinned: "left", minWidth: 160, flex: 1 },
            {
                field: "amount",
                headerName: "金額",
                width: 160,
                valueFormatter: (params) => "NT$ " + Math.round(Number(params.value || 0)).toLocaleString(),
            },
            {
                field: "percent",
                headerName: "佔比",
                width: 120,
                valueFormatter: (params) => Number(params.value || 0).toFixed(1) + "%",
            },
            {
                field: "yearAvg",
                // 年度已經顯示在上方「已選取」列，欄位 header 不用重複列出
                headerName: "年度月均",
                width: 140,
                valueFormatter: (params) => "NT$ " + Math.round(Number(params.value || 0)).toLocaleString(),
            },
        ];

        let rows = categories
            .map((cat) => {
                const amount = Math.round(sums[cat][period] || 0);
                const yearTotal = periodsInYear.reduce((s, p) => s + (sums[cat][p] || 0), 0);
                const yearAvg = isYearGranularity
                    ? yearTotal / 12
                    : periodsInYear.length
                      ? yearTotal / periodsInYear.length
                      : 0;
                return { category: cat, amount, yearAvg: Math.round(yearAvg) };
            })
            .filter((r) => r.amount !== 0);

        const grandTotal = rows.reduce((s, r) => s + r.amount, 0);
        const grandYearAvg = rows.reduce((s, r) => s + r.yearAvg, 0);
        rows = rows
            .map((r) => ({ ...r, percent: grandTotal ? (r.amount / grandTotal) * 100 : 0 }))
            .sort((a, b) => b.amount - a.amount);

        if (rows.length) {
            rows.push({ category: "＝ 合計 ＝", amount: grandTotal, percent: 100, yearAvg: grandYearAvg });
        }

        this.createDetailGrid("categoryPivotGrid", "categoryPivotGrid", cols, rows);
    }

    // ---------- 專案列表 ----------

    getSortedProjects() {
        const sort = document.getElementById("projectSort")?.value || "latest";
        const list = [...(this.data.projects || [])];
        if (sort === "name_asc") {
            list.sort((a, b) => String(a.BillProjectId || "").localeCompare(String(b.BillProjectId || ""), "zh-Hant"));
        } else if (sort === "asset_desc" || sort === "change_desc") {
            list.sort((a, b) => Number(b.BillBudget || 0) - Number(a.BillBudget || 0));
        }
        return list;
    }

    renderProjectKpis(list) {
        const rows = list || this.data.projects || [];
        const total = rows.length;
        const active = rows.filter((p) => String(p.Status || "") === "進行中").length;
        const budgetSum = rows.reduce((s, p) => s + Number(p.BillBudget || 0), 0);
        const netSum = rows.reduce((s, p) => s + Number(p.Net || 0), 0);
        this._setText("pmKpiTotal", String(total));
        this._setText("pmKpiActive", `進行中 ${active}`);
        this._setText("pmKpiBudget", "NT$ " + Math.round(budgetSum).toLocaleString());
        this._setText("pmKpiNet", (netSum >= 0 ? "+" : "") + "NT$ " + Math.round(netSum).toLocaleString());
        const netEl = document.getElementById("pmKpiNet");
        if (netEl) {
            netEl.style.color = netSum >= 0 ? "#4caf50" : "#f44336";
        }
        this._setText("pmKpiAsset", "NT$ " + Math.round(budgetSum).toLocaleString());
        this._setText("pmKpiChange", "各專案預期資產變化請至詳情頁查看");
    }

    refreshProjectListView() {
        const sorted = this.getSortedProjects();
        this.renderProjectKpis(sorted);
        $("#project_list").empty();
        $("#projectComparisonChart").empty();
        this.initGrids_by_viewId(sorted, "project-management", "project_list");
        this.renderProjectComparisonCharts(sorted, "projectComparisonChart");
    }

    /**
     * 專案收支對比：每個專案各自一張小圖、各自一條 y 軸。
     *
     * 原本是所有專案共用一張圖、一條 y 軸的群組柱狀圖，但專案之間的金額級距差很多
     * （例如信貸投資案是千萬級、康樂是萬級），小額專案的柱子會被壓成貼著 x 軸的細線，
     * 完全看不出收支關係。改成小多圖後每張圖自己縮放，代價是不同專案之間不能直接
     * 用柱子高度比大小，所以每張圖都會標出自己的最大金額當作尺度提示。
     */
    renderProjectComparisonCharts(list, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }
        const rows = list || [];
        container.innerHTML = "";

        if (!rows.length) {
            container.innerHTML = '<p class="pd-muted" style="padding:16px;">目前沒有專案資料</p>';
            return;
        }

        const self = this;
        // 舊的單張圖表實例要先銷毀，否則重新整理時會殘留在 state.charts 裡
        Object.keys(this.state.charts)
            .filter((key) => key === containerId || key.startsWith(containerId + "-"))
            .forEach((key) => {
                try {
                    this.state.charts[key]?.destroy?.();
                } catch (e) {
                    /* 已被 innerHTML 清掉的圖表 destroy 會拋錯，忽略即可 */
                }
                delete this.state.charts[key];
            });

        const grid = document.createElement("div");
        grid.className = "project-chart-grid";
        container.appendChild(grid);

        rows.forEach((row, index) => {
            const income = Math.round(Math.abs(Number(row.Income || 0)));
            const expense = Math.round(Math.abs(Number(row.Expense || 0)));
            const net = Math.round(Number(row.Net || 0));
            const scale = Math.max(income, expense, Math.abs(net));

            const cell = document.createElement("div");
            cell.className = "project-chart-cell";
            const chartId = `${containerId}-${index}`;
            cell.innerHTML = `
                <div class="project-chart-head">
                    <span class="project-chart-name" title="${self.escapeHtml(String(row.BillProjectId || ""))}">${self.escapeHtml(String(row.BillProjectId || "(未命名)"))}</span>
                    <span class="project-chart-scale">最大 ${self.formatAxisCurrency(scale)}</span>
                </div>
                <div id="${chartId}" class="project-chart-body"></div>`;
            grid.appendChild(cell);

            self.state.charts[chartId] = Highcharts.chart(chartId, {
                chart: {
                    type: "column",
                    backgroundColor: "transparent",
                    height: 200,
                    spacing: [8, 8, 8, 8],
                    style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
                },
                title: { text: null },
                credits: { enabled: false },
                legend: { enabled: false },
                exporting: { enabled: false },
                xAxis: {
                    categories: ["收入", "支出", "淨收入"],
                    gridLineColor: "#424242",
                    lineColor: "#757575",
                    tickColor: "#757575",
                    labels: { style: { color: "#b0b0b0", fontSize: "11px" } },
                },
                yAxis: {
                    // 每張小圖各自縮放，這是本次改版的重點
                    title: { text: null },
                    gridLineColor: "#424242",
                    labels: {
                        style: { color: "#b0b0b0", fontSize: "10px" },
                        formatter: function () {
                            return self.formatAxisCurrency(this.value);
                        },
                    },
                },
                tooltip: {
                    backgroundColor: "#2a2a2a",
                    borderColor: "#757575",
                    style: { color: "#ffffff" },
                    outside: true,
                    followTouchMove: false,
                    formatter: function () {
                        return "<b>" + row.BillProjectId + "</b><br/>" + this.x + "：" + self.formatAxisCurrency(this.y);
                    },
                },
                plotOptions: {
                    column: { borderWidth: 0, groupPadding: 0.08, pointPadding: 0.06 },
                },
                series: [
                    {
                        name: "金額",
                        colorByPoint: true,
                        colors: ["#4caf50", "#ff5722", "#00bcd4"],
                        data: [income, expense, net],
                    },
                ],
            });
        });
    }

    getProjectCreateForm() {
        return `
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display:block; margin-bottom:8px; color:#b0b0b0;">專案名稱</label>
                    <input type="text" id="newProjectName" placeholder="例如：高股息再投入"
                           style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:8px; color:#b0b0b0;">關鍵字（可用逗號分隔多個）</label>
                    <input type="text" id="newProjectKeyword" placeholder="例如：高股息,股息"
                           style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
                </div>
                <div style="display:flex; gap:12px;">
                    <div style="flex:1;">
                        <label style="display:block; margin-bottom:8px; color:#b0b0b0;">預算</label>
                        <input type="number" id="newProjectBudget" placeholder="0"
                               style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
                    </div>
                    <div style="flex:1;">
                        <label style="display:block; margin-bottom:8px; color:#b0b0b0;">狀態</label>
                        <select id="newProjectStatus"
                                style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
                            <option value="規劃中">規劃中</option>
                            <option value="進行中" selected>進行中</option>
                            <option value="已完成">已完成</option>
                        </select>
                    </div>
                </div>
                <div style="display:flex; gap:12px;">
                    <div style="flex:1;">
                        <label style="display:block; margin-bottom:8px; color:#b0b0b0;">開始日</label>
                        <input type="date" id="newProjectStartDate"
                               style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
                    </div>
                    <div style="flex:1;">
                        <label style="display:block; margin-bottom:8px; color:#b0b0b0;">結束日</label>
                        <input type="date" id="newProjectEndDate"
                               style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
                    </div>
                </div>
            </div>
        `;
    }

    openAddProjectModal() {
        this.showModal("新增專案", this.getProjectCreateForm(), () => {
            const name = document.getElementById("newProjectName")?.value?.trim();
            const keyword = document.getElementById("newProjectKeyword")?.value?.trim() || name;
            const budget = Number(document.getElementById("newProjectBudget")?.value || 0);
            const status = document.getElementById("newProjectStatus")?.value || "進行中";
            const startDate = document.getElementById("newProjectStartDate")?.value || "";
            const endDate = document.getElementById("newProjectEndDate")?.value || "";

            if (!name) {
                alert("請填入專案名稱");
                return;
            }

            var self = this;
            $.ajax({
                url: "/api/finance/projects",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({ name: name, keyword: keyword, budget: budget, status: status, startDate: startDate || null, endDate: endDate || null }),
            })
                .done(function () {
                    self.closeModal();
                    self.load_data("projects").then(function () {
                        self.refreshProjectListView();
                    });
                })
                .fail(function (xhr) {
                    alert("新增失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
                });
        });
    }

    saveProjectDetail() {
        const draft = this.state.projectDetailDraft;
        if (!draft) {
            return;
        }
        const name = document.getElementById("pdName")?.value?.trim();
        const status = document.getElementById("pdStatus")?.value;
        const budget = Number(document.getElementById("pdBudget")?.value || 0);
        const startDate = document.getElementById("pdStartDate")?.value || "";
        const endDate = document.getElementById("pdEndDate")?.value || "";
        const includeCashflowInActualAsset = !!document.getElementById("pdIncludeCashflow")?.checked;

        if (!name) {
            this.showModal("欄位不足", "<p>請填入專案名稱。</p>", () => this.closeModal());
            return;
        }

        var self = this;
        $.ajax({
            url: `/api/finance/projects/${draft.projectId}`,
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify({ name, keyword: draft.keyword, budget, status, startDate: startDate || null, endDate: endDate || null, includeCashflowInActualAsset }),
        })
            .done(function () {
                draft.includeCashflowInActualAsset = includeCashflowInActualAsset;
                self.setProjectDetailDirty(false);
                self.showModal("儲存完成", `<p>「${name}」的專案設定已更新。</p>`, () => self.closeModal());
            })
            .fail(function (xhr) {
                self.showModal("儲存失敗", `<p>${xhr.responseJSON?.message || "請洽系統管理員"}</p>`, () => self.closeModal());
            });
    }

    confirmDeleteProject(project) {
        var self = this;
        const projectId = project.ProjectId;
        const name = String(project.BillProjectId || "");
        this.showModal("刪除專案", `<p>確定要刪除「${name}」嗎？此操作會將專案停用（軟刪除），不影響原始交易資料。</p>`, () => {
            $.ajax({ url: "/api/finance/projects/" + projectId, type: "DELETE" })
                .done(function () {
                    self.closeModal();
                    self.load_data("projects").then(function () {
                        self.refreshProjectListView();
                    });
                })
                .fail(function (xhr) {
                    alert("刪除失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
                });
        });
    }

    // ---------- 帳單管理 ----------

    refreshBillListView() {
        var self = this;
        $("#bills_list").empty();
        return this.load_data("bills").then(function () {
            self.initGrids_by_viewId(self.data.bills, "bill-management", "bills_list");
        });
    }

    // 新增/編輯共用同一份表單；defaults 有帶值時是編輯模式，欄位會預先帶入現有資料
    getBillForm(defaults) {
        const d = defaults || {};
        return `
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display:block; margin-bottom:8px; color:#b0b0b0;">專案名稱（可留空，僅供標示用途）</label>
                    <input type="text" id="billProjectId" value="${d.BillProjectId ? String(d.BillProjectId).replace(/"/g, "&quot;") : ""}" placeholder="例如：房租"
                           style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:8px; color:#b0b0b0;">帳單名稱</label>
                    <input type="text" id="billName" value="${d.BillName ? String(d.BillName).replace(/"/g, "&quot;") : ""}" placeholder="例如：房租"
                           style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:8px; color:#b0b0b0;">頻率規則</label>
                    <input type="text" id="billFrequency" value="${d.Frequency ? String(d.Frequency).replace(/"/g, "&quot;") : ""}" placeholder="例如：{type:'monthly',interval:'1',date:'5'}"
                           style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
                    <p class="pd-muted" style="margin-top:6px;">格式沿用「每月支出」預估邏輯（frequency_tool.js）：weekly 用 weekday(1=一~7=日)、monthly/yearly 用 date(幾號)，yearly 另需 month(1-12)。</p>
                </div>
                <div style="display:flex; gap:12px;">
                    <div style="flex:1;">
                        <label style="display:block; margin-bottom:8px; color:#b0b0b0;">金額</label>
                        <input type="number" id="billAmount" value="${d.BillAmount != null ? Number(d.BillAmount) : ""}" placeholder="0"
                               style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
                    </div>
                </div>
                <div style="display:flex; gap:12px;">
                    <div style="flex:1;">
                        <label style="display:block; margin-bottom:8px; color:#b0b0b0;">開始日期</label>
                        <input type="date" id="billStartDate" value="${d.BillStartTime ? this.formatDate(d.BillStartTime) : ""}"
                               style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
                    </div>
                    <div style="flex:1;">
                        <label style="display:block; margin-bottom:8px; color:#b0b0b0;">結束日期（可留空＝沒有結束日）</label>
                        <input type="date" id="billEndDate" value="${d.BillEndTime ? this.formatDate(d.BillEndTime) : ""}"
                               style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
                    </div>
                </div>
                <div>
                    <label style="display:block; margin-bottom:8px; color:#b0b0b0;">備註</label>
                    <input type="text" id="billNote" value="${d.Note ? String(d.Note).replace(/"/g, "&quot;") : ""}"
                           style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
                </div>
            </div>
        `;
    }

    _readBillFormPayload() {
        const billProjectId = document.getElementById("billProjectId")?.value?.trim() || null;
        const billName = document.getElementById("billName")?.value?.trim();
        const frequency = document.getElementById("billFrequency")?.value?.trim();
        const billAmount = Number(document.getElementById("billAmount")?.value || 0);
        const startDate = document.getElementById("billStartDate")?.value || "";
        const endDate = document.getElementById("billEndDate")?.value || "";
        const note = document.getElementById("billNote")?.value?.trim() || null;

        return {
            BillProjectId: billProjectId,
            BillName: billName,
            Frequency: frequency,
            BillAmount: billAmount,
            BillStartTime: startDate || null,
            BillEndTime: endDate || null,
            Note: note,
        };
    }

    openAddBillModal() {
        var self = this;
        this.showModal("新增帳單", this.getBillForm(), () => {
            const payload = self._readBillFormPayload();
            if (!payload.BillName || !payload.Frequency) {
                alert("請填寫帳單名稱與頻率規則");
                return;
            }
            $.ajax({
                url: "/api/finance/bills",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(payload),
            })
                .done(function () {
                    self.closeModal();
                    self.refreshBillListView();
                })
                .fail(function (xhr) {
                    alert("新增失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
                });
        });
    }

    openEditBillModal(bill) {
        var self = this;
        const billId = bill.BillId;
        this.showModal("編輯帳單", this.getBillForm(bill), () => {
            const payload = self._readBillFormPayload();
            if (!payload.BillName || !payload.Frequency) {
                alert("請填寫帳單名稱與頻率規則");
                return;
            }
            $.ajax({
                url: `/api/finance/bills/${billId}`,
                type: "PUT",
                contentType: "application/json",
                data: JSON.stringify(payload),
            })
                .done(function () {
                    self.closeModal();
                    self.refreshBillListView();
                })
                .fail(function (xhr) {
                    alert("更新失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
                });
        });
    }

    confirmDeleteBill(bill) {
        var self = this;
        const billId = bill.BillId;
        const name = String(bill.BillName || "");
        this.showModal("刪除帳單", `<p>確定要刪除「${name}」嗎？此操作會將帳單停用（軟刪除），不影響已展開的每月支出估算歷史紀錄。</p>`, () => {
            $.ajax({ url: "/api/finance/bills/" + billId, type: "DELETE" })
                .done(function () {
                    self.closeModal();
                    self.refreshBillListView();
                })
                .fail(function (xhr) {
                    alert("刪除失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
                });
        });
    }

    // ---------- 帳戶總覽 ----------

    populateAccountMonths() {
        var self = this;
        return $.get("/api/finance/accounts/months").then(function (months) {
            if (!months.includes(self.state.accountSnapshotMonth)) {
                self.state.accountSnapshotMonth = months[0] || "";
            }
            const select = document.getElementById("accountSnapshotMonth");
            if (select) {
                select.innerHTML = months.map((m) => `<option value="${m}">${m}</option>`).join("");
                select.value = self.state.accountSnapshotMonth;
            }
            self.refreshCustomDropdown("accountSnapshotMonth");
        });
    }

    // 版本月份變更時：重新抓該月份的帳戶資料，分類設定沿用已快取的，不用重打分類 API
    refreshAccountUI() {
        var self = this;
        $("#account_balance").empty();
        this.load_data("accounts").then(function () {
            self.renderAccountListGrid();
        });
    }

    // 抓「使用者用過的分類清單」＋「每個帳戶目前的分類」，快取起來給篩選下拉跟表格分類欄位用
    loadAccountCategoryMap() {
        var self = this;
        return $.when($.get("/api/finance/account-categories"), $.get("/api/finance/account-categories/options")).then(function (mapRes, optionsRes) {
            var mappings = mapRes[0] || [];
            var options = optionsRes[0] || [];
            var map = {};
            mappings.forEach((m) => {
                map[m.OrganizationName + " " + m.AccountName] = m.Category || "";
            });
            self.state.accountCategoryMap = map;
            self.state.accountCategoryOptions = options;
            self.populateAccountCategoryFilter();
        });
    }

    populateAccountCategoryFilter() {
        const select = document.getElementById("accountCategoryFilterSelect");
        if (!select) return;
        const options = this.state.accountCategoryOptions || [];
        const current = this.state.accountCategoryFilter || "";

        const optHtml = ['<option value="">全部分類</option>'];
        options.forEach((c) => optHtml.push(`<option value="${c}">${c}</option>`));
        optHtml.push('<option value="__uncategorized__">未分類</option>');
        select.innerHTML = optHtml.join("");
        select.value = current === "__uncategorized__" || options.includes(current) ? current : "";
        this.state.accountCategoryFilter = select.value;
        this.refreshCustomDropdown("accountCategoryFilterSelect");
    }

    // 帳戶總覽表格：把帳戶餘額資料跟分類 join 起來、依篩選條件過濾，並算出篩選後的總計
    renderAccountListGrid() {
        var self = this;
        const map = this.state.accountCategoryMap || {};
        const filter = this.state.accountCategoryFilter || "";

        let rows = (this.data.account || []).map((a) => {
            const cat = map[a.OrganizationName + " " + a.AccountName] || "";
            return { ...a, Category: cat || "未分類" };
        });

        if (filter === "__uncategorized__") {
            rows = rows.filter((r) => !map[r.OrganizationName + " " + r.AccountName]);
        } else if (filter) {
            rows = rows.filter((r) => r.Category === filter);
        }

        $("#account_balance").empty();
        this.initGrids_by_viewId(rows, "account-list", "account_balance");

        const total = rows.reduce((s, r) => s + Number(r.AccountBalance || 0), 0);
        const totalEl = document.getElementById("accountListTotal");
        if (totalEl) {
            const label = filter ? `篩選後總計（${filter === "__uncategorized__" ? "未分類" : filter}）` : "總計";
            totalEl.textContent = `${label}：${self.formatCurrency(total)}（共 ${rows.length} 筆）`;
        }
    }

    openAccountBalanceModal(account) {
        if (!account) {
            return;
        }
        var self = this;
        const content = `
        <div style="display:flex; flex-direction:column; gap:16px;">
            <div style="color:#b0b0b0; font-size:13px;">
                ${account.OrganizationName || ""}｜${account.AccountName || ""}（版本月份：${account.YearMonth}）
            </div>
            <div>
                <label style="display:block; margin-bottom:8px; color:#b0b0b0;">目前結餘</label>
                <input type="number" id="editAccountBalance" value="${Number(account.AccountBalance || 0)}"
                       style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
            </div>
        </div>
    `;
        this.showModal("修改帳戶結餘", content, () => {
            const nextBalance = Number(document.getElementById("editAccountBalance")?.value || 0);
            $.ajax({
                url: "/api/finance/accounts/balance",
                type: "PUT",
                contentType: "application/json",
                data: JSON.stringify({
                    organizationName: account.OrganizationName,
                    accountName: account.AccountName,
                    currency: account.Currency,
                    month: account.YearMonth,
                    newBalance: nextBalance,
                }),
            })
                .done(function () {
                    self.closeModal();
                    self.refreshAccountUI();
                })
                .fail(function (xhr) {
                    alert("更新失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
                });
        });
    }

    // 「總覽 > 資產」頁面的「下月預估開支」：
    //   預估值 =（帳單管理中，下個月會發生的固定帳單合計）＋（近 3 個月變動支出中位數）
    //
    // 三個跟先前版本不同、討論過後決定的重點：
    // 1. 避免雙重計算：如果一筆交易明細的描述/類別/帳戶/備註對得上某張帳單的名稱，
    //    代表這筆支出「已經」被算在上面的固定帳單合計裡了，計算「變動支出」時要排除掉，
    //    不然會被算兩次、預估值虛高。比對邏輯比照專案管理「現金流關鍵字規則」的做法（Contains 比對）。
    // 2. 用「近 3 個月」而非「當年度全部月份」：對最近消費習慣有變化（換工作、開始存錢）的人反應更快，
    //    只抓「今天所在月份」之前的 3 個完整月份，資料不足 3 個月時就用現有的月份數。
    // 3. 用中位數而非平均值：不希望單一異常月份（繳稅、買大型家電）把預估值拉偏。
    //
    // 這裡沿用「每月支出」頁面已經在用的 computeMonthlyForecast（frequency_tool.js）算固定帳單，
    // 不另外在後端重寫一套頻率展開邏輯，避免兩邊算法不一致。
    renderExpenseForecast() {
        var self = this;
        var container = document.getElementById("expenseForecastGrid");
        if (!container) return;
        $(container).empty();

        var now = new Date();
        // 下個月（跨年時自動進位到隔年 1 月）
        var nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        var nextYear = nextMonthDate.getFullYear();
        var nextMonth = nextMonthDate.getMonth() + 1; // 1..12
        var nextMonthLabel = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
        var LOOKBACK_MONTHS = 3;

        // 呼叫端（switchView 的 "expense-forecast" case）已經先用
        // $.when(load_data("assets"), load_data("bills"), load_data("detail")) 備好資料，
        // 這裡直接讀 self.data，避免切到本頁籤時重複打一次 bills/detail API
        var bills = self.data.bills || [];
        var details = self.data.details || [];

        // --- 1. 下個月的固定帳單 ---
        var billRows = [];
        var billTotal = 0;
        try {
            var forecast = computeMonthlyForecast(bills, nextYear);
            var monthBreakdown = (forecast.breakdown || []).find((b) => b.month === nextMonth);
            (monthBreakdown ? monthBreakdown.items : []).forEach((item) => {
                billRows.push({
                    type: "固定帳單",
                    name: `${item.name}${item.count > 1 ? ` ×${item.count}` : ""}`,
                    note: item.billProject || "",
                    amount: Math.round(Number(item.subtotal) || 0),
                });
            });
            billTotal = billRows.reduce((s, r) => s + r.amount, 0);
        } catch (err) {
            // 帳單頻率字串若有無法解析的格式，不要讓整張卡片壞掉，只是這段估不出來
            console.warn("計算下月固定帳單失敗：", err);
        }

        // --- 2~3. 近 3 個月「變動支出」中位數：抽成 _computeRecentVariableExpenseMedian() 共用方法，
        // 「總覽 > 預估支出」的逐月圖表（_buildExpenseForecastChartData）也呼叫同一個方法，
        // 確保卡片跟圖表算出來的數字一致，不會有兩套算法各自飄移 ---
        var median = self._computeRecentVariableExpenseMedian(bills, details, now, LOOKBACK_MONTHS);
        var qualifyingMonths = median.qualifyingMonths;
        var variableByMonth = median.variableByMonth;
        var excludedByMonth = median.excludedByMonth;
        var medianVariable = median.medianVariable;

        // --- 4. 組出明細表格：固定帳單列 + 近 3 個月變動支出列（含已排除金額備註）+ 中位數列 + 合計 ---
        var rows = billRows.slice();
        qualifyingMonths.forEach((m) => {
            var excluded = Math.round(excludedByMonth[m] || 0);
            rows.push({
                type: "近期變動支出",
                name: `${m} 變動支出`,
                note: excluded ? `另有 NT$ ${excluded.toLocaleString()} 已算在固定帳單，不重複計` : "",
                amount: Math.round(variableByMonth[m] || 0),
            });
        });
        rows.push({
            type: "中位數",
            name: `近 ${qualifyingMonths.length} 個月變動支出中位數`,
            note: qualifyingMonths.length < LOOKBACK_MONTHS ? `資料不足 ${LOOKBACK_MONTHS} 個月，先以現有月份計算` : "",
            amount: medianVariable,
        });
        var total = billTotal + medianVariable;
        rows.push({ type: "＝ 合計 ＝", name: "", note: "", amount: total, _isTotal: true });

        var cols = [
            { field: "type", headerName: "類型", width: 120, minWidth: 110 },
            { field: "name", headerName: "項目", flex: 1.4, minWidth: 160 },
            { field: "note", headerName: "說明", flex: 1.4, minWidth: 180 },
            {
                field: "amount",
                headerName: "預估金額",
                width: 150,
                minWidth: 130,
                valueFormatter: (params) => "NT$ " + Math.round(Number(params.value || 0)).toLocaleString(),
                cellStyle: () => ({ color: "#ff8a80", fontWeight: "600" }),
            },
        ];

        self.createDetailGrid("expenseForecast", "expenseForecastGrid", cols, rows);

        // --- 5. 更新統計卡片與說明文字 ---
        var titleEl = document.getElementById("statForecastTitle");
        if (titleEl) {
            titleEl.textContent = `下月預估開支（${nextMonthLabel}）`;
        }
        var cardEl = document.getElementById("statForecast");
        if (cardEl) {
            cardEl.innerHTML = `
            <span>固定帳單 NT$ ${billTotal.toLocaleString()}</span>
            <span>變動支出中位數 NT$ ${medianVariable.toLocaleString()}</span>
            <span class="stat-amount">預估 NT$ ${total.toLocaleString()}</span>
            <p class="stat-description">${nextMonthLabel}（依近 ${qualifyingMonths.length} 個月變動支出估算）</p>
        `;
        }
        var noteEl = document.getElementById("forecastNote");
        if (noteEl) {
            noteEl.textContent =
                "預估值 =「帳單管理」中下個月會發生的固定帳單 ＋ 近 3 個月變動支出的中位數（已排除跟固定帳單名稱對得上的交易，避免重複計算；用中位數是為了不被單一異常大額支出的月份拉偏）。";
        }
    }

    // 共用：近 N 個月「變動支出」中位數計算（排除已對應到帳單管理固定帳單的交易，避免重複計算）。
    // 「總覽 > 預估支出」的下月預估開支卡片（renderExpenseForecast）與逐月實際/預估支出圖表
    // （_buildExpenseForecastChartData）都呼叫這個方法，確保兩處算出來的數字一致（沿用同一套邏輯，不重造輪子）。
    _computeRecentVariableExpenseMedian(bills, details, now, lookbackMonths) {
        lookbackMonths = lookbackMonths || 3;

        // 判斷一筆交易明細是不是「已經算在帳單管理的固定帳單裡」：比對邏輯比照專案管理「現金流關鍵字規則」的做法（Contains 比對）
        var billKeywords = [...new Set((bills || []).map((b) => String(b.BillName || "").trim()).filter(Boolean))].map((k) => k.toLowerCase());
        var matchesBillKeyword = (row) => {
            if (!billKeywords.length) return false;
            var haystack = [row.Description, row.Category, row.AccountName, row.OrganizationName, row.Tag, row.Notes]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return billKeywords.some((k) => haystack.includes(k));
        };

        var recentMonths = [];
        for (var i = 1; i <= lookbackMonths; i++) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            recentMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        }
        recentMonths.reverse(); // 由舊到新，方便閱讀

        var variableByMonth = {};
        var excludedByMonth = {};
        var monthsWithAnyData = new Set();
        (details || []).forEach((row) => {
            var ym = String(row.YearMonth || "").trim();
            if (!recentMonths.includes(ym)) return;
            monthsWithAnyData.add(ym);
            var amount = Number(row.Amount || 0);
            if (amount >= 0) return; // 只算支出
            if (matchesBillKeyword(row)) {
                excludedByMonth[ym] = (excludedByMonth[ym] || 0) + -amount;
                return; // 已經算在固定帳單裡，變動支出不重複計算
            }
            variableByMonth[ym] = (variableByMonth[ym] || 0) + -amount;
        });

        // 只取「真的有交易資料」的月份，避免把還沒匯入資料的月份當成 0 元月份
        var qualifyingMonths = recentMonths.filter((m) => monthsWithAnyData.has(m));
        var monthlyVariableAmounts = qualifyingMonths.map((m) => Math.round(variableByMonth[m] || 0));

        var median = (nums) => {
            if (!nums.length) return 0;
            var sorted = [...nums].sort((a, b) => a - b);
            var mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
        };

        return {
            medianVariable: median(monthlyVariableAmounts),
            qualifyingMonths: qualifyingMonths,
            variableByMonth: variableByMonth,
            excludedByMonth: excludedByMonth,
        };
    }

    // 「總覽 > 預估支出」上方圖表用的資料：今年 1~12 月，
    // 已經完整過完的月份畫「實際支出」（取 /api/finance/overview 已經算好的每月 Expense），
    // 本月（還在進行中，交易資料不完整、不能當實際值）與之後月份畫「預估支出」，
    // 預估值＝該月固定帳單金額（computeMonthlyForecast）＋近 3 個月變動支出中位數
    // （跟「下月預估開支」卡片共用同一個 _computeRecentVariableExpenseMedian，兩邊數字才會一致）。
    //
    // 「預估」線在本月的前一個月（最後一個有實際值的月份）多放一個跟「實際」線相同的數值當銜接點，
    // 純粹是讓兩條線在圖上視覺連續、不要斷開一截，不代表那個月被當成預估值。
    _buildExpenseForecastChartData() {
        var self = this;
        var now = new Date();
        var year = now.getFullYear();
        var currentMonthIndex = now.getMonth(); // 0..11，本月(含)之後都視為預估
        var lastActualIndex = currentMonthIndex - 1;

        var assets = self.data.assets || [];
        var bills = self.data.bills || [];
        var details = self.data.details || [];

        var actualByMonth = {};
        assets
            .filter((x) => x.Type === "Expense")
            .forEach((x) => {
                actualByMonth[x.YearMonth] = Math.round(Number(x.total) || 0);
            });

        var monthlyForecastTotals = computeMonthlyForecast(bills, year).monthlyTotals;
        var medianVariable = self._computeRecentVariableExpenseMedian(bills, details, now, 3).medianVariable;

        var actualData = [];
        var forecastData = [];
        for (var m = 0; m < 12; m++) {
            var ym = `${year}-${String(m + 1).padStart(2, "0")}`;
            var actualValue = actualByMonth[ym] != null ? actualByMonth[ym] : null;

            actualData.push(m < currentMonthIndex ? actualValue : null);

            if (m > lastActualIndex) {
                forecastData.push(Math.round(monthlyForecastTotals[m] || 0) + medianVariable);
            } else if (m === lastActualIndex) {
                forecastData.push(actualValue); // 銜接點：跟「實際支出」同一格同一個值，圖上兩條線才不會斷開
            } else {
                forecastData.push(null);
            }
        }

        return { actual: actualData, forecast: forecastData, year: year };
    }

    // ---------- 設定：帳戶分類 ----------

    // 帳戶分類頁面：把使用者所有帳戶（去重）跟目前的分類設定一起顯示，
    // 分類欄位是一個下拉選單，選項＝之前用過的分類＋「➕ 新增分類...」
    renderAccountCategoryGrid() {
        var self = this;
        $("#account_category_grid").empty();
        $.when($.get("/api/finance/account-categories"), $.get("/api/finance/account-categories/options")).then(function (accountsRes, optionsRes) {
            var accounts = accountsRes[0] || [];
            var options = optionsRes[0] || [];
            self.state.accountCategoryOptions = options;

            var cols = [
                { field: "OrganizationName", headerName: "銀行", flex: 1, minWidth: 120 },
                { field: "AccountName", headerName: "帳戶", flex: 1, minWidth: 120 },
                {
                    field: "Category",
                    headerName: "分類",
                    width: 180,
                    minWidth: 160,
                    cellRenderer: (params) => self._accountCategoryCellRenderer(params),
                },
            ];

            self.createDetailGrid("accountCategoryGrid", "account_category_grid", cols, accounts);
        });
    }

    _accountCategoryCellRenderer(params) {
        var self = this;
        const row = params.data;
        const current = row.Category || "";
        const NEW_OPTION = "__new__";

        const select = document.createElement("select");
        select.style.width = "100%";
        select.style.minHeight = "30px";
        select.style.padding = "2px 6px";
        select.style.borderRadius = "4px";
        select.style.border = "1px solid #424242";
        select.style.backgroundColor = "#2a2a2a";
        select.style.color = "#ffffff";

        const optionValues = [...self.state.accountCategoryOptions];
        if (current && !optionValues.includes(current)) {
            optionValues.push(current);
        }
        optionValues.sort((a, b) => a.localeCompare(b, "zh-Hant"));

        const emptyOpt = document.createElement("option");
        emptyOpt.value = "";
        emptyOpt.textContent = "未分類";
        select.appendChild(emptyOpt);

        optionValues.forEach((opt) => {
            const optionEl = document.createElement("option");
            optionEl.value = opt;
            optionEl.textContent = opt;
            select.appendChild(optionEl);
        });

        const newOpt = document.createElement("option");
        newOpt.value = NEW_OPTION;
        newOpt.textContent = "➕ 新增分類...";
        select.appendChild(newOpt);

        select.value = current;

        // 點選單本身不該觸發 ag-Grid 的 row click（這裡沒有綁 row click，但保留跟排除按鈕一致的防呆習慣）
        select.addEventListener("click", (event) => event.stopPropagation());
        select.addEventListener("change", (event) => {
            event.stopPropagation();
            const value = select.value;
            if (value === NEW_OPTION) {
                select.value = current; // 先還原顯示，等使用者在 modal 完成輸入或取消
                self.openNewAccountCategoryModal(row);
                return;
            }
            self.saveAccountCategory(row.OrganizationName, row.AccountName, value);
        });

        return select;
    }

    openNewAccountCategoryModal(row) {
        var self = this;
        const content = `
        <div style="display:flex; flex-direction:column; gap:16px;">
            <div style="color:#b0b0b0; font-size:13px;">
                ${row.OrganizationName || ""}｜${row.AccountName || ""}
            </div>
            <div>
                <label style="display:block; margin-bottom:8px; color:#b0b0b0;">新分類名稱</label>
                <input type="text" id="newAccountCategoryName" maxlength="50" placeholder="例如：資產"
                       style="width:100%; padding:12px; background-color:#2a2a2a; border:1px solid #757575; border-radius:8px; color:#fff; font-size:14px;">
            </div>
        </div>
    `;
        this.showModal("新增分類", content, () => {
            const name = String(document.getElementById("newAccountCategoryName")?.value || "").trim();
            if (!name) {
                alert("請輸入分類名稱");
                return;
            }
            self.closeModal();
            self.saveAccountCategory(row.OrganizationName, row.AccountName, name);
        });
    }

    saveAccountCategory(organizationName, accountName, category) {
        var self = this;
        return $.ajax({
            url: "/api/finance/account-categories",
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify({ organizationName, accountName, category }),
        })
            .done(function () {
                self.renderAccountCategoryGrid();
            })
            .fail(function (xhr) {
                alert("更新分類失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
            });
    }

    // ==================== 自動分類規則 ====================
    // 依機構/帳戶/分類/標籤/描述/備註/金額比對明細，命中後自動改寫分類、標籤、備註與排除旗標。
    // 規則卡片可單獨開關/編輯/刪除/執行，編輯彈窗會即時打預覽 API 顯示目前會命中哪些明細。

    // 可比對的明細欄位（value 必須跟後端 FinanceAutoRuleEngine 認得的欄位名一致）
    static get AUTO_RULE_FIELDS() {
        return [
            { value: "description", label: "明細描述" },
            { value: "organizationName", label: "機構名稱" },
            { value: "accountName", label: "帳戶名稱" },
            { value: "category", label: "分類" },
            { value: "tag", label: "標籤" },
            { value: "notes", label: "備註" },
            { value: "amount", label: "金額" },
        ];
    }

    static get AUTO_RULE_TEXT_OPERATORS() {
        return [
            { value: "contains", label: "包含" },
            { value: "notContains", label: "不包含" },
            { value: "equals", label: "等於" },
            { value: "startsWith", label: "開頭為" },
            { value: "isEmpty", label: "為空白" },
            { value: "isNotEmpty", label: "不為空白" },
        ];
    }

    static get AUTO_RULE_AMOUNT_OPERATORS() {
        return [
            { value: "gt", label: "大於" },
            { value: "gte", label: "大於等於" },
            { value: "lt", label: "小於" },
            { value: "lte", label: "小於等於" },
            { value: "between", label: "介於" },
            { value: "isIncome", label: "為收入" },
            { value: "isExpense", label: "為支出" },
        ];
    }

    // 這幾個運算子語意上就不需要比對值，UI 要把值欄位藏起來，後端驗證也放行空值
    static get AUTO_RULE_VALUELESS_OPERATORS() {
        return ["isEmpty", "isNotEmpty", "isIncome", "isExpense"];
    }

    _autoRuleFieldLabel(field) {
        return (FinanceApp.AUTO_RULE_FIELDS.find((f) => f.value === field) || {}).label || field;
    }

    _autoRuleOperatorLabel(field, operator) {
        const list = field === "amount" ? FinanceApp.AUTO_RULE_AMOUNT_OPERATORS : FinanceApp.AUTO_RULE_TEXT_OPERATORS;
        return (list.find((o) => o.value === operator) || {}).label || operator;
    }

    _autoRuleModeLabel(mode) {
        if (mode === "fillEmpty") return "僅空白時填入";
        if (mode === "append") return "附加";
        return "覆寫";
    }

    renderAutoRuleList() {
        var self = this;
        const list = document.getElementById("autoRuleList");
        if (!list) {
            return;
        }
        list.innerHTML = '<div class="ar-empty">載入中…</div>';

        return $.get("/api/finance/auto-rules")
            .done(function (rules) {
                self.state.autoRules = rules || [];
                self._renderAutoRuleCards();
            })
            .fail(function (xhr) {
                list.innerHTML = `<div class="ar-empty">規則載入失敗：${self._escapeHtml(xhr.responseJSON?.message || "請洽系統管理員")}</div>`;
            });
    }

    _renderAutoRuleCards() {
        var self = this;
        const list = document.getElementById("autoRuleList");
        if (!list) {
            return;
        }
        const rules = this.state.autoRules || [];

        $("#arRuleCount").text("規則數：" + rules.length);
        $("#arEnabledCount").text("啟用中：" + rules.filter((r) => r.IsEnabled).length);

        if (rules.length === 0) {
            list.innerHTML = '<div class="ar-empty">尚未建立任何規則。按「新增規則」開始，例如「明細描述 包含 星巴克 → 分類設為 餐飲」。</div>';
            return;
        }

        list.innerHTML = rules
            .map((rule, index) => {
                const conditionText = (rule.Conditions || [])
                    .map((c) => {
                        const field = self._escapeHtml(self._autoRuleFieldLabel(c.Field));
                        const op = self._escapeHtml(self._autoRuleOperatorLabel(c.Field, c.Operator));
                        if (FinanceApp.AUTO_RULE_VALUELESS_OPERATORS.includes(c.Operator)) {
                            return `<span class="ar-cond">${field} ${op}</span>`;
                        }
                        const value = c.Operator === "between"
                            ? `${self._escapeHtml(c.Value || "")} ~ ${self._escapeHtml(c.Value2 || "")}`
                            : self._escapeHtml(c.Value || "");
                        return `<span class="ar-cond">${field} ${op} <b>${value}</b></span>`;
                    })
                    .join('<span class="ar-and">且</span>');

                const actions = [];
                if (rule.ActionCategory) actions.push(`分類 → <b>${self._escapeHtml(rule.ActionCategory)}</b>（${self._autoRuleModeLabel(rule.ActionCategoryMode)}）`);
                if (rule.ActionTag) actions.push(`標籤 → <b>${self._escapeHtml(rule.ActionTag)}</b>（${self._autoRuleModeLabel(rule.ActionTagMode)}）`);
                if (rule.ActionNotes) actions.push(`備註 → <b>${self._escapeHtml(rule.ActionNotes)}</b>（${self._autoRuleModeLabel(rule.ActionNotesMode)}）`);
                if (rule.ActionIsExcluded === true) actions.push("設為<b>排除</b>");
                if (rule.ActionIsExcluded === false) actions.push("設為<b>不排除</b>");
                if (rule.ActionActivate === false) actions.push('<b class="ar-danger-text">停用明細</b>');
                if (rule.ActionActivate === true) actions.push("<b>還原啟用</b>");

                // LastRunAt 是 "2026-08-17T21:30:00" 這種 ISO 字串，取到分鐘就夠了。
                // 沒執行過就整行不顯示（比印一行「尚未執行過」乾淨，卡片也少一行雜訊）
                const lastRun = rule.LastRunAt
                    ? `<div class="ar-line ar-line-muted">最後執行：${self._escapeHtml(String(rule.LastRunAt).replace("T", " ").slice(0, 16))}</div>`
                    : "";

                return `
                <div class="ar-card ${rule.IsEnabled ? "" : "ar-card-disabled"}" data-rule-id="${rule.RuleId}">
                    <div class="ar-card-head">
                        <div class="ar-card-title-row">
                            <span class="ar-order">${index + 1}</span>
                            <span class="ar-name">${self._escapeHtml(rule.RuleName)}</span>
                            <span class="ar-status ${rule.IsEnabled ? "ar-status-on" : "ar-status-off"}">${rule.IsEnabled ? "啟用中" : "已停用"}</span>
                        </div>
                        <div class="ar-card-actions">
                            <button class="btn-secondary" data-ar-action="move-up" title="往前移（越前面越先執行）">▲</button>
                            <button class="btn-secondary" data-ar-action="move-down" title="往後移（同欄位由順序在後的規則決定最終值）">▼</button>
                            <button class="btn-secondary" data-ar-action="toggle">${rule.IsEnabled ? "停用" : "啟用"}</button>
                            <button class="btn-secondary" data-ar-action="run">執行</button>
                            <button class="btn-secondary" data-ar-action="edit">編輯</button>
                            <button class="btn-danger" data-ar-action="delete">刪除</button>
                        </div>
                    </div>
                    <div class="ar-card-body">
                        <div class="ar-line"><span class="ar-line-label">條件</span><span class="ar-line-value">${conditionText || "（無條件）"}</span></div>
                        <div class="ar-line"><span class="ar-line-label">動作</span><span class="ar-line-value">${actions.join("、") || "（無動作）"}</span></div>
                        ${lastRun}
                    </div>
                </div>`;
            })
            .join("");

        list.querySelectorAll("[data-ar-action]").forEach((btn) => {
            btn.addEventListener("click", (event) => {
                event.stopPropagation();
                const ruleId = Number(btn.closest(".ar-card")?.dataset.ruleId);
                const rule = (self.state.autoRules || []).find((r) => r.RuleId === ruleId);
                if (!rule) return;
                switch (btn.dataset.arAction) {
                    case "toggle": self.toggleAutoRule(rule); break;
                    case "run": self.runAutoRule(rule); break;
                    case "edit": self.openAutoRuleModal(rule); break;
                    case "delete": self.deleteAutoRule(rule); break;
                    case "move-up": self.moveAutoRule(rule, -1); break;
                    case "move-down": self.moveAutoRule(rule, 1); break;
                }
            });
        });
    }

    toggleAutoRule(rule) {
        var self = this;
        $.post(`/api/finance/auto-rules/${rule.RuleId}/toggle`)
            .done(function () {
                self.renderAutoRuleList();
            })
            .fail(function (xhr) {
                alert("切換失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
            });
    }

    deleteAutoRule(rule) {
        var self = this;
        this.showModal(
            "刪除規則",
            `<p>確定要刪除「${this._escapeHtml(rule.RuleName)}」嗎？</p>
             <p class="pd-muted">刪除只會停用這條規則，<b>不會回溯撤銷</b>它先前已經寫到明細上的分類／標籤／備註／排除設定——那些值已經是明細本身的資料，要改請直接編輯明細。</p>`,
            () => {
                $.ajax({ url: `/api/finance/auto-rules/${rule.RuleId}`, type: "DELETE" })
                    .done(function () {
                        self.closeModal();
                        self.renderAutoRuleList();
                    })
                    .fail(function (xhr) {
                        alert("刪除失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
                    });
            }
        );
    }

    // 上/下移只改本地順序後整批送出，避免每按一次就要處理兩條規則的 priority 交換
    moveAutoRule(rule, offset) {
        var self = this;
        const rules = [...(this.state.autoRules || [])];
        const from = rules.findIndex((r) => r.RuleId === rule.RuleId);
        const to = from + offset;
        if (from < 0 || to < 0 || to >= rules.length) {
            return;
        }
        rules.splice(to, 0, rules.splice(from, 1)[0]);
        this.state.autoRules = rules;
        this._renderAutoRuleCards();

        $.ajax({
            url: "/api/finance/auto-rules/reorder",
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify({ ruleIds: rules.map((r) => r.RuleId) }),
        }).fail(function (xhr) {
            alert("調整順序失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
            self.renderAutoRuleList();
        });
    }

    runAutoRule(rule) {
        var self = this;
        $.post(`/api/finance/auto-rules/${rule.RuleId}/run`)
            .done(function (res) {
                self.showModal("執行完成", `<p>${self._escapeHtml(res.message || "已執行")}</p>`, () => self.closeModal());
                self.renderAutoRuleList();
            })
            .fail(function (xhr) {
                alert("執行失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
            });
    }

    runAllAutoRules() {
        var self = this;
        this.showModal(
            "執行全部規則",
            `<p>將對<b>所有</b>交易明細，依序執行目前啟用中的規則。</p>
             <p class="pd-muted">同一個欄位若被多條規則命中，順序在後的規則會覆蓋前面的結果；設為「僅空白時填入」的動作不會蓋掉你手動改過的值。</p>`,
            () => {
                self.closeModal();
                $.post("/api/finance/auto-rules/run-all")
                    .done(function (res) {
                        self.showModal("執行完成", `<p>${self._escapeHtml(res.message || "已執行")}</p>`, () => self.closeModal());
                        self.renderAutoRuleList();
                    })
                    .fail(function (xhr) {
                        alert("執行失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
                    });
            },
            { confirmText: "開始執行" }
        );
    }

    // ---------- 規則編輯彈窗（含即時預覽） ----------

    openAutoRuleModal(rule) {
        var self = this;
        const isEdit = Boolean(rule);
        // 編輯中的條件放在 state，因為條件列會動態增減，直接讀 DOM 容易跟畫面對不起來
        this.state.autoRuleDraft = {
            conditions: isEdit && (rule.Conditions || []).length > 0
                ? rule.Conditions.map((c) => ({ field: c.Field, operator: c.Operator, value: c.Value || "", value2: c.Value2 || "" }))
                : [{ field: "description", operator: "contains", value: "", value2: "" }],
        };

        const esc = (v) => this._escapeHtml(v || "");
        const content = `
        <div class="ar-form">
            <div class="ar-form-row">
                <label class="ar-form-label">規則名稱</label>
                <input type="text" id="arRuleName" maxlength="100" placeholder="例如：餐飲自動歸類" value="${esc(rule?.RuleName)}" />
            </div>

            <div class="ar-form-section">
                <div class="ar-form-section-head">
                    <span>條件（全部符合才會命中）</span>
                    <button type="button" class="btn-secondary" id="arAddCondition">新增條件</button>
                </div>
                <div id="arConditionList" class="ar-condition-list"></div>
                <p class="pd-muted">文字條件的比對值可用半形逗號分隔多個值，同一列之間視為「或」，例如：<code>星巴克,路易莎</code>。金額條件一律以絕對值比較（支出在資料庫是負數，這樣「金額大於 1000」才符合直覺）。</p>
            </div>

            <div class="ar-form-section">
                <div class="ar-form-section-head"><span>命中後要做的事（留白表示不動該欄位）</span></div>
                <div class="ar-action-row">
                    <label class="ar-form-label">分類</label>
                    <input type="text" id="arActionCategory" maxlength="50" placeholder="例如：餐飲" value="${esc(rule?.ActionCategory)}" />
                    <select id="arActionCategoryMode">
                        <option value="overwrite">覆寫</option>
                        <option value="fillEmpty">僅空白時填入</option>
                    </select>
                </div>
                <div class="ar-action-row">
                    <label class="ar-form-label">標籤</label>
                    <input type="text" id="arActionTag" maxlength="50" placeholder="例如：日常" value="${esc(rule?.ActionTag)}" />
                    <select id="arActionTagMode">
                        <option value="overwrite">覆寫</option>
                        <option value="fillEmpty">僅空白時填入</option>
                        <option value="append">附加（保留原標籤）</option>
                    </select>
                </div>
                <div class="ar-action-row">
                    <label class="ar-form-label">備註</label>
                    <input type="text" id="arActionNotes" maxlength="255" placeholder="例如：訂閱制" value="${esc(rule?.ActionNotes)}" />
                    <select id="arActionNotesMode">
                        <option value="overwrite">覆寫</option>
                        <option value="fillEmpty">僅空白時填入</option>
                        <option value="append">附加（保留原備註）</option>
                    </select>
                </div>
                <div class="ar-action-row">
                    <label class="ar-form-label">排除</label>
                    <select id="arActionIsExcluded" class="ar-action-wide">
                        <option value="">不變更</option>
                        <option value="true">設為排除（不計入報表，明細仍看得到）</option>
                        <option value="false">設為不排除</option>
                    </select>
                </div>
                <div class="ar-action-row">
                    <label class="ar-form-label">停用</label>
                    <select id="arActionActivate" class="ar-action-wide">
                        <option value="">不變更</option>
                        <option value="false">停用明細（軟刪除，所有頁面都不再顯示）</option>
                        <option value="true">還原啟用</option>
                    </select>
                </div>
                <p class="pd-muted">「排除」只是不計入報表，明細清單仍看得到；「停用」等同舊 SP 的 <code>set Activate=0</code>，明細會從所有查詢消失，適合重複扣款、帳戶互轉這種根本不該出現在帳上的列。</p>
            </div>

            <div class="ar-form-section">
                <div class="ar-form-section-head">
                    <span>即時預覽</span>
                    <span class="pd-chip" id="arPreviewCount">命中：-</span>
                </div>
                <div id="arPreviewTable" class="ar-preview"></div>
            </div>
        </div>`;

        this.showModal(isEdit ? "編輯規則" : "新增規則", content, () => self.saveAutoRule(rule), {
            wide: true,
            confirmText: "儲存",
        });

        // 動作的模式下拉要在 innerHTML 塞完之後才設得到值
        document.getElementById("arActionCategoryMode").value = rule?.ActionCategoryMode || "overwrite";
        document.getElementById("arActionTagMode").value = rule?.ActionTagMode || "overwrite";
        document.getElementById("arActionNotesMode").value = rule?.ActionNotesMode || "overwrite";
        document.getElementById("arActionIsExcluded").value =
            rule?.ActionIsExcluded === true ? "true" : rule?.ActionIsExcluded === false ? "false" : "";
        document.getElementById("arActionActivate").value =
            rule?.ActionActivate === true ? "true" : rule?.ActionActivate === false ? "false" : "";

        document.getElementById("arAddCondition").addEventListener("click", () => {
            self.state.autoRuleDraft.conditions.push({ field: "description", operator: "contains", value: "", value2: "" });
            self._renderAutoRuleConditions();
        });

        this._renderAutoRuleConditions();
    }

    _renderAutoRuleConditions() {
        var self = this;
        const wrap = document.getElementById("arConditionList");
        if (!wrap) {
            return;
        }
        const conditions = this.state.autoRuleDraft?.conditions || [];

        wrap.innerHTML = conditions
            .map((c, i) => {
                const ops = c.field === "amount" ? FinanceApp.AUTO_RULE_AMOUNT_OPERATORS : FinanceApp.AUTO_RULE_TEXT_OPERATORS;
                const needsValue = !FinanceApp.AUTO_RULE_VALUELESS_OPERATORS.includes(c.operator);
                const needsValue2 = c.operator === "between";
                const isAmount = c.field === "amount";
                return `
                <div class="ar-condition" data-ar-cond-index="${i}">
                    ${i > 0 ? '<span class="ar-and-badge">且</span>' : '<span class="ar-and-badge ar-and-badge-first">若</span>'}
                    <select data-ar-cond="field">
                        ${FinanceApp.AUTO_RULE_FIELDS.map((f) => `<option value="${f.value}" ${f.value === c.field ? "selected" : ""}>${f.label}</option>`).join("")}
                    </select>
                    <select data-ar-cond="operator">
                        ${ops.map((o) => `<option value="${o.value}" ${o.value === c.operator ? "selected" : ""}>${o.label}</option>`).join("")}
                    </select>
                    ${needsValue
                        ? `<input type="${isAmount ? "number" : "text"}" data-ar-cond="value" value="${self._escapeHtml(c.value)}" placeholder="${isAmount ? "數值" : "比對值（可用逗號分隔多值）"}" />`
                        : '<span class="ar-cond-novalue">不需填值</span>'}
                    ${needsValue2 ? `<input type="number" data-ar-cond="value2" value="${self._escapeHtml(c.value2)}" placeholder="上限" />` : ""}
                    <button type="button" class="btn-danger" data-ar-cond-remove="${i}" ${conditions.length <= 1 ? "disabled" : ""}>移除</button>
                </div>`;
            })
            .join("");

        wrap.querySelectorAll("[data-ar-cond]").forEach((el) => {
            const index = Number(el.closest("[data-ar-cond-index]").dataset.arCondIndex);
            const key = el.dataset.arCond;
            const handler = () => {
                const cond = self.state.autoRuleDraft.conditions[index];
                cond[key] = el.value;
                if (key === "field") {
                    // 文字欄位跟金額欄位的運算子清單完全不同，換欄位就要把運算子重設成該類型的預設值
                    cond.operator = el.value === "amount" ? "gt" : "contains";
                    cond.value = "";
                    cond.value2 = "";
                }
                if (key === "field" || key === "operator") {
                    self._renderAutoRuleConditions();
                }
                self._schedulePreview();
            };
            // 下拉改完就要立刻重畫（值欄位可能要跟著出現/消失），文字輸入則用 input 事件配合 debounce
            el.addEventListener(el.tagName === "SELECT" ? "change" : "input", handler);
        });

        wrap.querySelectorAll("[data-ar-cond-remove]").forEach((btn) => {
            btn.addEventListener("click", () => {
                self.state.autoRuleDraft.conditions.splice(Number(btn.dataset.arCondRemove), 1);
                self._renderAutoRuleConditions();
                self._schedulePreview();
            });
        });

        this._schedulePreview();
    }

    // 每次改條件都打一次 API 會太吵，統一延遲 300ms 再送，且只採用最後一次請求的結果
    _schedulePreview() {
        var self = this;
        clearTimeout(this._autoRulePreviewTimer);
        this._autoRulePreviewTimer = setTimeout(() => self._refreshAutoRulePreview(), 300);
    }

    _refreshAutoRulePreview() {
        var self = this;
        const table = document.getElementById("arPreviewTable");
        if (!table) {
            return;
        }
        const conditions = this._collectAutoRuleConditions();
        // 條件還沒填完整就先不打 API，免得畫面一直閃「命中 0 筆」造成誤會
        const ready = conditions.length > 0 && conditions.every((c) => {
            if (FinanceApp.AUTO_RULE_VALUELESS_OPERATORS.includes(c.operator)) return true;
            if (c.operator === "between") return String(c.value).trim() !== "" && String(c.value2).trim() !== "";
            return String(c.value).trim() !== "";
        });
        if (!ready) {
            $("#arPreviewCount").text("命中：-");
            table.innerHTML = '<div class="ar-empty">把條件填完整後，這裡會即時列出符合的明細。</div>';
            return;
        }

        const token = (this._autoRulePreviewToken = (this._autoRulePreviewToken || 0) + 1);
        $.ajax({
            url: "/api/finance/auto-rules/preview",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ conditions }),
        })
            .done(function (res) {
                // 慢回來的舊請求不能蓋掉新結果
                if (token !== self._autoRulePreviewToken) return;
                self._renderAutoRulePreview(res);
            })
            .fail(function (xhr) {
                if (token !== self._autoRulePreviewToken) return;
                $("#arPreviewCount").text("命中：-");
                table.innerHTML = `<div class="ar-empty">預覽失敗：${self._escapeHtml(xhr.responseJSON?.message || "請洽系統管理員")}</div>`;
            });
    }

    _renderAutoRulePreview(res) {
        var self = this;
        const table = document.getElementById("arPreviewTable");
        if (!table) {
            return;
        }
        const rows = res?.matched || [];
        const total = res?.totalCount || 0;
        $("#arPreviewCount").text("命中：" + total + " 筆" + (res?.truncated ? `（僅列出前 ${rows.length} 筆）` : ""));

        if (rows.length === 0) {
            table.innerHTML = '<div class="ar-empty">目前沒有明細符合這組條件。</div>';
            return;
        }

        // 預覽用純表格而不是 ag-Grid：表格是塞在彈窗裡、每次改條件都重畫，
        // 用 ag-Grid 得處理實例的建立/銷毀生命週期，純表格單純且在手機上也好捲
        table.innerHTML = `
        <table class="ar-preview-table">
            <thead>
                <tr><th>日期</th><th>帳戶</th><th>描述</th><th>分類</th><th>標籤</th><th class="ar-num">金額</th></tr>
            </thead>
            <tbody>
                ${rows.map((r) => `
                <tr class="${r.IsExcluded || r.IsInactive ? "ar-preview-excluded" : ""}">
                    <td>${self._escapeHtml(self.formatDate(r.TransactionDate))}</td>
                    <td>${self._escapeHtml(r.AccountName)}</td>
                    <td>${r.IsInactive ? '<span class="ar-tag-inactive">已停用</span> ' : ""}${self._escapeHtml(r.Description)}</td>
                    <td>${self._escapeHtml(r.Category)}</td>
                    <td>${self._escapeHtml(r.Tag)}</td>
                    <td class="ar-num" style="color:${Number(r.Amount) < 0 ? "#ef5350" : "#66bb6a"}">${self._escapeHtml(self.formatCurrency(r.Amount))}</td>
                </tr>`).join("")}
            </tbody>
        </table>`;
    }

    _collectAutoRuleConditions() {
        return (this.state.autoRuleDraft?.conditions || []).map((c) => ({
            field: c.field,
            operator: c.operator,
            value: FinanceApp.AUTO_RULE_VALUELESS_OPERATORS.includes(c.operator) ? null : String(c.value ?? "").trim(),
            value2: c.operator === "between" ? String(c.value2 ?? "").trim() : null,
        }));
    }

    saveAutoRule(rule) {
        var self = this;
        const name = String(document.getElementById("arRuleName")?.value || "").trim();
        if (!name) {
            alert("請輸入規則名稱");
            return;
        }

        const isExcludedRaw = document.getElementById("arActionIsExcluded").value;
        const activateRaw = document.getElementById("arActionActivate").value;
        const payload = {
            ruleName: name,
            isEnabled: rule ? rule.IsEnabled : true,
            conditions: this._collectAutoRuleConditions(),
            actionCategory: String(document.getElementById("arActionCategory").value || "").trim() || null,
            actionCategoryMode: document.getElementById("arActionCategoryMode").value,
            actionTag: String(document.getElementById("arActionTag").value || "").trim() || null,
            actionTagMode: document.getElementById("arActionTagMode").value,
            actionNotes: String(document.getElementById("arActionNotes").value || "").trim() || null,
            actionNotesMode: document.getElementById("arActionNotesMode").value,
            actionIsExcluded: isExcludedRaw === "" ? null : isExcludedRaw === "true",
            actionActivate: activateRaw === "" ? null : activateRaw === "true",
        };

        $.ajax({
            url: rule ? `/api/finance/auto-rules/${rule.RuleId}` : "/api/finance/auto-rules",
            type: rule ? "PUT" : "POST",
            contentType: "application/json",
            data: JSON.stringify(payload),
        })
            .done(function () {
                self.closeModal();
                self.renderAutoRuleList();
            })
            .fail(function (xhr) {
                alert("儲存失敗：" + (xhr.responseJSON?.message || "請洽系統管理員"));
            });
    }

    _escapeHtml(value) {
        if (value === null || value === undefined) return "";
        return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    }

    // ---------- 通用表單 ----------

    getTransactionForm() {
        return `
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 8px; color: #b0b0b0;">日期</label>
                    <input type="date" id="transactionDate"
                           style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 8px; color: #b0b0b0;">描述</label>
                    <input type="text" id="transactionDescription" placeholder="請輸入描述"
                           style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 8px; color: #b0b0b0;">金額</label>
                    <input type="number" id="transactionAmount" placeholder="收入為正數,支出為負數"
                           style="width: 100%; padding: 12px; background-color: #2a2a2a; border: 1px solid #757575; border-radius: 8px; color: #ffffff; font-size: 14px;">
                </div>
            </div>
        `;
    }
}

// 當 DOM 載入完成後初始化應用程式
document.addEventListener("DOMContentLoaded", () => {
    window.app = new FinanceApp();
});