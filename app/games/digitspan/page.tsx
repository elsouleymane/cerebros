"use client";

import { useCallback, useEffect, useReducer } from "react";
import Link from "next/link";
import Header from "@/app/components/Header";
import { useProgress } from "@/app/hooks/useProgress";

const STARTING_LENGTH = 3;
const MAX_LIVES = 3;
const DIGIT_DISPLAY_MS = 700;
const DIGIT_BLANK_MS = 250;

function generateDigits(length: number): number[] {
  const digits: number[] = [];
  for (let i = 0; i < length; i++) {
    // Avoid repeating the same digit twice in a row
    let d: number;
    do { d = Math.floor(Math.random() * 10); } while (i > 0 && d === digits[i - 1]);
    digits.push(d);
  }
  return digits;
}

type Phase = "idle" | "showing" | "blank" | "input" | "result" | "done";

interface DigitSpanState {
  phase: Phase;
  sequence: number[];
  displayIndex: number;   // which digit is currently shown (-1 = none)
  userInput: string;
  level: number;          // sequence length
  lives: number;
  score: number;
  lastCorrect: boolean | null;
  maxLevel: number;       // highest level reached
}

type DigitAction =
  | { type: "START" }
  | { type: "NEXT_DIGIT" }    // advance to next digit in sequence
  | { type: "HIDE_DIGIT" }    // blank between digits
  | { type: "START_INPUT" }   // all digits shown, now enter
  | { type: "TYPE"; digit: string }
  | { type: "BACKSPACE" }
  | { type: "SUBMIT" }
  | { type: "NEXT_ROUND" }
  | { type: "IDLE" };

const initialState: DigitSpanState = {
  phase: "idle",
  sequence: [],
  displayIndex: -1,
  userInput: "",
  level: STARTING_LENGTH,
  lives: MAX_LIVES,
  score: 0,
  lastCorrect: null,
  maxLevel: STARTING_LENGTH,
};

function digitSpanReducer(state: DigitSpanState, action: DigitAction): DigitSpanState {
  switch (action.type) {
    case "START":
      return {
        ...initialState,
        phase: "showing",
        sequence: generateDigits(STARTING_LENGTH),
        displayIndex: 0,
      };

    case "NEXT_DIGIT":
      return { ...state, phase: "showing", displayIndex: state.displayIndex + 1 };

    case "HIDE_DIGIT":
      return { ...state, phase: "blank" };

    case "START_INPUT":
      return { ...state, phase: "input", displayIndex: -1, userInput: "" };

    case "TYPE": {
      if (state.phase !== "input") return state;
      const next = state.userInput + action.digit;
      // Auto-submit when length matches
      if (next.length === state.sequence.length) {
        const correct = next === state.sequence.join("");
        const newLives = correct ? state.lives : state.lives - 1;
        const newLevel = correct ? state.level + 1 : Math.max(STARTING_LENGTH, state.level - 1);
        const newScore = state.score + (correct ? state.level * 20 : 0);
        const newMaxLevel = Math.max(state.maxLevel, correct ? newLevel - 1 : state.level);
        return {
          ...state,
          userInput: next,
          phase: "result",
          lastCorrect: correct,
          lives: newLives,
          level: newLevel,
          score: newScore,
          maxLevel: newMaxLevel,
        };
      }
      return { ...state, userInput: next };
    }

    case "BACKSPACE":
      if (state.phase !== "input") return state;
      return { ...state, userInput: state.userInput.slice(0, -1) };

    case "SUBMIT": {
      if (state.phase !== "input") return state;
      const correct = state.userInput === state.sequence.join("");
      const newLives = correct ? state.lives : state.lives - 1;
      const newLevel = correct ? state.level + 1 : Math.max(STARTING_LENGTH, state.level - 1);
      const newScore = state.score + (correct ? state.level * 20 : 0);
      const newMaxLevel = Math.max(state.maxLevel, correct ? newLevel - 1 : state.level);
      return {
        ...state,
        phase: "result",
        lastCorrect: correct,
        lives: newLives,
        level: newLevel,
        score: newScore,
        maxLevel: newMaxLevel,
      };
    }

    case "NEXT_ROUND": {
      if (state.lives <= 0) return { ...state, phase: "done" };
      return {
        ...state,
        phase: "showing",
        sequence: generateDigits(state.level),
        displayIndex: 0,
        userInput: "",
        lastCorrect: null,
      };
    }

    case "IDLE":
      return { ...initialState };

    default:
      return state;
  }
}

export default function DigitSpanGame() {
  const { saveScore, getBest } = useProgress();
  const [state, dispatch] = useReducer(digitSpanReducer, initialState);
  const {
    phase, sequence, displayIndex, userInput, level, lives, score, lastCorrect, maxLevel,
  } = state;

  const bestScore = getBest("digitspan");

  // Show each digit then blank
  useEffect(() => {
    if (phase === "showing") {
      const id = setTimeout(() => dispatch({ type: "HIDE_DIGIT" }), DIGIT_DISPLAY_MS);
      return () => clearTimeout(id);
    }
    if (phase === "blank") {
      const id = setTimeout(() => {
        if (displayIndex + 1 >= sequence.length) {
          dispatch({ type: "START_INPUT" });
        } else {
          dispatch({ type: "NEXT_DIGIT" });
        }
      }, DIGIT_BLANK_MS);
      return () => clearTimeout(id);
    }
  }, [phase, displayIndex, sequence.length]);

  // Save score on done
  useEffect(() => {
    if (phase !== "done") return;
    saveScore("digitspan", score);
  }, [phase, score, saveScore]);

  // Auto-advance after result
  useEffect(() => {
    if (phase !== "result") return;
    const id = setTimeout(() => dispatch({ type: "NEXT_ROUND" }), 1200);
    return () => clearTimeout(id);
  }, [phase, lastCorrect, level]);

  const startGame = useCallback(() => dispatch({ type: "START" }), []);

  // Current displayed digit
  const shownDigit = phase === "showing" && displayIndex >= 0 ? sequence[displayIndex] : null;

  // Hearts display
  const hearts = Array.from({ length: MAX_LIVES }, (_, i) => i < lives ? "❤️" : "🖤");

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
          <span className="text-3xl">🔢</span>
          <h1 className="text-3xl font-bold text-white">Empan de Chiffres</h1>
        </div>
        <p className="text-slate-400 mb-8">
          Mémorisez la séquence de chiffres et reproduisez-la dans l&apos;ordre. La séquence grandit avec chaque succès !
        </p>

        {/* Idle */}
        {phase === "idle" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">🔢</div>
            <h2 className="text-2xl font-bold text-white mb-3">Comment jouer ?</h2>
            <p className="text-slate-400 mb-4">
              Des chiffres s&apos;affichent un par un. Mémorisez-les et saisissez-les dans le bon ordre.
            </p>
            <ul className="text-slate-400 text-sm text-left max-w-xs mx-auto mb-6 space-y-1">
              <li>✓ Bonne réponse → séquence +1 chiffre</li>
              <li>✗ Erreur → séquence -1 chiffre et vous perdez une vie</li>
              <li>💔 3 vies au total</li>
            </ul>
            {bestScore > 0 && (
              <p className="text-orange-400 mb-6">
                Meilleur score : <strong>{bestScore}</strong>
              </p>
            )}
            <button
              onClick={startGame}
              className="px-10 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg rounded-xl transition-colors"
            >
              Commencer
            </button>
          </div>
        )}

        {/* Showing / Blank */}
        {(phase === "showing" || phase === "blank") && (
          <div className="text-center animate-fade-in">
            <div className="flex justify-between items-center bg-slate-800/60 border border-slate-700 rounded-xl px-6 py-3 mb-8">
              <div>
                <div className="text-xs text-slate-500 uppercase">Niveau</div>
                <div className="text-xl font-bold text-orange-400">{level - STARTING_LENGTH + 1}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase">Chiffres</div>
                <div className="text-xl font-bold text-white">{sequence.length}</div>
              </div>
              <div className="text-2xl">{hearts.join(" ")}</div>
            </div>

            <p className="text-slate-400 mb-6">Mémorisez...</p>

            <div className="w-48 h-48 mx-auto rounded-3xl bg-slate-700 border-2 border-orange-500 flex items-center justify-center">
              <span className="text-8xl font-black text-orange-400">
                {phase === "showing" ? shownDigit : ""}
              </span>
            </div>

            <div className="flex justify-center gap-2 mt-6">
              {sequence.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i === displayIndex && phase === "showing"
                      ? "bg-orange-400"
                      : i < displayIndex
                      ? "bg-slate-500"
                      : "bg-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        {phase === "input" && (
          <div className="text-center animate-fade-in">
            <div className="flex justify-between items-center bg-slate-800/60 border border-slate-700 rounded-xl px-6 py-3 mb-8">
              <div>
                <div className="text-xs text-slate-500 uppercase">Niveau</div>
                <div className="text-xl font-bold text-orange-400">{level - STARTING_LENGTH + 1}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase">Chiffres</div>
                <div className="text-xl font-bold text-white">{sequence.length}</div>
              </div>
              <div className="text-2xl">{hearts.join(" ")}</div>
            </div>

            <p className="text-slate-300 text-lg mb-4">Reproduisez la séquence :</p>

            {/* Input display */}
            <div className="flex justify-center gap-3 mb-8">
              {sequence.map((_, i) => (
                <div
                  key={i}
                  className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-colors
                    ${i < userInput.length
                      ? "border-orange-500 bg-orange-900/30 text-orange-300"
                      : i === userInput.length
                      ? "border-orange-400 bg-slate-700 animate-pulse"
                      : "border-slate-600 bg-slate-800"
                    }
                  `}
                >
                  {userInput[i] ?? ""}
                </div>
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <button
                  key={d}
                  onClick={() => dispatch({ type: "TYPE", digit: String(d) })}
                  className="py-4 text-2xl font-bold bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors border border-slate-600"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => dispatch({ type: "BACKSPACE" })}
                className="py-4 text-xl font-bold bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors border border-slate-600"
              >
                ⌫
              </button>
              <button
                onClick={() => dispatch({ type: "TYPE", digit: "0" })}
                className="py-4 text-2xl font-bold bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors border border-slate-600"
              >
                0
              </button>
              <button
                onClick={() => dispatch({ type: "SUBMIT" })}
                disabled={userInput.length === 0}
                className="py-4 text-lg font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-colors disabled:opacity-40"
              >
                ✓
              </button>
            </div>
          </div>
        )}

        {/* Result overlay */}
        {phase === "result" && (
          <div className="text-center animate-fade-in">
            <div className={`
              rounded-2xl p-8 border-2 mb-4
              ${lastCorrect ? "border-green-500 bg-green-900/20" : "border-red-500 bg-red-900/20"}
            `}>
              <div className="text-6xl mb-4">{lastCorrect ? "✅" : "❌"}</div>
              <p className="text-2xl font-bold text-white mb-2">
                {lastCorrect ? "Correct !" : "Raté !"}
              </p>
              <p className="text-slate-400 mb-2">
                La séquence était :{" "}
                <strong className="text-white text-xl tracking-widest">
                  {sequence.join(" ")}
                </strong>
              </p>
              {!lastCorrect && (
                <p className="text-slate-400">
                  Vous avez saisi :{" "}
                  <strong className="text-orange-400 text-xl tracking-widest">
                    {userInput.split("").join(" ")}
                  </strong>
                </p>
              )}
              <div className="flex justify-center gap-2 mt-4">
                {hearts.map((h, i) => <span key={i} className="text-2xl">{h}</span>)}
              </div>
            </div>
          </div>
        )}

        {/* Done */}
        {phase === "done" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">
              {maxLevel >= 9 ? "🏆" : maxLevel >= 7 ? "🎯" : "💪"}
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Partie terminée !</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-700/60 rounded-xl p-4">
                <div className="text-2xl font-bold text-orange-400">{maxLevel}</div>
                <div className="text-xs text-slate-400 mt-1">Meilleur niveau</div>
              </div>
              <div className="bg-slate-700/60 rounded-xl p-4">
                <div className="text-2xl font-bold text-white">{score}</div>
                <div className="text-xs text-slate-400 mt-1">Score total</div>
              </div>
            </div>

            <p className="text-slate-500 text-sm mb-6">
              {maxLevel >= 9
                ? "Capacité de mémoire exceptionnelle ! 🧠"
                : maxLevel >= 7
                ? "Très bonne mémoire numérique ! 👍"
                : maxLevel >= 5
                ? "Mémoire dans la moyenne, continuez ! 💪"
                : "Continuez à pratiquer, vous progresserez ! 🚀"}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={startGame}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl transition-colors"
              >
                Rejouer
              </button>
              <button
                onClick={() => dispatch({ type: "IDLE" })}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
              >
                Menu
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
