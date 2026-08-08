const AUDIO_MIME_TYPE = "audio/webm";

export async function recordAudio(
  durationMs: number,
  signal?: AbortSignal,
): Promise<Blob> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Audio recording is not supported by this browser.");
  }

  if (
    typeof MediaRecorder === "undefined" ||
    !MediaRecorder.isTypeSupported(AUDIO_MIME_TYPE)
  ) {
    throw new Error("WebM audio recording is not supported.");
  }

  if (signal?.aborted) {
    throw new Error("Audio recording was cancelled.");
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
      function stopRecorder(): void {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }

      function handleAbort(): void {
        stopRecorder();
      }

      function cleanUp(): void {
        window.clearTimeout(timeoutId);
        signal?.removeEventListener("abort", handleAbort);
      }

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      recorder.addEventListener(
        "stop",
        () => {
          cleanUp();

          if (signal?.aborted) {
            reject(new Error("Audio recording was cancelled."));
            return;
          }

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
        () => {
          cleanUp();
          reject(new Error("Audio recording failed."));
        },
        { once: true },
      );

      recorder.start();
      const timeoutId = window.setTimeout(stopRecorder, durationMs);

      signal?.addEventListener("abort", handleAbort, {
        once: true,
      });

      if (signal?.aborted) {
        handleAbort();
        return;
      }
    });
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}
