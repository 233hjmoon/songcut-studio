(function (root) {
  "use strict";

  const DEFAULT_GRADIENT = ["#102553", "#183d79", "#5b71bd"];
  const LABEL = Object.freeze({ x: 400, y: 360, size: 300, cx: 550, cy: 510, radius: 150 });

  function normalizeSecondsPerTurn(value) {
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds > 0 ? Math.min(80, Math.max(5, seconds)) : 40;
  }

  function rotationAngle(seconds, secondsPerTurn) {
    const period = normalizeSecondsPerTurn(secondsPerTurn);
    return ((Math.max(0, Number(seconds) || 0) % period) / period) * Math.PI * 2;
  }

  function rgbHex(channels) {
    return "#" + channels.map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("");
  }

  function normalizeGradientColors(value) {
    return Array.isArray(value) && value.length === 3 && value.every(color => /^#[0-9a-f]{6}$/i.test(color))
      ? value.map(color => color.toLowerCase())
      : [...DEFAULT_GRADIENT];
  }

  function gradientColorsFromPixels(pixels) {
    const sum = [0, 0, 0];
    let count = 0;
    for (let index = 0; index + 3 < pixels.length; index += 4) {
      const red = pixels[index], green = pixels[index + 1], blue = pixels[index + 2];
      const light = (red + green + blue) / 3;
      if (pixels[index + 3] < 180 || light < 12 || light > 244) continue;
      sum[0] += red; sum[1] += green; sum[2] += blue;
      count++;
    }
    if (!count) return [...DEFAULT_GRADIENT];
    const average = sum.map(value => value / count);
    const mix = (base, amount) => rgbHex(average.map((value, index) =>
      Math.min(175, value * (1 - amount) + base[index] * amount)));
    return [mix([6, 13, 32], .72), mix([15, 32, 66], .42), mix([47, 66, 111], .22)];
  }

  function waitFor(element, eventName, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error("视频取色超时")); }, timeout);
      const success = () => { cleanup(); resolve(); };
      const failure = () => { cleanup(); reject(new Error("视频画面无法读取")); };
      const cleanup = () => {
        clearTimeout(timer);
        element.removeEventListener(eventName, success);
        element.removeEventListener("error", failure);
      };
      element.addEventListener(eventName, success, { once: true });
      element.addEventListener("error", failure, { once: true });
    });
  }

  async function sampleGradientFromVideo(sourceURL) {
    const probe = document.createElement("video");
    probe.muted = true;
    probe.preload = "auto";
    probe.playsInline = true;
    try {
      const metadata = waitFor(probe, "loadedmetadata");
      probe.src = sourceURL;
      await metadata;
      const duration = probe.duration;
      const target = Number.isFinite(duration) && duration > .2 ? Math.min(duration - .05, duration * .5) : 0;
      if (target > 0) {
        const seeked = waitFor(probe, "seeked");
        probe.currentTime = target;
        await seeked;
      } else if (probe.readyState < 2) {
        await waitFor(probe, "loadeddata");
      }
      const sample = document.createElement("canvas");
      sample.width = 32;
      sample.height = 18;
      const sampleContext = sample.getContext("2d", { willReadFrequently: true });
      sampleContext.drawImage(probe, 0, 0, 32, 18);
      return gradientColorsFromPixels(sampleContext.getImageData(0, 0, 32, 18).data);
    } finally {
      probe.removeAttribute("src");
      probe.load();
    }
  }

  function drawBackground(ctx, project, image, width, height) {
    if (project.vinylBackgroundMode === "custom-image" && image) {
      const iw = image.naturalWidth, ih = image.naturalHeight;
      const scale = Math.max(width / iw, height / ih);
      const cropW = width / scale, cropH = height / scale;
      ctx.drawImage(image, (iw - cropW) / 2, (ih - cropH) / 2, cropW, cropH, 0, 0, width, height);
      ctx.fillStyle = "rgba(5,13,29,.23)";
      ctx.fillRect(0, 0, width, height);
      return;
    }
    const colors = normalizeGradientColors(project.vinylBackgroundColors);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(.56, colors[1]);
    gradient.addColorStop(1, colors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawRecord(ctx, drawCenterArt, angle = 0) {
    const { cx, cy, radius } = LABEL;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.48)";
    ctx.shadowBlur = 42;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = "#0d111a";
    ctx.beginPath(); ctx.arc(cx, cy, 256, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
    const sheen = ctx.createLinearGradient(cx - 210, cy - 230, cx + 215, cy + 230);
    sheen.addColorStop(0, "#0b0d12"); sheen.addColorStop(.25, "#1c2638");
    sheen.addColorStop(.48, "#080a10"); sheen.addColorStop(.72, "#263a62"); sheen.addColorStop(1, "#090b10");
    ctx.fillStyle = sheen;
    ctx.beginPath(); ctx.arc(cx, cy, 247, 0, Math.PI * 2); ctx.fill();
    for (let ring = 0; ring < 47; ring++) {
      const groove = 166 + ring * 1.62;
      ctx.strokeStyle = ring % 4 === 0 ? "rgba(180,196,223,.10)" : "rgba(0,0,0,.19)";
      ctx.lineWidth = ring % 5 === 0 ? 1.4 : .6;
      ctx.beginPath(); ctx.arc(cx, cy, groove, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
    drawCenterArt();
    ctx.restore();
    ctx.strokeStyle = "rgba(241,230,208,.72)";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.strokeStyle = "#e7e9ed";
    ctx.lineWidth = 17;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(448, 185); ctx.lineTo(610, 300); ctx.lineTo(735, 327); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#dce1e9";
    ctx.beginPath(); ctx.arc(448, 185, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1c2536";
    ctx.beginPath(); ctx.arc(448, 185, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f6f7f8";
    ctx.fillRect(728, 314, 40, 27);
  }

  const api = { DEFAULT_GRADIENT, LABEL, normalizeGradientColors, gradientColorsFromPixels,
    normalizeSecondsPerTurn, rotationAngle,
    sampleGradientFromVideo, drawBackground, drawRecord };
  root.SongcutVinylTheme = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
