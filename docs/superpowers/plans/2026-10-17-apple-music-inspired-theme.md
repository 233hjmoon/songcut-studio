# Apple Music Inspired Theme Implementation Plan

> **For agentic workers:** Execute this plan inline, task by task, and keep each preview and export layer visually aligned.

**Goal:** Add the “流光播放器” theme with album-first playback controls, soft video/cover-derived backdrop, and current-line-focused lyrics across the studio UI, preview, PNG, and MP4 output.

**Architecture:** Preserve the existing theme selector, project JSON, canvas renderer, and Pillow/FFmpeg export pipeline. Add a third theme state and visual palette, route browser canvas drawing to a dedicated player-style composition, and let FFmpeg build a blurred full-frame video backdrop beneath the sharp transformed square video and transparent rendered layout.

**Tech Stack:** HTML, CSS, browser Canvas 2D, Python Pillow, FFmpeg, PowerShell packaging.

---

### Task 1: Register the third theme and apply it to the editor surface

**Files:**
- Modify: `index.html` — add the third theme button beside the existing theme controls.
- Modify: `app.js` — add palette and persisted theme-state handling.
- Modify: `styles.css` — style the editor, fields, buttons, and preview frame for the new theme.

- [x] Add `<button id="theme-player" type="button" aria-pressed="false">流光播放器</button>` to the existing theme group and register the ID in `app.js`.
- [x] Add the `flow-player` palette using warm rose, mauve, cream, and white text colors; extend `normalizeProject()` to retain `flow-player` while keeping missing/unknown values at `paper`.
- [x] Update `updateThemeControls()` to set `body.dataset.theme`, `aria-pressed`, the browser theme color, and status color for all three theme choices.
- [x] Add `body[data-theme="flow-player"]` CSS overrides for the top bar, cards, upload areas, fields, lyric controls, and transport controls. Keep the existing paper and rainy-night selectors unchanged.
- [x] Wire the new button to save the theme in the project draft and redraw the canvas, following the existing paper/rainy handlers.

**Manual check:** select each of the three themes in the browser and confirm only the chosen theme is active; refresh after selecting 流光播放器 and confirm it remains selected.

### Task 2: Draw the Now Playing canvas in the browser

**Files:**
- Modify: `app.js` — implement the theme-specific canvas layout and ambient background.

- [x] Add a reusable low-resolution backdrop canvas (480×270) for video frame sampling so a playing video does not require a full-resolution blur pass on every animation frame.
- [x] Add `drawPlayerBackdrop()` with source priority: selected, decoded video frame; selected custom cover; rose/mauve fallback gradient. Scale the chosen source to 16:9, blur it, dim it, and draw a translucent rose wash to keep foreground text readable.
- [x] Add `drawPlayerCanvas()` with a rounded square cover and track details/playback progress/controls on the left; place current bilingual lyric in sharp white type on the right, with adjacent lines softly blurred and faded. Keep the top-center, upper-right, and lower-right utility icon areas empty.
- [x] Draw `project.footer` at the lower left so the existing editable “页脚文字” control changes the rendered footer. Retain both existing lyric display modes and use the current-line treatment for timeline mode and the existing moving center behavior for scroll mode.
- [x] Add an early theme branch to `drawPreview()` that invokes `drawPlayerCanvas()` only for `flow-player`; preserve the paper and rainy-night drawing paths.
- [x] Keep the existing video transform aligned with the square cover: render the existing 643×643 transformed video into a clipped square, then scale that drawing to the 560×560 player artwork slot.

**Manual check:** preview the new theme with no media, a custom cover, an audio-plus-cover project, and a playing video. Confirm the background source follows the selected visual source, the cover slot stays sharp, the lyric remains legible, and the footer updates when edited.

### Task 3: Match Pillow and FFmpeg video export to the browser

**Files:**
- Modify: `renderer.py` — add the matching palette, layout, lyrics, fallback/cover background, and transparent video opening.
- Modify: `server.py` — add the video-background composition branch for the new theme.

- [x] Add `flow-player` colors to `THEME_PALETTES` and route `FrameRenderer` to a dedicated layout using the same cover bounds (x=94, y=126, size=560), typography hierarchy, lyric positions, and lower-left footer as the browser canvas.
- [x] For still/cover-based rendering, create the same soft blurred cover backdrop; fall back to a rose/mauve gradient when there is no cover.
- [x] For `use_video` plus `flow-player`, start the Pillow frame on transparency, preserve a transparent 560×560 artwork opening, and draw the foreground layout above that opening.
- [x] In `compose_command()`, split the source video. Build a 1920×1080 blurred/dimmed background stream from one branch; scale/crop the other branch using the existing `placement` transform to a 560×560 sharp foreground; overlay that square at (94,126), then overlay the transparent Pillow composition. Keep the current composition graph unchanged for paper and rainy-night themes.
- [x] Keep audio mapping, MP4 encoding, cancellation, progress reporting, and direct composition behavior intact.

**Manual check:** render one still from a project with a custom cover and one short MP4 with a moving video source. Compare browser and rendered frames for background timing, square video placement, lyric sharpness, footer, and palette. Confirm the two existing themes still use their existing renderer/compositor paths.

### Task 4: Update help, rebuild the package, and verify the visible result

**Files:**
- Modify: `使用说明.md` — describe the third theme and source behavior.
- Rebuild: `../歌切制作台-直接合成版.zip` — include all current app source and instructions.

- [x] Document the three theme choices, how the selected video/cover controls the blurred background, and how the lower-left footer follows the “页脚文字” field.
- [x] Rebuild the ZIP from the current package files, including `index.html`, `styles.css`, `app.js`, `renderer.py`, `server.py`, lyric/video helpers, sample lyrics, requirements, and launcher.
- [x] Restart the local service so the updated Python renderer is loaded; reload `http://localhost:8765/` and leave the new theme preview visible.
- [x] Inspect the browser canvas and a rendered export frame at full size. Confirm the new theme selector persists and the video composition graph produces an MP4 with blurred full-frame ambience plus sharp transformed video.

**Completion criteria:** the selector has three persistent themes; the new canvas matches the approved Now Playing layout; selected video/cover/fallback backgrounds behave consistently through preview and export; the editable footer appears lower left; the refreshed ZIP includes the completed implementation.
