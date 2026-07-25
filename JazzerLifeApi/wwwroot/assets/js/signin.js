// ! -- Global Area ------------------------------------------------------------------------
// ! -- Function Area ----------------------------------------------------------------------
function signinData_check(data) {
  var chk_rlt = "";
  if (data.account == "") {
    chk_rlt += "帳號不可為空\n";
  } else if (data.account.length < 6 || data.account.length > 20) {
    chk_rlt += "帳號長度須為6~20碼\n";
  }
  if (data.password == "") {
    chk_rlt += "密碼不可為空\n";
  } else if (data.password.length < 6 || data.password.length > 20) {
    chk_rlt += "密碼長度須為6~20碼\n";
  }

  if (chk_rlt == "") {
    return true;
  } else {
    return false;
  }
}

function clickSubmit(btn) {
  var signindata = {
    account: $("#account").val(),
    password: $("#password").val(),
  };

  var format_chk_rlt = signinData_check(signindata);
  if (!format_chk_rlt) {
    alert("帳號或密碼錯誤，請重新嘗試!");
    window.location.reload();
    return;
  }

  var originalText = $(btn).text();
  $(btn).prop("disabled", true).text("登入中...");

  $.ajax({
    url: "/api/auth/login",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify(signindata),
    success: function (data) {
      if (sourcePage != undefined) {
        window.location.assign("./" + sourcePage + ".html");
      } else {
        window.location.assign("./index.html");
      }
    },
    error: function (xhr) {
      alert("帳號或密碼錯誤，請重新嘗試!");
      $(btn).prop("disabled", false).text(originalText);
    },
  });
}

// ! -- Main Area ------------------------------------------------------------------------------
$(document).ready(function () {});