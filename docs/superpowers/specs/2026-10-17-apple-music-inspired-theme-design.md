# Apple Music inspired playback theme

Date: 2026-10-17

## Goal

Add a third selectable theme to Songcut Studio that evokes a polished Apple Music “Now Playing” screen while remaining an original visual treatment. The theme must apply consistently to the editor interface, 16:9 canvas preview, PNG snapshots, and directly composed MP4 output.

## Visual direction

Use a soft, blurred color field sampled from original album artwork as the full 16:9 background. Place a large square cover and track details with playback progress and controls in the left column. Put lyrics in the right column: the current bilingual line stays crisp and bright while neighboring lines blur and fade into the background. Use restrained white controls and readable type over the rose, mauve, and warm cream atmosphere. Keep the upper and lower right corners free of utility icons. Put the project footer text at the lower left and bind it to the existing editable footer field. Apply the same visual structure to the video canvas and keep the production controls coherent with it.

Do not add Apple logos, Apple Music marks, or proprietary assets. The theme name in the selector will be “流光播放器”.

## User experience

- Add “流光播放器” as a third option alongside “暖纸唱片” and “雨后便利店”.
- Switching themes updates the whole production surface: application controls and panels, preview canvas, exported stills, and MP4 rendering.
- The selected theme persists in the local draft and project JSON; projects without a theme continue to default to “暖纸唱片”.
- Choose the ambient background source from the selected visual source: when “视频画面” is selected, use the current video frame enlarged, blurred, and dimmed; when “自定义封面” is selected, use the cover art enlarged, blurred, and dimmed; with neither source, use a stable rose/mauve gradient. The background follows playback time and uses the same source in preview, PNG export, and MP4 composition.
- Keep existing lyric display modes, video positioning, cover selection, and playback behavior intact. Existing feature controls should remain legible against the new theme.

## Implementation approach

- Extend the theme selector, project normalization, theme state, and browser canvas palette in index.html and app.js.
- Add a matching CSS theme block in styles.css for the full editor surface.
- Add a renderer palette and cover-aware background treatment in renderer.py so still/video exports match the browser preview.
- Update 使用说明.md with the new theme option.
- Rebuild the downloadable ZIP and inspect the result in the existing browser preview.

## Acceptance criteria

1. The theme selector has three working options; “流光播放器” updates all editor colors without affecting the other two themes.
2. The canvas follows the supplied Now Playing reference: album art and playback controls on the left, a crisp bilingual current lyric on the right, and surrounding lyrics softly blurred and faded. The upper and lower right corners contain no utility icons, and the lower-left footer reflects the editable project footer field.
3. Browser preview and PNG export use the selected video frame, selected cover, or fallback gradient as their blurred backdrop. Server-rendered MP4 frames use the matching video frame as the blurred backdrop when video is selected, while preserving the crisp transformed square video and the same foreground layout.
4. Selecting the theme survives refresh and project JSON save/import.
5. The downloadable package contains the updated source and instructions.




