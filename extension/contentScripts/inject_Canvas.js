(function() {
    // --- deterministic seed per device/session ---
    function getSeed() {
        try {
            const key = "canvas_spoof_seed";
            let s = localStorage.getItem(key);
            if (!s) {
                s = Math.random().toString(36).slice(2);
                localStorage.setItem(key, s);
            }
            return s;
        } catch {
            return "fallback-seed";
        }
    }

    // simple hash from seed+input
    function hashCode(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
        }
        return h >>> 0;
    }

    // seeded PRNG (xorshift32)
    function XorShift32(seed) {
        let x = seed || 123456789;
        return function() {
            x ^= x << 13;
            x ^= x >>> 17;
            x ^= x << 5;
            return (x >>> 0) / 0xFFFFFFFF;
        };
    }

    // apply deterministic small perturbations
    function perturb(data, tag) {
        const seed = hashCode(getSeed() + "|" + tag);
        const rand = XorShift32(seed);
        const step = 7; // every 7th pixel
        for (let i = 0; i < data.length; i += 4 * step) {
            data[i]     = Math.min(255, Math.max(0, data[i]     + ((rand() * 6) - 3))); // R
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + ((rand() * 6) - 3))); // G
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + ((rand() * 6) - 3))); // B
        }
    }

    // --- patch getImageData ---
    const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
        const result = origGetImageData.apply(this, args);
        try {
            perturb(result.data, "getImageData");
        } catch {}
        return result;
    };

    // --- patch toDataURL ---
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
        try {
            const off = document.createElement("canvas");
            off.width = this.width;
            off.height = this.height;
            const ctx = off.getContext("2d");
            ctx.drawImage(this, 0, 0);
            const imgData = ctx.getImageData(0, 0, off.width, off.height);
            perturb(imgData.data, "toDataURL");
            ctx.putImageData(imgData, 0, 0);
            return off.toDataURL(...args);
        } catch {
            return origToDataURL.apply(this, args);
        }
    };

    // --- patch toBlob ---
    const origToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback, type, ...rest) {
        try {
            const off = document.createElement("canvas");
            off.width = this.width;
            off.height = this.height;
            const ctx = off.getContext("2d");
            ctx.drawImage(this, 0, 0);
            const imgData = ctx.getImageData(0, 0, off.width, off.height);
            perturb(imgData.data, "toBlob");
            ctx.putImageData(imgData, 0, 0);
            return off.toBlob(callback, type, ...rest);
        } catch {
            return origToBlob.apply(this, [callback, type, ...rest]);
        }
    };

    console.log("[Canvas Spoofer] Canvas APIs patched with deterministic noise");
})();
