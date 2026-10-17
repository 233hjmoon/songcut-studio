# 逐句上移歌词转场 Implementation Plan

> **For agentic workers:** Execute this plan inline, one task at a time, and verify each browser/export change before finishing.

**Goal:** Change scroll-gradient lyrics from continuous movement to a short upward transition at each lyric timestamp, synchronized between preview and MP4 export.

**Architecture:** Use one deterministic time-to-center calculation in the browser and mirror the same 300 ms ease-out curve in the Python renderer. Add export frame samples inside each transition so encoded frames show the motion. Keep timeline mode and project data unchanged.

**Tech Stack:** Vanilla JavaScript Canvas, Python Pillow, FFmpeg frame manifest generator.

---

### Task 1: Add transition samples to export timing

**Files:**
- Modify: `outputs/songcut-studio/export-timeline.js`

- [x] Add samples at each lyric transition start, midpoint, and end (0, 150, and 300 ms after the lyric time), clamp them to the export duration, sort and deduplicate them with the existing cadence samples.
- [x] Preserve the existing maximum-gap sampling and 25,000-frame safety limit in the export path.
- [x] Inspect generated sample times for a short lyric list, ensuring the 150 ms frame is present and times remain increasing.

### Task 2: Use stepwise eased positions in the browser preview

**Files:**
- Modify: `outputs/songcut-studio/app.js`

- [x] Change `scrollCenterIndex(lines, seconds)` to hold the latest active lyric index between timestamps, then ease from the previous index to the new index over 0.3 seconds using cubic ease-out `1 - (1 - t)^3`.
- [x] For equal or decreasing lyric timestamps, resolve to the latest active lyric without dividing by zero or animating backward.
- [x] Keep the current active-lyric selection and all timeline-mode drawing unchanged.
- [x] Confirm both the timeline scroll-gradient canvas and Apple Music-inspired player canvas use this shared calculation.

### Task 3: Mirror the transition in offline rendering and document behavior

**Files:**
- Modify: `outputs/songcut-studio/renderer.py`
- Modify: `outputs/songcut-studio/使用说明.md`

- [x] Update Python `scroll_center_index` to use the same 300 ms cubic ease-out step transitions, matching browser handling of equal timestamps.
- [x] Confirm both `_draw_scrolling_lyrics` and `_draw_player_lyrics` use that helper and retain their current fade, emphasis, and layout behavior.
- [x] Update the usage guide to say lyrics stay still between timestamps and move up briefly when the next line begins.
- [x] Manually inspect sample centers at just before a transition, its midpoint, its end, and after end; compare JavaScript and Python values within floating point tolerance.
- [x] Open the running browser preview and verify the line is stationary between timestamps, moves upward once over 0.3 seconds, and stays fixed afterward. Check a timeline-mode project remains unchanged by keeping all change paths conditional on `lyricDisplay === "scroll"`.
- [x] Run one short direct MP4 export and inspect frames at the transition midpoint and end to ensure the motion is present in the encoded video.
