/* JeevanSetu prototype – demo login only (no real authentication yet). */
(function () {
  "use strict";

  var ROLES = {
    parent:  { label: "Parent",      page: "parent.html",       secret: "otp" },
    asha:    { label: "ASHA worker", page: "healthworker.html", secret: "password" },
    doctor:  { label: "Doctor",      page: "clinic.html",       secret: "password" },
    teacher: { label: "Teacher",     page: "school.html",       secret: "password" }
  };

  /* Storage can be blocked (for example on some file:// setups), so never let it break the page. */
  function save(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }
  function load(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function clearSession() {
    try { sessionStorage.removeItem("js_role"); sessionStorage.removeItem("js_mobile"); } catch (e) { /* ignore */ }
  }
  function maskMobile(m) {
    return m && m.length >= 4 ? "XXXXXX" + m.slice(-4) : "";
  }

  /* ---------- Home page ---------- */
  function initHome() {
    var form = document.getElementById("login-form");
    if (!form) return;

    var mobile = document.getElementById("mobile");
    var secret = document.getElementById("secret");
    var secretLabel = document.getElementById("secret-label");
    var secretHint = document.getElementById("secret-hint");
    var sendOtp = document.getElementById("send-otp");
    var error = document.getElementById("form-error");

    function selectedRole() {
      return form.querySelector('input[name="role"]:checked').value;
    }

    function showError(message) {
      error.textContent = message;
      error.hidden = false;
    }
    function clearError() {
      error.textContent = "";
      error.hidden = true;
    }

    function applyRole() {
      var role = ROLES[selectedRole()];
      var isOtp = role.secret === "otp";
      secret.value = "";
      secret.type = isOtp ? "text" : "password";
      secret.setAttribute("inputmode", isOtp ? "numeric" : "text");
      secret.maxLength = isOtp ? 6 : 64;
      secret.placeholder = isOtp ? "6-digit OTP" : "Password";
      secret.autocomplete = isOtp ? "one-time-code" : "current-password";
      secretLabel.textContent = isOtp ? "OTP" : "Password";
      var hints = {
        parent: "Parents sign in with a one-time password sent by SMS.",
        asha: "ASHA workers sign in with the password given by their health centre.",
        doctor: "Doctors sign in with the password given by their clinic.",
        teacher: "Teachers sign in with the password given by their school."
      };
      secretHint.textContent = hints[selectedRole()];
      sendOtp.hidden = !isOtp;
      clearError();
    }

    form.addEventListener("change", function (e) {
      if (e.target && e.target.name === "role") applyRole();
    });

    mobile.addEventListener("input", function () {
      mobile.value = mobile.value.replace(/\D/g, "").slice(0, 10);
    });

    sendOtp.addEventListener("click", function () {
      clearError();
      if (!/^\d{10}$/.test(mobile.value)) {
        showError("Enter a 10-digit mobile number to get an OTP.");
        mobile.focus();
        return;
      }
      secretHint.textContent = "OTP sent to " + maskMobile(mobile.value) + ". Demo: enter any 6 digits.";
      secret.focus();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();

      var key = selectedRole();
      var role = ROLES[key];

      if (!/^\d{10}$/.test(mobile.value)) {
        showError("Enter a valid 10-digit mobile number.");
        mobile.focus();
        return;
      }
      if (role.secret === "otp" && !/^\d{6}$/.test(secret.value)) {
        showError("Enter the 6-digit OTP.");
        secret.focus();
        return;
      }
      if (role.secret === "password" && secret.value.length === 0) {
        showError("Enter your password.");
        secret.focus();
        return;
      }

      save("js_role", key);
      save("js_mobile", mobile.value);
      window.location.href = role.page;
    });

    applyRole();
  }

  /* ---------- Role pages ---------- */
  function initRolePage() {
    var key = document.body.getAttribute("data-role");
    var role = ROLES[key];
    if (!role) return;

    var badge = document.getElementById("role-badge");
    var who = document.getElementById("who");
    var signout = document.getElementById("signout");

    if (badge) badge.textContent = role.label;

    if (who) {
      var masked = maskMobile(load("js_mobile") || "");
      who.textContent = masked ? "Signed in with " + masked : "Demo session";
    }

    if (signout) {
      signout.addEventListener("click", function () {
        clearSession();
        window.location.href = "index.html";
      });
    }
  }

  if (document.body.getAttribute("data-page") === "home") initHome();
  if (document.body.getAttribute("data-page") === "role") initRolePage();
})();