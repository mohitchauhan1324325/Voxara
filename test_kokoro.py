import soundfile as sf
from kokoro import KPipeline

pipeline = KPipeline(lang_code="a")

text = "Hello! Your task is complete. I hope you are having a great day."

for index, (graphemes, phonemes, audio) in enumerate(
    pipeline(text, voice="af_heart")
):
    sf.write("kokoro_test.wav", audio, 24000)
    print("Audio generated: kokoro_test.wav")
    break