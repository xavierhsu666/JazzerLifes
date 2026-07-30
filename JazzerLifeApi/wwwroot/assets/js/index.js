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

// note: 每個子專案都各自獨立的子目錄（/<folder>/<folder>.html），
// 是為了讓每個專案能各自擁有獨立的 manifest.json / scope，安裝成不同的 PWA，
// 不可以攤平到根目錄，否則多個專案會共用同一個 PWA scope。
function checkLogStatus(folder) {
  if (!folder) {
    console.warn("checkLogStatus: 缺少 folder 參數");
    return;
  }
  var targetUrl = "/" + folder + "/" + folder + ".html";
  $.get("/api/auth/me")
    .done(function () {
      window.location.assign(targetUrl);
    })
    .fail(function () {
      window.location.assign("signin.html#" + folder + "/" + folder);
    });
}
// ! -- Main Area ------------------------------------------------------------------------------
checkSignInStatus();
