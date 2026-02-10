import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3750;

// Stats file location
const STATS_FILE = path.join(__dirname, 'stats.json');

// Middleware
app.use(cors());
app.use(express.json());

// Helper functions for stats
function readStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading stats:', e);
  }
  return { games: [], highScores: { fibonacci: 0, classic: 0 } };
}

function writeStats(data) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error writing stats:', e);
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    app: 'MergeDrop', 
    port: PORT,
    timestamp: new Date().toISOString() 
  });
});

app.get('/api/stats', (req, res) => {
  const stats = readStats();
  res.json(stats);
});

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
    gameType, 
    totalGames, 
    avgScore, 
    avgDuration, 
    avgTurns,
    highScore, 
    bestDuration,
    recentGames: games.slice(-10).reverse(),
  });
});

app.post('/api/stats', (req, res) => {
  const { gameType, score, turns, duration } = req.body;
  
  if (!gameType || score == null) {
    return res.status(400).json({ error: 'Missing required fields: gameType and score' });
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
    totalGames, 
    avgScore, 
    avgDuration,
  });
});

// Serve static files from webapp/dist (production build)
const distPath = path.join(__dirname, 'webapp', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.warn('⚠️  webapp/dist not found. Run "cd webapp && npm run build" first.');
  app.get('*', (req, res) => {
    res.status(503).send('App not built yet. Run: cd webapp && npm run build');
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   🎮 MERGEDROP - Running');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   ✓ Server listening on 0.0.0.0:${PORT}`);
  console.log(`   ✓ Health check: http://localhost:${PORT}/api/health`);
  console.log(`   ✓ Stats file: ${STATS_FILE}`);
  console.log('═══════════════════════════════════════════════════════');
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err);
});
