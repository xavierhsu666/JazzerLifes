/****************************************
          Ajax (get and send)
*****************************************/

function getAjaxData(file_name, function_name, parameter) {
  var ajax_data;
  var _parameter =
    parameter["Non_parameter"] != "Non_parameter"
      ? JSON.stringify(parameter)
      : "";

  $.ajax({
    type: "POST",
    contentType: "application/json; charset=utf-8",
    url: file_name + "/" + function_name,
    data: _parameter,
    dataType: "json",
    async: false,
    cache: false,
    ifModified: true,
    timeout: 3000,
    success: function (response) {
      ajax_data = JSON.parse(response.d);
    },
    error: function (request, status, error) {
      alert("Please, refresh the page.");
    },
  });
  return ajax_data;
}
function getAjaxData_promise(file_name, function_name, parameter) {
  var _parameter =
    parameter["Non_parameter"] != "Non_parameter"
      ? JSON.stringify(parameter)
      : "";

  return new Promise((resolve, reject) => {
    $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: file_name + "/" + function_name,
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
        // 詳細診斷資訊：httpStatus=0 通常是 timeout/網路問題；500 為伺服器/SQL 錯誤
        console.error("[ajax] getAjaxData_promise 失敗", {
          url: file_name + "/" + function_name,
          httpStatus: request.status,
          statusText: request.statusText,
          textStatus: status,
          errorThrown: error,
          responseText: request.responseText,
        });
        var msg =
          status === "timeout"
            ? "請求逾時（超過 " + 3000 + "ms），可能是查詢太慢或後端無回應"
            : "HTTP " + request.status + " " + request.statusText + " (" + status + ")";
        reject(new Error(msg));
        alert("Please, refresh the page.");
      },
    });
  });
}

function sendAjaxData(file_name, function_name, parameter) {
  // console.log('Jimmy Checking User Names123')
  // console.log(parameter)
  var response_after_ajax;
  var _parameter =
    parameter["Non_parameter"] != "Non_parameter"
      ? JSON.stringify(parameter)
      : "";

  $.ajax({
    type: "POST",
    contentType: "application/json; charset=utf-8",
    url: file_name + "/" + function_name,
    data: _parameter,
    dataType: "json",
    timeout: 3000,
    async: false,
    cache: false,
    ifModified: true,
    success: function (response) {
      response_after_ajax = response.d;
    },
    error: function (request, status, error) {
      alert("Please, refresh the page.");
    },
  });

  return response_after_ajax;
}