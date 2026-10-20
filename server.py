"""Local song-cut editor and offline FFmpeg composition service."""

from __future__ import annotations

import atexit
import json
import math
import os
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading
import time as clock
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote, urlparse


ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from renderer import FrameRenderer, parse_time, vinyl_seconds_per_turn
from direct_video import direct_video_command, write_ass

JOBS: dict[str, dict] = {}
JOBS_LOCK = threading.Lock()
KNOWN_FFMPEG = [
    Path(r"C:\Program Files\Shutter Encoder\app\Library\ffmpeg.exe"),
    Path(r"C:\Program Files (x86)\Lenovo\LegionZone\2.0.29.9292\SEGamingAI\services\editor\ffmpeg.exe"),
]


def find_ffmpeg() -> str | None:
    configured = os.environ.get("SONGCUT_FFMPEG")
    if configured and Path(configured).is_file():
        return configured
    found = shutil.which("ffmpeg")
    if found:
        return found
    return next((str(path) for path in KNOWN_FFMPEG if path.is_file()), None)


@lru_cache(maxsize=4)
def ffmpeg_supports_ass(ffmpeg: str) -> bool:
    try:
        result = subprocess.run(
            [ffmpeg, "-hide_banner", "-filters"], capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=10,
        )
        return result.returncode == 0 and any(
            len(parts := line.split()) > 1 and parts[1] == "ass"
            for line in result.stdout.splitlines()
        )
    except (OSError, subprocess.TimeoutExpired):
        return False


def probe_video_source(path: Path, ffmpeg: str) -> tuple[int, int]:
    executable = Path(ffmpeg)
    sibling = executable.with_name("ffprobe.exe" if executable.suffix.lower() == ".exe" else "ffprobe")
    ffprobe = str(sibling) if sibling.is_file() else shutil.which("ffprobe")
    if not ffprobe:
        raise ValueError("当前 FFmpeg 缺少 ffprobe，无法检查导入视频")
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    try:
        result = subprocess.run(
            [ffprobe, "-v", "error", "-select_streams", "v:0", "-show_entries",
             "stream=width,height", "-of", "json", str(path)],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
            timeout=20, creationflags=flags,
        )
        streams = json.loads(result.stdout).get("streams", []) if result.returncode == 0 else []
        width = int(streams[0].get("width", 0)) if streams else 0
        height = int(streams[0].get("height", 0)) if streams else 0
        if width <= 0 or height <= 0:
            raise ValueError("导入的素材没有可用的视频画面，请重新选择视频文件")
        decoded = subprocess.run(
            [ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(path),
             "-map", "0:v:0", "-frames:v", "1", "-f", "null", os.devnull],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
            timeout=20, creationflags=flags,
        )
        if decoded.returncode != 0:
            raise ValueError("导入的视频无法解码，请换一个可正常播放的视频文件")
        return width, height
    except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError, TypeError, ValueError) as exc:
        if isinstance(exc, ValueError) and str(exc).startswith("导入"):
            raise
        raise ValueError("视频检查失败，请确认文件完整且格式可播放") from exc


def write_manifest(job_path: Path, times: list[float], duration: float) -> Path:
    lines = ["ffconcat version 1.0"]
    for index, time in enumerate(times):
        next_time = times[index + 1] if index + 1 < len(times) else duration
        lines.append(f"file 'frames/{index:06d}.png'")
        lines.append(f"duration {next_time - time:.6f}")
    lines.append(f"file 'frames/{len(times) - 1:06d}.png'")
    path = job_path / "manifest.ffconcat"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def compose_command(job: dict, ffmpeg: str) -> list[str]:
    path = job["path"]
    source = job["source"]
    command = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-safe", "0", "-f", "concat", "-i", str(path / "manifest.ffconcat"),
        "-i", str(source),
    ]
    if job["use_video"]:
        placement = job["placement"]
        width = max(643, round(placement["dw"]))
        height = max(643, round(placement["dh"]))
        crop_x = min(width - 643, max(0, round(-placement["dx"])))
        crop_y = min(height - 643, max(0, round(-placement["dy"])))
        if job.get("project", {}).get("theme") == "flow-player":
            filters = (
                "[0:v]fps=30,format=rgba[art];"
                "[1:v]split=2[ambient_src][sharp_src];"
                "[ambient_src]scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,"
                "crop=1920:1080,boxblur=24:12,eq=brightness=-0.22:saturation=0.78,"
                "drawbox=color=0x392a3a@0.48:t=fill[ambient];"
                f"[sharp_src]scale={width}:{height}:flags=lanczos,setsar=1,"
                f"crop=643:643:{crop_x}:{crop_y},scale=560:560:flags=lanczos[sharp];"
                "[ambient][sharp]overlay=94:126[backdrop];"
                "[backdrop][art]overlay=0:0:shortest=1:format=auto,format=yuv420p[v]"
            )
        elif job.get("project", {}).get("theme") == "vinyl-player":
            period = vinyl_seconds_per_turn(job.get("project", {}).get("vinylSecondsPerTurn"))
            filters = (
                "[0:v]fps=30,format=rgba[art];"
                f"[1:v]scale={width}:{height}:flags=lanczos,setsar=1,"
                f"crop=643:643:{crop_x}:{crop_y},scale=300:300:flags=lanczos,setpts=PTS-STARTPTS,"
                f"rotate=2*PI*t/{period:g}:ow=300:oh=300:fillcolor=black,"
                "pad=1920:1080:400:360:black[base];"
                "[base][art]overlay=0:0:shortest=1:format=auto,format=yuv420p[v]"
            )
        else:
            filters = (
                "[0:v]fps=30,format=rgba[art];"
                f"[1:v]scale={width}:{height}:flags=lanczos,setsar=1,"
                f"crop=643:643:{crop_x}:{crop_y},"
                "pad=1920:1080:92:145:black[base];"
                "[base][art]overlay=0:0:shortest=1:format=auto,format=yuv420p[v]"
            )
    else:
        if job.get("project", {}).get("theme") == "vinyl-player":
            period = vinyl_seconds_per_turn(job.get("project", {}).get("vinylSecondsPerTurn"))
            command += ["-loop", "1", "-framerate", "30", "-i", str(path / "vinyl_art.png")]
            filters = (
                "[0:v]fps=30,format=rgba[art];"
                f"[2:v]fps=30,format=rgba,setpts=PTS-STARTPTS,rotate=2*PI*t/{period:g}:"
                "ow=300:oh=300:fillcolor=black,pad=1920:1080:400:360:black[cover];"
                "[cover][art]overlay=0:0:shortest=1:format=auto,format=yuv420p[v]"
            )
        else:
            filters = "[0:v]fps=30,format=yuv420p[v]"
    command += [
        "-filter_complex", filters,
        "-map", "[v]", "-map", "1:a:0?",
        "-c:v", "libx264", "-preset", "medium", "-crf", "16",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
        "-t", f"{job['duration']:.6f}", "-movflags", "+faststart",
        "-progress", "pipe:1", "-nostats", str(path / "output.mp4"),
    ]
    return command


def recording_command(job: dict, ffmpeg: str) -> list[str]:
    path = job["path"]
    return [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(path / "recording.webm"),
        "-map", "0:v:0", "-map", "0:a:0?",
        "-vf", "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart", "-progress", "pipe:1", "-nostats",
        str(path / "output.mp4"),
    ]


def clean_job_files(job: dict, keep_output: bool = False) -> None:
    path = job["path"]
    if keep_output:
        shutil.rmtree(path / "frames", ignore_errors=True)
        for name in ("source.media", "manifest.ffconcat", "recording.webm", "static.png", "vinyl_art.png", "lyrics.ass"):
            (path / name).unlink(missing_ok=True)
    else:
        shutil.rmtree(path, ignore_errors=True)


def cancel_job(job: dict) -> None:
    with job["lock"]:
        if job["state"] in {"done", "error", "cancelled", "delivered"}:
            return
        job["state"] = "cancelled"
        job["terminal_at"] = clock.monotonic()
        process = job.get("process")
        cleanup_now = not job.get("thread") and not job.get("uploading")
    if process and process.poll() is None:
        process.terminate()
    if cleanup_now:
        clean_job_files(job)


def shutdown_studio(server: ThreadingHTTPServer) -> None:
    with JOBS_LOCK:
        jobs = list(JOBS.values())
    for job in jobs:
        cancel_job(job)
    server.shutdown()


def attach_process(job: dict, process: subprocess.Popen) -> None:
    with job["lock"]:
        job["process"] = process
        cancelled = job["state"] == "cancelled"
    if cancelled and process.poll() is None:
        process.terminate()


def render_job(job: dict, ffmpeg: str) -> None:
    output_tail: list[str] = []
    try:
        if job["state"] == "cancelled":
            return
        external_vinyl_art = job["project"].get("theme") == "vinyl-player" and not job["use_video"]
        renderer = FrameRenderer(job["project"], job["duration"], job["use_video"],
                                 external_vinyl_art=external_vinyl_art)
        if external_vinyl_art:
            renderer._vinyl_art.save(job["path"] / "vinyl_art.png")
        for index, time in enumerate(job["times"]):
            if job["state"] == "cancelled":
                return
            renderer.render(time).save(job["path"] / "frames" / f"{index:06d}.png", compress_level=1)
            job["progress"] = 0.5 * (index + 1) / len(job["times"])
        write_manifest(job["path"], job["times"], job["duration"])
        with job["lock"]:
            if job["state"] == "cancelled":
                return
            job["state"] = "rendering"
        command = compose_command(job, ffmpeg)
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        process = subprocess.Popen(
            command, cwd=job["path"], stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, text=True, encoding="utf-8",
            errors="replace", creationflags=flags,
        )
        attach_process(job, process)
        for raw in process.stdout:
            line = raw.strip()
            output_tail.append(line)
            output_tail = output_tail[-8:]
            if line.startswith("out_time_us="):
                try:
                    job["progress"] = 0.5 + 0.5 * min(1, int(line.split("=", 1)[1]) / 1_000_000 / job["duration"])
                except ValueError:
                    pass
        result = process.wait()
        if result or not (job["path"] / "output.mp4").is_file():
            with job["lock"]:
                if job["state"] == "cancelled":
                    return
                job["state"] = "error"
                job["terminal_at"] = clock.monotonic()
                job["error"] = "FFmpeg 合成失败：" + " ".join(output_tail[-5:])[-700:]
        else:
            clean_job_files(job, keep_output=True)
            with job["lock"]:
                if job["state"] == "cancelled":
                    return
                job["progress"] = 1
                job["state"] = "done"
                job["terminal_at"] = clock.monotonic()
    except Exception as exc:
        with job["lock"]:
            if job["state"] != "cancelled":
                job["state"] = "error"
                job["terminal_at"] = clock.monotonic()
                job["error"] = "合成服务出错：" + str(exc)
    finally:
        with job["lock"]:
            job["process"] = None
            done = job["state"] == "done"
        if not done:
            clean_job_files(job)


def convert_recording_job(job: dict, ffmpeg: str) -> None:
    output_tail: list[str] = []
    try:
        if job["state"] == "cancelled":
            return
        command = recording_command(job, ffmpeg)
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        process = subprocess.Popen(
            command, cwd=job["path"], stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, text=True, encoding="utf-8",
            errors="replace", creationflags=flags,
        )
        attach_process(job, process)
        for raw in process.stdout:
            line = raw.strip()
            output_tail.append(line)
            output_tail = output_tail[-8:]
            if line.startswith("out_time_us="):
                try:
                    job["progress"] = min(1, int(line.split("=", 1)[1]) / 1_000_000 / job["duration"])
                except ValueError:
                    pass
        result = process.wait()
        if result or not (job["path"] / "output.mp4").is_file():
            with job["lock"]:
                if job["state"] == "cancelled":
                    return
                job["state"] = "error"
                job["terminal_at"] = clock.monotonic()
                job["error"] = "录制视频转换 MP4 失败：" + " ".join(output_tail[-5:])[-700:]
        else:
            clean_job_files(job, keep_output=True)
            with job["lock"]:
                if job["state"] == "cancelled":
                    return
                job["progress"] = 1
                job["state"] = "done"
                job["terminal_at"] = clock.monotonic()
    except Exception as exc:
        with job["lock"]:
            if job["state"] != "cancelled":
                job["state"] = "error"
                job["terminal_at"] = clock.monotonic()
                job["error"] = "录制视频转换出错：" + str(exc)
    finally:
        with job["lock"]:
            job["process"] = None
            done = job["state"] == "done"
        if not done:
            clean_job_files(job)


def render_direct_video_job(job: dict, ffmpeg: str) -> None:
    output_tail: list[str] = []
    try:
        if job["state"] == "cancelled":
            return
        FrameRenderer(job["project"], job["duration"], True).base.save(
            job["path"] / "static.png", compress_level=1,
        )
        if job["state"] == "cancelled":
            return
        write_ass(job["project"], job["duration"], job["path"] / "lyrics.ass")
        if job["state"] == "cancelled":
            return
        with job["lock"]:
            if job["state"] == "cancelled":
                return
            job["progress"] = 0.05
            job["state"] = "rendering"
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        process = subprocess.Popen(
            direct_video_command(job, ffmpeg), cwd=job["path"], stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
            creationflags=flags,
        )
        attach_process(job, process)
        for raw in process.stdout:
            line = raw.strip()
            output_tail.append(line)
            output_tail = output_tail[-8:]
            if line.startswith("out_time_us="):
                try:
                    job["progress"] = 0.05 + 0.95 * min(1, int(line.split("=", 1)[1]) / 1_000_000 / job["duration"])
                except ValueError:
                    pass
        result = process.wait()
        if result or not (job["path"] / "output.mp4").is_file():
            with job["lock"]:
                if job["state"] == "cancelled":
                    return
                job["state"] = "error"
                job["terminal_at"] = clock.monotonic()
                job["error"] = "60 帧视频直合失败：" + " ".join(output_tail[-5:])[-700:]
        else:
            clean_job_files(job, keep_output=True)
            with job["lock"]:
                if job["state"] == "cancelled":
                    return
                job["progress"] = 1
                job["state"] = "done"
                job["terminal_at"] = clock.monotonic()
    except Exception as exc:
        with job["lock"]:
            if job["state"] != "cancelled":
                job["state"] = "error"
                job["terminal_at"] = clock.monotonic()
                job["error"] = "视频直合服务出错：" + str(exc)
    finally:
        with job["lock"]:
            job["process"] = None
            done = job["state"] == "done"
        if not done:
            clean_job_files(job)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, code: int, payload: dict) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length < 1 or length > 32_000_000:
            raise ValueError("请求数据大小无效")
        value = json.loads(self.rfile.read(length))
        if not isinstance(value, dict):
            raise ValueError("请求格式无效")
        return value

    def _job(self, parts: list[str]) -> dict:
        if len(parts) < 3:
            raise ValueError("缺少合成任务编号")
        with JOBS_LOCK:
            job = JOBS.get(parts[2])
        if job is None:
            raise ValueError("合成任务不存在")
        return job

    def do_GET(self) -> None:
        parts = urlparse(self.path).path.strip("/").split("/")
        if parts == ["api", "status"]:
            return self._send_json(200, {"available": bool(find_ffmpeg()), "engine": "FFmpeg 60 帧视频直合 / 逐帧合成 / 浏览器实时录制"})
        if len(parts) == 4 and parts[:2] in (["api", "jobs"], ["api", "recordings"], ["api", "direct-video"]):
            try:
                job = self._job(parts)
                if parts[3] == "status":
                    return self._send_json(200, {
                        "state": job["state"], "progress": job["progress"],
                        "error": job.get("error", ""),
                    })
                if parts[3] == "download" and job["state"] == "done":
                    with job["lock"]:
                        if job["state"] != "done":
                            return self._send_json(410, {"error": "下载已过期，请重新合成"})
                        if job.get("downloading"):
                            return self._send_json(409, {"error": "视频正在下载"})
                        job["downloading"] = True
                    completed = False
                    try:
                        output = job["path"] / "output.mp4"
                        name = quote(job["filename"] + "-歌词视频.mp4")
                        self.send_response(200)
                        self.send_header("Content-Type", "video/mp4")
                        self.send_header("Content-Length", str(output.stat().st_size))
                        self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{name}")
                        self.end_headers()
                        with output.open("rb") as stream:
                            shutil.copyfileobj(stream, self.wfile)
                        completed = True
                    finally:
                        if completed:
                            with job["lock"]:
                                job["state"] = "delivered"
                            clean_job_files(job)
                            with JOBS_LOCK:
                                JOBS.pop(job["id"], None)
                        else:
                            with job["lock"]:
                                job["downloading"] = False
                    return
            except ValueError as exc:
                return self._send_json(404, {"error": str(exc)})
        if parts[0] == "api":
            return self._send_json(404, {"error": "接口不存在"})
        return super().do_GET()

    def do_POST(self) -> None:
        origin = self.headers.get("Origin", "")
        port = self.server.server_port
        if origin and origin not in {f"http://localhost:{port}", f"http://127.0.0.1:{port}"}:
            return self._send_json(403, {"error": "只允许本机页面调用合成服务"})
        parts = urlparse(self.path).path.strip("/").split("/")
        try:
            if parts == ["api", "shutdown"]:
                if origin not in {f"http://localhost:{port}", f"http://127.0.0.1:{port}"}:
                    return self._send_json(403, {"error": "只允许制作台页面关闭本机服务"})
                self._send_json(200, {"state": "stopping"})
                threading.Thread(target=shutdown_studio, args=(self.server,), daemon=True).start()
                return
            if parts == ["api", "jobs"]:
                return self._create_job()
            if parts == ["api", "recordings"]:
                return self._create_recording()
            if parts == ["api", "direct-video"]:
                return self._create_direct_video()
            if len(parts) >= 4 and parts[:2] == ["api", "jobs"]:
                job = self._job(parts)
                if parts[3] == "media" and len(parts) == 4:
                    return self._upload_media(job)
                if parts[3] == "finish" and len(parts) == 4:
                    return self._finish(job)
                if parts[3] == "cancel" and len(parts) == 4:
                    cancel_job(job)
                    return self._send_json(200, {"state": job["state"]})
            if len(parts) >= 4 and parts[:2] == ["api", "recordings"]:
                job = self._job(parts)
                if parts[3] == "chunk" and len(parts) == 4:
                    return self._append_recording_chunk(job)
                if parts[3] == "finish" and len(parts) == 4:
                    return self._finish_recording(job)
                if parts[3] == "cancel" and len(parts) == 4:
                    cancel_job(job)
                    return self._send_json(200, {"state": job["state"]})
            if len(parts) == 4 and parts[:2] == ["api", "direct-video"]:
                job = self._job(parts)
                if job.get("mode") != "direct-video":
                    raise ValueError("任务类型不匹配")
                if parts[3] == "media":
                    return self._upload_media(job)
                if parts[3] == "finish":
                    return self._finish_direct_video(job)
                if parts[3] == "cancel":
                    cancel_job(job)
                    return self._send_json(200, {"state": job["state"]})
            return self._send_json(404, {"error": "接口不存在"})
        except (ValueError, KeyError, TypeError) as exc:
            return self._send_json(400, {"error": str(exc)})
        except Exception as exc:
            return self._send_json(500, {"error": "本机服务出错：" + str(exc)})

    def _create_job(self) -> None:
        if not find_ffmpeg():
            raise ValueError("找不到 FFmpeg，请安装或设置 SONGCUT_FFMPEG")
        value = self._read_json()
        duration = float(value["duration"])
        times = [float(item) for item in value["times"]]
        if not 0 < duration <= 3600 or not 1 <= len(times) <= 25000:
            raise ValueError("歌曲时长或画面数量不在支持范围内")
        if times[0] != 0 or any(not math.isfinite(t) or t < 0 or t >= duration for t in times):
            raise ValueError("画面时间点无效")
        if any(right <= left for left, right in zip(times, times[1:])):
            raise ValueError("画面时间点必须递增")
        use_video = value.get("useVideo") is True
        project = value.get("project")
        if not isinstance(project, dict) or not isinstance(project.get("lyrics", []), list):
            raise ValueError("项目信息无效")
        placement = value.get("placement")
        if use_video and (not isinstance(placement, dict) or any(
            not math.isfinite(float(placement[key])) for key in ("dx", "dy", "dw", "dh")
        )):
            raise ValueError("视频位置无效")
        filename = "".join(ch for ch in str(value.get("filename", "歌切视频")) if ch not in '\\/:*?"<>|')[:60] or "歌切视频"
        job_id = secrets.token_hex(12)
        path = Path(tempfile.mkdtemp(prefix="songcut-"))
        (path / "frames").mkdir()
        job = {
            "id": job_id, "path": path, "duration": duration, "times": times,
            "use_video": use_video, "placement": placement, "project": project, "filename": filename,
            "state": "preparing", "progress": 0, "process": None,
            "lock": threading.Lock(), "thread": None, "uploading": False,
            "created_at": clock.monotonic(), "terminal_at": None,
        }
        with JOBS_LOCK:
            JOBS[job_id] = job
        self._send_json(200, {"id": job_id})

    def _create_recording(self) -> None:
        if not find_ffmpeg():
            raise ValueError("找不到 FFmpeg，无法把实时录制转换为 MP4")
        value = self._read_json()
        duration = float(value["duration"])
        if not math.isfinite(duration) or not 0 < duration <= 3600:
            raise ValueError("歌曲时长不在支持范围内")
        filename = "".join(ch for ch in str(value.get("filename", "歌切视频")) if ch not in '\\/:*?"<>|')[:60] or "歌切视频"
        job_id = secrets.token_hex(12)
        path = Path(tempfile.mkdtemp(prefix="songcut-record-"))
        (path / "recording.webm").touch()
        job = {
            "id": job_id, "path": path, "duration": duration, "filename": filename,
            "state": "recording", "progress": 0, "process": None,
            "lock": threading.Lock(), "thread": None, "uploading": False,
            "created_at": clock.monotonic(), "terminal_at": None,
        }
        with JOBS_LOCK:
            JOBS[job_id] = job
        self._send_json(200, {"id": job_id})

    def _create_direct_video(self) -> None:
        ffmpeg = find_ffmpeg()
        if not ffmpeg:
            raise ValueError("找不到 FFmpeg，请安装或设置 SONGCUT_FFMPEG")
        if not ffmpeg_supports_ass(ffmpeg):
            raise ValueError("当前 FFmpeg 缺少 ASS 歌词叠加功能，请更换支持 libass 的 FFmpeg")
        value = self._read_json()
        duration = float(value["duration"])
        if not math.isfinite(duration) or not 0 < duration <= 3600:
            raise ValueError("歌曲时长不在支持范围内")
        project = value.get("project")
        if value.get("useVideo") is not True or not isinstance(project, dict) or project.get("visualSource") != "video":
            raise ValueError("视频直合需要导入视频，并选择视频作为画面来源")
        if not isinstance(project.get("lyrics", []), list):
            raise ValueError("项目信息无效")
        for line in project.get("lyrics", []):
            if not isinstance(line, dict) or not re.fullmatch(r"\d+(?::\d{1,2}){0,2}(?:\.\d{1,3})?", str(line.get("time", ""))):
                raise ValueError("歌词时间格式无效，请检查时间戳")
            timestamp = parse_time(line["time"])
            if not math.isfinite(timestamp) or timestamp < 0 or timestamp >= duration:
                raise ValueError("歌词时间不能超出视频时长")
        placement = value.get("placement")
        if not isinstance(placement, dict):
            raise ValueError("视频位置无效")
        try:
            placement = {key: float(placement[key]) for key in ("dx", "dy", "dw", "dh")}
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError("视频位置无效") from exc
        if any(not math.isfinite(number) for number in placement.values()) or not 643 <= placement["dw"] <= 20000 or not 643 <= placement["dh"] <= 20000:
            raise ValueError("视频位置无效")
        filename = "".join(ch for ch in str(value.get("filename", "歌切视频")) if ch not in '\\/:*?"<>|')[:60] or "歌切视频"
        job_id = secrets.token_hex(12)
        path = Path(tempfile.mkdtemp(prefix="songcut-direct-"))
        job = {
            "id": job_id, "path": path, "duration": duration, "filename": filename,
            "mode": "direct-video", "project": project, "placement": placement,
            "use_video": True, "state": "preparing", "progress": 0, "process": None,
            "lock": threading.Lock(), "thread": None, "uploading": False,
            "created_at": clock.monotonic(), "terminal_at": None,
        }
        with JOBS_LOCK:
            JOBS[job_id] = job
        self._send_json(200, {"id": job_id})

    def _append_recording_chunk(self, job: dict) -> None:
        with job["lock"]:
            if job["state"] != "recording" or job["uploading"]:
                raise ValueError("录制任务已结束或片段仍在写入")
            job["uploading"] = True
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 64_000_000:
                raise ValueError("录制片段大小无效")
            remaining = length
            with (job["path"] / "recording.webm").open("ab") as stream:
                while remaining:
                    chunk = self.rfile.read(min(1024 * 1024, remaining))
                    if not chunk:
                        raise ValueError("录制片段上传中断")
                    stream.write(chunk)
                    remaining -= len(chunk)
            with job["lock"]:
                cancelled = job["state"] == "cancelled"
            if cancelled:
                raise ValueError("录制已停止")
            self._send_json(200, {"received": length})
        finally:
            with job["lock"]:
                job["uploading"] = False
                cancelled = job["state"] == "cancelled"
            if cancelled:
                clean_job_files(job)

    def _finish_recording(self, job: dict) -> None:
        with job["lock"]:
            recording = job["path"] / "recording.webm"
            if job["state"] != "recording" or job["uploading"] or not recording.is_file() or recording.stat().st_size == 0:
                raise ValueError("录制文件尚未完整写入")
            job["state"] = "converting"
            job["thread"] = threading.Thread(target=convert_recording_job, args=(job, find_ffmpeg()), daemon=True)
            job["thread"].start()
        self._send_json(200, {"state": "converting"})

    def _upload_media(self, job: dict) -> None:
        with job["lock"]:
            if job["state"] != "preparing" or job["uploading"]:
                raise ValueError("合成任务已经结束")
            job["uploading"] = True
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 8_000_000_000:
                raise ValueError("素材文件大小无效")
            source = job["path"] / "source.media"
            remaining = length
            with source.open("wb") as stream:
                while remaining:
                    chunk = self.rfile.read(min(1024 * 1024, remaining))
                    if not chunk:
                        raise ValueError("素材上传中断")
                    stream.write(chunk)
                    remaining -= len(chunk)
            with job["lock"]:
                cancelled = job["state"] == "cancelled"
                if not cancelled:
                    job["source"] = source
            if cancelled:
                raise ValueError("合成已停止")
            self._send_json(200, {"received": length})
        finally:
            with job["lock"]:
                job["uploading"] = False
                cancelled = job["state"] == "cancelled"
            if cancelled:
                clean_job_files(job)

    def _finish(self, job: dict) -> None:
        with job["lock"]:
            if job["state"] != "preparing" or "source" not in job:
                raise ValueError("请先上传素材")
            job["state"] = "drawing"
            job["thread"] = threading.Thread(target=render_job, args=(job, find_ffmpeg()), daemon=True)
            job["thread"].start()
        self._send_json(200, {"state": "drawing"})

    def _finish_direct_video(self, job: dict) -> None:
        with job["lock"]:
            if job["state"] != "preparing" or "source" not in job or job["uploading"]:
                raise ValueError("请先完整上传视频素材")
            job["state"] = "validating"
        try:
            probe_video_source(job["source"], find_ffmpeg())
        except ValueError as exc:
            with job["lock"]:
                if job["state"] != "cancelled":
                    job["state"] = "error"
                    job["terminal_at"] = clock.monotonic()
                    job["error"] = str(exc)
            clean_job_files(job)
            raise
        with job["lock"]:
            if job["state"] == "cancelled":
                raise ValueError("合成已停止")
            job["state"] = "preparing-overlay"
            job["thread"] = threading.Thread(
                target=render_direct_video_job, args=(job, find_ffmpeg()), daemon=True,
            )
            job["thread"].start()
        self._send_json(200, {"state": "preparing-overlay"})


class SingleInstanceServer(ThreadingHTTPServer):
    allow_reuse_address = False


def reap_stale_jobs() -> None:
    while True:
        clock.sleep(60)
        now = clock.monotonic()
        with JOBS_LOCK:
            jobs = list(JOBS.values())
        for job in jobs:
            with job["lock"]:
                state = job["state"]
                terminal_at = job.get("terminal_at")
                stale = (
                    state in {"done", "error", "cancelled"}
                    and terminal_at is not None and now - terminal_at > 900
                ) or (state in {"preparing", "recording"} and now - job["created_at"] > 1800)
                thread = job.get("thread")
                if not stale or job.get("uploading") or job.get("downloading") or (thread and thread.is_alive()):
                    continue
                job["state"] = "expired"
            with JOBS_LOCK:
                if JOBS.get(job["id"]) is job:
                    JOBS.pop(job["id"], None)
            clean_job_files(job)


def cleanup_jobs() -> None:
    with JOBS_LOCK:
        jobs = list(JOBS.values())
    for job in jobs:
        shutil.rmtree(job["path"], ignore_errors=True)


atexit.register(cleanup_jobs)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = SingleInstanceServer(("127.0.0.1", args.port), Handler)
    threading.Thread(target=reap_stale_jobs, daemon=True).start()
    print(f"歌切制作台已启动：http://localhost:{args.port}/", flush=True)
    print("视频可选择 60 帧视频直合、逐帧合成或浏览器实时录制。", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
