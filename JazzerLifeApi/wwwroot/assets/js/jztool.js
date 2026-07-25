// note: 導入此scipt之前，請import以下依賴包
var dependencies_list = ["xasmx.asxm", "jquery"];

var xool = {
    /*
      todo LS_manager
      todo dataWorker
      todo dateWorker
      todo mathWorker
      todo formatWorker
      todo chartWorker
      */

    LS_manager: {
        nameSpace: "x_space",
        DIYPackageUse: ["Xool.formatWorker.JsonToArray", "data_removeDuplication"],

        saveNameSpace: function (id) {
            var namespace = this.nameSpace;
            var namespace_data = localStorage.getItem(namespace);
            if (namespace_data == null) {
                localStorage.setItem(namespace, JSON.stringify([id]));
                return true;
            } else {
                var arr = Xool.formatWorker.JsonToArray(namespace_data);
                if (arr.includes(id)) {
                    return false;
                } else {
                    arr.unshift(id);
                    localStorage.setItem(namespace, JSON.stringify(arr));
                    return true;
                }
            }
        },

        clearNameSpace: function () {
            localStorage.removeItem(this.nameSpace);
            return true;
        },

        queryNameSpace: function () {
            return localStorage.getItem(this.nameSpace);
        },

        setItem: function (id, val) {
            var namespace_data = localStorage.getItem(id);
            if (namespace_data == null) {
                this.saveNameSpace(id);
                localStorage.setItem(id, JSON.stringify([val]));
                return true;
            } else {
                this.saveNameSpace(id);
                var arr = Xool.formatWorker.JsonToArray(namespace_data);
                arr.unshift(val);
                localStorage.setItem(id, JSON.stringify(arr));
                return true;
            }
        },

        removeItem: function (val) {
            var ls_qNamespace = Xool.formatWorker.JsonToArray(this.queryNameSpace());
            if (Array.isArray(val)) {
                val.forEach((item) => {
                    var index = ls_qNamespace.indexOf(item);
                    if (index >= 0) {
                        ls_qNamespace.splice(index, 1);
                    }
                    localStorage.removeItem(item);
                });
            } else if (typeof val === "string") {
                ls_qNamespace = ls_qNamespace.filter((item) => item !== val);
                localStorage.removeItem(val);
            } else {
                return false;
            }
            localStorage.setItem(this.nameSpace, JSON.stringify(ls_qNamespace));
            return true;
        },

        getItem: function (id) {
            return localStorage.getItem(id);
        },

        isNotEmpty: function (kw) {
            return localStorage.getItem(kw) !== null;
        },

        exportAllData: function () {
            var ns_arr = Xool.formatWorker.JsonToArray(this.queryNameSpace());
            var out_arr = ns_arr.map((id) => [id, ...Xool.formatWorker.JsonToArray(this.getItem(id))]);
            return out_arr;
        },

        updateNameSpace: function (oldId, newId) {
            var namespace = this.nameSpace;
            var namespace_data = Xool.formatWorker.JsonToArray(localStorage.getItem(namespace));
            var index = namespace_data.indexOf(oldId);
            if (index !== -1) {
                namespace_data[index] = newId;
                localStorage.setItem(namespace, JSON.stringify(namespace_data));
                return true;
            }
            return false;
        },

        clearAll: function () {
            localStorage.clear();
            return true;
        },

        getAllItems: function () {
            var items = {};
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                items[key] = localStorage.getItem(key);
            }
            return items;
        },

        keyExists: function (key) {
            return localStorage.getItem(key) !== null;
        },

        getNameSpaceIds: function () {
            return Xool.formatWorker.JsonToArray(localStorage.getItem(this.nameSpace));
        },

        getStorageSize: function () {
            var total = 0;
            var maxSize = 5 * 1024 * 1024; // 5MB
            for (var x in localStorage) {
                if (localStorage.hasOwnProperty(x)) {
                    total += (localStorage[x].length + x.length) * 2;
                }
            }
            var usedPercentage = (total / maxSize) * 100;
            return {
                size: (total / 1024).toFixed(2) + " KB",
                maxSize: (maxSize / 1024).toFixed(2) + " KB",
                usedPercentage: usedPercentage.toFixed(2) + "%",
            };
        },
    },

    dataWorker: {
        stringToDict: function (str) {
            try {
                // 假設字符串是 JSON 格式
                let dictionaryArray = JSON.parse(str);
                return dictionaryArray;
            } catch (e) {
                console.error("無法解析字符串為字典數組:", e);
                return null;
            }
        },
        rmvDup: function (arr) {
            return [...new Set(arr)];
        },

        sortByArr: function (arr, i, type) {
            var opt_arr = [];
            var rmvDup_x = this.rmvDup(arr[i]);
            if (type === "index" && rmvDup_x.length < arr[i].length) {
                rmvDup_x.forEach(() => opt_arr.push([]));
            }
            return opt_arr;
        },
        fullJoin: function (tableA, tableB, key) {
            const mapA = new Map();
            const mapB = new Map();

            // 將 A 表依 key 分組
            tableA.forEach((item) => {
                if (!mapA.has(item[key])) mapA.set(item[key], []);
                mapA.get(item[key]).push(item);
            });

            // 將 B 表依 key 分組
            tableB.forEach((item) => {
                if (!mapB.has(item[key])) mapB.set(item[key], []);
                mapB.get(item[key]).push(item);
            });

            const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
            const result = [];

            allKeys.forEach((k) => {
                const rowsA = mapA.get(k) || [null];
                const rowsB = mapB.get(k) || [null];

                rowsA.forEach((a) => {
                    rowsB.forEach((b) => {
                        result.push({
                            ...a,
                            ...b,
                        });
                    });
                });
            });

            return result;
        },
        renameKeys(data, keyMap) {
            if (Array.isArray(data)) {
                return data.map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [keyMap[key] || key, value])));
            } else if (data && typeof data === "object") {
                return Object.fromEntries(Object.entries(data).map(([key, value]) => [keyMap[key] || key, value]));
            }
            return data; // 如果不是物件或陣列，直接回傳原值
        },
        mergeTwoArrayByDict: function (arrDict, arrValue) {
            if (arrDict.length !== arrValue.length) {
                console.log("Error! Arrays are not the same length!");
                return false;
            }
            var output = [[], []];
            var rmvdup_arrDict = Xool.dataWorker.rmvDup(arrDict);
            if (rmvdup_arrDict.length === arrDict.length) {
                output = [arrDict, arrValue];
            } else {
                var rmvdup_arrValue = [];
                rmvdup_arrDict.forEach((dict, i) => {
                    rmvdup_arrValue[i] = arrDict.reduce((acc, curr, j) => {
                        return curr === dict ? acc + parseInt(arrValue[j]) : acc;
                    }, 0);
                });
                output = [rmvdup_arrDict, rmvdup_arrValue];
            }
            return output;
        },
        covert_data_to_table_text: function (data) {
            let tableHTML = '<table border="1"><tr>';

            Object.keys(data[0]).forEach((key) => {
                tableHTML += `<th>${key}</th>`;
            });

            tableHTML += "</tr>";

            data.forEach((item) => {
                tableHTML += "<tr>";
                Object.values(item).forEach((value) => {
                    tableHTML += `<td>${value}</td>`;
                });
                tableHTML += "</tr>";
            });

            tableHTML += "</table>";

            return tableHTML;
        },
        syncDataByKeys: function (source, target, keyFields, table_name) {
            const makeKey = (item) => keyFields.map((field) => item[field]).join("|");
            const sourceMap = new Map(source.map((item) => [makeKey(item), item]));
            const targetMap = new Map(target.map((item) => [makeKey(item), item]));
            var sql_set = { insert_sql: [], update_sql: [], delete_sql: [] };
            var sql_set_trans = { header: ["BEGIN TRANSACTION;"], footer: ["COMMIT;"] };

            for (const [key, targetItem] of targetMap.entries()) {
                if (!sourceMap.has(key)) {
                    sql_set.insert_sql.push(xool.dataWorker._insert_to_db(targetItem, table_name));
                } else {
                    const sourceItem = sourceMap.get(key);
                    updateSQL = xool.dataWorker._update_to_db(sourceItem, targetItem, keyFields, table_name);
                    // console.log(sourceItem, targetItem);

                    if (updateSQL) {
                        sql_set.update_sql.push(updateSQL);
                    }
                }
            }

            for (const [key, sourceItem] of sourceMap.entries()) {
                if (!targetMap.has(key)) {
                    sql_set.delete_sql.push(xool.dataWorker._delete_from_db(sourceItem, keyFields, table_name));
                }
            }
            sql_tip = `Insert(${sql_set.insert_sql.length}), Update(${sql_set.update_sql.length}), Delete(${sql_set.delete_sql.length})`;
            var sql = sql_set_trans["header"].concat(sql_set.insert_sql, sql_set.update_sql, sql_set.delete_sql, sql_set_trans.footer);
            sql_set["insert_sql"].concat(sql_set.update_sql, sql_set.delete_sql);
            sql = sql.join("\n");
            sql_set = { sql: sql, sql_tip: sql_tip };
            return sql_set;
        },
        _escapeValue: function (value) {
            if (typeof value === "string") {
                return `'${value.replace(/'/g, "''")}'`;
            }
            return value === null || value === undefined ? "NULL" : `'${value}'`;
        },
        _insert_to_db: function (new_data, table_name) {
            const columns = Object.keys(new_data);
            const values = columns.map((col) => {
                const val = new_data[col];
                const escaped = xool.dataWorker._escapeValue(val);
                // 若是字串且包含非 ASCII 字元（例如中文），則加上 N 前綴
                if (typeof val === "string" && /[^\x00-\x7F]/.test(val)) {
                    return `N${escaped}`;
                }
                return escaped;
            });
            const sql = `INSERT INTO ${table_name} (${columns.join(", ")}) VALUES (${values.join(", ")});`;
            // console.log(sql);
            return sql;
        },
        _update_to_db: function (source_data, target_data, keyFields, table_name) {
            const escapeWithUnicodeSupport = (val) => {
                const escaped = xool.dataWorker._escapeValue(val);
                if (typeof val === "string" && /[^\x00-\x7F]/.test(val)) {
                    return `N${escaped}`;
                }
                return escaped;
            };

            const setClauses = Object.keys(target_data)
                .filter((key) => !keyFields.includes(key) && source_data[key] !== target_data[key])
                .map((key) => `${key} = ${escapeWithUnicodeSupport(target_data[key])}`)
                .join(", ");

            if (!setClauses) return null; // 無需更新

            const whereClause = keyFields.map((key) => `${key} = ${escapeWithUnicodeSupport(target_data[key])}`).join(" AND ");

            const sql = `UPDATE ${table_name} SET ${setClauses} WHERE ${whereClause};`;
            // console.log(sql);
            return sql;
        },
        _delete_from_db: function (delete_data, keyFields, table_name) {
            const escapeWithUnicodeSupport = (val) => {
                const escaped = xool.dataWorker._escapeValue(val);
                if (typeof val === "string" && /[^\x00-\x7F]/.test(val)) {
                    return `N${escaped}`;
                }
                return escaped;
            };

            const whereClause = keyFields.map((key) => `${key} = ${escapeWithUnicodeSupport(delete_data[key])}`).join(" AND ");

            const sql = `UPDATE ${table_name} SET activate=0 WHERE ${whereClause};`;

            // const sql = `DELETE FROM ${table_name} WHERE ${whereClause};`;
            return sql;
        },
        sample_in_use_syncDataByKeys: function () {
            const source = [
                { code: "A1", type: "admin", type1: "admin", name: "Alice" }, // delete
                { code: "B2", type: "user", type1: "admin", name: "Bob" },
                { code: "C3", type: "user", type1: "admin", name: "Cathy" }, // delete
            ];

            const target = [
                { code: "B2", type: "user", type1: "admin", name: "Bobby" }, // update
                { code: "C3", type: "admin", type1: "admin", name: "Charlie" }, // insert
                { code: "D4", type: "user", type1: "admin", name: "David" }, // insert
            ];

            xool.dataWorker.syncDataByKeys(source, target, ["code", "type", "type1"], "ME_Plainning.OMT.DX_User");
        },
    },

    dateWorker: {
        date_format: function (date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        },

        date_daysBetween: function (date1, date2) {
            const oneDay = 24 * 60 * 60 * 1000;
            return Math.round(Math.abs((date2 - date1) / oneDay));
        },

        date_getCurrentDateTime: function () {
            return new Date().toLocaleString();
        },
    },

    mathWorker: {
        getRnd: function (max, min) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
    },

    formatWorker: {
        HTMLTable_to_JSArray: function (table_id, istdinput) {
            var myData = document.getElementById(table_id);
            var my_liste = [];
            for (var i = istdinput ? 1 : 0; i < myData.rows.length; i++) {
                var el = myData.rows[i].children;
                var my_el = [];
                for (var j = 0; j < el.length; j++) {
                    my_el.push(istdinput ? el[j].children[0].value : el[j].innerText);
                }
                my_liste.push(my_el);
            }
            return my_liste;
        },

        isJsonFormat: function (json) {
            try {
                JSON.parse(json);
                return true;
            } catch (e) {
                return false;
            }
        },

        JsonToArray: function (val) {
            if (val == null) {
                return false;
            } else if (Array.isArray(val)) {
                return JSON.stringify(val);
            } else if (typeof val === "string") {
                try {
                    return JSON.parse(val);
                } catch (error) {
                    return [val];
                }
            } else {
                return "Error: Val format is invalid";
            }
        },
    },

    chartWorker: {
        setChart: function (id, x, y) {
            if (!Array.isArray(x) || !Array.isArray(y)) {
                return false;
            }
            var ctx = document.getElementById(id);
            Chart.defaults.global.defaultFontColor = "white";
            var myChart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: x,
                    datasets: [
                        {
                            label: false,
                            data: y,
                            borderColor: "rgb(244, 244, 244)",
                            borderWidth: 1,
                            backgroundColor: "rgba(72, 201, 176, 0.3)",
                        },
                    ],
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                        },
                    },
                    legend: {
                        labels: {
                            fontColor: "black",
                        },
                        display: false,
                    },
                },
            });
            var ctxHeight = parseInt(ctx.style.height.replace("px", "")) * 0.9;
            var ctxWidth = parseInt(ctx.style.width.replace("px", "")) * 0.9;
            var fontSizee = parseInt(window.getComputedStyle(document.getElementsByTagName("body")[0]).fontSize.replace("px", "")) * 0.45;

            ctx.style.height = ctxHeight + "px";
            ctx.style.width = ctxwidth + "px";
            myChart.options.scales.yAxes[0].ticks.minor.fontSize = fontSizee;
            myChart.options.scales.yAxes[0].ticks.fontSize = fontSizee;
            myChart.options.scales.xAxes[0].ticks.minor.fontSize = fontSizee;
            myChart.options.scales.xAxes[0].ticks.fontSize = fontSizee;
            myChart.update();
            // for (var x in charts) {
            //     // set/change the actual font-size
            //     charts[x].options.scales.xAxes[0].ticks.minor.fontSize = 200;
            //     charts[x].options.scales.yAxes[0].ticks.minor.fontSize = 200;

            //     // set proper spacing for resized font
            //     charts[x].options.scales.xAxes[0].ticks.fontSize = 200;
            //     charts[x].options.scales.yAxes[0].ticks.fontSize = 200;

            //     // update chart to apply new font-size
            //     charts[x].update();
            // }
        },
        getHighChart_dict: function () {
            return {
                chart: {
                    type: "line",
                },
                TargetID: "hc_container_",
                title: {
                    text: "U.S Solar Employment Growtha",
                    align: "center",
                },

                subtitle: {
                    text: 'By Job Category. Source: <a href="https://irecusa.org/programs/solar-jobs-census/" target="_blank">IREC</a>.',
                    align: "center",
                },

                yAxis: {
                    title: {
                        text: "Number of Employees",
                    },
                },

                xAxis: {
                    accessibility: {
                        rangeDescription: "Range: 2010 to 2022",
                    },
                },

                legend: {
                    layout: "vertical",
                    align: "right",
                    verticalAlign: "middle",
                },

                plotOptions: {
                    series: {
                        label: {
                            connectorAllowed: false,
                        },
                        pointStart: 2010,
                    },
                },

                series: [
                    {
                        name: "Installation & Developers",
                        data: [43934, 48656, 65165, 81827, 112143, 142383, 171533, 165174, 155157, 161454, 154610, 168960, 171558],
                    },
                    {
                        name: "Manufacturing",
                        data: [24916, 37941, 29742, 29851, 32490, 30282, 38121, 36885, 33726, 34243, 31050, 33099, 33473],
                    },
                    {
                        name: "Sales & Distribution",
                        data: [11744, 30000, 16005, 19771, 20185, 24377, 32147, 30912, 29243, 29213, 25663, 28978, 30618],
                    },
                    {
                        name: "Operations & Maintenance",
                        data: [null, null, null, null, null, null, null, null, 11164, 11218, 10077, 12530, 16585],
                    },
                    {
                        name: "Other",
                        data: [21908, 5548, 8105, 11248, 8989, 11816, 18274, 17300, 13053, 11906, 10073, 11471, 11648],
                    },
                ],

                responsive: {
                    rules: [
                        {
                            condition: {
                                maxWidth: 500,
                            },
                            chartOptions: {
                                legend: {
                                    layout: "horizontal",
                                    align: "center",
                                    verticalAlign: "bottom",
                                },
                            },
                        },
                    ],
                },
            };
        },
        setHighChart: function (dict) {
            Highcharts.chart(dict.TargetID, dict);
        },
    },
    ajaxWorker: {
        getData: function (webAPIUrl, sql) {
            var _para = { sql_code: sql };
            var _parameter = _para["Non_parameter"] != "Non_parameter" ? JSON.stringify(_para) : "";
            return new Promise((resolve, reject) => {
                $.ajax({
                    type: "POST",
                    contentType: "application/json; charset=utf-8",
                    url: webAPIUrl,
                    data: _parameter,
                    dataType: "json",
                    async: true, // 設置為異步
                    cache: false,
                    ifModified: true,
                    timeout: 3000,
                    success: function (response) {
                        resolve(JSON.parse(response.d));
                    },
                    error: function (request, status, error) {
                        reject(error);
                        alert("Please, refresh the page.");
                    },
                });
            });
        },
    },
    documentEleWorker: {
        createEditableTable: function (data, elementId, type = 1) {
            const container = document.getElementById(elementId);
            if (!container) return;

            const table = document.createElement("table");
            const thead = document.createElement("thead");
            const tbody = document.createElement("tbody");

            // Create table header
            const headerRow = document.createElement("tr");
            const headers = Object.keys(data[0]);
            table.className = "table table-bordered justify-content-center align-items-center";
            headers.forEach((header) => {
                const th = document.createElement("th");
                th.textContent = header;
                headerRow.appendChild(th);
            });
            if (type == 2) {
                const th = document.createElement("th");
                th.textContent = "edit";
                headerRow.appendChild(th);
            }
            thead.appendChild(headerRow);

            // Create table body
            data.forEach((item, rowIndex) => {
                const row = document.createElement("tr");
                headers.forEach((header) => {
                    const td = document.createElement("td");
                    const input = document.createElement("input");
                    input.type = "text";
                    input.value = item[header];
                    input.className = "input-group form-control ";
                    input.id = `${header}-${rowIndex}`;
                    td.appendChild(input);
                    row.appendChild(td);
                });

                if (type == 2) {
                    const td = document.createElement("td");
                    const input = document.createElement("input");
                    input.type = "button";
                    input.value = "EDIT";
                    input.className = "input-group form-control ";
                    input.id = `editBtn-${rowIndex}`;
                    td.appendChild(input);
                    row.appendChild(td);
                }
                tbody.appendChild(row);
            });

            table.appendChild(thead);
            table.appendChild(tbody);
            container.appendChild(table);
            return table;
        },
    },
    tableWorker: {
        sampleData: [
            {
                LOT_ID: "678018L.1SL",
                PC: "SM",
                part_code: "Y52KB16AAA",
                trav_id: "Y52KAL1200",
                DID: "Y52K",
                Step_Name: "0040-47 CONTACT INTEGRATED DRY STRIP RDA DISPO",
                QTY: 2,
                Status: "On Hold Long Term",
                WSG: "",
                Step_Seq: 1467,
                Area: "RDA-GENERAL",
                MTAS: 5083.4,
                Comment: "SH;ME;PC;JOYLIAO;B TYPE over 120 days LOT WAIT SCRAP  ;3/10/2025\n",
                UserN: "JOYLIAO",
                HoldArea: "F16 PRODUCTION",
                Node: "D150S",
                WeekBlock: 9,
                carrier_id: "BJ722168",
                UpdateTime: "2025-02-27T15:25:51.44",
            },
            {
                LOT_ID: "600333L.03L",
                PC: "UD",
                part_code: "Y52KB16AAA",
                trav_id: "Y52KAL1205",
                DID: "Y52K",
                Step_Name: "0040-47 CONTACT METAL DRY STRIP RDA DISPO",
                QTY: 1,
                Status: "On Hold Target",
                WSG: "",
                Step_Seq: 18,
                Area: "RDA-GENERAL",
                MTAS: 4095.7,
                Comment: "hold for PO check low dose reticle data",
                UserN: "ALISONLIN",
                HoldArea: "F16 PHOTO",
                Node: "D150S",
                WeekBlock: 9,
                carrier_id: "RLZ22133",
                UpdateTime: "2025-02-27T15:25:51.44",
            },
            {
                LOT_ID: "670467L.24L",
                PC: "SM",
                part_code: "Y52KB16AAA",
                trav_id: "Y52KAL1200",
                DID: "Y52K",
                Step_Name: "0040-49 CONTACT INTEGRATED DRY ETCH 2 RDA DISPO",
                QTY: 1,
                Status: "On Hold Target",
                WSG: "",
                Step_Seq: 1298,
                Area: "ETCH-GENERAL",
                MTAS: 3724.4,
                Comment: "DC:PEE1;GTAI; 2820:  hold for SOAK pi-run, wait check data, 20241030",
                UserN: "GTAI",
                HoldArea: "F16 DRY ETCH",
                Node: "D150S",
                WeekBlock: 8,
                carrier_id: "RL829157",
                UpdateTime: "2025-02-27T15:25:51.44",
            },
            {
                LOT_ID: "678018L.1HL",
                PC: "SM",
                part_code: "Y52KB16AAA",
                trav_id: "Y52KAL1200",
                DID: "Y52K",
                Step_Name: "0040-49 CONTACT POLY DRY STRIP 2 RDA DISPO",
                QTY: 1,
                Status: "On Hold Target",
                WSG: "",
                Step_Seq: 1395,
                Area: "RDA-GENERAL",
                MTAS: 3495.9,
                Comment: "OT,DE,WUMENGJI,150sFF Xfer step TOPO used, wait step owner handle,12/30/2024",
                UserN: "WUMENGJI",
                HoldArea: "F16 DRY ETCH",
                Node: "D150S",
                WeekBlock: 8,
                carrier_id: "RLY23240",
                UpdateTime: "2025-02-27T15:25:51.44",
            },
        ],
        getTabulator_Dict: function (data) {
            cols = [];
            // const headers = Object.keys(m_data[0]);
            // headers.forEach(function(val,i){
            //   console.log(val)
            // })
            return {
                data: data,
                TargetID: "",
                columns: [
                    {
                        title: "Node",
                        field: "Node",
                        sorter: "string",
                        headerFilter: "input",
                    },
                    {
                        title: "DID",
                        field: "DID",
                        sorter: "string",
                        headerFilter: "input",
                    },
                    {
                        title: "Lot Type",
                        field: "Lot_Type",
                        sorter: "string",
                        headerFilter: "input",
                    },
                    {
                        title: "Part Code",
                        field: "part_code",
                        sorter: "string",
                        headerFilter: "input",
                    },
                    {
                        title: "LOT ID",
                        field: "LOT_ID",
                        sorter: "string",
                        headerFilter: "input",
                    },
                    {
                        title: "QTY",
                        field: "QTY",
                        sorter: "number",
                        headerFilter: "input",
                    },
                    {
                        title: "Status",
                        field: "Status",
                        sorter: "string",
                        headerFilter: "input",
                    },
                    {
                        title: "WSG",
                        field: "WSG",
                        sorter: "string",
                        headerFilter: "input",
                    },
                    {
                        title: "Step Name",
                        field: "Step_Name",
                        sorter: "string",
                        headerFilter: "input",
                    },
                    {
                        title: "Area",
                        field: "Area",
                        sorter: "string",
                        headerFilter: "input",
                    },
                    {
                        title: "UserN",
                        field: "UserN",
                        sorter: "string",
                        headerFilter: "input",
                    },
                    {
                        title: "Comment",
                        field: "Comment",
                        sorter: "string",
                        headerFilter: "input",
                    },
                    {
                        title: "MTAS",
                        field: "MTAS",
                        sorter: "number",
                        headerFilter: "input",
                    },
                    {
                        title: "TOPO Type",
                        field: "TOPO_type",
                        sorter: "string",
                        headerFilter: "input",
                    },
                    // // 新增 Scrap Comment 輸入欄位
                    // {
                    //     title: "Scrap",
                    //     field: "scrap_comment",
                    //     editor: "input",
                    //     headerFilter: "input",
                    //     width: 150,
                    // },
                    // // 新增 Submit 按鈕
                    // {
                    //     title: "Action",
                    //     formatter: function(cell, formatterParams, onRendered) {
                    //         return '<button class="submit-btn">Submit</button>';
                    //     },
                    //     width: 100,
                    //     hozAlign: "center",
                    //     cellClick: function(e, cell) {
                    //         e.stopPropagation();

                    //         const rowData = cell.getRow().getData();
                    //         console.log("提交的行數據:", rowData);

                    //     }
                    // }
                ],

                // 分頁設置
                pagination: true,
                paginationSize: 10,
                paginationSizeSelector: [5, 10, 25, 50, 100],

                // 響應式佈局
                layout: "fitDataFill",

                // 可移動列
                movableColumns: true,

                // 調整列寬
                resizableColumns: true,

                // 初始排序
                initialSort: [{ column: "Node", dir: "asc" }],

                // 本地化
                locale: true,
                langs: {
                    "zh-tw": {
                        pagination: {
                            first: "首頁",
                            first_title: "首頁",
                            last: "末頁",
                            last_title: "末頁",
                            prev: "上一頁",
                            prev_title: "上一頁",
                            next: "下一頁",
                            next_title: "下一頁",
                        },
                    },
                },
            };
        },
        setTabulator: function (dict) {
            table = new Tabulator(dict.TargetID, dict);
        },
    },
    agGrid: {
        __rowdata__: [],
        __DisplayName__: [],
        __Width__: [],
        __cols__: [],
        __ColDef__: [],
        __CellClickedHandler__: [],
        __button_render__: [],
        __filter__: [],
        __cellClassRuler__: [],
        checkSettings: function () {
            this.__cols__ = Object.keys(this.__rowdata__[0]);
            if (
                this.__DisplayName__.length == this.__cols__.length &&
                this.__Width__.length == this.__cols__.length &&
                this.__filter__.length == this.__cols__.length &&
                this.__cellClassRuler__.length == this.__cols__.length
            ) {
                return true;
            } else {
                return false;
            }
        },
        button_render: {
            params: [],
            eGui: [],
            init: function (params) {
                this.params = params;
                this.eGui = document.createElement("button");
                this.eGui.innerText = "Comment";
                this.eGui.classList.add("btn", "btn-sm", "btn-secondary");
                this.eGui.addEventListener("click", () => this.openModal());
            },
            get_Gui: function () {
                return this.eGui;
            },
            openModal: function () {
                const modal = document.getElementById("formModal");
                document.getElementById("formOID").value = this.params.data.OID;
                modal.style.display = "block";
            },
            destroy: function () {
                this.eGui.removeEventListener("click", this.openModal);
            },
        },
        set_data: function (rowdata, displayName = "", width = "", filter = "", cellClassRuler = "") {
            this.__rowdata__ = rowdata;
            this.__DisplayName__ = displayName;
            this.__Width__ = width;
            this.__filter__ = filter; // agTextColumnFilter、agDateColumnFilter、agNumberColumnFilter
            this.__cellClassRuler__ = cellClassRuler; // agTextColumnFilter、agDateColumnFilter、agNumberColumnFilter
            this.__cols__ = Object.keys(this.__rowdata__[0]);
        },
        get_Col_options: function () {
            columnDefs = [];
            checkSettings = this.checkSettings();
            for (i = 0; i < this.__cols__.length; i++) {
                tempDict = {
                    field: this.__cols__[i],
                    headerName: checkSettings ? this.__DisplayName__[i] : String(this.__cols__[i]).replace("_", ""),
                    width: checkSettings ? this.__Width__[i] : 100,
                    // cellClass: "Move-cell",
                    suppressHeaderMenuButton: true,
                    filter: checkSettings ? this.__filter__[i] : "agTextColumnFilter",
                    cellClassRules: checkSettings ? this.__cellClassRuler__[i] : "",
                };
                // console.log(tempDict);
                columnDefs.push(tempDict);
            }
            this.__ColDef__ = {
                theme: "legacy",
                // Data to be displayed
                rowData: this.__rowdata__,
                // Columns to be displayed (Should match rowData properties)
                columnDefs: columnDefs,
                tooltipShowDelay: 0,
                defaultColDef: {
                    sortable: true,
                    filter: true,
                    floatingFilter: true,
                    resizable: true,
                    wrapHeaderText: true,
                    //autoHeaderHeight: true,
                    // cellRenderer: this.__button_render__,
                },
                pagination: true,
                paginationPageSizeSelector: [10, 20, 50, 100],
                paginationPageSize: 50,
                // onCellClicked: this.__CellClickedHandler__,
                //height: '50%',
                // loading: true,
            };
            return this.__ColDef__;
        },
        update_AgGrid: function (id) {
            $("#" + id).empty();
            var agGrid_obj = agGrid.createGrid(document.querySelector("#" + id), this.get_Col_options());
        },
    },
    isEmpty: function (obj) {
        return Object.keys(obj).length === 0;
    },
};

var x_ajax = {
    file_name: "../assets/asmx/xasmx.asmx",
    getAjaxData_promise: function (function_name, parameter) {
        var _parameter = parameter["Non_parameter"] != "Non_parameter" ? JSON.stringify(parameter) : "";

        return new Promise((resolve, reject) => {
            $.ajax({
                type: "POST",
                contentType: "application/json; charset=utf-8",
                url: this.file_name + "/" + function_name,
                data: _parameter,
                dataType: "json",
                async: true, // 設置為異步
                cache: false,
                ifModified: true,
                timeout: 30000,
                success: function (response) {
                    resolve(JSON.parse(response.d));
                },
                error: function (request, status, error) {
                    reject(error);
                    alert("Please, refresh the page.");
                },
            });
        });
    },
    check_version_latest_promise: function (system) {
        var _parameter = { sql_code: "select top 1 * from [ME_Planning].[OMT].[DX_Web_Version_Control] where system='" + system + "'" };
        // console.log(_parameter);
        _parameter = JSON.stringify(_parameter);
        return new Promise((resolve, reject) => {
            $.ajax({
                type: "POST",
                contentType: "application/json; charset=utf-8",
                url: this.file_name + "/" + "meta_sql",
                data: _parameter,
                dataType: "json",
                async: true, // 設置為異步
                cache: false,
                ifModified: true,
                timeout: 30000,
                success: function (response) {
                    resolve(JSON.parse(response.d));
                },
                error: function (request, status, error) {
                    reject(error);
                    alert("Please, refresh the page.");
                },
            });
        });
    },
    getJsonData_async: function (function_name, parameter) {
        var _parameter = parameter["Non_parameter"] != "Non_parameter" ? JSON.stringify(parameter) : "";
        return new Promise((resolve, reject) => {
            $.ajax({
                type: "POST",
                contentType: "application/json; charset=utf-8",
                url: this.file_name + "/" + function_name,
                data: _parameter,
                dataType: "json",
                async: true, // 設置為異步
                cache: false,
                ifModified: true,
                timeout: 60000,
                success: function (response) {
                    resolve(JSON.parse(response.d));
                },
                error: function (request, status, error) {
                    reject(error);
                    alert("Please, refresh the page.");
                },
            });
        });
    },
    getJsonData_sync: function (function_name, parameter) {
        var _parameter = parameter["Non_parameter"] != "Non_parameter" ? JSON.stringify(parameter) : "";
        var rlt;
        $.ajax({
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: this.file_name + "/" + function_name,
            data: _parameter,
            dataType: "json",
            async: false, // 設置為異步
            cache: false,
            ifModified: true,
            timeout: 30000,
            success: function (response) {
                rlt = JSON.parse(response.d);
            },
            error: function (request, status, error) {
                alert("Please, refresh the page.");
            },
        });
        return rlt;
    },
    getData_sync: function (function_name, parameter) {
        var _parameter = parameter["Non_parameter"] != "Non_parameter" ? JSON.stringify(parameter) : "";
        var rlt;
        $.ajax({
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: this.file_name + "/" + function_name,
            data: _parameter,
            dataType: "json",
            async: false, // 設置為異步
            cache: false,
            ifModified: true,
            timeout: 30000,
            success: function (response) {
                rlt = response.d;
            },
            error: function (request, status, error) {
                alert("Please, refresh the page.");
            },
        });
        return rlt;
    },
    getData_async: function (function_name, parameter) {
        var _parameter = parameter["Non_parameter"] != "Non_parameter" ? JSON.stringify(parameter) : "";
        return new Promise((resolve, reject) => {
            $.ajax({
                type: "POST",
                contentType: "application/json; charset=utf-8",
                url: this.file_name + "/" + function_name,
                data: _parameter,
                dataType: "json",
                async: true, // 設置為異步
                cache: false,
                ifModified: true,
                timeout: 30000,
                success: function (response) {
                    resolve(response.d);
                },
                error: function (request, status, error) {
                    reject(error);
                    alert("Please, refresh the page.");
                },
            });
        });
    },
    get_WindownUser: function (function_name) {
        WindowUser = this.getData_sync("getWindownUser", {});
        sql = "SELECT * FROM [reference].[dbo].[SAP_worker] WHERE micron_username = '" + WindowUser.toUpperCase() + "'";
        userInfo = this.getJsonData_sync(function_name, { sql_code: sql });
        userInfo[0]["user_name"] = WindowUser;
        return userInfo;
    },
};