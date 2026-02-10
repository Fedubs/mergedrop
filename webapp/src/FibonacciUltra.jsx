import { useState, useCallback, useEffect, useRef } from "react";
import { useGameTimer, formatDuration, saveGameResult, getGameStats } from "./useGameStats.js";
import { ROWS, COLS, RUN_SIZE, FIB, SHADES, GAP, cellKey, chainMultiplier, cloneGrid } from "./game/GameConstants.js";
import { haptic } from "./game/GameAudio.js";
import { createStartingGrid, randomShade, processAllChainsUltra } from "./game/GameLogicUltra.js";

const MAX_GAME_WIDTH = 400;

// Simple settings (stored in localStorage)
function getSettings() {
  const saved = localStorage.getItem('mergedrop_settings');
  return saved ? JSON.parse(saved) : { 
    nextPieces: 3, 
    enableHold: true,
    audioLevel: 'normal' 
  };
}

function saveSettings(settings) {
  localStorage.setItem('mergedrop_settings', JSON.stringify(settings));
}

export default function FibonacciUltra() {
  const [settings, setSettings] = useState(getSettings());
  const [showSettings, setShowSettings] = useState(false);

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const [cellSize, setCellSize] = useState(() => {
    const w = typeof window !== "undefined" ? Math.min(window.innerWidth, MAX_GAME_WIDTH) : 400;
    return (w - GAP * (COLS + 1)) / COLS;
  });

  useEffect(() => {
    const onResize = () => {
      const w = Math.min(window.innerWidth, MAX_GAME_WIDTH);
      setCellSize((w - GAP * (COLS + 1)) / COLS);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const CELL_SIZE = cellSize;

  const [grid, setGrid] = useState(createStartingGrid);
  
  // Next pieces queue
  const [nextQueue, setNextQueue] = useState(() => 
    Array(settings.nextPieces + 1).fill(0).map(() => randomShade(0))
  );
  
  // Hold mechanic
  const [heldPiece, setHeldPiece] = useState(null);
  const [canHold, setCanHold] = useState(true);
  const [hasUsedHold, setHasUsedHold] = useState(false);

  const currentShade = nextQueue[0];
  const [hoverCol, setHoverCol] = useState(3);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [turn, setTurn] = useState(0);
  const [dropsLeft, setDropsLeft] = useState(RUN_SIZE);
  const [lastCombo, setLastCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);

  const gameRef = useRef(null);
  const processingRef = useRef(false);
  const { elapsed, startTimer, stopTimer, resetTimer } = useGameTimer();
  const [endStats, setEndStats] = useState(null);
  const gameStartedRef = useRef(false);

  const [animMerges, setAnimMerges] = useState([]);
  const [animExplode, setAnimExplode] = useState([]);
  const [animKey, setAnimKey] = useState(0);
  const [floatingScores, setFloatingScores] = useState([]);
  const floatIdRef = useRef(0);

  const resetGame = useCallback(() => {
    setGrid(createStartingGrid());
    setNextQueue(Array(settings.nextPieces + 1).fill(0).map(() => randomShade(0)));
    setHeldPiece(null);
    setCanHold(true);
    setHasUsedHold(false);
    setScore(0);
    setTurn(0);
    setGameOver(false);
    setProcessing(false);
    setDropsLeft(RUN_SIZE);
    setLastCombo(0);
    setShowCombo(false);
    setAnimMerges([]);
    setAnimExplode([]);
    setFloatingScores([]);
    processingRef.current = false;
    resetTimer();
    gameStartedRef.current = false;
    setEndStats(null);
  }, [resetTimer, settings.nextPieces]);

  const spawnFloatScore = useCallback((r, c, points, combo) => {
    const id = ++floatIdRef.current;
    const mult = chainMultiplier(combo);
    const text = combo > 1 ? `+${points} ×${mult}` : `+${points}`;
    setFloatingScores(prev => [...prev, { id, r, c, text, combo }]);
    setTimeout(() => setFloatingScores(prev => prev.filter(f => f.id !== id)), 1200);
  }, []);

  // Hold mechanic function
  const holdPiece = useCallback(() => {
    if (!settings.enableHold || !canHold || processing || gameOver) return;
    
    haptic.hold(settings.audioLevel);
    setHasUsedHold(true);

    if (heldPiece === null) {
      // First hold - store current piece
      setHeldPiece(currentShade);
      setNextQueue(prev => [...prev.slice(1), randomShade(turn)]);
      setCanHold(false);
    } else {
      // Swap held piece with current
      const temp = heldPiece;
      setHeldPiece(currentShade);
      setNextQueue(prev => [temp, ...prev.slice(1)]);
      setCanHold(false);
    }
  }, [settings.enableHold, settings.audioLevel, canHold, processing, gameOver, heldPiece, currentShade, turn]);

  const dropPiece = useCallback((col) => {
    if (processingRef.current || gameOver) return;
    if (col < 0 || col >= COLS) return;

    const newGrid = cloneGrid(grid);
    let targetRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (newGrid[r][col] === 0) {
        targetRow = r;
        break;
      }
    }
    if (targetRow === -1) return;

    newGrid[targetRow][col] = currentShade;
    setGrid(cloneGrid(newGrid));
    haptic.drop(settings.audioLevel);
    
    if (!gameStartedRef.current) {
      startTimer();
      gameStartedRef.current = true;
    }
    
    setProcessing(true);
    processingRef.current = true;

    const newTurn = turn + 1;

    // Advance queue
    setNextQueue(prev => [...prev.slice(1), randomShade(newTurn)]);
    setCanHold(true); // Can hold again after drop

    setTimeout(() => {
      const result = processAllChainsUltra(newGrid, chainMultiplier);

      if (result.steps.length === 0) {
        finalizeDrop(newGrid, 0, 0, newTurn);
        return;
      }

      let stepIdx = 0;
      const playStep = () => {
        if (stepIdx >= result.steps.length) {
          finalizeDrop(newGrid, result.totalPoints, result.combo, newTurn);
          return;
        }
        
        const step = result.steps[stepIdx];

        if (step.type === "explode") {
          setGrid(cloneGrid(step.beforeGrid));
          setTimeout(() => {
            setAnimExplode(step.explosions);
            setAnimKey(k => k + 1);
            haptic.explode(step.combo, settings.audioLevel);

            if (step.explosions.length > 0) {
              const e = step.explosions[0];
              spawnFloatScore(e.r, e.c, step.stepPoints, step.combo);
            }

            if (step.combo >= 2) {
              setLastCombo(step.combo);
              setShowCombo(true);
              setTimeout(() => setShowCombo(false), 1200);
            }

            setTimeout(() => {
              setAnimExplode([]);
              setGrid(cloneGrid(step.afterGrid));
              setTimeout(() => {
                stepIdx++;
                playStep();
              }, 200);
            }, 600);
          }, 500);
        } else {
          setGrid(cloneGrid(step.beforeGrid));

          setTimeout(() => {
            setGrid(cloneGrid(step.afterGrid));

            if (step.merges.length > 0) {
              setAnimMerges(step.merges);
              setAnimKey(k => k + 1);
              haptic.merge(step.combo, settings.audioLevel);

              const m = step.merges[0];
              spawnFloatScore(m.r, m.c, step.stepPoints, step.combo);
            }

            if (step.combo >= 2) {
              setLastCombo(step.combo);
              setShowCombo(true);
              setTimeout(() => setShowCombo(false), 1200);
              haptic.chain(step.combo, settings.audioLevel);
            }

            setTimeout(() => {
              setAnimMerges([]);
              stepIdx++;
              playStep();
            }, 350);
          }, 50);
        }
      };
      playStep();
    }, 200);
  }, [grid, currentShade, turn, gameOver, settings.audioLevel, spawnFloatScore, startTimer]);

  const finalizeDrop = useCallback((finalGrid, points, combo, newTurn) => {
    setScore(prev => {
      const ns = prev + points + 10;
      setHighScore(hs => Math.max(hs, ns));
      return ns;
    });
    setTurn(newTurn);

    const newDropsLeft = dropsLeft - 1;

    if (newDropsLeft <= 0) {
      setDropsLeft(RUN_SIZE);
      // Game continues but could add row rise here
    } else {
      setGrid(finalGrid);
      setDropsLeft(newDropsLeft);
    }

    // Check game over
    let isOver = finalGrid[0].some(c => c !== 0);
    if (isOver) {
      setGameOver(true);
      haptic.gameOver(settings.audioLevel);
    }

    setProcessing(false);
    processingRef.current = false;
  }, [dropsLeft, settings.audioLevel]);

  useEffect(() => {
    const handler = (e) => {
      if (gameOver) {
        if (e.key === "r" || e.key === "R") resetGame();
        return;
      }
      if (processingRef.current) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setHoverCol(c => Math.max(0, c - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setHoverCol(c => Math.min(COLS - 1, c + 1));
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        dropPiece(hoverCol);
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        holdPiece();
      } else if (e.key === "r" || e.key === "R") {
        resetGame();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hoverCol, dropPiece, holdPiece, gameOver, resetGame]);

  useEffect(() => {
    gameRef.current?.focus();
  }, []);

  useEffect(() => {
    getGameStats("fibonacci_ultra").then(stats => {
      if (stats?.highScore) setHighScore(stats.highScore);
    });
  }, []);

  useEffect(() => {
    if (!gameOver) return;
    const duration = stopTimer();
    saveGameResult("fibonacci_ultra", score, turn, duration).then(result => {
      if (result) {
        setEndStats({
          duration,
          avgDuration: result.avgDuration,
          avgScore: result.avgScore,
          totalGames: result.totalGames,
        });
        if (result.highScore) setHighScore(result.highScore);
      } else {
        setEndStats({ duration, avgDuration: 0, avgScore: 0, totalGames: 0 });
      }
    });
  }, [gameOver, score, turn, stopTimer]);

  const mergeSet = new Set(animMerges.map(m => cellKey(m.r, m.c)));
  const explodeSet = new Set(animExplode.map(e => cellKey(e.r, e.c)));

  return (
    <div
      ref={gameRef}
      tabIndex={0}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100dvh",
        background: "#0a0a0a",
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
        color: "#e8d0d0",
        outline: "none",
        overflow: "hidden",
        userSelect: "none",
        position: "relative",
        padding: 0,
        maxWidth: MAX_GAME_WIDTH,
        margin: "0 auto",
      }}
    >
      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(true)}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 50,
          width: 36,
          height: 36,
          borderRadius: 8,
          border: "1px solid #442222",
          background: "rgba(10,10,10,0.85)",
          color: "#886666",
          fontSize: 16,
          cursor: "pointer",
          backdropFilter: "blur(4px)",
        }}
      >
        ⚙️
      </button>

      {/* Title & Scores */}
      <div style={{ textAlign: "center", marginTop: 16, marginBottom: 8 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            margin: 0,
            background: "linear-gradient(135deg, #FF8844, #DD5500)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: 3,
          }}
        >
          FIBONACCI ULTRA 🔥
        </h1>
        <div style={{ fontSize: 9, color: "#553333", letterSpacing: 2, marginTop: 3 }}>
          Enhanced Edition · Turn {turn} · {formatDuration(elapsed)}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: "#886666", letterSpacing: 2 }}>SCORE</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#FFD700" }}>{score}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#886666", letterSpacing: 2 }}>BEST</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#FFD700" }}>{highScore}</div>
          </div>
        </div>
      </div>

      {/* Next Pieces Preview + Hold + Current */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
        {/* Hold Box */}
        {settings.enableHold && (
          <div>
            <div style={{ fontSize: 8, color: "#665555", letterSpacing: 1, marginBottom: 4, textAlign: "center" }}>
              HOLD (H)
            </div>
            <div
              onClick={holdPiece}
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: heldPiece ? SHADES[heldPiece]?.bg : "#111",
                border: `2px solid ${canHold ? "#FF8844" : "#333"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
                color: heldPiece ? SHADES[heldPiece]?.text : "#333",
                cursor: canHold ? "pointer" : "not-allowed",
                opacity: canHold ? 1 : 0.5,
              }}
            >
              {heldPiece ? FIB[heldPiece] : "—"}
            </div>
          </div>
        )}

        {/* Current Piece */}
        <div>
          <div style={{ fontSize: 8, color: "#887777", letterSpacing: 1, marginBottom: 4, textAlign: "center" }}>
            DROP
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 10,
              background: SHADES[currentShade]?.bg,
              border: `3px solid ${SHADES[currentShade]?.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 800,
              color: SHADES[currentShade]?.text,
              boxShadow: `0 0 20px ${SHADES[currentShade]?.glow}50`,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            {FIB[currentShade]}
          </div>
        </div>

        {/* Next Queue */}
        <div>
          <div style={{ fontSize: 8, color: "#665555", letterSpacing: 1, marginBottom: 4, textAlign: "center" }}>
            NEXT
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {nextQueue.slice(1, settings.nextPieces + 1).map((shade, i) => (
              <div
                key={i}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: SHADES[shade]?.bg,
                  border: `1px solid ${SHADES[shade]?.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: SHADES[shade]?.text,
                  opacity: 1 - i * 0.2,
                }}
              >
                {FIB[shade]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drops Left Indicator */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {Array(RUN_SIZE)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i < dropsLeft ? "#FF6B6B" : "#2a1515",
                border: `1px solid ${i < dropsLeft ? "#FF4444" : "#331818"}`,
              }}
            />
          ))}
      </div>

      {/* Grid */}
      <div style={{ marginTop: "auto", marginBottom: 16, width: "100%" }}>
        <div style={{ display: "flex", gap: GAP, marginBottom: 2, paddingLeft: GAP }}>
          {Array(COLS)
            .fill(0)
            .map((_, c) => (
              <div
                key={c}
                onClick={() => {
                  setHoverCol(c);
                  dropPiece(c);
                }}
                onMouseEnter={() => setHoverCol(c)}
                style={{
                  flex: 1,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: hoverCol === c ? "#FF6B6B" : "#442222",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                ▼
              </div>
            ))}
        </div>

        <div
          style={{
            position: "relative",
            background: "#1a1a1a",
            padding: GAP,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gap: GAP,
              position: "relative",
              zIndex: 2,
            }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const key = cellKey(r, c);
                const shade = SHADES[cell];
                const isMerge = mergeSet.has(key);
                const isExploding = explodeSet.has(key);

                return (
                  <div
                    key={`${r}-${c}-${animKey}`}
                    onClick={() => {
                      setHoverCol(c);
                      dropPiece(c);
                    }}
                    onMouseEnter={() => setHoverCol(c)}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      borderRadius: Math.round(CELL_SIZE * 0.17),
                      background:
                        cell > 0
                          ? `radial-gradient(circle at 35% 35%, ${shade.glow}, ${shade.bg} 70%)`
                          : "#111111",
                      border: cell > 0 ? `1px solid ${shade.border}` : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: Math.round(CELL_SIZE * 0.35),
                      fontWeight: 800,
                      color: shade?.text || "transparent",
                      cursor: "pointer",
                      boxShadow: cell > 0 && isMerge
                        ? `0 0 24px ${shade.glow}`
                        : cell > 0
                        ? `0 2px 8px ${shade.glow}30`
                        : "none",
                      animation: isExploding
                        ? "explodeCell 0.65s forwards"
                        : isMerge
                        ? "mergePulse 0.3s forwards"
                        : "none",
                    }}
                  >
                    {cell > 0 && FIB[cell]}
                  </div>
                );
              })
            )}
          </div>

          {/* Floating scores */}
          {floatingScores.map(f => (
            <div
              key={f.id}
              style={{
                position: "absolute",
                left: GAP + f.c * (CELL_SIZE + GAP) + CELL_SIZE / 2,
                top: GAP + f.r * (CELL_SIZE + GAP),
                transform: "translateX(-50%)",
                fontSize: f.combo > 2 ? 18 : 16,
                fontWeight: 800,
                color: f.combo > 2 ? "#FFDD44" : "#FFAAAA",
                zIndex: 22,
                pointerEvents: "none",
                animation: "floatScore 1.1s ease-out forwards",
              }}
            >
              {f.text}
            </div>
          ))}

          {/* Combo display */}
          {showCombo && lastCombo >= 2 && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: 36,
                fontWeight: 900,
                color: "#FF4444",
                zIndex: 20,
                pointerEvents: "none",
                animation: "comboPopup 1.2s ease-out forwards",
              }}
            >
              {lastCombo}x CHAIN!
            </div>
          )}

          {/* Game Over */}
          {gameOver && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.9)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 25,
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 900, color: "#FF4444", marginBottom: 8 }}>
                GAME OVER
              </div>
              <div style={{ fontSize: 16, marginBottom: 4, color: "#CC8888" }}>
                Score: {score}
              </div>
              <div style={{ fontSize: 12, color: "#886666", marginBottom: 12 }}>
                Turns: {turn} · Time: {formatDuration(endStats?.duration || 0)}
              </div>
              {endStats && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 10,
                    padding: "10px 20px",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 9, color: "#665555", marginBottom: 8 }}>
                    AVERAGES ({endStats.totalGames} games)
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#CC8888" }}>
                        {endStats.avgScore}
                      </div>
                      <div style={{ fontSize: 9, color: "#665555" }}>SCORE</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#CC8888" }}>
                        {formatDuration(endStats.avgDuration)}
                      </div>
                      <div style={{ fontSize: 9, color: "#665555" }}>TIME</div>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={resetGame}
                style={{
                  padding: "10px 28px",
                  fontSize: 13,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #CC2222, #991111)",
                  color: "#FFD0D0",
                  border: "2px solid #DD3333",
                  borderRadius: 10,
                  cursor: "pointer",
                  letterSpacing: 2,
                }}
              >
                PLAY AGAIN (R)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div
          onClick={() => setShowSettings(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 360,
              padding: "24px",
              background: "#141010",
              borderRadius: 16,
              border: "1px solid #331818",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: "#FF6B6B", marginBottom: 16 }}>
              SETTINGS
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#AA7777", marginBottom: 8 }}>
                Next Pieces Preview
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      updateSetting("nextPieces", num);
                      setNextQueue(prev => [...prev.slice(0, num + 1)]);
                    }}
                    style={{
                      flex: 1,
                      padding: "8px",
                      background: settings.nextPieces === num ? "#FF4444" : "#1a1010",
                      border: `1px solid ${settings.nextPieces === num ? "#FF6666" : "#442222"}`,
                      borderRadius: 8,
                      color: settings.nextPieces === num ? "#fff" : "#886666",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings.enableHold}
                  onChange={e => updateSetting("enableHold", e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 11, color: "#AA7777" }}>Enable Hold (H key)</span>
              </label>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#AA7777", marginBottom: 8 }}>Audio Level</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["off", "minimal", "normal", "maximum"].map(level => (
                  <button
                    key={level}
                    onClick={() => updateSetting("audioLevel", level)}
                    style={{
                      flex: 1,
                      padding: "6px 4px",
                      background: settings.audioLevel === level ? "#FF4444" : "#1a1010",
                      border: `1px solid ${settings.audioLevel === level ? "#FF6666" : "#442222"}`,
                      borderRadius: 6,
                      color: settings.audioLevel === level ? "#fff" : "#886666",
                      cursor: "pointer",
                      fontSize: 10,
                      textTransform: "capitalize",
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              style={{
                width: "100%",
                padding: "10px",
                background: "linear-gradient(135deg, #CC2222, #991111)",
                color: "#FFD0D0",
                border: "1px solid #DD3333",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,100,100,0.2); }
          50% { box-shadow: 0 0 28px rgba(255,100,100,0.4); }
        }
        @keyframes mergePulse {
          0% { transform: scale(0.3); opacity: 0.4; }
          35% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes explodeCell {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.1); opacity: 0; filter: blur(4px); }
        }
        @keyframes floatScore {
          0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(0.5); }
          20% { transform: translateX(-50%) translateY(-8px) scale(1.15); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-50px) scale(0.8); }
        }
        @keyframes comboPopup {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          30% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -70%) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
