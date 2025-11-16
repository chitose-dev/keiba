// ========================================
// 🔧 ここにCloud RunのAPI URLを設定してください
// ========================================
const DEFAULT_API_URL = 'https://keiba-scraper-fbqowedyyq-an.a.run.app'; // ← deploy.sh実行後に表示されるURLに変更

// API URL管理
let API_URL = localStorage.getItem('keiba_api_url') || DEFAULT_API_URL;

// DOM要素
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loadingScreen = document.getElementById('loading-screen');

const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

const settingsForm = document.getElementById('settings-form');
const calendarSheetInput = document.getElementById('calendar-sheet');
const ozzSheetInput = document.getElementById('ozz-sheet');
const scrapingTimeInput = document.getElementById('scraping-time');
const saveSuccess = document.getElementById('save-success');
const saveError = document.getElementById('save-error');

const passwordForm = document.getElementById('password-form');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordSuccess = document.getElementById('password-success');
const passwordError = document.getElementById('password-error');

const logoutBtn = document.getElementById('logout-btn');
const reloadBtn = document.getElementById('reload-btn');

// セッション管理
let authToken = localStorage.getItem('keiba_auth_token') || null;

// 画面切り替え
function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

// エラーメッセージ表示
function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}

// 成功メッセージ表示
function showSuccess(element, message) {
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}

// API リクエスト共通処理
async function apiRequest(endpoint, method = 'GET', body = null, requiresAuth = false) {
    if (!API_URL) {
        throw new Error('API URLが設定されていません');
    }

    const headers = {
        'Content-Type': 'application/json'
    };

    if (requiresAuth && authToken) {
        headers['Authorization'] = authToken;
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'リクエストに失敗しました');
    }

    return data;
}

// ログイン処理
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = passwordInput.value;
    
    try {
        showScreen(loadingScreen);
        
        const data = await apiRequest('/api/login', 'POST', { password });
        
        authToken = data.token;
        localStorage.setItem('keiba_auth_token', authToken);
        
        await loadSettings();
        showScreen(mainScreen);
        
    } catch (error) {
        console.error('Login error:', error);
        showScreen(loginScreen);
        showError(loginError, error.message);
        passwordInput.value = '';
    }
});

// ログアウト処理
logoutBtn.addEventListener('click', () => {
    authToken = null;
    localStorage.removeItem('keiba_auth_token');
    passwordInput.value = '';
    showScreen(loginScreen);
});

// 設定読み込み
async function loadSettings() {
    try {
        const data = await apiRequest('/api/settings', 'GET', null, true);
        
        calendarSheetInput.value = data.calendar || '';
        ozzSheetInput.value = data.ozz_sheet || '';
        scrapingTimeInput.value = data.scraping_time || '09:00';
        
    } catch (error) {
        console.error('Load settings error:', error);
        showError(saveError, '設定の読み込みに失敗しました: ' + error.message);
    }
}

// 設定再読み込み
reloadBtn.addEventListener('click', async () => {
    try {
        showScreen(loadingScreen);
        await loadSettings();
        showScreen(mainScreen);
        showSuccess(saveSuccess, '設定を再読み込みしました。');
    } catch (error) {
        showScreen(mainScreen);
        showError(saveError, '再読み込みに失敗しました: ' + error.message);
    }
});

// 設定保存
settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const calendarSheet = calendarSheetInput.value.trim();
    const ozzSheet = ozzSheetInput.value.trim();
    const scrapingTime = scrapingTimeInput.value;
    
    // バリデーション
    if (!calendarSheet || !ozzSheet || !scrapingTime) {
        showError(saveError, 'すべてのフィールドを入力してください。');
        return;
    }
    
    try {
        showScreen(loadingScreen);
        
        await apiRequest('/api/settings', 'POST', {
            calendar: calendarSheet,
            ozz_sheet: ozzSheet,
            scraping_time: scrapingTime
        }, true);
        
        showScreen(mainScreen);
        showSuccess(saveSuccess, '設定を保存しました!');
        
    } catch (error) {
        console.error('Save error:', error);
        showScreen(mainScreen);
        showError(saveError, '保存に失敗しました: ' + error.message);
    }
});

// パスワード変更
passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPwd = currentPasswordInput.value;
    const newPwd = newPasswordInput.value;
    const confirmPwd = confirmPasswordInput.value;
    
    // バリデーション
    if (!currentPwd || !newPwd || !confirmPwd) {
        showError(passwordError, 'すべてのフィールドを入力してください。');
        return;
    }
    
    if (newPwd !== confirmPwd) {
        showError(passwordError, '新しいパスワードが一致しません。');
        return;
    }
    
    if (newPwd.length < 6) {
        showError(passwordError, 'パスワードは6文字以上にしてください。');
        return;
    }
    
    try {
        showScreen(loadingScreen);
        
        const data = await apiRequest('/api/change-password', 'POST', {
            current_password: currentPwd,
            new_password: newPwd
        }, true);
        
        // 新しいトークンを保存
        authToken = data.token;
        localStorage.setItem('keiba_auth_token', authToken);
        
        // フォームをクリア
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
        
        showScreen(mainScreen);
        showSuccess(passwordSuccess, 'パスワードを変更しました!');
        
    } catch (error) {
        console.error('Password change error:', error);
        showScreen(mainScreen);
        showError(passwordError, error.message);
    }
});

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // 認証トークンがある場合は自動ログイン試行
    if (authToken && API_URL) {
        (async () => {
            try {
                showScreen(loadingScreen);
                await loadSettings();
                showScreen(mainScreen);
            } catch (error) {
                // トークンが無効な場合はログイン画面へ
                authToken = null;
                localStorage.removeItem('keiba_auth_token');
                showScreen(loginScreen);
            }
        })();
    } else {
        showScreen(loginScreen);
    }
});
