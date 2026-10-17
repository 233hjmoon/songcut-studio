(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SongcutExportTimeline = api;
})(typeof window !== "undefined" ? window : null, function () {
  function frameTimes(duration, lyricSeconds, framesPerSecond = 5, animateTransitions = false) {
    if (!Number.isFinite(duration) || duration <= 0) return [];
    const transitionDuration = 0.3;
    const transitionFrameRate = 30;
    const transitionFrames = Math.round(transitionDuration * transitionFrameRate);
    const steps = Math.ceil(duration * framesPerSecond);
    const all = [];
    for (let index = 0; index < steps; index++) {
      const time = Math.round(index * 1000 / framesPerSecond) / 1000;
      if (time < duration) all.push(time);
    }
    for (const value of lyricSeconds) {
      const time = Math.round(Number(value) * 1000) / 1000;
      if (!Number.isFinite(time) || time < 0 || time >= duration) continue;
      all.push(time);
      if (!animateTransitions) continue;
      for (let frame = 1; frame <= transitionFrames; frame++) {
        const offset = frame / transitionFrameRate;
        const transitionSample = Math.round((time + offset) * 1000) / 1000;
        if (transitionSample < duration) all.push(transitionSample);
      }
    }
    return [...new Set(all)].sort((left, right) => left - right);
  }

  return { frameTimes };
});
