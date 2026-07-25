// ! -- Global Area --------------------------------------------------------------------------

// Example starter JavaScript for disabling form submissions if there are invalid fields
(function () {
  "use strict";

  window.addEventListener(
    "load",
    function () {
      // Fetch all the forms we want to apply custom Bootstrap validation styles to
      var forms = document.getElementsByClassName("needs-validation");

      // Loop over them and prevent submission
      Array.prototype.filter.call(forms, function (form) {
        form.addEventListener(
          "submit",
          function (event) {
            if (form.checkValidity() === false) {
              event.preventDefault();
              event.stopPropagation();
            }

            form.classList.add("was-validated");
          },
          false
        );
      });
    },
    false
  );
})();
// ! -- Function Area ----------------------------------------------------------------------

function registerData_check(data) {
  var chk_rlt = "";

  // todo 2 檢查pwd ....
  if (data.password == NaN || data.password == "") {
    chk_rlt += "密碼不可為空\n";
  } else if (data.password.length < 6 || data.password.length > 20) {
    chk_rlt += "密碼長度須為6~20碼\n";
  }
  // todo 3 檢查username ....
  if (data.username == NaN || data.username == "") {
    chk_rlt += "username不可為空\n";
  } else if (data.username.length < 6 || data.username.length > 20) {
    chk_rlt += "username長度須為6~20碼\n";
  }
  // todo 4 檢查email ....
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (data.email == NaN || data.email == "") {
    chk_rlt += "email不可為空\n";
  } else if (!emailRegex.test(data.email)) {
    chk_rlt += "email格式不正確\n";
  }
  // todo 5 檢查phone ....
  const phoneRegex = /09[0-9]{8,8}$/;
  if (data.phone == NaN || data.phone == "") {
    chk_rlt += "phone不可為空\n";
  } else if (data.phone.length != 10) {
    chk_rlt += "phone長度須為10碼\n";
  } else if (!phoneRegex.test(data.phone)) {
    chk_rlt += "phone格式不正確\n";
  }
  // todo end summary ....
  if (chk_rlt == "") {
    return true;
  } else {
    alert(chk_rlt);
    return false;
  }
}
function register(btn) {
  registerdata = {
    username: $("#username").val(),
    email: $("#email").val(),
    password: $("#password").val(),
    phone: $("#phoneNumber").val(),
  };
  chk_rlt = registerData_check(registerdata);
  if (chk_rlt) {
    sbmit_regisData(registerdata);
  }
}
function WriteUserName(ele) {
  if ($("#username").val() == "") {
    $("#username").val(ele.value.split("@")[0]);
  }
}
function sbmit_regisData(registerdata) {
  // console.log(registerdata);

  const query_promise1 = new Promise((resolve, reject) => {
    var sql_c =
      "INSERT INTO " +
      mem_User_DBName +
      " (UserName, Email, PasswordHash, PhoneNumber)";
    sql_c +=
      "VALUES ('" +
      registerdata.username +
      "', '" +
      registerdata.email +
      "', '" +
      registerdata.password +
      "', '" +
      registerdata.phone +
      "')";

    var _para = { sql_code: sql_c };
    getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
      .then((data) => resolve(data))
      .catch((error) => reject(error));
  });
  query_promise1.then(function () {
    alert("註冊完成！");
    const query_promise2 = new Promise((resolve, reject) => {
      var sql_c = "select * from " + mem_User_DBName + " with(nolock) ";
      sql_c +=
        "where [UserName] = '" +
        registerdata.username +
        "' and [PasswordHash] = '" +
        registerdata.password +
        "' ";

      var _para = { sql_code: sql_c };
      getAjaxData_promise("../assets/asmx/xasmx.asmx", "meta_sql", _para)
        .then((data) => resolve(data))
        .catch((error) => reject(error));
    });
    query_promise2.then(function (data) {
      sessionStorage.setItem("account", registerdata.username);
      sessionStorage.setItem("password", registerdata.password);
      sessionStorage.setItem("uid", data[0].UserID);
      window.location.assign("index.html");
    });
  });
}
// ! -- Main Area ------------------------------------------------------------------------------
