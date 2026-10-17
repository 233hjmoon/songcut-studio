# 双模式视频导出实施计划

> **For agentic workers:** Execute inline one task at a time and verify each browser/export change before finishing.

**Goal:** Add a real-time canvas recording export alongside the existing direct FFmpeg composition, with MP4 downloads in both modes.

**Architecture:** Add a small browser helper for selecting supported MediaRecorder formats and combining a canvas video stream with source audio tracks. The browser streams recording chunks to a new local recording-job API; the server appends them to a temporary WebM and transcodes that file to MP4. Keep the current direct-composition job API unchanged and selectable as the default.

**Tech Stack:** Vanilla JavaScript, Canvas captureStream, MediaRecorder, Python HTTP server, FFmpeg, Node and Python unittest checks.

---

### Task 1: Test and add browser recording helpers

**Files:**
- Create: `outputs/songcut-studio/recording-export.js`
- Create: `work/recording-export.test.cjs`
- Modify: `outputs/songcut-studio/index.html`

- [x] Test MIME preference selects lower-overhead VP8 first, then VP9, then browser default WebM only when supported; silent video omits the audio codec.
- [x] Test that the output stream contains the canvas video track and only input audio tracks; input video tracks are excluded.
- [x] Add the helper script to the page and run `node work/recording-export.test.cjs`.

### Task 2: Test and add server-side recording jobs

**Files:**
- Modify: `outputs/songcut-studio/server.py`
- Modify: `work/test_export_backend.py`
- Create: `work/test_recording_http.py`

- [x] Add failing tests for the recording conversion command (30 fps H.264/AAC MP4, optional audio) and cleanup of recording temporary files.
- [x] Add create, chunk, finish, status, cancel, and download endpoints under `/api/recordings`.
- [x] Append chunks to a temporary WebM, convert in a worker thread with FFmpeg, report progress, support process cancellation, and reuse the existing safe download/cleanup behavior.
- [x] Run `python -m unittest work.test_export_backend` and `python work/test_recording_http.py`.

### Task 3: Add the export-mode control and recording flow

**Files:**
- Modify: `outputs/songcut-studio/index.html`
- Modify: `outputs/songcut-studio/app.js`
- Modify: `outputs/songcut-studio/styles.css`

- [x] Add a mode selector defaulting to direct composition.
- [x] Implement capability checks, 30 fps canvas recording, audio-track mixing, 1-second chunk uploads, start-from-zero playback, ended handling, and stage-specific progress.
- [x] Disable project and playback controls during export; cancellation stops recorder/playback, track streams, upload queue, and server job, then restores controls.
- [x] Run the browser helper tests and validate direct-export UI still uses its existing job endpoint.

### Task 4: Validate MP4 output and user instructions

**Files:**
- Modify: `outputs/songcut-studio/使用说明.md`
- Modify: `outputs/songcut-studio/产品介绍与使用说明.md`
- Test: `work/test_render_integration.py`
- Test: `work/test_recording_http.py`
- Test: `work/test_cancel_http.py`

- [x] Integration test makes short audio and silent WebM fixtures, uploads in chunks, converts them, and checks MP4 duration, 1920×1080 video at 30 fps, optional AAC audio, and cancellation cleanup.
- [x] Verify start from the actual playback event, preserve the captured stream's full duration, abort when the page is backgrounded, and lock canvas video framing during export.
- [x] Run existing render tests, backend tests, browser helper tests, recording HTTP tests, and direct-export HTTP cancellation tests.
- [x] Update instructions to explain real-time recording requires song-length playback while direct composition renders offline.
- [x] Open the updated local page and verify both selectable modes and export status messages.
