/**
 * CustomGestureX - Content Script
 */

let CONFIG = {
    triggerButton: 2, // Right click
    samplingRate: 10, // ms
    minDistance: 10, // px
    lineColor: '#3498db',
    lineWidth: 3,
    disableOnInput: true,
    isEnabled: true,
    blacklist: '',
    mappings: {
        'L': 'history_back',
        'R': 'history_forward',
        'U': 'scroll_to_top',
        'D': 'new_tab',
        'DR': 'close_current_tab',
        'UD': 'reload_page'
    }
};

let isTracking = false;
let points = [];
let lastPoint = null;
let canvas = null;
let ctx = null;
let gesturePath = "";
let lastDirection = null;

// Load settings immediately and periodically to ensure sync
function loadSettings() {
    chrome.storage.sync.get(['triggerButton', 'lineColor', 'lineWidth', 'disableOnInput', 'isEnabled', 'blacklist', 'mappings', 'isInitialized'], (settings) => {
        if (settings.isInitialized) {
            CONFIG = { ...CONFIG, ...settings };
        } else {
            // First run, keep defaults from CONFIG but mark as loaded
            console.log('CustomGestureX: First run defaults');
        }
    });
}

chrome.storage.onChanged.addListener((changes) => {
    for (let key in changes) {
        CONFIG[key] = changes[key].newValue;
    }
});

loadSettings();

function isUrlBlacklisted() {
    if (!CONFIG.blacklist) return false;
    const lines = CONFIG.blacklist.split('\n');
    const currentUrl = window.location.href;
    return lines.some(line => line.trim() && currentUrl.includes(line.trim()));
}

// Initialize Canvas for visual feedback
function initCanvas() {
    if (canvas) {
        canvas.style.opacity = '1';
        return;
    }
    canvas = document.createElement('canvas');
    canvas.id = 'custom-gesture-x-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '2147483647';
    canvas.style.pointerEvents = 'none';
    canvas.style.transition = 'opacity 0.2s';
    document.documentElement.appendChild(canvas);

    ctx = canvas.getContext('2d');
    resizeCanvas();
}

function resizeCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

window.addEventListener('resize', resizeCanvas);

function startTracking(e) {
    if (!CONFIG.isEnabled) return;
    if (e.button !== CONFIG.triggerButton) return;
    if (isUrlBlacklisted()) return;

    // Check if target is an input field
    if (CONFIG.disableOnInput) {
        const tag = e.target.tagName.toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) {
            return;
        }
    }

    isTracking = true;
    points = [{ x: e.clientX, y: e.clientY }];
    lastPoint = { x: e.clientX, y: e.clientY };
    gesturePath = "";
    lastDirection = null;

    initCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Prevent context menu later if we moved
    window.addEventListener('contextmenu', preventContextMenu, { capture: true, once: true });
}

function trackMove(e) {
    if (!isTracking) return;

    const currentPoint = { x: e.clientX, y: e.clientY };
    const dist = Math.sqrt(
        Math.pow(currentPoint.x - lastPoint.x, 2) +
        Math.pow(currentPoint.y - lastPoint.y, 2)
    );

    if (dist >= CONFIG.minDistance) {
        // Calculate direction
        const direction = getDirection(lastPoint, currentPoint);
        if (direction && direction !== lastDirection) {
            gesturePath += direction;
            lastDirection = direction;
        }

        // Draw segment
        drawTrail(lastPoint, currentPoint);

        points.push(currentPoint);
        lastPoint = currentPoint;
    }
}

function stopTracking(e) {
    if (!isTracking || e.button !== CONFIG.triggerButton) return;

    isTracking = false;

    if (gesturePath.length > 0) {
        const match = findClosestMatch(gesturePath);

        if (match) {
            executeAction(match.action, gesturePath);
        } else {
            showToast(`Tanımsız: ${gesturePath}`, true);
        }
    } else {
        window.removeEventListener('contextmenu', preventContextMenu, { capture: true });
    }

    fadeOutCanvas();
}

function findClosestMatch(path) {
    let bestMatch = null;
    let minDistance = Infinity;
    const threshold = Math.max(2, Math.floor(path.length * 0.4)); // %40 hata payı

    for (const [gesture, action] of Object.entries(CONFIG.mappings)) {
        const distance = levenshtein(path, gesture);
        if (distance < minDistance && distance <= threshold) {
            minDistance = distance;
            bestMatch = { action, gesture };
        }
    }
    return bestMatch;
}

// Levenshtein Distance Algorithm for fuzzy matching
function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[b.length][a.length];
}

function executeAction(action, path) {
    // Visual feedback
    showToast(actionToLabel(action));

    // Direct actions in content script
    switch (action) {
        case 'history_back':
            window.history.back();
            break;
        case 'history_forward':
            window.history.forward();
            break;
        case 'scroll_to_top':
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
        case 'reload_page':
            window.location.reload();
            break;
        default:
            // Send to background for tab actions
            chrome.runtime.sendMessage({ action: 'execute_gesture', type: action });
    }
}

function actionToLabel(action) {
    const labels = {
        'history_back': 'Geri Git',
        'history_forward': 'İleri Git',
        'scroll_to_top': 'En Üste Çık',
        'new_tab': 'Yeni Sekme',
        'close_current_tab': 'Sekmeyi Kapat',
        'reload_page': 'Yenile'
    };
    return labels[action] || action;
}

function showToast(text, isError = false) {
    let toast = document.getElementById('cgx-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'cgx-toast';
        toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15, 23, 42, 0.9);
      color: white;
      padding: 12px 24px;
      border-radius: 30px;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      z-index: 2147483647;
      pointer-events: none;
      border: 1px solid #3498db;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      transition: opacity 0.3s;
    `;
        document.documentElement.appendChild(toast);
    }

    toast.textContent = text;
    toast.style.borderColor = isError ? '#ef4444' : '#3498db';
    toast.style.opacity = '1';

    if (window.cgxToastTimeout) clearTimeout(window.cgxToastTimeout);
    window.cgxToastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
    }, 1000);
}

function getDirection(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // 8-Way recognition
    if (angle >= -112.5 && angle < -67.5) return "U";
    if (angle >= -67.5 && angle < -22.5) return "1"; // NE
    if (angle >= -22.5 && angle < 22.5) return "R";
    if (angle >= 22.5 && angle < 67.5) return "2"; // SE
    if (angle >= 67.5 && angle < 112.5) return "D";
    if (angle >= 112.5 && angle < 157.5) return "3"; // SW
    if (angle >= 157.5 || angle < -157.5) return "L";
    if (angle >= -157.5 && angle < -112.5) return "4"; // NW
    return null;
}

function drawTrail(p1, p2) {
    if (!ctx) return;
    ctx.strokeStyle = CONFIG.lineColor;
    ctx.lineWidth = CONFIG.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
}

function fadeOutCanvas() {
    if (!canvas) return;
    canvas.style.opacity = '0';
    setTimeout(() => {
        if (!isTracking && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, 200);
}

function preventContextMenu(e) {
    if (gesturePath.length > 0) {
        e.preventDefault();
        e.stopPropagation();
    }
}

// Event Listeners
window.addEventListener('mousedown', startTracking, true);
window.addEventListener('mousemove', trackMove, true);
window.addEventListener('mouseup', stopTracking, true);
