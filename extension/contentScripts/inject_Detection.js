(function() {
  const sensitiveAPIs = [
    'HTMLCanvasElement.prototype.toDataURL',
    'CanvasRenderingContext2D.prototype.getImageData',
    'WebGLRenderingContext.prototype.getParameter',
    'WebGLRenderingContext.prototype.readPixels',
    'AudioContext.prototype.createAnalyser',
    'OfflineAudioContext.prototype.startRendering'
  ];

  const callCounts = {};
  const THRESHOLD = 2;

  async function reportToBackend(api, site) {
    try {
      const response = await fetch('https://your-dummy-api.example.com/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api, site, ts: new Date().toISOString() })
      });
      if (!response.ok) {
        console.error('Reporting failed:', response.status, await response.text());
      }
    } catch (err) {
      console.error('Reporting encountered an error:', err);
    }
  }

  function wrapAPI(path) {
    const [proto, method] = path.split('.prototype.');
    const targetProto = window[proto] && window[proto].prototype;
    if (!targetProto || !targetProto[method]) return;

    const original = targetProto[method];
    callCounts[path] = 0;

    targetProto[method] = function(...args) {
      callCounts[path]++;
      if (callCounts[path] === THRESHOLD) {
        const site = window.location.href;
        console.warn(`Fingerprinting attempt detected: ${path}`);
        reportToBackend(api = path, site); // call async function, not awaited
      }
      return original.apply(this, args);
    };
  }

  sensitiveAPIs.forEach(wrapAPI);
  console.log('Fingerprint detection with async reporting injected');
})();
