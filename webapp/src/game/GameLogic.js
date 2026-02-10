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

// Horizontal merges (3+ same in a row)
export function processHorizontalMerges(grid) {
  let changed = false;
  let points = 0;
  let merges = [];
  let consumed = [];

  for (let r = 0; r < ROWS; r++) {
    let runStart = -1, runShade = 0, runLen = 0;
    for (let c = 0; c <= COLS; c++) {
      const val = c < COLS ? grid[r][c] : 0;
      if (val > 0 && val === runShade) {
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
          points += 50 * runLen;
          changed = true;
        }
        runStart = c;
        runShade = val;
        runLen = 1;
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

// Process all chain reactions
export function processAllChains(grid, chainMultiplier) {
  let totalPoints = 0;
  let combo = 0;
  let steps = [];
  let safety = 0;

  while (safety++ < 50) {
    let didAnything = false;

    // Vertical merges
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

    // Horizontal merges
    const beforeHoriz = cloneGrid(grid);
    const horizResult = processHorizontalMerges(grid);

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
