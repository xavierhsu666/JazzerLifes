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

  var $btn = $(btn);
  var originalHtml = $btn.html();
  var $inputs = $("#account, #password");

  // 顯示 loading 動畫（Bootstrap spinner）+ 停用按鈕與輸入框，避免重複送出
  $btn.prop("disabled", true).html(
    '<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>登入中...'
  );
  $inputs.prop("disabled", true);

  $.ajax({
    url: "/api/auth/login",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify(signindata),
    success: function (data) {
      // 登入成功後會導頁離開，spinner 維持顯示直到頁面切換即可，不需還原按鈕狀態
      if (sourcePage != undefined) {
        window.location.assign("./" + sourcePage + ".html");
      } else {
        window.location.assign("./index.html");
      }
    },
    error: function (xhr) {
      alert("帳號或密碼錯誤，請重新嘗試!");
      $btn.prop("disabled", false).html(originalHtml);
      $inputs.prop("disabled", false);
    },
  });
}

// ! -- Main Area ------------------------------------------------------------------------------
$(document).ready(function () {});