"""Closing the studio must stop its own server and active export work."""

import http.client
import threading
import unittest
from pathlib import Path

import server
import close_studio


class FakeProcess:
    def __init__(self):
        self.terminated = False

    def poll(self):
        return None if not self.terminated else 0

    def terminate(self):
        self.terminated = True


class ShutdownTests(unittest.TestCase):
    def test_desktop_helper_closes_its_target_server(self):
        instance = server.SingleInstanceServer(("127.0.0.1", 0), server.Handler)
        thread = threading.Thread(target=instance.serve_forever, daemon=True)
        thread.start()
        try:
            self.assertTrue(close_studio.request_shutdown(instance.server_port))
            thread.join(3)
            self.assertFalse(thread.is_alive())
        finally:
            instance.shutdown()
            instance.server_close()

    def test_shutdown_endpoint_stops_server_and_export(self):
        process = FakeProcess()
        job = {
            "id": "shutdown-test", "path": Path(__file__).parent, "lock": threading.Lock(),
            "state": "encoding", "process": process, "thread": threading.current_thread(),
        }
        with server.JOBS_LOCK:
            server.JOBS[job["id"]] = job
        instance = server.SingleInstanceServer(("127.0.0.1", 0), server.Handler)
        thread = threading.Thread(target=instance.serve_forever, daemon=True)
        thread.start()
        try:
            client = http.client.HTTPConnection("127.0.0.1", instance.server_port, timeout=3)
            client.request("POST", "/api/shutdown", headers={
                "Origin": f"http://localhost:{instance.server_port}"})
            response = client.getresponse()
            self.assertEqual(response.status, 200)
            self.assertTrue(response.read())
            client.close()
            thread.join(3)
            self.assertFalse(thread.is_alive())
            self.assertEqual(job["state"], "cancelled")
            self.assertTrue(process.terminated)
        finally:
            instance.shutdown()
            instance.server_close()
            with server.JOBS_LOCK:
                server.JOBS.pop(job["id"], None)

    def test_shutdown_rejects_other_origin(self):
        instance = server.SingleInstanceServer(("127.0.0.1", 0), server.Handler)
        thread = threading.Thread(target=instance.serve_forever, daemon=True)
        thread.start()
        try:
            client = http.client.HTTPConnection("127.0.0.1", instance.server_port, timeout=3)
            client.request("POST", "/api/shutdown", headers={"Origin": "http://evil.example"})
            response = client.getresponse()
            self.assertEqual(response.status, 403)
            response.read()
            client.close()
            self.assertTrue(thread.is_alive())
        finally:
            instance.shutdown()
            instance.server_close()


if __name__ == "__main__":
    unittest.main()
