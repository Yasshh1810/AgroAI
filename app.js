// ========== USER DATABASE (localStorage) ==========
let users = JSON.parse(localStorage.getItem('agroai_users')) || [];

// Pre-load demo user if no users exist
if (users.length === 0) {
    users.push({
        username: "demo",
        email: "demo@agroai.com",
        password: "demo123",
        history: []
    });
    saveUsers();
}

function saveUsers() {
    localStorage.setItem('agroai_users', JSON.stringify(users));
}

// ========== DISEASE DATABASE ==========
const diseaseData = {
    'Bacterial Spot': { 
        severity: 'Medium', 
        treatment: 'Apply copper-based bactericide. Remove infected leaves. Avoid overhead watering.',
        prevention: 'Use disease-free seeds, rotate crops every 2 years.'
    },
    'Early Blight': { 
        severity: 'High', 
        treatment: 'Apply fungicides containing chlorothalonil or mancozeb. Remove lower leaves.',
        prevention: 'Mulch around plants, water at base, stake plants for airflow.'
    },
    'Late Blight': { 
        severity: 'Critical', 
        treatment: 'Apply metalaxyl or mancozeb immediately. Destroy severely infected plants.',
        prevention: 'Use resistant varieties, avoid overhead irrigation.'
    },
    'Leaf Mold': { 
        severity: 'Medium', 
        treatment: 'Reduce humidity. Apply fungicide with chlorothalonil or copper.',
        prevention: 'Improve air circulation, water early morning.'
    },
    'Septoria Leaf Spot': { 
        severity: 'Medium', 
        treatment: 'Remove affected leaves. Apply copper fungicide.',
        prevention: 'Rotate crops, avoid wetting foliage.'
    },
    'Spider Mites': { 
        severity: 'Low', 
        treatment: 'Use insecticidal soap or neem oil. Increase humidity.',
        prevention: 'Regular inspection, maintain plant health.'
    },
    'Target Spot': { 
        severity: 'Medium', 
        treatment: 'Apply fungicide. Avoid overhead watering.',
        prevention: 'Proper spacing, remove crop debris.'
    },
    'Yellow Leaf Curl Virus': { 
        severity: 'High', 
        treatment: 'Remove infected plants immediately. Control whitefly population.',
        prevention: 'Use reflective mulches, insect nets.'
    },
    'Mosaic Virus': { 
        severity: 'High', 
        treatment: 'No cure. Remove and destroy infected plants immediately.',
        prevention: 'Use virus-free seeds, control aphids.'
    },
    'Healthy': { 
        severity: 'None', 
        treatment: 'Continue regular care and monitoring. No action needed.',
        prevention: 'Maintain good agricultural practices.'
    }
};

// ========== DETECTION HISTORY ==========
let detectionHistory = JSON.parse(localStorage.getItem('agroai_history')) || [];

function saveHistory() {
    localStorage.setItem('agroai_history', JSON.stringify(detectionHistory));
    const currentUser = JSON.parse(localStorage.getItem('agroai_current_user'));
    if (currentUser) {
        const userIndex = users.findIndex(u => u.username === currentUser.username);
        if (userIndex !== -1) {
            users[userIndex].history = detectionHistory;
            saveUsers();
        }
    }
}

// ========== PAGE NAVIGATION ==========
function goPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) targetPage.classList.add('active');
    
    // Update topbar nav buttons
    const navBtns = document.querySelectorAll('.tb-btn');
    navBtns.forEach(btn => {
        if (btn.dataset.page === pageId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show/hide nav based on page - FIXED: Always show nav when logged in
    const tbNav = document.getElementById('tb-nav');
    const currentUser = JSON.parse(localStorage.getItem('agroai_current_user'));
    
    if (tbNav) {
        if (currentUser && (pageId === 'home' || pageId === 'detect' || pageId === 'model' || pageId === 'results' || pageId === 'about')) {
            tbNav.style.display = 'flex';
        } else if (currentUser && (pageId === 'landing' || pageId === 'login' || pageId === 'signup' || pageId === 'forgot')) {
            tbNav.style.display = 'none';
        } else if (!currentUser) {
            tbNav.style.display = 'none';
        } else {
            tbNav.style.display = 'flex';
        }
    }
    
    // Refresh data on specific pages
    if (pageId === 'results') refreshHistoryDisplay();
    if (pageId === 'home') populateDiseaseTable();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== LOGIN ==========
function doLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const successDiv = document.getElementById('login-success');
    
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    if (!username || !password) {
        errorDiv.textContent = 'Please enter username and password';
        errorDiv.style.display = 'block';
        return;
    }
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        detectionHistory = user.history || [];
        saveHistory();
        
        localStorage.setItem('agroai_current_user', JSON.stringify({ 
            username: user.username, 
            email: user.email 
        }));
        
        successDiv.textContent = 'Login successful! Redirecting...';
        successDiv.style.display = 'block';
        
        // Update UI for logged in user
        document.getElementById('tb-guest').style.display = 'none';
        document.getElementById('tb-user').style.display = 'flex';
        document.getElementById('tb-username-label').textContent = username;
        
        // IMPORTANT: Show the navigation bar after login
        const tbNav = document.getElementById('tb-nav');
        if (tbNav) tbNav.style.display = 'flex';
        
        setTimeout(() => {
            goPage('home');
        }, 1000);
    } else {
        errorDiv.textContent = 'Invalid username or password';
        errorDiv.style.display = 'block';
    }
}

// ========== SIGNUP ==========
function doSignup() {
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const errorDiv = document.getElementById('signup-error');
    const successDiv = document.getElementById('signup-success');
    
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    if (!username || !email || !password || !confirm) {
        errorDiv.textContent = 'All fields are required';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (password !== confirm) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (users.find(u => u.username === username)) {
        errorDiv.textContent = 'Username already exists';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (users.find(u => u.email === email)) {
        errorDiv.textContent = 'Email already registered';
        errorDiv.style.display = 'block';
        return;
    }
    
    users.push({ username, email, password, history: [] });
    saveUsers();
    
    successDiv.textContent = 'Account created successfully! Please login.';
    successDiv.style.display = 'block';
    
    document.getElementById('signup-username').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-confirm').value = '';
    
    setTimeout(() => {
        goPage('login');
    }, 1500);
}

// ========== LOGOUT ==========
function logout() {
    localStorage.removeItem('agroai_current_user');
    detectionHistory = [];
    document.getElementById('tb-guest').style.display = 'flex';
    document.getElementById('tb-user').style.display = 'none';
    
    // Hide navigation bar on logout
    const tbNav = document.getElementById('tb-nav');
    if (tbNav) tbNav.style.display = 'none';
    
    goPage('landing');
}

// ========== FORGOT PASSWORD ==========
function doForgot() {
    const email = document.getElementById('forgot-email').value.trim();
    const errorDiv = document.getElementById('forgot-error');
    const successDiv = document.getElementById('forgot-success');
    const newPwGroup = document.getElementById('new-pw-group');
    const confirmPwGroup = document.getElementById('confirm-pw-group');
    const forgotBtn = document.getElementById('forgot-btn');
    
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
        errorDiv.textContent = 'No account found with this email';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (forgotBtn.textContent === 'Verify Email') {
        newPwGroup.style.display = 'block';
        confirmPwGroup.style.display = 'block';
        forgotBtn.textContent = 'Reset Password';
        successDiv.innerHTML = `Email verified! Please enter your new password.`;
        successDiv.style.display = 'block';
    } else {
        const newPassword = document.getElementById('forgot-newpw').value;
        const confirmPassword = document.getElementById('forgot-confirmpw').value;
        
        if (!newPassword || !confirmPassword) {
            errorDiv.textContent = 'Please enter new password';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (newPassword.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            errorDiv.style.display = 'block';
            return;
        }
        
        user.password = newPassword;
        saveUsers();
        
        successDiv.innerHTML = 'Password reset successful! Please login with your new password.';
        successDiv.style.display = 'block';
        
        document.getElementById('forgot-email').value = '';
        document.getElementById('forgot-newpw').value = '';
        document.getElementById('forgot-confirmpw').value = '';
        newPwGroup.style.display = 'none';
        confirmPwGroup.style.display = 'none';
        forgotBtn.textContent = 'Verify Email';
        
        setTimeout(() => {
            goPage('login');
        }, 2000);
    }
}

// ========== POPULATE DISEASE TABLE ==========
function populateDiseaseTable() {
    const tableContainer = document.getElementById('disease-table');
    if (!tableContainer) return;
    
    const diseases = Object.keys(diseaseData);
    tableContainer.innerHTML = diseases.map(disease => `
        <div class="drow">
            <div class="drow-name">${disease}</div>
            <span class="badge ${getSeverityClass(diseaseData[disease].severity)}">${diseaseData[disease].severity || 'Unknown'}</span>
        </div>
    `).join('');
}

function getSeverityClass(severity) {
    const map = {
        'None': 'badge-none',
        'Low': 'badge-low',
        'Medium': 'badge-medium',
        'High': 'badge-high',
        'Critical': 'badge-critical'
    };
    return map[severity] || 'badge-medium';
}

// ========== REFRESH HISTORY DISPLAY ==========
function refreshHistoryDisplay() {
    const tbody = document.getElementById('history-body');
    const totalSpan = document.getElementById('m-total');
    const diseasedSpan = document.getElementById('m-diseased');
    const healthySpan = document.getElementById('m-healthy');
    const avgSpan = document.getElementById('m-avg');
    
    if (!tbody) return;
    
    const total = detectionHistory.length;
    const diseased = detectionHistory.filter(h => h.disease !== 'Healthy').length;
    const healthy = detectionHistory.filter(h => h.disease === 'Healthy').length;
    const avgConf = total > 0 ? (detectionHistory.reduce((sum, h) => sum + h.confidence, 0) / total).toFixed(1) : '—';
    
    if (totalSpan) totalSpan.textContent = total;
    if (diseasedSpan) diseasedSpan.textContent = diseased;
    if (healthySpan) healthySpan.textContent = healthy;
    if (avgSpan) avgSpan.textContent = avgConf !== '—' ? `${avgConf}%` : '—';
    
    if (detectionHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No detections yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = detectionHistory.slice().reverse().map(h => `
        <tr>
            <td><strong>${h.disease}</strong><br><small style="color:#64748b">${diseaseData[h.disease]?.treatment?.substring(0, 60)}...</small></td>
            <td>${h.confidence}%</td>
            <td><span class="severity-badge ${h.disease === 'Healthy' ? 'severity-low' : 'severity-high'}">${diseaseData[h.disease]?.severity || 'Unknown'}</span></td>
            <td>${h.timestamp}</td>
        </tr>
    `).join('');
}

function clearHistory() {
    if (confirm('Clear all detection history?')) {
        detectionHistory = [];
        saveHistory();
        refreshHistoryDisplay();
        showToast('History cleared', 'success');
    }
}

// ========== SIMULATE DISEASE DETECTION ==========
function simulateDetection(imageFile) {
    const diseases = Object.keys(diseaseData);
    const randomIndex = Math.floor(Math.random() * diseases.length);
    const randomDisease = diseases[randomIndex];
    const confidence = (75 + Math.random() * 24).toFixed(1);
    
    const result = {
        disease: randomDisease,
        confidence: parseFloat(confidence),
        timestamp: new Date().toLocaleString(),
        severity: diseaseData[randomDisease]?.severity || 'Medium',
        treatment: diseaseData[randomDisease]?.treatment || 'Consult local expert.',
        prevention: diseaseData[randomDisease]?.prevention || 'Regular monitoring recommended.'
    };
    
    detectionHistory.push(result);
    saveHistory();
    
    return result;
}

// ========== SHOW TOAST NOTIFICATION ==========
function showToast(message, type = 'info') {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// ========== INITIALIZE CHART ==========
function initModelChart() {
    const ctx = document.getElementById('model-chart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['YOLOv8', 'SVM', 'Random Forest', 'Decision Tree'],
            datasets: [{
                label: 'Accuracy (%)',
                data: [96.7, 83.1, 78.4, 71.2],
                backgroundColor: ['#2166c4', '#64748b', '#94a3b8', '#cbd5e1'],
                borderRadius: 8,
                barPercentage: 0.65
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw}%` } }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    max: 100,
                    title: { display: true, text: 'Accuracy (%)', font: { size: 11 } }
                }
            }
        }
    });
}

// ========== NAVIGATION HELPERS ==========
function navToLogin() { goPage('login'); }
function navToSignup() { goPage('signup'); }

// ========== CHECK LOGIN STATE ON LOAD ==========
function checkLoginState() {
    const currentUser = JSON.parse(localStorage.getItem('agroai_current_user'));
    const tbNav = document.getElementById('tb-nav');
    
    if (currentUser) {
        const user = users.find(u => u.username === currentUser.username);
        if (user && user.history) {
            detectionHistory = user.history;
        }
        document.getElementById('tb-guest').style.display = 'none';
        document.getElementById('tb-user').style.display = 'flex';
        document.getElementById('tb-username-label').textContent = currentUser.username;
        
        // Show navigation bar when logged in
        if (tbNav) tbNav.style.display = 'flex';
    } else {
        document.getElementById('tb-guest').style.display = 'flex';
        document.getElementById('tb-user').style.display = 'none';
        
        // Hide navigation bar when logged out
        if (tbNav) tbNav.style.display = 'none';
    }
}

// ========== CLEAR IMAGE ==========
window.clearImage = function() {
    const fileInput = document.getElementById('file-input');
    const previewImg = document.getElementById('preview-img');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const clearBtn = document.getElementById('clear-btn');
    const resultPlaceholder = document.getElementById('result-placeholder');
    const resultOutput = document.getElementById('result-output');
    const loadingBox = document.getElementById('loading-box');
    
    if (fileInput) fileInput.value = '';
    if (previewImg) previewImg.classList.add('hidden');
    if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
    if (clearBtn) clearBtn.style.display = 'none';
    if (resultPlaceholder) resultPlaceholder.style.display = 'flex';
    if (resultOutput) resultOutput.classList.add('hidden');
    if (loadingBox) loadingBox.classList.add('hidden');
};

// ========== SETUP NAVIGATION BUTTON CLICKS ==========
function setupNavigationButtons() {
    // Add click handlers to topbar navigation buttons
    const navButtons = document.querySelectorAll('.tb-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (page) {
                goPage(page);
            }
        });
    });
}

// ========== EXPOSE FUNCTIONS GLOBALLY ==========
window.goPage = goPage;
window.doLogin = doLogin;
window.doSignup = doSignup;
window.logout = logout;
window.doForgot = doForgot;
window.navToLogin = navToLogin;
window.navToSignup = navToSignup;
window.clearHistory = clearHistory;
window.togglePw = function(inputId, btn) {
    var inp = document.getElementById(inputId);
    var isHidden = inp.type === 'password';
    inp.type = isHidden ? 'text' : 'password';
    if (btn) {
        var openEye = btn.querySelector('.eye-open');
        var offEye = btn.querySelector('.eye-off');
        if (openEye && offEye) {
            openEye.style.display = isHidden ? 'none' : '';
            offEye.style.display = isHidden ? '' : 'none';
        }
    }
};

// ========== DOM CONTENT LOADED ==========
document.addEventListener('DOMContentLoaded', () => {
    checkLoginState();
    setupNavigationButtons(); // IMPORTANT: This adds click handlers to nav buttons
    goPage('landing');
    populateDiseaseTable();
    initModelChart();
    
    // Set up file upload for detection
    const fileInput = document.getElementById('file-input');
    const uploadZone = document.getElementById('upload-zone');
    const previewImg = document.getElementById('preview-img');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const resultPlaceholder = document.getElementById('result-placeholder');
    const loadingBox = document.getElementById('loading-box');
    const resultOutput = document.getElementById('result-output');
    const clearBtn = document.getElementById('clear-btn');
    
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (previewImg) {
                        previewImg.src = event.target.result;
                        previewImg.classList.remove('hidden');
                    }
                    if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
                    if (clearBtn) clearBtn.style.display = 'inline-block';
                    
                    if (resultPlaceholder) resultPlaceholder.style.display = 'none';
                    if (loadingBox) loadingBox.classList.remove('hidden');
                    if (resultOutput) resultOutput.classList.add('hidden');
                    
                    setTimeout(() => {
                        const result = simulateDetection(file);
                        if (loadingBox) loadingBox.classList.add('hidden');
                        if (resultOutput) {
                            resultOutput.classList.remove('hidden');
                            resultOutput.innerHTML = `
                                <div style="text-align:center">
                                    <div style="font-size:22px;font-weight:700;color:var(--slate900);margin-bottom:8px">${result.disease}</div>
                                    <div style="margin-bottom:12px"><span class="badge ${getSeverityClass(result.severity)}">${result.severity} Severity</span></div>
                                    <div class="conf-wrap" style="max-width:300px;margin:0 auto 12px auto">
                                        <div class="conf-fill" style="width:${result.confidence}%;background:var(--b500)"></div>
                                    </div>
                                    <div style="font-size:14px;color:var(--slate600);margin-bottom:16px">Confidence: ${result.confidence}%</div>
                                    <div style="background:var(--slate50);border-radius:12px;padding:16px;margin-bottom:16px;text-align:left">
                                        <div style="font-weight:600;margin-bottom:6px">💊 Treatment</div>
                                        <div style="font-size:13px;color:var(--slate600);margin-bottom:12px">${result.treatment}</div>
                                        <div style="font-weight:600;margin-bottom:6px">🛡️ Prevention</div>
                                        <div style="font-size:13px;color:var(--slate600)">${result.prevention}</div>
                                    </div>
                                    <button class="btn-primary" onclick="goPage('results')">View History →</button>
                                </div>
                            `;
                        }
                        refreshHistoryDisplay();
                        showToast(`Detection complete: ${result.disease}`, 'success');
                    }, 1500);
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (uploadZone) {
        uploadZone.addEventListener('click', (e) => {
            if (e.target.id !== 'browse-btn' && e.target.closest('#browse-btn') === null && fileInput) {
                fileInput.click();
            }
        });
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && (file.type === 'image/jpeg' || file.type === 'image/png') && fileInput) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
                const changeEvent = new Event('change');
                fileInput.dispatchEvent(changeEvent);
            } else {
                showToast('Please upload a JPG or PNG image', 'error');
            }
        });
    }
    
    const browseBtn = document.getElementById('browse-btn');
    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }
    
    const style = document.createElement('style');
    style.textContent = `
        .severity-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
        }
        .severity-low { background: #dcfce7; color: #166534; }
        .severity-high { background: #fee2e2; color: #991b1b; }
        .drag-over { border-color: #2166c4 !important; background: #dceeff !important; }
    `;
    document.head.appendChild(style);
});
