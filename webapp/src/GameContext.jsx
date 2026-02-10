import { createContext, useContext, useState, useEffect } from 'react';

const GameContext = createContext();

// Default settings
const DEFAULT_SETTINGS = {
  showNextPieces: 3, // Show next 3 pieces
  enableHold: true,
  audioLevel: 'normal', // 'off', 'minimal', 'normal', 'maximum'
  visualEffects: 'normal', // 'minimal', 'normal', 'maximum'
  screenShake: true,
  showComboText: true,
};

// Achievement definitions
const ACHIEVEMENTS = {
  first_merge: { id: 'first_merge', name: 'First Merge', description: 'Complete your first merge', icon: '🎯' },
  chain_3: { id: 'chain_3', name: 'Chain Master', description: 'Achieve a 3x chain', icon: '⛓️' },
  chain_5: { id: 'chain_5', name: 'Chain Legend', description: 'Achieve a 5x chain', icon: '🔥' },
  chain_7: { id: 'chain_7', name: 'Chain God', description: 'Achieve a 7x chain', icon: '⚡' },
  first_explosion: { id: 'first_explosion', name: 'Boom!', description: 'Trigger your first explosion', icon: '💥' },
  score_1000: { id: 'score_1000', name: 'Beginner', description: 'Score 1,000 points', icon: '🌟' },
  score_5000: { id: 'score_5000', name: 'Skilled', description: 'Score 5,000 points', icon: '⭐' },
  score_10000: { id: 'score_10000', name: 'Expert', description: 'Score 10,000 points', icon: '🏆' },
  score_25000: { id: 'score_25000', name: 'Master', description: 'Score 25,000 points', icon: '👑' },
  games_10: { id: 'games_10', name: 'Dedicated', description: 'Play 10 games', icon: '🎮' },
  games_50: { id: 'games_50', name: 'Committed', description: 'Play 50 games', icon: '🎲' },
  games_100: { id: 'games_100', name: 'Obsessed', description: 'Play 100 games', icon: '🔮' },
  use_hold: { id: 'use_hold', name: 'Strategic', description: 'Use the hold mechanic', icon: '🤝' },
};

export function GameProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('mergedrop_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const [achievements, setAchievements] = useState(() => {
    const saved = localStorage.getItem('mergedrop_achievements');
    return saved ? JSON.parse(saved) : {};
  });

  const [newAchievements, setNewAchievements] = useState([]);
  const [totalGamesPlayed, setTotalGamesPlayed] = useState(() => {
    const saved = localStorage.getItem('mergedrop_total_games');
    return saved ? parseInt(saved) : 0;
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('mergedrop_settings', JSON.stringify(settings));
  }, [settings]);

  // Save achievements to localStorage
  useEffect(() => {
    localStorage.setItem('mergedrop_achievements', JSON.stringify(achievements));
  }, [achievements]);

  // Save total games to localStorage
  useEffect(() => {
    localStorage.setItem('mergedrop_total_games', totalGamesPlayed.toString());
  }, [totalGamesPlayed]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const unlockAchievement = (achievementId) => {
    if (!achievements[achievementId]) {
      const achievement = ACHIEVEMENTS[achievementId];
      if (achievement) {
        setAchievements(prev => ({ ...prev, [achievementId]: Date.now() }));
        setNewAchievements(prev => [...prev, achievement]);
        setTimeout(() => {
          setNewAchievements(prev => prev.filter(a => a.id !== achievementId));
        }, 4000);
      }
    }
  };

  const checkAchievements = (gameState) => {
    const { score, combo, hasExploded, hasHeld, gamesPlayed } = gameState;

    // Score achievements
    if (score >= 1000) unlockAchievement('score_1000');
    if (score >= 5000) unlockAchievement('score_5000');
    if (score >= 10000) unlockAchievement('score_10000');
    if (score >= 25000) unlockAchievement('score_25000');

    // Chain achievements
    if (combo >= 3) unlockAchievement('chain_3');
    if (combo >= 5) unlockAchievement('chain_5');
    if (combo >= 7) unlockAchievement('chain_7');

    // Explosion achievement
    if (hasExploded) unlockAchievement('first_explosion');

    // Hold achievement
    if (hasHeld) unlockAchievement('use_hold');

    // Games played achievements
    if (gamesPlayed >= 10) unlockAchievement('games_10');
    if (gamesPlayed >= 50) unlockAchievement('games_50');
    if (gamesPlayed >= 100) unlockAchievement('games_100');
  };

  const incrementGamesPlayed = () => {
    setTotalGamesPlayed(prev => prev + 1);
  };

  const value = {
    settings,
    updateSetting,
    achievements,
    unlockAchievement,
    checkAchievements,
    newAchievements,
    totalGamesPlayed,
    incrementGamesPlayed,
    ACHIEVEMENTS,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within GameProvider');
  }
  return context;
}
