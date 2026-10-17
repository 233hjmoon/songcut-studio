"""Timed ASS overlays and FFmpeg graph for video-first 60 fps exports."""

from __future__ import annotations

import bisect
import math
from pathlib import Path

from renderer import THEME_PALETTES, fit_text, font, format_time, parse_time, scroll_center_index


ASS_HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Microsoft YaHei,30,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def escape_ass(value: str) -> str:
    """Keep user text literal inside an ASS Dialogue event."""
    return (str(value).replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")
            .replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\\N"))


def _clock(centiseconds: int) -> str:
    centiseconds = max(0, centiseconds)
    hours, remainder = divmod(centiseconds, 360000)
    minutes, remainder = divmod(remainder, 6000)
    seconds, fraction = divmod(remainder, 100)
    return f"{hours}:{minutes:02d}:{seconds:02d}.{fraction:02d}"


def _ass_color(value) -> str:
    if isinstance(value, str):
        value = value.lstrip("#")
        red, green, blue = (int(value[index:index + 2], 16) for index in (0, 2, 4))
    else:
        red, green, blue = value[:3]
    return f"&H{blue:02X}{green:02X}{red:02X}&"


def _event(events: list[str], start_cs: int, end_cs: int, text: str, layer: int = 2) -> None:
    if end_cs <= start_cs:
        return
    events.append(f"Dialogue: {layer},{_clock(start_cs)},{_clock(end_cs)},Default,,0,0,0,,{text}")


def _label(events: list[str], start_cs: int, end_cs: int, value: str, x: int, y: int,
           size: int, color, alpha: float = 1, *, bold: bool = False, font_name: str = "Microsoft YaHei",
           alignment: int = 7, layer: int = 2, blur: float = 0) -> None:
    if not value or alpha <= 0:
        return
    inverse_alpha = round((1 - min(1, max(0, alpha))) * 255)
    tags = (f"\\an{alignment}\\pos({x},{y})\\fn{font_name}\\fs{size}"
            f"\\b{1 if bold else 0}\\c{_ass_color(color)}\\alpha&H{inverse_alpha:02X}&")
    if blur > 0:
        tags += f"\\blur{blur:.2f}"
    _event(events, start_cs, end_cs, "{" + tags + "}" + escape_ass(value), layer)


def _rect(events: list[str], start_cs: int, end_cs: int, x: int, y: int,
          width: int, height: int, color, alpha: float = 1, layer: int = 1) -> None:
    if width <= 0 or height <= 0 or alpha <= 0:
        return
    inverse_alpha = round((1 - min(1, max(0, alpha))) * 255)
    tags = f"\\an7\\pos({x},{y})\\c{_ass_color(color)}\\alpha&H{inverse_alpha:02X}&\\p1"
    shape = f"m 0 0 l {width} 0 {width} {height} 0 {height}"
    _event(events, start_cs, end_cs, "{" + tags + "}" + shape + "{\\p0}", layer)


def _add_progress(events: list[str], duration_cs: int, duration: float, theme: str, colors: dict) -> None:
    if theme == "flow-player":
        bars = [(96, 820, 558, 3), (96, 950, 558, 4)]
    else:
        bars = [(92, 1044, 643, 3)]
    for x, y, width, height in bars:
        tags = (f"\\an7\\pos({x},{y})\\c{_ass_color(colors['progress'])}"
                f"\\fscx0\\t(0,{round(duration * 1000)},\\fscx100)\\p1")
        shape = f"m 0 0 l {width} 0 {width} {height} 0 {height}"
        _event(events, 0, duration_cs, "{" + tags + "}" + shape + "{\\p0}", 3)
    if theme == "flow-player":
        tags = (f"\\an7\\move(88,944,646,944,0,{round(duration * 1000)})"
                f"\\c{_ass_color(colors['progress'])}\\p1")
        circle = "m 8 0 b 12 0 16 4 16 8 b 16 12 12 16 8 16 b 4 16 0 12 0 8 b 0 4 4 0 8 0"
        _event(events, 0, duration_cs, "{" + tags + "}" + circle + "{\\p0}", 4)
    for second in range(math.ceil(duration)):
        start_cs = second * 100
        end_cs = min(duration_cs, (second + 1) * 100)
        if theme == "flow-player":
            _label(events, start_cs, end_cs, format_time(second), 96, 780, 18, colors["muted"],
                   font_name="Consolas", layer=3)
            _label(events, start_cs, end_cs, "−" + format_time(duration - second),
                   654, 780, 18, colors["muted"], font_name="Consolas", alignment=9, layer=3)
        else:
            _label(events, start_cs, end_cs, format_time(second) + " / " + format_time(duration),
                   284, 1007, 22, colors["muted"], font_name="Consolas", layer=3)


def _add_paper_lyrics(events: list[str], start_cs: int, end_cs: int, lyrics: list[dict],
                      times: list[float], seconds: float, colors: dict, scrolling: bool) -> None:
    selected = max(0, bisect.bisect_right(times, seconds + 0.02) - 1)
    center = scroll_center_index(lyrics, seconds) if scrolling else float(selected)
    if scrolling:
        first = max(0, math.floor(center) - 5)
        last = min(len(lyrics), math.ceil(center) + 6)
        indices = range(first, last)
    else:
        first = max(0, min(len(lyrics) - 8, selected - 3))
        indices = range(first, min(len(lyrics), first + 8))
    active_progress = max(0.0, min(1.0, center - selected + 1)) if scrolling and selected > 0 else 1.0
    for index in indices:
        line = lyrics[index]
        y = round(600 + (index - center) * 88) if scrolling else 240 + (index - first) * 88
        if y < 170 or y > 1020:
            continue
        active = index == selected
        fade = max(0.0, min(1.0, (y - 212) / 150, (990 - y) / 150)) if scrolling else 1.0
        if active:
            _rect(events, start_cs, end_cs, 830, y - 27, 994, 76,
                  colors["active_background"], fade * active_progress)
            _rect(events, start_cs, end_cs, 830, y - 27, 4, 76,
                  colors["active_accent"], fade * active_progress)
        opacity = fade * (active_progress if active else 1.0)
        _label(events, start_cs, end_cs, format_time(times[index]), 850, y - 22, 21,
               colors["active_time"] if active else colors["idle_time"], opacity,
               font_name="Consolas")
        content = line.get("text") or "（空白歌词）"
        chosen_font = font("sans_bold" if active else "sans", 30)
        _label(events, start_cs, end_cs, fit_text(content, chosen_font, 750), 1000, y - 28, 30,
               colors["active_text"] if active else colors["idle_text"], opacity, bold=active)
        if line.get("translation"):
            _label(events, start_cs, end_cs,
                   fit_text(line["translation"], font("serif", 20), 760), 1000, y + 9, 20,
                   colors["active_translation"] if active else colors["idle_translation"], opacity)
        _rect(events, start_cs, end_cs, 842, y + 55, 968, 1, colors["lyric_line"], fade, layer=0)


def _add_player_lyrics(events: list[str], start_cs: int, end_cs: int, lyrics: list[dict],
                       times: list[float], seconds: float, colors: dict, scrolling: bool) -> None:
    selected = max(0, bisect.bisect_right(times, seconds + 0.02) - 1)
    center = scroll_center_index(lyrics, seconds) if scrolling else float(selected)
    active_progress = max(0.0, min(1.0, center - selected + 1)) if scrolling and selected > 0 else 1.0
    first = max(0, math.floor(center) - 3)
    last = min(len(lyrics), math.floor(center) + 4)
    for index in range(first, last):
        line = lyrics[index]
        y = round(520 + (index - center) * 148)
        if y < 260 or y > 980:
            continue
        active = index == selected
        distance = abs(index - center)
        fade = max(0.0, min(1.0, (y - 260) / 180, (980 - y) / 180))
        opacity = (active_progress if active else max(.13, 1 - distance * .25)) * fade
        size = 39 if active else 33
        content = fit_text(line.get("text") or "（空白歌词）",
                           font("sans_bold" if active else "sans", size), 950)
        _label(events, start_cs, end_cs, content, 810, y - size, size,
               colors["active_text"] if active else colors["idle_text"], opacity, bold=active,
               blur=0 if active else min(5, distance * 1.35))
        if line.get("translation"):
            translation = fit_text(line["translation"], font("sans", 21 if active else 18), 950)
            _label(events, start_cs, end_cs, translation, 812, y + 14, 21 if active else 18,
                   colors["active_translation"] if active else colors["idle_translation"], opacity,
                   blur=0 if active else min(5, distance * 1.35))


def write_ass(project: dict, duration: float, path: Path) -> Path:
    """Write theme-matched timed lyrics and playback indicators as one ASS file."""
    path = Path(path)
    duration_cs = max(1, round(duration * 100))
    theme = project.get("theme") if project.get("theme") in THEME_PALETTES else "paper"
    colors = THEME_PALETTES[theme]
    lyrics = sorted(project.get("lyrics", []), key=lambda line: parse_time(line.get("time", 0)))
    times = [parse_time(line.get("time", 0)) for line in lyrics]
    scrolling = project.get("lyricDisplay") == "scroll"
    events: list[str] = []
    _add_progress(events, duration_cs, duration, theme, colors)
    if not lyrics:
        if theme == "flow-player":
            _label(events, 0, duration_cs, "导入歌词后，会在这里逐句浮现", 810, 480, 34, colors["empty"])
        else:
            _label(events, 0, duration_cs, "歌词会按照时间出现在这里", 842, 250, 30, colors["empty"])
    else:
        boundaries = {0, duration_cs}
        for index, value in enumerate(times):
            timestamp = round(value * 100)
            if 0 < timestamp < duration_cs:
                boundaries.add(timestamp)
            if scrolling and index > 0:
                for frame in range(1, 19):
                    sample = round((value + frame / 60) * 100)
                    if 0 < sample < duration_cs:
                        boundaries.add(sample)
        ordered = sorted(boundaries)
        for start_cs, end_cs in zip(ordered, ordered[1:]):
            seconds = start_cs / 100
            if theme == "flow-player":
                _add_player_lyrics(events, start_cs, end_cs, lyrics, times, seconds, colors, scrolling)
            else:
                _add_paper_lyrics(events, start_cs, end_cs, lyrics, times, seconds, colors, scrolling)
    path.write_text(ASS_HEADER + "\n".join(events) + "\n", encoding="utf-8")
    return path


def direct_video_command(job: dict, ffmpeg: str) -> list[str]:
    """Encode the input video under one static themed layer and timed ASS graphics."""
    path = Path(job["path"])
    placement = job["placement"]
    width = max(643, round(placement["dw"]))
    height = max(643, round(placement["dh"]))
    crop_x = min(width - 643, max(0, round(-placement["dx"])))
    crop_y = min(height - 643, max(0, round(-placement["dy"])))
    if job.get("project", {}).get("theme") == "flow-player":
        graph = (
            "[0:v]format=rgba[art];"
            f"[1:v]tpad=stop_mode=clone:stop_duration={job['duration']:.6f},fps=60,split=2[ambient_src][sharp_src];"
            "[ambient_src]scale=480:270:force_original_aspect_ratio=increase:flags=bilinear,"
            "crop=480:270,boxblur=6:2,scale=1920:1080:flags=bilinear,"
            "eq=brightness=-0.22:saturation=0.78,"
            "drawbox=color=0x392a3a@0.48:t=fill[ambient];"
            f"[sharp_src]scale={width}:{height}:flags=lanczos,setsar=1,"
            f"crop=643:643:{crop_x}:{crop_y},scale=560:560:flags=lanczos[sharp];"
            "[ambient][sharp]overlay=94:126[backdrop];"
            "[backdrop][art]overlay=0:0:shortest=1:format=auto[layout];"
            "[layout]ass=lyrics.ass,format=yuv420p[v]"
        )
    else:
        graph = (
            "[0:v]format=rgba[art];"
            f"[1:v]tpad=stop_mode=clone:stop_duration={job['duration']:.6f},fps=60,scale={width}:{height}:flags=lanczos,setsar=1,"
            f"crop=643:643:{crop_x}:{crop_y},pad=1920:1080:92:145:black[backdrop];"
            "[backdrop][art]overlay=0:0:shortest=1:format=auto[layout];"
            "[layout]ass=lyrics.ass,format=yuv420p[v]"
        )
    return [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-loop", "1", "-framerate", "60", "-i", str(path / "static.png"),
        "-i", str(job["source"]), "-filter_complex", graph,
        "-map", "[v]", "-map", "1:a:0?",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
        "-pix_fmt", "yuv420p", "-r", "60", "-c:a", "aac", "-b:a", "192k",
        "-t", f"{job['duration']:.6f}", "-movflags", "+faststart",
        "-progress", "pipe:1", "-nostats", str(path / "output.mp4"),
    ]
