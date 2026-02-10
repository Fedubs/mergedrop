# MergeDrop

A physics-based puzzle game with gravity mechanics and chain reactions. Drop numbered tiles, merge them, and trigger explosive combos!

## 🎮 Game Modes

### Fibonacci
Classic Fibonacci sequence merging:
- **1+1=2**, 1+2=3, 2+3=5, 3+5=8, 5+8=13
- Decreasing merges: 2 on 3 = 1
- **13 explodes!**

### Classic
Sequential number merging:
- **1+2=3**, 2+3=4, 3+4=5, 4+5=6
- Decreasing merges: 2 on 3 = 1
- **6 explodes!**

### Fibonacci+ (Hard Mode)
- Same as Fibonacci but **NO decreasing merges**
- Only increasing combinations allowed
- More challenging strategy required

### Classic+ (Hard Mode)
- Same as Classic but **NO decreasing merges**
- Only increasing combinations allowed
- Higher difficulty

## 🌟 Features

- **Gravity physics** - Tiles fall and stack realistically
- **Chain reactions** - Merges trigger combos with multipliers
- **Horizontal merges** - 3+ same numbers in a row combine
- **Rising rows** - Every 5 drops, a new row rises from below
- **Haptic feedback** - Sound effects and mobile vibration
- **Statistics tracking** - High scores, averages, and game history
- **Responsive design** - Works on mobile and desktop

## 🚀 Tech Stack

- **Frontend**: React + Vite
- **Backend**: Express.js (Node.js)
- **Styling**: Inline CSS with animations
- **Deployment**: Railway

## 📦 Installation

```bash
# Install root dependencies
npm install

# Install webapp dependencies
cd webapp && npm install && cd ..

# Build the webapp
npm run build

# Start the server
npm start
```

Server runs on port 3750 (or PORT env variable)

## 🎯 How to Play

1. **Select a game mode** from the home screen
2. **Use arrow keys** (← →) or **tap columns** to aim
3. **Press SPACE/ENTER** or **tap** to drop the tile
4. **Merge tiles** to create chain reactions
5. **Survive** as rows rise every 5 drops
6. **Avoid** filling the top row or it's game over!

## 🏗️ Project Structure

```
MergeDrop/
├── server.js                        # Express server
├── package.json                     # Root dependencies
├── railway.json                     # Railway deployment config
├── stats.json                       # Game statistics (auto-generated)
└── webapp/
    ├── src/
    │   ├── App.jsx                  # Main app & mode selector
    │   ├── MergeDropGame.jsx        # Fibonacci mode
    │   ├── MergeDropClassic.jsx     # Classic mode
    │   ├── MergeDropFibonacciPlus.jsx  # Fibonacci+ mode
    │   ├── MergeDropClassicPlus.jsx    # Classic+ mode
    │   └── useGameStats.js          # Stats hooks & API
    ├── package.json
    └── vite.config.js
```

## 🎨 API Endpoints

- `GET /api/health` - Health check
- `GET /api/stats/:gameType` - Get stats for a game mode
- `POST /api/stats` - Save game result

## 📄 License

MIT

## 👨‍💻 Author

Fed (Federico Mantegazza)
