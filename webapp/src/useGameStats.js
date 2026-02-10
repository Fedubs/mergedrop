import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "/api";

export function useGameTimer() {
  const startTimeRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (startTimeRef.current) {
      return Math.floor((Date.now() - startTimeRef.current) / 1000);
    }
    return elapsed;
  }, [elapsed]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    startTimeRef.current = null;
    setElapsed(0);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return { elapsed, startTimer, stopTimer, resetTimer };
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function saveGameResult(gameType, score, turns, duration) {
  try {
    const res = await fetch(`${API_BASE}/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameType, score, turns, duration }),
    });
    return await res.json();
  } catch (e) {
    console.error("Failed to save stats:", e);
    return null;
  }
}

export async function getGameStats(gameType) {
  try {
    const res = await fetch(`${API_BASE}/stats/${gameType}`);
    return await res.json();
  } catch (e) {
    console.error("Failed to load stats:", e);
    return null;
  }
}
