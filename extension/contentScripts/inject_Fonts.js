// Combined anti-font-fingerprinting script
(function() {
  const allowedFonts = ['Arial', 'Times New Roman', 'Courier New', 'serif', 'sans-serif', 'monospace'];
  const allowedSet = new Set(allowedFonts);

  // ---- 1. Spy on CSS injections and filter font-families
  const origSetProperty = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function(name, value, priority) {
    if (name === 'font-family') {
      const families = value.split(',').map(f => f.trim().replace(/["']/g, ''));
      const filtered = families.filter(f => allowedSet.has(f));
      if (filtered.length) {
        value = filtered.join(', ');
      } else {
        value = 'sans-serif';
      }
    }
    return origSetProperty.call(this, name, value, priority);
  };

  // Handle assignments like element.style.fontFamily
  Object.defineProperty(CSSStyleDeclaration.prototype, 'fontFamily', {
    set(value) {
      const families = value.split(',').map(f => f.trim().replace(/["']/g, ''));
      const filtered = families.filter(f => allowedSet.has(f));
      this.setProperty('font-family', filtered.length ? filtered.join(', ') : 'sans-serif');
    },
    get() {
      return this.getPropertyValue('font-family');
    }
  });

  // ---- 2. Intercept element insertion and innerHTML changes to sanitize font references
  const origAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function(node) {
    if (node instanceof Element && node.style && node.style.fontFamily) {
      node.style.fontFamily = node.style.fontFamily; // triggers setter above
    }
    return origAppendChild.call(this, node);
  };

  const origInner = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', {
    set(html) {
      const sanitized = html.replace(/font-family\s*:\s*([^;"}]+)/g, (m, val) => {
        const fam = val.split(',')[0].trim().replace(/["']/g, '');
        return `font-family: ${allowedSet.has(fam) ? fam : 'sans-serif'}`;
      });
      origInner.set.call(this, sanitized);
    },
    get() {
      return origInner.get.call(this);
    }
  });

  // ---- 3. Measurement spoofing to break detection via offsets/sizes
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth').get;
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    get() {
      const width = originalOffsetWidth.call(this);
      const font = getComputedStyle(this).fontFamily || '';
      const primary = font.split(',')[0].trim();
      if (!allowedSet.has(primary)) {
        // Add slight random noise to distinguish fonts
        return width + (Math.random() - 0.5) * 2;
      }
      return width;
    }
  });

  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function() {
    const rect = originalGetBoundingClientRect.call(this);
    const font = getComputedStyle(this).fontFamily || '';
    const primary = font.split(',')[0].trim();
    if (!allowedSet.has(primary)) {
      const noise = (Math.random() - 0.5) * 2;
      return new DOMRect(
        rect.x + noise,
        rect.y + noise,
        rect.width + noise,
        rect.height + noise
      );
    }
    return rect;
  };

  // ---- 4. document.fonts spoofing for FontFaceSet checks
  const fakeFontFaceSet = {
    check(font) {
      const f = font.replace(/["']/g, '').split(' ')[0];
      return allowedSet.has(f);
    },
    load: () => Promise.resolve(),
    ready: Promise.resolve(),
    addEventListener: () => {},
    removeEventListener: () => {},
    forEach: () => {}
  };

  Object.defineProperty(document, 'fonts', {
    get() {
      return fakeFontFaceSet;
    }
  });

  console.log('Font spoofing is working');
})();
