/* ══════════════════════════════════════════
   AGROAI — app.js (Production Ready)
   ══════════════════════════════════════════ */
'use strict';

/* ─── API Configuration ─── */
// Try multiple possible API URLs
let API = 'https://agroai-backend-mxn8.onrender.com';
const BACKUP_API = 'http://localhost:8000'; // For local development

// Auto-detect environment
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API = BACKUP_API;
}

// Check for Vercel environment variable
if (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.API_URL) {
    API = window.APP_CONFIG.API_URL;
}

console.log('🌐 API URL:', API);

/* ─── Global State ─── */
let currentUser = JSON.parse(sessionStorage.getItem('agroai_user') || 'null');
let _loginBusy = false;
let _currentFile = null;
let _chartInstance = null;
let _forgotStep = 1;
let _forgotEmail = '';

/* ─── Toast Notifications ─── */
function showToast(msg, type = 'info') {
    let t = document.getElementById('_toast');
    if (!t) {
        t = document.createElement('div');
        t.id = '_toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = `toast toast-${type}`;
    t.style.display = 'block';
    clearTimeout(t._tmr);
    t._tmr = setTimeout(() => { t.style.display = 'none'; }, 3200);
}

/* ─── API Health Check ─── */
async function checkAPIHealth() {
    try {
        const res = await fetch(`${API}/api/health`, { 
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
            const data = await res.json();
            console.log('✅ API is healthy:', data);
            return true;
        }
    } catch (err) {
        console.warn('⚠️ API health check failed:', err.message);
    }
    
    // Show warning but don't block the app
    showToast('Backend connection issue. Some features may be limited.', 'warning');
    return false;
}

/* ─── DISEASE DATABASE (Complete) ─── */
const DISEASES = [
    { key: 'Tomato_Bacterial_spot', label: 'Bacterial Spot', severity: 'High',
      symptoms: 'Small dark water-soaked lesions on leaves and fruit surfaces.',
      treatment: 'Apply copper-based bactericides. Remove infected debris. Avoid overhead irrigation.',
      prevention: 'Use certified disease-free seeds. Practice 2-year crop rotation.' },
    { key: 'Tomato_Early_blight', label: 'Early Blight', severity: 'Medium',
      symptoms: 'Concentric dark rings forming a target pattern on older leaves.',
      treatment: 'Apply chlorothalonil or mancozeb fungicide every 7 to 10 days.',
      prevention: 'Rotate crops annually. Remove lower foliage. Mulch around base.' },
    { key: 'Tomato_Late_blight', label: 'Late Blight', severity: 'Critical',
      symptoms: 'Large irregular water-soaked grey-green lesions; white mould on underside.',
      treatment: 'Apply metalaxyl or cymoxanil fungicide immediately. Destroy infected plants.',
      prevention: 'Avoid overhead watering. Plant resistant varieties. Monitor humidity.' },
    { key: 'Tomato_Leaf_Mold', label: 'Leaf Mold', severity: 'Medium',
      symptoms: 'Yellow patches on upper leaf surface; olive-green mould on underside.',
      treatment: 'Apply mancozeb or chlorothalonil. Improve greenhouse ventilation.',
      prevention: 'Reduce relative humidity below 85%. Space plants adequately.' },
    { key: 'Tomato_Septoria_leaf_spot', label: 'Septoria Leaf Spot', severity: 'Medium',
      symptoms: 'Small circular spots with dark borders and pale grey centres.',
      treatment: 'Apply copper fungicide. Remove heavily infected leaves promptly.',
      prevention: 'Mulch soil. Avoid wetting foliage during irrigation.' },
    { key: 'Tomato_Spider_mites', label: 'Spider Mites', severity: 'Low',
      symptoms: 'Fine yellow stippling on leaves; fine webbing on leaf undersides.',
      treatment: 'Apply miticide or neem oil. Increase ambient humidity.',
      prevention: 'Regular scouting. Introduce predatory mites as biocontrol.' },
    { key: 'Tomato_Target_Spot', label: 'Target Spot', severity: 'Medium',
      symptoms: 'Bulls-eye concentric ring lesions on leaves and stems.',
      treatment: 'Apply azoxystrobin or fluxapyroxad. Improve field drainage.',
      prevention: 'Remove plant debris after harvest. Avoid dense canopy.' },
    { key: 'Tomato_Yellow_Leaf_Curl_Virus', label: 'Yellow Leaf Curl Virus', severity: 'Critical',
      symptoms: 'Upward leaf curling, yellowing margins, stunted plant growth.',
      treatment: 'No chemical cure. Remove and destroy infected plants immediately.',
      prevention: 'Control whitefly populations. Use insect-proof nets and resistant varieties.' },
    { key: 'Tomato_Mosaic_Virus', label: 'Tomato Mosaic Virus', severity: 'High',
      symptoms: 'Mosaic light-dark green patterns on leaves; distortion and stunting.',
      treatment: 'No cure. Remove infected plants. Disinfect all tools with bleach solution.',
      prevention: 'Use virus-free certified seeds. Wash hands before handling plants.' },
    { key: 'Tomato_healthy', label: 'Healthy', severity: 'None',
      symptoms: 'No disease symptoms detected. Plant appears healthy.',
      treatment: 'No treatment required.',
      prevention: 'Continue regular monitoring, balanced fertilisation and irrigation.' },
];

const SEV_CLASS = { 
    None: 'badge-none', 
    Low: 'badge-low', 
    Medium: 'badge-medium', 
    High: 'badge-high', 
    Critical: 'badge-critical' 
};

const SEV_COLOR = { 
    None: '#16a34a', 
    Low: '#ca8a04', 
    Medium: '#ea580c', 
    High: '#dc2626', 
    Critical: '#9d174d' 
};

/* ─── SESSION MANAGEMENT ─── */
function setUser(u) { 
    currentUser = u; 
    sessionStorage.setItem('agroai_user', JSON.stringify(u)); 
}

function clearUser() { 
    currentUser = null; 
    sessionStorage.removeItem('agroai_user'); 
}

/* ─── NAVIGATION ─── */
const PROTECTED = ['home', 'detect', 'model', 'results', 'about'];

function goPage(pageId) {
    if (PROTECTED.includes(pageId) && !currentUser) {
        showToast('Please login to access this page.', 'info');
        pageId = 'login';
    }
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tb-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.add('active');
    
    const btn = document.querySelector(`.tb-btn[data-page="${pageId}"]`);
    if (btn) btn.classList.add('active');
    
    // Load page-specific data
    if (pageId === 'results') loadHistory();
    if (pageId === 'about') initPerfBars();
    if (pageId === 'model') initModelChart();
    
    window.scrollTo(0, 0);
}

// Initialize navigation buttons
document.querySelectorAll('.tb-btn').forEach(btn => {
    btn.addEventListener('click', () => goPage(btn.dataset.page));
});

/* ─── TOPBAR ─── */
function updateTopbar() {
    const nav = document.getElementById('tb-nav');
    const guest = document.getElementById('tb-guest');
    const user = document.getElementById('tb-user');
    const label = document.getElementById('tb-username-label');
    
    if (currentUser) {
        if (nav) nav.style.display = 'flex';
        if (guest) guest.style.display = 'none';
        if (user) user.style.display = 'flex';
        if (label) label.textContent = currentUser.username;
    } else {
        if (nav) nav.style.display = 'none';
        if (guest) guest.style.display = 'flex';
        if (user) user.style.display = 'none';
    }
}

function logout() {
    clearUser();
    updateTopbar();
    clearImage();
    goPage('login');
    setTimeout(() => showToast('You have been successfully logged out.', 'success'), 200);
}

/* ─── AUTHENTICATION ─── */
async function doSignup() {
    const username = document.getElementById('signup-username')?.value.trim();
    const email = document.getElementById('signup-email')?.value.trim();
    const password = document.getElementById('signup-password')?.value;
    const confirm = document.getElementById('signup-confirm')?.value;
    const errBox = document.getElementById('signup-error');
    const okBox = document.getElementById('signup-success');
    const btn = document.getElementById('signup-btn');

    if (errBox) errBox.style.display = 'none';
    if (okBox) okBox.style.display = 'none';

    if (!username || !email || !password || !confirm) {
        showAlert(errBox, 'Please fill in all fields.');
        return;
    }
    if (password !== confirm) {
        showAlert(errBox, 'Passwords do not match.');
        return;
    }
    if (password.length < 6) {
        showAlert(errBox, 'Password must be at least 6 characters.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';
    
    try {
        const res = await fetch(`${API}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.detail || 'Signup failed.');
        
        showAlert(okBox, 'Account created! Redirecting to login...');
        setTimeout(() => {
            clearSignupForm();
            goPage('login');
        }, 1500);
    } catch (err) {
        showAlert(errBox, err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
}

function clearSignupForm() {
    const fields = ['signup-username', 'signup-email', 'signup-password', 'signup-confirm'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const errorEl = document.getElementById('signup-error');
    const successEl = document.getElementById('signup-success');
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
}

async function doLogin() {
    if (_loginBusy) return;

    const username = document.getElementById('login-username')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    const errBox = document.getElementById('login-error');
    const okBox = document.getElementById('login-success');
    const btn = document.getElementById('login-btn');

    if (errBox) errBox.style.display = 'none';
    if (okBox) okBox.style.display = 'none';

    if (!username || !password) {
        showAlert(errBox, 'Please enter your username and password.');
        return;
    }

    _loginBusy = true;
    btn.disabled = true;
    btn.textContent = 'Signing in...';
    
    try {
        const res = await fetch(`${API}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.detail || 'Invalid username or password.');
        
        setUser({ username: data.username, email: data.email });
        updateTopbar();
        
        // Clear form
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        if (errBox) errBox.style.display = 'none';
        goPage('home');
        showToast(`Welcome back, ${data.username}!`, 'success');
    } catch (err) {
        showAlert(errBox, err.message);
    } finally {
        _loginBusy = false;
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

function showAlert(el, msg) {
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
    }
}

// Enter key support
document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
});

/* ─── FORGOT PASSWORD ─── */
function resetForgotForm() {
    _forgotStep = 1;
    _forgotEmail = '';
    
    const fe = document.getElementById('forgot-email');
    if (fe) { fe.value = ''; fe.disabled = false; }
    
    const np = document.getElementById('forgot-newpw');
    const cp = document.getElementById('forgot-confirmpw');
    if (np) np.value = '';
    if (cp) cp.value = '';
    
    const eg = document.getElementById('forgot-error');
    const og = document.getElementById('forgot-success');
    if (eg) eg.style.display = 'none';
    if (og) og.style.display = 'none';
    
    const ng = document.getElementById('new-pw-group');
    const cg = document.getElementById('confirm-pw-group');
    if (ng) ng.style.display = 'none';
    if (cg) cg.style.display = 'none';
    
    const btn = document.getElementById('forgot-btn');
    if (btn) btn.textContent = 'Verify Email';
}

async function doForgot() {
    const errBox = document.getElementById('forgot-error');
    const okBox = document.getElementById('forgot-success');
    const btn = document.getElementById('forgot-btn');
    
    if (errBox) errBox.style.display = 'none';
    if (okBox) okBox.style.display = 'none';

    if (_forgotStep === 1) {
        const email = document.getElementById('forgot-email')?.value.trim();
        if (!email || !email.includes('@')) {
            showAlert(errBox, 'Please enter a valid email.');
            return;
        }
        
        btn.disabled = true;
        btn.textContent = 'Verifying...';
        
        try {
            const res = await fetch(`${API}/api/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.detail || 'Email not found.');
            
            _forgotEmail = email;
            _forgotStep = 2;
            showAlert(okBox, 'Email verified. Please enter your new password.');
            
            const newPwGroup = document.getElementById('new-pw-group');
            const confirmPwGroup = document.getElementById('confirm-pw-group');
            const forgotEmail = document.getElementById('forgot-email');
            
            if (newPwGroup) newPwGroup.style.display = 'block';
            if (confirmPwGroup) confirmPwGroup.style.display = 'block';
            if (forgotEmail) forgotEmail.disabled = true;
            
            btn.textContent = 'Reset Password';
        } catch (err) {
            showAlert(errBox, err.message);
        } finally {
            btn.disabled = false;
        }
    } else {
        const np = document.getElementById('forgot-newpw')?.value;
        const cp = document.getElementById('forgot-confirmpw')?.value;
        
        if (!np || !cp) {
            showAlert(errBox, 'Please fill both password fields.');
            return;
        }
        if (np !== cp) {
            showAlert(errBox, 'Passwords do not match.');
            return;
        }
        if (np.length < 6) {
            showAlert(errBox, 'Password must be at least 6 characters.');
            return;
        }
        
        btn.disabled = true;
        btn.textContent = 'Resetting...';
        
        try {
            const res = await fetch(`${API}/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: _forgotEmail, new_password: np }),
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.detail || 'Reset failed.');
            
            showAlert(okBox, 'Password reset successfully! Redirecting to login...');
            setTimeout(() => {
                resetForgotForm();
                goPage('login');
            }, 2000);
        } catch (err) {
            showAlert(errBox, err.message);
        } finally {
            btn.disabled = false;
        }
    }
}

/* ─── DISEASE TABLE ─── */
function renderDiseaseTable() {
    const wrap = document.getElementById('disease-table');
    if (!wrap) return;
    
    wrap.innerHTML = DISEASES.map(d => `
        <div class="drow">
            <span class="drow-name">${d.label}</span>
            <span class="badge ${SEV_CLASS[d.severity]}">${d.severity}</span>
        </div>
    `).join('');
}

/* ─── IMAGE UPLOAD & DETECTION ─── */
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const previewImg = document.getElementById('preview-img');
const placeholder = document.getElementById('upload-placeholder');
const clearBtn = document.getElementById('clear-btn');
const browseBtn = document.getElementById('browse-btn');

if (browseBtn) {
    browseBtn.addEventListener('click', e => {
        e.stopPropagation();
        fileInput?.click();
    });
}

if (uploadZone) {
    uploadZone.addEventListener('click', e => {
        if (browseBtn && browseBtn.contains(e.target)) return;
        fileInput?.click();
    });
}

if (fileInput) {
    fileInput.addEventListener('change', e => {
        if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    });
}

if (uploadZone) {
    uploadZone.addEventListener('dragover', e => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });
    
    uploadZone.addEventListener('drop', e => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleFile(file);
    });
}

function handleFile(file) {
    _currentFile = file;
    const reader = new FileReader();
    
    reader.onload = e => {
        if (previewImg) previewImg.src = e.target.result;
        if (placeholder) placeholder.classList.add('hidden');
        if (previewImg) previewImg.classList.remove('hidden');
        if (clearBtn) clearBtn.style.display = 'block';
        runDetection(file);
    };
    
    reader.readAsDataURL(file);
}

function clearImage() {
    if (fileInput) fileInput.value = '';
    if (previewImg) previewImg.src = '';
    _currentFile = null;
    
    if (previewImg) previewImg.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
    if (clearBtn) clearBtn.style.display = 'none';
    
    const resultPlaceholder = document.getElementById('result-placeholder');
    const resultOutput = document.getElementById('result-output');
    const loadingBox = document.getElementById('loading-box');
    
    if (resultPlaceholder) resultPlaceholder.classList.remove('hidden');
    if (resultOutput) resultOutput.classList.add('hidden');
    if (loadingBox) loadingBox.classList.add('hidden');
}

async function runDetection(file) {
    const resultPlaceholder = document.getElementById('result-placeholder');
    const resultOutput = document.getElementById('result-output');
    const loadingBox = document.getElementById('loading-box');
    
    if (resultPlaceholder) resultPlaceholder.classList.add('hidden');
    if (resultOutput) resultOutput.classList.add('hidden');
    if (loadingBox) loadingBox.classList.remove('hidden');

    try {
        const form = new FormData();
        form.append('file', file);
        
        const res = await fetch(`${API}/api/predict`, { 
            method: 'POST', 
            body: form 
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        
        const data = await res.json();
        const info = DISEASES.find(d => d.label === data.disease) || DISEASES[9];
        const result = { 
            disease: info, 
            confidence: data.confidence, 
            severity: data.severity,
            annotatedUrl: data.annotated_url || null 
        };
        
        showResult(result);
        await saveDetection(result);
    } catch (err) {
        console.error('Detection error:', err);
        if (loadingBox) loadingBox.classList.add('hidden');
        if (resultOutput) {
            resultOutput.innerHTML = `
                <div class="alert alert-error">
                    <strong>⚠️ Unable to analyze image</strong><br>
                    ${err.message}<br><br>
                    <small>Please check if the backend server is running.</small>
                </div>`;
            resultOutput.classList.remove('hidden');
        }
    }
}

function showResult({ disease, confidence, severity, annotatedUrl }) {
    const loadingBox = document.getElementById('loading-box');
    const resultOutput = document.getElementById('result-output');
    
    if (loadingBox) loadingBox.classList.add('hidden');
    
    const sev = severity || disease.severity;
    const pct = Math.round(confidence * 100);
    const color = SEV_COLOR[sev] || '#2166c4';
    const annotatedHtml = annotatedUrl ? `<img src="${annotatedUrl}" class="annotated-img" alt="Annotated leaf" />` : '';
    
    if (resultOutput) {
        resultOutput.innerHTML = `
            ${annotatedHtml}
            <div class="result-block" style="border-left-color:${color};">
                <div class="result-name">${disease.label}</div>
                <div class="result-conf">
                    Confidence: <strong>${pct}%</strong>
                    &nbsp;
                    <span class="badge ${SEV_CLASS[sev]}">${sev}</span>
                </div>
                <div class="conf-wrap">
                    <div class="conf-fill" id="conf-bar" style="background:${color}; width:0%"></div>
                </div>
                <div class="result-label">Symptoms</div>
                <div class="result-value">${disease.symptoms}</div>
                <div class="result-label">Treatment</div>
                <div class="result-value">${disease.treatment}</div>
                <div class="result-label">Prevention</div>
                <div class="result-value" style="margin-bottom:0">${disease.prevention}</div>
            </div>
        `;
        resultOutput.classList.remove('hidden');
        
        // Animate confidence bar
        setTimeout(() => {
            const bar = document.getElementById('conf-bar');
            if (bar) bar.style.width = pct + '%';
        }, 100);
    }
}

/* ─── HISTORY ─── */
async function saveDetection({ disease, confidence, severity }) {
    if (!currentUser) return;
    
    try {
        await fetch(`${API}/api/save-detection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser.username,
                disease: disease.label,
                confidence: confidence,
                severity: severity || disease.severity,
                treatment: disease.treatment || ''
            }),
        });
    } catch (err) {
        console.error('Failed to save detection:', err);
    }
}

async function loadHistory() {
    if (!currentUser) return;
    
    try {
        const res = await fetch(`${API}/api/history/${currentUser.username}`);
        const data = await res.json();
        renderHistory(data.history || []);
    } catch (err) {
        console.error('Failed to load history:', err);
        renderHistory([]);
    }
}

function renderHistory(rows) {
    const tbody = document.getElementById('history-body');
    const totalEl = document.getElementById('m-total');
    const diseasedEl = document.getElementById('m-diseased');
    const healthyEl = document.getElementById('m-healthy');
    const avgEl = document.getElementById('m-avg');
    
    if (totalEl) totalEl.textContent = '0';
    if (diseasedEl) diseasedEl.textContent = '0';
    if (healthyEl) healthyEl.textContent = '0';
    if (avgEl) avgEl.textContent = '—';
    
    if (!tbody) return;
    
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No detections yet. Go to Detect to analyse a leaf.</td></tr>';
        return;
    }
    
    const total = rows.length;
    const healthy = rows.filter(r => r.disease === 'Healthy').length;
    const diseased = total - healthy;
    const avg = rows.reduce((s, r) => s + r.confidence, 0) / total;
    
    if (totalEl) totalEl.textContent = total;
    if (diseasedEl) diseasedEl.textContent = diseased;
    if (healthyEl) healthyEl.textContent = healthy;
    if (avgEl) avgEl.textContent = (avg * 100).toFixed(1) + '%';
    
    tbody.innerHTML = rows.map(r => `
        <tr>
            <td><strong>${r.disease}</strong></td>
            <td>${(r.confidence * 100).toFixed(1)}%</td>
            <td><span class="badge ${SEV_CLASS[r.severity] || 'badge-none'}">${r.severity}</span></td>
            <td style="font-size:13px;color:#94a3b8">${new Date(r.timestamp).toLocaleString()}</td>
        </tr>
    `).join('');
}

async function clearHistory() {
    if (!currentUser) return;
    if (!confirm('Clear all your detection history?')) return;
    
    try {
        await fetch(`${API}/api/history/${currentUser.username}`, { method: 'DELETE' });
        renderHistory([]);
        showToast('History cleared successfully', 'success');
    } catch (err) {
        showToast('Failed to clear history', 'error');
    }
}

/* ─── MODEL CHART ─── */
function initModelChart() {
    const canvas = document.getElementById('model-chart');
    if (!canvas) return;
    
    if (_chartInstance) {
        _chartInstance.destroy();
        _chartInstance = null;
    }
    
    _chartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['YOLOv8\n(Proposed)', 'SVM', 'Random\nForest', 'Decision\nTree'],
            datasets: [{
                label: 'Accuracy (%)',
                data: [96.7, 83.1, 78.4, 71.2],
                backgroundColor: [
                    'rgba(33,102,196,0.85)',
                    'rgba(100,116,139,0.6)',
                    'rgba(100,116,139,0.6)',
                    'rgba(100,116,139,0.6)',
                ],
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { 
                    callbacks: { 
                        label: function(ctx) { return ' ' + ctx.parsed.y + '%'; } 
                    } 
                }
            },
            scales: {
                y: {
                    min: 60,
                    max: 100,
                    ticks: { 
                        callback: function(v) { return v + '%'; }, 
                        font: { family: 'Poppins', size: 11 }, 
                        color: '#94a3b8' 
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                },
                x: {
                    ticks: { 
                        font: { family: 'Poppins', size: 12, weight: '600' }, 
                        color: '#475569' 
                    },
                    grid: { display: false },
                }
            }
        }
    });
}

/* ─── PERFORMANCE BARS ─── */
const CLASS_PERF = [
    ['Bacterial Spot', 94.1, 95.3], ['Early Blight', 94.4, 95.7],
    ['Late Blight', 93.2, 94.1], ['Leaf Mold', 91.5, 92.8],
    ['Septoria Leaf Spot', 92.7, 93.4], ['Spider Mites', 90.3, 91.6],
    ['Target Spot', 89.8, 90.5], ['Yellow Leaf Curl Virus', 96.5, 51.2],
    ['Mosaic Virus', 86.2, 96.6], ['Healthy', 99.7, 99.5],
];

function initPerfBars() {
    const wrap = document.getElementById('perf-bars');
    if (!wrap || wrap.dataset.loaded) return;
    
    wrap.innerHTML = CLASS_PERF.map(([name, prec, rec]) => `
        <div class="perf-row">
            <div class="perf-head">
                <span class="perf-name">${name}</span>
                <span class="perf-vals">Precision ${prec}% &middot; Recall ${rec}%</span>
            </div>
            <div class="perf-bg">
                <div class="perf-fill" data-width="${((prec + rec) / 2).toFixed(1)}"></div>
            </div>
        </div>
    `).join('');
    
    wrap.dataset.loaded = 'true';
    
    setTimeout(() => {
        wrap.querySelectorAll('.perf-fill').forEach(b => {
            b.style.width = b.dataset.width + '%';
        });
    }, 100);
}

/* ─── INITIALIZATION ─── */
renderDiseaseTable();
updateTopbar();

// Check API health on startup
checkAPIHealth();

// Set initial page
if (currentUser) {
    goPage('home');
} else {
    goPage('login');
}
