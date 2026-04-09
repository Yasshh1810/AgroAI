// ══════════════════════════════════════════════
//  AgroAI — frontend app.js (Production Ready)
// ══════════════════════════════════════════════

// API Configuration
const API_BASE_URL = process.env.API_URL || 'https://your-backend.onrender.com';
const API_URL = `${API_BASE_URL}/api`;

// Global state
let currentUser = null;
let authToken = null;

// ══════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ══════════════════════════════════════════════

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString();
}

// ══════════════════════════════════════════════
//  AUTHENTICATION FUNCTIONS
// ══════════════════════════════════════════════

async function signup(event) {
    event.preventDefault();
    
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            authToken = data.access_token;
            currentUser = { username: data.username, email: data.email };
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            showNotification('Signup successful! Welcome!', 'success');
            showMainApp();
        } else {
            showNotification(data.error || data.detail || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            authToken = data.access_token;
            currentUser = { username: data.username, email: data.email };
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            showNotification(`Welcome back, ${currentUser.username}!`, 'success');
            showMainApp();
        } else {
            showNotification(data.error || data.detail || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    showAuthForms();
    showNotification('Logged out successfully', 'info');
}

// ══════════════════════════════════════════════
//  UI NAVIGATION
// ══════════════════════════════════════════════

function showAuthForms() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('user-email').textContent = '';
}

function showMainApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('user-email').textContent = currentUser?.email || '';
    loadHistory();
    loadStats();
    loadDiseasesList();
}

function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load data when switching to specific tabs
    if (tabName === 'history') loadHistory();
    if (tabName === 'stats') loadStats();
    if (tabName === 'diseases') loadDiseasesList();
}

// ══════════════════════════════════════════════
//  IMAGE PREDICTION
// ══════════════════════════════════════════════

async function predictImage() {
    const fileInput = document.getElementById('image-input');
    const resultDiv = document.getElementById('prediction-result');
    const loadingDiv = document.getElementById('loading');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        showNotification('Please select an image first', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    // Add username if authenticated
    if (currentUser) {
        formData.append('username', currentUser.username);
    }
    
    // Show loading
    loadingDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    
    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Display result
            const severityClass = data.severity.toLowerCase();
            resultDiv.innerHTML = `
                <h3>Detection Result</h3>
                <div class="result-disease">Disease: ${data.disease}</div>
                <div class="result-severity ${severityClass}">Severity: ${data.severity}</div>
                <div class="result-confidence">Confidence: ${(data.confidence * 100).toFixed(1)}%</div>
                <div class="result-treatment">Treatment: ${data.treatment}</div>
                ${data.mode === 'demo_fallback' ? '<div class="demo-note">⚠️ Demo mode (model loading issue)</div>' : ''}
            `;
            resultDiv.style.display = 'block';
            
            showNotification('Prediction completed successfully!', 'success');
            
            // Refresh history if authenticated
            if (currentUser) {
                loadHistory();
                loadStats();
            }
        } else {
            showNotification(data.error || data.detail || 'Prediction failed', 'error');
        }
    } catch (error) {
        console.error('Prediction error:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// ══════════════════════════════════════════════
//  HISTORY FUNCTIONS
// ══════════════════════════════════════════════

async function loadHistory() {
    if (!currentUser) return;
    
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<div class="loading">Loading history...</div>';
    
    try {
        const response = await fetch(`${API_URL}/history?limit=50`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.history) {
            if (data.history.length === 0) {
                historyList.innerHTML = '<div class="no-data">No detection history yet. Upload an image to get started!</div>';
                return;
            }
            
            historyList.innerHTML = data.history.map(item => `
                <div class="history-item">
                    <div class="history-disease">${item.disease}</div>
                    <div class="history-severity ${item.severity.toLowerCase()}">${item.severity}</div>
                    <div class="history-confidence">${(item.confidence * 100).toFixed(1)}% confidence</div>
                    <div class="history-date">${formatDate(item.timestamp)}</div>
                    <div class="history-treatment">${item.treatment}</div>
                </div>
            `).join('');
        } else {
            historyList.innerHTML = '<div class="error">Failed to load history</div>';
        }
    } catch (error) {
        console.error('Load history error:', error);
        historyList.innerHTML = '<div class="error">Network error loading history</div>';
    }
}

async function clearHistory() {
    if (!confirm('Are you sure you want to clear all your detection history?')) return;
    
    try {
        const response = await fetch(`${API_URL}/history`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification(`Cleared ${data.deleted_count} history items`, 'success');
            loadHistory();
            loadStats();
        } else {
            showNotification('Failed to clear history', 'error');
        }
    } catch (error) {
        console.error('Clear history error:', error);
        showNotification('Network error', 'error');
    }
}

// ══════════════════════════════════════════════
//  STATISTICS FUNCTIONS
// ══════════════════════════════════════════════

async function loadStats() {
    if (!currentUser) return;
    
    const statsContent = document.getElementById('stats-content');
    statsContent.innerHTML = '<div class="loading">Loading statistics...</div>';
    
    try {
        const response = await fetch(`${API_URL}/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            statsContent.innerHTML = `
                <div class="stat-card">
                    <h4>Total Detections</h4>
                    <div class="stat-value">${data.total_detections}</div>
                </div>
                <div class="stat-card">
                    <h4>Average Confidence</h4>
                    <div class="stat-value">${(data.average_confidence * 100).toFixed(1)}%</div>
                </div>
                <div class="stat-card">
                    <h4>Severity Breakdown</h4>
                    <div class="severity-breakdown">
                        <div>Critical: ${data.by_severity.Critical || 0}</div>
                        <div>High: ${data.by_severity.High || 0}</div>
                        <div>Medium: ${data.by_severity.Medium || 0}</div>
                        <div>Low: ${data.by_severity.Low || 0}</div>
                    </div>
                </div>
                ${data.last_detection ? `
                <div class="stat-card">
                    <h4>Last Detection</h4>
                    <div class="stat-value">${formatDate(data.last_detection)}</div>
                </div>
                ` : ''}
            `;
        } else {
            statsContent.innerHTML = '<div class="error">Failed to load statistics</div>';
        }
    } catch (error) {
        console.error('Load stats error:', error);
        statsContent.innerHTML = '<div class="error">Network error loading statistics</div>';
    }
}

// ══════════════════════════════════════════════
//  DISEASES LIST FUNCTIONS
// ══════════════════════════════════════════════

async function loadDiseasesList() {
    const diseasesList = document.getElementById('diseases-list');
    diseasesList.innerHTML = '<div class="loading">Loading diseases...</div>';
    
    try {
        const response = await fetch(`${API_URL}/diseases`);
        const data = await response.json();
        
        if (response.ok && data.diseases) {
            diseasesList.innerHTML = data.diseases.map(disease => `
                <div class="disease-card" onclick="showDiseaseDetail('${disease.name}')">
                    <div class="disease-name">${disease.name}</div>
                    <div class="disease-severity ${disease.severity.toLowerCase()}">${disease.severity}</div>
                    <div class="disease-treatment">${disease.treatment.substring(0, 100)}...</div>
                </div>
            `).join('');
        } else {
            diseasesList.innerHTML = '<div class="error">Failed to load diseases</div>';
        }
    } catch (error) {
        console.error('Load diseases error:', error);
        diseasesList.innerHTML = '<div class="error">Network error loading diseases</div>';
    }
}

async function showDiseaseDetail(diseaseName) {
    try {
        const response = await fetch(`${API_URL}/diseases/${encodeURIComponent(diseaseName)}`);
        const disease = await response.json();
        
        alert(`${disease.name}\n\nSeverity: ${disease.severity}\n\nTreatment: ${disease.treatment}`);
    } catch (error) {
        console.error('Load disease detail error:', error);
        showNotification('Failed to load disease details', 'error');
    }
}

// ══════════════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════════════

function checkAuth() {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showMainApp();
    } else {
        showAuthForms();
    }
}

// Event listeners
document.getElementById('signup-form')?.addEventListener('submit', signup);
document.getElementById('login-form')?.addEventListener('submit', login);
document.getElementById('logout-btn')?.addEventListener('click', logout);
document.getElementById('predict-btn')?.addEventListener('click', predictImage);
document.getElementById('clear-history-btn')?.addEventListener('click', clearHistory);

// Image preview
document.getElementById('image-input')?.addEventListener('change', (e) => {
    const preview = document.getElementById('image-preview');
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
            preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

// Initialize app
checkAuth();
