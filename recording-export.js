(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SongcutRecordingExport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MIME_PREFERENCES = {
    audio: ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"],
    silent: ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm"]
  };

  function selectRecordingMimeType(MediaRecorderClass, includeAudio = true) {
    if (!MediaRecorderClass || typeof MediaRecorderClass.isTypeSupported !== "function") return "";
    const preferences = includeAudio ? MIME_PREFERENCES.audio : MIME_PREFERENCES.silent;
    return preferences.find(type => MediaRecorderClass.isTypeSupported(type)) || "";
  }

  function combineRecordingStreams(canvasStream, mediaStream, MediaStreamClass) {
    const videoTracks = canvasStream.getVideoTracks();
    const audioTracks = mediaStream.getAudioTracks();
    if (!videoTracks.length) throw new Error("画布没有可录制的视频轨道");
    return new MediaStreamClass([...videoTracks, ...audioTracks]);
  }

  function beginPlaybackFromStart(mediaEl, onPlaying) {
    const needsSeek = mediaEl.currentTime > 0.001;
    let resolveSeek;
    const seekPromise = needsSeek ? new Promise(resolve => { resolveSeek = resolve; }) : Promise.resolve();
    let resolvePlaying;
    const playingPromise = new Promise(resolve => { resolvePlaying = resolve; });
    const onSeeked = () => resolveSeek();
    const handlePlaying = () => {
      try { if (onPlaying) onPlaying(); }
      catch (error) { resolvePlaying(Promise.reject(error)); return; }
      resolvePlaying();
    };
    if (needsSeek) mediaEl.addEventListener("seeked", onSeeked, { once: true });
    mediaEl.addEventListener("playing", handlePlaying, { once: true });
    if (needsSeek) mediaEl.currentTime = 0;
    let playPromise;
    try {
      playPromise = Promise.resolve(mediaEl.play());
    } catch (error) {
      playPromise = Promise.reject(error);
    }
    const cleanup = () => {
      mediaEl.removeEventListener("seeked", onSeeked);
      mediaEl.removeEventListener("playing", handlePlaying);
    };
    const ready = Promise.all([seekPromise, playingPromise, playPromise]).finally(cleanup);
    return {
      ready, playPromise,
      cancel: () => { cleanup(); if (resolveSeek) resolveSeek(); resolvePlaying(); }
    };
  }

  function watchRecordingVisibility(documentEl, onHidden) {
    const onChange = () => { if (documentEl.hidden) onHidden(); };
    documentEl.addEventListener("visibilitychange", onChange);
    onChange();
    return () => documentEl.removeEventListener("visibilitychange", onChange);
  }

  function canStartRecording(documentEl, state) {
    return !documentEl.hidden && !state.cancelled && !state.recordingError;
  }

  function failRecording(state, mediaEl, recorder, error) {
    state.recordingError = error instanceof Error ? error : new Error("浏览器录制失败");
    try { mediaEl.pause(); } catch (_) { /* retain the recording failure */ }
    try {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    } catch (_) { /* recorder may already have stopped */ }
  }

  return {
    selectRecordingMimeType, combineRecordingStreams,
    beginPlaybackFromStart, watchRecordingVisibility, failRecording, canStartRecording
  };
});
