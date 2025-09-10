
(function() {
  const randFloat = (range = 5) => (Math.random() - 0.5) * range;

  // Wrap createAnalyser to inject noise into getFloatFrequencyData
  const origCreateAnalyser = AudioContext.prototype.createAnalyser;
  AudioContext.prototype.createAnalyser = function(...args) {
    const analyser = origCreateAnalyser.apply(this, args);
    const origGetFreq = analyser.getFloatFrequencyData;

    analyser.getFloatFrequencyData = function(array) {
      origGetFreq.apply(this, [array]);
      if (array.length === 0) return array;
      const idx = Math.floor(Math.random() * array.length);
      array[idx] += randFloat(10);
      return array;
    };

    return analyser;
  };

  // Wrap getChannelData to add noise to audio buffer sample data
  const origGetChannelData = AudioBuffer.prototype.getChannelData;
  AudioBuffer.prototype.getChannelData = function(...args) {
    const data = origGetChannelData.apply(this, args);
    if (data.length === 0) return data;
    const idx = Math.floor(Math.random() * data.length);
    data[idx] += randFloat(0.1);
    return data;
  };

  console.log('AudioContext random-noise spoof injected');
})();
