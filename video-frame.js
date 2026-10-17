// Positions a video inside the square artwork frame without exposing empty edges.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SongcutVideoFrame = api;
})(typeof window !== "undefined" ? window : null, function () {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getVideoPlacement(width, height, size, transform = {}) {
    const rawScale = Number(transform.scale);
    const scale = Number.isFinite(rawScale) ? clamp(rawScale, 1, 3) : 1;
    const base = Math.max(size / width, size / height);
    const dw = width * base * scale;
    const dh = height * base * scale;
    const maxX = Math.max(0, (dw - size) / (2 * size));
    const maxY = Math.max(0, (dh - size) / (2 * size));
    const requestedX = Number(transform.x);
    const requestedY = Number(transform.y);
    const x = maxX ? clamp(Number.isFinite(requestedX) ? requestedX : 0, -maxX, maxX) : 0;
    const y = maxY ? clamp(Number.isFinite(requestedY) ? requestedY : 0, -maxY, maxY) : 0;
    return {
      dx: (size - dw) / 2 + x * size,
      dy: (size - dh) / 2 + y * size,
      dw, dh, x, y, scale
    };
  }

  return { getVideoPlacement };
});
