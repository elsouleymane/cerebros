"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/app/components/Header";
import { useProgress } from "@/app/hooks/useProgress";

const ROUNDS = 5;
const MIN_DELAY_MS = 1500;
const MAX_DELAY_MS = 4000;

const TARGETS = [
  { emoji: "🟢", label: "Cercle vert" },
  { emoji: "🔵", label: "Cercle bleu" },
  { emoji: "🟡", label: "Cercle jaune" },
  { emoji: "🟠", label: "Cercle orange" },
];

type Phase = "idle" | "waiting" | "ready" | "clicked" | "done" | "early";

export default function AttentionGame() {
  const { saveScore, getBest } = useProgress();
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [reactionTime, setReactionTime] = useState(0);
  const [currentTarget, setCurrentTarget] = useState(TARGETS[0]);
  const appearTime = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bestScore = getBest("attention");

  const average = results.length
    ? Math.round(results.reduce((a, b) => a + b, 0) / results.length)
    : 0;

  const startRound = useCallback(() => {
    setPhase("waiting");
    const delay =
      MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    const target = TARGETS[Math.floor(Math.random() * TARGETS.length)];
    setCurrentTarget(target);
    timerRef.current = setTimeout(() => {
      appearTime.current = Date.now();
      setPhase("ready");
    }, delay);
  }, []);

  const handleClick = useCallback(() => {
    if (phase === "waiting") {
      // Clicked too early!
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase("early");
      return;
    }
    if (phase !== "ready") return;

    const rt = Date.now() - appearTime.current;
    setReactionTime(rt);
    setResults((prev) => {
      const next = [...prev, rt];
      if (next.length >= ROUNDS) {
        const avg = Math.round(next.reduce((a, b) => a + b, 0) / next.length);
        // Lower is better: score = max(0, 1000 - avg)
        const score = Math.max(0, 1000 - avg);
        saveScore("attention", score);
        setPhase("done");
      } else {
        setPhase("clicked");
      }
      return next;
    });
  }, [phase, saveScore]);

  const handleNext = useCallback(() => {
    setRound((r) => r + 1);
    startRound();
  }, [startRound]);

  const startGame = useCallback(() => {
    setRound(0);
    setResults([]);
    setReactionTime(0);
    startRound();
  }, [startRound]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getRtColor = (rt: number) => {
    if (rt < 250) return "text-green-400";
    if (rt < 400) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreLabel = (ms: number) => {
    if (ms < 200) return "Réflexes de champion ! 🏆";
    if (ms < 300) return "Excellent ! ⚡";
    if (ms < 400) return "Bien ! 👍";
    if (ms < 600) return "Correct 🙂";
    return "Continuez à vous entraîner 💪";
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          ← Retour
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">⚡</span>
          <h1 className="text-3xl font-bold text-white">Jeu d&apos;Attention</h1>
        </div>
        <p className="text-slate-400 mb-8">
          Cliquez dès que la cible apparaît pour mesurer votre temps de réaction.
        </p>

        {phase === "idle" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Test de réaction
            </h2>
            <p className="text-slate-400 mb-2">
              Attendez que la cible apparaisse, puis cliquez le plus vite possible.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              {ROUNDS} manches · ne cliquez pas trop tôt !
            </p>
            {bestScore > 0 && (
              <p className="text-green-400 mb-6">
                Meilleur score : <strong>{bestScore}</strong> pts (≈{" "}
                {1000 - bestScore} ms moyen)
              </p>
            )}
            <button
              onClick={startGame}
              className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
            >
              Commencer
            </button>
          </div>
        )}

        {(phase === "waiting" ||
          phase === "ready" ||
          phase === "clicked" ||
          phase === "early") && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="flex items-center gap-3">
              {Array.from({ length: ROUNDS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    i < results.length
                      ? "bg-green-500"
                      : i === results.length
                      ? "bg-green-900"
                      : "bg-slate-700"
                  }`}
                />
              ))}
            </div>
            <p className="text-slate-400 text-center text-sm">
              Manche {Math.min(round + 1, ROUNDS)} / {ROUNDS}
            </p>

            {/* Game area */}
            <button
              onClick={handleClick}
              className={`
                w-full h-64 rounded-2xl border-2 flex flex-col items-center justify-center gap-4
                transition-all duration-150 select-none
                ${
                  phase === "ready"
                    ? "bg-green-900/40 border-green-500 cursor-pointer hover:bg-green-800/40 animate-pulse-scale"
                    : phase === "early"
                    ? "bg-red-900/40 border-red-500 cursor-not-allowed"
                    : "bg-slate-800/40 border-slate-700 cursor-pointer"
                }
              `}
            >
              {phase === "waiting" && (
                <>
                  <div className="text-4xl animate-pulse">⏳</div>
                  <p className="text-slate-400">Attendez la cible…</p>
                </>
              )}
              {phase === "ready" && (
                <>
                  <div className="text-7xl">{currentTarget.emoji}</div>
                  <p className="text-green-400 font-bold text-xl">
                    CLIQUEZ !
                  </p>
                </>
              )}
              {phase === "early" && (
                <>
                  <div className="text-4xl">❌</div>
                  <p className="text-red-400 font-bold">Trop tôt !</p>
                  <p className="text-slate-500 text-sm">
                    Attendez que la cible apparaisse
                  </p>
                </>
              )}
              {phase === "clicked" && (
                <>
                  <div className={`text-4xl font-bold ${getRtColor(reactionTime)}`}>
                    {reactionTime} ms
                  </div>
                  <p className="text-slate-400">
                    {getScoreLabel(reactionTime)}
                  </p>
                </>
              )}
            </button>

            {(phase === "clicked" || phase === "early") && (
              <button
                onClick={phase === "early" ? startGame : handleNext}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors"
              >
                {phase === "early" ? "Recommencer" : "Manche suivante →"}
              </button>
            )}

            {/* Last results */}
            {results.length > 0 && (
              <div className="flex gap-2 justify-center flex-wrap">
                {results.map((rt, i) => (
                  <span
                    key={i}
                    className={`text-sm font-mono px-2 py-0.5 rounded ${getRtColor(rt)} bg-slate-800`}
                  >
                    {rt} ms
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Résultats
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-900/50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">Meilleur</div>
                <div className={`text-xl font-bold ${getRtColor(Math.min(...results))}`}>
                  {Math.min(...results)} ms
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">Moyen</div>
                <div className={`text-xl font-bold ${getRtColor(average)}`}>
                  {average} ms
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">Pire</div>
                <div className={`text-xl font-bold ${getRtColor(Math.max(...results))}`}>
                  {Math.max(...results)} ms
                </div>
              </div>
            </div>

            <p className="text-2xl font-bold text-green-400 mb-2">
              Score : {Math.max(0, 1000 - average)} pts
            </p>
            <p className="text-slate-400 text-sm mb-6">
              {getScoreLabel(average)}
            </p>

            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={startGame}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors"
              >
                Rejouer
              </button>
              <Link
                href="/"
                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
              >
                Menu
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
