import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATS_FILE = path.join(__dirname, '..', 'stats.json');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function readStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { games: [], highScores: { fibonacci: 0, classic: 0 } };
}

function writeStats(data) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'MergeDrop', timestamp: new Date().toISOString() });
});

// Get all stats
app.get('/api/stats', (req, res) => {
  const stats = readStats();
  res.json(stats);
});

// Get stats summary for a game type
app.get('/api/stats/:gameType', (req, res) => {
  const { gameType } = req.params;
  const stats = readStats();
  const games = stats.games.filter(g => g.gameType === gameType);
  const totalGames = games.length;
  const avgScore = totalGames > 0 ? Math.round(games.reduce((a, g) => a + g.score, 0) / totalGames) : 0;
  const avgDuration = totalGames > 0 ? Math.round(games.reduce((a, g) => a + g.duration, 0) / totalGames) : 0;
  const avgTurns = totalGames > 0 ? Math.round(games.reduce((a, g) => a + g.turns, 0) / totalGames) : 0;
  const highScore = stats.highScores[gameType] || 0;
  const bestDuration = totalGames > 0 ? Math.max(...games.map(g => g.duration)) : 0;

  res.json({
    gameType, totalGames, avgScore, avgDuration, avgTurns,
    highScore, bestDuration,
    recentGames: games.slice(-10).reverse(),
  });
});

// Save a game result
app.post('/api/stats', (req, res) => {
  const { gameType, score, turns, duration } = req.body;
  if (!gameType || score == null) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const stats = readStats();
  const entry = {
    gameType,
    score,
    turns: turns || 0,
    duration: duration || 0,
    timestamp: new Date().toISOString(),
  };

  stats.games.push(entry);

  // Update high score
  if (!stats.highScores[gameType] || score > stats.highScores[gameType]) {
    stats.highScores[gameType] = score;
  }

  writeStats(stats);

  // Return updated summary
  const games = stats.games.filter(g => g.gameType === gameType);
  const totalGames = games.length;
  const avgScore = Math.round(games.reduce((a, g) => a + g.score, 0) / totalGames);
  const avgDuration = Math.round(games.reduce((a, g) => a + g.duration, 0) / totalGames);

  res.json({
    saved: true,
    highScore: stats.highScores[gameType],
    totalGames, avgScore, avgDuration,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MergeDrop API running on http://localhost:${PORT}`);
});
