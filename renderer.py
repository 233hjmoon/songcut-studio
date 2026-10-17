"""Render song-cut layout frames directly with Pillow for offline FFmpeg export."""

from __future__ import annotations

import base64
import io
import math
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageChops, ImageColor, ImageDraw, ImageFilter, ImageFont, ImageOps


WIDTH, HEIGHT = 1920, 1080
FONT_DIR = Path(r"C:\Windows\Fonts")
FONT_FILES = {
    "sans": "msyh.ttc", "sans_bold": "msyhbd.ttc",
    "serif": "NotoSerifSC-VF.ttf", "english": "georgiab.ttf",
    "time": "consolab.ttf",
}
THEME_PALETTES = {
    "vinyl-player": {
        "background": "#102553", "cover_start": (30, 55, 101), "cover_middle": (156, 85, 75),
        "cover_end": (228, 196, 156), "cover_ring": (255, 244, 224, 165),
        "cover_text": "#fff7e9", "title": "#fffaf4", "artist": "#d7e2f4",
        "album": "#c7d7f2", "muted": "#c7d5ed", "empty": "#d7e4f2",
        "progress": "#f2d99f", "active_text": "#fffaf4", "idle_text": "#c9d5e7",
        "active_translation": "#f0e3cf", "idle_translation": "#b9cbe1",
    },
    "paper": {
        "background": "#e8e6df", "grid": "#d8d7d2", "panel": (248, 247, 241, 184), "panel_line": "#c5c6c1",
        "heading": "#263334", "album": "#34434b", "title": "#222828", "artist": "#687475", "tags": "#51626a",
        "transport": "#283333", "progress_base": "#c0c4bd", "progress": "#283333", "eyebrow": "#566b73",
        "secondary": "#202626", "muted": "#6b7575", "line": "#afb3ae", "empty": "#86908b",
        "active_background": "#eee3d8", "active_accent": "#b86e37", "active_time": "#9d5b2a", "idle_time": "#7b8682",
        "active_text": "#202626", "idle_text": "#626e6d", "active_translation": "#696a61", "idle_translation": "#9ba39f",
        "lyric_line": "#cbd0ca", "cover_start": (13, 30, 45), "cover_middle": (49, 93, 117), "cover_end": (189, 128, 76),
        "cover_ring": (235, 222, 198, 150), "cover_text": "#fff6df", "cover_border": "#b4b5af"
    },
    "rainy-night": {
        "background": "#193654", "grid": "#315477", "panel": (24, 48, 76, 214), "panel_line": "#42688f",
        "heading": "#edf7ff", "album": "#c0e4f5", "title": "#f6faff", "artist": "#c3d7eb", "tags": "#b3cee8",
        "transport": "#91eaff", "progress_base": "#42658b", "progress": "#71e0f4", "eyebrow": "#acd3ec",
        "secondary": "#f0f8ff", "muted": "#bfd1e4", "line": "#6687a8", "empty": "#b3c9df",
        "active_background": "#245274", "active_accent": "#78e4f5", "active_time": "#91ecff", "idle_time": "#aec3dd",
        "active_text": "#f7fcff", "idle_text": "#d4e2ef", "active_translation": "#dfedf7", "idle_translation": "#adc2d8",
        "lyric_line": "#355777", "cover_start": (16, 42, 71), "cover_middle": (40, 102, 155), "cover_end": (163, 183, 220),
        "cover_ring": (174, 235, 255, 184), "cover_text": "#f5fbff", "cover_border": "#8ad6f1"
    },
    "flow-player": {
        "background": "#493b46", "grid": "#514550", "panel": (35, 27, 37, 70), "panel_line": "#675965",
        "heading": "#f6eee9", "album": "#e7d9d4", "title": "#fff8f4", "artist": "#e0d2d1", "tags": "#d8c8c9",
        "transport": "#fff5ef", "progress_base": "#9d8d98", "progress": "#fff8f3", "eyebrow": "#e6cbd5",
        "secondary": "#fff8f5", "muted": "#e0d3d4", "line": "#c3b0ba", "empty": "#e1d6d6",
        "active_background": (255, 255, 255, 36), "active_accent": "#fff5ef", "active_time": "#fff9f5", "idle_time": "#d3c3c6",
        "active_text": "#fffaf7", "idle_text": "#c8b9bd", "active_translation": "#ded1d3", "idle_translation": "#a99ba1",
        "lyric_line": "#746675", "cover_start": (85, 58, 80), "cover_middle": (152, 103, 125), "cover_end": (208, 161, 155),
        "cover_ring": (255, 245, 238, 128), "cover_text": "#fff6f0", "cover_border": "#e8d4d8"
    }
}


@lru_cache(maxsize=32)
def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONT_DIR / FONT_FILES[name]
    if not path.exists():
        path = FONT_DIR / "arial.ttf"
    chosen = ImageFont.truetype(str(path), size)
    if name == "serif" and path.name == "NotoSerifSC-VF.ttf":
        chosen.set_variation_by_axes([700])
    return chosen


def parse_time(value) -> float:
    if isinstance(value, (int, float)):
        return max(0, float(value))
    try:
        parts = [float(part) for part in str(value or "0").split(":")]
        if len(parts) == 3:
            return max(0, parts[0] * 3600 + parts[1] * 60 + parts[2])
        if len(parts) == 2:
            return max(0, parts[0] * 60 + parts[1])
        return max(0, parts[0])
    except (ValueError, IndexError):
        return 0


def format_time(seconds: float) -> str:
    safe = max(0, math.floor(seconds))
    hours, remainder = divmod(safe, 3600)
    minutes, second = divmod(remainder, 60)
    return (f"{hours:02d}:" if hours else "") + f"{minutes:02d}:{second:02d}"


def vinyl_seconds_per_turn(value) -> float:
    try:
        seconds = float(value)
    except (TypeError, ValueError):
        return 40.0
    return min(80.0, max(5.0, seconds)) if math.isfinite(seconds) and seconds > 0 else 40.0


def fit_text(text: str, chosen_font: ImageFont.FreeTypeFont, width: int) -> str:
    text = str(text or "")
    if chosen_font.getlength(text) <= width:
        return text
    while text and chosen_font.getlength(text + "…") > width:
        text = text[:-1]
    return text + "…"


def label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, chosen_font, color, width=None, anchor="ls") -> None:
    text = fit_text(value, chosen_font, width) if width else str(value)
    draw.text(xy, text, font=chosen_font, fill=color, anchor=anchor)


def cover_image(data_uri: str) -> Image.Image | None:
    if not data_uri or "," not in data_uri:
        return None
    try:
        data = base64.b64decode(data_uri.split(",", 1)[1], validate=True)
        with Image.open(io.BytesIO(data)) as source:
            return ImageOps.fit(source.convert("RGBA"), (643, 643), Image.Resampling.LANCZOS)
    except (ValueError, OSError):
        return None


def placeholder_art(theme: str = "paper") -> Image.Image:
    colors = THEME_PALETTES.get(theme, THEME_PALETTES["paper"])
    top, middle, bottom = colors["cover_start"], colors["cover_middle"], colors["cover_end"]
    art = Image.new("RGBA", (643, 643))
    draw = ImageDraw.Draw(art)
    for y in range(643):
        t = y / 642
        if t < 0.55:
            left, right, fraction = top, middle, t / 0.55
        else:
            left, right, fraction = middle, bottom, (t - 0.55) / 0.45
        color = tuple(round(a + (b - a) * fraction) for a, b in zip(left, right)) + (255,)
        draw.line((0, y, 642, y), fill=color)
    for index in range(4):
        radius = round(643 * (0.16 + index * 0.14))
        cx, cy = round(643 * 0.5), round(643 * 0.55)
        draw.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), outline=colors["cover_ring"], width=6)
    if theme != "vinyl-player":
        label(draw, (321, 335), "COVER ART", font("english", 32), colors["cover_text"], anchor="ms")
    return art


def scroll_center_index(lyrics: list[dict], seconds: float) -> float:
    if not lyrics:
        return 0.0
    times = [parse_time(line.get("time", 0)) for line in lyrics]
    if seconds <= times[0]:
        return 0.0
    target = 0
    for index in range(1, len(times)):
        if times[index] <= seconds:
            target = index
        else:
            break
    if target == 0:
        return 0.0
    transition_start = times[target]
    if transition_start <= times[target - 1]:
        return float(target)
    progress = max(0.0, min(1.0, (seconds - transition_start) / 0.3))
    eased = 1 - (1 - progress) ** 3
    return target - 1 + eased


class FrameRenderer:
    def __init__(self, project: dict, duration: float, use_video: bool, *, external_vinyl_art: bool = False):
        self.project = project
        self.duration = duration
        self.use_video = use_video
        self.external_vinyl_art = external_vinyl_art
        self.lyrics = sorted(project.get("lyrics", []), key=lambda line: parse_time(line.get("time", 0)))
        self.colors = THEME_PALETTES.get(project.get("theme"), THEME_PALETTES["paper"])
        self.base = self._make_base()

    def _make_base(self) -> Image.Image:
        if self.project.get("theme") == "vinyl-player":
            return self._make_vinyl_base()
        if self.project.get("theme") == "flow-player":
            return self._make_player_base()
        image = Image.new("RGBA", (WIDTH, HEIGHT), self.colors["background"])
        draw = ImageDraw.Draw(image)
        if self.project.get("theme") == "rainy-night":
            glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
            glow_draw = ImageDraw.Draw(glow)
            glow_draw.ellipse((720, -230, 1950, 1000), fill=(91, 172, 230, 54))
            glow_draw.ellipse((-220, -300, 850, 880), fill=(93, 194, 239, 38))
            image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(105)))
            draw = ImageDraw.Draw(image)
        for x in range(0, WIDTH + 1, 32):
            draw.line((x, 0, x, HEIGHT), fill=self.colors["grid"], width=1)
        for y in range(0, HEIGHT + 1, 32):
            draw.line((0, y, WIDTH, y), fill=self.colors["grid"], width=1)
        panel = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        ImageDraw.Draw(panel).rectangle((54, 48, 1866, 1032), fill=self.colors["panel"])
        image = Image.alpha_composite(image, panel)
        draw = ImageDraw.Draw(image)
        draw.line((790, 48, 790, 1032), fill=self.colors["panel_line"], width=1)
        label(draw, (92, 112), "NOW PLAYING", font("sans_bold", 27), self.colors["heading"])
        label(draw, (735, 112), "TRACK 01", font("sans_bold", 27), self.colors["heading"], anchor="rs")

        if self.use_video:
            image.paste((0, 0, 0, 0), (92, 145, 735, 788))
        else:
            artwork = cover_image(self.project.get("coverData", "")) or placeholder_art(self.project.get("theme", "paper"))
            image.alpha_composite(artwork, (92, 145))
        draw = ImageDraw.Draw(image)
        draw.rectangle((91, 144, 735, 788), outline=self.colors["cover_border"], width=2)
        label(draw, (92, 836), self.project.get("album") or "歌回切片", font("sans_bold", 23), self.colors["album"], 643)
        label(draw, (92, 910), self.project.get("title") or "未命名歌曲", font("serif", 64), self.colors["title"], 643)
        label(draw, (92, 958), self.project.get("artist") or "未填写主播", font("sans", 32), self.colors["artist"], 643)
        label(draw, (92, 994), self.project.get("tags") or "", font("sans", 22), self.colors["tags"], 643)
        draw.polygon(((94, 1022), (111, 1012), (111, 1032)), outline=self.colors["transport"])
        draw.rectangle((132, 1016, 135, 1031), fill=self.colors["transport"])
        draw.rectangle((141, 1016, 144, 1031), fill=self.colors["transport"])
        draw.polygon(((165, 1012), (165, 1032), (182, 1022)), outline=self.colors["transport"])
        draw.rectangle((92, 1044, 735, 1047), fill=self.colors["progress_base"])

        scrolling = self.project.get("lyricDisplay") == "scroll"
        label(draw, (842, 105), "LYRIC SCROLL" if scrolling else "LYRIC CHRONOLOGY", font("english", 21), self.colors["eyebrow"])
        label(draw, (842, 170), "歌词滚动" if scrolling else "歌词时间线", font("serif", 52), self.colors["secondary"])
        label(draw, (1810, 169), f"{len(self.lyrics)} LINES", font("english", 25), self.colors["muted"], anchor="rs")
        draw.line((842, 196, 1810, 196), fill=self.colors["line"], width=1)
        draw.line((842, 1000, 1810, 1000), fill=self.colors["line"], width=1)
        label(draw, (842, 1038), self.project.get("description") or self.project.get("album") or "", font("sans_bold", 23), self.colors["muted"], 630)
        label(draw, (1810, 1038), self.project.get("footer") or "", font("english", 20), self.colors["muted"], 320, anchor="rs")
        return image

    def _make_vinyl_base(self) -> Image.Image:
        colors = self.project.get("vinylBackgroundColors")
        if not (isinstance(colors, list) and len(colors) == 3 and all(
                isinstance(value, str) and len(value) == 7 and value.startswith("#") for value in colors)):
            colors = ["#102553", "#183d79", "#5b71bd"]
        image = None
        if self.project.get("vinylBackgroundMode") == "custom-image":
            data_uri = self.project.get("vinylBackgroundData", "")
            if data_uri and "," in data_uri:
                try:
                    raw = base64.b64decode(data_uri.split(",", 1)[1], validate=True)
                    with Image.open(io.BytesIO(raw)) as source:
                        image = ImageOps.fit(source.convert("RGBA"), (WIDTH, HEIGHT), Image.Resampling.LANCZOS)
                    image = Image.alpha_composite(image, Image.new("RGBA", (WIDTH, HEIGHT), (5, 13, 29, 59)))
                except (ValueError, OSError):
                    image = None
        if image is None:
            stops = [ImageColor.getrgb(value) for value in colors]
            low = Image.new("RGBA", (480, 270))
            pixels = low.load()
            for y in range(270):
                for x in range(480):
                    position = ((x / 479) * WIDTH * WIDTH + (y / 269) * HEIGHT * HEIGHT) / (WIDTH * WIDTH + HEIGHT * HEIGHT)
                    if position <= .56:
                        first, second, part = stops[0], stops[1], position / .56
                    else:
                        first, second, part = stops[1], stops[2], (position - .56) / .44
                    pixels[x, y] = tuple(round(a + (b - a) * part) for a, b in zip(first, second)) + (255,)
            image = low.resize((WIDTH, HEIGHT), Image.Resampling.BILINEAR)

        disc = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        d = ImageDraw.Draw(disc)
        d.ellipse((294, 254, 806, 766), fill=(3, 8, 19, 84))
        d.ellipse((303, 263, 797, 757), fill="#111724")
        d.ellipse((310, 270, 790, 750), fill="#10141d")
        for index in range(47):
            radius = round(166 + index * 1.62)
            d.ellipse((550-radius, 510-radius, 550+radius, 510+radius),
                      outline=(167, 191, 226, 26 if index % 4 == 0 else 12), width=1)
        image.alpha_composite(disc)
        art = cover_image(self.project.get("coverData", ""))
        if art is None:
            art = placeholder_art("vinyl-player")
        art = art.resize((300, 300), Image.Resampling.LANCZOS)
        self._vinyl_art = art
        mask = Image.new("L", (300, 300), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, 299, 299), fill=255)
        if self.use_video or self.external_vinyl_art:
            transparent = Image.new("RGBA", (300, 300), (0, 0, 0, 0))
            image.paste(transparent, (400, 360), mask)
        else:
            image.paste(art, (400, 360), mask)
        draw = ImageDraw.Draw(image)
        draw.ellipse((399, 359, 701, 661), outline=(241, 230, 208, 188), width=5)
        draw.line(((448, 185), (610, 300), (735, 327)), fill="#e7e9ed", width=17, joint="curve")
        draw.ellipse((430, 167, 466, 203), fill="#dce1e9")
        draw.ellipse((440, 177, 456, 193), fill="#1c2536")
        draw.rectangle((728, 314, 768, 341), fill="#f6f7f8")
        label(draw, (1055, 170), self.project.get("title") or "未命名歌曲", font("sans_bold", 48), self.colors["title"], 670)
        label(draw, (1058, 220), self.project.get("artist") or "未填写主播", font("sans", 25), self.colors["artist"], 665)
        label(draw, (1058, 258), self.project.get("album") or "歌回切片", font("sans", 20), self.colors["album"], 670)
        draw.rectangle((110, 946, 1810, 949), fill=(244, 249, 255, 102))
        draw.polygon(((876, 994), (854, 1008), (876, 1022)), fill=(255, 250, 244, 230))
        draw.rectangle((850, 995, 854, 1022), fill=(255, 250, 244, 230))
        draw.ellipse((927, 975, 993, 1041), fill="#fffaf4")
        draw.rectangle((950, 993, 957, 1023), fill="#223657")
        draw.rectangle((964, 993, 971, 1023), fill="#223657")
        draw.polygon(((1044, 994), (1066, 1008), (1044, 1022)), fill=(255, 250, 244, 230))
        draw.rectangle((1067, 995, 1071, 1022), fill=(255, 250, 244, 230))
        label(draw, (110, 1022), self.project.get("footer") or "", font("sans", 18), (238, 246, 255, 148), 500)
        return image

    def _make_player_base(self) -> Image.Image:
        if self.use_video:
            # The preview washes its blurred video backdrop before painting the sharp artwork.
            # This single static overlay adds the same diagonal wash while the artwork hole stays clear.
            wash = Image.new("RGBA", (480, 270))
            pixels = wash.load()
            stops = ((160, 98, 127, 107), (63, 48, 62, 77), (28, 33, 42, 153))
            for y in range(270):
                for x in range(480):
                    position = (x / 479 + y / 269) / 2
                    if position < 0.52:
                        first, second, amount = stops[0], stops[1], position / 0.52
                    else:
                        first, second, amount = stops[1], stops[2], (position - 0.52) / 0.48
                    pixels[x, y] = tuple(round(a + (b - a) * amount) for a, b in zip(first, second))
            image = wash.resize((WIDTH, HEIGHT), Image.Resampling.BILINEAR)
        else:
            artwork = cover_image(self.project.get("coverData", ""))
            if artwork is None:
                artwork = placeholder_art("flow-player")
            ambient = ImageOps.fit(artwork, (WIDTH, HEIGHT), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(45))
            tint = Image.new("RGBA", (WIDTH, HEIGHT), (41, 31, 43, 148))
            image = Image.alpha_composite(ambient, tint)
            wash = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
            wd = ImageDraw.Draw(wash)
            wd.rectangle((0, 0, WIDTH, HEIGHT), fill=(86, 53, 75, 45))
            image = Image.alpha_composite(image, wash)

        artwork = cover_image(self.project.get("coverData", "")) or placeholder_art("flow-player")
        draw = ImageDraw.Draw(image)
        if self.use_video:
            image.paste((0, 0, 0, 0), (94, 126, 654, 686))
        else:
            artwork = artwork.resize((560, 560), Image.Resampling.LANCZOS)
            image.alpha_composite(artwork, (94, 126))
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((93, 125, 655, 687), radius=12, outline=self.colors["cover_border"], width=2)
        label(draw, (96, 730), self.project.get("title") or "未命名歌曲", font("sans_bold", 22), self.colors["title"], 560)
        label(draw, (96, 762), self.project.get("artist") or "未填写主播", font("sans", 18), self.colors["artist"], 370)
        label(draw, (654, 762), self.project.get("album") or "歌回切片 / SIDE A", font("sans_bold", 17), self.colors["album"], 270, anchor="rs")
        draw.rectangle((96, 820, 654, 823), fill=(255, 255, 255, 95))
        draw.rectangle((176, 850, 180, 872), fill=(255, 255, 255, 225))
        draw.polygon(((214, 849), (192, 860), (214, 871)), fill=(255, 255, 255, 225))
        draw.ellipse((331, 831, 389, 889), fill=(255, 248, 244, 245))
        draw.polygon(((354, 847), (354, 873), (373, 860)), fill="#403541")
        draw.polygon(((508, 849), (530, 860), (508, 871)), fill=(255, 255, 255, 235))
        draw.rectangle((542, 850, 546, 872), fill=(255, 255, 255, 235))
        draw.rectangle((96, 950, 654, 954), fill=(255, 255, 255, 120))
        label(draw, (96, 1030), self.project.get("footer") or "", font("sans_bold", 14), (255, 255, 255, 210), 520)
        if self.use_video:
            image.paste((0, 0, 0, 0), (94, 126, 654, 686))
            ImageDraw.Draw(image).rounded_rectangle((93, 125, 655, 687), radius=12, outline=self.colors["cover_border"], width=2)
        return image

    def render(self, seconds: float) -> Image.Image:
        image = self.base.copy()
        draw = ImageDraw.Draw(image)
        if self.project.get("theme") == "vinyl-player":
            if not self.use_video and not self.external_vinyl_art:
                period = vinyl_seconds_per_turn(self.project.get("vinylSecondsPerTurn"))
                degrees = -360 * ((max(0, seconds) % period) / period)
                rotated = self._vinyl_art.rotate(degrees, resample=Image.Resampling.BICUBIC)
                mask = Image.new("L", (300, 300), 0)
                ImageDraw.Draw(mask).ellipse((3, 3, 296, 296), fill=255)
                image.paste(rotated, (400, 360), mask)
                draw = ImageDraw.Draw(image)
            progress = max(0, min(1, seconds / max(self.duration, 1)))
            draw.rectangle((110, 946, 110 + round(1700 * progress), 949), fill=self.colors["progress"])
            x = 110 + round(1700 * progress)
            draw.ellipse((x - 7, 940, x + 7, 954), fill=self.colors["progress"])
            label(draw, (110, 922), format_time(seconds), font("time", 20), self.colors["muted"])
            label(draw, (1810, 922), format_time(self.duration), font("time", 20), self.colors["muted"], anchor="rs")
            self._draw_vinyl_lyrics(image, seconds)
            return image
        if self.project.get("theme") == "flow-player":
            progress = max(0, min(1, seconds / max(self.duration, 1)))
            draw.rectangle((96, 820, 96 + round(558 * progress), 823), fill=(255, 255, 255, 245))
            label(draw, (96, 810), format_time(seconds), font("time", 18), self.colors["muted"])
            label(draw, (654, 810), "−" + format_time(max(0, self.duration - seconds)), font("time", 18), self.colors["muted"], anchor="rs")
            draw.rectangle((96, 950, 96 + round(558 * progress), 954), fill=(255, 255, 255, 245))
            draw.ellipse((88 + round(558 * progress), 944, 104 + round(558 * progress), 960), fill=(255, 255, 255, 240))
            self._draw_player_lyrics(image, seconds)
            return image
        label(draw, (284, 1031), format_time(seconds) + " / " + format_time(self.duration), font("time", 22), self.colors["muted"])
        progress = max(0, min(1, seconds / max(self.duration, 1)))
        draw.rectangle((92, 1044, 92 + round(643 * progress), 1047), fill=self.colors["progress"])

        if not self.lyrics:
            label(draw, (842, 284), "歌词会按照时间出现在这里", font("sans", 30), self.colors["empty"])
            return image
        selected = -1
        for index, line in enumerate(self.lyrics):
            if parse_time(line.get("time", 0)) <= seconds + 0.02:
                selected = index
            else:
                break
        selected = max(0, selected)
        if self.project.get("lyricDisplay") == "scroll":
            self._draw_scrolling_lyrics(image, seconds, selected)
        else:
            start = max(0, min(len(self.lyrics) - 8, selected - 3))
            for index, line in enumerate(self.lyrics[start:start + 8]):
                y = 240 + index * 88
                active = start + index == selected
                if active:
                    draw.rectangle((830, y - 27, 1824, y + 49), fill=self.colors["active_background"])
                    draw.rectangle((830, y - 27, 834, y + 49), fill=self.colors["active_accent"])
                label(draw, (850, y + 5), format_time(parse_time(line.get("time", 0))), font("time", 21), self.colors["active_time"] if active else self.colors["idle_time"])
                label(draw, (1000, y + 3), line.get("text") or "（空白歌词）", font("sans_bold" if active else "sans", 30), self.colors["active_text"] if active else self.colors["idle_text"], 750)
                if line.get("translation"):
                    label(draw, (1000, y + 32), line["translation"], font("serif", 20), self.colors["active_translation"] if active else self.colors["idle_translation"], 760)
                draw.line((842, y + 55, 1810, y + 55), fill=self.colors["lyric_line"], width=1)
        return image

    def _draw_vinyl_lyrics(self, image: Image.Image, seconds: float) -> None:
        draw = ImageDraw.Draw(image)
        if not self.lyrics:
            label(draw, (1058, 557), "导入歌词后，会在这里逐句浮现", font("sans", 30), self.colors["empty"])
            return
        selected = max(0, sum(parse_time(line.get("time", 0)) <= seconds + .02 for line in self.lyrics) - 1)
        scrolling = self.project.get("lyricDisplay") == "scroll"
        center = scroll_center_index(self.lyrics, seconds) if scrolling else float(selected)
        first = math.floor(center)
        fraction = center - first
        for offset in range(-3, 4):
            index = first + offset
            if not 0 <= index < len(self.lyrics):
                continue
            line = self.lyrics[index]
            y = round(555 + (offset - fraction) * 88)
            if not 300 <= y <= 817:
                continue
            active = index == selected
            edge = max(0, min(1, (y - 300) / 85, (817 - y) / 85))
            entering = max(0, min(1, center - selected + 1)) if active and scrolling and selected > 0 else 1
            alpha = round(255 * edge * (entering if active else max(.16, .52 - abs(index - center) * .1)))
            size = 36 if active else 29
            color = ImageColor.getrgb(self.colors["active_text"] if active else self.colors["idle_text"])
            label(draw, (1058, y), line.get("text") or "（空白歌词）", font("sans_bold" if active else "sans", size), (*color, alpha), 650)
            if line.get("translation"):
                tone = ImageColor.getrgb(self.colors["active_translation"] if active else self.colors["idle_translation"])
                label(draw, (1060, y + 30), line["translation"], font("sans", 20), (*tone, alpha), 650)

    def _draw_player_lyrics(self, image: Image.Image, seconds: float) -> None:
        if not self.lyrics:
            label(ImageDraw.Draw(image), (810, 520), "导入歌词后，会在这里逐句浮现", font("sans", 34), self.colors["empty"])
            return
        selected = -1
        for index, line in enumerate(self.lyrics):
            if parse_time(line.get("time", 0)) <= seconds + 0.02:
                selected = index
            else:
                break
        center = scroll_center_index(self.lyrics, seconds) if self.project.get("lyricDisplay") == "scroll" else float(selected)
        active_progress = max(0.0, min(1.0, center - selected + 1)) if self.project.get("lyricDisplay") == "scroll" and selected > 0 else 1.0
        base = math.floor(center)
        fraction = center - base if self.project.get("lyricDisplay") == "scroll" else 0
        overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        for offset in range(-3, 4):
            index = base + offset
            if index < 0 or index >= len(self.lyrics):
                continue
            line = self.lyrics[index]
            y = round(520 + (offset - fraction) * 148)
            distance = abs(offset - fraction)
            active = index == selected
            color = self.colors["active_text"] if active else self.colors["idle_text"]
            alpha = 255 if active else round(max(.13, 1 - distance * .25) * 255)
            font_size = 39 if active else 33
            lyric_font = font("sans_bold" if active else "sans", font_size)
            text = fit_text(line.get("text") or "（空白歌词）", lyric_font, 950)
            trans_color = self.colors["active_translation"] if active else self.colors["idle_translation"]
            trans_font = font("sans", 21 if active else 18)
            if not active:
                # Each neighboring line receives a subtle soft edge; the sharp active line remains dominant.
                line_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
                ld = ImageDraw.Draw(line_layer)
                ld.text((810, y), text, font=lyric_font, fill=(*ImageColor.getrgb(color), alpha), anchor="ls")
                if line.get("translation"):
                    ld.text((812, y + 38), fit_text(line["translation"], trans_font, 950), font=trans_font, fill=(*ImageColor.getrgb(trans_color), alpha), anchor="ls")
                overlay.alpha_composite(line_layer.filter(ImageFilter.GaussianBlur(min(5, distance * 1.35))))
            else:
                active_alpha = round(255 * active_progress)
                draw.rounded_rectangle((785, y - 57, 1840, y + 60), radius=10, fill=(255, 255, 255, round(20 * active_progress)))
                draw.text((810, y), text, font=lyric_font, fill=(*ImageColor.getrgb(color), active_alpha), anchor="ls")
                if line.get("translation"):
                    draw.text((812, y + 38), fit_text(line["translation"], trans_font, 950), font=trans_font, fill=(*ImageColor.getrgb(trans_color), active_alpha), anchor="ls")
        fade = Image.new("L", image.size, 0)
        fade_draw = ImageDraw.Draw(fade)
        for y in range(260, 980):
            alpha = max(0.0, min(1.0, (y - 260) / 180, (980 - y) / 180))
            fade_draw.line((760, y, WIDTH, y), fill=round(alpha * 255))
        overlay.putalpha(ImageChops.multiply(overlay.getchannel("A"), fade))
        image.alpha_composite(overlay)

    def _draw_scrolling_lyrics(self, image: Image.Image, seconds: float, selected: int) -> None:
        overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        center = scroll_center_index(self.lyrics, seconds)
        active_progress = max(0.0, min(1.0, center - selected + 1)) if selected > 0 else 1.0
        first = max(0, math.floor(center) - 5)
        last = min(len(self.lyrics) - 1, math.ceil(center) + 5)
        for index in range(first, last + 1):
            line = self.lyrics[index]
            y = round(600 + (index - center) * 88)
            active = index == selected
            if active:
                draw.rectangle((830, y - 27, 1824, y + 49), fill=self.colors["active_background"])
                draw.rectangle((830, y - 27, 834, y + 49), fill=self.colors["active_accent"])
            label(draw, (850, y + 5), format_time(parse_time(line.get("time", 0))), font("time", 21), self.colors["active_time"] if active else self.colors["idle_time"])
            label(draw, (1000, y + 3), line.get("text") or "（空白歌词）", font("sans_bold" if active else "sans", 30), self.colors["active_text"] if active else self.colors["idle_text"], 750)
            if line.get("translation"):
                label(draw, (1000, y + 32), line["translation"], font("serif", 20), self.colors["active_translation"] if active else self.colors["idle_translation"], 760)
            draw.line((842, y + 55, 1810, y + 55), fill=self.colors["lyric_line"], width=1)

        fade = Image.new("L", image.size, 0)
        fade_draw = ImageDraw.Draw(fade)
        top, bottom = 212, 990
        for y in range(top, bottom):
            alpha = max(0.0, min(1.0, (y - top) / 150, (bottom - y) / 150))
            fade_draw.line((830, y, 1824, y), fill=round(alpha * 255))
        active_fade = Image.new("L", image.size, 255)
        if selected > 0 and active_progress < 1:
            active_y = round(600 + (selected - center) * 88)
            ImageDraw.Draw(active_fade).rectangle((830, active_y - 28, 1824, active_y + 56), fill=round(active_progress * 255))
        alpha = ImageChops.multiply(overlay.getchannel("A"), fade)
        overlay.putalpha(ImageChops.multiply(alpha, active_fade))
        image.alpha_composite(overlay)
