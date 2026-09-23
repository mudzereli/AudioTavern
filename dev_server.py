"""Serve TTAGames locally without caching development assets."""

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description="Serve TTAGames without caching assets.")
    parser.add_argument("port", nargs="?", type=int, default=8000)
    port = parser.parse_args().port

    server = ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler)
    print(f"Serving TTAGames at http://localhost:{port}/ (cache disabled)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()