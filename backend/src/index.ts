import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { generateSongList } from "./services/geminiMusicCurator";
import {
  readCurrentSongList,
  saveCurrentSongList,
} from "./services/songListStore";
import { findYoutubeVideoForSong } from "./services/youtubeService";
import {
  enrichNextSongWithYoutubeData,
  enrichSongsWithYoutubeData,
  getSongListReadiness,
} from "./services/songListEnricher";
import { prisma } from "./lib/prisma";
import { saveCurrentSongsToCache } from "./services/trackCacheService";
import { countCachedTracks } from "./services/trackRepository";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Backend is healthy" });
});

app.post("/api/dev/gemini-songs", async (req, res) => {
  try {
    const players = Number(req.body.players);
    const decade =
      typeof req.body.decade === "string" ? req.body.decade.trim() : "";
    const genre =
      typeof req.body.genre === "string" ? req.body.genre.trim() : "";

    if (!Number.isInteger(players) || players < 1) {
      res.status(400).json({ error: "players must be a positive integer." });
      return;
    }

    if (!decade || !genre) {
      res.status(400).json({ error: "decade and genre are required." });
      return;
    }

    const request = { players, decade, genre };
    const songs = await generateSongList(request);
    const savedSongList = await saveCurrentSongList(request, songs);

    res.json({
      count: savedSongList.songs.length,
      file: "runtime/current-song-list.json",
      data: savedSongList,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/dev/current-songs", async (req, res) => {
  try {
    const savedSongList = await readCurrentSongList();
    res.json(savedSongList);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(404).json({ error: message });
  }
});

app.post("/api/dev/youtube-song", async (req, res) => {
  try {
    const artist =
      typeof req.body.artist === "string" ? req.body.artist.trim() : "";
    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : "";

    if (!artist || !title) {
      res.status(400).json({ error: "artist and title are required" });
      return;
    }

    const video = await findYoutubeVideoForSong({ artist, title });

    res.json(video);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/enrich-next-song", async (req, res) => {
  try {
    const result = await enrichNextSongWithYoutubeData();
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/enrich-songs", async (req, res) => {
  try {
    const limit = Number(req.body.limit ?? 3);

    if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
      res
        .status(400)
        .json({ error: "limit must be an integer between 1 and 10" });
      return;
    }
    const result = await enrichSongsWithYoutubeData(limit);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/dev/song-list-readiness", async (req, res) => {
  try {
    const songListReadiness = await getSongListReadiness();

    res.json(songListReadiness);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/dev/save-current-songs-to-cache", async (req, res) => {
  try {
    const beforeCount = await countCachedTracks();
    const result = await saveCurrentSongsToCache();
    const afterCount = await countCachedTracks();

    res.json({
      beforeCount,
      afterCount,
      upserted: result.saved,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

async function testDatabaseConnection() {
  try {
    console.log("Connecting to the database and saving test record...");

    const testTrack = await prisma.track.upsert({
      where: { youtubeId: "dQw4w9WgXcQ" },
      update: {},
      create: {
        youtubeId: "dQw4w9WgXcQ",
        title: "Never Gonna Give You Up",
        artist: "Rick Astley",
        year: 1987,
        duration: 212,
        genres: ["Pop"],
      },
    });

    console.log("Successfully saved or verified track:", testTrack.title);

    const allTracks = await prisma.track.findMany();
    console.log(
      `Database read successful. Total tracks in database: ${allTracks.length}`,
    );
  } catch (error) {
    console.error("Error during database testing:", error);
  }
}

app.listen(PORT, async () => {
  console.log(`SongQuiz backend is successfully running on port: ${PORT}`);
  console.log("All required API keys successfully loaded from .env file.");

  await testDatabaseConnection();
});
