'use strict';

/* ───────── TOAST ───────── */
function showToast(msg, type = 'info') {
  let t = document.getElementById('_toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast toast-' + type;
  t.style.display = 'block';
  clearTimeout(t._tmr);
  t._tmr = setTimeout(() => { t.style.display = 'none'; }, 3000);
}

/* ───────── API ───────── */
const API = "https://agroai-backend-mxn8.onrender.com";

/* ───────── SESSION ───────── */
let currentUser = JSON.parse(sessionStorage.getItem('agroai_user') || 'null');

function setUser(u) {
  currentUser = u;
  sessionStorage.setItem('agroai_user', JSON.stringify(u));
}

function clearUser() {
  currentUser = null;
  sessionStorage.removeItem('agroai_user');
}

/* ───────── LOGIN ───────── */
async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errBox = document.getElementById('login-error');

  errBox.style.display = 'none';

  if (!username || !password) {
    showError(errBox, "Enter username & password");
    return;
  }

  try {
    const res = await fetch(`${API}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Login failed");
    }

    setUser(data);
    showToast("Login successful", "success");
    location.reload();

  } catch (err) {
    showError(errBox, err.message);
  }
}

/* ───────── SIGNUP ───────── */
async function doSignup() {
  const username = document.getElementById('signup-username').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errBox = document.getElementById('signup-error');

  errBox.style.display = 'none';

  if (!username || !email || !password) {
    showError(errBox, "Fill all fields");
    return;
  }

  try {
    const res = await fetch(`${API}/api/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Signup failed");
    }

    showToast("Account created!", "success");

  } catch (err) {
    showError(errBox, err.message);
  }
}

/* ───────── PREDICTION ───────── */
async function runDetection(file) {
  const form = new FormData();
  form.append("file", file);

  try {
    const res = await fetch(`${API}/api/predict`, {
      method: "POST",
      body: form
    });

    if (!res.ok) {
      throw new Error("Prediction failed");
    }

    const data = await res.json();

    document.getElementById('result').innerHTML = `
      <h3>${data.disease}</h3>
      <p>Confidence: ${Math.round(data.confidence * 100)}%</p>
      <p>Severity: ${data.severity}</p>
    `;

  } catch (err) {
    showToast("Backend error", "error");
  }
}

/* ───────── HISTORY ───────── */
async function loadHistory() {
  if (!currentUser) return;

  const res = await fetch(`${API}/api/history/${currentUser.username}`);
  const data = await res.json();

  const box = document.getElementById("history");
  box.innerHTML = data.history.map(h => `
    <div>
      ${h.disease} - ${Math.round(h.confidence * 100)}%
    </div>
  `).join('');
}

/* ───────── SAVE ───────── */
async function saveDetection(result) {
  if (!currentUser) return;

  await fetch(`${API}/api/save-detection`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: currentUser.username,
      disease: result.disease,
      confidence: result.confidence,
      severity: result.severity
    })
  });
}

/* ───────── HELPERS ───────── */
function showError(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

/* ───────── FILE INPUT ───────── */
document.getElementById('file-input')?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) runDetection(file);
});

/* ───────── INIT ───────── */
if (currentUser) {
  loadHistory();
}
