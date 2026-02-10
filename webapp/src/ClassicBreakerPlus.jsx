import { useState, useCallback, useEffect, useRef } from "react";
import { useGameTimer, formatDuration, saveGameResult, getGameStats } from "./useGameStats.js";
import { haptic as enhancedHaptic } from "./game/GameAudio.js";

const ROWS = 6;
const COLS = 6;
const RUN_SIZE = 5;

// Classic display: show shade number directly
// 1+2=3, 2+3=4, 3+4=5, 4+5=6 (explode!)
const DISPLAY = [0, 1, 2, 3, 4, 5, 6];

// Audio + vibration haptic feedback (vibrate for mobile Chrome, audio as universal fallback)
// Use enhanced audio system with volume control
const haptic = enhancedHaptic;

const SHADES = {
  1: { bg: "#F0EAEA", glow: "#E8DEDE", border: "#D8CCCC", text: "#887777" },
  2: { bg: "#FFD4D4", glow: "#FFC4C4", border: "#F0AAAA", text: "#A06060" },
  3: { bg: "#FFA8A8", glow: "#FF9494", border: "#E87878", text: "#903838" },
  4: { bg: "#FF7070", glow: "#FF5C5C", border: "#D84848", text: "#FFFFFF" },
  5: { bg: "#F03838", glow: "#E82020", border: "#C01818", text: "#FFFFFF" },
  6: { bg: "#C01010", glow: "#B00808", border: "#900808", text: "#FFD0D0" },
  // Blocked cells (negative values represent blocked versions)
  "-1": { bg: "#4A4A4A", glow: "#3A3A3A", border: "#2A2A2A", text: "#888888", blocked: true },
  "-2": { bg: "#5A5A5A", glow: "#4A4A4A", border: "#3A3A3A", text: "#999999", blocked: true },
  "-3": { bg: "#6A6A6A", glow: "#5A5A5A", border: "#4A4A4A", text: "#AAAAAA", blocked: true },
  "-4": { bg: "#7A7A7A", glow: "#6A6A6A", border: "#5A5A5A", text: "#BBBBBB", blocked: true },
  "-5": { bg: "#8A8A8A", glow: "#7A7A7A", border: "#6A6A6A", text: "#CCCCCC", blocked: true },
  "-6": { bg: "#9A9A9A", glow: "#8A8A8A", border: "#7A7A7A", text: "#DDDDDD", blocked: true },
};

const GAP = 2;
const GRID_PADDING = GAP;

const cellKey = (r, c) => `${r},${c}`;

function createEmptyGrid() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}
function createStartingGrid() {
  const grid = createEmptyGrid();
  const count = 2 + Math.floor(Math.random() * 5); // 2 to 6
  for (let i = 0; i < count; i++) {
    const col = Math.floor(Math.random() * COLS);
    // Find lowest empty row in this column
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][col] === 0) { row = r; break; }
    }
    if (row >= 0) grid[row][col] = randomShade(0);
  }
  return grid;
}
function cloneGrid(g) {
  return g.map(r => [...r]);
}

function randomShade(turn = 0) {
  // In Classic Breaker Plus, 6s can appear from the start (rare at first)
  const maxShade = 6; // Always allow up to 6!
  
  // Adjust weights based on turn - early game favors lower numbers
  const weights = [];
  for (let i = 1; i <= maxShade; i++) {
    let weight;
    if (i === 6) {
      // 6 appears with increasing probability as game progresses
      weight = Math.max(1, Math.floor(turn / 3)); // starts at 1, increases every 3 turns
    } else {
      // Lower numbers have higher weight early on
      weight = maxShade - i + 3 + Math.floor((maxShade - i) * Math.max(0, 10 - turn) / 10);
    }
    weights.push({ shade: i, w: weight });
  }
  
  const total = weights.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * total;
  for (const { shade, w } of weights) { r -= w; if (r <= 0) return shade; }
  return 1;
}

function applyGravity(grid) {
  let moved = false;
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c] !== 0) {
        if (r !== write) { grid[write][c] = grid[r][c]; grid[r][c] = 0; moved = true; }
        write--;
      }
    }
  }
  return moved;
}

// Phase 1A: Vertical merges only
function processVerticalMerges(grid) {
  let changed = false;
  let points = 0;
  let merges = [];
  let consumed = [];
  let brokenBlocks = [];

  for (let c = 0; c < COLS; c++) {
    for (let r = ROWS - 2; r >= 0; r--) {
      const top = grid[r][c];
      const bot = grid[r + 1][c];
      
      // 6 doesn't merge - it will explode in processExplosions phase
      // Skip any vertical merges involving 6
      if (top === 6 || bot === 6) {
        continue; // Let explosions handle it
      }
      
      // Regular merges: only merge if numbers differ by exactly 1 (no 1+1=2)
      if (top > 0 && bot > 0 && Math.abs(top - bot) === 1) {
        // Check BEFORE merging: is there a block directly below the bottom piece?
        const blockBelowBot = (r + 2 < ROWS && grid[r + 2][c] < 0);
        
        // Simple rule: Result = TOP number (bottom + top = top)
        const newShade = top;
        
        if (top > bot) {
          // Increasing: top stays, bottom consumed, result goes UP
          consumed.push({ r: r + 1, c, targetR: r, targetC: c, shade: bot });
          grid[r + 1][c] = 0;
          grid[r][c] = newShade;
          merges.push({ r, c, newShade });
          
          // Break block if bottom piece was touching it
          if (blockBelowBot) {
            grid[r + 2][c] = Math.abs(grid[r + 2][c]);
            brokenBlocks.push({ r: r + 2, c });
          }
        } else {
          // Decreasing: top replaces bottom, top consumed, result goes DOWN
          consumed.push({ r, c, targetR: r + 1, targetC: c, shade: top });
          grid[r][c] = 0;
          grid[r + 1][c] = newShade;
          merges.push({ r: r + 1, c, newShade });
          
          // Break block if bottom piece was touching it
          if (blockBelowBot) {
            grid[r + 2][c] = Math.abs(grid[r + 2][c]);
            brokenBlocks.push({ r: r + 2, c });
          }
        }
        points += 50;
        changed = true;
        break;
      }
    }
  }

  if (changed) applyGravity(grid);
  
  return { changed, points, merges, consumed, brokenBlocks };
}

// Phase 1B: Horizontal merges only
function processHorizontalMerges(grid, protectedCells = new Set()) {
  let changed = false;
  let points = 0;
  let merges = [];
  let consumed = [];
  let brokenBlocks = [];

  for (let r = 0; r < ROWS; r++) {
    let runStart = -1, runShade = 0, runLen = 0;
    for (let c = 0; c <= COLS; c++) {
      const val = c < COLS ? grid[r][c] : 0;
      const cellKey = `${r},${c}`;
      const isProtected = protectedCells.has(cellKey);
      
      // Skip protected cells (just broken from blocks) for merging
      if (val > 0 && val === runShade && !isProtected && runLen > 0) {
        runLen++;
      } else {
        if (runLen >= 3 && runShade > 0) {
          const newShade = Math.min(runShade + (runLen - 2), 6);
          const midCol = runStart + Math.floor(runLen / 2);
          for (let k = runStart; k < runStart + runLen; k++) {
            if (k !== midCol) {
              consumed.push({ r, c: k, targetR: r, targetC: midCol, shade: runShade });
            }
            grid[r][k] = 0;
          }
          grid[r][midCol] = newShade;
          merges.push({ r, c: midCol, newShade });
          
          // Break blocks below ALL cells involved in horizontal merge!
          for (let k = runStart; k < runStart + runLen; k++) {
            if (r + 1 < ROWS && grid[r + 1][k] < 0) {
              grid[r + 1][k] = Math.abs(grid[r + 1][k]);
              brokenBlocks.push({ r: r + 1, c: k });
            }
          }
          
          points += 50 * runLen;
          changed = true;
        }
        
        // Start new run only if cell is not protected
        if (!isProtected && val > 0) {
          runStart = c;
          runShade = val;
          runLen = 1;
        } else {
          runStart = -1;
          runShade = 0;
          runLen = 0;
        }
      }
    }
  }

  if (changed) applyGravity(grid);
  
  return { changed, points, merges, consumed, brokenBlocks };
}

// Phase 2: Find and destroy all shade 6 blocks
// In Classic Breaker Plus, 6 ALWAYS explodes BUT breaks blocks/5s below first!
function processExplosions(grid) {
  let explosions = [];
  let points = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] >= 6) {
        // Check what's below the 6 BEFORE it explodes
        if (r + 1 < ROWS) {
          const below = grid[r + 1][c];
          
          if (below < 0) {
            // Block below → break it!
            grid[r + 1][c] = Math.abs(below);
            points += 100;
          } else if (below === 5) {
            // 5 below → explode the 5 too!
            grid[r + 1][c] = 0;
            explosions.push({ r: r + 1, c, shade: 5 });
            points += 100;
          }
        }
        
        // Now explode the 6
        explosions.push({ r, c, shade: 6 });
        grid[r][c] = 0;
        points += 200;
      }
    }
  }

  if (explosions.length > 0) applyGravity(grid);
  return { explosions, points };
}

// Exponential chain scoring — inspired by Drop7's curve
// Chain 1: x1, Chain 2: x5, Chain 3: x15, Chain 4: x32, Chain 5: x56
function chainMultiplier(combo) {
  if (combo <= 1) return 1;
  return Math.round(Math.pow(combo, 2.5));
}

function processAllChains(grid) {
  let totalPoints = 0;
  let combo = 0;
  let steps = [];
  let safety = 0;
  let protectedCells = new Set(); // Track cells that were just revealed from blocks

  while (safety++ < 50) {
    let didAnything = false;

    // Step A: Vertical merges
    const beforeVert = cloneGrid(grid);
    const vertResult = processVerticalMerges(grid);

    if (vertResult.changed) {
      combo++;
      didAnything = true;
      const mult = chainMultiplier(combo);
      const stepPoints = vertResult.points * mult;
      totalPoints += stepPoints;
      const afterVert = cloneGrid(grid);

      // Mark broken blocks as protected for this chain
      if (vertResult.brokenBlocks) {
        vertResult.brokenBlocks.forEach(b => protectedCells.add(`${b.r},${b.c}`));
      }

      const has6 = vertResult.merges.some(m => m.newShade >= 6);
      steps.push({
        type: "merge", subType: "vertical",
        beforeGrid: beforeVert, afterGrid: afterVert,
        explosions: [],
        merges: vertResult.merges, consumed: vertResult.consumed,
        combo, stepPoints,
      });

      if (has6) {
        const beforeExplode = cloneGrid(grid);
        const expResult = processExplosions(grid);
        if (expResult.explosions.length > 0) {
          combo++;
          const expMult = chainMultiplier(combo);
          const expStepPoints = expResult.points * expMult;
          totalPoints += expStepPoints;
          steps.push({
            type: "explode",
            beforeGrid: beforeExplode, afterGrid: cloneGrid(grid),
            explosions: expResult.explosions,
            merges: [], consumed: [], combo, stepPoints: expStepPoints,
          });
        }
      }
    }

    // Step B: Horizontal merges with protected cells
    const beforeHoriz = cloneGrid(grid);
    const horizResult = processHorizontalMerges(grid, protectedCells);

    if (horizResult.changed) {
      combo++;
      didAnything = true;
      const mult = chainMultiplier(combo);
      const stepPoints = horizResult.points * mult;
      totalPoints += stepPoints;
      const afterHoriz = cloneGrid(grid);

      // Mark broken blocks as protected for this chain
      if (horizResult.brokenBlocks) {
        horizResult.brokenBlocks.forEach(b => protectedCells.add(`${b.r},${b.c}`));
      }

      const has6 = horizResult.merges.some(m => m.newShade >= 6);
      steps.push({
        type: "merge", subType: "horizontal",
        beforeGrid: beforeHoriz, afterGrid: afterHoriz,
        explosions: [],
        merges: horizResult.merges, consumed: horizResult.consumed,
        combo, stepPoints,
      });

      if (has6) {
        const beforeExplode = cloneGrid(grid);
        const expResult = processExplosions(grid);
        if (expResult.explosions.length > 0) {
          combo++;
          const expMult = chainMultiplier(combo);
          const expStepPoints = expResult.points * expMult;
          totalPoints += expStepPoints;
          steps.push({
            type: "explode",
            beforeGrid: beforeExplode, afterGrid: cloneGrid(grid),
            explosions: expResult.explosions,
            merges: [], consumed: [], combo, stepPoints: expStepPoints,
          });
        }
      }
    }

    // Step C: Check for leftover explosions
    if (!didAnything) {
      const expCheck = processExplosions(grid);
      if (expCheck.explosions.length > 0) {
        combo++;
        const mult = chainMultiplier(combo);
        const stepPoints = expCheck.points * mult;
        totalPoints += stepPoints;
        steps.push({
          type: "explode",
          beforeGrid: beforeVert, afterGrid: cloneGrid(grid),
          explosions: expCheck.explosions,
          merges: [], consumed: [], combo, stepPoints,
        });
        continue;
      }
      break;
    }
  }

  return { totalPoints, combo, steps };
}

function Particles({ cells, animKey, cellSize }) {
  const CELL_SIZE = cellSize;
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (cells.length === 0) { setParticles([]); return; }
    const ps = [];
    cells.forEach(({ r, c, shade }) => {
      const cx = GAP + c * (CELL_SIZE + GAP) + CELL_SIZE / 2;
      const cy = GAP + r * (CELL_SIZE + GAP) + CELL_SIZE / 2;
      const color = SHADES[shade]?.bg || "#FF4444";
      const count = shade >= 6 ? 22 : 10;
      const baseSpeed = shade >= 6 ? 25 : 40;
      const extraSpeed = shade >= 6 ? 55 : 60;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.8;
        const speed = baseSpeed + Math.random() * extraSpeed;
        const isBig = shade >= 6 && Math.random() > 0.5;
        ps.push({
          id: `${r}-${c}-${i}-${animKey}`,
          x: cx + (Math.random() - 0.5) * 8, y: cy + (Math.random() - 0.5) * 8,
          dx: Math.cos(angle) * speed * (isBig ? 0.6 : 1),
          dy: Math.sin(angle) * speed * (isBig ? 0.6 : 1) - (shade >= 6 ? 15 : 0),
          color: shade >= 6
            ? (isBig ? "#CC0000" : ["#FF2200", "#DD0000", "#FF4444", "#AA0000", "#FF6666"][i % 5])
            : color,
          size: shade >= 6 ? (isBig ? 9 + Math.random() * 6 : 3 + Math.random() * 5) : 4 + Math.random() * 5,
          isSplat: shade >= 6,
        });
      }
    });
    setParticles(ps);
    const t = setTimeout(() => setParticles([]), 1000);
    return () => clearTimeout(t);
  }, [cells, animKey, CELL_SIZE]);

  if (particles.length === 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 15, overflow: "hidden", borderRadius: 12 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: p.x, top: p.y,
          width: p.size, height: p.isSplat ? p.size * (0.7 + Math.random() * 0.6) : p.size,
          borderRadius: p.isSplat ? "45% 55% 50% 50%" : "50%",
          background: p.color,
          boxShadow: p.isSplat ? `0 0 8px ${p.color}66, 0 3px 6px rgba(0,0,0,0.3)` : `0 0 8px ${p.color}`,
          animation: p.isSplat ? "splatFly 1s ease-out forwards" : "particleFly 0.9s ease-out forwards",
          "--pdx": `${p.dx}px`, "--pdy": `${p.dy}px`,
        }} />
      ))}
    </div>
  );
}

// Settings for audio control
function getSettings() {
  const saved = localStorage.getItem('classic_breaker_plus_settings');
  return saved ? JSON.parse(saved) : { audioLevel: 'normal' };
}

function saveSettings(settings) {
  localStorage.setItem('classic_breaker_plus_settings', JSON.stringify(settings));
}

export default function ClassicBreakerPlus() {
  const [settings, setSettings] = useState(getSettings());
  const [showSettings, setShowSettings] = useState(false);

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const MAX_GAME_WIDTH = 400;

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
  const [currentShade, setCurrentShade] = useState(() => randomShade(0));
  const [nextShade, setNextShade] = useState(() => randomShade(0));
  const [hoverCol, setHoverCol] = useState(3);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [turn, setTurn] = useState(0);
  const [dropsLeft, setDropsLeft] = useState(RUN_SIZE);
  const [lastCombo, setLastCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [risingRow, setRisingRow] = useState(false);
  const [risingDust, setRisingDust] = useState([]);
  const [glowingRow, setGlowingRow] = useState(false);
  const gameRef = useRef(null);
  const processingRef = useRef(false);
  const { elapsed, startTimer, stopTimer, resetTimer } = useGameTimer();
  const [endStats, setEndStats] = useState(null);
  const gameStartedRef = useRef(false);

  const [animConsumed, setAnimConsumed] = useState([]);
  const [animMerges, setAnimMerges] = useState([]);
  const [animExplode, setAnimExplode] = useState([]);
  const [animHighlight, setAnimHighlight] = useState([]);
  const [dropAnim, setDropAnim] = useState(null);
  const [animKey, setAnimKey] = useState(0);
  const [screenFlash, setScreenFlash] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [floatingScores, setFloatingScores] = useState([]);
  const [shakeKey, setShakeKey] = useState(0);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [newHighScore, setNewHighScore] = useState(false);
  const floatIdRef = useRef(0);

  const resetGame = useCallback(() => {
    setGrid(createStartingGrid());
    setCurrentShade(randomShade(0));
    setNextShade(randomShade(0));
    setScore(0); setTurn(0); setGameOver(false); setProcessing(false);
    setDropsLeft(RUN_SIZE); setRisingRow(false); setRisingDust([]); setGlowingRow(false);
    setLastCombo(0); setShowCombo(false);
    setAnimConsumed([]); setAnimMerges([]); setAnimExplode([]); setAnimHighlight([]); setDropAnim(null);
    setScreenFlash(false); setShowRules(false);
    setFloatingScores([]); setShakeKey(0); setShakeIntensity(0); setNewHighScore(false);
    processingRef.current = false;
    resetTimer(); gameStartedRef.current = false; setEndStats(null);
  }, [resetTimer]);

  const spawnFloatScore = useCallback((r, c, points, combo) => {
    const id = ++floatIdRef.current;
    const mult = chainMultiplier(combo);
    const text = combo > 1 ? `+${points} ×${mult}` : `+${points}`;
    setFloatingScores(prev => [...prev, { id, r, c, text, combo }]);
    setTimeout(() => setFloatingScores(prev => prev.filter(f => f.id !== id)), 1200);
  }, []);

  const triggerShake = useCallback((combo) => {
    if (combo >= 2) {
      setShakeIntensity(Math.min(combo, 5));
      setShakeKey(k => k + 1);
      setTimeout(() => setShakeIntensity(0), 300 + combo * 50);
    }
  }, []);

  const dropPiece = useCallback((col) => {
    if (processingRef.current || gameOver) return;
    if (col < 0 || col >= COLS) return;

    const newGrid = cloneGrid(grid);
    let targetRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (newGrid[r][col] === 0) { targetRow = r; break; }
    }
    if (targetRow === -1) return;

    // Just drop the piece normally - blocks break only on merges!
    newGrid[targetRow][col] = currentShade;
    setGrid(cloneGrid(newGrid));
    setDropAnim({ r: targetRow, c: col });
    haptic.drop(settings.audioLevel);
    
    if (!gameStartedRef.current) { startTimer(); gameStartedRef.current = true; }
    setProcessing(true);
    processingRef.current = true;

    const newTurn = turn + 1;

    // Update the drop piece immediately so player sees next piece right away
    setCurrentShade(nextShade);
    setNextShade(randomShade(newTurn));

    setTimeout(() => {
      setDropAnim(null);
      const result = processAllChains(newGrid);

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
          // Show the grid WITH the 7s visible (beforeGrid), pulsing dangerously
          setGrid(cloneGrid(step.beforeGrid));
          setAnimMerges([]); setAnimConsumed([]);
          // Pause to let player see the 7 wobbling
          setTimeout(() => {
            // Now explode them
            setAnimExplode(step.explosions);
            setAnimKey(k => k + 1);
            setScreenFlash(true);
            setTimeout(() => setScreenFlash(false), 300);
            haptic.explode(step.combo, settings.audioLevel);
            triggerShake(step.combo);

            // Floating score at first explosion location
            if (step.explosions.length > 0) {
              const e = step.explosions[0];
              spawnFloatScore(e.r, e.c, step.stepPoints, step.combo);
            }

            if (step.combo >= 2) {
              setLastCombo(step.combo);
              setShowCombo(true);
              setTimeout(() => setShowCombo(false), 1200);
            }

            // After explosion animation, show result
            setTimeout(() => {
              setAnimExplode([]);
              setGrid(cloneGrid(step.afterGrid));
              setTimeout(() => { stepIdx++; playStep(); }, 200);
            }, 600);
          }, 500);

        } else {
          // Merge step — use subType for distinct animations
          const isHorizontal = step.subType === "horizontal";

          if (isHorizontal) {
            // Highlight the horizontal group first
            const hCells = [];
            step.consumed.forEach(c => hCells.push({ r: c.r, c: c.c }));
            step.merges.forEach(m => hCells.push({ r: m.r, c: m.c }));
            setGrid(cloneGrid(step.beforeGrid));
            setAnimHighlight(hCells);
            setAnimKey(k => k + 1);
          }

          setTimeout(() => {
            setAnimHighlight([]);
            if (step.consumed.length > 0) {
              setGrid(cloneGrid(step.beforeGrid));
              setAnimConsumed(step.consumed);
              setAnimKey(k => k + 1);
            }

            setTimeout(() => {
              setAnimConsumed([]);
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
                triggerShake(step.combo);
              }

              setTimeout(() => {
                setAnimMerges([]);
                stepIdx++;
                playStep();
              }, 350);
            }, step.consumed.length > 0 ? 250 : 50);
          }, isHorizontal ? 300 : 0);
        }
      };
      playStep();
    }, 200);
  }, [grid, currentShade, nextShade, turn, gameOver]);

  // Push a random row from the bottom, shift everything up
  const pushRowUp = useCallback((g, turnNum) => {
    // Check if top row has any blocks — if so, game over
    for (let c = 0; c < COLS; c++) {
      if (g[0][c] !== 0) return { grid: g, gameOver: true };
    }
    // Shift all rows up by 1
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        g[r][c] = g[r + 1][c];
      }
    }
    // Fill bottom row with BLOCKED cells (negative values)
    for (let c = 0; c < COLS; c++) {
      const shade = randomShade(turnNum);
      g[ROWS - 1][c] = -shade; // Negative = blocked!
    }
    return { grid: g, gameOver: false };
  }, []);

  const finalizeDrop = useCallback((finalGrid, points, combo, newTurn) => {
    setScore(prev => {
      const ns = prev + points + 10;
      setHighScore(hs => {
        if (ns > hs && hs > 0) {
          setNewHighScore(true);
          setTimeout(() => setNewHighScore(false), 2500);
        }
        return Math.max(hs, ns);
      });
      return ns;
    });
    setTurn(newTurn);

    const newDropsLeft = dropsLeft - 1;

    if (newDropsLeft <= 0) {
      // End of run — push a row up
      setDropsLeft(RUN_SIZE); // Reset immediately to prevent double-trigger
      setGrid(cloneGrid(finalGrid));
      setRisingRow(true);
      haptic.rise(settings.audioLevel);

      setTimeout(() => {
        const pushGrid = cloneGrid(finalGrid);
        const result = pushRowUp(pushGrid, newTurn);

        if (result.gameOver) {
          setGrid(cloneGrid(pushGrid));
          setRisingRow(false);
          setGlowingRow(false);
          setGameOver(true);
          haptic.gameOver(settings.audioLevel);
          setProcessing(false);
          processingRef.current = false;
          return;
        }

        // Show the new row first with dust effect
        setGrid(cloneGrid(pushGrid));
        setRisingRow(false);
        setGlowingRow(true);
        setTimeout(() => setGlowingRow(false), 600);

        // Spawn dust particles along bottom row
        const dust = [];
        for (let i = 0; i < 30; i++) {
          dust.push({
            id: i,
            x: Math.random() * 100,
            bottom: 2 + Math.random() * 12,
            size: 6 + Math.random() * 12,
            opacity: 0.6 + Math.random() * 0.4,
            delay: Math.random() * 0.15,
            duration: 0.5 + Math.random() * 0.5,
          });
        }
        setRisingDust(dust);
        setTimeout(() => setRisingDust([]), 1200);

        // Pause to let player see the new row, then process chains
        setTimeout(() => {
        const chainResult = processAllChains(pushGrid);

        if (chainResult.steps.length > 0) {
          let stepIdx = 0;
          const playRisingChain = () => {
            if (stepIdx >= chainResult.steps.length) {
              setGrid(cloneGrid(pushGrid));
              let isOver = true;
              for (let c = 0; c < COLS; c++) { if (pushGrid[0][c] === 0) { isOver = false; break; } }
              if (isOver) { setGameOver(true); haptic.gameOver(settings.audioLevel); }
              setScore(prev => {
                const ns = prev + chainResult.totalPoints;
                setHighScore(hs => {
                  if (ns > hs && hs > 0) {
                    setNewHighScore(true);
                    setTimeout(() => setNewHighScore(false), 2500);
                  }
                  return Math.max(hs, ns);
                });
                return ns;
              });
              setProcessing(false);
              processingRef.current = false;
              return;
            }
            const step = chainResult.steps[stepIdx];
            setGrid(cloneGrid(step.afterGrid));
            if (step.merges.length > 0) {
              setAnimMerges(step.merges); setAnimKey(k => k + 1);
              haptic.merge(step.combo, settings.audioLevel);
              const m = step.merges[0];
              spawnFloatScore(m.r, m.c, step.stepPoints || 0, step.combo);
            }
            if (step.explosions.length > 0) {
              setAnimExplode(step.explosions); setAnimKey(k => k + 1);
              setScreenFlash(true); setTimeout(() => setScreenFlash(false), 300);
              haptic.explode(step.combo, settings.audioLevel);
              if (!step.merges.length) {
                const e = step.explosions[0];
                spawnFloatScore(e.r, e.c, step.stepPoints || 0, step.combo);
              }
            }
            if (step.combo >= 2) {
              haptic.chain(step.combo, settings.audioLevel);
              triggerShake(step.combo);
            }
            setTimeout(() => {
              setAnimMerges([]); setAnimExplode([]);
              stepIdx++;
              playRisingChain();
            }, 400);
          };
          playRisingChain();
        } else {
          // No chains — check game over
          let isOver = true;
          for (let c = 0; c < COLS; c++) { if (pushGrid[0][c] === 0) { isOver = false; break; } }
          if (isOver) { setGameOver(true); haptic.gameOver(settings.audioLevel); }
          setProcessing(false);
          processingRef.current = false;
        }
        }, 500); // pause after showing new row
      }, 500);
    } else {
      // Still drops left in this run
      setGrid(finalGrid);
      setDropsLeft(newDropsLeft);
      // Check game over
      let isOver = true;
      for (let c = 0; c < COLS; c++) { if (finalGrid[0][c] === 0) { isOver = false; break; } }
      if (isOver) { setGameOver(true); haptic.gameOver(settings.audioLevel); }
      setProcessing(false);
      processingRef.current = false;
    }
  }, [dropsLeft, pushRowUp]);

  useEffect(() => {
    const handler = (e) => {
      if (showRules) {
        if (e.key === "Escape") setShowRules(false);
        return;
      }
      if (gameOver) { if (e.key === "r" || e.key === "R") resetGame(); return; }
      if (processingRef.current) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); setHoverCol(c => Math.max(0, c - 1)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setHoverCol(c => Math.min(COLS - 1, c + 1)); }
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); dropPiece(hoverCol); }
      else if (e.key === "r" || e.key === "R") resetGame();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hoverCol, dropPiece, gameOver, resetGame, showRules]);

  useEffect(() => { gameRef.current?.focus(); }, []);

  useEffect(() => {
    getGameStats("classic_breaker_plus").then(stats => {
      if (stats?.highScore) setHighScore(stats.highScore);
    });
  }, []);

  useEffect(() => {
    if (!gameOver) return;
    const duration = stopTimer();
    saveGameResult("classic_breaker_plus", score, turn, duration).then(result => {
      if (result) {
        setEndStats({ duration, avgDuration: result.avgDuration, avgScore: result.avgScore, totalGames: result.totalGames });
        if (result.highScore) setHighScore(result.highScore);
      } else {
        setEndStats({ duration, avgDuration: 0, avgScore: 0, totalGames: 0 });
      }
    });
  }, [gameOver]);

  const consumedSet = new Set(animConsumed.map(c => cellKey(c.r, c.c)));
  const mergeSet = new Set(animMerges.map(m => cellKey(m.r, m.c)));
  const explodeSet = new Set(animExplode.map(e => cellKey(e.r, e.c)));
  const highlightSet = new Set(animHighlight.map(h => cellKey(h.r, h.c)));

  const consumedMap = {};
  animConsumed.forEach(c => {
    consumedMap[cellKey(c.r, c.c)] = {
      dx: (c.targetC - c.c) * (CELL_SIZE + GAP),
      dy: (c.targetR - c.r) * (CELL_SIZE + GAP),
    };
  });

  // Danger level: how close to losing
  const topRowFill = grid[0].filter(c => c > 0).length;
  const row1Fill = grid[1] ? grid[1].filter(c => c > 0).length : 0;
  const dangerLevel = topRowFill > 0 ? 3 : row1Fill >= COLS - 1 ? 2 : row1Fill >= Math.ceil(COLS / 2) ? 1 : 0;

  return (
    <div ref={gameRef} tabIndex={0} style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      height: "100dvh", background: "#0a0a0a",
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      color: "#e8d0d0", outline: "none", overflow: "hidden", userSelect: "none", position: "relative",
      padding: 0, maxWidth: MAX_GAME_WIDTH, margin: "0 auto",
    }}>
      {/* Help, Restart & Audio buttons */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 8, marginBottom: 6 }}>
        <button onClick={() => setShowRules(true)} style={{
          width: 36, height: 36, borderRadius: 8, border: "1px solid #442222",
          background: "rgba(255,255,255,0.04)", color: "#886666", fontSize: 16, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.target.style.borderColor = "#FF6B6B"; e.target.style.color = "#FF6B6B"; }}
        onMouseLeave={e => { e.target.style.borderColor = "#442222"; e.target.style.color = "#886666"; }}>?</button>
        <button onClick={() => setShowSettings(true)} style={{
          width: 36, height: 36, borderRadius: 8, border: "1px solid #442222",
          background: "rgba(255,255,255,0.04)", color: "#886666", fontSize: 16, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.target.style.borderColor = "#4488FF"; e.target.style.color = "#4488FF"; }}
        onMouseLeave={e => { e.target.style.borderColor = "#442222"; e.target.style.color = "#886666"; }}>🔊</button>
        <button onClick={resetGame} style={{
          width: 36, height: 36, borderRadius: 8, border: "1px solid #442222",
          background: "rgba(255,255,255,0.04)", color: "#886666", fontSize: 14, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.target.style.borderColor = "#FF6B6B"; e.target.style.color = "#FF6B6B"; }}
        onMouseLeave={e => { e.target.style.borderColor = "#442222"; e.target.style.color = "#886666"; }}>↺</button>
      </div>

      {/* Title & Scores */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <h1 style={{
          fontSize: 30, fontWeight: 800, margin: 0,
          background: "linear-gradient(135deg, #FF6B6B, #EE2222, #CC0000)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: 3, textTransform: "uppercase",
        }}>CLASSIC BREAKER PLUS</h1>
        <div style={{ fontSize: 9, color: "#553333", letterSpacing: 2, marginTop: 3 }}>TURN {turn} · {formatDuration(elapsed)}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#886666", textTransform: "uppercase", marginBottom: 2 }}>Score</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#FFD700", fontVariantNumeric: "tabular-nums" }}>{score}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#886666", textTransform: "uppercase", marginBottom: 2 }}>Best</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#FFD700", fontVariantNumeric: "tabular-nums" }}>{highScore}</div>
          </div>
        </div>
      </div>

      {/* Drop Block */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#665555", letterSpacing: 2, textTransform: "uppercase" }}>Next</span>
          <div style={{
            width: Math.min(Math.round(CELL_SIZE * 0.7), 40), height: Math.min(Math.round(CELL_SIZE * 0.7), 40), borderRadius: Math.round(CELL_SIZE * 0.12),
            background: SHADES[nextShade]?.bg, border: `2px solid ${SHADES[nextShade]?.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: Math.min(Math.round(CELL_SIZE * 0.25), 14), fontWeight: 700, color: SHADES[nextShade]?.text,
            boxShadow: `0 0 12px ${SHADES[nextShade]?.glow}40`,
          }}>{DISPLAY[nextShade]}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#887777", letterSpacing: 2, textTransform: "uppercase" }}>Drop</span>
          <div style={{
            width: Math.min(CELL_SIZE, 56), height: Math.min(CELL_SIZE, 56), borderRadius: Math.round(CELL_SIZE * 0.17),
            background: SHADES[currentShade]?.bg, border: `3px solid ${SHADES[currentShade]?.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: Math.min(Math.round(CELL_SIZE * 0.35), 20), fontWeight: 800, color: SHADES[currentShade]?.text,
            boxShadow: `0 0 20px ${SHADES[currentShade]?.glow}50, 0 4px 12px rgba(0,0,0,0.3)`,
            animation: "pulse 1.5s ease-in-out infinite",
          }}>{DISPLAY[currentShade]}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: "#665555", letterSpacing: 2, textTransform: "uppercase" }}>Left</span>
          <div style={{ display: "flex", gap: 4 }}>
            {Array(RUN_SIZE).fill(0).map((_, i) => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: "50%",
                background: i < dropsLeft ? "#FF6B6B" : "#2a1515",
                border: `1px solid ${i < dropsLeft ? "#FF4444" : "#331818"}`,
                boxShadow: i < dropsLeft ? "0 0 6px #FF444480" : "none",
                transition: "all 0.2s ease",
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Column arrows + Grid pushed to bottom */}
      <div style={{ marginTop: "auto", marginBottom: 10, width: "100%", maxWidth: MAX_GAME_WIDTH, paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>
      {/* Column arrows */}
      <div style={{ display: "flex", gap: GAP, marginBottom: 2, width: "100%", paddingLeft: GAP, boxSizing: "border-box" }}>
        {Array(COLS).fill(0).map((_, c) => (
          <div key={c} style={{
            flex: 1, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
            color: hoverCol === c ? "#FF6B6B" : "#442222", fontSize: 14,
            transition: "color 0.15s", cursor: "pointer",
          }}
          onClick={() => { setHoverCol(c); dropPiece(c); }}
          onMouseEnter={() => setHoverCol(c)}>▼</div>
        ))}
      </div>

      {/* Grid */}
      <div key={`shake-${shakeKey}`} style={{
        animation: shakeIntensity > 0
          ? `screenShake 0.08s ease-in-out ${shakeIntensity} both`
          : "none",
      }}>
      <div style={{
        position: "relative", background: "#1a1a1a", borderRadius: 0, padding: GAP,
        border: "none", width: "100%", boxSizing: "border-box", overflow: "visible",
        boxShadow: dangerLevel >= 3
          ? "inset 0 0 40px rgba(255,0,0,0.25), 0 0 30px rgba(255,0,0,0.15)"
          : dangerLevel >= 2
            ? "inset 0 0 25px rgba(255,50,0,0.15)"
            : dangerLevel >= 1
              ? "inset 0 0 15px rgba(255,80,0,0.08)"
              : "none",
        animation: dangerLevel >= 3 && !processing
          ? "dangerPulse 0.5s ease-in-out infinite"
          : dangerLevel >= 2 && !processing
            ? "dangerPulse 0.8s ease-in-out infinite"
            : dropsLeft === 1 && !processing && shakeIntensity === 0
              ? "risingWarning 1s ease-in-out infinite"
              : "none",
      }}>
        {/* Danger gradient overlay */}
        {dangerLevel >= 1 && !gameOver && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: dangerLevel >= 3 ? "60%" : dangerLevel >= 2 ? "40%" : "25%",
            background: dangerLevel >= 3
              ? "linear-gradient(180deg, rgba(255,0,0,0.15) 0%, rgba(255,0,0,0.05) 40%, transparent 100%)"
              : dangerLevel >= 2
                ? "linear-gradient(180deg, rgba(255,40,0,0.1) 0%, transparent 100%)"
                : "linear-gradient(180deg, rgba(255,80,0,0.05) 0%, transparent 100%)",
            pointerEvents: "none", zIndex: 1, borderRadius: 0,
            animation: dangerLevel >= 2 ? "dangerGlow 0.6s ease-in-out infinite alternate" : "none",
          }} />
        )}

        {!processing && !gameOver && (
          <div style={{
            position: "absolute",
            left: GAP + hoverCol * (CELL_SIZE + GAP), top: 0, width: CELL_SIZE, height: "100%",
            background: `linear-gradient(180deg, ${SHADES[currentShade]?.glow}10 0%, transparent 100%)`,
            borderRadius: 12, pointerEvents: "none", transition: "left 0.1s ease", zIndex: 1,
          }} />
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: GAP, position: "relative", zIndex: 2,
        }}>
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const key = cellKey(r, c);
              const isBlocked = cell < 0;
              const actualCell = isBlocked ? Math.abs(cell) : cell;
              const shade = SHADES[isBlocked ? cell : actualCell]; // Use negative key for blocked style
              const isConsumed = consumedSet.has(key);
              const isMerge = mergeSet.has(key);
              const isExploding = explodeSet.has(key);
              const isHighlight = highlightSet.has(key);
              const isDrop = dropAnim && dropAnim.r === r && dropAnim.c === c;
              const cData = consumedMap[key];

              let animClass = "";
              if (isHighlight) animClass = "cell-highlight";
              else if (isConsumed) animClass = "cell-consumed";
              else if (isMerge) animClass = "cell-merge-pulse";
              else if (isExploding) animClass = "cell-explode";
              else if (isDrop) animClass = "cell-drop";
              else if (glowingRow && r === ROWS - 1 && cell !== 0) animClass = "cell-new-row";
              else if (actualCell === 6 && !isBlocked) animClass = "cell-shade6";
              else if (r === 0 && cell > 0 && dangerLevel >= 3) animClass = "cell-danger";
              else if (r <= 1 && cell > 0 && dangerLevel >= 2) animClass = "cell-danger-mild";

              return (
                <div
                  key={`${r}-${c}-${animKey}-${animClass}`}
                  className={animClass}
                  onClick={() => { setHoverCol(c); dropPiece(c); }}
                  onMouseEnter={() => setHoverCol(c)}
                  style={{
                    width: "100%", aspectRatio: "1", borderRadius: Math.round(CELL_SIZE * 0.17),
                    background: isBlocked
                      ? `linear-gradient(135deg, ${shade.bg}, ${shade.glow})`
                      : actualCell === 6
                        ? `radial-gradient(circle at 40% 40%, #FF4444, #CC0000 50%, #660000)`
                        : cell > 0
                          ? `radial-gradient(circle at 35% 35%, ${shade.glow}, ${shade.bg} 70%)`
                          : "#111111",
                    border: isBlocked
                      ? `2px solid ${shade.border}`
                      : actualCell === 6
                        ? "2px solid #FF4400"
                        : cell > 0 ? `1px solid ${shade.border}` : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: actualCell === 6 && !isBlocked ? Math.round(CELL_SIZE * 0.45) : cell !== 0 ? Math.round(CELL_SIZE * 0.35) : 0, fontWeight: 800,
                    color: shade?.text || "transparent", cursor: "pointer",
                    boxShadow: isBlocked
                      ? `inset 0 0 20px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)`
                      : actualCell === 6
                        ? "0 0 16px #CC0000, 0 0 30px #88000060, inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 3px 6px rgba(255,100,100,0.2)"
                        : cell > 0
                          ? isMerge
                            ? `0 0 24px ${shade.glow}, 0 0 48px ${shade.glow}80, inset 0 0 12px rgba(255,255,255,0.2)`
                            : `0 2px 8px ${shade.glow}30, inset 0 1px 0 rgba(255,255,255,0.15)`
                          : "none",
                    position: "relative", overflow: isConsumed ? "visible" : "hidden",
                    "--consume-dx": cData ? `${cData.dx}px` : "0px",
                    "--consume-dy": cData ? `${cData.dy}px` : "0px",
                    zIndex: isConsumed ? 5 : isMerge ? 4 : actualCell === 6 && !isBlocked ? 3 : 2,
                  }}
                >
                  {isBlocked ? (
                    <div style={{ 
                      width: Math.round(CELL_SIZE * 0.75),
                      height: Math.round(CELL_SIZE * 0.75),
                      background: "linear-gradient(145deg, #5a5a5a, #3a3a3a)",
                      borderRadius: 4,
                      boxShadow: `
                        inset -2px -2px 4px rgba(0,0,0,0.5),
                        inset 2px 2px 3px rgba(255,255,255,0.15),
                        0 2px 4px rgba(0,0,0,0.3)
                      `,
                    }} />
                  ) : cell > 0 && (
                    <>
                      <div style={{
                        position: "absolute", top: 4, left: 6, right: 6, height: "35%",
                        borderRadius: "50%",
                        background: cell === 6
                          ? "radial-gradient(ellipse at 30% 30%, rgba(255,200,200,0.5) 0%, transparent 60%)"
                          : "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)",
                        pointerEvents: "none",
                      }} />
                      {DISPLAY[cell]}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <Particles cells={animExplode} animKey={animKey} cellSize={CELL_SIZE} />

        {/* Screen flash on shade 6 explosion */}
        {screenFlash && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: 12,
            pointerEvents: "none", zIndex: 14,
            animation: "screenFlash 0.35s ease-out forwards",
          }} />
        )}

        {/* Rising row dust effect */}
        {risingDust.length > 0 && (
          <>
          {/* Bright flash line across bottom */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 5,
            background: "rgba(255,220,140,1)",
            boxShadow: "0 0 20px rgba(255,200,100,0.9), 0 -8px 30px rgba(255,150,60,0.5), 0 -15px 40px rgba(255,100,30,0.2)",
            pointerEvents: "none", zIndex: 16,
            animation: "risingGlow 0.7s ease-out forwards",
          }} />
          {/* Warm glow from bottom */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "30%",
            background: "linear-gradient(0deg, rgba(255,160,80,0.4) 0%, rgba(255,120,40,0.15) 40%, transparent 100%)",
            pointerEvents: "none", zIndex: 14,
            animation: "risingGlow 0.8s ease-out forwards",
          }} />
          </>
        )}
        {risingDust.map(d => (
          <div key={d.id} style={{
            position: "absolute",
            left: `${d.x}%`, bottom: `${d.bottom}%`,
            width: d.size, height: d.size,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,240,180,1), rgba(255,180,80,0.7))",
            boxShadow: `0 0 ${d.size + 6}px rgba(255,200,100,0.8), 0 0 ${d.size + 12}px rgba(255,150,50,0.3)`,
            pointerEvents: "none", zIndex: 15,
            opacity: 0,
            animation: `risingDust ${d.duration}s ease-out ${d.delay}s forwards`,
          }} />
        ))}

        {animMerges.map((m, i) => {
          const shade = SHADES[m.newShade];
          return (
            <div key={`ring-${i}-${animKey}`} style={{
              position: "absolute",
              left: GAP + m.c * (CELL_SIZE + GAP),
              top: GAP + m.r * (CELL_SIZE + GAP),
              width: CELL_SIZE, height: CELL_SIZE,
              borderRadius: 10, pointerEvents: "none", zIndex: 12,
              border: `3px solid ${shade?.bg || "#FF4444"}`,
              animation: "mergeRing 0.4s ease-out forwards",
            }} />
          );
        })}

        {/* Floating score numbers */}
        {floatingScores.map(f => (
          <div key={f.id} style={{
            position: "absolute",
            left: GAP + f.c * (CELL_SIZE + GAP) + CELL_SIZE / 2,
            top: GAP + f.r * (CELL_SIZE + GAP),
            transform: "translateX(-50%)",
            fontSize: f.combo > 2 ? 18 : f.combo > 1 ? 16 : 13,
            fontWeight: 800,
            color: f.combo > 2 ? "#FFDD44" : f.combo > 1 ? "#FF8844" : "#FFAAAA",
            textShadow: f.combo > 2
              ? "0 0 12px #FFAA00, 0 0 24px #FF660088"
              : f.combo > 1
                ? "0 0 8px #FF440088"
                : "0 0 6px #FF000044",
            zIndex: 22, pointerEvents: "none", whiteSpace: "nowrap",
            animation: "floatScore 1.1s ease-out forwards",
          }}>{f.text}</div>
        ))}

        {showCombo && lastCombo >= 2 && (
          <div key={`combo-${animKey}`} style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 48, fontWeight: 900, color: "#FF4444",
            textShadow: "0 0 30px rgba(255,50,50,0.6), 0 0 60px rgba(255,0,0,0.3)",
            zIndex: 20, pointerEvents: "none",
            animation: "comboPopup 1.2s ease-out forwards", letterSpacing: 2,
          }}>{lastCombo}x CHAIN! ×{chainMultiplier(lastCombo)}</div>
        )}

        {/* New High Score banner - only on game over */}

        {gameOver && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.9)",
            backdropFilter: "blur(4px)", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", borderRadius: 12, zIndex: 25,
          }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#FF4444", marginBottom: 8, textShadow: "0 0 20px rgba(255,50,50,0.5)" }}>GAME OVER</div>
            {score >= highScore && score > 0 && (
              <div style={{
                fontSize: 14, fontWeight: 800, letterSpacing: 3,
                color: "#FFD700", marginBottom: 8,
                textShadow: "0 0 12px #FFD70066",
                animation: "highScorePulse 1s ease-in-out infinite alternate",
              }}>★ NEW HIGH SCORE ★</div>
            )}
            <div style={{
              fontSize: 18, marginBottom: 4, fontWeight: 700,
              color: score >= highScore && score > 0 ? "#FFD700" : "#CC8888",
              textShadow: score >= highScore && score > 0 ? "0 0 12px #FFD70066" : "none",
            }}>Score: {score}</div>
            <div style={{ fontSize: 13, color: "#886666", marginBottom: 4 }}>Turns: {turn}</div>
            {endStats && (
              <>
                <div style={{ fontSize: 13, color: "#886666", marginBottom: 12 }}>
                  Time: {formatDuration(endStats.duration)}
                </div>
                <div style={{
                  background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 20px",
                  marginBottom: 16, border: "1px solid #331818", minWidth: 200,
                }}>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: "#665555", textTransform: "uppercase", textAlign: "center", marginBottom: 8 }}>Averages ({endStats.totalGames} games)</div>
                  <div style={{ display: "flex", justifyContent: "space-around", gap: 16 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#CC8888" }}>{endStats.avgScore}</div>
                      <div style={{ fontSize: 9, color: "#665555", letterSpacing: 1 }}>SCORE</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#CC8888" }}>{formatDuration(endStats.avgDuration)}</div>
                      <div style={{ fontSize: 9, color: "#665555", letterSpacing: 1 }}>TIME</div>
                    </div>
                  </div>
                </div>
              </>
            )}
            <button onClick={resetGame} style={{
              padding: "12px 32px", fontSize: 14, fontWeight: 700,
              background: "linear-gradient(135deg, #CC2222, #991111)", color: "#FFD0D0",
              border: "2px solid #DD3333", borderRadius: 10, cursor: "pointer",
              letterSpacing: 2, textTransform: "uppercase",
              boxShadow: "0 4px 20px rgba(200,20,20,0.3)", transition: "all 0.2s",
            }}
            onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.target.style.transform = "scale(1)"}>
              Play Again (R)
            </button>
          </div>
        )}
      </div>
      </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div onClick={() => setShowRules(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            maxWidth: 420, padding: "24px 28px", background: "#141010",
            borderRadius: 16, border: "1px solid #331818",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          }}>
            <div style={{ fontSize: 12, color: "#AA7777", letterSpacing: 3, marginBottom: 14, textTransform: "uppercase", textAlign: "center", fontWeight: 700 }}>
              How to Play
            </div>
            <div style={{ fontSize: 13, color: "#997777", lineHeight: 2 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                <span style={{ color: "#CC6666", fontWeight: 700, minWidth: 16 }}>🎯</span>
                <span><b style={{ color: "#CC9999" }}>Dropped piece wins:</b> Sequential pairs merge → dropped becomes result! 1+drop 2=2, 2+drop 1=1</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                <span style={{ color: "#CC6666", fontWeight: 700, minWidth: 16 }}>↔</span>
                <span><b style={{ color: "#CC9999" }}>Horizontal:</b> 3+ same numbers in a row merge together</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                <span style={{ color: "#888888", fontWeight: 700, minWidth: 16 }}>🧱</span>
                <span><b style={{ color: "#CC9999" }}>Blocks:</b> Gray cells are blocked. Merges break blocks below! +100 pts</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                <span style={{ color: "#FF4444", fontWeight: 700, minWidth: 16 }}>6</span>
                <span><b style={{ color: "#CC9999" }}>6s spawn early!</b> Can appear as drops. When 6 explodes → breaks blocks/5s below first!</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                <span style={{ color: "#CC6666", fontWeight: 700, minWidth: 16 }}>⚡</span>
                <span><b style={{ color: "#CC9999" }}>Chains:</b> Multiple merges multiply score! Chain 2: ×5, Chain 3: ×15</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <span style={{ color: "#CC6666", fontWeight: 700, minWidth: 16 }}>⬆</span>
                <span><b style={{ color: "#CC9999" }}>Every 5 drops</b> a random row rises from below!</span>
              </div>
            </div>
            {/* Shade reference */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14 }}>
              {[1, 2, 3, 4, 5, 6].map(s => (
                <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 7,
                    background: SHADES[s].bg, border: `1px solid ${SHADES[s].border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: SHADES[s].text,
                  }}>{DISPLAY[s]}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "#553333", textAlign: "center", letterSpacing: 1, marginBottom: 16 }}>
              ← → to aim · SPACE to drop · R to restart
            </div>
            <div style={{ textAlign: "center" }}>
              <button onClick={() => setShowRules(false)} style={{
                padding: "8px 28px", fontSize: 12, fontWeight: 700,
                background: "linear-gradient(135deg, #CC2222, #991111)", color: "#FFD0D0",
                border: "1px solid #DD3333", borderRadius: 8, cursor: "pointer",
                letterSpacing: 2, textTransform: "uppercase",
              }}>Got it</button>
            </div>
          </div>
        </div>
      )}

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
            zIndex: 200,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 360,
              padding: "24px",
              background: "#0a0a14",
              borderRadius: 16,
              border: "1px solid #224488",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: "#4488FF", marginBottom: 16 }}>
              AUDIO SETTINGS 🔊
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#6688BB", marginBottom: 8 }}>Sound Volume</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["off", "minimal", "normal", "maximum"].map(level => (
                  <button
                    key={level}
                    onClick={() => {
                      updateSetting("audioLevel", level);
                    }}
                    style={{
                      flex: "1 0 45%",
                      padding: "10px 8px",
                      background: settings.audioLevel === level ? "#4488FF" : "#1a1a2a",
                      border: `1px solid ${settings.audioLevel === level ? "#6699FF" : "#334466"}`,
                      borderRadius: 8,
                      color: settings.audioLevel === level ? "#fff" : "#6688BB",
                      cursor: "pointer",
                      fontSize: 11,
                      textTransform: "capitalize",
                      fontWeight: settings.audioLevel === level ? 700 : 400,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {level === "off" ? "🔇" : level === "minimal" ? "🔉" : level === "normal" ? "🔊" : "🔊🔊"} {level}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 9, color: "#445566", marginTop: 8, textAlign: "center" }}>
                Enhanced audio with volume control
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              style={{
                width: "100%",
                padding: "10px",
                background: "linear-gradient(135deg, #2244AA, #113388)",
                color: "#CCddFF",
                border: "1px solid #3355BB",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');

        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,100,100,0.2), 0 4px 12px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 28px rgba(255,100,100,0.4), 0 4px 16px rgba(0,0,0,0.4); }
        }

        @keyframes comboPopup {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          30% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -70%) scale(1); opacity: 0; }
        }

        .cell-highlight {
          animation: cellHighlight 0.26s ease-in-out 2 !important;
        }
        @keyframes cellHighlight {
          0% { transform: scale(1); filter: brightness(1); box-shadow: none; }
          50% { transform: scale(1.08); filter: brightness(1.6); box-shadow: 0 0 18px rgba(255,200,100,0.6), 0 0 36px rgba(255,100,50,0.3); }
          100% { transform: scale(1); filter: brightness(1); box-shadow: none; }
        }

        .cell-danger {
          animation: cellDanger 0.4s ease-in-out infinite alternate !important;
        }
        @keyframes cellDanger {
          0% { filter: brightness(1); box-shadow: 0 0 8px rgba(255,0,0,0.3); }
          100% { filter: brightness(1.3); box-shadow: 0 0 20px rgba(255,0,0,0.6), 0 0 40px rgba(255,0,0,0.2); }
        }

        .cell-danger-mild {
          animation: cellDangerMild 0.7s ease-in-out infinite alternate !important;
        }
        @keyframes cellDangerMild {
          0% { filter: brightness(1); }
          100% { filter: brightness(1.15); box-shadow: 0 0 10px rgba(255,50,0,0.25); }
        }

        .cell-consumed {
          animation: consumeSlide 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
        }
        @keyframes consumeSlide {
          0% { transform: scale(1) translate(0, 0); opacity: 1; filter: brightness(1); }
          50% { transform: scale(0.7) translate(calc(var(--consume-dx) * 0.6), calc(var(--consume-dy) * 0.6)); opacity: 0.8; filter: brightness(1.5); }
          100% { transform: scale(0.15) translate(var(--consume-dx), var(--consume-dy)); opacity: 0; filter: brightness(2); }
        }

        .cell-merge-pulse {
          animation: mergePulse 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }
        @keyframes mergePulse {
          0% { transform: scale(0.3); opacity: 0.4; filter: brightness(3); }
          35% { transform: scale(1.3); opacity: 1; filter: brightness(2); }
          65% { transform: scale(0.92); filter: brightness(1.4); }
          100% { transform: scale(1); filter: brightness(1); }
        }

        .cell-explode {
          animation: explodeCell 0.65s cubic-bezier(0.2, 0.8, 0.3, 1) forwards !important;
        }
        @keyframes explodeCell {
          0% { transform: scale(1); opacity: 1; filter: brightness(1); border-radius: 10px; }
          20% { transform: scale(1.25); opacity: 0.95; filter: brightness(1.15); border-radius: 30% 40% 35% 45%; }
          45% { transform: scale(1.6); opacity: 0.6; filter: brightness(1.05); border-radius: 50% 40% 55% 45%; }
          70% { transform: scale(1.9); opacity: 0.25; filter: brightness(1); border-radius: 50%; }
          100% { transform: scale(2.1); opacity: 0; filter: blur(4px); border-radius: 50%; }
        }

        .cell-drop {
          animation: dropBounce 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }

        .cell-shade6 {
          animation: shade6Danger 0.6s ease-in-out infinite alternate !important;
        }
        @keyframes shade6Danger {
          0% {
            transform: scale(1) rotate(-1deg);
            border-radius: 10px 12px 10px 10px;
            box-shadow: 0 0 16px #CC0000, 0 0 30px #88000060;
          }
          50% {
            transform: scale(1.06) rotate(0.5deg);
            border-radius: 12px 10px 11px 13px;
          }
          100% {
            transform: scale(1.04) rotate(1deg);
            border-radius: 11px 10px 13px 10px;
            box-shadow: 0 0 24px #FF2200, 0 0 50px #CC000070;
          }
        }
        @keyframes dropBounce {
          0% { transform: scale(0.2) translateY(-24px); opacity: 0.4; }
          60% { transform: scale(1.12) translateY(3px); opacity: 1; }
          100% { transform: scale(1) translateY(0); }
        }

        @keyframes mergeRing {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        @keyframes risingWarning {
          0%, 100% { box-shadow: none; }
          50% { box-shadow: inset 0 0 20px #FF440030; }
        }

        @keyframes dangerPulse {
          0%, 100% { box-shadow: inset 0 0 20px rgba(255,0,0,0.1); }
          50% { box-shadow: inset 0 0 50px rgba(255,0,0,0.3), 0 0 20px rgba(255,0,0,0.15); }
        }

        @keyframes dangerGlow {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        @keyframes screenFlash {
          0% { background: rgba(180, 30, 30, 0.15); }
          50% { background: rgba(200, 50, 50, 0.08); }
          100% { background: rgba(150, 0, 0, 0); }
        }

        @keyframes floatScore {
          0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(0.5); }
          20% { opacity: 1; transform: translateX(-50%) translateY(-8px) scale(1.15); }
          40% { opacity: 1; transform: translateX(-50%) translateY(-18px) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-50px) scale(0.8); }
        }

        @keyframes highScoreBanner {
          0% { opacity: 0; transform: translateX(-50%) scale(0.3); }
          15% { opacity: 1; transform: translateX(-50%) scale(1.2); }
          30% { transform: translateX(-50%) scale(1); }
          70% { opacity: 1; transform: translateX(-50%) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
        }

        @keyframes highScorePulse {
          0% { opacity: 0.7; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.05); text-shadow: 0 0 20px #FFD700AA; }
        }

        @keyframes risingDust {
          0% { opacity: 0; transform: translateY(0) scale(0.5); }
          20% { opacity: 0.8; transform: translateY(-10px) scale(1.3); }
          50% { opacity: 0.5; transform: translateY(-30px) scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(0.2); }
        }

        @keyframes risingGlow {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        .cell-new-row {
          animation: newRowGlow 0.6s ease-out forwards !important;
        }

        @keyframes newRowGlow {
          0% { filter: brightness(2.5); box-shadow: 0 0 20px rgba(255,200,100,0.9), 0 0 40px rgba(255,150,50,0.5) !important; transform: scale(1.08); }
          30% { filter: brightness(1.8); box-shadow: 0 0 15px rgba(255,180,80,0.7), 0 0 30px rgba(255,130,40,0.3) !important; transform: scale(1.03); }
          100% { filter: brightness(1); box-shadow: none !important; transform: scale(1); }
        }

        @keyframes screenShake {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-3px, 2px); }
          20% { transform: translate(4px, -2px); }
          30% { transform: translate(-4px, -3px); }
          40% { transform: translate(3px, 3px); }
          50% { transform: translate(-2px, -2px); }
          60% { transform: translate(3px, 1px); }
          70% { transform: translate(-2px, 3px); }
          80% { transform: translate(2px, -1px); }
          90% { transform: translate(-1px, 2px); }
        }

        @keyframes particleFly {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--pdx), var(--pdy)) scale(0); opacity: 0; }
        }

        @keyframes splatFly {
          0% { transform: translate(0, 0) scale(1); opacity: 0.9; }
          30% { transform: translate(calc(var(--pdx) * 0.5), calc(var(--pdy) * 0.3)) scale(1.1); opacity: 0.85; }
          60% { transform: translate(calc(var(--pdx) * 0.8), calc(var(--pdy) * 0.6 + 15px)) scale(0.7); opacity: 0.6; }
          80% { transform: translate(calc(var(--pdx) * 0.9), calc(var(--pdy) * 0.8 + 35px)) scale(0.4); opacity: 0.35; }
          100% { transform: translate(var(--pdx), calc(var(--pdy) + 60px)) scale(0.1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
