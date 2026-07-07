import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

app.listen(PORT, () => {
  console.log(`SongQuiz backend is successfully running on port: ${PORT}`);

  if (
    process.env.SPOTIFY_CLIENT_ID &&
    process.env.OPENAI_API_KEY &&
    process.env.GEMINI_API_KEY
  ) {
    console.log("All required API keys successfully loaded from .env file.");
  } else {
    console.warn(
      "Warning: Some API keys are missing from the environment variables!",
    );
  }
});
