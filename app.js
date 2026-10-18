(() => {
  "use strict";

  const STORAGE_KEY = "songcut-studio-project-v1";
  const canvas = document.getElementById("preview");
  const ctx = canvas.getContext("2d", { alpha: false });
  const audio = document.getElementById("audio-source");
  const video = document.getElementById("video-source");
  const backdropCanvas = document.createElement("canvas");
  backdropCanvas.width = 480;
  backdropCanvas.height = 270;
  const backdropCtx = backdropCanvas.getContext("2d");
  const { parseLyricText, decodeLyricBytes } = window.SongcutLyrics;
  const { getVideoPlacement } = window.SongcutVideoFrame;
  const { frameTimes } = window.SongcutExportTimeline;
  const vinylTheme = window.SongcutVinylTheme;
  const coverFrame = { x: 92, y: 145, size: 643 };
  const THEMES = {
    paper: {
      canvas: "#e8e6df", grid: "rgba(47,59,59,.09)", panel: "rgba(248,247,241,.72)", panelLine: "rgba(39,47,47,.18)",
      heading: "#263334", album: "#34434b", title: "#222828", artist: "#687475", tags: "#51626a", transport: "#283333",
      progressBase: "#c0c4bd", progress: "#283333", eyebrow: "#566b73", secondary: "#202626", muted: "#6b7575", line: "#afb3ae",
      empty: "#86908b", activeBackground: "rgba(189,119,60,.14)", activeAccent: "#b86e37", activeTime: "#9d5b2a", idleTime: "#7b8682",
      activeText: "#202626", idleText: "#626e6d", activeTranslation: "#696a61", idleTranslation: "#9ba39f", lyricLine: "rgba(70,84,81,.18)",
      coverStart: "#0d1e2d", coverMiddle: "#315d75", coverEnd: "#bd804c", coverRing: "rgba(248,234,203,.55)", coverText: "#fff6df", coverBorder: "#b4b5af"
    },
    "rainy-night": {
      canvas: "#193654", grid: "rgba(168,210,255,.085)", panel: "rgba(24,48,76,.84)", panelLine: "rgba(154,205,246,.34)",
      heading: "#edf7ff", album: "#c0e4f5", title: "#f6faff", artist: "#c3d7eb", tags: "#b3cee8", transport: "#91eaff",
      progressBase: "#42658b", progress: "#71e0f4", eyebrow: "#acd3ec", secondary: "#f0f8ff", muted: "#bfd1e4", line: "rgba(165,204,235,.44)",
      empty: "#b3c9df", activeBackground: "rgba(73,174,220,.24)", activeAccent: "#78e4f5", activeTime: "#91ecff", idleTime: "#aec3dd",
      activeText: "#f7fcff", idleText: "#d4e2ef", activeTranslation: "#dfedf7", idleTranslation: "#adc2d8", lyricLine: "rgba(168,205,239,.22)",
      coverStart: "#102a47", coverMiddle: "#28669b", coverEnd: "#a3b7dc", coverRing: "rgba(174,235,255,.72)", coverText: "#f5fbff", coverBorder: "#8ad6f1"
    },
    "flow-player": {
      canvas: "#281e27", grid: "rgba(255,238,231,.03)", panel: "rgba(27,22,30,.22)", panelLine: "rgba(255,255,255,.10)",
      heading: "#f6eee9", album: "#e7d9d4", title: "#fff8f4", artist: "#e0d2d1", tags: "#d8c8c9", transport: "#fff5ef",
      progressBase: "rgba(255,255,255,.40)", progress: "#fff8f3", eyebrow: "#e6cbd5", secondary: "#fff8f5", muted: "#e0d3d4", line: "rgba(255,255,255,.34)",
      empty: "#e1d6d6", activeBackground: "rgba(255,255,255,.14)", activeAccent: "#fff5ef", activeTime: "#fff9f5", idleTime: "rgba(255,248,245,.67)",
      activeText: "#fffaf7", idleText: "rgba(255,248,245,.72)", activeTranslation: "rgba(255,248,245,.82)", idleTranslation: "rgba(255,248,245,.5)", lyricLine: "rgba(255,255,255,.14)",
      coverStart: "#553a50", coverMiddle: "#98677d", coverEnd: "#d0a19b", coverRing: "rgba(255,245,238,.5)", coverText: "#fff6f0", coverBorder: "rgba(255,255,255,.75)"
    },
    "vinyl-player": {
      canvas: "#102553", grid: "rgba(255,255,255,.02)", panel: "rgba(10,25,54,.2)", panelLine: "rgba(255,255,255,.12)",
      heading: "#f5f7ff", album: "#c7d7f2", title: "#fffaf4", artist: "#d7e2f4", tags: "#c1d2ed", transport: "#fffaf4",
      progressBase: "rgba(242,248,255,.45)", progress: "#f2d99f", eyebrow: "#d2e1f6", secondary: "#fffaf4", muted: "#c7d5ed", line: "rgba(255,255,255,.22)",
      empty: "#d7e4f2", activeBackground: "rgba(255,255,255,.04)", activeAccent: "#f2d99f", activeTime: "#f2d99f", idleTime: "#b6c7e1",
      activeText: "#fffaf4", idleText: "#c9d5e7", activeTranslation: "#eef3fc", idleTranslation: "#aabbd5", lyricLine: "rgba(255,255,255,.12)",
      coverStart: "#1e3765", coverMiddle: "#9c554b", coverEnd: "#e4c49c", coverRing: "rgba(255,244,224,.65)", coverText: "#fff7e9", coverBorder: "rgba(255,244,224,.70)"
    }
  };
  const ids = [
    "project-import", "project-save", "export-png", "export-mode", "export-video", "theme-paper", "theme-rainy", "theme-player", "theme-vinyl", "media-input",
    "video-input", "video-name", "cover-input", "media-name", "cover-name", "song-title", "song-artist",
    "song-album", "song-duration", "song-tags", "song-footer", "song-description",
    "lyric-list", "line-count", "add-line", "clear-lyrics", "lyric-offset", "apply-lyric-offset", "lrc-text", "lrc-import",
    "lyric-style-timeline", "lyric-style-scroll",
    "lyrics-file-input", "lyrics-file-name", "prev-line",
    "play-toggle", "next-line", "time-readout", "seek", "save-state",
    "export-status", "cancel-export", "visual-source-video", "visual-source-cover",
    "video-zoom", "video-zoom-value", "video-reset", "visual-help", "remove-cover",
    "vinyl-background-controls", "vinyl-bg-video", "vinyl-bg-image", "vinyl-bg-input", "vinyl-bg-remove", "vinyl-bg-status", "vinyl-speed", "vinyl-speed-value"
  ];
  const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

  function blankProject() {
    return {
      version: 1,
      title: "",
      artist: "",
      album: "歌回切片 / SIDE A",
      duration: 228,
      tags: "歌回 切片",
      footer: "CREATED LOCALLY",
      description: "",
      coverData: "",
      visualSource: "video",
      videoTransform: { x: 0, y: 0, scale: 1 },
      lyrics: [],
      lyricDisplay: "timeline",
      vinylBackgroundMode: "video-color",
      vinylBackgroundColors: [...vinylTheme.DEFAULT_GRADIENT],
      vinylBackgroundData: "",
      vinylSecondsPerTurn: 40,
      theme: "paper"
    };
  }

  function normalizeProject(input) {
    const base = blankProject();
    const value = input && typeof input === "object" ? input : {};
    for (const key of ["title", "artist", "album", "tags", "footer", "description", "coverData"]) {
      if (typeof value[key] === "string") base[key] = value[key];
    }
    if (value.visualSource === "cover") base.visualSource = "cover";
    if (value.lyricDisplay === "scroll") base.lyricDisplay = "scroll";
    if (["rainy-night", "flow-player", "vinyl-player"].includes(value.theme)) base.theme = value.theme;
    if (value.vinylBackgroundMode === "custom-image") base.vinylBackgroundMode = "custom-image";
    base.vinylBackgroundColors = vinylTheme.normalizeGradientColors(value.vinylBackgroundColors);
    base.vinylSecondsPerTurn = vinylTheme.normalizeSecondsPerTurn(value.vinylSecondsPerTurn);
    if (typeof value.vinylBackgroundData === "string" && /^data:image\/(?:png|jpeg|webp);base64,/.test(value.vinylBackgroundData)) {
      base.vinylBackgroundData = value.vinylBackgroundData;
    }
    if (value.videoTransform && typeof value.videoTransform === "object") {
      for (const key of ["x", "y", "scale"]) {
        const number = Number(value.videoTransform[key]);
        if (Number.isFinite(number)) base.videoTransform[key] = number;
      }
      base.videoTransform.scale = Math.min(3, Math.max(1, base.videoTransform.scale));
    }
    const duration = Number(value.duration);
    if (Number.isFinite(duration) && duration > 0) base.duration = duration;
    if (Array.isArray(value.lyrics)) {
      base.lyrics = value.lyrics.slice(0, 1000).map((line, index) => ({
        id: Number.isFinite(Number(line.id)) ? Number(line.id) : Date.now() + index,
        time: typeof line.time === "string" ? line.time : formatTime(Number(line.time) || 0),
        text: String(line.text || ""),
        translation: String(line.translation || "")
      }));
    }
    return base;
  }

  function loadDraft() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? normalizeProject(JSON.parse(saved)) : blankProject();
    } catch (_) {
      return blankProject();
    }
  }

  let project = loadDraft();
  let mediaEl = null;
  let mediaKind = "";
  let mediaFile = null;
  let mediaURL = "";
  let coverImage = null;
  let vinylBackgroundImage = null;
  let vinylPaletteStatus = "未导入视频时使用内置深蓝渐变。";
  let vinylSampleToken = 0;
  let currentTime = 0;
  let exportState = null;
  let lastActiveId = null;
  let saveTimer = 0;
  let videoDrag = null;
  let videoFrameRequest = 0;

  function videoIsSelected() {
    return mediaKind === "video" && project.visualSource === "video";
  }

  function themeColors() {
    return THEMES[project.theme] || THEMES.paper;
  }

  function updateThemeControls() {
    const rainy = project.theme === "rainy-night";
    const player = project.theme === "flow-player";
    const vinyl = project.theme === "vinyl-player";
    document.body.dataset.theme = project.theme;
    document.querySelector('meta[name="theme-color"]').content = player ? "#281e27" : rainy || vinyl ? "#193654" : "#e9e6dd";
    el["export-status"].style.color = player ? "#e0d3d4" : rainy || vinyl ? "#b7d0e8" : "#4b5f60";
    el["theme-paper"].setAttribute("aria-pressed", String(project.theme === "paper"));
    el["theme-rainy"].setAttribute("aria-pressed", String(rainy));
    el["theme-player"].setAttribute("aria-pressed", String(player));
    el["theme-vinyl"].setAttribute("aria-pressed", String(vinyl));
    updateVinylBackgroundControls();
    updateVisualControls();
  }

  function applyVideoTransform(next) {
    if (video.videoWidth && video.videoHeight) {
      const placement = getVideoPlacement(video.videoWidth, video.videoHeight, coverFrame.size, next);
      project.videoTransform = { x: placement.x, y: placement.y, scale: placement.scale };
    } else {
      project.videoTransform = {
        x: Number.isFinite(Number(next.x)) ? Number(next.x) : 0,
        y: Number.isFinite(Number(next.y)) ? Number(next.y) : 0,
        scale: Math.min(3, Math.max(1, Number(next.scale) || 1))
      };
    }
    el["video-zoom"].value = String(project.videoTransform.scale);
    el["video-zoom-value"].textContent = Math.round(project.videoTransform.scale * 100) + "%";
    drawPreview();
  }

  function updateVisualControls() {
    const hasVideo = mediaKind === "video";
    const hasCover = !!project.coverData;
    el["visual-source-video"].disabled = !hasVideo;
    el["visual-source-cover"].disabled = !hasCover;
    el["remove-cover"].disabled = !hasCover;
    el["visual-source-video"].setAttribute("aria-pressed", String(videoIsSelected()));
    el["visual-source-cover"].setAttribute("aria-pressed", String(!videoIsSelected() && hasCover));
    el["video-zoom"].disabled = !videoIsSelected();
    el["video-reset"].disabled = !videoIsSelected();
    el["video-zoom"].value = String(project.videoTransform.scale);
    el["video-zoom-value"].textContent = Math.round(project.videoTransform.scale * 100) + "%";
    const frameName = project.theme === "vinyl-player" ? "唱片中央的圆形画面" : "预览中的方形画面";
    el["visual-help"].textContent = videoIsSelected()
      ? `在${frameName}按住拖动；用滑杆或鼠标滚轮缩放。`
      : hasCover && hasVideo ? "当前使用上传的封面；切回“视频画面”可以继续调整视频。"
        : hasCover ? "当前使用上传的封面；导入视频后也可以切换画面。"
        : `导入视频后，可在${frameName}上拖动，并用滑杆或鼠标滚轮缩放。`;
    canvas.classList.toggle("can-pan", videoIsSelected());
  }

  function updateVinylBackgroundControls() {
    const custom = project.vinylBackgroundMode === "custom-image";
    el["vinyl-background-controls"].classList.toggle("hidden", project.theme !== "vinyl-player");
    el["vinyl-bg-video"].setAttribute("aria-pressed", String(!custom));
    el["vinyl-bg-image"].setAttribute("aria-pressed", String(custom));
    el["vinyl-bg-remove"].disabled = !project.vinylBackgroundData;
    el["vinyl-speed"].value = String(project.vinylSecondsPerTurn);
    el["vinyl-speed-value"].textContent = `${project.vinylSecondsPerTurn} 秒/圈`;
    el["vinyl-bg-status"].textContent = custom
      ? project.vinylBackgroundData ? "正在使用自定义背景图片。" : "请导入背景图片；当前暂用视频渐变。"
      : mediaKind === "video" ? vinylPaletteStatus : "未导入视频时使用内置深蓝渐变。";
  }

  function loadVinylBackgroundData(data) {
    if (!data) {
      vinylBackgroundImage = null;
      updateVinylBackgroundControls();
      drawPreview();
      return;
    }
    const image = new Image();
    image.onload = () => {
      if (project.vinylBackgroundData !== data) return;
      vinylBackgroundImage = image;
      updateVinylBackgroundControls();
      drawPreview();
    };
    image.onerror = () => {
      if (project.vinylBackgroundData !== data) return;
      vinylBackgroundImage = null;
      status("背景图片无法打开，已使用渐变背景。", true);
      drawPreview();
    };
    image.src = data;
  }

  async function sampleVinylBackground(sourceURL) {
    const token = ++vinylSampleToken;
    vinylPaletteStatus = "正在从视频画面提取颜色……";
    updateVinylBackgroundControls();
    try {
      const colors = await vinylTheme.sampleGradientFromVideo(sourceURL);
      if (token !== vinylSampleToken || mediaURL !== sourceURL || mediaKind !== "video") return;
      project.vinylBackgroundColors = colors;
      vinylPaletteStatus = "已根据导入视频生成纯色渐变。";
      updateVinylBackgroundControls();
      saveDraft();
      drawPreview();
    } catch (_) {
      if (token !== vinylSampleToken) return;
      vinylPaletteStatus = "无法从视频取色，当前使用上次色调或内置渐变。";
      updateVinylBackgroundControls();
    }
  }

  function parseTime(raw) {
    if (typeof raw === "number") return Number.isFinite(raw) ? Math.max(0, raw) : 0;
    const parts = String(raw || "").trim().split(":").map(Number);
    if (!parts.length || parts.some(part => !Number.isFinite(part) || part < 0)) return 0;
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  function formatTime(seconds, precise = false) {
    const safe = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const sec = Math.floor(safe % 60);
    const stamp = (hours ? String(hours).padStart(2, "0") + ":" : "") +
      String(minutes).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
    return precise ? stamp + "." + String(Math.floor((safe % 1) * 100 + 1e-7)).padStart(2, "0") : stamp;
  }

  function timeFont(size) {
    return "700 " + size + "px Consolas, 'Microsoft YaHei', monospace";
  }

  function sortedLyrics() {
    return [...project.lyrics].sort((a, b) => parseTime(a.time) - parseTime(b.time));
  }

  function activeIndex(lines, seconds) {
    let index = -1;
    for (let i = 0; i < lines.length; i++) {
      if (parseTime(lines[i].time) <= seconds + 0.02) index = i;
      else break;
    }
    return index;
  }

  function scrollCenterIndex(lines, seconds) {
    if (!lines.length) return 0;
    const times = lines.map(line => parseTime(line.time));
    if (seconds <= times[0]) return 0;
    let target = 0;
    for (let index = 1; index < times.length; index++) {
      if (times[index] <= seconds) target = index;
      else break;
    }
    if (target === 0) return 0;
    const transitionStart = times[target];
    if (transitionStart <= times[target - 1]) return target;
    const progress = Math.max(0, Math.min(1, (seconds - transitionStart) / 0.3));
    const eased = 1 - Math.pow(1 - progress, 3);
    return target - 1 + eased;
  }

  function drawScrollingLyrics(lines) {
    const top = 212;
    const bottom = 990;
    const centerY = 600;
    const spacing = 88;
    const fadeDistance = 150;
    const centerIndex = scrollCenterIndex(lines, currentTime);
    const selected = activeIndex(lines, currentTime);
    const activeProgress = selected > 0
      ? Math.max(0, Math.min(1, centerIndex - selected + 1))
      : 1;
    const palette = themeColors();
    const first = Math.max(0, Math.floor(centerIndex) - 5);
    const last = Math.min(lines.length - 1, Math.ceil(centerIndex) + 5);

    ctx.save();
    ctx.beginPath();
    ctx.rect(830, top, 994, bottom - top);
    ctx.clip();
    for (let index = first; index <= last; index++) {
      const line = lines[index];
      const y = centerY + (index - centerIndex) * spacing;
      const edgeAlpha = Math.min((y - top) / fadeDistance, (bottom - y) / fadeDistance);
      const alpha = Math.max(0, Math.min(1, edgeAlpha));
      const isActive = index === selected;
      ctx.globalAlpha = isActive ? activeProgress : alpha;
      if (isActive) {
        ctx.fillStyle = palette.activeBackground;
        ctx.fillRect(830, y - 27, 994, 76);
        ctx.fillStyle = palette.activeAccent;
        ctx.fillRect(830, y - 27, 5, 76);
      }
      ctx.fillStyle = isActive ? palette.activeTime : palette.idleTime;
      ctx.font = timeFont(21);
      ctx.fillText(formatTime(parseTime(line.time)), 850, y + 5);
      ctx.fillStyle = isActive ? palette.activeText : palette.idleText;
      ctx.font = (isActive ? "700 " : "400 ") + "30px 'Microsoft YaHei',sans-serif";
      ctx.fillText(fitText(line.text || "（空白歌词）", 750), 1000, y + 3);
      if (line.translation) {
        ctx.fillStyle = isActive ? palette.activeTranslation : palette.idleTranslation;
        ctx.font = "20px Georgia,'Microsoft YaHei',serif";
        ctx.fillText(fitText(line.translation, 760), 1000, y + 32);
      }
      ctx.strokeStyle = palette.lyricLine;
      ctx.beginPath(); ctx.moveTo(842, y + 55); ctx.lineTo(1810, y + 55); ctx.stroke();
    }
    ctx.restore();
  }

  function updateLyricDisplayButtons() {
    const scrolling = project.lyricDisplay === "scroll";
    el["lyric-style-timeline"].setAttribute("aria-pressed", String(!scrolling));
    el["lyric-style-scroll"].setAttribute("aria-pressed", String(scrolling));
  }

  function status(message, error = false) {
    el["export-status"].textContent = message;
    el["export-status"].style.color = error ? "#e58f82" : (project.theme === "flow-player" ? "#e0d3d4" : ["rainy-night", "vinyl-player"].includes(project.theme) ? "#b7d0e8" : "#4b5f60");
  }

  function saveDraft() {
    el["save-state"].textContent = "保存中";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
        el["save-state"].textContent = "已保存到本机";
      } catch (_) {
        el["save-state"].textContent = "存储空间不足";
      }
    }, 250);
  }

  function updateMetadataFields() {
    el["song-title"].value = project.title;
    el["song-artist"].value = project.artist;
    el["song-album"].value = project.album;
    el["song-duration"].value = formatTime(project.duration);
    el["song-tags"].value = project.tags;
    el["song-footer"].value = project.footer;
    el["song-description"].value = project.description;
    el.seek.max = String(project.duration);
    updateTransport();
  }

  function loadCoverData(data) {
    if (!data) {
      coverImage = null;
      el["cover-name"].textContent = "视频也可使用 · PNG、JPG、WebP";
      updateVisualControls();
      return;
    }
    const image = new Image();
    image.onload = () => {
      if (project.coverData !== data) return;
      coverImage = image;
      drawPreview();
    };
    image.onerror = () => {
      coverImage = null;
      status("封面图片无法打开。", true);
    };
    image.src = data;
    el["cover-name"].textContent = "已载入封面";
    updateVisualControls();
  }

  function updateTransport() {
    const duration = mediaEl && Number.isFinite(mediaEl.duration) ? mediaEl.duration : project.duration;
    el["time-readout"].textContent = formatTime(currentTime) + " / " + formatTime(duration);
    el.seek.max = String(Math.max(1, duration));
    el.seek.value = String(Math.min(currentTime, duration));
    const isPlaying = mediaEl && !mediaEl.paused;
    const playLabel = isPlaying ? "暂停" : "播放";
    if (el["play-toggle"].getAttribute("aria-label") !== playLabel) {
      el["play-toggle"].innerHTML = isPlaying
        ? '<svg class="transport-icon pause-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.7" y="5.8" width="4.2" height="12.4" rx="2.1"/><rect x="13.1" y="5.8" width="4.2" height="12.4" rx="2.1"/></svg>'
        : '<svg class="transport-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6.8c0-1.1 1.2-1.7 2.2-1.1l8.1 5.1a1.4 1.4 0 0 1 0 2.4l-8.1 5.1A1.4 1.4 0 0 1 8 17.2z"/></svg>';
      el["play-toggle"].setAttribute("aria-label", playLabel);
    }
    const lines = sortedLyrics();
    const active = lines[activeIndex(lines, currentTime)]?.id ?? null;
    if (active !== lastActiveId) {
      lastActiveId = active;
      document.querySelectorAll(".lyric-row").forEach(row => {
        row.classList.toggle("is-active", Number(row.dataset.id) === active);
      });
    }
  }

  function onTimeChange() {
    currentTime = mediaEl ? mediaEl.currentTime : currentTime;
    updateTransport();
    if (!mediaEl || mediaEl.paused) drawPreview();
  }

  function cancelVideoFrameDraw() {
    if (videoFrameRequest && typeof video.cancelVideoFrameCallback === "function") {
      video.cancelVideoFrameCallback(videoFrameRequest);
    }
    videoFrameRequest = 0;
  }

  function scheduleVideoFrameDraw() {
    if (mediaEl !== video || video.paused || videoFrameRequest || typeof video.requestVideoFrameCallback !== "function") return;
    videoFrameRequest = video.requestVideoFrameCallback(() => {
      videoFrameRequest = 0;
      if (mediaEl !== video || video.paused) return;
      currentTime = video.currentTime;
      updateTransport();
      drawPreview();
      scheduleVideoFrameDraw();
    });
  }

  function onMediaPlay(element) {
    updateTransport();
    if (element === video) scheduleVideoFrameDraw();
  }

  function onMediaPause(element) {
    if (element === video) cancelVideoFrameDraw();
    updateTransport();
  }

  function setCurrentTime(seconds) {
    const duration = mediaEl && Number.isFinite(mediaEl.duration) ? mediaEl.duration : project.duration;
    const target = Math.max(0, Math.min(seconds, duration || 0));
    currentTime = target;
    if (mediaEl && mediaEl.readyState >= 1) mediaEl.currentTime = target;
    updateTransport();
    drawPreview();
  }

  function makeButton(text, title, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("click", handler);
    return button;
  }

  function makeInput(className, value, placeholder, onChange, eventName = "input") {
    const input = document.createElement("input");
    input.className = className;
    input.value = value;
    input.placeholder = placeholder;
    input.addEventListener(eventName, () => onChange(input.value));
    return input;
  }

  function renderLyricEditor() {
    const list = el["lyric-list"];
    list.replaceChildren();
    const lines = sortedLyrics();
    el["line-count"].textContent = lines.length + " 行";
    el["clear-lyrics"].disabled = lines.length === 0;
    el["apply-lyric-offset"].disabled = lines.length === 0;
    if (!lines.length) {
      const empty = document.createElement("div");
      empty.className = "lyric-empty";
      empty.textContent = "还没有歌词。添加第一句，或批量导入 LRC。";
      list.appendChild(empty);
      return;
    }
    lines.forEach((line, index) => {
      const row = document.createElement("article");
      row.className = "lyric-row";
      row.dataset.id = String(line.id);
      const top = document.createElement("div");
      top.className = "lyric-row-top";
      const number = document.createElement("span");
      number.className = "lyric-index";
      number.textContent = "第 " + String(index + 1).padStart(2, "0") + " 句";
      top.appendChild(number);
      top.appendChild(makeButton("取当前时间", "把当前播放时间填给这句", () => {
        line.time = formatTime(currentTime, true);
        saveDraft();
        renderLyricEditor();
        drawPreview();
      }));
      top.appendChild(makeButton("▶", "跳到这句", () => setCurrentTime(parseTime(line.time))));
      top.appendChild(makeButton("×", "删除这句", () => {
        project.lyrics = project.lyrics.filter(item => item.id !== line.id);
        saveDraft();
        renderLyricEditor();
        drawPreview();
      }));
      const fields = document.createElement("div");
      fields.className = "lyric-row-fields";
      const time = makeInput("time-input", line.time, "00:00", value => {
        line.time = value;
        saveDraft();
        renderLyricEditor();
        drawPreview();
      }, "change");
      time.setAttribute("aria-label", "第 " + (index + 1) + " 句时间");
      const text = makeInput("", line.text, "歌词文字", value => {
        line.text = value;
        saveDraft();
        drawPreview();
      });
      text.setAttribute("aria-label", "第 " + (index + 1) + " 句歌词");
      const translation = makeInput("translation", line.translation, "翻译 / 副歌词（可选）", value => {
        line.translation = value;
        saveDraft();
        drawPreview();
      });
      translation.setAttribute("aria-label", "第 " + (index + 1) + " 句翻译");
      fields.append(time, text, translation);
      row.append(top, fields);
      list.appendChild(row);
    });
    lastActiveId = null;
    updateTransport();
  }

  function addLine() {
    project.lyrics.push({
      id: Date.now() + Math.floor(Math.random() * 100000),
      time: formatTime(currentTime, true),
      text: "",
      translation: ""
    });
    saveDraft();
    renderLyricEditor();
    drawPreview();
    const inputs = [...el["lyric-list"].querySelectorAll(".lyric-row input")];
    const textInput = inputs[inputs.length - 2];
    if (textInput) textInput.focus();
  }

  function clearLyrics() {
    const count = project.lyrics.length;
    if (!count) return;
    project.lyrics = [];
    el["lyrics-file-name"].textContent = "支持 [00:12.50]（歌词）和普通 LRC；导入时追加到现有歌词。";
    saveDraft();
    renderLyricEditor();
    drawPreview();
    status(`已清空 ${count} 句歌词。`);
  }

  function applyLyricOffset() {
    const rawOffset = el["lyric-offset"].value.trim();
    const offset = Number(rawOffset);
    if (!rawOffset || !Number.isFinite(offset) || !el["lyric-offset"].checkValidity()) {
      return status("请输入 -3600 到 3600 秒之间的有效偏移量。", true);
    }
    if (offset === 0) return status("偏移量为 0 秒，歌词时间没有变化。", true);
    const count = project.lyrics.length;
    if (!count) return status("请先导入或添加歌词。", true);
    let clampedCount = 0;
    project.lyrics = project.lyrics.map(line => {
      const shiftedCentiseconds = Math.round((parseTime(line.time) + offset) * 100);
      if (shiftedCentiseconds < 0) clampedCount++;
      return { ...line, time: formatTime(Math.max(0, shiftedCentiseconds) / 100, true) };
    });
    saveDraft();
    renderLyricEditor();
    drawPreview();
    const action = offset > 0 ? "后移" : "前移";
    const note = clampedCount ? `，其中 ${clampedCount} 句已归到 00:00` : "";
    status(`已将 ${count} 句歌词整体${action} ${Math.abs(offset)} 秒${note}。`);
  }

  function appendLyrics(lines) {
    if (!lines.length) return false;
    const nextId = Math.max(Date.now(), ...project.lyrics.map(line => Number(line.id) || 0)) + 1;
    project.lyrics.push(...lines.map((line, index) => ({ ...line, id: nextId + index })));
    saveDraft();
    renderLyricEditor();
    drawPreview();
    return true;
  }

  function importLrc() {
    const raw = el["lrc-text"].value.trim();
    if (!raw) return status("先粘贴歌词或逐行文本。", true);
    const imported = parseLyricText(raw, { startAt: currentTime, allowUntimed: true });
    if (!appendLyrics(imported)) return status("没有找到可导入的歌词。", true);
    el["lrc-text"].value = "";
    status("已导入 " + imported.length + " 句歌词。");
  }

  async function importLyricFile() {
    const input = el["lyrics-file-input"];
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (!/\.(txt|lrc)$/i.test(file.name)) {
        return status("请选择 .txt 或 .lrc 歌词文件。", true);
      }
      const text = decodeLyricBytes(await file.arrayBuffer());
      const imported = parseLyricText(text, { allowUntimed: false });
      if (!appendLyrics(imported)) {
        return status("文件中没有找到有效的 [时间]（歌词）行。", true);
      }
      el["lyrics-file-name"].textContent = file.name + " · 已追加 " + imported.length + " 句";
      status("已从 " + file.name + " 导入 " + imported.length + " 句歌词。");
    } catch (error) {
      status("歌词文件读取失败：" + (error?.message || String(error)), true);
    } finally {
      input.value = "";
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function fileStem() {
    return (project.title || "歌切视频").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
  }

  function saveJson() {
    const json = JSON.stringify(project, null, 2);
    downloadBlob(new Blob([json], { type: "application/json" }), fileStem() + "-项目.json");
    status("项目 JSON 已保存。歌曲文件需要下次重新导入。");
  }

  function exportPng() {
    drawPreview();
    canvas.toBlob(blob => {
      if (!blob) return status("当前画面导出失败。", true);
      downloadBlob(blob, fileStem() + "-" + formatTime(currentTime).replace(/:/g, "-") + ".png");
      status("已导出当前画面 PNG。");
    }, "image/png");
  }

  async function exportApi(path, options = {}) {
    const response = await fetch(path, { cache: "no-store", ...options });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(value.error || "本机合成服务没有响应");
    return value;
  }

  function lockExportControls() {
    if (videoDrag) {
      videoDrag = null;
      canvas.classList.remove("is-panning");
    }
    const controls = [...document.querySelectorAll("input,textarea,select,button")]
      .filter(control => control !== el["cancel-export"] && control !== el["export-video"]);
    const previous = controls.map(control => [control, control.disabled]);
    controls.forEach(control => { control.disabled = true; });
    el["export-video"].disabled = true;
    return () => {
      previous.forEach(([control, disabled]) => { control.disabled = disabled; });
      el["export-video"].disabled = false;
    };
  }

  function downloadExport(path, state, filename) {
    const link = document.createElement("a");
    link.href = path;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    state.delivered = true;
  }

  async function exportRecordedVideo() {
    if (!mediaEl || !mediaFile) return status("请先导入音频或视频素材，再录制歌词视频。", true);
    const duration = mediaEl.duration;
    if (!Number.isFinite(duration) || duration <= 0) return status("素材时长还未读取完成，请稍后再试。", true);
    if (duration > 3600) return status("单次录制目前支持最长 60 分钟的素材。", true);
    if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
      return status("当前浏览器不支持画布实时录制，请改用直接合成。", true);
    }
    const captureMedia = mediaEl.captureStream || mediaEl.mozCaptureStream;
    if (typeof captureMedia !== "function") {
      return status("当前浏览器无法捕获素材音轨，请改用直接合成。", true);
    }
    if (videoIsSelected() && (!video.videoWidth || !video.videoHeight)) return status("视频画面尚未读取完成，请稍后再试。", true);
    if (project.visualSource === "cover" && project.coverData && !coverImage) return status("封面还在载入，请稍后再试。", true);

    const state = { mode: "record", cancelled: false, jobId: "", controller: new AbortController(), uploadQueue: Promise.resolve() };
    state.cancelPromise = new Promise(resolve => { state.resolveCancel = resolve; });
    exportState = state;
    state.unlockControls = lockExportControls();
    el["cancel-export"].classList.remove("hidden");
    el["cancel-export"].textContent = "停止录制";
    mediaEl.pause();
    let canvasStream = null;
    let sourceStream = null;
    let recordingStream = null;
    let recorder = null;
    let stopRecording = null;
    let stopWatchingVisibility = null;
    try {
      canvasStream = canvas.captureStream(30);
      const createdPromise = exportApi("/api/recordings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration, filename: fileStem() })
      });
      state.jobReady = createdPromise.then(created => {
        state.jobId = created.id;
        return created.id;
      });
      stopWatchingVisibility = window.SongcutRecordingExport.watchRecordingVisibility(document, () => {
        if (state.cancelled || state.recordingError) return;
        window.SongcutRecordingExport.failRecording(
          state, mediaEl, recorder,
          new Error("实时录制时请保持制作台页面在前台；本次录制已中止。")
        );
        if (state.cancelPlayback) state.cancelPlayback();
        state.resolveCancel();
      });
      if (!window.SongcutRecordingExport.canStartRecording(document, state)) throw state.recordingError;
      currentTime = 0;
      drawPreview();
      const playback = window.SongcutRecordingExport.beginPlaybackFromStart(mediaEl, () => {
        if (!window.SongcutRecordingExport.canStartRecording(document, state)) {
          throw state.recordingError || new Error("实时录制时请保持制作台页面在前台；本次录制已中止。");
        }
        sourceStream = captureMedia.call(mediaEl);
        if (mediaKind === "audio" && !sourceStream.getAudioTracks().length) {
          throw new Error("浏览器没有提供音频轨道，请改用直接合成。");
        }
        const mimeType = window.SongcutRecordingExport.selectRecordingMimeType(
          MediaRecorder, sourceStream.getAudioTracks().length > 0
        );
        if (!mimeType) throw new Error("当前浏览器没有可用的 WebM 录制格式，请改用直接合成。");
        recordingStream = window.SongcutRecordingExport.combineRecordingStreams(canvasStream, sourceStream, MediaStream);
        recorder = new MediaRecorder(recordingStream, { mimeType, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000 });
        state.recorder = recorder;
        stopRecording = new Promise(resolve => {
          recorder.addEventListener("stop", resolve, { once: true });
          recorder.addEventListener("error", event => {
            window.SongcutRecordingExport.failRecording(
              state, mediaEl, recorder, event.error || new Error("浏览器录制失败")
            );
            resolve();
          }, { once: true });
        });
        recorder.addEventListener("dataavailable", event => {
          if (!event.data || !event.data.size || state.cancelled) return;
          state.uploadQueue = state.uploadQueue.then(async () => {
            const jobId = await state.jobReady;
            return exportApi("/api/recordings/" + jobId + "/chunk", {
              method: "POST", headers: { "Content-Type": "application/octet-stream" },
              body: event.data, signal: state.controller.signal
            });
          }).catch(error => {
            state.uploadError = error;
            window.SongcutRecordingExport.failRecording(state, mediaEl, recorder, error);
          });
        });
        if (!window.SongcutRecordingExport.canStartRecording(document, state)) {
          window.SongcutRecordingExport.failRecording(
            state, mediaEl, recorder,
            state.recordingError || new Error("实时录制时请保持制作台页面在前台；本次录制已中止。")
          );
          throw state.recordingError;
        }
        currentTime = mediaEl.currentTime;
        drawPreview();
        recorder.start(1000);
        state.recordingActive = true;
        status("正在实时录制 00:00 / " + formatTime(duration) + "；请保持页面打开……");
      });
      state.cancelPlayback = playback.cancel;
      await Promise.race([
        Promise.all([createdPromise, playback.ready]),
        state.cancelPromise
      ]);
      if (state.cancelled) throw new Error("录制已停止");
      if (state.recordingError) throw state.recordingError;
      let lastTime = mediaEl.currentTime;
      let stalledMs = 0;
      while (!mediaEl.ended && !state.cancelled) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (state.recordingError) throw state.recordingError;
        if (state.uploadError) throw state.uploadError;
        const now = mediaEl.currentTime;
        if (now > lastTime + 0.01) {
          lastTime = now;
          stalledMs = 0;
        } else if (mediaEl.paused) {
          throw new Error("播放中断，录制未完成。请重新开始，或改用直接合成。");
        } else {
          stalledMs += 500;
          if (stalledMs >= 15000) throw new Error("素材播放停滞超过 15 秒，录制已中止。");
        }
        status("正在实时录制 " + formatTime(now) + " / " + formatTime(duration) + "……");
      }
      if (state.cancelled) throw new Error("录制已停止");
      if (recorder.state !== "inactive") recorder.stop();
      await stopRecording;
      await state.uploadQueue;
      if (state.uploadError) throw state.uploadError;
      if (state.cancelled) throw new Error("录制已停止");
      await exportApi("/api/recordings/" + state.jobId + "/finish", { method: "POST", signal: state.controller.signal });
      while (!state.cancelled) {
        const result = await exportApi("/api/recordings/" + state.jobId + "/status", { signal: state.controller.signal });
        if (result.state === "done") break;
        if (result.state === "error") throw new Error(result.error || "录制结果转换失败");
        if (result.state === "cancelled") throw new Error("录制已停止");
        status("正在将录制结果转换为 MP4 " + Math.round(Math.max(0, Math.min(1, result.progress || 0)) * 100) + "%……");
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      if (state.cancelled) throw new Error("录制已停止");
      downloadExport("/api/recordings/" + state.jobId + "/download", state, fileStem() + "-歌词视频.mp4");
      status("实时录制已完成，MP4 正在下载。");
    } catch (error) {
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
        try { if (stopRecording) await stopRecording; } catch (_) { /* retain the original failure */ }
      }
      try { await state.uploadQueue; } catch (_) { /* cancelled or failed upload */ }
      if (state.jobReady && !state.jobId) {
        try { await state.jobReady; } catch (_) { /* no server job was created */ }
      }
      if (state.jobId) exportApi("/api/recordings/" + state.jobId + "/cancel", { method: "POST" }).catch(() => {});
      if (!state.cancelled) status("实时录制失败：" + (error?.message || String(error)), true);
      else status("实时录制已停止。");
    } finally {
      mediaEl.pause();
      state.recordingActive = false;
      if (stopWatchingVisibility) stopWatchingVisibility();
      [recordingStream, canvasStream, sourceStream].filter(Boolean).forEach(stream => stream.getTracks().forEach(track => track.stop()));
      if (state.unlockControls) state.unlockControls();
      exportState = null;
      el["cancel-export"].classList.add("hidden");
      el["cancel-export"].textContent = "停止合成";
      updateTransport();
      drawPreview();
    }
  }

  async function exportVideo() {
    if (exportState) return;
    if (el["export-mode"].value === "record") return exportRecordedVideo();
    const fastVideo = el["export-mode"].value === "video-direct";
    if (!mediaEl || !mediaFile) return status("请先导入音频或视频素材，再合成歌词视频。", true);
    if (fastVideo && !videoIsSelected()) {
      return status("视频直合 60 帧需要导入视频，并选择视频作为画面来源。", true);
    }
    const duration = mediaEl.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      return status("素材时长还未读取完成，请稍后再试。", true);
    }
    if (duration > 3600) return status("单次合成目前支持最长 60 分钟的素材。", true);
    if (videoIsSelected() && (!video.videoWidth || !video.videoHeight)) {
      return status("视频画面尚未读取完成，请稍后再试。", true);
    }
    if (project.visualSource === "cover" && project.coverData && !coverImage) {
      return status("封面还在载入，请稍后再试。", true);
    }
    const state = { cancelled: false, jobId: "", mode: fastVideo ? "video-direct" : "direct", controller: new AbortController() };
    const apiPrefix = fastVideo ? "/api/direct-video" : "/api/jobs";
    exportState = state;
    state.unlockControls = lockExportControls();
    el["cancel-export"].classList.remove("hidden");
    el["cancel-export"].textContent = "停止合成";
    mediaEl.pause();
    try {
      const availability = await exportApi("/api/status", { signal: state.controller.signal });
      if (!availability.available) throw new Error("本机找不到 FFmpeg，无法合成 MP4。请从启动脚本打开制作台。");
      const times = fastVideo ? null : frameTimes(duration, sortedLyrics().map(line => parseTime(line.time)), 5, project.lyricDisplay === "scroll");
      const cutVideoHole = videoIsSelected();
      const placement = cutVideoHole
        ? getVideoPlacement(video.videoWidth, video.videoHeight, coverFrame.size, project.videoTransform)
        : null;
      const created = await exportApi(apiPrefix, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration, ...(times ? { times } : {}), useVideo: cutVideoHole, placement, filename: fileStem(),
          project: { ...project, coverData: cutVideoHole ? "" : project.coverData }
        }),
        signal: state.controller.signal
      });
      state.jobId = created.id;
      status("正在送入原始素材……");
      await exportApi(apiPrefix + "/" + state.jobId + "/media", {
        method: "POST", headers: { "Content-Type": "application/octet-stream" },
        body: mediaFile, signal: state.controller.signal
      });
      await exportApi(apiPrefix + "/" + state.jobId + "/finish", {
        method: "POST", signal: state.controller.signal
      });
      while (!state.cancelled) {
        const result = await exportApi(apiPrefix + "/" + state.jobId + "/status", {
          signal: state.controller.signal
        });
        if (result.state === "done") break;
        if (result.state === "error") throw new Error(result.error || "FFmpeg 合成失败");
        if (result.state === "cancelled") throw new Error("合成已停止");
        const progress = Math.max(0, Math.min(1, result.progress || 0));
        if (fastVideo && result.state === "preparing-overlay") {
          status("正在准备主题画面与歌词……");
        } else if (fastVideo) {
          status("正在直合 60 帧 MP4 " + Math.round(progress * 100) + "%……");
        } else if (result.state === "drawing") {
          status("正在绘制画面 " + Math.round(progress * 200) + "%……");
        } else {
          status("正在合成 MP4 " + Math.round(Math.max(0, progress - 0.5) * 200) + "%……");
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (state.cancelled) throw new Error("合成已停止");
      downloadExport(apiPrefix + "/" + state.jobId + "/download", state, fileStem() + "-歌词视频.mp4");
      status(fastVideo ? "60 帧 MP4 已合成，正在下载。" : "MP4 已合成，正在下载。", false);
    } catch (error) {
      if (state.jobId && !state.cancelled) {
        exportApi(apiPrefix + "/" + state.jobId + "/cancel", { method: "POST" }).catch(() => {});
      }
      status(state.cancelled ? "合成已停止。" : "视频合成失败：" + (error?.message || String(error)), !state.cancelled);
    } finally {
      exportState = null;
      if (state.unlockControls) state.unlockControls();
      el["cancel-export"].classList.add("hidden");
      el["cancel-export"].textContent = "停止合成";
      updateTransport();
      drawPreview();
    }
  }

  function cancelExport() {
    if (!exportState) return;
    exportState.cancelled = true;
    if (exportState.resolveCancel) exportState.resolveCancel();
    if (exportState.cancelPlayback) exportState.cancelPlayback();
    exportState.controller.abort();
    if (exportState.jobId) {
      const prefix = exportState.mode === "record" ? "/api/recordings/" : exportState.mode === "video-direct" ? "/api/direct-video/" : "/api/jobs/";
      exportApi(prefix + exportState.jobId + "/cancel", { method: "POST" }).catch(() => {});
    }
    if (exportState.recorder && exportState.recorder.state !== "inactive") exportState.recorder.stop();
    if (mediaEl) mediaEl.pause();
    status(exportState.mode === "record" ? "正在停止录制……" : "正在停止合成……");
  }

  function drawCover(x, y, size) {
    ctx.fillStyle = "#172631";
    ctx.fillRect(x, y, size, size);
    const useVideo = videoIsSelected() && video.readyState >= 2;
    const source = useVideo ? video : coverImage;
    if (source) {
      const width = source.videoWidth || source.naturalWidth;
      const height = source.videoHeight || source.naturalHeight;
      if (width && height) {
        try {
          if (useVideo) {
            const placement = getVideoPlacement(width, height, size, project.videoTransform);
            ctx.save();
            try {
              ctx.beginPath();
              ctx.rect(x, y, size, size);
              ctx.clip();
              ctx.drawImage(source, x + placement.dx, y + placement.dy, placement.dw, placement.dh);
            } finally {
              ctx.restore();
            }
          } else {
            const scale = Math.max(size / width, size / height);
            const cropW = size / scale;
            const cropH = size / scale;
            ctx.drawImage(source, (width - cropW) / 2, (height - cropH) / 2, cropW, cropH, x, y, size, size);
          }
        } catch (_) {
          // A video can be between decoded frames; the fallback remains visible.
        }
      }
    } else {
      const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
      const palette = themeColors();
      gradient.addColorStop(0, palette.coverStart);
      gradient.addColorStop(0.55, palette.coverMiddle);
      gradient.addColorStop(1, palette.coverEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = palette.coverRing;
      ctx.lineWidth = 7;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x + size * .5, y + size * .55, size * (.16 + i * .14), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.font = "700 32px Georgia, serif";
      ctx.fillStyle = palette.coverText;
      ctx.textAlign = "center";
      ctx.fillText("COVER ART", x + size / 2, y + size / 2);
      ctx.textAlign = "left";
    }
    ctx.strokeStyle = themeColors().coverBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, size + 2, size + 2);
  }

  function fitText(value, maxWidth) {
    let text = String(value || "");
    while (text && ctx.measureText(text).width > maxWidth) text = text.slice(0, -1);
    return text === String(value || "") ? text : text + "…";
  }

  function drawPlayerBackdrop() {
    const source = videoIsSelected() && video.readyState >= 2 ? video : (!videoIsSelected() && coverImage ? coverImage : null);
    const sw = source && (source.videoWidth || source.naturalWidth);
    const sh = source && (source.videoHeight || source.naturalHeight);
    if (sw && sh) {
      const scale = Math.max(backdropCanvas.width / sw, backdropCanvas.height / sh);
      const cw = backdropCanvas.width / scale;
      const ch = backdropCanvas.height / scale;
      backdropCtx.fillStyle = "#54424f";
      backdropCtx.fillRect(0, 0, backdropCanvas.width, backdropCanvas.height);
      backdropCtx.save();
      backdropCtx.filter = "blur(10px) saturate(.75)";
      backdropCtx.drawImage(source, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, backdropCanvas.width, backdropCanvas.height);
      backdropCtx.restore();
      ctx.save();
      ctx.drawImage(backdropCanvas, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.fillStyle = "rgba(35,25,34,.62)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const wash = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      wash.addColorStop(0, "rgba(160,98,127,.42)");
      wash.addColorStop(.52, "rgba(63,48,62,.30)");
      wash.addColorStop(1, "rgba(28,33,42,.60)");
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const wash = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      wash.addColorStop(0, "#795367");
      wash.addColorStop(.52, "#61535d");
      wash.addColorStop(1, "#4d5557");
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const glow = ctx.createRadialGradient(430, 180, 5, 430, 180, 730);
      glow.addColorStop(0, "rgba(255,207,207,.38)");
      glow.addColorStop(1, "rgba(255,207,207,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawPlayerCanvas() {
    const W = canvas.width;
    const H = canvas.height;
    const palette = themeColors();
    drawPlayerBackdrop();
    ctx.fillStyle = "rgba(255,255,255,.025)";
    ctx.fillRect(0, 0, W, H);
    const art = { x: 94, y: 126, size: 560 };
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(art.x, art.y, art.size, art.size, 12);
    ctx.clip();
    ctx.fillStyle = "#3d303b";
    ctx.fillRect(art.x, art.y, art.size, art.size);
    ctx.translate(art.x, art.y);
    ctx.scale(art.size / coverFrame.size, art.size / coverFrame.size);
    drawCover(0, 0, coverFrame.size);
    ctx.restore();
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.32)";
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 18;
    ctx.strokeStyle = "rgba(255,255,255,.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(art.x, art.y, art.size, art.size, 12);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,.82)";
    ctx.font = "600 22px 'Microsoft YaHei',sans-serif";
    ctx.fillText(fitText(project.title || "未命名歌曲", 560), 96, 730);
    ctx.fillStyle = "rgba(255,255,255,.66)";
    ctx.font = "18px 'Microsoft YaHei',sans-serif";
    ctx.fillText(fitText(project.artist || "未填写主播", 360), 96, 762);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,.80)";
    ctx.font = "700 17px 'Microsoft YaHei',sans-serif";
    ctx.fillText(fitText(project.album || "歌回切片 / SIDE A", 260), 654, 762);
    ctx.textAlign = "left";
    ctx.fillStyle = palette.muted;
    ctx.font = timeFont(18);
    const total = mediaEl && Number.isFinite(mediaEl.duration) ? mediaEl.duration : project.duration;
    ctx.fillText(formatTime(currentTime), 96, 810);
    ctx.textAlign = "right";
    ctx.fillText("−" + formatTime(Math.max(0, total - currentTime)), 654, 810);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,.38)";
    ctx.fillRect(96, 820, 558, 3);
    ctx.fillStyle = "rgba(255,255,255,.96)";
    ctx.fillRect(96, 820, 558 * Math.min(1, currentTime / Math.max(total, 1)), 3);
    ctx.fillStyle = "rgba(255,255,255,.52)";
    ctx.font = "700 19px 'Microsoft YaHei',sans-serif";
    ctx.fillText("↻", 96, 872);
    ctx.fillRect(176, 850, 4, 22);
    ctx.beginPath(); ctx.moveTo(214, 849); ctx.lineTo(192, 860); ctx.lineTo(214, 871); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff8f4";
    ctx.beginPath();
    ctx.arc(360, 860, 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#403541";
    ctx.font = "700 21px 'Microsoft YaHei',sans-serif";
    ctx.textAlign = "center";
    if (mediaEl && !mediaEl.paused) {
      ctx.fillRect(352, 849, 6, 22); ctx.fillRect(363, 849, 6, 22);
    } else {
      ctx.beginPath(); ctx.moveTo(355, 848); ctx.lineTo(355, 872); ctx.lineTo(372, 860); ctx.closePath(); ctx.fill();
    }
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "700 28px 'Microsoft YaHei',sans-serif";
    ctx.fillRect(542, 850, 4, 22);
    ctx.beginPath(); ctx.moveTo(508, 849); ctx.lineTo(530, 860); ctx.lineTo(508, 871); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.fillRect(96, 950, 558, 4);
    ctx.fillStyle = "rgba(255,255,255,.93)";
    ctx.fillRect(96, 950, 558 * Math.min(1, currentTime / Math.max(total, 1)), 4);
    ctx.beginPath();
    ctx.arc(96 + 558 * Math.min(1, currentTime / Math.max(total, 1)), 952, 8, 0, Math.PI * 2);
    ctx.fill();

    const lines = sortedLyrics();
    const selected = activeIndex(lines, currentTime);
    let center = selected;
    if (project.lyricDisplay === "scroll" && lines.length) center = scrollCenterIndex(lines, currentTime);
    const activeProgress = project.lyricDisplay === "scroll" && selected > 0
      ? Math.max(0, Math.min(1, center - selected + 1))
      : 1;
    const base = project.lyricDisplay === "scroll" ? Math.floor(center) : selected;
    const frac = project.lyricDisplay === "scroll" ? center - base : 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(735, 0, W - 735, H);
    ctx.clip();
    if (!lines.length) {
      ctx.fillStyle = palette.empty;
      ctx.font = "34px 'Microsoft YaHei',sans-serif";
      ctx.fillText("导入歌词后，会在这里逐句浮现", 810, 520);
    } else {
      for (let offset = -3; offset <= 3; offset++) {
        const index = base + offset;
        if (index < 0 || index >= lines.length) continue;
        const line = lines[index];
        const y = 520 + (offset - frac) * 148;
        const distance = Math.abs(offset - frac);
        const alpha = Math.max(.13, 1 - distance * .25);
        const blur = Math.min(5, distance * 1.35);
        const active = index === selected;
        ctx.globalAlpha = active ? activeProgress : alpha;
        ctx.filter = active ? "none" : `blur(${blur}px)`;
        ctx.fillStyle = active ? palette.activeText : palette.idleText;
        ctx.font = `${active ? "700 " : "600 "}${active ? 39 : 33}px 'Microsoft YaHei','Noto Sans CJK SC',sans-serif`;
        ctx.fillText(fitText(line.text || "（空白歌词）", 950), 810, y);
        if (line.translation) {
          ctx.fillStyle = active ? palette.activeTranslation : palette.idleTranslation;
          ctx.font = `${active ? 21 : 18}px 'Microsoft YaHei','Noto Sans CJK SC',sans-serif`;
          ctx.fillText(fitText(line.translation, 950), 812, y + 38);
        }
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.filter = "none";
    ctx.fillStyle = "rgba(255,255,255,.76)";
    ctx.font = "600 14px 'Microsoft YaHei',sans-serif";
    ctx.fillText(fitText(project.footer || "", 520), 96, 1030);
  }

  function drawVinylCanvas() {
    const W = canvas.width;
    const H = canvas.height;
    vinylTheme.drawBackground(ctx, project, vinylBackgroundImage, W, H);
    vinylTheme.drawRecord(ctx, () => {
      ctx.save();
      ctx.translate(vinylTheme.LABEL.x, vinylTheme.LABEL.y);
      ctx.scale(vinylTheme.LABEL.size / coverFrame.size, vinylTheme.LABEL.size / coverFrame.size);
      if (videoIsSelected() || coverImage) {
        drawCover(0, 0, coverFrame.size);
      } else {
        const blank = ctx.createLinearGradient(0, 0, 643, 643);
        blank.addColorStop(0, "#203861"); blank.addColorStop(.55, "#a85d53"); blank.addColorStop(1, "#e4c49c");
        ctx.fillStyle = blank; ctx.fillRect(0, 0, 643, 643);
        ctx.strokeStyle = "rgba(255,244,224,.6)"; ctx.lineWidth = 8;
        for (let radius = 95; radius <= 260; radius += 50) {
          ctx.beginPath(); ctx.arc(322, 322, radius, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.restore();
    }, vinylTheme.rotationAngle(currentTime, project.vinylSecondsPerTurn));

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,250,244,.94)";
    ctx.font = "700 48px 'Microsoft YaHei',sans-serif";
    ctx.fillText(fitText(project.title || "未命名歌曲", 670), 1055, 170);
    ctx.fillStyle = "rgba(221,233,250,.77)";
    ctx.font = "25px 'Microsoft YaHei',sans-serif";
    ctx.fillText(fitText(project.artist || "未填写主播", 665), 1058, 220);
    ctx.fillStyle = "rgba(217,231,249,.57)";
    ctx.font = "20px 'Microsoft YaHei',sans-serif";
    ctx.fillText(fitText(project.album || "歌回切片", 670), 1058, 258);

    const lines = sortedLyrics();
    const selected = Math.max(0, activeIndex(lines, currentTime));
    const center = project.lyricDisplay === "scroll" ? scrollCenterIndex(lines, currentTime) : selected;
    const first = Math.floor(center);
    const fraction = center - first;
    ctx.save();
    ctx.beginPath();
    ctx.rect(1030, 296, 730, 520);
    ctx.clip();
    if (!lines.length) {
      ctx.fillStyle = "rgba(236,243,255,.74)";
      ctx.font = "30px 'Microsoft YaHei',sans-serif";
      ctx.fillText("导入歌词后，会在这里逐句浮现", 1058, 557);
    } else {
      for (let offset = -3; offset <= 3; offset++) {
        const index = first + offset;
        if (index < 0 || index >= lines.length) continue;
        const line = lines[index];
        const y = 555 + (offset - fraction) * 88;
        const active = index === selected;
        const edge = Math.max(0, Math.min(1, (y - 300) / 85, (817 - y) / 85));
        const entering = active && project.lyricDisplay === "scroll" && selected > 0
          ? Math.max(0, Math.min(1, center - selected + 1)) : 1;
        ctx.globalAlpha = edge * (active ? entering : Math.max(.16, .52 - Math.abs(index - center) * .1));
        ctx.fillStyle = active ? "#fffaf4" : "#d1dded";
        ctx.font = (active ? "700 36px " : "500 29px ") + "'Microsoft YaHei',sans-serif";
        ctx.fillText(fitText(line.text || "（空白歌词）", 650), 1058, y);
        if (line.translation) {
          ctx.fillStyle = active ? "#f0e3cf" : "#b9cbe1";
          ctx.font = "20px 'Microsoft YaHei',sans-serif";
          ctx.fillText(fitText(line.translation, 650), 1060, y + 30);
        }
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    const total = mediaEl && Number.isFinite(mediaEl.duration) ? mediaEl.duration : project.duration;
    const progress = Math.min(1, currentTime / Math.max(total, 1));
    ctx.fillStyle = "rgba(244,249,255,.40)";
    ctx.fillRect(110, 946, 1700, 3);
    ctx.fillStyle = "#f2d99f";
    ctx.fillRect(110, 946, 1700 * progress, 3);
    ctx.beginPath(); ctx.arc(110 + 1700 * progress, 947, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(238,246,255,.83)";
    ctx.font = timeFont(20);
    ctx.textAlign = "left"; ctx.fillText(formatTime(currentTime), 110, 922);
    ctx.textAlign = "right"; ctx.fillText(formatTime(total), 1810, 922);

    ctx.fillStyle = "rgba(255,250,244,.9)";
    ctx.beginPath(); ctx.moveTo(876, 994); ctx.lineTo(854, 1008); ctx.lineTo(876, 1022); ctx.closePath(); ctx.fill();
    ctx.fillRect(850, 995, 4, 27);
    ctx.beginPath(); ctx.arc(960, 1008, 33, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#223657";
    if (mediaEl && !mediaEl.paused) {
      ctx.beginPath(); ctx.roundRect(951, 993, 7, 30, 3.5); ctx.fill();
      ctx.beginPath(); ctx.roundRect(963, 993, 7, 30, 3.5); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(954, 993); ctx.quadraticCurveTo(954, 990, 957, 992);
      ctx.lineTo(973, 1005); ctx.quadraticCurveTo(977, 1008, 973, 1011);
      ctx.lineTo(957, 1024); ctx.quadraticCurveTo(954, 1026, 954, 1023); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "rgba(255,250,244,.9)";
    ctx.beginPath(); ctx.moveTo(1044, 994); ctx.lineTo(1066, 1008); ctx.lineTo(1044, 1022); ctx.closePath(); ctx.fill();
    ctx.fillRect(1067, 995, 4, 27);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(238,246,255,.58)";
    ctx.font = "18px 'Microsoft YaHei',sans-serif";
    ctx.fillText(fitText(project.footer || "", 500), 110, 1022);
  }

  function drawPreview() {
    const W = canvas.width;
    const H = canvas.height;
    const palette = themeColors();
    if (project.theme === "flow-player") {
      drawPlayerCanvas();
      return;
    }
    if (project.theme === "vinyl-player") {
      drawVinylCanvas();
      return;
    }
    if (project.theme === "rainy-night") {
      const night = ctx.createLinearGradient(0, 0, W, H);
      night.addColorStop(0, "#1b385a");
      night.addColorStop(.52, "#23466e");
      night.addColorStop(1, "#142e4d");
      ctx.fillStyle = night;
    } else {
      ctx.fillStyle = palette.canvas;
    }
    ctx.fillRect(0, 0, W, H);
    if (project.theme === "rainy-night") {
      let glow = ctx.createRadialGradient(1330, 475, 25, 1330, 475, 690);
      glow.addColorStop(0, "rgba(91,172,230,.23)");
      glow.addColorStop(1, "rgba(66,155,227,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(790, 0, W - 790, H);
      glow = ctx.createRadialGradient(285, 235, 10, 285, 235, 600);
      glow.addColorStop(0, "rgba(93,194,239,.17)");
      glow.addColorStop(1, "rgba(70,190,244,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 800, H);
    }
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.fillStyle = palette.panel;
    ctx.fillRect(54, 48, W - 108, H - 96);
    ctx.strokeStyle = palette.panelLine;
    ctx.beginPath(); ctx.moveTo(790, 48); ctx.lineTo(790, H - 48); ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = palette.heading;
    ctx.font = "700 27px 'Microsoft YaHei', sans-serif";
    ctx.fillText("NOW PLAYING", 92, 112);
    ctx.textAlign = "right";
    ctx.fillText("TRACK 01", 735, 112);
    ctx.textAlign = "left";
    drawCover(coverFrame.x, coverFrame.y, coverFrame.size);

    ctx.fillStyle = palette.album;
    ctx.font = "700 23px 'Microsoft YaHei', sans-serif";
    ctx.fillText(fitText(project.album || "歌回切片", 643), 92, 836);
    ctx.fillStyle = palette.title;
    ctx.font = "700 64px 'Noto Serif CJK SC','Songti SC',Georgia,serif";
    ctx.fillText(fitText(project.title || "未命名歌曲", 643), 92, 910);
    ctx.fillStyle = palette.artist;
    ctx.font = "32px 'Microsoft YaHei',sans-serif";
    ctx.fillText(fitText(project.artist || "未填写主播", 643), 92, 958);
    ctx.fillStyle = palette.tags;
    ctx.font = "22px 'Microsoft YaHei',sans-serif";
    ctx.fillText(fitText(project.tags || "", 643), 92, 994);
    ctx.fillStyle = palette.transport;
    ctx.font = "700 24px Georgia,serif";
    ctx.fillText("◁  " + (mediaEl && !mediaEl.paused ? "Ⅱ" : "▶") + "  ▷", 92, 1031);
    ctx.fillStyle = palette.muted;
    ctx.font = timeFont(22);
    const total = mediaEl && Number.isFinite(mediaEl.duration) ? mediaEl.duration : project.duration;
    ctx.fillText(formatTime(currentTime) + " / " + formatTime(total), 284, 1031);
    ctx.fillStyle = palette.progressBase;
    ctx.fillRect(92, 1044, 643, 4);
    ctx.fillStyle = palette.progress;
    ctx.fillRect(92, 1044, 643 * Math.min(1, currentTime / Math.max(total, 1)), 4);

    ctx.fillStyle = palette.eyebrow;
    ctx.font = "700 21px Georgia,serif";
    ctx.fillText(project.lyricDisplay === "scroll" ? "LYRIC SCROLL" : "LYRIC CHRONOLOGY", 842, 105);
    ctx.fillStyle = palette.secondary;
    ctx.font = "700 52px 'Noto Serif CJK SC','Songti SC',Georgia,serif";
    ctx.fillText(project.lyricDisplay === "scroll" ? "歌词滚动" : "歌词时间线", 842, 170);
    const lines = sortedLyrics();
    ctx.textAlign = "right";
    ctx.fillStyle = palette.muted;
    ctx.font = "700 25px Georgia,serif";
    ctx.fillText(lines.length + " LINES", 1810, 169);
    ctx.textAlign = "left";
    ctx.strokeStyle = palette.line;
    ctx.beginPath(); ctx.moveTo(842, 196); ctx.lineTo(1810, 196); ctx.stroke();

    if (!lines.length) {
      ctx.fillStyle = palette.empty;
      ctx.font = "30px 'Microsoft YaHei',sans-serif";
      ctx.fillText("歌词会按照时间出现在这里", 842, 284);
    } else if (project.lyricDisplay === "scroll") {
      drawScrollingLyrics(lines);
    } else {
      const selected = activeIndex(lines, currentTime);
      const start = Math.max(0, Math.min(lines.length - 8, selected - 3));
      const shown = lines.slice(start, start + 8);
      shown.forEach((line, index) => {
        const y = 240 + index * 88;
        const isActive = start + index === selected;
        if (isActive) {
          ctx.fillStyle = palette.activeBackground;
          ctx.fillRect(830, y - 27, 994, 76);
          ctx.fillStyle = palette.activeAccent;
          ctx.fillRect(830, y - 27, 5, 76);
        }
        ctx.fillStyle = isActive ? palette.activeTime : palette.idleTime;
        ctx.font = timeFont(21);
        ctx.fillText(formatTime(parseTime(line.time)), 850, y + 5);
        ctx.fillStyle = isActive ? palette.activeText : palette.idleText;
        ctx.font = (isActive ? "700 " : "400 ") + "30px 'Microsoft YaHei',sans-serif";
        ctx.fillText(fitText(line.text || "（空白歌词）", 750), 1000, y + 3);
        if (line.translation) {
          ctx.fillStyle = isActive ? palette.activeTranslation : palette.idleTranslation;
          ctx.font = "20px Georgia,'Microsoft YaHei',serif";
          ctx.fillText(fitText(line.translation, 760), 1000, y + 32);
        }
        ctx.strokeStyle = palette.lyricLine;
        ctx.beginPath(); ctx.moveTo(842, y + 55); ctx.lineTo(1810, y + 55); ctx.stroke();
      });
    }
    ctx.strokeStyle = palette.line;
    ctx.beginPath(); ctx.moveTo(842, 1000); ctx.lineTo(1810, 1000); ctx.stroke();
    ctx.fillStyle = palette.muted;
    ctx.font = "700 23px 'Microsoft YaHei',sans-serif";
    ctx.fillText(fitText(project.description || project.album || "", 630), 842, 1038);
    ctx.textAlign = "right";
    ctx.font = "700 20px Georgia,serif";
    ctx.fillText(fitText(project.footer || "", 320), 1810, 1038);
    ctx.textAlign = "left";
  }

  function animationLoop() {
    if (mediaEl === video && !video.paused && typeof video.requestVideoFrameCallback === "function") {
      scheduleVideoFrameDraw();
    } else if (mediaEl && !mediaEl.paused) {
      currentTime = mediaEl.currentTime;
      updateTransport();
      drawPreview();
    }
    requestAnimationFrame(animationLoop);
  }

  function bindMetadata() {
    const pairs = [
      ["song-title", "title"], ["song-artist", "artist"], ["song-album", "album"],
      ["song-tags", "tags"], ["song-footer", "footer"], ["song-description", "description"]
    ];
    pairs.forEach(([id, key]) => {
      el[id].addEventListener("input", () => {
        project[key] = el[id].value;
        saveDraft();
        drawPreview();
      });
    });
    el["song-duration"].addEventListener("change", () => {
      const duration = parseTime(el["song-duration"].value);
      if (duration > 0) {
        project.duration = duration;
        saveDraft();
        updateTransport();
        drawPreview();
      } else {
        el["song-duration"].value = formatTime(project.duration);
      }
    });
  }

  function bindMedia() {
    const importMedia = (file, kind) => {
      if (!file) return;
      const replacingMedia = !!mediaURL;
      if (mediaEl === video) cancelVideoFrameDraw();
      if (mediaEl) mediaEl.pause();
      if (mediaURL) URL.revokeObjectURL(mediaURL);
      mediaKind = kind;
      mediaFile = file;
      if (replacingMedia) project.videoTransform = { x: 0, y: 0, scale: 1 };
      if (mediaKind === "audio" || replacingMedia || !project.coverData) {
        project.visualSource = mediaKind === "video" ? "video" : "cover";
      }
      el["export-mode"].value = mediaKind === "video" && project.visualSource === "video" ? "video-direct" : "direct";
      mediaEl = mediaKind === "video" ? video : audio;
      mediaURL = URL.createObjectURL(file);
      mediaEl.src = mediaURL;
      mediaEl.load();
      if (kind === "video") sampleVinylBackground(mediaURL);
      else {
        vinylSampleToken++;
        vinylPaletteStatus = "未导入视频时使用内置深蓝渐变。";
        updateVinylBackgroundControls();
      }
      el["media-name"].textContent = kind === "audio" ? file.name : "MP3、WAV 等格式";
      el["video-name"].textContent = kind === "video" ? file.name : "MP4、WebM 等格式";
      updateVisualControls();
      saveDraft();
      drawPreview();
      status("已载入本地素材：" + file.name);
    };
    el["media-input"].addEventListener("change", () => importMedia(el["media-input"].files?.[0], "audio"));
    el["video-input"].addEventListener("change", () => importMedia(el["video-input"].files?.[0], "video"));
    [audio, video].forEach(element => {
      element.addEventListener("loadedmetadata", () => {
        if (element !== mediaEl) return;
        if (Number.isFinite(element.duration) && element.duration > 0) {
          project.duration = element.duration;
          el["song-duration"].value = formatTime(element.duration);
          saveDraft();
        }
        currentTime = 0;
        if (element === video) applyVideoTransform(project.videoTransform);
        updateTransport();
        drawPreview();
      });
      element.addEventListener("loadeddata", () => {
        if (element === mediaEl) drawPreview();
      });
      element.addEventListener("timeupdate", onTimeChange);
      element.addEventListener("seeked", () => {
        if (element !== mediaEl) return;
        currentTime = element.currentTime;
        updateTransport();
        drawPreview();
      });
      element.addEventListener("play", () => onMediaPlay(element));
      element.addEventListener("pause", () => onMediaPause(element));
      element.addEventListener("ended", () => onMediaPause(element));
    });
    el["cover-input"].addEventListener("change", () => {
      const file = el["cover-input"].files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        project.coverData = String(reader.result || "");
        project.visualSource = "cover";
        loadCoverData(project.coverData);
        el["cover-name"].textContent = file.name;
        saveDraft();
      };
      reader.onerror = () => status("封面读取失败。", true);
      reader.readAsDataURL(file);
    });
  }

  function bindVideoFraming() {
    el["visual-source-video"].addEventListener("click", () => {
      if (mediaKind !== "video") return;
      project.visualSource = "video";
      updateVisualControls();
      drawPreview();
      saveDraft();
    });
    el["visual-source-cover"].addEventListener("click", () => {
      if (!project.coverData) return;
      project.visualSource = "cover";
      updateVisualControls();
      drawPreview();
      saveDraft();
    });
    el["remove-cover"].addEventListener("click", () => {
      project.coverData = "";
      project.visualSource = "video";
      el["cover-input"].value = "";
      loadCoverData("");
      drawPreview();
      saveDraft();
    });
    el["video-zoom"].addEventListener("input", () => {
      if (!videoIsSelected()) return;
      applyVideoTransform({ ...project.videoTransform, scale: Number(el["video-zoom"].value) });
      saveDraft();
    });
    el["video-reset"].addEventListener("click", () => {
      if (!videoIsSelected()) return;
      applyVideoTransform({ x: 0, y: 0, scale: 1 });
      saveDraft();
    });

    const canvasPoint = event => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * canvas.width / rect.width,
        y: (event.clientY - rect.top) * canvas.height / rect.height
      };
    };
    const activeFrame = () => project.theme === "flow-player"
      ? { x: 94, y: 126, size: 560 }
      : project.theme === "vinyl-player" ? vinylTheme.LABEL : coverFrame;
    const insideCover = point => {
      const frame = activeFrame();
      if (project.theme === "vinyl-player") {
        return Math.hypot(point.x - frame.cx, point.y - frame.cy) <= frame.radius;
      }
      return point.x >= frame.x && point.x <= frame.x + frame.size &&
        point.y >= frame.y && point.y <= frame.y + frame.size;
    };
    canvas.addEventListener("pointerdown", event => {
      if (exportState) return;
      if (!videoIsSelected() || !insideCover(canvasPoint(event))) return;
      const point = canvasPoint(event);
      const frame = activeFrame();
      videoDrag = {
        id: event.pointerId, startX: point.x, startY: point.y,
        originX: project.videoTransform.x, originY: project.videoTransform.y,
        scale: project.videoTransform.scale, frameSize: frame.size,
        angle: project.theme === "vinyl-player"
          ? vinylTheme.rotationAngle(currentTime, project.vinylSecondsPerTurn) : 0
      };
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("is-panning");
      event.preventDefault();
    });
    canvas.addEventListener("pointermove", event => {
      if (exportState) {
        videoDrag = null;
        canvas.classList.remove("is-panning");
        return;
      }
      if (!videoDrag || videoDrag.id !== event.pointerId) return;
      const point = canvasPoint(event);
      const screenX = (point.x - videoDrag.startX) / videoDrag.frameSize;
      const screenY = (point.y - videoDrag.startY) / videoDrag.frameSize;
      const angle = videoDrag.angle;
      const localX = screenX * Math.cos(angle) + screenY * Math.sin(angle);
      const localY = -screenX * Math.sin(angle) + screenY * Math.cos(angle);
      applyVideoTransform({
        x: videoDrag.originX + localX,
        y: videoDrag.originY + localY,
        scale: videoDrag.scale
      });
    });
    const finishDrag = event => {
      if (!videoDrag || videoDrag.id !== event.pointerId) return;
      videoDrag = null;
      canvas.classList.remove("is-panning");
      saveDraft();
    };
    canvas.addEventListener("pointerup", finishDrag);
    canvas.addEventListener("pointercancel", finishDrag);
    canvas.addEventListener("wheel", event => {
      if (exportState) return;
      if (!videoIsSelected() || !insideCover(canvasPoint(event))) return;
      event.preventDefault();
      const scale = project.videoTransform.scale * Math.exp(-event.deltaY * 0.001);
      applyVideoTransform({ ...project.videoTransform, scale });
      saveDraft();
    }, { passive: false });
  }

  function bindVinylBackground() {
    el["vinyl-speed"].addEventListener("input", () => {
      project.vinylSecondsPerTurn = vinylTheme.normalizeSecondsPerTurn(el["vinyl-speed"].value);
      el["vinyl-speed-value"].textContent = `${project.vinylSecondsPerTurn} 秒/圈`;
      drawPreview();
    });
    el["vinyl-speed"].addEventListener("change", saveDraft);
    el["vinyl-bg-video"].addEventListener("click", () => {
      project.vinylBackgroundMode = "video-color";
      updateVinylBackgroundControls();
      saveDraft();
      drawPreview();
    });
    el["vinyl-bg-image"].addEventListener("click", () => {
      project.vinylBackgroundMode = "custom-image";
      updateVinylBackgroundControls();
      saveDraft();
      drawPreview();
    });
    el["vinyl-bg-input"].addEventListener("change", async () => {
      const file = el["vinyl-bg-input"].files?.[0];
      if (!file) return;
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 20_000_000) {
        return status("请导入 20 MB 以内的 PNG、JPG 或 WebP 背景图片。", true);
      }
      let bitmap = null;
      try {
        bitmap = await createImageBitmap(file);
        const prepared = document.createElement("canvas");
        prepared.width = 1920; prepared.height = 1080;
        const target = prepared.getContext("2d", { alpha: false });
        const scale = Math.max(1920 / bitmap.width, 1080 / bitmap.height);
        const cropW = 1920 / scale, cropH = 1080 / scale;
        target.drawImage(bitmap, (bitmap.width - cropW) / 2, (bitmap.height - cropH) / 2,
          cropW, cropH, 0, 0, 1920, 1080);
        project.vinylBackgroundData = prepared.toDataURL("image/jpeg", .86);
        project.vinylBackgroundMode = "custom-image";
        loadVinylBackgroundData(project.vinylBackgroundData);
        updateVinylBackgroundControls();
        saveDraft();
        status("已导入黑胶主题背景图片。");
      } catch (_) {
        status("背景图片读取失败，已保留原来的背景。", true);
      } finally {
        if (bitmap) bitmap.close();
        el["vinyl-bg-input"].value = "";
      }
    });
    el["vinyl-bg-remove"].addEventListener("click", () => {
      project.vinylBackgroundData = "";
      project.vinylBackgroundMode = "video-color";
      loadVinylBackgroundData("");
      updateVinylBackgroundControls();
      saveDraft();
    });
  }

  function bindControls() {
    el["clear-lyrics"].addEventListener("click", clearLyrics);
    el["apply-lyric-offset"].addEventListener("click", applyLyricOffset);
    el["theme-paper"].addEventListener("click", () => {
      project.theme = "paper";
      updateThemeControls();
      saveDraft();
      drawPreview();
    });
    el["theme-rainy"].addEventListener("click", () => {
      project.theme = "rainy-night";
      updateThemeControls();
      saveDraft();
      drawPreview();
    });
    el["theme-player"].addEventListener("click", () => {
      project.theme = "flow-player";
      updateThemeControls();
      saveDraft();
      drawPreview();
    });
    el["theme-vinyl"].addEventListener("click", () => {
      project.theme = "vinyl-player";
      updateThemeControls();
      saveDraft();
      drawPreview();
    });
    el["lyric-style-timeline"].addEventListener("click", () => {
      project.lyricDisplay = "timeline";
      updateLyricDisplayButtons();
      saveDraft();
      drawPreview();
    });
    el["lyric-style-scroll"].addEventListener("click", () => {
      project.lyricDisplay = "scroll";
      updateLyricDisplayButtons();
      saveDraft();
      drawPreview();
    });
    el["play-toggle"].addEventListener("click", async () => {
      if (!mediaEl) return status("先导入一段音频或视频，才能播放。", true);
      if (!mediaEl.paused) mediaEl.pause();
      else {
        try {
          await mediaEl.play();
        } catch (error) {
          status("无法播放素材：" + (error?.message || String(error)), true);
        }
      }
      updateTransport();
    });
    el.seek.addEventListener("input", () => setCurrentTime(Number(el.seek.value)));
    el["prev-line"].addEventListener("click", () => {
      const times = sortedLyrics().map(line => parseTime(line.time));
      const earlier = times.filter(time => time < currentTime - .5);
      setCurrentTime(earlier.length ? earlier[earlier.length - 1] : 0);
    });
    el["next-line"].addEventListener("click", () => {
      const next = sortedLyrics().find(line => parseTime(line.time) > currentTime + .1);
      setCurrentTime(next ? parseTime(next.time) : project.duration);
    });
    el["add-line"].addEventListener("click", addLine);
    el["lrc-import"].addEventListener("click", importLrc);
    el["lyrics-file-input"].addEventListener("change", importLyricFile);
    el["project-save"].addEventListener("click", saveJson);
    el["export-png"].addEventListener("click", exportPng);
    el["export-video"].addEventListener("click", exportVideo);
    el["cancel-export"].addEventListener("click", cancelExport);
    el["project-import"].addEventListener("change", () => {
      const file = el["project-import"].files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          project = normalizeProject(JSON.parse(String(reader.result)));
          loadCoverData(project.coverData);
          loadVinylBackgroundData(project.vinylBackgroundData);
          updateThemeControls();
          updateVisualControls();
          updateLyricDisplayButtons();
          updateMetadataFields();
          renderLyricEditor();
          drawPreview();
          saveDraft();
          status("项目已导入。请重新选择歌曲文件。");
        } catch (_) {
          status("JSON 文件格式不正确。", true);
        }
      };
      reader.readAsText(file);
      el["project-import"].value = "";
    });
  }

  bindMetadata();
  bindMedia();
  bindVideoFraming();
  bindVinylBackground();
  bindControls();
  loadCoverData(project.coverData);
  loadVinylBackgroundData(project.vinylBackgroundData);
  updateThemeControls();
  updateVisualControls();
  updateLyricDisplayButtons();
  updateMetadataFields();
  renderLyricEditor();
  drawPreview();
  requestAnimationFrame(animationLoop);
})();
