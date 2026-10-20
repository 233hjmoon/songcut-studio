"""Stop this studio's local HTTP service from a desktop shortcut."""

from __future__ import annotations

import argparse
from urllib.request import Request, urlopen


def request_shutdown(port: int = 8765) -> bool:
    request = Request(
        f"http://127.0.0.1:{port}/api/shutdown",
        data=b"",
        headers={"Origin": f"http://localhost:{port}"},
        method="POST",
    )
    with urlopen(request, timeout=5) as response:
        return response.status == 200


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="关闭歌切制作台本机服务")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    try:
        if request_shutdown(args.port):
            print("歌切制作台已关闭。下次使用请重新打开歌切制作台。")
        else:
            print("关闭请求未成功，请检查制作台是否仍在运行。")
            raise SystemExit(1)
    except OSError:
        print("歌切制作台没有运行，或本机服务未响应。")
        raise SystemExit(1)
