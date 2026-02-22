const DEFAULT_SETTINGS = {
    lineColor: '#3498db',
    lineWidth: 3,
    disableOnInput: true,
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

const actionOptions = [
    { value: 'history_back', label: 'Geri Git' },
    { value: 'history_forward', label: 'İleri Git' },
    { value: 'scroll_to_top', label: 'En Üste Çık' },
    { value: 'new_tab', label: 'Yeni Sekme' },
    { value: 'close_current_tab', label: 'Sekmeyi Kapat' },
    { value: 'reload_page', label: 'Sayfayı Yenile' }
];

function createMappingRow(gesture, action) {
    const row = document.createElement('div');
    row.className = 'mapping-item';

    const canvas = document.createElement('canvas');
    canvas.className = 'gesture-mini-preview';

    const gestureInput = document.createElement('input');
    gestureInput.type = 'text';
    gestureInput.value = gesture;
    gestureInput.placeholder = 'DR...';
    gestureInput.oninput = () => {
        drawGesturePreview(canvas, gestureInput.value.trim().toUpperCase());
        saveSettings();
    };

    const actionSelect = document.createElement('select');
    actionOptions.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (opt.value === action) o.selected = true;
        actionSelect.appendChild(o);
    });
    actionSelect.onchange = saveSettings;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.type = 'button';
    removeBtn.onclick = () => {
        row.style.opacity = '0';
        row.style.transform = 'translateX(20px)';
        setTimeout(() => {
            row.remove();
            saveSettings(); // Silme işleminden sonra hemen kaydet
        }, 200);
    };

    row.appendChild(canvas);
    row.appendChild(gestureInput);
    row.appendChild(actionSelect);
    row.appendChild(removeBtn);

    setTimeout(() => drawGesturePreview(canvas, gesture), 0);
    return row;
}

function drawGesturePreview(canvas, path) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width = 120;
    const h = canvas.height = 80;
    ctx.clearRect(0, 0, w, h);

    if (!path) return;

    const step = 12;
    let x = 0, y = 0;
    let points = [{ x, y }];

    for (let char of path) {
        if (char === 'U') y -= step;
        else if (char === 'D') y += step;
        else if (char === 'L') x -= step;
        else if (char === 'R') x += step;
        else if (char === '1') { x += step; y -= step; } // NE
        else if (char === '2') { x += step; y += step; } // SE
        else if (char === '3') { x -= step; y += step; } // SW
        else if (char === '4') { x -= step; y -= step; } // NW
        points.push({ x, y });
    }

    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));

    const drawW = maxX - minX;
    const drawH = maxY - minY;
    const scale = Math.min((w - 20) / (drawW || 1), (h - 20) / (drawH || 1), 1);
    const centerX = (w - drawW * scale) / 2 - minX * scale;
    const centerY = (h - drawH * scale) / 2 - minY * scale;

    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(52, 152, 219, 0.5)';

    ctx.beginPath();
    ctx.moveTo(points[0].x * scale + centerX, points[0].y * scale + centerY);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * scale + centerX, points[i].y * scale + centerY);
    }
    ctx.stroke();
}

function loadSettings() {
    chrome.storage.sync.get(['lineColor', 'lineWidth', 'disableOnInput', 'blacklist', 'mappings', 'isInitialized'], (settings) => {
        // If never saved before, use defaults
        const mappings = settings.isInitialized ? (settings.mappings || {}) : DEFAULT_SETTINGS.mappings;

        document.getElementById('lineColor').value = settings.lineColor || DEFAULT_SETTINGS.lineColor;
        document.getElementById('lineWidth').value = settings.lineWidth || DEFAULT_SETTINGS.lineWidth;
        document.getElementById('disableOnInput').checked = settings.disableOnInput !== undefined ? settings.disableOnInput : DEFAULT_SETTINGS.disableOnInput;
        document.getElementById('blacklist').value = settings.blacklist || DEFAULT_SETTINGS.blacklist;

        const list = document.getElementById('mapping-list');
        list.innerHTML = '';
        Object.entries(mappings).forEach(([gesture, action]) => {
            list.appendChild(createMappingRow(gesture, action));
        });
    });
}

function saveSettings() {
    const mappings = {};
    document.querySelectorAll('.mapping-item').forEach(row => {
        const gesture = row.querySelector('input').value.trim().toUpperCase();
        const action = row.querySelector('select').value;
        if (gesture) mappings[gesture] = action;
    });

    const settings = {
        lineColor: document.getElementById('lineColor').value,
        lineWidth: parseInt(document.getElementById('lineWidth').value),
        disableOnInput: document.getElementById('disableOnInput').checked,
        blacklist: document.getElementById('blacklist').value,
        mappings: mappings,
        isInitialized: true // Mark that user has interacted with settings
    };

    chrome.storage.sync.set(settings, () => {
        console.log('Ayarlar otomatik kaydedildi.');
    });
}

let recorderCanvas, recorderCtx, isRecording = false;
let recordedPath = "";
let lastRecPoint = null;
let lastRecDir = null;

function initRecorder() {
    recorderCanvas = document.getElementById('recorder-canvas');
    recorderCtx = recorderCanvas.getContext('2d');

    const resize = () => {
        recorderCanvas.width = recorderCanvas.clientWidth || 200;
        recorderCanvas.height = recorderCanvas.clientHeight || 150;
    };
    window.addEventListener('resize', resize);
    resize();

    recorderCanvas.addEventListener('mousedown', (e) => {
        // Allow both left (0) and right (2) clicks for recording in the options page
        if (e.button !== 0 && e.button !== 2) return;

        isRecording = true;
        recordedPath = "";
        lastRecDir = null;
        lastRecPoint = { x: e.offsetX, y: e.offsetY };

        recorderCtx.clearRect(0, 0, recorderCanvas.width, recorderCanvas.height);
        recorderCtx.beginPath();
        recorderCtx.moveTo(e.offsetX, e.offsetY);
        document.getElementById('add-recorded-btn').disabled = true;
        document.getElementById('current-gesture-code').textContent = "Çiziliyor...";
    });

    window.addEventListener('mousemove', (e) => {
        if (!isRecording) return;
        const rect = recorderCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Boundary check
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

        const dist = Math.sqrt(Math.pow(x - lastRecPoint.x, 2) + Math.pow(y - lastRecPoint.y, 2));
        if (dist > 8) {
            const dir = getDirectionForRecorder(lastRecPoint, { x, y });
            if (dir && dir !== lastRecDir) {
                recordedPath += dir;
                lastRecDir = dir;
            }

            recorderCtx.strokeStyle = '#3498db';
            recorderCtx.lineWidth = 4;
            recorderCtx.lineCap = 'round';
            recorderCtx.lineJoin = 'round';
            recorderCtx.lineTo(x, y);
            recorderCtx.stroke();

            lastRecPoint = { x, y };
            document.getElementById('current-gesture-code').textContent = recordedPath || "Çiziliyor...";
        }
    });

    window.addEventListener('mouseup', () => {
        if (isRecording) {
            isRecording = false;
            if (recordedPath) {
                document.getElementById('add-recorded-btn').disabled = false;
                document.getElementById('current-gesture-code').textContent = recordedPath;
            } else {
                document.getElementById('current-gesture-code').textContent = "-";
            }
        }
    });

    recorderCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function getDirectionForRecorder(p1, p2) {
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

document.getElementById('add-recorded-btn').onclick = () => {
    const list = document.getElementById('mapping-list');
    list.appendChild(createMappingRow(recordedPath, 'history_back'));
    document.getElementById('add-recorded-btn').disabled = true;
    recordedPath = "";
    document.getElementById('current-gesture-code').textContent = "-";
};

document.getElementById('add-btn').onclick = () => {
    document.getElementById('mapping-list').appendChild(createMappingRow('', 'history_back'));
};

document.getElementById('save-btn').onclick = saveSettings;

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initRecorder();
});
