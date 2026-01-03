import http.server
import socketserver
import socket
import sys
import os

PORT = 8000  # 使用するポート番号

# ローカルLANのIPを取得
def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

local_ip = get_local_ip()
print(f"ローカルアクセス: http://localhost:{PORT}")
print(f"LANアクセス: http://{local_ip}:{PORT}")

# キャッシュを無効化するカスタムHandler
class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_head(self):
        """send_headをオーバーライドして、毎回最新のファイルを読み込む"""
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            for index in ["index.html", "index.htm"]:
                index_path = os.path.join(path, index)
                if os.path.exists(index_path):
                    path = index_path
                    break
        ctype = self.guess_type(path)
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None
        self.send_response(200)
        self.send_header("Content-type", ctype)
        self.end_headers()
        return f

Handler = NoCacheHTTPRequestHandler

# マルチスレッドTCPサーバーを起動してブロッキングを回避
class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True

with ThreadedTCPServer(("", PORT), Handler) as httpd:
    print("サーバーが起動しました。Ctrl+C または Enter で停止できます")
    import threading
    server_thread = threading.Thread(target=httpd.serve_forever)
    server_thread.daemon = True
    server_thread.start()

    try:
        input("Enterキーでサーバーを停止します...\n")
    except KeyboardInterrupt:
        print("\nCtrl+C が検出されました。サーバーを停止中...")
    finally:
        httpd.shutdown()
        httpd.server_close()
        print("サーバーは停止しました")
        sys.exit(0)
