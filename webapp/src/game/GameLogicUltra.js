import { ROWS, COLS, cloneGrid } from './GameConstants.js';

// Apply gravity to grid
export function applyGravity(grid) {
  let moved = false;
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c] !== 0) {
        if (r !== write) {
          grid[write][c] = grid[r][c];
          grid[r][c] = 0;
          moved = true;
        }
        write--;
      }
    }
  }
  return moved;
}

// Generate random shade based on turn
export function randomShade(turn = 0, maxShadeOverride = null) {
  const maxShade = maxShadeOverride || Math.min(4 + Math.floor(turn / 10), 5);
  const weights = [];
  for (let i = 1; i <= maxShade; i++) {
    weights.push({ shade: i, w: maxShade - i + 3 });
  }
  const total = weights.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * total;
  for (const { shade, w } of weights) {
    r -= w;
    if (r <= 0) return shade;
  }
  return 1;
}

// Create starting grid with random pieces
export function createStartingGrid() {
  const grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
  const count = 2 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i++) {
    const col = Math.floor(Math.random() * COLS);
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][col] === 0) {
        row = r;
        break;
      }
    }
    if (row >= 0) grid[row][col] = randomShade(0);
  }
  return grid;
}

// Fibonacci+ mode: only increasing vertical merges
export function processVerticalMergesFibPlus(grid) {
  let changed = false;
  let points = 0;
  let merges = [];
  let consumed = [];

  for (let c = 0; c < COLS; c++) {
    for (let r = ROWS - 2; r >= 0; r--) {
      const top = grid[r][c];
      const bot = grid[r + 1][c];
      
      // Only allow increasing merges: 1+1=2 or sequential increase
      if (top > 0 && bot > 0 && (top === 1 && bot === 1 || (top > bot && (top - bot) === 1))) {
        if (top === 1 && bot === 1) {
          consumed.push({ r: r + 1, c, targetR: r, targetC: c, shade: bot });
          grid[r + 1][c] = 0;
          grid[r][c] = 2;
          merges.push({ r, c, newShade: 2 });
        } else {
          const newShade = Math.min(top + 1, 6);
          consumed.push({ r: r + 1, c, targetR: r, targetC: c, shade: bot });
          grid[r + 1][c] = 0;
          grid[r][c] = newShade;
          merges.push({ r, c, newShade });
        }
        points += 50;
        changed = true;
        break;
      }
    }
  }

  if (changed) applyGravity(grid);
  return { changed, points, merges, consumed };
}

// NEW: Horizontal Fibonacci merges (not same number, but Fibonacci pairs!)
export function processHorizontalFibonacciMerges(grid) {
  let changed = false;
  let points = 0;
  let merges = [];
  let consumed = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      const left = grid[r][c];
      const right = grid[r][c + 1];
      
      // Check if they form a Fibonacci pair
      if (left > 0 && right > 0) {
        // 1+1=2
        if (left === 1 && right === 1) {
          consumed.push({ r, c: c + 1, targetR: r, targetC: c, shade: right });
          grid[r][c + 1] = 0;
          grid[r][c] = 2;
          merges.push({ r, c, newShade: 2 });
          points += 50;
          changed = true;
          break; // Process one merge per row per pass
        }
        // Sequential increase (1+2=3, 2+3=5, etc.)
        else if (Math.abs(left - right) === 1) {
          // Left is bigger (merge to left)
          if (left > right) {
            const newShade = Math.min(left + 1, 6);
            consumed.push({ r, c: c + 1, targetR: r, targetC: c, shade: right });
            grid[r][c + 1] = 0;
            grid[r][c] = newShade;
            merges.push({ r, c, newShade });
            points += 50;
            changed = true;
            break;
          }
          // Right is bigger (merge to right)
          else {
            const newShade = Math.min(right + 1, 6);
            consumed.push({ r, c, targetR: r, targetC: c + 1, shade: left });
            grid[r][c] = 0;
            grid[r][c + 1] = newShade;
            merges.push({ r, c: c + 1, newShade });
            points += 50;
            changed = true;
            break;
          }
        }
      }
    }
  }

  if (changed) applyGravity(grid);
  return { changed, points, merges, consumed };
}

// Process explosions (shade 6)
export function processExplosions(grid) {
  let explosions = [];
  let points = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] >= 6) {
        explosions.push({ r, c, shade: 6 });
        grid[r][c] = 0;
        points += 200;
      }
    }
  }

  if (explosions.length > 0) applyGravity(grid);
  return { explosions, points };
}

// Process all chain reactions with FIBONACCI HORIZONTAL MERGES
export function processAllChainsUltra(grid, chainMultiplier) {
  let totalPoints = 0;
  let combo = 0;
  let steps = [];
  let safety = 0;

  while (safety++ < 50) {
    let didAnything = false;

    // Vertical merges (Fibonacci)
    const beforeVert = cloneGrid(grid);
    const vertResult = processVerticalMergesFibPlus(grid);

    if (vertResult.changed) {
      combo++;
      didAnything = true;
      const mult = chainMultiplier(combo);
      const stepPoints = vertResult.points * mult;
      totalPoints += stepPoints;
      const afterVert = cloneGrid(grid);

      const has6 = vertResult.merges.some(m => m.newShade >= 6);
      steps.push({
        type: "merge",
        subType: "vertical",
        beforeGrid: beforeVert,
        afterGrid: afterVert,
        explosions: [],
        merges: vertResult.merges,
        consumed: vertResult.consumed,
        combo,
        stepPoints,
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
            beforeGrid: beforeExplode,
            afterGrid: cloneGrid(grid),
            explosions: expResult.explosions,
            merges: [],
            consumed: [],
            combo,
            stepPoints: expStepPoints,
          });
        }
      }
    }

    // Horizontal merges (FIBONACCI PAIRS!)
    const beforeHoriz = cloneGrid(grid);
    const horizResult = processHorizontalFibonacciMerges(grid);

    if (horizResult.changed) {
      combo++;
      didAnything = true;
      const mult = chainMultiplier(combo);
      const stepPoints = horizResult.points * mult;
      totalPoints += stepPoints;
      const afterHoriz = cloneGrid(grid);

      const has6 = horizResult.merges.some(m => m.newShade >= 6);
      steps.push({
        type: "merge",
        subType: "horizontal",
        beforeGrid: beforeHoriz,
        afterGrid: afterHoriz,
        explosions: [],
        merges: horizResult.merges,
        consumed: horizResult.consumed,
        combo,
        stepPoints,
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
            beforeGrid: beforeExplode,
            afterGrid: cloneGrid(grid),
            explosions: expResult.explosions,
            merges: [],
            consumed: [],
            combo,
            stepPoints: expStepPoints,
          });
        }
      }
    }

    // Check for leftover explosions
    if (!didAnything) {
      const expCheck = processExplosions(grid);
      if (expCheck.explosions.length > 0) {
        combo++;
        const mult = chainMultiplier(combo);
        const stepPoints = expCheck.points * mult;
        totalPoints += stepPoints;
        steps.push({
          type: "explode",
          beforeGrid: beforeVert,
          afterGrid: cloneGrid(grid),
          explosions: expCheck.explosions,
          merges: [],
          consumed: [],
          combo,
          stepPoints,
        });
        continue;
      }
      break;
    }
  }

  return { totalPoints, combo, steps };
}
