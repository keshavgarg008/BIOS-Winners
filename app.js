// 1. Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA0jfGOn0KL_6i5skQuf1s6TWOm5XNyP6w",
  authDomain: "syncedd.firebaseapp.com",
  projectId: "syncedd",
  storageBucket: "syncedd.firebasestorage.app",
  messagingSenderId: "784392339011",
  appId: "1:784392339011:web:36a0ef8994e21d2dda9ef6",
  measurementId: "G-8YVJKBCGFL"
};

const app = initializeApp(firebaseConfig);
isSupported().then((ok) => { if (ok) getAnalytics(app); }).catch(() => {});
const auth = getAuth(app);
const db = initializeFirestore(app, { localCache: persistentLocalCache() });

// ==========================================
// JEEVANSETU CORE CONFIGURATION
// ==========================================
const ROLES = {
  parent:  { label: "Parent",      letter: "P", page: "parent.html",       place: "Village or town" },
  asha:    { label: "ASHA worker", letter: "A", page: "healthworker.html", place: "Health centre or village" },
  doctor:  { label: "Doctor",      letter: "D", page: "clinic.html",       place: "Clinic name" },
  teacher: { label: "Teacher",     letter: "T", page: "school.html",       place: "School name" }
};

const USERS_KEY = "js_users";
const SESSION_KEY = "js_user";
const EMAIL_DOMAIN = "@jeevansetu.local";

function t(key, fallback) { return (window.jsT && window.jsT(key, fallback)) || fallback; }

// ==========================================
// LOCAL STORAGE
// ==========================================
function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function lsSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } }
function ssSet(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* ignore */ } }
function ssRemove(key) { try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ } }

function loadUsers() {
  try { return JSON.parse(lsGet(USERS_KEY) || "{}") || {}; } catch (e) { return {}; }
}
function saveUsers(users) { return lsSet(USERS_KEY, JSON.stringify(users)); }

// ==========================================
// USERNAME, EMAIL AND PROFILE HELPERS
// ==========================================
function emailFor(username) { return username + EMAIL_DOMAIN; }
function usernameFromEmail(email) { return String(email || "").split("@")[0]; }

function cacheProfile(username, p) {
  const users = loadUsers();
  users[username] = { id: username, role: p.role, name: p.name, mobile: p.mobile, place: p.place };
  saveUsers(users);
}

// Read the profile from Firestore; fall back to this device's copy if offline
async function getProfile(username) {
  try {
    const snap = await getDoc(doc(db, "users", username));
    if (!snap.exists()) return null;
    const p = snap.data();
    cacheProfile(username, p);
    return p;
  } catch (e) {
    return loadUsers()[username] || null;
  }
}

// ==========================================
// UI HELPERS
// ==========================================
function showError(message) {
  const box = document.getElementById("form-error");
  if (!box) return;
  box.textContent = message;
  box.hidden = false;
}
function clearError() {
  const box = document.getElementById("form-error");
  if (!box) return;
  box.textContent = "";
  box.hidden = true;
}

// ==========================================
// PAGE: HOME / LOGIN
// ==========================================
function initHome() {
  const form = document.getElementById("login-form");
  if (!form) return;
  const uid = document.getElementById("uid");
  const password = document.getElementById("password");
  const btn = document.getElementById("signin-btn");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearError();

    const username = uid.value.trim().toLowerCase();
    if (!username) { showError(t("err_uid", "Enter your Username.")); uid.focus(); return; }
    if (!password.value) { showError(t("err_pw", "Enter your password.")); password.focus(); return; }

    if (btn) btn.disabled = true;

    try {
      await signInWithEmailAndPassword(auth, emailFor(username), password.value);
    } catch (error) {
      if (btn) btn.disabled = false;
      if (error.code === "auth/network-request-failed") {
        showError("No internet connection. Sign in needs internet the first time on this device.");
      } else {
        showError("The Username or password is not correct. Check them and try again.");
      }
      console.error("Login Error:", error.code);
      return;
    }

    const profile = await getProfile(username);
    if (!profile || !ROLES[profile.role]) {
      await signOut(auth);
      if (btn) btn.disabled = false;
      showError("No profile was found for this Username. Please register first.");
      return;
    }

    ssSet(SESSION_KEY, username);
    window.location.href = ROLES[profile.role].page;
  });
}

// ==========================================
// PAGE: REGISTER
// ==========================================
function registerErrorMessage(err) {
  switch (err.code) {
    case "auth/email-already-in-use":
      return "That Username is already taken! Please try a different one.";
    case "auth/weak-password":
      return "Your password is too weak. Use at least 6 characters.";
    case "auth/network-request-failed":
      return "No internet connection. Registration needs internet. Please try again when you're online.";
    case "permission-denied":
      return "The server rejected the profile. The Firestore rules need updating.";
    default:
      return "Registration failed. " + (err.message || "");
  }
}

function initRegister() {
  const form = document.getElementById("register-form");
  if (!form) return;

  const placeLabel = document.getElementById("place-label");
  const place = document.getElementById("place");
  const mobile = document.getElementById("mobile");
  const button = document.getElementById("register-btn");

  function selectedRole() {
    const checked = form.querySelector('input[name="role"]:checked');
    return checked ? checked.value : "";
  }

  form.addEventListener("change", function (e) {
    if (e.target && e.target.name === "role") {
      const key = "place_" + e.target.value;
      placeLabel.setAttribute("data-i18n", key);
      placeLabel.textContent = t(key, ROLES[e.target.value].place);
      clearError();
    }
  });

  mobile.addEventListener("input", function () {
    mobile.value = mobile.value.replace(/\D/g, "").slice(0, 10);
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearError();

    const roleKey = selectedRole();
    const name = form.elements["name"].value.trim();
    const username = form.elements["username"].value.trim().toLowerCase();
    const mob = mobile.value;
    const placeValue = place.value.trim();
    const pw = form.elements["password"].value;
    const confirm = form.elements["confirm"].value;

    if (!roleKey) { showError("Choose who you are registering as."); return; }
    if (name.length < 2) { showError("Enter your full name."); form.elements["name"].focus(); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      showError("Username must be 3-20 characters, using only letters, numbers, or underscores (no spaces).");
      form.elements["username"].focus(); return;
    }
    if (!/^\d{10}$/.test(mob)) { showError("Enter a valid 10-digit mobile number."); mobile.focus(); return; }
    if (!placeValue) { showError("Enter your village, clinic or school name."); place.focus(); return; }
    if (pw.length < 6) { showError("Your password needs at least 6 characters."); form.elements["password"].focus(); return; }
    if (pw !== confirm) { showError("The two passwords do not match."); form.elements["confirm"].focus(); return; }
    if (!navigator.onLine) { showError("Registration needs internet. Please connect and try again."); return; }

    button.disabled = true;

    // Step 1: create the login
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, emailFor(username), pw);
    } catch (err) {
      button.disabled = false;
      showError(registerErrorMessage(err));
      console.error("Registration Error:", err);
      return;
    }

    // Step 2: save the profile under the username
    const profile = {
      authUid: cred.user.uid,
      id: username,
      role: roleKey,
      name: name,
      mobile: mob,
      place: placeValue,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "users", username), profile);
    } catch (err) {
      // Roll back the login so the same Username can be tried again
      await cred.user.delete().catch(() => {});
      await signOut(auth).catch(() => {});
      button.disabled = false;
      showError(registerErrorMessage(err));
      console.error("Profile Error:", err);
      return;
    }

    cacheProfile(username, profile);
    ssSet(SESSION_KEY, username);
    showSuccess(username, roleKey);
  });

  function showSuccess(id, roleKey) {
    document.getElementById("register-card").hidden = true;
    document.getElementById("success-card").hidden = false;
    document.getElementById("new-id").textContent = id;
    document.getElementById("go-page").setAttribute("href", ROLES[roleKey].page);
    document.getElementById("success-title").focus();

    const copy = document.getElementById("copy-id");
    const status = document.getElementById("copy-status");
    copy.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).then(() => {
          status.textContent = "Copied";
          setTimeout(() => status.textContent = "", 2500);
        });
      }
    });
  }
}

// ==========================================
// PAGE: SECURE ROLE DASHBOARDS
// ==========================================
function initRolePage() {
  const key = document.body.getAttribute("data-role");
  const role = ROLES[key];
  if (!role) return;

  function $(id) { return document.getElementById(id); }
  const guard = $("guard"), guardText = $("guard-text"), guardLink = $("guard-link");
  const content = $("content"), badge = $("role-badge"), who = $("who");
  const welcome = $("welcome"), signout = $("signout");

  function blocked(message, linkText, href) {
    if (guardText) guardText.textContent = message;
    if (guardLink) { guardLink.textContent = linkText; guardLink.setAttribute("href", href); }
    if (guard) guard.hidden = false;
    if (content) content.hidden = true;
    if (signout) signout.hidden = true;
    if (badge) badge.hidden = true;
  }

  onAuthStateChanged(auth, async function (firebaseUser) {
    if (!firebaseUser) {
      blocked("You are not signed in.", "Go to sign in", "index.html");
      return;
    }

    const username = usernameFromEmail(firebaseUser.email);
    const user = await getProfile(username);

    if (!user || !ROLES[user.role]) {
      blocked("Your profile could not be found. Please sign in again.", "Sign in", "index.html");
      return;
    }

    if (user.role !== key) {
      blocked("This page is for " + role.label + "s. Your page is the " + ROLES[user.role].label + " page.",
              "Go to my page", ROLES[user.role].page);
    } else {
      if (badge) { badge.textContent = role.label; badge.hidden = false; }
      if (who) who.textContent = user.name + " (@" + username + ")";
      if (welcome) welcome.textContent = "Welcome, " + user.name + ".";
      if (content) content.hidden = false;
      if (guard) guard.hidden = true;
      if (signout) signout.hidden = false;
    }
  });

  if (signout) {
    signout.addEventListener("click", async function () {
      ssRemove(SESSION_KEY);
      await signOut(auth);
      window.location.href = "index.html";
    });
  }
}

// ==========================================
// ROUTER
// ==========================================
const page = document.body && document.body.getAttribute("data-page");
if (page === "home") initHome();
if (page === "register") initRegister();
if (page === "role") initRolePage();

// ==========================================
// OFFLINE SUPPORT: register the service worker
// ==========================================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
