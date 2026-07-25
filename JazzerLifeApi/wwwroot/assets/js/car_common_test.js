// ! -- Global Area ----------------------------------------------------------------------
// var car_Vehicles_DBName = "[ME_Planning].[OMT].[DX_JZ_Vehicles]";
// var car_OilCon_DBName = "[ME_Planning].[OMT].[DX_JZ_FuelConsumption]";
// var car_MaintainTable_DBName = "[ME_Planning].[OMT].[DX_JZ_MaintenanceCycles]";
// var mem_User_DBName = "[ME_Planning].[OMT].[DX_JZ_Users]";

var car_Vehicles_DBName = "[JazzerLife].[CarMan].[Vehicles]";
var car_OilCon_DBName = "[JazzerLife].[CarMan].[FuelConsumption]";
var car_MaintainTable_DBName = "[JazzerLife].[CarMan].[PartsMaintenance]";
var mem_User_DBName = "[JazzerLife].[MEM].[Users]";
var car_Category_DBName = "[JazzerLife].[CarMan].[PartCategories]";
var car_InspectTable_DBName = "[JazzerLife].[CarMan].[MaintenanceCycles]";


var s = location.pathname;
var t = (url = location.href);
sourcePage = t.split("#")[1];
var loader_animate = {
    // load animation
    load_start: function () {
        $('.loading-state').removeClass('d-none')
    },
    load_end: function () {
        $('.loading-state').addClass('d-none')
    }
}
/**
 * SimpleButtonRenderer (優化版)
 */
function SimpleButtonRenderer() { }

SimpleButtonRenderer.prototype.init = function (params) {
    this.params = params;

    // 取得 cellRendererParams 中傳入的 clicked 函數
    const externalClicked = params.clicked;

    this.eGui = document.createElement('div');
    this.eGui.innerHTML = '<button type="button">操作</button>';
    this.button = this.eGui.querySelector('button');

    this.clickListener = () => {
        // **核心修正：檢查函數存在，並將 params.data (該行資料) 傳遞出去**
        if (externalClicked && typeof externalClicked === 'function') {
            // 傳遞整行資料 (最常用)
            externalClicked(params.data);

            // 💡 如果您只需要單元格的值 (params.value)，則傳遞：
            // externalClicked(params.value);
        }
    };

    this.button.addEventListener('click', this.clickListener);
};

SimpleButtonRenderer.prototype.getGui = function () {
    return this.eGui;
};

SimpleButtonRenderer.prototype.destroy = function () {
    if (this.button) {
        this.button.removeEventListener('click', this.clickListener);
    }
};
function openModalWithData(rowData, kw) {
    const modalTitle = document.getElementById('modalTitle');
    const modal = document.getElementById('myModal');
    const modalContent = document.getElementById('modalContent');
    console.log(kw);

    $(modalTitle).text('詳情視窗#' + kw)
    // 檢查是否有資料
    if (!rowData) {
        modalContent.innerHTML = '未取得列資料。';
    } else {
        // 🚨 關鍵：利用 rowData 填入 Modal 內容
        console.log(rowData);

        modalContent.innerHTML = `
        <table class="table table-striped table-hover table-bordered">
            <thead>
                <tr>
                    <th>項目 (Item)</th>
                    <th>參數 (Param)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>名稱</td>
                    <td><input type="text" class="form-control formInput" id='modalPartName' value='${rowData.PartName}'></td>
                </tr>
                <tr>
                    <td>週期里程</td>
                    <td><input type="text" class="form-control formInput" id='modalavgOdo' value='${rowData.avgOdo}'></td>
                </tr>
                <tr>
                    <td>週期時間</td>
                    <td><input type="text" class="form-control formInput" id='modalavgDate' value='${rowData.avgDate}'></td>
                </tr>
                <tr>
                    <td>費用</td>
                    <td>${rowData.avgCost}</td>
                </tr>
                <tr>
                    <td>上次保養時間</td>
                    <td>${rowData.maxDate.split('T')[0]}</td>
                </tr>
                <tr>
                    <td>上次保養里程</td>
                    <td>${rowData.maxOdo}</td>
                </tr>
            </tbody>
        </table>
        <div class="d-flex justify-content-center" style="gap: 1rem;">
          <button class="btn btn-danger" onclick="closeModal()">關閉</button>
          <button class="btn btn-primary ms-2" onclick="saveModal()">儲存</button>
        </div>
        
        `;
    }

    // 顯示 Modal
    modal.style.display = 'block';
}
function closeModal() {
    const modal = document.getElementById('myModal');
    const modalContent = document.getElementById('modalContent');

    // 顯示 Modal
    modal.style.display = 'none';
}
function saveModal() {
    var data = {};
    // note: 取得參數
    $('.formInput').each(function () {
        // 取得當前元素的 ID 作為鍵
        var key = $(this).prop('id');
        // 取得當前元素的值作為值
        var value = $(this).val();
        data[key] = value
    });
    key = 'modalKW'
    value = $('#modalTitle').text().split('#')[1];
    data[key] = value
    key = 'modalVID'
    value = $('#vehiclesSelect').val().split('_')[0].replace('#', '');
    data[key] = value
    key = 'modalUID'
    value = sessionStorage.getItem('uid')
    data[key] = value
    var sql_c = ''
    switch (data.modalKW) {
        case "partsEdit_rec_table":
            sql_c = `
            insert into [JazzerLife].[CarMan].[MaintenanceCycles]
                SELECT 
                    ${data.modalUID} as UserID
                    ,'${data.modalPartName}' as PartName
                    ,${data.modalavgDate} as TimeCycle
                    ,${data.modalavgOdo} as MileageCycle
                    ,'${moment().format().split('+')[0]}' as CreatedAt
                    ,'${moment().format().split('+')[0]}' as UpdatedAt
                    ,${data.modalVID} as VehicleID
            `

            var _para = { sql_code: sql_c };

            loader_animate.load_start()
            getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
                .then(function (data) {
                    console.log("上傳成功");
                    loader_animate.load_end()
                    reload_toDash();
                })
                .catch(function (error) {
                    loader_animate.load_end()
                    alert("上傳失敗，請洽系統管理員");
                    reload_toDash();
                });
            break;

        default:
            break;
    }

    console.log(data)
    console.log(sql_c)
}
function openModalWithAddingMaintain() {
    const modalTitle = document.getElementById('modalTitle');
    const modal = document.getElementById('myModal');
    const modalContent = document.getElementById('modalContent');

    $(modalTitle).text('新增保養紀錄')
    // 檢查是否有資料
    console.log(window.app.cycleTable);


    modalContent.innerHTML = `
        <table class="table table-striped table-hover table-bordered">
            <thead>
                <tr>
                    <th>項目 (Item)</th>
                    <th>參數 (Param)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>保養分類</td>
                    <td><input type="text" class="form-control formInput" id='modal_pm_PartName' value=''></td>
                </tr>
                <tr>
                    <td>零件名稱</td>
                    <td><input type="text" class="form-control formInput" id='modal_pm_PartName' value=''></td>
                </tr>
                <tr>
                    <td>保養里程</td>
                    <td><input type="number" class="form-control formInput" id='modal_pm_Odo' value='${sessionStorage.getItem('latest_odometer')}'></td>
                </tr>
                <tr>
                    <td>保養時間</td>
                    <td><input type="date" class="form-control formInput" id='modal_pm_Date' value=''></td>
                </tr>
                <tr>
                    <td>費用</td>
                    <td><input type="number" class="form-control formInput" id='modal_pm_Cost' value=''></td>
                </tr>
                <tr>
                    <td>描述</td>
                    <td><input type="text" class="form-control formInput" id='modal_pm_Description' value=''></td>
                </tr>
                <tr>
                    <td>店家</td>
                    <td><input type="text" class="form-control formInput" id='modal_pm_Shop' value=''></td>
                </tr>
            </tbody>
        </table>
        <div class="d-flex justify-content-center" style="gap: 1rem;">
          <button class="btn btn-danger" onclick="closeModal()">關閉</button>
          <button class="btn btn-primary ms-2" onclick="saveModal_PM()">儲存</button>
        </div>
        `;

    // 顯示 Modal
    modal.style.display = 'block';
}
function saveModal_PM() {
    var data = {};
    // note: 取得參數
    $('.formInput').each(function () {
        // 取得當前元素的 ID 作為鍵
        var key = $(this).prop('id');
        // 取得當前元素的值作為值
        var value = $(this).val();
        data[key] = value
    });
    key = 'modalVID'
    value = $('#vehiclesSelect').val().split('_')[0].replace('#', '');
    data[key] = value
    key = 'modalUID'
    value = sessionStorage.getItem('uid')
    data[key] = value
    var sql_c = ''
    sql_c = `
            insert into [JazzerLife].[CarMan].[PartsMaintenance]
                SELECT 
                    ${data.modalVID} as VehicleID
                    ,'${data.modal_pm_PartName}' as PartName
                    ,${data.modal_pm_Date} as MaintenanceDate
                    ,${data.modal_pm_Cost} as Cost
                    ,'' as Notes
                    ,${data.modal_pm_CategoryID} as CategoryID
                    ,'${data.modal_pm_Description}' as Description
                    ,'${data.modal_pm_Shop}' as Shop
                    ,${data.modal_pm_Odo} as MileageCycle
                    ,'${moment().format().split('+')[0]}' as CreatedAt
                    ,'${moment().format().split('+')[0]}' as UpdatedAt
            `

    var _para = { sql_code: sql_c };
    console.log(sql_c);

    // loader_animate.load_start()
    // getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
    //     .then(function (data) {
    //         console.log("上傳成功");
    //         loader_animate.load_end()
    //         reload_toDash();
    //     })
    //     .catch(function (error) {
    //         loader_animate.load_end()
    //         alert("上傳失敗，請洽系統管理員");
    //         reload_toDash();
    //     });

}
var agGrid_maker = {
    _raw_data_: [],
    _cols_: [],
    kw: '',
    _defs_map: {
        "partsEdit_rec_table": {
            'CycleID': ''
            , 'UserID': ''
            , 'PartName': ''
            , 'TimeCycle': ''
            , 'MileageCycle': ''
            , 'CreatedAt': ''
            , 'UpdatedAt': ''
            , 'avgCost': ''
        },
        "partsEdit_table": {
            'CycleID': ''
            , 'UserID': ''
            , 'VehicleID': ''
            , 'PartName': ''
            , 'TimeCycle': ''
            , 'MileageCycle': ''
            , 'CreatedAt': ''
            , 'UpdatedAt': ''
            , 'avgCost': ''
        },
    },
    _api_: "",
    _check_data_: function () {
        if (this._raw_data_.length == 0) {
            if (this._defs_map[this.kw]) {

                return true
            }
            else {
                return false
            }
        } else {
            return true
        }
    },
    _get_Defs_: function () {
        if (!this._check_data_()) return -1;

        const firstRow = this._raw_data_.length ? this._raw_data_[0] : this._defs_map[this.kw];
        // console.log(this._raw_data_);
        ret_colDefs = this._cols_.map(col => {
            const value = firstRow[col];
            let filterType = 'agTextColumnFilter'; // 預設文字篩選

            if (typeof value === 'number') {
                filterType = 'agNumberColumnFilter';
            } else if (typeof value === 'boolean') {
                filterType = 'agTextColumnFilter'; // 可選值篩選
            }

            return {
                field: col,
                filter: filterType,
                filterParams: {
                    suppressAndOrCondition: true,
                    buttons: ['reset', 'apply']
                },
                editable: true,
            };
        })
        if (this.kw == 'partsEdit_rec_table') {
            ret_colDefs = ret_colDefs.concat({
                headerName: '操作',
                field: 'actions',
                cellRenderer: (params) => {
                    return `<button class='btn btn-primary' onclick='openModalWithData(${JSON.stringify(params.data)},"partsEdit_rec_table")'>Add</button>`
                }, // 這裡替換成您註冊的元件名稱
                width: 120,
                cellRendererParams: {
                    clicked: function (params) {
                        console.log(`${params.data} 被點擊了!`);
                    }
                }
            })
        }
        console.log(ret_colDefs);

        return ret_colDefs;
    },
    setting: function (rawData) {
        this._raw_data_ = rawData
        if (rawData.length) {
            this._cols_ = Object.keys(rawData[0])
        } else {
            this._cols_ = Object.keys(this._defs_map[this.kw])
        }
    },
    update_aggrid: function (id) {
        this.kw = id
        defs = this._get_Defs_()

        const gridOptions = {
            // Data to be displayed
            rowData: this._raw_data_.length ? this._raw_data_ : [this._defs_map[this.kw]],
            // Columns to be displayed (Should match rowData properties)
            columnDefs: defs,
            defaultColDef: {
                flex: 1,
            },
            components: { SimpleButtonRenderer: SimpleButtonRenderer }
        };
        // Create Grid: Create new grid within the #myGrid div, using the Grid Options object
        gridApi = agGrid.createGrid(document.querySelector('#' + id), gridOptions);
        // console.log(gridOptions);

        this._api_ = gridApi
        return gridApi
    },
    quick_Update: function (id, rawData) {

        this.kw = id
        $("#" + id).empty()
        // console.log(rawData);

        this.setting(rawData)
        api = this.update_aggrid(id)
        return api
    }
}

class configs {
    constructor() {
        this.project_name = "JazzerLife";
        this.page_title = "JazzerLife 車輛管理系統";
        this.api_baseurl = "../assets/asmx/xasmx.asmx";

    }
    // note: function area -----------------------------
    // note: main_app area -----------------------------
    gen_sql(kw, params) {
        var sql = '';
        switch (kw) {
            case "get_Part_cycle_table":
                sql = `
                select 
                    * 
                from 
                    [JazzerLife].[CarMan].PartCategories 
                where 
                    UserID='${params.uid}'
                `;
                break;
            case "partsEdit_rec_tableaaa":
                sql = `
                SELECT 
                    *,(SELECT AVG(Cost) 
                FROM 
                    [JazzerLife].[CarMan].[PartsMaintenance] PM 
                WHERE 
                    PM.PartName = MC.PartName 
                    AND PM.VehicleID = ${params.vehicleID})
                `;
                break;
            default:
                sql = `
                SELECT 
                    'there are no matched sql key' as msg
                `;
                break;
        }

        return sql;

    }

}

// 測試用 ---
am = agGrid_maker
config = new configs()
var data = [
    { make: "Tesla", model: "Model Y", price: 64950, electric: true },
    { make: "Ford", model: "F-Series", price: 33850, electric: false },
    { make: "Toyota", model: "Corolla", price: 29600, electric: false },
    { make: "Mercedes", model: "EQA", price: 48890, electric: true },
    { make: "Fiat", model: "500", price: 15774, electric: false },
    { make: "Nissan", model: "Juke", price: 20675, electric: false },
];

