document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle-protection');
  const optionsBtn = document.getElementById('open-options');

  // Load initial state (defaults to enabled)
  chrome.storage.local.get({ protectionEnabled: true }, data => {
    toggle.checked = data.protectionEnabled;
    // Optionally set badge or icon visuals here
  });

  // Handle toggle changes
  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.local.set({ protectionEnabled: enabled });
    // Inform content scripts or background
    chrome.runtime.sendMessage({ type: 'PROTECTION_TOGGLE', enabled });
  });

  // Open options page
  optionsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html');
    }
  });
});
