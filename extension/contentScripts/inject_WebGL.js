(function() {
  // ---------------------------
  // Utilities: seed + PRNG + hash
  // ---------------------------
  function getSeed() {
    try {
      const key = 'webgl_spoof_seed_v1';
      let s = localStorage.getItem(key);
      if (!s) {
        // crypto-sourced seed for unpredictability, but persistent per profile
        const b = new Uint32Array(2);
        crypto.getRandomValues(b);
        s = b[0].toString(36) + '.' + b[1].toString(36);
        localStorage.setItem(key, s);
      }
      return s;
    } catch (e) {
      return 'fallback-seed';
    }
  }

  function hashCode(str) {
    // FNV-1a-ish fold for 32-bit
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function XorShift32(seedInt) {
    let x = seedInt >>> 0;
    if (x === 0) x = 0xdeadbeef;
    return function() {
      x ^= x << 13; x >>>= 0;
      x ^= x >>> 17;
      x ^= x << 5; x >>>= 0;
      // return float in [0,1)
      return (x >>> 0) / 0x100000000;
    };
  }

  // Create deterministic rand function for a tag
  function deterministicRandFor(tag) {
    const seed = hashCode(getSeed() + '|' + tag);
    return XorShift32(seed);
  }

  // ---------------------------
  // Spoofing configuration
  // ---------------------------
  const RENDERERS = [
    "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 3090 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)",
    "Apple GPU",
    "llvmpipe (LLVMpipe software rasterizer)",
    "Mesa/X11"
  ];
  // deterministic choice per profile
  const rendererRand = deterministicRandFor('renderer-choice');
  const spoofedRenderer = RENDERERS[Math.floor(rendererRand() * RENDERERS.length)];
  const spoofedVendor = "Generic GPU Vendor";

  // ---------------------------
  // Helpers for perturbation
  // ---------------------------
  function perturbPixelsDeterministic(pixels, tag) {
    // pixels: typed array (Uint8Array or Uint8ClampedArray) or Array-like
    const rand = deterministicRandFor(tag);
    // choose step based on buffer size so we touch multiple pixels
    const pixelCount = Math.floor(pixels.length / 4) || 1;
    let step = Math.max(1, Math.floor(pixelCount / 512)); // ~touch 512 pixels worth, adjustable
    // use derived PRNG
    const pr = XorShift32(hashCode(getSeed() + '|' + tag + '|perturb'));
    for (let p = 0; p < pixelCount; p += step) {
      const i = p * 4;
      // small deterministic jitter -1..+1
      pixels[i]     = (pixels[i]     + ((pr() * 3) | 0) - 1) & 0xff;
      pixels[i + 1] = (pixels[i + 1] + ((pr() * 3) | 0) - 1) & 0xff;
      pixels[i + 2] = (pixels[i + 2] + ((pr() * 3) | 0) - 1) & 0xff;
      // leave alpha alone
    }
  }

  function tweakNumberDeterministic(n, tag, scale = 0.01) {
    // small ±scale jitter (scale as fraction of n)
    const pr = deterministicRandFor(tag);
    // center at 0, range [-scale/2, +scale/2]
    const offset = (pr() - 0.5) * scale * 2;
    const delta = Math.round(n * offset);
    return Math.max(0, n + delta);
  }

  function tweakRangeArray(arr, tag) {
    // arr can be a Float32Array or array-like [min, max]
    try {
      const out = new Float32Array(arr.length);
      const pr = deterministicRandFor(tag);
      for (let i = 0; i < arr.length; i++) {
        // tiny jitter in range values
        const jitter = (pr() - 0.5) * 0.02 * Math.abs(arr[i] || 1);
        out[i] = arr[i] + jitter;
      }
      return out;
    } catch (e) {
      return arr;
    }
  }

  // ---------------------------
  // WebGL Proxy patch
  // ---------------------------
  const origGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function(type, ...args) {
    const ctx = origGetContext.apply(this, [type, ...args]);
    // Only patch webgl contexts
    if (!ctx || typeof type !== 'string') return ctx;
    const low = type.toLowerCase();
    if (!(low.includes('webgl'))) return ctx;

    // Create bound originals to avoid recursion if other code patched later
    const origReadPixels = typeof ctx.readPixels === 'function' ? ctx.readPixels.bind(ctx) : null;
    const origGetParameter = typeof ctx.getParameter === 'function' ? ctx.getParameter.bind(ctx) : null;
    const origGetExtension = typeof ctx.getExtension === 'function' ? ctx.getExtension.bind(ctx) : null;
    const origGetShaderPrecisionFormat = typeof ctx.getShaderPrecisionFormat === 'function' ? ctx.getShaderPrecisionFormat.bind(ctx) : null;

    const proxy = new Proxy(ctx, {
      get(target, prop, receiver) {
        // getParameter spoofing
        if (prop === 'getParameter' && origGetParameter) {
          return function(parameter) {
            // prefer to call original and then modify results (safer)
            let val;
            try {
              val = origGetParameter(parameter);
            } catch (e) {
              // If original throws, propagate
              throw e;
            }

            try {
              // Detect debug renderer info constants dynamically
              const dbg = origGetExtension('WEBGL_debug_renderer_info');

              // If asking for unmasked strings, return spoofed strings
              if (dbg && parameter === dbg.UNMASKED_RENDERER_WEBGL && typeof val === 'string') {
                return spoofedRenderer;
              }
              if (dbg && parameter === dbg.UNMASKED_VENDOR_WEBGL && typeof val === 'string') {
                return spoofedVendor;
              }

              // For numeric limits, apply small deterministic tweak
              // Common numeric enum values are numbers; we simply nudge them slightly
              if (typeof val === 'number') {
                // pick tag based on parameter value to remain deterministic per-parameter
                return tweakNumberDeterministic(val, 'param|' + parameter);
              }

              // For ranges/arrays (Float32Array/Int32Array), apply a tiny jitter
              if (val && (ArrayBuffer.isView(val) || Array.isArray(val))) {
                // E.g., ALIASED_LINE_WIDTH_RANGE returns a Float32Array [min,max]
                return tweakRangeArray(val, 'paramarr|' + parameter);
              }

            } catch (e) {
              // fall through to return original val
            }
            return val;
          };
        }

        // readPixels spoofing: perturb deterministic pixels in the returned buffer
        if (prop === 'readPixels' && origReadPixels) {
          return function(x, y, width, height, format, type, pixels) {
            const result = origReadPixels(x, y, width, height, format, type, pixels);
            try {
              if (pixels && pixels.length >= 4) {
                // choose a tag that includes canvas identity so different canvases have different perturbation
                const canvasId = (this && this.canvas && (this.canvas.id || this.canvas.width + 'x' + this.canvas.height)) || 'canvas-default';
                perturbPixelsDeterministic(pixels, 'readPixels|' + canvasId);
              }
            } catch (e) {
              // ignore perturb errors
            }
            return result;
          };
        }

        // getShaderPrecisionFormat spoofing
        if (prop === 'getShaderPrecisionFormat' && origGetShaderPrecisionFormat) {
          return function(shaderType, precisionType) {
            const orig = origGetShaderPrecisionFormat(shaderType, precisionType);
            try {
              // orig has {rangeMin, rangeMax, precision}
              if (orig && typeof orig === 'object') {
                // clone to avoid mutating original object returned by browser
                const clone = {
                  rangeMin: Math.round(tweakNumberDeterministic(orig.rangeMin, 'shaderRangeMin|' + shaderType + '|' + precisionType)),
                  rangeMax: Math.round(tweakNumberDeterministic(orig.rangeMax, 'shaderRangeMax|' + shaderType + '|' + precisionType)),
                  precision: Math.max(0, Math.round(tweakNumberDeterministic(orig.precision, 'shaderPrecision|' + shaderType + '|' + precisionType, 0.2)))
                };
                return clone;
              }
            } catch (e) {
              // fall back to original
            }
            return orig;
          };
        }

        // getExtension: we want to still expose WEBGL_debug_renderer_info, but ensure callers get usable constants
        if (prop === 'getExtension' && origGetExtension) {
          return function(name) {
            // If they ask for debug info, return a wrapper that exposes the same constants,
            // so that our getParameter spoof above can detect them; we simply forward the extension.
            const ext = origGetExtension(name);
            return ext;
          };
        }

        // Default: forward functions bound to original target, or properties directly
        const orig = Reflect.get(target, prop, receiver);
        if (typeof orig === 'function') return orig.bind(target);
        return orig;
      }
    });

    return proxy;
  };

  console.log('[WebGL Spoof] injected — renderer:', spoofedRenderer, ' vendor:', spoofedVendor);
})();
