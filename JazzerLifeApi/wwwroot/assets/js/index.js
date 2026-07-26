// ! -- Global Area ----------------------------------------------------------------------

// ! -- Function Area ----------------------------------------------------------------------
// 實際登入狀態一律以 /api/auth/me（Cookie-based Session）為準，
// 舊版用 sessionStorage 存 account/password 的判斷方式已不再對應現行登入流程（signin.js 早已改呼叫
// /api/auth/login 簽發 HttpOnly Cookie，不會寫入 sessionStorage），故在此徹底改用真正的登入狀態查詢。
function checkSignInStatus() {
  $.get("/api/auth/me")
    .done(function (data) {
      renderSignedIn(data.account);
    })
    .fail(function () {
      renderSignedOut();
    });
}

function renderSignedIn(account) {
  var displayName = (account || "").toUpperCase();
  $("#loginbtn")
    .html("👤 " + displayName)
    .prop("href", "#")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();
    });

  $("#logoutbtn")
    .html("Log-Out &raquo;")
    .prop("href", "#")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();
      doLogout();
    });
}

function renderSignedOut() {
  $("#loginbtn").html("Log-In &raquo;").prop("href", "signin.html#index").off("click");
  $("#logoutbtn").html("Register &raquo;").prop("href", "regis.html").off("click");
}

function doLogout() {
  $.post("/api/auth/logout").always(function () {
    window.location.assign("./index.html");
  });
}

function checkLogStatus(href) {
  $.get("/api/auth/me")
    .done(function () {
      window.location.assign(href);
    })
    .fail(function () {
      window.location.assign("signin.html#" + href.split(".")[0]);
    });
}
// ! -- Main Area ------------------------------------------------------------------------------
checkSignInStatus();
