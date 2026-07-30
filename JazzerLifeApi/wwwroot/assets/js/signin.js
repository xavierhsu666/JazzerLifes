// ! -- Global Area ------------------------------------------------------------------------
var REMEMBER_ME_KEY = "jazzerlife_remember_account";

// ! -- Function Area ----------------------------------------------------------------------
// 「記住帳密」實際上是：
//   1. 記住帳號 -> 存到 localStorage，下次開啟登入頁自動帶入。
//   2. 記住登入狀態 -> 由後端簽發「持久化 Cookie」(IsPersistent)，關閉瀏覽器後仍維持登入，
//      不再需要重新輸入密碼。
// 密碼本身不會被存在瀏覽器端（localStorage/sessionStorage 明碼存密碼有外洩風險），
// 這點與單純把帳密都寫進 localStorage 的做法不同，但能達到「不用每次都重新輸入」的體驗。
function loadRememberedAccount() {
  try {
    var savedAccount = localStorage.getItem(REMEMBER_ME_KEY);
    if (savedAccount) {
      $("#account").val(savedAccount);
      $("#rememberMe").prop("checked", true);
      $("#password").focus();
    }
  } catch (e) {
    // 部分瀏覽器（無痕模式等）可能禁用 localStorage，讀取失敗時忽略即可，不影響登入功能
    console.warn("讀取記住的帳號失敗：", e);
  }
}

function saveRememberedAccount(account, remember) {
  try {
    if (remember) {
      localStorage.setItem(REMEMBER_ME_KEY, account);
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  } catch (e) {
    console.warn("儲存記住的帳號失敗：", e);
  }
}
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
  var rememberMe = $("#rememberMe").is(":checked");
  var signindata = {
    account: $("#account").val(),
    password: $("#password").val(),
    rememberMe: rememberMe,
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
      saveRememberedAccount(signindata.account, rememberMe);
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
$(document).ready(function () {
  loadRememberedAccount();
});