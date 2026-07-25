// ! -- Global Area --------------------------------------------------------------------------
var OilData, MaintainCycleTable, vehicalsTable;
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
var tmp_jexl;
var tmp_aggrid;
var tmp_aggrid_data_0
var tmp_aggrid_data_1;
// ! -- Function Area ----------------------------------------------------------------------
function reChart(ele) {
  console.log($(ele).text())
  var uid = sessionStorage.getItem('uid');
  var vid = $("#vehiclesSelect").val().split("_")[0].replace("#", "");
  var dime = $(ele).text().toLowerCase() + "ly";
  loader_animate.load_start();
  console.log('click DASHBOARD');

  sel_FuelConsumption(vid, dime).then(function (data) {
    // console.log(data)
    // ChartMaker(data);
    highchart_maker(data)
    loader_animate.load_end();
  }).catch(function (error) {
    alert("上傳失敗，請洽系統管理員");
    loader_animate.load_end();
    reload_toDash();
  });
  loader_animate.load_end();
}
function checkSignInStatus() {
  acc = sessionStorage.getItem("account");
  pwd = sessionStorage.getItem("password");

  $("#navSign").children().remove();

  if (acc != null && pwd != null) {
    $("#navSign").prop("text", "LogOut");
    $("#navSign").on("click", function () {
      sessionStorage.clear();
      window.location.reload();
    });
  } else {
    $("#navSign").prop("href", "signin.html#finance");
    $("#navSign").prop("text", "Sign");
    alert("請先登入");
    window.location.assign("./signin.html#car");
  }
}

/* globals Chart:false, feather:false */
function getAverageFuelEfficiency(data, dimension) {
  const groupedData = {};

  data.forEach((record) => {
    const date = new Date(record.UpdatedAt);
    let key;

    if (dimension === "daily") {
      key = date.toISOString().split("T")[0]; // YYYY-MM-DD
    } else if (dimension === "weekly") {
      const startOfWeek = new Date(
        date.setDate(date.getDate() - date.getDay())
      );
      key = startOfWeek.toISOString().split("T")[0]; // YYYY-MM-DD
    } else if (dimension === "monthly") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`; // YYYY-MM
    }

    if (!groupedData[key]) {
      groupedData[key] = [];
    }
    groupedData[key].push(record.FuelEfficiency);
  });

  const averages = Object.keys(groupedData).map((key) => {
    const efficiencies = groupedData[key];
    const average =
      efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
    return { key, average };
  });

  averages.sort((a, b) => new Date(a.key) - new Date(b.key));// 按日期排序
  return averages.slice(0, 30); // 返回最後七筆資料
}
function ChartMaker(data) {
  //20250508 -----------------------
  var data_values = data.map((obj) => obj.FuelEfficiency);
  var data_index = data.map((obj) => obj.CreatedAt);

  // Graphs
  $("#chart_area").empty();
  var canvas = document.createElement("canvas");
  $(canvas).html(
    "<canvas class='my-4 w-100' id='myChart' width='900' height='380'></canvas>"
  );
  $("#chart_area").append($(canvas));
  // eslint-disable-next-line no-unused-vars
  var myChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: data_index,
      datasets: [
        {
          data: data_values,
          lineTension: 0,
          backgroundColor: "transparent",
          borderColor: "#007bff",
          borderWidth: 4,
          pointBackgroundColor: "#007bff",
        },
      ],
    },
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: false,
            },
          },
        ],
      },
      legend: {
        display: false,
      },
    },
  });
}
function swipeMainSection(ele) {
  $(".nav-link").removeClass("active");
  $(ele).addClass("active");
  var ActiveSection = String($(ele).children("text").html())
    .replaceAll(" ", "")
    .toUpperCase();
  $("section").addClass("d-none")
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
  var uid = sessionStorage.getItem('uid');
  var vid = $("#vehiclesSelect").val().split("_")[0].replace("#", "");
  console.log(ActiveSection);

  switch (ActiveSection) {
    case 'HOME':
      console.log('click home')
      break;
    case 'DASHBOARD':

      var dime = $("#btnText").text().toLowerCase() + "ly";
      loader_animate.load_start();
      // console.log('click DASHBOARD');

      sel_FuelConsumption(vid, dime).then(function (data) {
        // console.log(data)
        // ChartMaker(data);
        highchart_maker(data)
        loader_animate.load_end();
      }).catch(function (error) {
        alert("上傳失敗，請洽系統管理員");
        loader_animate.load_end();
        reload_toDash();
      });
      loader_animate.load_end();
      break;
    case 'OILRECORD':
      loader_animate.load_start();
      $('#c_table').empty();
      console.log('click OILRECORD')
      sel_FuelConsumption(vid, '123').then(function (data) {
        create_FuelRecordTable(data);
        loader_animate.load_end();
      }).catch(function (error) {
        alert("上傳失敗，請洽系統管理員");
        loader_animate.load_end();
        reload_toDash();
      });
      break;
    case 'VEHICLES':
      console.log('click VEHICLES')
      break;
    case 'PARTSINSPECTTABLE':
      // console.log('click PARTSINSPECTTABLE')
      loader_animate.load_start();
      // get exist data and get recommond data
      var getInspectTable = sel_InspectTable(uid, vid);
      var recommondTable = sel_recommndTable(uid, vid);
      Promise.all([getInspectTable, recommondTable]).then(function (data) {
        var m_Table = $("#parts_table");
        m_Table.children("tbody").children("tr").remove();

        create_MaintainCycleTable(data);
        // create_MaintainCycleTable(data[1]);
        loader_animate.load_end()

        // console.log("All data refresh OK.");
        // console.log('data[0]');
        // console.log(data[0]);
        // console.log('data[1]');
        // console.log(data[1]);
      }).catch(function (error) {
        loader_animate.load_end()
        alert(error);
        loader_animate.load_end();
        reload_toDash();
      });
      break;
    case "MAINTAINTABLE":
      loader_animate.load_start();
      // get exist data and get recommond data
      var MaintainessTable = sel_MaintainessTable(uid, vid);
      Promise.all([MaintainessTable]).then(function (data) {
        // console.log(data);

        create_MaintainTable(data);
        // create_MaintainCycleTable(data[1]);
        loader_animate.load_end()

      }).catch(function (error) {
        loader_animate.load_end()
        alert(error);
        loader_animate.load_end();
        reload_toDash();
      });
      break;
  }
}

function toggle_MainSection(ActiveSection) {
  $("section").each(function (i, val) {
    if ($(val).prop("id").trim().toUpperCase() == ActiveSection.toUpperCase()) {
      $(val).removeClass("d-none");
    } else {
      $(val).addClass("d-none");
    }
  });
}
function data_preProcess(data) {
  var colRemain = -1;
  var row = 5;
  colRemain = colRemain == -1 ? data.length : colRemain;
  row = row == -1 ? data[0].length : row;
  var new_data = [];
  var new_data_heads = [];
  for (var i in data) {
    var item = [];
    for (var j in data[0]) {
      if (i > 0 && i <= colRemain && j <= row) {
        item.push(data[i][j]);
      } else if (i == 0 && j <= row) {
        new_data_heads.push(data[i][j]);
      }
    }
    new_data.push(item);
    // console.log(new_data_heads);
  }
  // console.log(new_data);
  new_data.splice(0, 1);
  return [new_data_heads, new_data];
}
function dataToDict(data) {
  var item = [];
  var items = [];
  var rowNum = data.length;
  var colNum = Object.keys(data[0]).length;
  dataa = data_preProcess(data);
  return dataa;
}
function DictToJexcel(data, tableID) {
  var val = data.map((obj) => Object.values(obj));
  var header = Object.keys(data[0]);

  // 計算每個欄位的最大寬度
  var colWidths = header.map((col, index) => {
    var maxLength = Math.max(
      ...val.map((row) => row[index].toString().length),
      col.length
    );
    return maxLength * 12; // 假設每個字符寬度為10像素
  });

  // 動態生成 columns 配置
  var columns = header.map((col, index) => ({
    type: "text",
    width: colWidths[index],
  }));

  tmp_jexl = jexcel(document.getElementById(tableID), {
    data: val,
    colHeaders: header,
    columns: columns,
  });
  // tmp_jexl_data_0 = tmp_jexl.getData();
  // 隱藏行索引
  $(".jexcel_selectall, .jexcel_row").hide();
}
function getByID(url, tableid) {
  $.get(url, function (data) {
    var d = data["values"];
    var dictdata = dataToDict(d);
    DictToJexcel(dictdata, tableid);
  })
    .done(function () {
      console.log("GET OK.");
    })
    .fail(function () {
      console.log("GET Failed.");
    });
}
function gsht_getData() {
  url = [
    "https://sheets.googleapis.com/v4/spreadsheets/1re_Na3c34juFKTxicbN2fbV5q1lTvl0zCcVjO_reN3k/values/工作表2:B1:F3?alt=json&key=AIzaSyC_BNFoQ9IjBzRETQGiMJ83c_1wWYpuM-M",
    "https://sheets.googleapis.com/v4/spreadsheets/1re_Na3c34juFKTxicbN2fbV5q1lTvl0zCcVjO_reN3k/values/工作表1?alt=json&key=AIzaSyC_BNFoQ9IjBzRETQGiMJ83c_1wWYpuM-M",
    "https://sheets.googleapis.com/v4/spreadsheets/1re_Na3c34juFKTxicbN2fbV5q1lTvl0zCcVjO_reN3k/values/車用開銷?alt=json&key=AIzaSyC_BNFoQ9IjBzRETQGiMJ83c_1wWYpuM-M",
    "https://sheets.googleapis.com/v4/spreadsheets/1re_Na3c34juFKTxicbN2fbV5q1lTvl0zCcVjO_reN3k/values/需更換?alt=json&key=AIzaSyC_BNFoQ9IjBzRETQGiMJ83c_1wWYpuM-M",
  ];
  getByID(url[1], "c_table");
}
function jsonToDict(data) {
  var DictData = JSON.parse(data);
  return DictData;
}
function sel_gsht(sht, rng = "") {
  return new Promise((resolve, reject) => {
    // sht in ['工作表1','工作表2','車用開銷','需更換']
    var head =
      "https://sheets.googleapis.com/v4/spreadsheets/1re_Na3c34juFKTxicbN2fbV5q1lTvl0zCcVjO_reN3k/values/";
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
function create_MaintainCycleTable(dataaa) {
  // console.log(dataaa);
  $('#partsEdit_rec_table').empty();
  var agm = agGrid_maker;
  tmp_aggrid = agm.quick_Update("partsEdit_rec_table", dataaa[1]);
  $('#partsEdit_table').empty();
  var agm1 = agGrid_maker;
  tmp_aggrid = agm1.quick_Update("partsEdit_table", dataaa[0]);

  // var m_Table = $("#parts_table");
  // dataaa.forEach(function (i, val) {
  //   var tr = document.createElement("tr");
  //   $(tr).html(
  //     "<td>" +
  //     "<input type='text' id='PartName_" +
  //     val +
  //     "' class='input-group form-control' style='text-align: center;' value=" + i.PartName + " />" +
  //     "</td>" +
  //     "<td>" +
  //     "<input type='text' id='TimeCycle_" +
  //     val +
  //     "' class='input-group form-control' style='text-align: center;' value=" + i.TimeCycle + " />" +
  //     "</td>" +
  //     "<td>" +
  //     "<input type='text' id='MileageCycle_" +
  //     val +
  //     "' class='input-group form-control' style='text-align: center;' value=" + i.MileageCycle + " />" +
  //     "</td>" +
  //     "<td>" +
  //     "<input type='text' id='avgCost_" +
  //     val +
  //     "' class='input-group form-control' style='text-align: center;' value=" + i.avgCost + " readonly/>" +
  //     "</td>" +
  //     "<td>" +
  //     "<input type='button' id='PartsItem_" +
  //     i.CycleID +
  //     "' class='btn btn-primary' style='text-align: center;' value='EDIT' id='PartsEditBtn_" +
  //     i.CycleID +
  //     "'onclick='edit_PartsItem(this)' />" +
  //     "</td>"
  //   );
  //   m_Table.append(tr);
  // });
}
function create_MaintainTable(dataaa) {
  // console.log(dataaa);
  $('#maintaintable_aggrid').empty();
  var agm = agGrid_maker;
  tmp_aggrid = agm.quick_Update("maintaintable_aggrid", dataaa[0]);

}


function edit_PartsItem(ele) {
  var oldCid = $("#editParts_CID").val();
  var newCid = $(ele).prop("id").split("_")[1];
  console.log(newCid);
  if (oldCid == newCid) {
    show_toggleEle("partsEdit_table");
  } else {
    console.log(MaintainCycleTable);
    var cycle = MaintainCycleTable.find((item) => item.CycleID == newCid);
    console.log(cycle);
    $("#editParts_CID").val(cycle.CycleID);
    $("#editParts_KM").val(cycle.MileageCycle);
    $("#editParts_Day").val(cycle.TimeCycle);
    $("#partsEdit_table").removeClass("d-none");
  }
}
function create_FuelRecordTable(data) {
  if (data.length != 0) {
    // DictToJexcel(data, "c_table");

    am = agGrid_maker;
    tmp_aggrid = am.quick_Update("c_table", data)

    OilData = data;
  } else {
    OilData = "";
  }

  $("#oilPrice").val("");
  $("#oilKM_Record").val("");
  $("#oilLiter_Record").val("");

}
function create_VehiclesTable() {
  vehicalsTable.forEach(function (i, val) {
    var tr = document.createElement("tr");
    $(tr).empty()
    $(tr).html(
      "<th scope='row'>" +
      val +
      "</th>" +
      "<td id='vMake_" +
      i.VehicleID +
      "'>" +
      i.Make +
      "</td>" +
      "<td id='vModel_" +
      i.VehicleID +
      "'>" +
      i.Model +
      "</td>" +
      "<td id='vYear_" +
      i.VehicleID +
      "'>" +
      i.Year +
      "</td>" +
      "<td id='vLicensePlate_" +
      i.VehicleID +
      "'>" +
      i.LicensePlate +
      "</td>" +
      "<td>" +
      "<button id='vid_" +
      i.VehicleID +
      "' class='btn btn-primary' onclick='edit_Vehicles(this)'>EDIT</button>" +
      "</td>"
    );
    $("#vehiclesTable>tbody").append($(tr));
  });
}

function create_VehiclesSelectOption() {
  vehicalsTable.forEach(function (i, val) {
    var option = document.createElement("option");
    $(option).html("#" + i.VehicleID + "_" + i.Model);
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
function loadOilPrice() {
  type = $("#OILSelect").val();

  var vid = $("#vehiclesSelect").val().split("_")[0].split("#")[1];
  var sql = 'SELECT top 1 VehicleID,OdometerReading,FuelAmount';
  sql += ' FROM ' + car_OilCon_DBName + ' ';
  sql += " where VehicleID ='" + vid + "'";
  sql += ' order by CreatedAt desc';
  console.log(sql);
  var _para = { sql_code: sql };
  loader_animate.load_start()
  getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para).then(
    function (data) {
      var OdometerReading =
        data.length == 0 ? 0 : data[data.length - 1].OdometerReading;
      var FuelAmount =
        data.length == 0 ? 0 : data[data.length - 1].FuelAmount;
      sel_gsht("工作表1", "K1:N2")
        .then((data) => {
          const price = getOilPrice(data, type);
          $("#oilPrice").val(price);
          $("#oilKM_Record").val(OdometerReading);
          $("#oilLiter_Record").val(FuelAmount);
          loader_animate.load_end()
        })
        .catch((error) => {
          console.error(error);
          loader_animate.load_end()
        });
    }
  );


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
  var tmpTable = getAgridData(tmp_aggrid)
  var lastRecord = (tmpTable.length) == 0 ? 0 : tmpTable[0].OdometerReading;
  var vid = $("#vehiclesSelect").val().split("_")[0].split("#")[1];
  var oilPrice = $("#oilPrice").val();
  var oilKM_Record = $("#oilKM_Record").val();
  var oilLiter_Record = $("#oilLiter_Record").val();
  var DistanceTravelled = oilKM_Record - lastRecord;
  var FuelEfficiency = (DistanceTravelled / oilLiter_Record).toFixed(2);
  // console.log((DistanceTravelled / oilLiter_Record).toFixed(2))
  var sql_c =
    "INSERT INTO " +
    car_OilCon_DBName +
    " (VehicleID, OdometerReading, FuelAmount, FuelCost, DistanceTravelled, FuelEfficiency )";
  sql_c +=
    "VALUES ('" +
    vid +
    "', '" +
    oilKM_Record +
    "', '" +
    oilLiter_Record +
    "', '" +
    oilPrice +
    "', '" +
    DistanceTravelled +
    "', '" +
    FuelEfficiency +
    "')";
  console.log(sql_c);
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
  if (vid == "") {
    var sql_c =
      "INSERT INTO " +
      car_Vehicles_DBName +
      " (UserID, Make, Model, Year, LicensePlate)";
    sql_c +=
      "VALUES (" +
      sessionStorage.getItem("uid") +
      ", '" +
      $("#edit_vMake").val() +
      "', '" +
      $("#edit_vModel").val() +
      "', " +
      $("#edit_vYear").val() +
      ", '" +
      $("#edit_vPlate").val() +
      "')";
    var _para = { sql_code: sql_c };
    loader_animate.load_start()
    getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
      .then(function (data) {
        console.log("更新成功");
        loader_animate.load_end()
        reload_toDash();
      })
      .catch(function (error) {
        loader_animate.load_end()
        alert("上傳失敗，請洽系統管理員");
        reload_toDash();
      });
  } else {
    var sql_c =
      "UPDATE " +
      car_Vehicles_DBName +
      " SET[Make]='" +
      $("#edit_vMake").val() +
      "', [Model]='" +
      $("#edit_vModel").val() +
      "', [Year]=" +
      $("#edit_vYear").val() +
      ", [LicensePlate]='" +
      $("#edit_vPlate").val() +
      "' where VehicleID=" +
      vid +
      "";
    var _para = { sql_code: sql_c };
    loader_animate.load_start()
    getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
      .then(function (data) {
        console.log("更新成功");
        loader_animate.load_end()
        reload_toDash();
      })
      .catch(function (error) {
        loader_animate.load_end()
        alert("上傳失敗，請洽系統管理員");
        reload_toDash();
      });
  }
}
function del_Vehicle() {
  var vid = $("#edit_vID").val();
  if (vid == "") {
  } else {
    var sql_c = "delete " + car_Vehicles_DBName + "where VehicleID=" + vid + "";
    var _para = { sql_code: sql_c };
    loader_animate.load_start()
    getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
      .then(function (data) {
        console.log("刪除成功");
        loader_animate.load_end()
        reload_toDash();
      })
      .catch(function (error) {
        loader_animate.load_end()
        alert("上傳失敗，請洽系統管理員");
        reload_toDash();
      });
  }
}
function add_Vihecle() {
  $("#edit_vID").val(null);
  $("#edit_vMake").val(null);
  $("#edit_vModel").val(null);
  $("#edit_vYear").val(null);
  $("#edit_vPlate").val(null);
  show_toggleEle("Vehicle_edit_area");
}
function addRow_PartsTable() {

  var tr = document.createElement("tr");
  var index = $("#parts_table").children("tbody").children("tr").length + 1;
  $(tr).html(
    "<td>" +
    "<input type='text' id='parts_SortItem_" +
    index +
    "' value='' class='input-group form-control newPartsCycleItem newPartsCycleItem_" +
    index +
    "'style='text-align: center'/>" +
    "</td>" +
    "<td>" +
    "<input type='text' id='parts_KM_" +
    index +
    "' value='' class='input-group form-control newPartsCycleItem newPartsCycleItem_" +
    index +
    "'style='text-align: center'/>" +
    "</td>" +
    "<td>" +
    "<input type='text' id='parts_Day_" +
    index +
    "' value='' class='input-group form-control newPartsCycleItem newPartsCycleItem_" +
    index +
    "'style='text-align: center'/>" +
    "</td>" +
    "<td>" +
    "<input type='text' id='parts_AvgCost_" +
    index +
    "' value='' class='input-group form-control 'style='text-align: center' readonly/>" +
    "</td>" +
    "<td>" +
    "<input type='button' id='parts_Del_" +
    index +
    "' value='DEL' class='input-group form-control btn btn-danger 'style='text-align: center' onclick='del_newAddRow(this)'/>" +
    "</td>"
  );
  $("#parts_table").children("tbody").append(tr);
}
function reload_toDash() {
  refreshAllData();
  // toggle_MainSection("dashboard");
  swipeMainSection($('<div><text>Dashboard</text></div>'))
}
function reload_toOilRecord() {
  swipeMainSection($('<div><text>Oil Record</text></div>'))
}
function del_newAddRow(ele) {
  var row = $(ele).prop("id").split("_")[2];
  $(ele).parent().parent().remove();
}
function ins_Parts() {
  var vid = $("#vehiclesSelect").val().split("_")[0].replace("#", "");
  var uid = sessionStorage.getItem("uid");
  var NewItemMaxRow = $(
    $(".newPartsCycleItem")[$(".newPartsCycleItem").length - 1]
  )
    .prop("id")
    .split("_")[2];
  var date = moment().format("YYYY-MM-DD HH:mm:ss");
  var NewItemMinRow = $($(".newPartsCycleItem")[0]).prop("id").split("_")[2];
  var NewItemCnt = NewItemMaxRow - NewItemMinRow + 1;
  var InsertData = [];
  var insertValue = '';
  var insertSQL = 'insert into ' + car_MaintainTable_DBName + ' ([UserID],[PartName],[TimeCycle],[MileageCycle],[CreatedAt],[UpdatedAt]) values';
  for (i = 0; i < NewItemCnt; i++) {
    var item = {
      part: $("#parts_SortItem_" + (parseInt(NewItemMinRow) + i)).val(),
      KM: $("#parts_KM_" + (parseInt(NewItemMinRow) + i)).val(),
      day: $("#parts_Day_" + (parseInt(NewItemMinRow) + i)).val()
    };
    InsertData.push(item);
    insertValue += uid + ", '" +
      $("#parts_SortItem_" + (parseInt(NewItemMinRow) + i)).val()
      + "', '" + $("#parts_Day_" + (parseInt(NewItemMinRow) + i)).val()
      + "', '" + $("#parts_KM_" + (parseInt(NewItemMinRow) + i)).val()
      + "','" + date
      + "','" + date + "'";
  }
  insertSQL = insertSQL + '(' + insertValue + ')'
  console.log(insertSQL);

  var _para = { sql_code: insertSQL };
  loader_animate.load_start()
  getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
    .then(function (data) {
      console.log(
        "Insert Maintainness OK"
      );
      loader_animate.load_end()
      window.location.reload()
    })
    .catch(function (error) {
      loader_animate.load_end()
      alert("上傳失敗，請洽系統管理員a");
    });
}
function get_latest_odometer() {
  var vid = $("#vehiclesSelect").val().split("_")[0].replace("#", "");
  var sql_c = `
    select 
      fc.VehicleID, 
      case when max(fc.OdometerReading)>= max(pm.OdometerReading) then max(fc.OdometerReading) 
      else max(pm.OdometerReading)  
      end as max_odo
    from ${car_OilCon_DBName} fc left join ${car_MaintainTable_DBName} pm on fc.VehicleID = pm.VehicleID 
    where fc.VehicleID='${vid}'
    group by fc.VehicleID
    `
  var _para = { sql_code: sql_c };
  getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
    .then(function (data) {
      sessionStorage.setItem("latest_odometer", data.length == 0 ? 0 : data[0].max_odo);
    })
    .catch(function (error) {
      alert("上傳失敗，請洽系統管理員");
    });
}
function refreshAllData() {
  var uid = sessionStorage.getItem("uid");
  sel_Vehicles(uid)
    .then(function () {
      create_VehiclesSelectOption();
      create_VehiclesTable();
      get_latest_odometer();

    })
    .catch((error) => {
      console.error("有一個 Promise 失敗了:", error);
    });
}
// ! -- Function Area for DB data Initial ----------------------------------------------------------------------------
function sel_InspectTable(uid, vid) {
  return new Promise((resolve, reject) => {
    var sql_c =
      "select *,0 as avgCost from " + car_InspectTable_DBName + " where UserID=" + uid;
    // console.log(sql_c);

    var _para = { sql_code: sql_c };
    getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
      .then(function (data) {
        MaintainCycleTable = data;
        // console.log(
        //   "POST_MaintainCycleTable Get " +
        //   MaintainCycleTable.length +
        //   " data, Status OK"
        // );

        resolve(data); // 確保在成功時調用 resolve
      })
      .catch(function (error) {
        alert("上傳失敗，請洽系統管理員");
        reject(error); // 確保在失敗時調用 reject
      });
  });
}
function sel_recommndTable(uid, vid) {
  return new Promise((resolve, reject) => {
    var sql_c = `
      drop table if exists #rec_pm_cycle
      SELECT distinct
        pm.PartName,
        avg(pm.Cost)  over(partition by pm.PartName,pm.VehicleID)as avgCost,
        max(pm.OdometerReading) over(partition by pm.PartName,pm.VehicleID) as maxOdo ,
        min(pm.OdometerReading) over(partition by pm.PartName,pm.VehicleID) as minOdo ,
        count(pm.PartName) over(partition by pm.PartName,pm.VehicleID) as CntPart ,
        cast(((max(pm.OdometerReading) over(partition by pm.PartName,pm.VehicleID) - min(pm.OdometerReading) over(partition by pm.PartName,pm.VehicleID)) / count(pm.PartName) over(partition by pm.PartName,pm.VehicleID))as int) as avgOdo,
        max(pm.MaintenanceDate) over(partition by pm.PartName,pm.VehicleID) as maxDate ,
        min(pm.MaintenanceDate) over(partition by pm.PartName,pm.VehicleID) as minDate ,
        abs(DATEDIFF(day,max(pm.MaintenanceDate) over(partition by pm.PartName,pm.VehicleID),min(pm.MaintenanceDate) over(partition by pm.PartName,pm.VehicleID)))/count(pm.PartName) over(partition by pm.PartName,pm.VehicleID) as avgDate
        into #rec_pm_cycle
      FROM ${car_MaintainTable_DBName} as pm inner join ${car_Vehicles_DBName} as v 
      on v.VehicleID = pm.VehicleID inner join ${car_Category_DBName} as pc on pc.UserID = v.UserID  and  pc.UserID = '${uid}' and pm.VehicleID='${vid}'
      where  pc.CategoryName='保養' 
      and OdometerReading is not null and pm.PartName <>'VTEC升級'

      select * from #rec_pm_cycle where CntPart>1 and avgOdo*avgDate>0
    
    `
    // console.log(sql_c);

    var _para = { sql_code: sql_c };
    getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
      .then(function (data) {
        MaintainCycleTable = data;
        // console.log(
        //   "POST_MaintainCycleTable Get " +
        //   MaintainCycleTable.length +
        //   " data, Status OK"
        // );
        resolve(data); // 確保在成功時調用 resolve
      })
      .catch(function (error) {
        alert("上傳失敗，請洽系統管理員");
        reject(error); // 確保在失敗時調用 reject
      });
  });
}
function sel_MaintainessTable(uid, vid) {
  return new Promise((resolve, reject) => {
    var sql_c = `
      SELECT *
      FROM [JazzerLife].[CarMan].[PartsMaintenance]
      where VehicleID = ${vid}
    `
    // console.log(sql_c);

    var _para = { sql_code: sql_c };
    getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
      .then(function (data) {
        MaintainCycleTable = data;
        // console.log(
        //   "POST_MaintainCycleTable Get " +
        //   MaintainCycleTable.length +
        //   " data, Status OK"
        // );
        resolve(data); // 確保在成功時調用 resolve
      })
      .catch(function (error) {
        alert("上傳失敗，請洽系統管理員");
        reject(error); // 確保在失敗時調用 reject
      });
  });
}
function sel_Vehicles(uid) {
  return new Promise((resolve, reject) => {
    var sql_c = "select * from " + car_Vehicles_DBName + " with(nolock) ";
    sql_c += "where [UserID] = '" + uid + "' ";

    var _para = { sql_code: sql_c };
    loader_animate.load_start()
    getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
      .then(function (data) {
        vehicalsTable = data;
        loader_animate.load_end()
        // console.log(
        //   "POST_VehiclesTable Get " + vehicalsTable.length + " data, Status OK"
        // );
        resolve(); // 確保在成功時調用 resolve
      })
      .catch(function (error) {
        loader_animate.load_end()
        alert("上傳失敗，請洽系統管理員");
        reject(error); // 確保在失敗時調用 reject
      });
  });
}

function sel_FuelConsumption(vid, dime) {
  var sql_c = '';
  switch (dime) {
    case 'monthly':
      sql_c = "select top 13 "
      sql_c += "cast(datepart(YEAR,CreatedAt) as varchar) +'M'+ SUBSTRING(convert(varchar(25), CreatedAt, 120),6,2) as 'CreatedAt'";
      sql_c += ", round(AVG(FuelEfficiency),1) as 'FuelEfficiency'";
      sql_c += ",cast(cast(datepart(YEAR,CreatedAt) as varchar)+ SUBSTRING(convert(varchar(25), CreatedAt, 120),6,2) as int) as 'orderNum'";
      sql_c += " from " + car_OilCon_DBName + " with(nolock) ";
      sql_c += "where [VehicleID] = '" + vid + "' ";
      sql_c += " group by cast(datepart(YEAR,CreatedAt) as varchar) +'M'+ SUBSTRING(convert(varchar(25), CreatedAt, 120),6,2),cast(cast(datepart(YEAR,CreatedAt) as varchar)+ SUBSTRING(convert(varchar(25), CreatedAt, 120),6,2) as int)";
      sql_c += " order by orderNum desc ";
      break;
    case 'weekly':
      sql_c = "select top 13 "
      sql_c += "cast(datepart(YEAR,CreatedAt) as varchar) +'W'+cast(datepart(ISOWW,CreatedAt) as varchar) as 'CreatedAt'";
      sql_c += ", round(AVG(FuelEfficiency),1) as 'FuelEfficiency'";
      sql_c += ",round(AVG(FuelEfficiency),1) as 'FuelEfficiency',cast(cast(datepart(YEAR,CreatedAt) as varchar)+cast(datepart(ISOWW,CreatedAt) as varchar) as int) as 'orderNum'";
      sql_c += " from " + car_OilCon_DBName + " with(nolock) ";
      sql_c += "where [VehicleID] = '" + vid + "' ";
      sql_c += " group by cast(datepart(YEAR,CreatedAt) as varchar) +'W'+cast(datepart(ISOWW,CreatedAt) as varchar),cast(cast(datepart(YEAR,CreatedAt) as varchar)+cast(datepart(ISOWW,CreatedAt) as varchar) as int)";
      sql_c += "order by orderNum desc ";
      break;
    case 'dayly':
      sql_c = "select top 13 format(CreatedAt,'yyyy-MM-dd') as CreatedAt,FuelEfficiency from " + car_OilCon_DBName + " with(nolock) ";
      sql_c += "where [VehicleID] = '" + vid + "' order by CreatedAt desc";
      break;
    default:
      sql_c = "select top 30 * from " + car_OilCon_DBName + " with(nolock) ";
      sql_c += "where [VehicleID] = '" + vid + "' order by CreatedAt desc";
      break;
  }
  // console.log(sql_c);

  return new Promise((resolve, reject) => {
    var _para = { sql_code: sql_c };
    loader_animate.load_start()
    getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
      .then(function (data) {
        OilData = data;
        loader_animate.load_end()
        // console.log("POST_OilData Get " + OilData.length + " data, Status OK");
        resolve(data); // 確保在成功時調用 resolve
      })
      .catch(function (error) {
        loader_animate.load_end()
        alert("上傳失敗，請洽系統管理員");
        reject(error); // 確保在失敗時調用 reject
      });
  });
}
function getAgridData(api) {
  returnlist = []
  api.forEachNode(ele => {
    returnlist.push(ele.data)
  })
  return returnlist
}
function Update_FuelCons() {
  tmp_aggrid_data_1 = getAgridData(tmp_aggrid)
  var vid = $("#vehiclesSelect").val().split("_")[0].replace("#", "");
  var sql_c = "select top 30 * from " + car_OilCon_DBName + " with(nolock) ";
  sql_c += "where [VehicleID] = '" + vid + "' order by CreatedAt desc";
  var ori_data = getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", { sql_code: sql_c });
  ori_data.then(function (data) {
    console.log(data);
    diffData = generateUpdateSQLStatements(data, tmp_aggrid_data_1);
    loader_animate.load_start()
    getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", { sql_code: diffData }).then(function () {
      loader_animate.load_end()
      alert("上傳完成");
      reload_toOilRecord();
    }).catch(function (error) {
      loader_animate.load_end()
      alert("上傳失敗，無修改內容");
      reload_toOilRecord();
    });
  })



}
function extractKeysAndValues(data) {
  if (!data || data.length === 0) {
    return { keys: [], valuesList: [] };
  }

  // 取得欄位名稱（keys）
  const keys = Object.keys(data[0]);

  // 取得每筆資料的值（values）
  const valuesList = data.map(record => keys.map(key => record[key]));

  return { keys, valuesList };
}
function generateUpdateSQLStatements(dataA, dataB) {
  const result = [];
  dataA = extractKeysAndValues(dataA).valuesList
  dataB = extractKeysAndValues(dataB).valuesList
  // console.log(dataA)
  // console.log(dataB)
  const maxLength = Math.max(dataA.length, dataB.length);
  const columnName = [
    'RecordID'
    , 'VehicleID'
    , 'OdometerReading'
    , 'FuelAmount'
    , 'FuelCost'
    , 'DistanceTravelled'
    , 'FuelEfficiency'
    , 'CreatedAt'
    , 'UpdatedAt']
  var sql = ''
  for (let i = 0; i < maxLength; i++) {
    const rowA = dataA[i];
    const rowB = dataB[i];
    // console.log(rowB)
    // 檢查 row 是否存在、長度是否一致、是否有欄位不同
    if (
      !rowA || !rowB ||
      rowA.length !== rowB.length ||
      rowA.some((val, idx) => val !== rowB[idx])
    ) {
      const vehicleID = rowA?.[1] ?? rowB?.[1];
      const recordID = rowA?.[0] ?? rowB?.[0];

      // 產出 SET 區段 placeholder
      const setClauses = rowB
        .map((val, idx) => `${columnName[idx]} = '${val}'`)
        .join(", ");

      // 產出 SQL

      sql += ` UPDATE ${car_OilCon_DBName} SET `
      for (j = 2; j < columnName.length; j++) {
        if (j == columnName.length - 1) {
          sql += ` ${columnName[j]}='${moment().format("YYYY-MM-DD HH:mm:ss")}'`
        } else {
          sql += ` ${columnName[j]}='${rowB?.[j]}',`
        }
      }
      sql += ` WHERE VehicleID = ${vehicleID} and RecordID=${recordID};`;

    }
  }
  // console.log(sql)
  return sql;
}
function datatoseries(data, dataframe) {
  data_set = {}
  header = data.map(x => x.CreatedAt)
  body = data.map(x => x.FuelEfficiency)
  data_set['header'] = header
  data_set['body'] = body
  return data_set

}
function highchart_maker(data) {
  var data_set = datatoseries(data);

  Highcharts.chart('chart_area', {
    chart: {
      type: 'area'
    },

    title: {
      text: '油耗',
      align: 'left'
    },

    subtitle: {
      text: '',
      align: 'left'
    },

    yAxis: {
      title: {
        text: 'Number of Employees'
      }
    },

    xAxis: {
      categories: data_set.header
    },

    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle'
    },

    plotOptions: {
      series: data_set.header
    },

    series: [{
      name: 'Oil-Consomer',
      data: data_set.body
    },],

    responsive: {
      rules: [{
        condition: {
          maxWidth: 500
        },
        chartOptions: {
          legend: {
            layout: 'area',
            align: 'center',
            verticalAlign: 'bottom'
          }
        }
      }]
    }

  });
}

class app {
  constructor() {
    this.cycleTable = null;
    this.load_initial_data();
  }
  // function area -----------------------------------------------------------------------------
  // ! -- Main Area ------------------------------------------------------------------------------
  load_initial_data() {
    // load initial data when page load
    var uid = sessionStorage.getItem("uid");
    var sql = config.gen_sql('get_Part_cycle_table', { "uid": uid });
    var _para = { sql_code: sql };
    var selfObj = this;
    var cycleTable_Promise = getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
      .then(function (data) {
        selfObj.cycleTable = data;
        console.log(data);
      });
    Promise.all([cycleTable_Promise])
      .then(function () {
        console.log("All initial data loaded.");
      })
      .catch(function (error) {
        console.error("Error loading initial data:", error);
      });
  }
}

// ! -- Main Area ------------------------------------------------------------------------------
$(document).ready(function () {
  checkSignInStatus();
  refreshAllData();
  window.app = new app();
});
