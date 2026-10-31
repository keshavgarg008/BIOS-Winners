/* JeevanSetu prototype: register to get a unique ID, then sign in with that ID.
   Accounts are kept in this browser only (localStorage). There is no server yet,
   so an ID made on one device cannot sign in on another until sync is added. */
(function () {
  "use strict";

  var ROLES = {
    parent:  { label: "Parent",      letter: "P", page: "parent.html",       place: "Village or town" },
    asha:    { label: "ASHA worker", letter: "A", page: "healthworker.html", place: "Health centre or village" },
    doctor:  { label: "Doctor",      letter: "D", page: "clinic.html",       place: "Clinic name" },
    teacher: { label: "Teacher",     letter: "T", page: "school.html",       place: "School name" }
  };

  /* No I, L, O, 0 or 1, so IDs are easy to read out and copy by hand. */
  var ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  var USERS_KEY = "js_users";
  var SESSION_KEY = "js_user";

  /* Message in the chosen language (settings.js provides jsT). */
  function t(key, fallback) {
    return (window.jsT && window.jsT(key, fallback)) || fallback;
  }

  /* ---------- storage (never let blocked storage break the page) ---------- */
  function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function lsSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } }
  function ssGet(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
  function ssSet(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* ignore */ } }
  function ssRemove(key) { try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ } }

  function loadUsers() {
    try { return JSON.parse(lsGet(USERS_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function saveUsers(users) { return lsSet(USERS_KEY, JSON.stringify(users)); }

  /* ---------- unique IDs ---------- */
  function randomChars(n) {
    var out = "";
    var limit = 256 - (256 % ALPHABET.length); /* skip biased values */
    while (out.length < n) {
      var bytes = new Uint8Array(n);
      window.crypto.getRandomValues(bytes);
      for (var i = 0; i < bytes.length && out.length < n; i++) {
        if (bytes[i] < limit) out += ALPHABET[bytes[i] % ALPHABET.length];
      }
    }
    return out;
  }

  /* Eight random characters keep IDs unique even when two offline devices
     register people at the same time. Example: GS-P-7K3Q-9XMD */
  function newId(roleKey, users) {
    var id;
    do {
      var s = randomChars(8);
      id = "GS-" + ROLES[roleKey].letter + "-" + s.slice(0, 4) + "-" + s.slice(4);
    } while (users[id]);
    return id;
  }

  function strip(id) { return String(id || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }

  function findUser(users, typedId) {
    var wanted = strip(typedId);
    if (!wanted) return null;
    for (var id in users) {
      if (Object.prototype.hasOwnProperty.call(users, id) && strip(id) === wanted) return users[id];
    }
    return null;
  }

  /* ---------- password hashing (salted SHA-256 where the browser allows it) ---------- */
  function weakHash(str) { /* fallback only when crypto.subtle is missing; prototype use */
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return "weak:" + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  function hashPassword(password, salt) {
    var text = salt + ":" + password;
    var subtle = window.crypto && window.crypto.subtle;
    if (!subtle || typeof TextEncoder === "undefined") return Promise.resolve(weakHash(text));
    return subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
      var hex = "";
      var view = new Uint8Array(buf);
      for (var i = 0; i < view.length; i++) hex += ("0" + view[i].toString(16)).slice(-2);
      return "s256:" + hex;
    });
  }

  function maskMobile(m) { return m && m.length >= 4 ? "XXXXXX" + m.slice(-4) : ""; }

  /* ---------- shared UI helpers ---------- */
  function showError(message) {
    var box = document.getElementById("form-error");
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
  }
  function clearError() {
    var box = document.getElementById("form-error");
    if (!box) return;
    box.textContent = "";
    box.hidden = true;
  }

  /* ---------- Home: sign in with the unique ID ---------- */
  function initHome() {
    var form = document.getElementById("login-form");
    if (!form) return;
    var uid = document.getElementById("uid");
    var password = document.getElementById("password");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();

      if (!uid.value.trim()) { showError(t("err_uid", "Enter your unique ID.")); uid.focus(); return; }
      if (!password.value) { showError(t("err_pw", "Enter your password.")); password.focus(); return; }

      var user = findUser(loadUsers(), uid.value);
      var wrong = t("err_bad", "The ID or password is not correct. Check them and try again.");
      if (!user) { showError(wrong); return; }

      hashPassword(password.value, user.salt).then(function (hash) {
        if (hash !== user.hash) { showError(wrong); return; }
        ssSet(SESSION_KEY, user.id);
        window.location.href = ROLES[user.role].page; /* role comes from the account, not from a choice */
      });
    });
  }

  /* ---------- Register ---------- */
  function initRegister() {
    var form = document.getElementById("register-form");
    if (!form) return;

    var placeLabel = document.getElementById("place-label");
    var place = document.getElementById("place");
    var mobile = document.getElementById("mobile");
    var button = document.getElementById("register-btn");

    function selectedRole() {
      var checked = form.querySelector('input[name="role"]:checked');
      return checked ? checked.value : "";
    }

    form.addEventListener("change", function (e) {
      if (e.target && e.target.name === "role") {
        var key = "place_" + e.target.value;
        placeLabel.setAttribute("data-i18n", key); /* keeps the label right if the language changes */
        placeLabel.textContent = t(key, ROLES[e.target.value].place);
        clearError();
      }
    });

    mobile.addEventListener("input", function () {
      mobile.value = mobile.value.replace(/\D/g, "").slice(0, 10);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();

      var roleKey = selectedRole();
      var name = form.elements["name"].value.trim();
      var mob = mobile.value;
      var placeValue = place.value.trim();
      var pw = form.elements["password"].value;
      var confirm = form.elements["confirm"].value;

      if (!roleKey) { showError(t("err_role", "Choose who you are registering as.")); return; }
      if (name.length < 2) { showError(t("err_name", "Enter your full name.")); form.elements["name"].focus(); return; }
      if (!/^\d{10}$/.test(mob)) { showError(t("err_mobile", "Enter a valid 10-digit mobile number.")); mobile.focus(); return; }
      if (!placeValue) { showError(t("err_place", "Enter your village, clinic or school name.")); place.focus(); return; }
      if (pw.length < 6) { showError(t("err_pw_len", "Your password needs at least 6 characters.")); form.elements["password"].focus(); return; }
      if (pw !== confirm) { showError(t("err_pw_match", "The two passwords do not match.")); form.elements["confirm"].focus(); return; }

      var users = loadUsers();
      for (var existing in users) {
        if (Object.prototype.hasOwnProperty.call(users, existing) &&
            users[existing].mobile === mob && users[existing].role === roleKey) {
          showError(t("err_dup", "This mobile number is already registered for this role. Sign in with your unique ID instead."));
          return;
        }
      }

      button.disabled = true;
      var salt = randomChars(16);
      hashPassword(pw, salt).then(function (hash) {
        var id = newId(roleKey, users);
        users[id] = {
          id: id, role: roleKey, name: name, mobile: mob, place: placeValue,
          salt: salt, hash: hash, createdAt: new Date().toISOString()
        };
        if (!saveUsers(users)) {
          button.disabled = false;
          showError(t("err_storage", "This browser is blocking storage, so the account could not be saved. Open the site with Chrome or from a local server."));
          return;
        }
        ssSet(SESSION_KEY, id);
        showSuccess(id, roleKey);
      });
    });

    function showSuccess(id, roleKey) {
      document.getElementById("register-card").hidden = true;
      document.getElementById("success-card").hidden = false;
      document.getElementById("new-id").textContent = id;
      document.getElementById("go-page").setAttribute("href", ROLES[roleKey].page);
      document.getElementById("success-title").focus();

      var copy = document.getElementById("copy-id");
      var status = document.getElementById("copy-status");
      copy.addEventListener("click", function () {
        function done(ok) {
          status.textContent = ok ? t("copied", "Copied") : t("copy_manual", "Select the ID and copy it by hand.");
          setTimeout(function () { status.textContent = ""; }, 2500);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(id).then(function () { done(true); }, function () { done(false); });
        } else {
          done(false);
        }
      });
    }
  }

  /* ---------- Role pages (parent, healthworker, clinic, school) ---------- */
  function initRolePage() {
    var key = document.body.getAttribute("data-role");
    var role = ROLES[key];
    if (!role) return;

    function $(id) { return document.getElementById(id); }
    var guard = $("guard"), guardText = $("guard-text"), guardLink = $("guard-link");
    var content = $("content"), badge = $("role-badge"), who = $("who");
    var welcome = $("welcome"), signout = $("signout");

    var id = ssGet(SESSION_KEY);
    var user = id ? loadUsers()[id] : null;

    function blocked(message, linkText, href) {
      if (guardText) guardText.textContent = message;
      if (guardLink) { guardLink.textContent = linkText; guardLink.setAttribute("href", href); }
      if (guard) guard.hidden = false;
      if (content) content.hidden = true;
      if (signout) signout.hidden = true;
      if (badge) badge.hidden = true;
    }

    if (!user) {
      blocked("You are not signed in.", "Go to sign in", "index.html");
    } else if (user.role !== key) {
      blocked("This page is for " + role.label + "s. Your page is the " + ROLES[user.role].label + " page.",
              "Go to my page", ROLES[user.role].page);
    } else {
      if (badge) badge.textContent = role.label;
      if (who) who.textContent = user.name + ", ID " + user.id;
      if (welcome) welcome.textContent = "Welcome, " + user.name + ".";
      if (content) content.hidden = false;
      if (guard) guard.hidden = true;
    }

    if (signout) {
      signout.addEventListener("click", function () {
        ssRemove(SESSION_KEY);
        window.location.href = "index.html";
      });
    }
  }

  var page = document.body && document.body.getAttribute("data-page");
  if (page === "home") initHome();
  if (page === "register") initRegister();
  if (page === "role") initRolePage();

  /* Lets the helpers be tested in Node. */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { newId: newId, strip: strip, findUser: findUser, hashPassword: hashPassword, ROLES: ROLES };
  }
})();