const express = require('express');
const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Scene data endpoint (scenes stored as JSON files)
router.get('/scene/:id', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const scenePath = path.join(__dirname, '../../public/scenes', `${req.params.id}.json`);
  
  if (fs.existsSync(scenePath)) {
    const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
    res.json(scene);
  } else {
    res.status(404).json({ error: 'Scene not found' });
  }
});

// Minigame scores (in-memory for now, can be extended to DB later)
const scores = {};
router.post('/score', (req, res) => {
  const { game, score, playerId } = req.body;
  if (!scores[game]) scores[game] = [];
  scores[game].push({ score, playerId, date: new Date() });
  scores[game].sort((a, b) => b.score - a.score);
  scores[game] = scores[game].slice(0, 10); // Top 10
  res.json({ success: true, rank: scores[game].findIndex(s => s.score === score) + 1 });
});

router.get('/score/:game', (req, res) => {
  res.json(scores[req.params.game] || []);
});

module.exports = router;
