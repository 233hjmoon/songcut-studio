"""Observable checks for the new vinyl layout in server exports."""

import base64
import io
import sys
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from direct_video import direct_video_command  # noqa: E402
from renderer import FrameRenderer  # noqa: E402
from server import compose_command  # noqa: E402


def image_data_uri(color: str) -> str:
    image = Image.new("RGB", (32, 18), color)
    stream = io.BytesIO()
    image.save(stream, "PNG")
    return "data:image/png;base64," + base64.b64encode(stream.getvalue()).decode()


def quadrant_data_uri() -> str:
    image = Image.new("RGB", (64, 64))
    for y in range(64):
        for x in range(64):
            image.putpixel((x, y), ((255, 0, 0) if x < 32 and y < 32 else
                                    (0, 255, 0) if x >= 32 and y < 32 else
                                    (0, 0, 255) if x < 32 else (255, 255, 0)))
    stream = io.BytesIO()
    image.save(stream, "PNG")
    return "data:image/png;base64," + base64.b64encode(stream.getvalue()).decode()


class VinylExportTests(unittest.TestCase):
    def test_video_is_visible_only_through_circular_record_label(self):
        project = {"theme": "vinyl-player", "lyrics": [], "vinylBackgroundMode": "video-color"}
        base = FrameRenderer(project, 3, True).base
        self.assertEqual(base.getpixel((600, 510))[3], 0)
        self.assertEqual(base.getpixel((550, 510))[3], 0)
        self.assertEqual(base.getpixel((400, 360))[3], 255)

    def test_cover_rotates_without_a_center_spindle(self):
        project = {"theme": "vinyl-player", "coverData": quadrant_data_uri(),
                   "vinylSecondsPerTurn": 40, "lyrics": []}
        renderer = FrameRenderer(project, 40, False)
        first = renderer.render(0)
        quarter = renderer.render(10)
        self.assertNotEqual(first.getpixel((625, 510)), quarter.getpixel((625, 510)))
        self.assertNotEqual(first.getpixel((550, 510))[:3], (19, 24, 33))

    def test_custom_image_is_used_as_full_background(self):
        project = {
            "theme": "vinyl-player", "lyrics": [], "vinylBackgroundMode": "custom-image",
            "vinylBackgroundData": image_data_uri("#dc4329"),
        }
        base = FrameRenderer(project, 3, False).base
        red, green, blue, _ = base.getpixel((1800, 70))
        self.assertGreater(red, 150)
        self.assertLess(green, 110)
        self.assertLess(blue, 110)

    def test_direct_video_targets_record_label_instead_of_old_square(self):
        project = {"theme": "vinyl-player", "visualSource": "video"}
        job = {
            "path": ROOT, "source": ROOT / "dummy.mp4", "project": project,
            "duration": 2.0, "placement": {"dx": 0, "dy": 0, "dw": 643, "dh": 643},
        }
        command = direct_video_command(job, "ffmpeg")
        graph = command[command.index("-filter_complex") + 1]
        self.assertIn("scale=300:300", graph)
        self.assertIn("pad=1920:1080:400:360", graph)
        self.assertIn("rotate=", graph)

    def test_30_fps_video_uses_adjustable_rotation(self):
        project = {"theme": "vinyl-player", "visualSource": "video", "vinylSecondsPerTurn": 52}
        job = {"path": ROOT, "source": ROOT / "dummy.mp4", "project": project,
               "duration": 2.0, "placement": {"dx": 0, "dy": 0, "dw": 643, "dh": 643}, "use_video": True}
        command = compose_command(job, "ffmpeg")
        graph = command[command.index("-filter_complex") + 1]
        self.assertIn("rotate=2*PI*t/52", graph)

    def test_cover_rotation_is_composited_by_ffmpeg(self):
        project = {"theme": "vinyl-player", "vinylSecondsPerTurn": 40, "lyrics": []}
        renderer = FrameRenderer(project, 1200, False, external_vinyl_art=True)
        self.assertEqual(renderer.render(0).getpixel((550, 510))[3], 0)
        job = {"path": ROOT, "source": ROOT / "dummy.mp3", "project": project,
               "duration": 1200.0, "use_video": False}
        command = compose_command(job, "ffmpeg")
        graph = command[command.index("-filter_complex") + 1]
        self.assertIn("vinyl_art.png", " ".join(command))
        self.assertIn("rotate=2*PI*t/40", graph)
        self.assertIn("[cover][art]overlay=0:0", graph)

    def test_diagonal_gradient_matches_canvas_projection(self):
        project = {"theme": "vinyl-player", "lyrics": [], "vinylBackgroundColors":
                   ["#000000", "#808080", "#ffffff"]}
        base = FrameRenderer(project, 3, False).base
        # Canvas createLinearGradient(0,0,1920,1080) puts the upper right
        # at 1920**2 / (1920**2 + 1080**2), not at the midpoint.
        red = base.getpixel((1850, 40))[0]
        self.assertGreater(red, 175)


if __name__ == "__main__":
    unittest.main()
