// Achievement Toast Notifications
export function AchievementToast({ achievements }) {
  if (!achievements || achievements.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        right: 20,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        pointerEvents: 'none',
      }}
    >
      {achievements.map((achievement, i) => (
        <div
          key={`${achievement.id}-${i}`}
          style={{
            background: 'linear-gradient(135deg, #1a1010, #0a0a0a)',
            border: '2px solid #FFD700',
            borderRadius: 12,
            padding: '12px 16px',
            minWidth: 250,
            maxWidth: 300,
            boxShadow: '0 8px 32px rgba(255,215,0,0.3), 0 0 60px rgba(255,215,0,0.1)',
            animation: 'achievementSlide 0.4s ease-out, achievementFade 4s ease-in-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 32, lineHeight: 1 }}>{achievement.icon}</div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: '#FFD700',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
              >
                🏆 Achievement Unlocked!
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#FFE866',
                  marginBottom: 2,
                }}
              >
                {achievement.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#AA9955',
                  lineHeight: 1.3,
                }}
              >
                {achievement.description}
              </div>
            </div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes achievementSlide {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes achievementFade {
          0%, 85% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
}

// Achievements Panel Modal
export function AchievementsPanel({ show, onClose, achievementManager }) {
  if (!show) return null;

  const progress = achievementManager.getProgress();
  const allAchievements = achievementManager.getAllAchievements();

  // Group by category
  const categories = {
    'Getting Started': allAchievements.filter(a => 
      a.id.startsWith('first_') || a.id === 'use_hold'
    ),
    'Chains': allAchievements.filter(a => a.id.startsWith('chain_')),
    'Scores': allAchievements.filter(a => a.id.startsWith('score_')),
    'Dedication': allAchievements.filter(a => a.id.startsWith('games_') || a.id.startsWith('survive_')),
    'Special': allAchievements.filter(a => 
      !a.id.startsWith('first_') && 
      !a.id.startsWith('chain_') && 
      !a.id.startsWith('score_') && 
      !a.id.startsWith('games_') &&
      !a.id.startsWith('survive_') &&
      a.id !== 'use_hold'
    ),
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 500,
          width: '90%',
          maxHeight: '85vh',
          padding: '24px 28px',
          background: '#141010',
          borderRadius: 16,
          border: '1px solid #331818',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          overflow: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#FFD700',
            letterSpacing: 2,
            marginBottom: 8,
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>🏆</span>
          <span>Achievements</span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
              fontSize: 12,
              color: '#AA8855',
            }}
          >
            <span>{progress.unlocked} / {progress.total} Unlocked</span>
            <span>{progress.percentage}%</span>
          </div>
          <div
            style={{
              height: 8,
              background: '#1a1010',
              borderRadius: 4,
              overflow: 'hidden',
              border: '1px solid #331818',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress.percentage}%`,
                background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Achievement categories */}
        {Object.entries(categories).map(([category, achievements]) => {
          if (achievements.length === 0) return null;

          return (
            <div key={category} style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#CC9955',
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                  paddingBottom: 6,
                  borderBottom: '1px solid #221818',
                }}
              >
                {category}
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {achievements.map(achievement => {
                  const unlocked = achievement.unlocked;
                  const isHidden = achievement.hidden && !unlocked;

                  if (isHidden) return null;

                  return (
                    <div
                      key={achievement.id}
                      style={{
                        padding: '12px 14px',
                        background: unlocked ? '#1a1010' : '#0d0808',
                        border: `1px solid ${unlocked ? '#FFD70030' : '#22181888'}`,
                        borderRadius: 10,
                        opacity: unlocked ? 1 : 0.5,
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ fontSize: 24, lineHeight: 1 }}>{achievement.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: unlocked ? '#FFE866' : '#665544',
                              marginBottom: 2,
                            }}
                          >
                            {achievement.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: unlocked ? '#AA8855' : '#554433',
                              lineHeight: 1.3,
                            }}
                          >
                            {achievement.description}
                          </div>
                          {unlocked && achievement.unlockedAt && (
                            <div
                              style={{
                                fontSize: 9,
                                color: '#776644',
                                marginTop: 4,
                              }}
                            >
                              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        {unlocked && (
                          <div style={{ fontSize: 18, color: '#FFD700', lineHeight: 1 }}>✓</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px 20px',
            marginTop: 16,
            background: 'linear-gradient(135deg, #CC2222, #991111)',
            color: '#FFD0D0',
            border: '1px solid #DD3333',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
