// 1. Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const analytics = getAnalytics(app);
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

function t(key, fallback) { return (window.jsT && window.jsT(key, fallback)) || fallback; }

// ==========================================
// LOCAL STORAGE & CACHE 
// ==========================================
function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function lsSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } }
function ssGet(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
function ssSet(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* ignore */ } }
function ssRemove(key) { try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ } }

function loadUsers() {
try { return JSON.parse(lsGet(USERS_KEY) || "{}") || {}; } catch (e) { return {}; }
}
function saveUsers(users) { return lsSet(USERS_KEY, JSON.stringify(users)); }

function findUser(users, typedId) {
let wanted = String(typedId || "").toLowerCase().trim();
if (!wanted) return null;
return users[wanted] || null;
}

// ==========================================
// UI HELPERS
// ==========================================
function showError(message) {
let box = document.getElementById("form-error");
if (!box) return;
box.textContent = message;
box.hidden = false;
}
function clearError() {
let box = document.getElementById("form-error");
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
const uid = document.getElementById("uid"); // This is now the Username field
const password = document.getElementById("password");
const btn = document.getElementById("signin-btn");

form.addEventListener("submit", function (e) {
e.preventDefault();
clearError();

const username = uid.value.trim().toLowerCase();

if (!username) { showError(t("err_uid", "Enter your Username.")); uid.focus(); return; }
if (!password.value) { showError(t("err_pw", "Enter your password.")); password.focus(); return; }

if (btn) btn.disabled = true;

// Map custom Username to Firebase email format
const firebaseEmail = username + "@jeevansetu.local";

signInWithEmailAndPassword(auth, firebaseEmail, password.value)
  .then((userCredential) => {
    const user = findUser(loadUsers(), username);
    const rolePage = user ? ROLES[user.role].page : "dashboard.html"; 
    
    ssSet(SESSION_KEY, username);
    window.location.href = rolePage; 
  })
  .catch((error) => {
    if (btn) btn.disabled = false;
    showError("The Username or password is not correct. Check them and try again.");
    console.error("Login Error:", error.code); 
  });
});
}


// ==========================================
// PAGE: REGISTER
// ==========================================
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

form.addEventListener("submit", function (e) {
e.preventDefault();
clearError();

const roleKey = selectedRole();
const name = form.elements["name"].value.trim();
const username = form.elements["username"].value.trim().toLowerCase(); // New Username Field
const mob = mobile.value;
const placeValue = place.value.trim();
const pw = form.elements["password"].value;
const confirm = form.elements["confirm"].value;

if (!roleKey) { showError("Choose who you are registering as."); return; }
if (name.length < 2) { showError("Enter your full name."); form.elements["name"].focus(); return; }

// Validate Username (No spaces, only letters, numbers, underscores)
if (!/^[a-z0-9_]{3,20}$/.test(username)) { 
  showError("Username must be 3-20 characters, using only letters, numbers, or underscores (no spaces)."); 
  form.elements["username"].focus(); return; 
}

if (!/^\d{10}$/.test(mob)) { showError("Enter a valid 10-digit mobile number."); mobile.focus(); return; }
if (!placeValue) { showError("Enter your village, clinic or school name."); place.focus(); return; }
if (pw.length < 6) { showError("Your password needs at least 6 characters."); form.elements["password"].focus(); return; }
if (pw !== confirm) { showError("The two passwords do not match."); form.elements["confirm"].focus(); return; }

button.disabled = true;

// Use their chosen username for Firebase Auth
const users = loadUsers();
const firebaseEmail = username + "@jeevansetu.local";

// Create account in Firebase Auth
createUserWithEmailAndPassword(auth, firebaseEmail, pw)
  .then((userCredential) => {
    // Save profile to Firestore using the Username as the Document ID
    return setDoc(doc(db, "users", username), {
      authUid: userCredential.user.uid,
      id: username, // Saved as ID to keep the rest of the app working
      role: roleKey,
      name: name,
      mobile: mob,
      place: placeValue,
      createdAt: new Date().toISOString()
    }).then(() => {
      users[username] = { id: username, role: roleKey, name: name, mobile: mob, place: placeValue };
      saveUsers(users);
      ssSet(SESSION_KEY, username);
      
      showSuccess(username, roleKey);
    });
  })
  .catch((error) => {
    button.disabled = false;
    if (error.code === 'auth/email-already-in-use') {
      // FIREBASE AUTOMATICALLY BLOCKS DUPLICATES HERE!
      showError("That Username is already taken! Please try a different one.");
    } else {
      showError("Registration failed. Please check your connection. " + error.message);
    }
    console.error("Registration Error:", error);
  });
});

function showSuccess(id, roleKey) {
document.getElementById("register-card").hidden = true;
document.getElementById("success-card").hidden = false;
document.getElementById("new-id").textContent = id; // Displays their chosen username
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

// Use Firebase Auth to persistently verify the user session
onAuthStateChanged(auth, (firebaseUser) => {
if (!firebaseUser) {
  blocked("You are not signed in.", "Go to sign in", "index.html");
  return;
}

const username = firebaseUser.email.split('@')[0];
const user = findUser(loadUsers(), username);

if (!user) {
  blocked("Your local profile is missing. Please sign in again to sync.", "Sign in", "index.html");
  return;
}

if (user.role !== key) {
  blocked("This page is for " + role.label + "s. Your page is the " + ROLES[user.role].label + " page.",
          "Go to my page", ROLES[user.role].page);
} else {
  if (badge) badge.textContent = role.label;
  if (who) who.textContent = user.name + " (@" + user.id + ")"; // Shows their cool username
  if (welcome) welcome.textContent = "Welcome, " + user.name + ".";
  if (content) content.hidden = false;
  if (guard) guard.hidden = true;
}
});

if (signout) {
signout.addEventListener("click", function () {
  ssRemove(SESSION_KEY);
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
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