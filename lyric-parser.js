(() => {
  'use strict';

  function secondsFromStamp(stamp) {
    const match = stamp.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?$/);
    if (!match) return null;
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    if (seconds >= 60 || (match[1] && minutes >= 60)) return null;
    const fraction = match[4] ? Number('0.' + match[4]) : 0;
    return hours * 3600 + minutes * 60 + seconds + fraction;
  }

  function formatStamp(seconds, precision = 2) {
    const unit = 10 ** precision;
    const count = Math.round(seconds * unit);
    const hours = Math.floor(count / (3600 * unit));
    const minutes = Math.floor((count % (3600 * unit)) / (60 * unit));
    const wholeSeconds = Math.floor((count % (60 * unit)) / unit);
    const fraction = count % unit;
    const parts = [minutes, wholeSeconds].map(n => String(n).padStart(2, '0'));
    if (hours) parts.unshift(String(hours).padStart(2, '0'));
    return parts.join(':') + '.' + String(fraction).padStart(precision, '0');
  }

  function unwrap(text) {
    const value = text.trim();
    if ((value.startsWith('（') && value.endsWith('）')) ||
        (value.startsWith('(') && value.endsWith(')'))) {
      return value.slice(1, -1).trim();
    }
    return value;
  }

  function parseLyricText(raw, options = {}) {
    const allowUntimed = options.allowUntimed !== false;
    let nextUntimed = Math.max(0, Number(options.startAt) || 0);
    const result = [];
    const stampPattern = /^\[((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.:]\d{1,3})?)\]/;

    for (const rawRow of String(raw || '').split(/\r?\n/)) {
      let row = rawRow.trim();
      if (!row) continue;
      const times = [];
      let match;
      while ((match = row.match(stampPattern))) {
        const seconds = secondsFromStamp(match[1]);
        if (seconds !== null) {
          const fractionLength = match[1].match(/[.:](\d{1,3})$/)?.[1].length || 0;
          times.push({ seconds, precision: fractionLength === 3 ? 3 : 2 });
        }
        row = row.slice(match[0].length).trimStart();
      }
      if (!times.length) {
        if (!allowUntimed || row.startsWith('[')) continue;
        times.push({ seconds: nextUntimed, precision: 2 });
        nextUntimed += 5;
      }
      const separator = row.indexOf('|');
      const text = unwrap(separator < 0 ? row : row.slice(0, separator));
      const translation = separator < 0 ? '' : unwrap(row.slice(separator + 1));
      if (!text) continue;
      for (const { seconds, precision } of times) {
        result.push({ time: formatStamp(seconds, precision), text, translation, seconds });
      }
    }
    result.sort((a, b) => a.seconds - b.seconds);
    return result.map(({ time, text, translation }) => ({ time, text, translation }));
  }

  function decodeLyricBytes(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      return new TextDecoder('utf-16le').decode(bytes).replace(/^\uFEFF/, '');
    }
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      return new TextDecoder('utf-16be').decode(bytes).replace(/^\uFEFF/, '');
    }
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
    } catch (_) {
      return new TextDecoder('gb18030').decode(bytes);
    }
  }

  const api = { parseLyricText, decodeLyricBytes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.SongcutLyrics = api;
})();
