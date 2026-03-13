"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/app/components/Header";
import { useProgress } from "@/app/hooks/useProgress";

const GRID_SIZE = 3; // 3×3 grid
const INITIAL_SEQ_LENGTH = 3;
const SHOW_DELAY_MS = 600; // duration each cell stays lit
const BETWEEN_DELAY_MS = 300; // gap between cells

type Phase =
  | "idle"
  | "showing"
  | "input"
  | "correct"
  | "wrong"
  | "done";

export default function ReasoningGame() {
  const { saveScore, getBest } = useProgress();
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [highlightPlayer, setHighlightPlayer] = useState<number | null>(null);
  const bestScore = getBest("reasoning");

  const buildSequence = useCallback((len: number): number[] => {
    const seq: number[] = [];
    for (let i = 0; i < len; i++) {
      let next: number;
      do {
        next = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
      } while (seq.length > 0 && next === seq[seq.length - 1]);
      seq.push(next);
    }
    return seq;
  }, []);

  const playSequence = useCallback((seq: number[]) => {
    setPhase("showing");
    setPlayerInput([]);
    setActiveCell(null);

    seq.forEach((cell, i) => {
      setTimeout(() => {
        setActiveCell(cell);
      }, i * (SHOW_DELAY_MS + BETWEEN_DELAY_MS));

      setTimeout(() => {
        setActiveCell(null);
        if (i === seq.length - 1) {
          setPhase("input");
        }
      }, i * (SHOW_DELAY_MS + BETWEEN_DELAY_MS) + SHOW_DELAY_MS);
    });
  }, []);

  const startGame = useCallback(() => {
    const seq = buildSequence(INITIAL_SEQ_LENGTH);
    setLevel(1);
    setSequence(seq);
    playSequence(seq);
  }, [buildSequence, playSequence]);

  const handleCellClick = useCallback(
    (cellIndex: number) => {
      if (phase !== "input") return;

      setHighlightPlayer(cellIndex);
      setTimeout(() => setHighlightPlayer(null), 200);

      const newInput = [...playerInput, cellIndex];
      setPlayerInput(newInput);

      // Check each step
      const step = newInput.length - 1;
      if (newInput[step] !== sequence[step]) {
        // Wrong
        setPhase("wrong");
        saveScore("reasoning", level);
        return;
      }

      if (newInput.length === sequence.length) {
        // Correct full sequence
        setPhase("correct");
        setTimeout(() => {
          const newLevel = level + 1;
          setLevel(newLevel);
          const newSeq = buildSequence(INITIAL_SEQ_LENGTH + newLevel - 1);
          setSequence(newSeq);
          playSequence(newSeq);
        }, 1000);
      }
    },
    [phase, playerInput, sequence, level, buildSequence, playSequence, saveScore]
  );

  // Track best when done
  useEffect(() => {
    if (phase === "wrong" && level > (bestScore ?? 0)) {
      saveScore("reasoning", level);
    }
  }, [phase, level, bestScore, saveScore]);

  const cellClass = (index: number) => {
    const isActive = activeCell === index;
    const isPlayerHighlight = highlightPlayer === index;
    const inputPos = playerInput.lastIndexOf(index);
    const isInInput = inputPos !== -1 && phase === "input";

    if (isActive) {
      return "bg-purple-400 border-purple-300 scale-105 shadow-purple-500/50 shadow-lg";
    }
    if (isPlayerHighlight) {
      return "bg-indigo-400 border-indigo-300 scale-95";
    }
    if (isInInput) {
      return "bg-indigo-800/60 border-indigo-600";
    }
    return "bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-slate-500";
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          ← Retour
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🔮</span>
          <h1 className="text-3xl font-bold text-white">Mémoire de Séquence</h1>
        </div>
        <p className="text-slate-400 mb-8">
          Mémorisez l&apos;ordre d&apos;illumination des cases et reproduisez-le.
        </p>

        {phase === "idle" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">🔮</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Mémoire Séquentielle
            </h2>
            <p className="text-slate-400 mb-2">
              Observez la séquence, puis reproduisez-la dans le bon ordre.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Les séquences deviennent plus longues à chaque niveau
            </p>
            {bestScore > 0 && (
              <p className="text-purple-400 mb-6">
                Meilleur niveau atteint : <strong>{bestScore}</strong>
              </p>
            )}
            <button
              onClick={startGame}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
            >
              Commencer
            </button>
          </div>
        )}

        {phase !== "idle" && (
          <div className="space-y-6">
            {/* Level & status */}
            <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-6 py-3">
              <div>
                <div className="text-xs text-slate-500">Niveau</div>
                <div className="text-2xl font-bold text-purple-400">{level}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">Séquence</div>
                <div className="text-2xl font-bold text-white">
                  {sequence.length} cases
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Saisies</div>
                <div className="text-2xl font-bold text-white">
                  {playerInput.length}/{sequence.length}
                </div>
              </div>
            </div>

            {/* Status message */}
            <div className="text-center min-h-8">
              {phase === "showing" && (
                <p className="text-purple-400 font-medium animate-pulse">
                  👀 Mémorisez la séquence…
                </p>
              )}
              {phase === "input" && (
                <p className="text-indigo-400 font-medium">
                  ✋ Reproduisez la séquence !
                </p>
              )}
              {phase === "correct" && (
                <p className="text-green-400 font-bold animate-pulse-scale">
                  ✓ Correct ! Niveau suivant…
                </p>
              )}
              {phase === "wrong" && (
                <p className="text-red-400 font-bold">
                  ✗ Raté ! Vous avez atteint le niveau {level}
                </p>
              )}
            </div>

            {/* 3×3 Grid */}
            <div
              className="grid gap-3 mx-auto"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                maxWidth: "320px",
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleCellClick(i)}
                  disabled={phase !== "input"}
                  className={`
                    aspect-square rounded-xl border-2 transition-all duration-150
                    ${cellClass(i)}
                    ${phase !== "input" ? "cursor-default" : "cursor-pointer"}
                  `}
                />
              ))}
            </div>

            {/* Progress dots */}
            {phase === "input" && (
              <div className="flex justify-center gap-2">
                {sequence.map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      i < playerInput.length
                        ? playerInput[i] === sequence[i]
                          ? "bg-green-500"
                          : "bg-red-500"
                        : "bg-slate-700"
                    }`}
                  />
                ))}
              </div>
            )}

            {phase === "wrong" && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={startGame}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors"
                >
                  Recommencer
                </button>
                <Link
                  href="/"
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Menu
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
