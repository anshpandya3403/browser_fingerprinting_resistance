class FingerprintProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input[0]) {
      const sample = input[0].slice(0, 10).map(x => x.toFixed(10)).join(',');
      this.port.postMessage(sample);
      return false; // stop after sending one sample
    }
    return true;
  }
}

registerProcessor('fingerprint-processor', FingerprintProcessor);
