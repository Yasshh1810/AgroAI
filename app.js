// ========== AGROAI - MAIN APPLICATION ==========
// Global variables
let currentUser = null;
let currentDetection = null;
let historyChart = null;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    setupEventListeners();
    loadDiseaseTable();
    initializeModelChart();
});

function checkLoginStatus() {
    const savedUser = localStorage.getItem('agroai_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedInUser();
        showPage('home');
    } else {
        updateUIForGuest();
        showPage('landing');
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.tb-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = btn.dataset.page;
            if (page) goPage(page);
        });
    });
    
    // File upload handling
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    
    if (uploadZone) {
        uploadZone.addEventListener('click', (e) => {
            if (e.target.id !== 'browse-btn') {
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
            if (file && file.type.startsWith('image/')) {
                handleImageUpload(file);
            }
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleImageUpload(e.target.files[0]);
            }
        });
    }
    
    if (browseBtn) {
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }
}

// ========== NAVIGATION ==========
function goPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update navigation buttons
    document.querySelectorAll('.tb-btn').forEach(btn => {
        if (btn.dataset.page === pageId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Load page-specific data
    if (pageId === 'results' && currentUser) {
        loadHistory();
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function navToLogin() {
    goPage('login');
}

function navToSignup() {
    goPage('signup');
}

// ========== AUTHENTICATION ==========
async function doLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showError('login', 'Please enter both username and password');
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            currentUser = { username: data.username, email: data.email };
            localStorage.setItem('agroai_user', JSON.stringify(currentUser));
            updateUIForLoggedInUser();
            showToast('Login successful!', 'success');
            goPage('home');
        } else {
            showError('login', data.message || 'Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('login', 'Network error. Please try again.');
    }
}

async function doSignup() {
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    
    if (!username || !email || !password) {
        showError('signup', 'Please fill in all fields');
        return;
    }
    
    if (password !== confirm) {
        showError('signup', 'Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showError('signup', 'Password must be at least 6 characters');
        return;
    }
    
    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showSuccess('signup', 'Account created! Please login.');
            setTimeout(() => goPage('login'), 2000);
        } else {
            showError('signup', data.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showError('signup', 'Network error. Please try again.');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('agroai_user');
    updateUIForGuest();
    showToast('Logged out successfully', 'info');
    goPage('landing');
}

// ========== UI UPDATES ==========
function updateUIForLoggedInUser() {
    const guestDiv = document.getElementById('tb-guest');
    const userDiv = document.getElementById('tb-user');
    const usernameLabel = document.getElementById('tb-username-label');
    const nav = document.getElementById('tb-nav');
    
    if (guestDiv) guestDiv.style.display = 'none';
    if (userDiv) {
        userDiv.style.display = 'flex';
        if (usernameLabel && currentUser) {
            usernameLabel.textContent = currentUser.username;
        }
    }
    if (nav) nav.style.display = 'flex';
}

function updateUIForGuest() {
    const guestDiv = document.getElementById('tb-guest');
    const userDiv = document.getElementById('tb-user');
    const nav = document.getElementById('tb-nav');
    
    if (guestDiv) guestDiv.style.display = 'flex';
    if (userDiv) userDiv.style.display = 'none';
    if (nav) nav.style.display = 'none';
}

function showError(page, message) {
    const errorDiv = document.getElementById(`${page}-error`);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

function showSuccess(page, message) {
    const successDiv = document.getElementById(`${page}-success`);
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
}

function showToast(message, type = 'info') {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// ========== IMAGE DETECTION ==========
async function handleImageUpload(file) {
    // Show preview
    const preview = document.getElementById('preview-img');
    const placeholder = document.getElementById('upload-placeholder');
    const clearBtn = document.getElementById('clear-btn');
    
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
        preview.classList.remove('hidden');
        placeholder.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
    
    // Show loading
    const resultPlaceholder = document.getElementById('result-placeholder');
    const loadingBox = document.getElementById('loading-box');
    const resultOutput = document.getElementById('result-output');
    
    if (resultPlaceholder) resultPlaceholder.classList.add('hidden');
    if (loadingBox) loadingBox.classList.remove('hidden');
    if (resultOutput) resultOutput.classList.add('hidden');
    
    // Send to API
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayDetectionResult(result);
            currentDetection = result;
            
            // Save to history if user is logged in
            if (currentUser) {
                await saveDetection(result);
            }
        } else {
            throw new Error(result.message || 'Detection failed');
        }
    } catch (error) {
        console.error('Detection error:', error);
        showToast('Failed to analyze image. Please try again.', 'error');
        resetDetectionUI();
    } finally {
        if (loadingBox) loadingBox.classList.add('hidden');
    }
}

function displayDetectionResult(result) {
    const resultOutput = document.getElementById('result-output');
    if (!resultOutput) return;
    
    const severityClass = getSeverityClass(result.severity);
    
    const html = `
        <div class="result-block">
            <div class="result-name">${result.disease}</div>
            <div class="result-conf">
                Confidence: ${(result.confidence * 100).toFixed(1)}%
                <span class="badge ${severityClass}">${result.severity} Severity</span>
            </div>
            <div class="conf-wrap">
                <div class="conf-fill" style="width: ${result.confidence * 100}%; background: ${getConfidenceColor(result.confidence)}"></div>
            </div>
            
            ${result.annotated_image ? `
            <div class="result-label">Analyzed Image</div>
            <img src="data:image/jpeg;base64,${result.annotated_image}" class="annotated-img" alt="Analyzed leaf">
            ` : ''}
            
            <div class="result-label">Symptoms</div>
            <div class="result-value">${result.symptoms || 'No specific symptoms detected.'}</div>
            
            <div class="result-label">Treatment</div>
            <div class="result-value">${result.treatment || 'Consult a local agricultural expert for treatment options.'}</div>
            
            <div class="result-label">Prevention</div>
            <div class="result-value">${result.prevention || 'Maintain good agricultural practices and regular monitoring.'}</div>
            
            ${result.num_boxes > 0 ? `<div class="result-label">Detected Regions: ${result.num_boxes}</div>` : ''}
        </div>
    `;
    
    resultOutput.innerHTML = html;
    resultOutput.classList.remove('hidden');
}

function resetDetectionUI() {
    const resultPlaceholder = document.getElementById('result-placeholder');
    const resultOutput = document.getElementById('result-output');
    const loadingBox = document.getElementById('loading-box');
    
    if (resultPlaceholder) resultPlaceholder.classList.remove('hidden');
    if (resultOutput) resultOutput.classList.add('hidden');
    if (loadingBox) loadingBox.classList.add('hidden');
}

function clearImage() {
    const preview = document.getElementById('preview-img');
    const placeholder = document.getElementById('upload-placeholder');
    const clearBtn = document.getElementById('clear-btn');
    const fileInput = document.getElementById('file-input');
    
    preview.classList.add('hidden');
    preview.src = '';
    placeholder.style.display = 'flex';
    if (clearBtn) clearBtn.style.display = 'none';
    if (fileInput) fileInput.value = '';
    
    resetDetectionUI();
}

function getSeverityClass(severity) {
    const map = {
        'Critical': 'badge-critical',
        'High': 'badge-high',
        'Medium': 'badge-medium',
        'Low': 'badge-low',
        'None': 'badge-none'
    };
    return map[severity] || 'badge-low';
}

function getConfidenceColor(confidence) {
    if (confidence > 0.7) return '#16a34a';
    if (confidence > 0.4) return '#eab308';
    return '#ef4444';
}

// ========== HISTORY MANAGEMENT ==========
async function saveDetection(result) {
    try {
        const response = await fetch('/api/save-detection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser.username,
                disease: result.disease,
                confidence: result.confidence,
                severity: result.severity
            })
        });
        
        if (response.ok) {
            showToast('Detection saved to history', 'success');
        }
    } catch (error) {
        console.error('Error saving detection:', error);
    }
}

async function loadHistory() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/history/${currentUser.username}`);
        const data = await response.json();
        
        if (response.ok) {
            displayHistory(data.history);
            updateStats(data.history);
        }
    } catch (error) {
        console.error('Error loading history:', error);
        showToast('Failed to load history', 'error');
    }
}

function displayHistory(history) {
    const tbody = document.getElementById('history-body');
    if (!tbody) return;
    
    if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No detections yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = history.map(record => `
        <tr>
            <td><strong>${record.disease}</strong></td>
            <td>${(record.confidence * 100).toFixed(1)}%</td>
            <td><span class="badge ${getSeverityClass(record.severity)}">${record.severity}</span></td>
            <td>${record.timestamp}</td>
        </tr>
    `).join('');
}

function updateStats(history) {
    const total = history.length;
    const diseased = history.filter(h => h.disease !== 'Healthy' && h.disease !== 'No Disease Detected').length;
    const healthy = total - diseased;
    const avgConfidence = history.reduce((sum, h) => sum + h.confidence, 0) / (total || 1);
    
    document.getElementById('m-total').textContent = total;
    document.getElementById('m-diseased').textContent = diseased;
    document.getElementById('m-healthy').textContent = healthy;
    document.getElementById('m-avg').textContent = `${(avgConfidence * 100).toFixed(1)}%`;
}

async function clearHistory() {
    if (!currentUser) return;
    
    if (confirm('Are you sure you want to clear all detection history?')) {
        try {
            const response = await fetch(`/api/history/${currentUser.username}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showToast('History cleared', 'success');
                loadHistory();
            }
        } catch (error) {
            console.error('Error clearing history:', error);
            showToast('Failed to clear history', 'error');
        }
    }
}

// ========== FORGOT PASSWORD ==========
let forgotStep = 1;

async function doForgot() {
    const email = document.getElementById('forgot-email').value.trim();
    
    if (forgotStep === 1) {
        if (!email) {
            showError('forgot', 'Please enter your email address');
            return;
        }
        
        try {
            const response = await fetch('/api/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Show password fields
                document.getElementById('new-pw-group').style.display = 'block';
                document.getElementById('confirm-pw-group').style.display = 'block';
                document.getElementById('forgot-btn').textContent = 'Reset Password';
                forgotStep = 2;
                showSuccess('forgot', 'Email verified. Enter new password.');
            } else {
                showError('forgot', data.message || 'Email not found');
            }
        } catch (error) {
            console.error('Verification error:', error);
            showError('forgot', 'Network error. Please try again.');
        }
    } else {
        const newPassword = document.getElementById('forgot-newpw').value;
        const confirmPassword = document.getElementById('forgot-confirmpw').value;
        
        if (!newPassword || !confirmPassword) {
            showError('forgot', 'Please enter and confirm your new password');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showError('forgot', 'Passwords do not match');
            return;
        }
        
        if (newPassword.length < 6) {
            showError('forgot', 'Password must be at least 6 characters');
            return;
        }
        
        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, new_password: newPassword })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                showSuccess('forgot', 'Password reset successfully! Redirecting to login...');
                setTimeout(() => {
                    goPage('login');
                }, 2000);
            } else {
                showError('forgot', data.message || 'Password reset failed');
            }
        } catch (error) {
            console.error('Reset error:', error);
            showError('forgot', 'Network error. Please try again.');
        }
    }
}

// ========== DISEASE TABLE ==========
function loadDiseaseTable() {
    const diseases = [
        { name: 'Bacterial Spot', severity: 'High' },
        { name: 'Early Blight', severity: 'Medium' },
        { name: 'Late Blight', severity: 'Critical' },
        { name: 'Leaf Mold', severity: 'Medium' },
        { name: 'Septoria Leaf Spot', severity: 'Medium' },
        { name: 'Spider Mites', severity: 'Low' },
        { name: 'Target Spot', severity: 'Medium' },
        { name: 'Yellow Leaf Curl Virus', severity: 'Critical' },
        { name: 'Healthy', severity: 'None' },
        { name: 'Tomato Mosaic Virus', severity: 'High' }
    ];
    
    const tableContainer = document.getElementById('disease-table');
    if (!tableContainer) return;
    
    tableContainer.innerHTML = diseases.map(disease => `
        <div class="drow">
            <div class="drow-name">${disease.name}</div>
            <span class="badge ${getSeverityClass(disease.severity)}">${disease.severity}</span>
        </div>
    `).join('');
}

// ========== MODEL CHART ==========
function initializeModelChart() {
    const ctx = document.getElementById('model-chart');
    if (!ctx) return;
    
    historyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['YOLOv8', 'Random Forest', 'Decision Tree', 'SVM', 'CNN'],
            datasets: [{
                label: 'Accuracy (%)',
                data: [96.7, 78.4, 71.2, 83.1, 92.5],
                backgroundColor: [
                    '#2166c4',
                    '#64748b',
                    '#64748b',
                    '#64748b',
                    '#4d8fd6'
                ],
                borderRadius: 8,
                barPercentage: 0.7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw}% accuracy`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Accuracy (%)'
                    }
                }
            }
        }
    });
}

// ========== ADD MISSING FUNCTIONS ==========
function showPage(pageId) {
    // Alias for goPage for compatibility
    goPage(pageId);
}

function initializeModelChart() {
    // This function is already defined above
    // Keeping as placeholder for any additional initialization
    console.log('Model chart initialized');
}

// ========== EXPORT FOR GLOBAL ACCESS ==========
// Make functions available globally for HTML onclick
window.goPage = goPage;
window.doLogin = doLogin;
window.doSignup = doSignup;
window.logout = logout;
window.clearImage = clearImage;
window.clearHistory = clearHistory;
window.doForgot = doForgot;
window.navToLogin = navToLogin;
window.navToSignup = navToSignup;