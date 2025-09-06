(function() {
  // Create a hidden canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 150;
  const ctx = canvas.getContext('2d');

  // Fixed background color
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Fixed circle
  ctx.beginPath();
  ctx.arc(150, 75, 50, 0, Math.PI * 2);
  ctx.fillStyle = '#ff5733';
  ctx.fill();

  // Fixed text
  ctx.font = '20px Arial';
  ctx.fillStyle = '#333';
  ctx.fillText('Canvas Fingerprint', 70, 130);

  // Convert canvas to data URL
  const dataUrl = canvas.toDataURL('image/png');

  // Compute SHA-256 hash of the data URL
  const encoder = new TextEncoder();
  const data = encoder.encode(dataUrl);
  crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    console.log('Canvas Fingerprint Hash:', hashHex);
  });
})();
