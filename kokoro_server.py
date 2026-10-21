
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import io
import soundfile as sf
from kokoro import KPipeline

pipeline = KPipeline(lang_code="a")


class TTSHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
     self.send_response(204)
     self.send_header("Access-Control-Allow-Origin", "http://localhost:5173")
     self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
     self.send_header("Access-Control-Allow-Headers", "Content-Type")
     self.end_headers()

    def do_POST(self):
        if self.path != "/tts":
            self.send_error(404)
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            text = body.get("text", "").strip()

            if not text:
                self.send_error(400, "Text is required")
                return

            audio_buffer = io.BytesIO()

            for _, _, audio in pipeline(text, voice="af_heart"):
                sf.write(audio_buffer, audio, 24000, format="WAV")
                break

            audio_buffer.seek(0)
            audio_data = audio_buffer.read()

            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(audio_data)))
            self.send_header("Access-Control-Allow-Origin", "http://localhost:5173")
            self.end_headers()
            self.wfile.write(audio_data)

        except Exception as error:
            print("TTS error:", error)
            self.send_error(500, "Audio generation failed")

    def log_message(self, format, *args):
        print(*args)


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 5001), TTSHandler)
    print("Kokoro TTS running at http://127.0.0.1:5001")
    server.serve_forever()
