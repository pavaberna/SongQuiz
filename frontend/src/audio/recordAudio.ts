const AUDIO_MIME_TYPE = "audio/webm";

export async function recordAudio(durationMs: number): Promise<Blob> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Audio recording is not supported by this browser.");
  }

  if (
    typeof MediaRecorder === "undefined" ||
    !MediaRecorder.isTypeSupported(AUDIO_MIME_TYPE)
  ) {
    throw new Error("WebM audio recording is not supported.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  try {
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: AUDIO_MIME_TYPE,
    });

    return await new Promise<Blob>((resolve, reject) => {
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      recorder.addEventListener(
        "stop",
        () => {
          if (chunks.length === 0) {
            reject(new Error("No audio was recorded."));
            return;
          }
          resolve(new Blob(chunks, { type: AUDIO_MIME_TYPE }));
        },
        { once: true },
      );

      recorder.addEventListener(
        "error",
        () => reject(new Error("Audio recording failed.")),
        { once: true },
      );

      recorder.start();
      window.setTimeout(() => recorder.stop(), durationMs);
    });
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}
