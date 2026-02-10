// Comprehensive achievements system with progress tracking

export const ACHIEVEMENTS = {
  // First time achievements
  first_drop: {
    id: 'first_drop',
    name: 'First Drop',
    description: 'Drop your first piece',
    icon: '🎯',
    hidden: false,
  },
  first_merge: {
    id: 'first_merge',
    name: 'First Merge',
    description: 'Complete your first merge',
    icon: '🔗',
    hidden: false,
  },
  first_explosion: {
    id: 'first_explosion',
    name: 'Boom!',
    description: 'Trigger your first explosion',
    icon: '💥',
    hidden: false,
  },
  
  // Chain achievements
  chain_3: {
    id: 'chain_3',
    name: 'Chain Starter',
    description: 'Achieve a 3x chain',
    icon: '⛓️',
    hidden: false,
  },
  chain_5: {
    id: 'chain_5',
    name: 'Chain Master',
    description: 'Achieve a 5x chain',
    icon: '🔥',
    hidden: false,
  },
  chain_7: {
    id: 'chain_7',
    name: 'Chain Legend',
    description: 'Achieve a 7x chain',
    icon: '⚡',
    hidden: false,
  },
  chain_10: {
    id: 'chain_10',
    name: 'Chain God',
    description: 'Achieve a 10x chain',
    icon: '👑',
    hidden: false,
  },
  
  // Score achievements
  score_1000: {
    id: 'score_1000',
    name: 'Getting Started',
    description: 'Score 1,000 points in a game',
    icon: '🌟',
    hidden: false,
  },
  score_5000: {
    id: 'score_5000',
    name: 'Skilled Player',
    description: 'Score 5,000 points in a game',
    icon: '⭐',
    hidden: false,
  },
  score_10000: {
    id: 'score_10000',
    name: 'Expert',
    description: 'Score 10,000 points in a game',
    icon: '🏆',
    hidden: false,
  },
  score_25000: {
    id: 'score_25000',
    name: 'Master',
    description: 'Score 25,000 points in a game',
    icon: '💎',
    hidden: false,
  },
  score_50000: {
    id: 'score_50000',
    name: 'Grandmaster',
    description: 'Score 50,000 points in a game',
    icon: '👑',
    hidden: false,
  },
  
  // Playtime achievements
  games_10: {
    id: 'games_10',
    name: 'Dedicated',
    description: 'Play 10 games',
    icon: '🎮',
    hidden: false,
  },
  games_50: {
    id: 'games_50',
    name: 'Committed',
    description: 'Play 50 games',
    icon: '🎲',
    hidden: false,
  },
  games_100: {
    id: 'games_100',
    name: 'Obsessed',
    description: 'Play 100 games',
    icon: '🔮',
    hidden: false,
  },
  
  // Feature usage
  use_hold: {
    id: 'use_hold',
    name: 'Strategic Thinker',
    description: 'Use the hold mechanic',
    icon: '🤝',
    hidden: false,
  },
  use_hold_10: {
    id: 'use_hold_10',
    name: 'Hold Master',
    description: 'Use hold 10 times in one game',
    icon: '🎯',
    hidden: false,
  },
  
  // Survival achievements
  survive_50_turns: {
    id: 'survive_50_turns',
    name: 'Survivor',
    description: 'Survive 50 turns',
    icon: '🛡️',
    hidden: false,
  },
  survive_100_turns: {
    id: 'survive_100_turns',
    name: 'Endurance Master',
    description: 'Survive 100 turns',
    icon: '💪',
    hidden: false,
  },
  
  // Special achievements
  perfect_game: {
    id: 'perfect_game',
    name: 'Perfect Game',
    description: 'Complete a game with no wasted drops',
    icon: '✨',
    hidden: true,
  },
  speed_demon: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Score 5000+ in under 3 minutes',
    icon: '⚡',
    hidden: true,
  },
  explosive_expert: {
    id: 'explosive_expert',
    name: 'Explosive Expert',
    description: 'Trigger 10 explosions in one game',
    icon: '💣',
    hidden: false,
  },
};

// Achievement manager class
export class AchievementManager {
  constructor() {
    this.achievements = this.loadAchievements();
    this.listeners = [];
  }

  loadAchievements() {
    const saved = localStorage.getItem('mergedrop_achievements');
    return saved ? JSON.parse(saved) : {};
  }

  saveAchievements() {
    localStorage.setItem('mergedrop_achievements', JSON.stringify(this.achievements));
  }

  unlock(achievementId) {
    if (this.achievements[achievementId]) {
      return false; // Already unlocked
    }

    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) {
      return false; // Invalid achievement
    }

    this.achievements[achievementId] = {
      unlockedAt: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.saveAchievements();
    this.notifyListeners(achievement);
    return true;
  }

  isUnlocked(achievementId) {
    return !!this.achievements[achievementId];
  }

  getProgress() {
    const total = Object.keys(ACHIEVEMENTS).length;
    const unlocked = Object.keys(this.achievements).length;
    return { unlocked, total, percentage: Math.round((unlocked / total) * 100) };
  }

  getUnlockedAchievements() {
    return Object.keys(this.achievements).map(id => ({
      ...ACHIEVEMENTS[id],
      ...this.achievements[id],
    }));
  }

  getAllAchievements() {
    return Object.values(ACHIEVEMENTS).map(achievement => ({
      ...achievement,
      unlocked: this.isUnlocked(achievement.id),
      unlockedAt: this.achievements[achievement.id]?.unlockedAt,
    }));
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners(achievement) {
    this.listeners.forEach(listener => listener(achievement));
  }

  // Check achievements based on game state
  checkAchievements(gameState) {
    const unlocked = [];

    // First drop
    if (gameState.totalDrops === 1) {
      if (this.unlock('first_drop')) unlocked.push('first_drop');
    }

    // First merge
    if (gameState.totalMerges === 1) {
      if (this.unlock('first_merge')) unlocked.push('first_merge');
    }

    // First explosion
    if (gameState.totalExplosions === 1) {
      if (this.unlock('first_explosion')) unlocked.push('first_explosion');
    }

    // Chain achievements
    if (gameState.maxChain >= 3) {
      if (this.unlock('chain_3')) unlocked.push('chain_3');
    }
    if (gameState.maxChain >= 5) {
      if (this.unlock('chain_5')) unlocked.push('chain_5');
    }
    if (gameState.maxChain >= 7) {
      if (this.unlock('chain_7')) unlocked.push('chain_7');
    }
    if (gameState.maxChain >= 10) {
      if (this.unlock('chain_10')) unlocked.push('chain_10');
    }

    // Score achievements
    if (gameState.score >= 1000) {
      if (this.unlock('score_1000')) unlocked.push('score_1000');
    }
    if (gameState.score >= 5000) {
      if (this.unlock('score_5000')) unlocked.push('score_5000');
    }
    if (gameState.score >= 10000) {
      if (this.unlock('score_10000')) unlocked.push('score_10000');
    }
    if (gameState.score >= 25000) {
      if (this.unlock('score_25000')) unlocked.push('score_25000');
    }
    if (gameState.score >= 50000) {
      if (this.unlock('score_50000')) unlocked.push('score_50000');
    }

    // Games played
    if (gameState.totalGamesPlayed >= 10) {
      if (this.unlock('games_10')) unlocked.push('games_10');
    }
    if (gameState.totalGamesPlayed >= 50) {
      if (this.unlock('games_50')) unlocked.push('games_50');
    }
    if (gameState.totalGamesPlayed >= 100) {
      if (this.unlock('games_100')) unlocked.push('games_100');
    }

    // Hold usage
    if (gameState.holdUsedThisGame) {
      if (this.unlock('use_hold')) unlocked.push('use_hold');
    }
    if (gameState.holdUsedCount >= 10) {
      if (this.unlock('use_hold_10')) unlocked.push('use_hold_10');
    }

    // Survival
    if (gameState.turn >= 50) {
      if (this.unlock('survive_50_turns')) unlocked.push('survive_50_turns');
    }
    if (gameState.turn >= 100) {
      if (this.unlock('survive_100_turns')) unlocked.push('survive_100_turns');
    }

    // Speed demon (5000+ in under 3 min)
    if (gameState.score >= 5000 && gameState.duration < 180) {
      if (this.unlock('speed_demon')) unlocked.push('speed_demon');
    }

    // Explosive expert
    if (gameState.totalExplosions >= 10) {
      if (this.unlock('explosive_expert')) unlocked.push('explosive_expert');
    }

    return unlocked;
  }

  reset() {
    this.achievements = {};
    this.saveAchievements();
  }
}
