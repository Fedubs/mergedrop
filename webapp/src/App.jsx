import { useState } from "react";
import MergeDropGame from "./MergeDropGame.jsx";
import MergeDropClassicPlus from "./MergeDropClassicPlus.jsx";
import MergeDropFibonacciPlus from "./MergeDropFibonacciPlus.jsx";
import FibonacciPlusEnhanced from "./FibonacciPlusEnhanced.jsx";
import FibonacciUltra from "./FibonacciUltra.jsx";
import ClassicBreakerPlus from "./ClassicBreakerPlus.jsx";

const GAMES = [
  {
    id: "classic_breaker_plus",
    title: "Classic Breaker+",
    subtitle: "Advanced Block Breaker",
    description: "Dropped piece becomes result! 6s spawn early, break blocks below.",
    color: "#AA44FF",
    glow: "#7722DD",
  },
  {
    id: "classic_plus",
    title: "Classic+",
    subtitle: "Classic - Increase Only",
    description: "Sequential merges with no decreasing. Harder strategy mode.",
    color: "#44BBFF",
    glow: "#0088DD",
  },
  {
    id: "fibonacci",
    title: "Fibonacci",
    subtitle: "Fibonacci Merge Puzzle",
    description: "Merge Fibonacci pairs: 1+2=3, 2+3=5, 3+5=8 → 13 explodes!",
    color: "#FF4444",
    glow: "#CC0000",
  },
  {
    id: "fibonacci_plus",
    title: "Fibonacci+",
    subtitle: "Fibonacci - Increase Only",
    description: "Like Fibonacci but no decreasing merges! More challenging.",
    color: "#FF8844",
    glow: "#DD5500",
  },
  {
    id: "fibonacci_plus_enhanced",
    title: "Fibonacci+ Enhanced",
    subtitle: "Fibonacci with New Features",
    description: "Enhanced with next pieces queue, hold mechanic, and settings!",
    color: "#FF6633",
    glow: "#DD4411",
  },
  {
    id: "fibonacci_ultra",
    title: "Fibonacci Ultra",
    subtitle: "Ultimate Fibonacci Challenge",
    description: "Ultra hard Fibonacci mode with extreme challenges!",
    color: "#FF2222",
    glow: "#CC0000",
  },
];

function HomePage({ onSelect }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      minHeight: "100dvh", background: "#0a0a0a",
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      color: "#e8d0d0", padding: "24px", justifyContent: "center",
      overflowY: "auto",
    }}>
      <h1 style={{
        fontSize: 36, fontWeight: 900, marginBottom: 6,
        background: "linear-gradient(135deg, #FF6B6B, #EE2222, #CC0000)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        letterSpacing: 4, textTransform: "uppercase",
      }}>MergeDrop</h1>
      <div style={{ fontSize: 11, color: "#553333", letterSpacing: 3, marginBottom: 32, textTransform: "uppercase" }}>
        Select Game Mode
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 340, marginBottom: 40 }}>
        {GAMES.map(game => (
          <button
            key={game.id}
            onClick={() => onSelect(game.id)}
            style={{
              background: "#141010",
              border: `1px solid ${game.color}40`,
              borderRadius: 14,
              padding: "18px 22px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = `${game.color}90`;
              e.currentTarget.style.boxShadow = `0 0 24px ${game.glow}30, inset 0 0 20px ${game.glow}10`;
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = `${game.color}40`;
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <div style={{
              fontSize: 18, fontWeight: 800, color: game.color,
              letterSpacing: 2, marginBottom: 4,
              fontFamily: "'JetBrains Mono', monospace",
            }}>{game.title}</div>
            <div style={{
              fontSize: 11, color: "#886666", letterSpacing: 1,
              textTransform: "uppercase", marginBottom: 8,
            }}>{game.subtitle}</div>
            <div style={{
              fontSize: 12, color: "#775555", lineHeight: 1.5,
              fontFamily: "'JetBrains Mono', monospace",
            }}>{game.description}</div>
            <div style={{
              position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
              fontSize: 20, color: `${game.color}60`,
            }}>▶</div>
          </button>
        ))}
      </div>

      <div style={{
        marginTop: 16, fontSize: 10,
        color: "#332222", letterSpacing: 2,
      }}>v3.0 - 6 Modes</div>
    </div>
  );
}

export default function App() {
  const [activeGame, setActiveGame] = useState(null);

  const GameComponent = 
    activeGame === "classic_breaker_plus" ? ClassicBreakerPlus
    : activeGame === "classic_plus" ? MergeDropClassicPlus
    : activeGame === "fibonacci" ? MergeDropGame
    : activeGame === "fibonacci_plus" ? MergeDropFibonacciPlus
    : activeGame === "fibonacci_plus_enhanced" ? FibonacciPlusEnhanced
    : activeGame === "fibonacci_ultra" ? FibonacciUltra
    : null;

  if (GameComponent) {
    return (
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setActiveGame(null)}
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 50,
            width: 36, height: 36, borderRadius: 8,
            border: "1px solid #442222", background: "rgba(10,10,10,0.85)",
            color: "#886666", fontSize: 18, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.target.style.borderColor = "#FF6B6B"; e.target.style.color = "#FF6B6B"; }}
          onMouseLeave={e => { e.target.style.borderColor = "#442222"; e.target.style.color = "#886666"; }}
        >←</button>
        <GameComponent />
      </div>
    );
  }

  return <HomePage onSelect={setActiveGame} />;
}
