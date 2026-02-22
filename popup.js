const actionLabels = {
    'history_back': 'Geri',
    'history_forward': 'İleri',
    'scroll_to_top': 'Üste Çık',
    'new_tab': 'Yeni Sekme',
    'close_current_tab': 'Kapat',
    'reload_page': 'Yenile'
};

document.addEventListener('DOMContentLoaded', () => {
    const globalToggle = document.getElementById('global-toggle');
    const statusText = document.getElementById('status-text');

    // Load current settings including enabled state
    chrome.storage.sync.get(['mappings', 'isEnabled', 'isInitialized'], (data) => {
        const isEnabled = data.isEnabled !== undefined ? data.isEnabled : true;
        globalToggle.checked = isEnabled;
        updateStatusUI(isEnabled);

        const list = document.getElementById('quick-list');

        // Use defaults ONLY if never initialized
        let mappings = [];
        if (data.isInitialized) {
            mappings = Object.entries(data.mappings || {});
        } else {
            mappings = [
                ['L', 'history_back'],
                ['R', 'history_forward'],
                ['U', 'scroll_to_top'],
                ['D', 'new_tab'],
                ['DR', 'close_current_tab'],
                ['UD', 'reload_page']
            ];
        }

        if (mappings.length === 0) {
            list.innerHTML = '<p style="grid-column: 1/-1; color: #94a3b8; font-size: 0.8rem;">Henüz hareket tanımlanmadı.</p>';
        } else {
            mappings.slice(0, 6).forEach(([gesture, action]) => {
                const item = document.createElement('div');
                item.className = 'quick-item';
                item.innerHTML = `
          <span class="gesture-code">${gesture}</span>
          <span class="action-label">${actionLabels[action] || action}</span>
        `;
                list.appendChild(item);
            });
        }
    });

    // Handle toggle change
    globalToggle.onchange = () => {
        const isEnabled = globalToggle.checked;
        chrome.storage.sync.set({ isEnabled: isEnabled }, () => {
            updateStatusUI(isEnabled);
        });
    };

    function updateStatusUI(enabled) {
        const logoImg = document.querySelector('.logo-img');
        if (enabled) {
            statusText.textContent = 'Aktif';
            statusText.classList.remove('disabled');
            if (logoImg) logoImg.classList.remove('grayscale');
        } else {
            statusText.textContent = 'Devre Dışı';
            statusText.classList.add('disabled');
            if (logoImg) logoImg.classList.add('grayscale');
        }
    }

    // Open settings page
    document.getElementById('open-settings').onclick = () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    };
});
