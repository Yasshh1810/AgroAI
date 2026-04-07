// ========== USER DATABASE (localStorage) ==========
let users = JSON.parse(localStorage.getItem('agroai_users')) || [];

function saveUsers() {
    localStorage.setItem('agroai_users', JSON.stringify(users));
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
    
    // Show/hide nav based on page
    const tbNav = document.getElementById('tb-nav');
    if (tbNav) {
        if (pageId === 'home' || pageId === 'detect' || pageId === 'model' || pageId === 'results' || pageId === 'about') {
            tbNav.style.display = 'flex';
        } else {
            tbNav.style.display = 'none';
        }
    }
    
    // Refresh history if on results page
    if (pageId === 'results') refreshHistoryDisplay();
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
        localStorage.setItem('agroai_current_user', JSON.stringify({ username: user.username, email: user.email }));
        successDiv.textContent = 'Login successful! Redirecting...';
        successDiv.style.display = 'block';
        
        // Update UI for logged in user
        document.getElementById('tb-guest').style.display = 'none';
        document.getElementById('tb-user').style.display = 'flex';
        document.getElementById('tb-username-label').textContent = username;
        
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
    
    // Create new user
    users.push({ username, email, password, history: [] });
    saveUsers();
    
    successDiv.textContent = 'Account created successfully! Please login.';
    successDiv.style.display = 'block';
    
    // Clear form
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
    document.getElementById('tb-guest').style.display = 'flex';
    document.getElementById('tb-user').style.display = 'none';
    goPage('landing');
}

// ========== FORGOT PASSWORD ==========
function doForgot() {
    const email = document.getElementById('forgot-email').value.trim();
    const errorDiv = document.getElementById('forgot-error');
    const successDiv = document.getElementById('forgot-success');
    
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
        errorDiv.textContent = 'No account found with this email';
        errorDiv.style.display = 'block';
        return;
    }
    
    // Simple reset: just show the password (in real app, send email)
    successDiv.innerHTML = `Your account password is: <strong>${user.password}</strong><br>Please login and change it.`;
    successDiv.style.display = 'block';
}

// ========== NAVIGATION HELPERS ==========
function navToLogin() { goPage('login'); }
function navToSignup() { goPage('signup'); }

// ========== CHECK LOGIN STATE ON LOAD ==========
function checkLoginState() {
    const currentUser = JSON.parse(localStorage.getItem('agroai_current_user'));
    if (currentUser) {
        document.getElementById('tb-guest').style.display = 'none';
        document.getElementById('tb-user').style.display = 'flex';
        document.getElementById('tb-username-label').textContent = currentUser.username;
    } else {
        document.getElementById('tb-guest').style.display = 'flex';
        document.getElementById('tb-user').style.display = 'none';
    }
}

// ========== DISEASE DATABASE ==========
const diseaseData = {
    'Bacterial Spot': { severity: 'Moderate', treatment: 'Apply copper-based bactericide. Remove infected leaves.' },
    'Early Blight': { severity: 'High', treatment: 'Use fungicides containing chlorothalonil. Improve air circulation.' },
    'Late Blight': { severity: 'Critical', treatment: 'Apply metalaxyl or mancozeb. Destroy severely infected plants.' },
    'Leaf Mold': { severity: 'Moderate', treatment: 'Reduce humidity. Apply fungicide with chlorothalonil.' },
    'Septoria Leaf Spot': { severity: 'Moderate', treatment: 'Remove affected leaves. Apply copper fungicide.' },
    'Spider Mites': { severity: 'Low', treatment: 'Use insecticidal soap or neem oil. Increase humidity.' },
    'Target Spot': { severity: 'Moderate', treatment: 'Apply fungicide. Avoid overhead watering.' },
    'Yellow Leaf Curl Virus': { severity: 'High', treatment: 'Remove infected plants. Control whitefly population.' },
    'Mosaic Virus': { severity: 'High', treatment: 'No cure. Remove and destroy infected plants.' },
    'Healthy': { severity: 'None', treatment: 'Continue regular care and monitoring.' }
};

// ========== DETECTION SIMULATION ==========
let detectionHistory = JSON.parse(localStorage.getItem('agroai_history')) || [];

function saveHistory() {
    localStorage.setItem('agroai_history', JSON.stringify(detectionHistory));
}

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
    }
}

// Simulate detection (since no real backend)
function simulateDetection(imageFile) {
    const diseases = ['Bacterial Spot', 'Early Blight', 'Late Blight', 'Leaf Mold', 'Septoria Leaf Spot', 'Spider Mites', 'Target Spot', 'Yellow Leaf Curl Virus', 'Mosaic Virus', 'Healthy'];
    const randomDisease = diseases[Math.floor(Math.random() * diseases.length)];
    const confidence = (85 + Math.random() * 14).toFixed(1);
    
    const result = {
        disease: randomDisease,
        confidence: parseFloat(confidence),
        timestamp: new Date().toLocaleString(),
        severity: diseaseData[randomDisease]?.severity || 'Moderate',
        treatment: diseaseData[randomDisease]?.treatment || 'Consult local expert.'
    };
    
    detectionHistory.push(result);
    saveHistory();
    
    return result;
}

// ========== EXPOSE FOR GLOBAL USE ==========
window.goPage = goPage;
window.doLogin = doLogin;
window.doSignup = doSignup;
window.logout = logout;
window.doForgot = doForgot;
window.navToLogin = navToLogin;
window.navToSignup = navToSignup;
window.clearHistory = clearHistory;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    checkLoginState();
    goPage('landing');
    
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
                    previewImg.src = event.target.result;
                    previewImg.classList.remove('hidden');
                    uploadPlaceholder.style.display = 'none';
                    if (clearBtn) clearBtn.style.display = 'inline-block';
                    
                    // Simulate detection
                    resultPlaceholder.style.display = 'none';
                    loadingBox.classList.remove('hidden');
                    resultOutput.classList.add('hidden');
                    
                    setTimeout(() => {
                        const result = simulateDetection(file);
                        loadingBox.classList.add('hidden');
                        resultOutput.classList.remove('hidden');
                        resultOutput.innerHTML = `
                            <div style="text-align:center">
                                <div class="detection-disease">${result.disease}</div>
                                <div class="detection-conf">Confidence: ${result.confidence}%</div>
                                <div class="detection-severity">Severity: ${result.severity}</div>
                                <div class="detection-treatment">${result.treatment}</div>
                                <button class="btn-primary mt-12" onclick="goPage('results')">View History</button>
                            </div>
                        `;
                        refreshHistoryDisplay();
                    }, 1500);
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (uploadZone) {
        uploadZone.addEventListener('click', (e) => {
            if (e.target.id !== 'browse-btn' && e.target.closest('#browse-btn') === null) {
                fileInput.click();
            }
        });
    }
    
    const browseBtn = document.getElementById('browse-btn');
    if (browseBtn) {
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }
});

window.clearImage = function() {
    const fileInput = document.getElementById('file-input');
    const previewImg = document.getElementById('preview-img');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const clearBtn = document.getElementById('clear-btn');
    const resultPlaceholder = document.getElementById('result-placeholder');
    const resultOutput = document.getElementById('result-output');
    
    fileInput.value = '';
    previewImg.classList.add('hidden');
    uploadPlaceholder.style.display = 'flex';
    if (clearBtn) clearBtn.style.display = 'none';
    resultPlaceholder.style.display = 'flex';
    resultOutput.classList.add('hidden');
};
