(function() {
  const rendererOptions = [
    'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3090 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)',
    'Apple GPU',
    'llvmpipe (LLVMpipe software rasterizer)',
    'Mesa/X11'
  ];

  // Choose a random renderer per page context
  const spoofedRenderer = rendererOptions[Math.floor(Math.random() * rendererOptions.length)];

  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function(type, ...args) {
    const ctx = originalGetContext.call(this, type, ...args);
    if (!ctx || (type !== 'webgl' && type !== 'experimental-webgl')) {
      return ctx;
    }

    return new Proxy(ctx, {
      get(target, prop) {
        const orig = target[prop];
        if (prop === 'getParameter') {
          return function(parameter) {
            const dbg = target.getExtension('WEBGL_debug_renderer_info');
            if (dbg && parameter === dbg.UNMASKED_RENDERER_WEBGL) {
              return spoofedRenderer;
            }
            return target.getParameter.apply(target, arguments);
          };
        }
        if (prop === 'readPixels') {
          return function(x, y, width, height, format, type, pixels) {
            const result = target.readPixels.call(this, x, y, width, height, format, type, pixels);
            // Add subtle noise to a random pixel
            if (pixels && pixels.length >= 4) {
              const idx = Math.floor(Math.random() * (pixels.length / 4)) * 4;
              pixels[idx + 0] = (pixels[idx + 0] + (Math.random() - 0.5) * 2) | 0;
              pixels[idx + 1] = (pixels[idx + 1] + (Math.random() - 0.5) * 2) | 0;
              pixels[idx + 2] = (pixels[idx + 2] + (Math.random() - 0.5) * 2) | 0;
            }
            return result;
          };
        }
        return typeof orig === 'function' ? orig.bind(target) : orig;
      }
    });
  };

  console.log('WebGL spoof injected with renderer:', spoofedRenderer);
})();
