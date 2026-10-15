"""Records a batch of clips with Kokoro in one go (model loaded once) and encodes small MP3s.
Called by tools/record.mjs:  python record_batch.py <clips.json> <voice> <speed>"""
import json, os, subprocess, sys, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro

clips_file, voice, speed = sys.argv[1], sys.argv[2], float(sys.argv[3])
home = os.path.expanduser("~/.cache/hyperframes/tts")
model, voices = os.path.join(home, "models", "kokoro-v1.0.onnx"), os.path.join(home, "voices", "voices-v1.0.bin")
if not os.path.exists(model):
    sys.exit("Kokoro model not found. Run once: npx hyperframes tts \"hello\"  (downloads it to ~/.cache/hyperframes/tts)")
k = Kokoro(model, voices)
clips = json.load(open(clips_file, encoding="utf-8"))
with tempfile.TemporaryDirectory() as tmp:
    wav = os.path.join(tmp, "c.wav")
    for i, c in enumerate(clips, 1):
        os.makedirs(os.path.dirname(c["out"]), exist_ok=True)
        samples, sr = k.create(c["text"], voice=voice, speed=speed, lang="en-us")
        sf.write(wav, samples, sr)
        # a little air before speech, even loudness across clips, mono 64 kbps
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav,
                        "-af", f"adelay={c['lead']},loudnorm=I=-18:TP=-2", "-ac", "1", "-ar", "44100",
                        "-c:a", "libmp3lame", "-b:a", "64k", c["out"]], check=True)
        print(f"  [{i}/{len(clips)}] {c['file']}", flush=True)
