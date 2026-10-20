"""Cover framing should match the position selected in the editor."""

import base64
import io
import unittest

from PIL import Image

from renderer import FrameRenderer


def striped_cover() -> str:
    image = Image.new("RGB", (300, 300))
    for x in range(300):
        color = (240, 30, 30) if x < 100 else (30, 220, 30) if x < 200 else (30, 30, 240)
        for y in range(300):
            image.putpixel((x, y), color)
    output = io.BytesIO()
    image.save(output, "PNG")
    return "data:image/png;base64," + base64.b64encode(output.getvalue()).decode()


class CoverTransformTests(unittest.TestCase):
    def test_saved_cover_position_changes_exported_frame(self):
        cover = striped_cover()
        centered = FrameRenderer({"coverData": cover, "lyrics": []}, 3, False).render(0)
        shifted = FrameRenderer({"coverData": cover, "coverTransform": {"x": 1, "y": 0, "scale": 3}, "lyrics": []}, 3, False).render(0)
        self.assertEqual(centered.getpixel((414, 466))[:3], (30, 220, 30))
        self.assertEqual(shifted.getpixel((414, 466))[:3], (240, 30, 30))

    def test_cover_transform_applies_in_all_themes_without_changing_video_transform(self):
        cover = striped_cover()
        centers = {"paper": (414, 466), "rainy-night": (414, 466),
                   "flow-player": (374, 406), "vinyl-player": (550, 510)}
        for theme, center in centers.items():
            with self.subTest(theme=theme):
                project = {"theme": theme, "coverData": cover, "lyrics": [],
                           "videoTransform": {"x": -1, "y": 0, "scale": 3},
                           "coverTransform": {"x": 1, "y": 0, "scale": 3}}
                frame = FrameRenderer(project, 3, False).render(0)
                self.assertEqual(frame.getpixel(center)[:3], (240, 30, 30))


if __name__ == "__main__":
    unittest.main()
