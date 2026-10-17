const test = require('node:test');
const assert = require('node:assert/strict');

test('video palette stays a dark tonal gradient and keeps the source hue', () => {
  const { gradientColorsFromPixels } = require('../vinyl-theme.js');
  const redBlueFrame = new Uint8ClampedArray([
    40, 70, 160, 255, 50, 90, 180, 255,
    25, 55, 145, 255, 45, 75, 170, 255,
  ]);
  const colors = gradientColorsFromPixels(redBlueFrame);
  assert.equal(colors.length, 3);
  const rgb = colors.map(hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
  assert.ok(rgb.every(([red, green, blue]) => blue > red && blue > green));
  assert.ok(rgb.every(channels => Math.max(...channels) < 180));
  assert.notEqual(colors[0], colors[2]);
});

test('unusable dark frame falls back to a readable blue gradient', () => {
  const { gradientColorsFromPixels, DEFAULT_GRADIENT } = require('../vinyl-theme.js');
  const colors = gradientColorsFromPixels(new Uint8ClampedArray([0, 0, 0, 255, 1, 1, 1, 255]));
  assert.deepEqual(colors, DEFAULT_GRADIENT);
});

test('record rotation defaults to a gentle 40-second turn and accepts a slower setting', () => {
  const { rotationAngle, normalizeSecondsPerTurn } = require('../vinyl-theme.js');
  assert.equal(normalizeSecondsPerTurn(undefined), 40);
  assert.equal(normalizeSecondsPerTurn(55), 55);
  assert.equal(normalizeSecondsPerTurn(300), 80);
  assert.ok(Math.abs(rotationAngle(10, 40) - Math.PI / 2) < 1e-8);
  assert.ok(Math.abs(rotationAngle(10, 80) - Math.PI / 4) < 1e-8);
});
