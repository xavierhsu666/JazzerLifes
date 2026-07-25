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
                { field: "TransactionDate", headerName: "日期", width: 120, sort: "desc" },
                { field: "Category", headerName: "類別", width: 130 },
                { field: "OrganizationName", headerName: "銀行", width: 100, mobileHide: true },
                { field: "AccountName", headerName: "帳戶", width: 100, mobileHide: true },
                { field: "Description", headerName: "描述", width: 200, flex: 1 },
                {
                    field: "Amount",
                    headerName: "金額",
                    width: 120,
                    valueFormatter: (params) => this.formatCurrency(params.value),
                    cellStyle: (params) => this.getCellStyle(params.value),
                },
                { field: "Tag", headerName: "標註", width: 150, mobileHide: true },
                { field: "Notes", headerName: "筆記", width: 150, mobileHide: true },
                {
                    field: "_exclude",
                    headerName: "操作",
                    width: 120,
                    minWidth: 120,
                    pinned: "right",
                    sortable: false,
                    filter: false,
                    editable: false,
                    cellRenderer: (params) => this._excludeCellRenderer(params),
                },
            ],
            "transaction-expense-details": [
                { field: "YearMonth", headerName: "年月", width: 120, sort: "desc", filter: "agSetColumnFilter", mobileHide: true },
                { field: "TransactionDate", headerName: "日期", width: 120, sort: "desc" },
                { field: "Category", headerName: "類別", width: 130 },
                { field: "OrganizationName", headerName: "銀行", width: 100, mobileHide: true },
                { field: "AccountName", headerName: "帳戶", width: 100, mobileHide: true },
                { field: "Description", headerName: "描述", width: 200, flex: 1 },
                {
                    field: "Amount",
                    headerName: "金額",
                    width: 120,
                    valueFormatter: (params) => this.formatCurrency(params.value),
                    cellStyle: (params) => this.getCellStyle(params.value),
                },
                { field: "Tag", headerName: "標註", width: 150, mobileHide: true },
                { field: "Notes", headerName: "筆記", width: 150, mobileHide: true },
                {
                    field: "_exclude",
                    headerName: "操作",
                    width: 120,
                    minWidth: 120,
                    pinned: "right",
                    sortable: false,
                    filter: false,
                    editable: false,
                    cellRenderer: (params) => this._excludeCellRenderer(params),
                },
            ],
            "transaction-details": [
                { field: "YearMonth", headerName: "年月", width: 120, sort: "desc", filter: "agSetColumnFilter", mobileHide: true },
                { field: "TransactionDate", headerName: "日期", width: 120, sort: "desc" },
                { field: "Category", headerName: "類別", width: 130 },
                { field: "OrganizationName", headerName: "銀行", width: 100, mobileHide: true },
                { field: "AccountName", headerName: "帳戶", width: 100, mobileHide: true },
                { field: "Description", headerName: "描述", width: 200, flex: 1 },
                {
                    field: "Amount",
                    headerName: "金額",
                    width: 120,
                    valueFormatter: (params) => this.formatCurrency(params.value),
                    cellStyle: (params) => this.getCellStyle(params.value),
                },
                { field: "Tag", headerName: "標註", width: 150, mobileHide: true },
                { field: "Notes", headerName: "筆記", width: 150, mobileHide: true },
                {
                    field: "_exclude",
                    headerName: "操作",
                    width: 120,
                    minWidth: 120,
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
                    field: "BillBudget",
                    headerName: "預算",
                    flex: 1.2,
                    minWidth: 130,
                    valueFormatter: (params) => "NT$" + Math.round(Number(params.value || 0)).toLocaleString(),
                },
                {
                    field: "Net",
                    headerName: "淨收支",
                    flex: 1.2,
                    minWidth: 130,
                    valueFormatter: (params) => "NT$" + Math.round(Number(params.value || 0)).toLocaleString(),
                    cellStyle: (params) => this.getCellStyle(params.value),
                },
                {
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
                { field: "BillStartTime", headerName: "開始日期", width: 200 },
                { field: "BillEndTime", headerName: "結束日期", width: 200 },
                {
                    field: "BillAmount",
                    headerName: "金額",
                    width: 200,
                    valueFormatter: (params) => "NT$" + Math.round(Number(params.value || 0)).toLocaleString(),
                },
                { field: "Note", headerName: "備註", width: 200 },
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
            accountSnapshotMonth: "",
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

        this.categoryAnalysis = { mode: "expense", granularity: "month", start: "", end: "", selectedPeriod: null, lastData: null };

        this.featureViewsMap = {
            overview: [
                { id: "asset-trend", label: "資產" },
                { id: "cash-flow", label: "現金流" },
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
            settings: [{ id: "settings-general", label: "一般設定" }],
            upload: [{ id: "upload-detail", label: "麻布資料" }],
        };

        this.init();
    }

    /**
     * 初始化應用程式
     */
    init() {
        this.bindEvents();
        this.renderTabs();
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

        // 手機版底部導覽列的「更多」：開關同一個側邊欄，用來放不常用的「上傳」「設定」等功能
        const bottomNavMore = document.getElementById("appBottomNavMore");
        if (bottomNavMore) {
            bottomNavMore.addEventListener("click", () => {
                this.toggleSidebar();
                bottomNavMore.classList.toggle("active", this.elements.sidebar.classList.contains("active"));
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
            this.categoryAnalysis.start = "";
            this.categoryAnalysis.end = "";
            this.categoryAnalysis.selectedPeriod = null;
            this.renderCategoryAnalysis();
        });
        $("#caGranYear").on("click", () => {
            this.categoryAnalysis.granularity = "year";
            this.categoryAnalysis.start = "";
            this.categoryAnalysis.end = "";
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
            this.renderAssetChecklist();
            this.refreshAssetGrid();
            this.refreshCashflowGrid();
            this.updateProjectDetailSummary();
        });
        $("#pdAddRule").on("click", () => this.addCashflowRuleCard());
        $("#pdApplyAssetsAllMonths").on("click", () => this.applyAssetBindingsToAllMonths());
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
        $("#pdGenerateDraft").on("click", () => this.generateExpectedDraftFromRates());
        ["pdName", "pdStatus", "pdBudget", "pdStartDate", "pdEndDate", "pdTagPrefix"].forEach((id) => {
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
                        selfObj.initGrids_by_viewId(selfObj.data.account, viewId, "account_balance");
                    });
                });
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
                $("#bills_list").empty();
                selfObj.load_data("bills").then(function () {
                    var data = selfObj.data.bills;
                    selfObj.initGrids_by_viewId(data, viewId, "bills_list");
                });
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
        };
        var type = {
            "asset-trend": "line",
            "cash-flow": "line",
            "project-management": "column",
            "bills-expense-monthly": "column",
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
        const columnDefs = (this.gridDefsMap[viewId] || []).map((col) => (col.mobileHide ? { ...col, hide: isMobile } : col));
        const self = this;

        const gridOptions = {
            columnDefs: columnDefs,
            rowData: rowData,
            defaultColDef: { sortable: true, filter: true, resizable: true, editable: true },
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

                var momDiff = currentMonth.NetAssets - lastMonth.NetAssets;
                var momDiff_income = currentMonth.Assets - lastMonth.Assets;
                var momDiff_expense = currentMonth.Debt - lastMonth.Debt;
                var momPercentage = ((momDiff / lastMonth.NetAssets) * 100).toFixed(1);
                var momClass = momDiff >= 0 ? "positive" : "negative";

                self.elements.statMoM.innerHTML = `
            <span>資產差 ${momDiff_income >= 0 ? "+" : ""}${self.formatAxisCurrency(momDiff_income)}</span>
            <span>負債差 ${momDiff_expense >= 0 ? "+" : ""}${self.formatAxisCurrency(momDiff_expense)}</span>
            <span class="stat-amount">淨資產差 ${momDiff >= 0 ? "+" : ""}${self.formatAxisCurrency(momDiff)}</span>
            <span class="stat-percentage ${momClass}">${momDiff >= 0 ? "+" : ""}${momPercentage}%</span>
            <p class="stat-description">相較上月 (${lastMonth["Time"]})</p>
        `;

                var yoyDiff = currentMonth.NetAssets - lastYearSameMonth.NetAssets;
                var yoyDiff_income = currentMonth.Assets - lastYearSameMonth.Assets;
                var yoyDiff_expense = currentMonth.Debt - lastYearSameMonth.Debt;
                var yoyPercentage = ((yoyDiff / lastYearSameMonth.NetAssets) * 100).toFixed(1);
                var yoyClass = yoyDiff >= 0 ? "positive" : "negative";

                self.elements.statYoY.innerHTML = `
            <span>資產差 ${yoyDiff_income >= 0 ? "+" : ""}${self.formatAxisCurrency(yoyDiff_income)}</span>
            <span>負債差 ${yoyDiff_expense >= 0 ? "+" : ""}${self.formatAxisCurrency(yoyDiff_expense)}</span>
            <span class="stat-amount">淨資產差 ${yoyDiff >= 0 ? "+" : ""}${self.formatAxisCurrency(yoyDiff)}</span>
            <span class="stat-percentage ${yoyClass}">${yoyDiff >= 0 ? "+" : ""}${yoyPercentage}%</span>
            <p class="stat-description">相較去年同期 (${lastYearSameMonth["Time"]})</p>
        `;

                var balance = currentMonth.Assets - currentMonth.Debt;
                var balanceClass = balance >= 0 ? "positive" : "negative";
                var balanceText = balance >= 0 ? "資產 > 負債" : "負債 > 資產";

                self.elements.statBalance.innerHTML = `
            <span>資產 ${currentMonth.Assets >= 0 ? "+" : ""}${self.formatAxisCurrency(currentMonth.Assets)}</span>
            <span>負債 ${currentMonth.Debt >= 0 ? "-" : ""}${self.formatAxisCurrency(currentMonth.Debt)}</span>
            <span class="stat-amount">結餘 ${balance >= 0 ? "+" : ""}${self.formatAxisCurrency(balance)}</span>
            <span class="stat-percentage ${balanceClass}">${balanceText}</span>
        `;
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

    // 圖表座標軸用的精簡單位：四捨五入到整數 K，破百萬才切到 M（最多留 1 位小數），
    // 避免出現像 "12.345K" 這種又長又有小數點的軸標籤
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

    showModal(title, content, onConfirm) {
        this.elements.modalTitle.textContent = title;
        this.elements.modalBody.innerHTML = content;
        this.elements.modalOverlay.classList.remove("hidden");

        const newConfirmBtn = this.elements.modalConfirm.cloneNode(true);
        this.elements.modalConfirm.parentNode.replaceChild(newConfirmBtn, this.elements.modalConfirm);
        this.elements.modalConfirm = newConfirmBtn;

        this.elements.modalConfirm.addEventListener("click", onConfirm);
    }

    closeModal() {
        this.elements.modalOverlay.classList.add("hidden");
        this.elements.modalBody.innerHTML = "";
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

            self.renderAssetChecklist();
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

    renderAssetChecklist() {
        const draft = this.state.projectDetailDraft;
        const month = this.state.projectDetailMonth;
        const container = document.getElementById("pdAssetChecklist");
        if (!draft || !container || !month) {
            if (container) container.innerHTML = '<label>請先選擇月份</label>';
            return;
        }

        $.get(`/api/finance/projects/${draft.projectId}/assets`, { month: month }).then((accounts) => {
            if (!accounts.length) {
                container.innerHTML = '<label>此月份沒有帳戶資料</label>';
                return;
            }
            container.innerHTML = accounts
                .map((a) => {
                    const key = a.OrganizationName + "｜" + a.AccountName;
                    const checked = a.IsBound ? "checked" : "";
                    const bal = this.formatCurrency(Number(a.AccountBalance || 0));
                    return `<label><input type="checkbox" data-org="${encodeURIComponent(a.OrganizationName)}" data-acc="${encodeURIComponent(a.AccountName)}" ${checked} /> <span>${key}（${bal}）</span></label>`;
                })
                .join("");

            var self = this;
            container.querySelectorAll("input[type=checkbox]").forEach((checkbox) => {
                checkbox.addEventListener("change", () => {
                    self.saveCurrentAssetSelection();
                });
            });
        });
    }

    saveCurrentAssetSelection() {
        const draft = this.state.projectDetailDraft;
        const month = this.state.projectDetailMonth;
        if (!draft || !month) {
            return;
        }
        const container = document.getElementById("pdAssetChecklist");
        const accounts = [];
        container.querySelectorAll("input[type=checkbox]:checked").forEach((cb) => {
            accounts.push({
                OrganizationName: decodeURIComponent(cb.dataset.org),
                AccountName: decodeURIComponent(cb.dataset.acc),
            });
        });

        var self = this;
        $.ajax({
            url: `/api/finance/projects/${draft.projectId}/assets`,
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify({ month: month, accounts: accounts }),
        }).then(function () {
            self.refreshAssetGrid();
            self.updateProjectDetailSummary();
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

    applyAssetBindingsToAllMonths() {
        const draft = this.state.projectDetailDraft;
        const month = this.state.projectDetailMonth;
        if (!draft || !month) {
            return;
        }
        const container = document.getElementById("pdAssetChecklist");
        const accounts = [];
        container.querySelectorAll("input[type=checkbox]:checked").forEach((cb) => {
            accounts.push({
                OrganizationName: decodeURIComponent(cb.dataset.org),
                AccountName: decodeURIComponent(cb.dataset.acc),
            });
        });
        if (!accounts.length) {
            alert("目前月份沒有勾選任何帳戶，無法套用");
            return;
        }

        var self = this;
        $.ajax({
            url: `/api/finance/projects/${draft.projectId}/assets/apply-all-months`,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ accounts: accounts }),
        }).then(function (res) {
            alert(res.message || "已套用");
            self.renderAssetChecklist();
            self.refreshAssetGrid();
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
            self.renderAssetChecklist();
            self.refreshAssetGrid();
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
        var self = this;

        $.get(`/api/finance/projects/${draft.projectId}/cashflow-matches`, { month: allMonths ? "" : month }).then((res) => {
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
                ],
                res.matched || [],
            );

            self._setText("pdHitCount", `命中筆數：${res.hitCount || 0}`);
            self._setText("pdHitAmount", `命中金額：${self.formatCurrency(res.hitAmount || 0)}`);
            self._setText("pdMissCount", `未命中筆數：${res.missCount || 0}`);
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

        $.get(`/api/finance/projects/${draft.projectId}/cashflow-matches`, { month: "" }).then((res) => {
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
            defaultColDef: { sortable: true, filter: true, resizable: true, editable: false },
            animateRows: true,
            stopEditingWhenCellsLoseFocus: true,
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
                    scrollPositionX: 1, // 預設捲到最右邊（最新月份）
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
        const title = (this.categoryAnalysis.mode === "income" ? "收入" : "支出") + "分類分析（點一下柱狀圖可依該月份篩選下方明細）";
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

    // 未選取任何月份時：完整的 分類 x 期間 樞紐表
    renderCategoryPivotGrid(periods, categories, sums) {
        const cols = [{ field: "category", headerName: "分類", pinned: "left", minWidth: 140, flex: 1 }];
        periods.forEach((p) => {
            cols.push({
                field: p,
                headerName: p,
                width: 120,
                valueFormatter: (params) => "NT$ " + Math.round(Number(params.value || 0)).toLocaleString(),
            });
        });
        cols.push({
            field: "__total",
            headerName: "合計",
            width: 140,
            pinned: "right",
            valueFormatter: (params) => "NT$ " + Math.round(Number(params.value || 0)).toLocaleString(),
            cellStyle: () => ({ fontWeight: "bold", color: "#00bcd4" }),
        });

        const rows = categories.map((cat) => {
            const row = { category: cat };
            let total = 0;
            periods.forEach((p) => {
                const v = Math.round(sums[cat][p] || 0);
                row[p] = v;
                total += v;
            });
            row.__total = total;
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
            totalRow.__total = grand;
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
                headerName: `${year} 年度月均`,
                width: 160,
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
        this.initCharts_byViewId(sorted, "project-management", "projectComparisonChart");
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

        if (!name) {
            this.showModal("欄位不足", "<p>請填入專案名稱。</p>", () => this.closeModal());
            return;
        }

        var self = this;
        $.ajax({
            url: `/api/finance/projects/${draft.projectId}`,
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify({ name, keyword: draft.keyword, budget, status, startDate: startDate || null, endDate: endDate || null }),
        })
            .done(function () {
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
        });
    }

    refreshAccountUI() {
        $("#account_balance").empty();
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