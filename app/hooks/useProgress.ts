"use client";

import { useCallback, useState } from "react";

export interface GameScore {
  score: number;
  date: string;
}

export interface Progress {
  memory: GameScore[];
  attention: GameScore[];
  speed: GameScore[];
  reasoning: GameScore[];
}

const STORAGE_KEY = "cerebros_progress";

const DEFAULT_PROGRESS: Progress = {
  memory: [],
  attention: [],
  speed: [],
  reasoning: [],
};

function loadProgress(): Progress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Progress;
  } catch {
    // ignore parse errors
  }
  return DEFAULT_PROGRESS;
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(loadProgress);

  const saveScore = useCallback(
    (game: keyof Progress, score: number) => {
      setProgress((prev) => {
        const updated: Progress = {
          ...prev,
          [game]: [
            ...(prev[game] ?? []),
            { score, date: new Date().toISOString() },
          ].slice(-20), // keep last 20 scores
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // ignore storage errors
        }
        return updated;
      });
    },
    []
  );

  const getBest = useCallback(
    (game: keyof Progress): number => {
      const scores = progress[game];
      if (!scores || scores.length === 0) return 0;
      return Math.max(...scores.map((s) => s.score));
    },
    [progress]
  );

  const getRecent = useCallback(
    (game: keyof Progress): number => {
      const scores = progress[game];
      if (!scores || scores.length === 0) return 0;
      return scores[scores.length - 1].score;
    },
    [progress]
  );

  const getTotalSessions = useCallback((): number => {
    return Object.values(progress).reduce((sum, arr) => sum + arr.length, 0);
  }, [progress]);

  return { progress, saveScore, getBest, getRecent, getTotalSessions };
}
