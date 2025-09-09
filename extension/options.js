const defaults = {
  canvas: true,
  webgl: true,
  audio: true,
  fonts: true,
  headers: true,
  webrtc: true
};

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(defaults, prefs => {
    Object.keys(defaults).forEach(key => {
      document.getElementById(key).checked = prefs[key];
    });
  });

  document.getElementById('save').addEventListener('click', () => {
    const prefs = {};
    Object.keys(defaults).forEach(key => {
      prefs[key] = document.getElementById(key).checked;
    });
    chrome.storage.local.set(prefs, () => {
      chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED', prefs });
      window.close();
    });
  });
});
