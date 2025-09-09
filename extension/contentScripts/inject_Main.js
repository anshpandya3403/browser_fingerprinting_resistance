(() => {
  const scripts = [
    'contentScripts/inject_Canvas.js',
    'contentScripts/inject_WebGL.js',
    'contentScripts/inject_Audio.js',
    'contentScripts/inject_Fonts.js',
    'contentScripts/inject_Detection.js'
  ];

  scripts.forEach(src => {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL(src);
    s.defer = true;
    document.documentElement.appendChild(s);
    s.remove();
  });
})();
