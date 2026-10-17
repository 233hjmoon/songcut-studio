# 原视频直合 60 帧实施计划

> **For agentic workers:** Execute inline, use a failing test before each implementation change, and verify each task before continuing.

**Goal:** Export imported video with the existing themed layout and lyrics as a 1920×1080, 60 fps MP4 without generating a sequence of full-frame PNGs.

**Architecture:** Add a dedicated fast-video job that reuses the existing upload, progress, cancellation, and download lifecycle. Render one static transparent theme layer, generate ASS timed graphics for lyrics and playback indicators, and combine them with the source video in FFmpeg. Preserve the two existing export modes.

**Tech Stack:** Vanilla JavaScript, Python, Pillow, FFmpeg/libass, Node tests, Python unittest, ffprobe.

---

### Task 1: Timed overlay generator

**Files:** Create `outputs/songcut-studio/direct_video.py`; test `work/test_direct_video_overlay.py`.

- [x] Write failing tests for ASS escaping, active and neighboring lyrics, scroll transition timing, progress, and empty lyrics. A representative expectation is that a lyric containing `{a}\\b` is escaped as `\\{a\\}\\\\b` in generated ASS text.
- [x] Run `python -m unittest work.test_direct_video_overlay` and verify the missing module/functions fail.
- [x] Implement `write_ass(project, duration, path)` with centisecond event times and theme geometry. The timeline mode writes one state per lyric interval; the scroll mode samples only each 0.3 second transition at 60 fps and holds other states. Generate progress and time overlays from timestamps.
- [x] Run the same test and verify all cases pass.

### Task 2: Single-frame FFmpeg composition

**Files:** Create `outputs/songcut-studio/direct_video.py`; modify `outputs/songcut-studio/server.py`; test `work/test_direct_video_command.py`.

- [x] Write a failing command test requiring one looped static PNG input, the uploaded source video, `ass`, `fps=60`, H.264/AAC output, and no `frames/%06d.png` manifest.
- [x] Run `python -m unittest work.test_direct_video_command` and verify it fails for the missing command builder.
- [x] Implement `direct_video_command(job, ffmpeg)` and a worker that saves `FrameRenderer(..., use_video=True).base` once, calls `write_ass`, starts FFmpeg, updates progress, handles cancellation, and cleans temporary assets. In the player theme, blur a 480×270 copy of the input before scaling to 1920×1080.
- [x] Run command tests and a short fixture export; verify with ffprobe that video is 1920×1080 at 60 fps with the expected duration and optional audio.

### Task 3: API and UI entry

**Files:** Modify `outputs/songcut-studio/server.py`, `index.html`, `app.js`, `styles.css`; test `work/test_direct_video_http.py`.

- [x] Write failing API tests for job creation, source upload, finish/status/download, invalid video selection, and cancellation cleanup.
- [x] Run `python work/test_direct_video_http.py` and verify the new endpoint is absent.
- [x] Add `/api/direct-video` job routes using the existing job lock and cleanup patterns. Add a third export choice, select it when a video is imported and used as the visual source, and display mode-specific progress and errors.
- [x] Re-run API tests and browser syntax checks. Verify old `/api/jobs` and `/api/recordings` routes still work.

### Task 4: Visual, performance, and package checks

**Files:** Modify `outputs/songcut-studio/使用说明.md`, `产品介绍与使用说明.md`; rebuild `outputs/歌切制作台-双模式导出版.zip` with the new direct-video module.

- [x] Export a short video in all three themes and both lyric modes. Compare screenshots at the start, at a lyric transition, and near the end with the existing preview; correct placement, colors, and timing discrepancies.
- [x] Confirm a 30 fps input produces 60 fps output without motion interpolation, the output keeps or omits audio as appropriate, and the temporary job contains one static PNG rather than a frame sequence.
- [x] Run helper, renderer, direct-export, recording, and cancellation tests, then update the user guide and package. Since this workspace has no Git repository, preserve the source and package as deliverables without a commit.

