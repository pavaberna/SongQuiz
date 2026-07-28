import OpenAI from "openai";

export type TextToSpeechResult = {
  audioBuffer: Buffer;
  contentType: string;
};

export async function generateSpeech(
  text: string,
): Promise<TextToSpeechResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const client = new OpenAI({
    apiKey,
    timeout: 30_000,
  });
  const response = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "cedar",
    input: text,
    instructions:
      "TEMPO AND DELIVERY DIRECTIVE: Speak VERY FAST with zero hesitation! You are a hyper-energetic, high-speed TV game show host. INCREASE YOUR TALKING SPEED BY 25%. Eliminate all pauses, gaps, and slow cadences between words and sentences. Drive your voice continuously forward like a fast-talking radio commentator. NEVER slow down to pronounce words standardly or cautiously. Deliver both English and Hungarian with ultra-fluid, rapid-fire execution, high pitch variance, and intense excitement. If speaking Hungarian, speak at a rapid, natural native speed with no unnatural syllables or robotic braking. SPEED UP YOUR DELIVERY CONTINUOUSLY.",
    response_format: "mp3",
    speed: 1.15,
  });

  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  return {
    audioBuffer,
    contentType: "audio/mpeg",
  };
}
