// ! -- Global Area ----------------------------------------------------------------------

// ! -- Function Area ----------------------------------------------------------------------
function checkSignInStatus() {
  acc = sessionStorage.getItem("account");
  pwd = sessionStorage.getItem("password");

  $("#navSign").children().remove();

  if (acc != null && pwd != null) {
    $("#navSign").prop("text", "LogOut");
    $("#loginbtn").html(acc.toUpperCase() + " &raquo;");
    $("#loginbtn").prop("href", "./index.html");

    $("#logoutbtn").html("Log-Out &raquo;");
    $("#logoutbtn").prop("href", "");

    $("#navSign").on("click", function () {
      sessionStorage.clear();
      window.location.assign("./index.html");
    });$("#logoutbtn").on("click", function () {
      sessionStorage.clear();
      window.location.assign("./index.html");
    });
  } else {
    $("#navSign").prop("href", "signin.html#index");
    $("#navSign").prop("text", "Sign");
  }
}
function checkLogStatus(href) {
  acc = sessionStorage.getItem("account");
  pwd = sessionStorage.getItem("password");

  if (acc != null && pwd != null) {
    window.location.assign(href);
  } else {
    window.location.assign("signin.html#" + href.split(".")[0]);
  }
}
// ! -- Main Area ------------------------------------------------------------------------------
checkSignInStatus();
