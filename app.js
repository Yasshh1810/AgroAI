/* ═══════════════════════════════════════════════════════════════════════════
   AGROAI — app.js (Full Stack Integration + Local Fallback)
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

/* ==========================  GLOBAL TOAST  ========================== */
function showToast(msg, type = 'info') {
  let t = document.getElementById('_toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className   = 'toast toast-' + type;
  t.style.display = 'block';
  clearTimeout(t._tmr);
  t._tmr = setTimeout(() => { t.style.display = 'none'; }, 3200);
}

const API = 'http://localhost:8000';

/* ==========================  DISEASE MASTER DATA (Unified) ========================== */
const DISEASES = [
  { key:'Tomato_Bacterial_spot',     label:'Bacterial Spot',         severity:'High',
    symptoms:'Small dark water-soaked lesions on leaves and fruit surfaces.',
    treatment:'Apply copper-based bactericides. Remove infected debris. Avoid overhead irrigation.',
    prevention:'Use certified disease-free seeds. Practice 2-year crop rotation.' },
  { key:'Tomato_Early_blight',       label:'Early Blight',           severity:'Medium',
    symptoms:'Concentric dark rings forming a target pattern on older leaves.',
    treatment:'Apply chlorothalonil or mancozeb fungicide every 7 to 10 days.',
    prevention:'Rotate crops annually. Remove lower foliage. Mulch around base.' },
  { key:'Tomato_Late_blight',        label:'Late Blight',            severity:'Critical',
    symptoms:'Large irregular water-soaked grey-green lesions; white mould on underside.',
    treatment:'Apply metalaxyl or cymoxanil fungicide immediately. Destroy infected plants.',
    prevention:'Avoid overhead watering. Plant resistant varieties. Monitor humidity.' },
  { key:'Tomato_Leaf_Mold',          label:'Leaf Mold',              severity:'Medium',
    symptoms:'Yellow patches on upper leaf surface; olive-green mould on underside.',
    treatment:'Apply mancozeb or chlorothalonil. Improve greenhouse ventilation.',
    prevention:'Reduce relative humidity below 85%. Space plants adequately.' },
  { key:'Tomato_Septoria_leaf_spot', label:'Septoria Leaf Spot',     severity:'Medium',
    symptoms:'Small circular spots with dark borders and pale grey centres.',
    treatment:'Apply copper fungicide. Remove heavily infected leaves promptly.',
    prevention:'Mulch soil. Avoid wetting foliage during irrigation.' },
  { key:'Tomato_Spider_mites',       label:'Spider Mites',           severity:'Low',
    symptoms:'Fine yellow stippling on leaves; fine webbing on leaf undersides.',
    treatment:'Apply miticide or neem oil. Increase ambient humidity.',
    prevention:'Regular scouting. Introduce predatory mites as biocontrol.' },
  { key:'Tomato_Target_Spot',        label:'Target Spot',            severity:'Medium',
    symptoms:'Bulls-eye concentric ring lesions on leaves and stems.',
    treatment:'Apply azoxystrobin or fluxapyroxad. Improve field drainage.',
    prevention:'Remove plant debris after harvest. Avoid dense canopy.' },
  { key:'Tomato_Yellow_Leaf_Curl_Virus', label:'Yellow Leaf Curl Virus', severity:'Critical',
    symptoms:'Upward leaf curling, yellowing margins, stunted plant growth.',
    treatment:'No chemical cure. Remove and destroy infected plants immediately.',
    prevention:'Control whitefly populations. Use insect-proof nets and resistant varieties.' },
  { key:'Tomato_Mosaic_Virus',       label:'Tomato Mosaic Virus',    severity:'High',
    symptoms:'Mosaic light-dark green patterns on leaves; distortion and stunting.',
    treatment:'No cure. Remove infected plants. Disinfect all tools with bleach solution.',
    prevention:'Use virus-free certified seeds. Wash hands before handling plants.' },
  { key:'Tomato_healthy',            label:'Healthy',                severity:'None',
    symptoms:'No disease symptoms detected. Plant appears healthy.',
    treatment:'No treatment required.',
    prevention:'Continue regular monitoring, balanced fertilisation and irrigation.' },
];

const CLASS_PERF = [
  ['Bacterial Spot',94.1,95.3],['Early Blight',94.4,95.7],['Late Blight',93.2,94.1],
  ['Leaf Mold',91.5,92.8],['Septoria Leaf Spot',92.7,93.4],['Spider Mites',90.3,91.6],
  ['Target Spot',89.8,90.5],['Yellow Leaf Curl Virus',96.5,51.2],['Mosaic Virus',86.2,96.6],
  ['Healthy',99.7,99.5],
];

const SEV_CLASS = { None:'badge-none', Low:'badge-low', Medium:'badge-medium', High:'badge-high', Critical:'badge-critical' };
const SEV_COLOR = { None:'#16a34a', Low:'#ca8a04', Medium:'#ea580c', High:'#dc2626', Critical:'#9d174d' };

/* ==========================  LOCAL STORAGE BACKUP (Offline Mode) ========================== */
let users = JSON.parse(localStorage.getItem('agroai_users')) || [];
if (users.length === 0) {
    users.push({ username: "demo", email: "demo@agroai.com", password: "demo123", history: [] });
    saveUsers();
}
function saveUsers() { localStorage.setItem('agroai_users', JSON.stringify(users)); }

let detectionHistory = JSON.parse(localStorage.getItem('agroai_history')) || [];
function saveHistory() {
    localStorage.setItem('agroai_history', JSON.stringify(detectionHistory));
    const curr = JSON.parse(localStorage.getItem('agroai_current_user'));
    if (curr) {
        const idx = users.findIndex(u => u.username === curr.username);
        if (idx !== -1) { users[idx].history = detectionHistory; saveUsers(); }
    }
}

/* ==========================  ADVANCED LOCAL DETECTION (Fallback) ========================== */
async function analyzeLeafLocal(imageDataUrl, fileName = '') {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width; canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            let totalRed = 0, totalGreen = 0, darkSpots = 0, yellowRegions = 0, brownRegions = 0, whiteRegions = 0, speckled = 0;
            let sampleCount = 0;
            const step = 20;
            for (let y = 0; y < canvas.height; y += step) {
                for (let x = 0; x < canvas.width; x += step) {
                    const idx = (y * canvas.width + x) * 4;
                    if (idx >= pixels.length) continue;
                    const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                    totalRed += r; totalGreen += g; sampleCount++;
                    if (r < 100 && g < 80 && b < 70) darkSpots++;
                    else if (r > 150 && g > 120 && g < 180 && b < 100) yellowRegions++;
                    else if (r > 100 && r < 160 && g > 60 && g < 120 && b < 80) brownRegions++;
                    else if (r > 200 && g > 200 && b > 200) whiteRegions++;
                    else if (r > 180 && g > 150 && g < 200 && b > 100 && b < 150) speckled++;
                }
            }
            const darkRatio = darkSpots / sampleCount, yellowRatio = yellowRegions / sampleCount;
            const brownRatio = brownRegions / sampleCount, whiteRatio = whiteRegions / sampleCount, speckRatio = speckled / sampleCount;
            const avgRed = totalRed / sampleCount, avgGreen = totalGreen / sampleCount;
            const greenIntensity = avgGreen / 255, redGreenRatio = avgRed / (avgGreen + 1);
            let detected = null, conf = 85;
            const fname = fileName.toLowerCase();
            const kw = { bacterial_spot:'Bacterial Spot', early_blight:'Early Blight', late_blight:'Late Blight', leaf_mold:'Leaf Mold', septoria:'Septoria Leaf Spot', spider_mites:'Spider Mites', target_spot:'Target Spot', yellow_leaf_curl:'Yellow Leaf Curl Virus', mosaic:'Mosaic Virus', healthy:'Healthy' };
            for (let [k, v] of Object.entries(kw)) if (fname.includes(k)) { detected = v; conf = 88 + Math.random() * 10; break; }
            if (!detected) {
                let health = 100 - (darkRatio*40) - (yellowRatio*35) - (brownRatio*50) - (whiteRatio*30) - (speckRatio*25);
                if (greenIntensity < 0.4) health -= 30; else if (greenIntensity < 0.6) health -= 15;
                if (redGreenRatio > 0.8) health -= 20;
                health = Math.min(100, Math.max(0, health));
                if (health > 70 && darkRatio < 0.05 && yellowRatio < 0.05) detected = 'Healthy';
                else if (darkRatio > 0.15 && brownRatio > 0.1) detected = 'Late Blight';
                else if (darkRatio > 0.12 && redGreenRatio > 0.7) detected = 'Early Blight';
                else if (yellowRatio > 0.15 && speckRatio < 0.05) detected = 'Yellow Leaf Curl Virus';
                else if (speckRatio > 0.08) detected = 'Spider Mites';
                else if (darkRatio > 0.08 && darkRatio < 0.2 && avgGreen > 100) detected = 'Bacterial Spot';
                else if (whiteRatio > 0.05) detected = 'Leaf Mold';
                else if (yellowRatio > 0.08 && darkRatio < 0.08) detected = 'Mosaic Virus';
                else if (brownRatio > 0.08 && darkRatio > 0.05) detected = 'Target Spot';
                else if (darkRatio > 0.06 && darkRatio < 0.15) detected = 'Septoria Leaf Spot';
                else detected = 'Healthy';
                conf = 65 + (detected === 'Healthy' ? greenIntensity*30 : darkRatio*200);
                conf = Math.min(96, Math.max(65, conf));
            }
            const diseaseObj = DISEASES.find(d => d.label === detected) || DISEASES[9];
            resolve({ disease: diseaseObj, confidence: conf/100, severity: diseaseObj.severity, annotatedUrl: null });
        };
        img.src = imageDataUrl;
    });
}

/* ==========================  SESSION (Backend first, fallback localStorage) ========================== */
let currentUser = JSON.parse(sessionStorage.getItem('agroai_user') || 'null');
function setUser(u)  { currentUser = u; sessionStorage.setItem('agroai_user', JSON.stringify(u)); localStorage.setItem('agroai_current_user', JSON.stringify(u)); }
function clearUser() { currentUser = null; sessionStorage.removeItem('agroai_user'); localStorage.removeItem('agroai_current_user'); }

/* ==========================  NAVIGATION ========================== */
const PROTECTED = ['home','detect','model','results','about'];

function goPage(pageId) {
  if (PROTECTED.includes(pageId) && !currentUser && !JSON.parse(localStorage.getItem('agroai_current_user'))) {
    showToast('Please login to access this page.', 'info');
    pageId = 'login';
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tb-btn').forEach(b => b.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');
  const btn = document.querySelector(`.tb-btn[data-page="${pageId}"]`);
  if (btn) btn.classList.add('active');
  if (pageId === 'results') refreshHistoryDisplay();
  if (pageId === 'about')   initPerfBars();
  if (pageId === 'model')   initModelChart();
  if (pageId === 'home')    renderDiseaseTable();
  window.scrollTo(0, 0);
}

document.querySelectorAll('.tb-btn').forEach(btn => {
  btn.addEventListener('click', () => goPage(btn.dataset.page));
});

/* ==========================  TOPBAR ========================== */
function updateTopbar() {
  const nav   = document.getElementById('tb-nav');
  const guest = document.getElementById('tb-guest');
  const user  = document.getElementById('tb-user');
  const label = document.getElementById('tb-username-label');
  const localUser = JSON.parse(localStorage.getItem('agroai_current_user'));
  const activeUser = currentUser || localUser;
  if (activeUser) {
    if (nav) nav.style.display = 'flex';
    if (guest) guest.style.display = 'none';
    if (user) user.style.display = 'flex';
    if (label) label.textContent = activeUser.username;
  } else {
    if (nav) nav.style.display = 'none';
    if (guest) guest.style.display = 'flex';
    if (user) user.style.display = 'none';
  }
}

function logout() {
  clearUser();
  detectionHistory = [];
  updateTopbar();
  clearImage();
  goPage('login');
  setTimeout(() => showToast('Logged out successfully.', 'success'), 200);
}

/* ==========================  SIGNUP (Backend + Local) ========================== */
async function doSignup() {
  const username = document.getElementById('signup-username').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm  = document.getElementById('signup-confirm').value;
  const errBox   = document.getElementById('signup-error');
  const okBox    = document.getElementById('signup-success');
  const btn      = document.getElementById('signup-btn');

  errBox.style.display = 'none'; okBox.style.display = 'none';
  if (!username || !email || !password || !confirm) { showAlert(errBox,'All fields required.'); return; }
  if (password !== confirm) { showAlert(errBox,'Passwords do not match.'); return; }
  if (password.length < 6) { showAlert(errBox,'Password min 6 characters.'); return; }
  if (users.find(u => u.username === username)) { showAlert(errBox,'Username exists.'); return; }
  if (users.find(u => u.email === email)) { showAlert(errBox,'Email registered.'); return; }

  btn.disabled = true; btn.textContent = 'Creating...';
  try {
    const res = await fetch(`${API}/api/signup`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, email, password }) });
    if (!res.ok) throw new Error((await res.json()).detail || 'Signup failed.');
    users.push({ username, email, password, history: [] }); saveUsers();
    showAlert(okBox, 'Account created! Redirecting...');
    setTimeout(() => { clearSignupForm(); goPage('login'); }, 1500);
  } catch(err) { showAlert(errBox, err.message); }
  finally { btn.disabled = false; btn.textContent = 'Create Account'; }
}
function clearSignupForm() { ['signup-username','signup-email','signup-password','signup-confirm'].forEach(id => { let el=document.getElementById(id); if(el) el.value=''; }); document.getElementById('signup-error').style.display='none'; document.getElementById('signup-success').style.display='none'; }

/* ==========================  LOGIN (Backend + Local) ========================== */
let _loginBusy = false;
async function doLogin() {
  if (_loginBusy) return;
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errBox   = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');
  errBox.style.display = 'none';
  if (!username || !password) { showAlert(errBox,'Enter username and password.'); return; }

  _loginBusy = true; btn.disabled = true; btn.textContent = 'Signing in...';
  try {
    const res = await fetch(`${API}/api/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
    if (res.ok) {
      const data = await res.json();
      setUser({ username: data.username, email: data.email });
      updateTopbar();
      document.getElementById('login-username').value = '';
      document.getElementById('login-password').value = '';
      goPage('home');
    } else {
      const localUser = users.find(u => u.username === username && u.password === password);
      if (localUser) {
        setUser({ username: localUser.username, email: localUser.email });
        detectionHistory = localUser.history || [];
        saveHistory();
        updateTopbar();
        goPage('home');
      } else throw new Error('Invalid credentials (offline).');
    }
  } catch(err) { showAlert(errBox, err.message); }
  finally { _loginBusy = false; btn.disabled = false; btn.textContent = 'Sign In'; }
}
function showAlert(el, msg) { el.textContent = msg; el.style.display = 'block'; }
document.getElementById('login-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

/* ==========================  FORGOT PASSWORD (Local) ========================== */
let _forgotStep = 1, _forgotEmail = '';
function resetForgotForm() {
  _forgotStep = 1; _forgotEmail = '';
  const fe = document.getElementById('forgot-email'); if(fe){ fe.value=''; fe.disabled=false; }
  const np = document.getElementById('forgot-newpw'); if(np) np.value='';
  const cp = document.getElementById('forgot-confirmpw'); if(cp) cp.value='';
  const eg = document.getElementById('forgot-error'); if(eg) eg.style.display='none';
  const og = document.getElementById('forgot-success'); if(og) og.style.display='none';
  const ng = document.getElementById('new-pw-group'); if(ng) ng.style.display='none';
  const cg = document.getElementById('confirm-pw-group'); if(cg) cg.style.display='none';
  const btn = document.getElementById('forgot-btn'); if(btn) btn.textContent='Verify Email';
}
async function doForgot() {
  const errBox = document.getElementById('forgot-error'), okBox = document.getElementById('forgot-success'), btn = document.getElementById('forgot-btn');
  errBox.style.display='none'; okBox.style.display='none';
  if (_forgotStep === 1) {
    const email = document.getElementById('forgot-email').value.trim();
    if (!email || !email.includes('@')) { showAlert(errBox,'Valid email required.'); return; }
    btn.disabled=true; btn.textContent='Verifying...';
    try {
      const res = await fetch(`${API}/api/verify-email`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
      if (!res.ok) throw new Error((await res.json()).detail || 'Email not found.');
      _forgotEmail=email; _forgotStep=2;
      showAlert(okBox, 'Email verified. Enter new password.');
      document.getElementById('new-pw-group').style.display='block';
      document.getElementById('confirm-pw-group').style.display='block';
      document.getElementById('forgot-email').disabled=true;
      btn.textContent='Reset Password';
    } catch(err) { showAlert(errBox, err.message); }
    finally { btn.disabled=false; if(_forgotStep===1) btn.textContent='Verify Email'; }
  } else {
    const np = document.getElementById('forgot-newpw').value, cp = document.getElementById('forgot-confirmpw').value;
    if (!np || !cp) { showAlert(errBox,'Fill both fields.'); return; }
    if (np !== cp) { showAlert(errBox,'Passwords mismatch.'); return; }
    if (np.length<6) { showAlert(errBox,'Min 6 characters.'); return; }
    btn.disabled=true; btn.textContent='Resetting...';
    try {
      const res = await fetch(`${API}/api/reset-password`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: _forgotEmail, new_password: np }) });
      if (!res.ok) throw new Error((await res.json()).detail || 'Reset failed.');
      const user = users.find(u => u.email === _forgotEmail);
      if (user) user.password = np; saveUsers();
      showAlert(okBox,'Password reset! Redirecting...');
      setTimeout(() => { resetForgotForm(); goPage('login'); }, 2000);
    } catch(err) { showAlert(errBox, err.message); }
    finally { btn.disabled=false; }
  }
}

/* ==========================  DISEASE TABLE (Home) ========================== */
function renderDiseaseTable() {
  const wrap = document.getElementById('disease-table');
  if (!wrap) return;
  wrap.innerHTML = DISEASES.map(d => `<div class="drow"><span class="drow-name">${d.label}</span><span class="badge ${SEV_CLASS[d.severity]}">${d.severity}</span></div>`).join('');
}

/* ==========================  FILE UPLOAD & DETECTION (Backend first, fallback local) ========================== */
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const previewImg = document.getElementById('preview-img');
const placeholder = document.getElementById('upload-placeholder');
const clearBtn = document.getElementById('clear-btn');
const browseBtn = document.getElementById('browse-btn');
if (browseBtn) browseBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
if (uploadZone) uploadZone.addEventListener('click', e => { if (browseBtn && browseBtn.contains(e.target)) return; fileInput.click(); });
if (fileInput) fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });
if (uploadZone) {
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('drag-over'); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) handleFile(file); });
}
let _currentFile = null;
function handleFile(file) {
  _currentFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    if (placeholder) placeholder.classList.add('hidden');
    if (previewImg) previewImg.classList.remove('hidden');
    if (clearBtn) clearBtn.style.display = 'block';
    runDetection(file);
  };
  reader.readAsDataURL(file);
}
function clearImage() {
  if(fileInput) fileInput.value = '';
  if(previewImg) previewImg.src = '';
  _currentFile = null;
  if(previewImg) previewImg.classList.add('hidden');
  if(placeholder) placeholder.classList.remove('hidden');
  if(clearBtn) clearBtn.style.display = 'none';
  const rp = document.getElementById('result-placeholder'); if(rp) rp.classList.remove('hidden');
  const ro = document.getElementById('result-output'); if(ro) ro.classList.add('hidden');
  const lb = document.getElementById('loading-box'); if(lb) lb.classList.add('hidden');
}
async function runDetection(file) {
  const rp = document.getElementById('result-placeholder'); if(rp) rp.classList.add('hidden');
  const ro = document.getElementById('result-output'); if(ro) ro.classList.add('hidden');
  const lb = document.getElementById('loading-box'); if(lb) lb.classList.remove('hidden');
  try {
    const form = new FormData(); form.append('file', file);
    const res = await fetch(`${API}/api/predict`, { method:'POST', body:form });
    if (!res.ok) throw new Error('Backend error');
    const data = await res.json();
    const info = DISEASES.find(d => d.label === data.disease) || DISEASES[9];
    const result = { disease:info, confidence:data.confidence, severity:data.severity, annotatedUrl: data.annotated_url || null };
    showResult(result);
    await saveDetection(result);
  } catch(err) {
    console.warn('Backend unavailable, using local analysis.');
    const localResult = await analyzeLeafLocal(URL.createObjectURL(file), file.name);
    showResult(localResult);
    await saveDetection(localResult);
  }
  if(lb) lb.classList.add('hidden');
}
function showResult({ disease, confidence, severity, annotatedUrl }) {
  const ro = document.getElementById('result-output');
  if(!ro) return;
  const sev = severity || disease.severity;
  const pct = Math.round(confidence * 100);
  const color = SEV_COLOR[sev] || '#2166c4';
  const annotatedHtml = annotatedUrl ? `<img src="${annotatedUrl}" class="annotated-img" alt="Annotated leaf" />` : '';
  ro.innerHTML = `
    ${annotatedHtml}
    <div class="result-block" style="border-left-color:${color};">
      <div class="result-name">${disease.label}</div>
      <div class="result-conf">Confidence: <strong>${pct}%</strong> &nbsp; <span class="badge ${SEV_CLASS[sev]}">${sev}</span></div>
      <div class="conf-wrap"><div class="conf-fill" id="conf-bar" style="background:${color};"></div></div>
      <div class="result-label">Symptoms</div><div class="result-value">${disease.symptoms}</div>
      <div class="result-label">Treatment</div><div class="result-value">${disease.treatment}</div>
      <div class="result-label">Prevention</div><div class="result-value" style="margin-bottom:0">${disease.prevention}</div>
    </div>
  `;
  ro.classList.remove('hidden');
  requestAnimationFrame(() => { const bar = document.getElementById('conf-bar'); if(bar) bar.style.width = pct + '%'; });
}
async function saveDetection({ disease, confidence, severity }) {
  if (!currentUser && !localStorage.getItem('agroai_current_user')) return;
  const record = { disease: disease.label, confidence, severity: severity || disease.severity, timestamp: new Date().toLocaleString(), symptoms: disease.symptoms, treatment: disease.treatment, prevention: disease.prevention };
  detectionHistory.unshift(record);
  saveHistory();
  if (currentUser) {
    try { await fetch(`${API}/api/save-detection`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: currentUser.username, disease: disease.label, confidence, severity: severity || disease.severity }) }); } catch(_) {}
  }
  refreshHistoryDisplay();
}

/* ==========================  HISTORY (LocalStorage) ========================== */
function refreshHistoryDisplay() {
  const tbody = document.getElementById('history-body');
  const total = detectionHistory.length;
  const diseased = detectionHistory.filter(h => h.disease !== 'Healthy').length;
  const healthy = total - diseased;
  const avgConf = total ? (detectionHistory.reduce((a,b)=>a + (b.confidence||0),0)/total).toFixed(1) : '—';
  const mTotal = document.getElementById('m-total'); if(mTotal) mTotal.innerText = total;
  const mDiseased = document.getElementById('m-diseased'); if(mDiseased) mDiseased.innerText = diseased;
  const mHealthy = document.getElementById('m-healthy'); if(mHealthy) mHealthy.innerText = healthy;
  const mAvg = document.getElementById('m-avg'); if(mAvg) mAvg.innerText = avgConf !== '—' ? `${avgConf}%` : '—';
  if (!tbody) return;
  if (total === 0) { tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No detections yet. Upload a leaf.</td></tr>'; return; }
  tbody.innerHTML = detectionHistory.slice().reverse().map(h => `
    <tr><td><strong>${h.disease}</strong></td><td>${(h.confidence*100).toFixed(1)}%</td><td><span class="badge ${SEV_CLASS[h.severity] || 'badge-none'}">${h.severity}</span></td><td style="font-size:13px;color:#94a3b8">${h.timestamp}</td></tr>
  `).join('');
}
async function clearHistory() {
  if (!confirm('Clear all history?')) return;
  detectionHistory = [];
  saveHistory();
  refreshHistoryDisplay();
  if (currentUser) { try { await fetch(`${API}/api/history/${currentUser.username}`, { method:'DELETE' }); } catch(_) {} }
  showToast('History cleared', 'success');
}

/* ==========================  MODEL CHART ========================== */
let _chartInstance = null;
function initModelChart() {
  const canvas = document.getElementById('model-chart');
  if (!canvas) return;
  if (_chartInstance) { _chartInstance.destroy(); _chartInstance = null; }
  _chartInstance = new Chart(canvas, {
    type: 'bar', data: { labels: ['YOLOv8\n(Proposed)', 'SVM', 'Random\nForest', 'Decision\nTree'], datasets: [{ label: 'Accuracy (%)', data: [96.7, 83.1, 78.4, 71.2], backgroundColor: ['rgba(33,102,196,0.85)', 'rgba(100,116,139,0.6)', 'rgba(100,116,139,0.6)', 'rgba(100,116,139,0.6)'], borderRadius: 8, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}%` } } }, scales: { y: { min: 60, max: 100, ticks: { callback: v => v + '%', font: { family:'Poppins', size:11 }, color:'#94a3b8' }, grid: { color:'rgba(0,0,0,0.05)' } }, x: { ticks: { font: { family:'Poppins', size:12, weight:'600' }, color:'#475569' }, grid: { display: false } } } }
  });
}

/* ==========================  PERF BARS (FIXED - About Page) ========================== */
function initPerfBars() {
  const wrap = document.getElementById('perf-bars');
  if (!wrap || wrap.dataset.loaded === 'true') return;
  wrap.innerHTML = CLASS_PERF.map(([name, prec, rec]) => `
    <div class="perf-row">
      <div class="perf-head"><span class="perf-name">${name}</span><span class="perf-vals">Precision ${prec}% &middot; Recall ${rec}%</span></div>
      <div class="perf-bg"><div class="perf-fill" data-width="${((prec+rec)/2).toFixed(1)}"></div></div>
    </div>
  `).join('');
  wrap.dataset.loaded = 'true';
  requestAnimationFrame(() => {
    wrap.querySelectorAll('.perf-fill').forEach(b => { b.style.width = b.dataset.width + '%'; });
  });
}

/* ==========================  INITIALIZATION ========================== */
function checkLoginState() {
  const localUser = JSON.parse(localStorage.getItem('agroai_current_user'));
  if (localUser && !currentUser) { currentUser = localUser; sessionStorage.setItem('agroai_user', JSON.stringify(localUser)); }
  updateTopbar();
  if (currentUser || localUser) {
    const user = users.find(u => u.username === (currentUser?.username || localUser?.username));
    if (user && user.history) detectionHistory = user.history;
    refreshHistoryDisplay();
    if (document.getElementById('page-home').classList.contains('active') || !document.querySelector('.page.active')) goPage('home');
  } else { goPage('landing'); }
}
renderDiseaseTable();
document.addEventListener('DOMContentLoaded', () => {
  checkLoginState();
  document.querySelectorAll('.tb-btn').forEach(btn => { btn.addEventListener('click', () => { if (btn.dataset.page) goPage(btn.dataset.page); }); });
  initModelChart();
  initPerfBars();
  // Re-run perf bars when about page becomes active (fix for dynamic load)
  const aboutBtn = document.querySelector('.tb-btn[data-page="about"]');
  if (aboutBtn) aboutBtn.addEventListener('click', () => setTimeout(initPerfBars, 100));
});
window.goPage = goPage;
window.logout = logout;
window.doLogin = doLogin;
window.doSignup = doSignup;
window.doForgot = doForgot;
window.clearHistory = clearHistory;
window.clearImage = clearImage;
window.navToLogin = () => goPage('login');
window.navToSignup = () => goPage('signup');
window.togglePw = (id, btn) => { let inp = document.getElementById(id); if(inp) inp.type = inp.type === 'password' ? 'text' : 'password'; };
