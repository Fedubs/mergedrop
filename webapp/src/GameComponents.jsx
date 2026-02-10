// Achievement Toast Notification Component
export function AchievementToast({ achievements }) {
  if (achievements.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 80, right: 20, zIndex: 100,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {achievements.map((achievement, i) => (
        <div key={`${achievement.id}-${i}`} style={{
          background: 'linear-gradient(135deg, #1a1010, #0a0a0a)',
          border: '2px solid #FFD700',
          borderRadius: 12,
          padding: '12px 16px',
          minWidth: 250,
          boxShadow: '0 8px 32px rgba(255,215,0,0.3), 0 0 60px rgba(255,215,0,0.1)',
          animation: 'achievementSlide 0.4s ease-out, achievementFade 4s ease-in-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 32 }}>{achievement.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 10, letterSpacing: 2,
                color: '#FFD700', fontWeight: 700,
                textTransform: 'uppercase', marginBottom: 2,
              }}>Achievement Unlocked!</div>
              <div style={{
                fontSize: 14, fontWeight: 700,
                color: '#FFE866', marginBottom: 2,
              }}>{achievement.name}</div>
              <div style={{
                fontSize: 11, color: '#AA9955',
              }}>{achievement.description}</div>
            </div>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes achievementSlide {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes achievementFade {
          0%, 85% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}

// Settings Modal Component
export function SettingsModal({ show, onClose, settings, updateSetting }) {
  if (!show) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 420, width: '90%',
        padding: '24px 28px',
        background: '#141010',
        borderRadius: 16,
        border: '1px solid #331818',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
      }}>
        <div style={{
          fontSize: 20, fontWeight: 800,
          color: '#FF6B6B', letterSpacing: 2,
          marginBottom: 20, textTransform: 'uppercase',
        }}>Settings</div>

        {/* Next Pieces Preview */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#AA7777', marginBottom: 8, fontWeight: 700 }}>
            Next Pieces Preview
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3].map(num => (
              <button
                key={num}
                onClick={() => updateSetting('showNextPieces', num)}
                style={{
                  flex: 1, padding: '8px 12px',
                  background: settings.showNextPieces === num ? '#FF4444' : '#1a1010',
                  border: `1px solid ${settings.showNextPieces === num ? '#FF6666' : '#442222'}`,
                  borderRadius: 8, color: settings.showNextPieces === num ? '#fff' : '#886666',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >{num}</button>
            ))}
          </div>
        </div>

        {/* Hold Mechanic */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.enableHold}
              onChange={e => updateSetting('enableHold', e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 12, color: '#AA7777', fontWeight: 700 }}>
              Enable Hold Mechanic
            </span>
          </label>
        </div>

        {/* Audio Level */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#AA7777', marginBottom: 8, fontWeight: 700 }}>
            Audio Level
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['off', 'minimal', 'normal', 'maximum'].map(level => (
              <button
                key={level}
                onClick={() => updateSetting('audioLevel', level)}
                style={{
                  flex: 1, padding: '6px 8px',
                  background: settings.audioLevel === level ? '#FF4444' : '#1a1010',
                  border: `1px solid ${settings.audioLevel === level ? '#FF6666' : '#442222'}`,
                  borderRadius: 8, color: settings.audioLevel === level ? '#fff' : '#886666',
                  cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >{level}</button>
            ))}
          </div>
        </div>

        {/* Visual Effects */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#AA7777', marginBottom: 8, fontWeight: 700 }}>
            Visual Effects
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['minimal', 'normal', 'maximum'].map(level => (
              <button
                key={level}
                onClick={() => updateSetting('visualEffects', level)}
                style={{
                  flex: 1, padding: '6px 8px',
                  background: settings.visualEffects === level ? '#FF4444' : '#1a1010',
                  border: `1px solid ${settings.visualEffects === level ? '#FF6666' : '#442222'}`,
                  borderRadius: 8, color: settings.visualEffects === level ? '#fff' : '#886666',
                  cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >{level}</button>
            ))}
          </div>
        </div>

        {/* Screen Shake */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.screenShake}
              onChange={e => updateSetting('screenShake', e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 12, color: '#AA7777', fontWeight: 700 }}>
              Enable Screen Shake
            </span>
          </label>
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: '10px 20px',
          background: 'linear-gradient(135deg, #CC2222, #991111)',
          color: '#FFD0D0', border: '1px solid #DD3333',
          borderRadius: 8, cursor: 'pointer',
          fontSize: 13, fontWeight: 700, letterSpacing: 1,
        }}>Close</button>
      </div>
    </div>
  );
}

// Achievements Panel Component
export function AchievementsPanel({ show, onClose, achievements, ACHIEVEMENTS }) {
  if (!show) return null;

  const unlockedCount = Object.keys(achievements).length;
  const totalCount = Object.keys(ACHIEVEMENTS).length;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 480, width: '90%', maxHeight: '80vh',
        padding: '24px 28px',
        background: '#141010',
        borderRadius: 16,
        border: '1px solid #331818',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        overflow: 'auto',
      }}>
        <div style={{
          fontSize: 20, fontWeight: 800,
          color: '#FFD700', letterSpacing: 2,
          marginBottom: 8, textTransform: 'uppercase',
        }}>Achievements</div>
        <div style={{
          fontSize: 12, color: '#AA8855', marginBottom: 20,
        }}>{unlockedCount} / {totalCount} Unlocked</div>

        <div style={{ display: 'grid', gap: 12 }}>
          {Object.values(ACHIEVEMENTS).map(achievement => {
            const unlocked = !!achievements[achievement.id];
            return (
              <div key={achievement.id} style={{
                padding: '12px 16px',
                background: unlocked ? '#1a1010' : '#0d0808',
                border: `1px solid ${unlocked ? '#FFD70030' : '#22181888'}`,
                borderRadius: 10,
                opacity: unlocked ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 28 }}>{achievement.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: unlocked ? '#FFE866' : '#665544',
                      marginBottom: 2,
                    }}>{achievement.name}</div>
                    <div style={{
                      fontSize: 11, color: unlocked ? '#AA8855' : '#554433',
                    }}>{achievement.description}</div>
                    {unlocked && (
                      <div style={{
                        fontSize: 9, color: '#776644', marginTop: 4,
                      }}>
                        Unlocked {new Date(achievements[achievement.id]).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {unlocked && (
                    <div style={{ fontSize: 20, color: '#FFD700' }}>✓</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: '10px 20px', marginTop: 20,
          background: 'linear-gradient(135deg, #CC2222, #991111)',
          color: '#FFD0D0', border: '1px solid #DD3333',
          borderRadius: 8, cursor: 'pointer',
          fontSize: 13, fontWeight: 700, letterSpacing: 1,
        }}>Close</button>
      </div>
    </div>
  );
}
