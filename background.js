chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'execute_gesture') {
    const gesture = message.type;
    console.log('Executing gesture:', gesture);

    switch (gesture) {
      case 'history_back':
        chrome.tabs.goBack(sender.tab.id);
        break;
      case 'history_forward':
        chrome.tabs.goForward(sender.tab.id);
        break;
      case 'scroll_to_top':
        chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          func: () => window.scrollTo({ top: 0, behavior: 'smooth' })
        });
        break;
      case 'new_tab':
        chrome.tabs.create({});
        break;
      case 'close_current_tab':
        chrome.tabs.remove(sender.tab.id);
        break;
      case 'reload_page':
        chrome.tabs.reload(sender.tab.id);
        break;
      default:
        console.warn('Unknown gesture action:', gesture);
    }
  }
});

// Update icon based on enabled state
function updateIcon(isEnabled) {
  const postfix = isEnabled ? "" : "_gray";
  const iconPath = {
    "16": `icons/icon16${postfix}.png`,
    "32": `icons/icon32${postfix}.png`,
    "48": `icons/icon48${postfix}.png`,
    "128": `icons/icon128${postfix}.png`
  };

  chrome.action.setIcon({ path: iconPath }, () => {
    if (chrome.runtime.lastError) {
      console.warn("Icon update failed:", chrome.runtime.lastError.message);
    }
  });
}

// Watch for changes in isEnabled
chrome.storage.onChanged.addListener((changes) => {
  if (changes.isEnabled) {
    updateIcon(changes.isEnabled.newValue);
  }
});

// Set initial icon
chrome.storage.sync.get({ isEnabled: true }, (data) => {
  updateIcon(data.isEnabled);
});
