"use client";

import { useCallback, useEffect, useReducer } from "react";
import Link from "next/link";
import Header from "@/app/components/Header";
import { useProgress } from "@/app/hooks/useProgress";

const LETTERS = "BCDFGHJKLMNPQRSTVWXZ".split("");
const TOTAL = 20;

function generateSequence(total: number, n: number): string[] {
  const seq: string[] = [];
  for (let i = 0; i < total; i++) {
    if (i >= n && Math.random() < 0.3) {
      seq.push(seq[i - n]);
    } else {
      let letter: string;
      do {
        letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      } while (i >= n && letter === seq[i - n]);
      seq.push(letter);
    }
  }
  return seq;
}

type Phase = "idle" | "letter" | "blank" | "done";

interface NBackState {
  phase: Phase;
  nLevel: number;
  sequence: string[];
  currentIndex: number;
  userResponded: boolean;
  feedback: "correct" | "wrong" | null;
  hits: number;
  falseAlarms: number;
  misses: number;
}

type NBackAction =
  | { type: "START"; nLevel: number; sequence: string[] }
  | { type: "SHOW_BLANK"; wasMatch: boolean; responded: boolean }
  | { type: "NEXT_LETTER" }
  | { type: "RESPOND" }
  | { type: "DONE" }
  | { type: "IDLE" };

const initialState: NBackState = {
  phase: "idle",
  nLevel: 2,
  sequence: [],
  currentIndex: 0,
  userResponded: false,
  feedback: null,
  hits: 0,
  falseAlarms: 0,
  misses: 0,
};

function isCurrentMatch(state: NBackState): boolean {
  const { sequence, currentIndex, nLevel } = state;
  return currentIndex >= nLevel && sequence[currentIndex] === sequence[currentIndex - nLevel];
}

function nbackReducer(state: NBackState, action: NBackAction): NBackState {
  switch (action.type) {
    case "START":
      return {
        ...initialState,
        phase: "letter",
        nLevel: action.nLevel,
        sequence: action.sequence,
      };

    case "SHOW_BLANK": {
      const newMisses = !action.responded && action.wasMatch ? state.misses + 1 : state.misses;
      return {
        ...state,
        phase: "blank",
        feedback: null,
        misses: newMisses,
      };
    }

    case "NEXT_LETTER": {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.sequence.length) {
        return { ...state, phase: "done" };
      }
      return {
        ...state,
        phase: "letter",
        currentIndex: nextIndex,
        userResponded: false,
      };
    }

    case "RESPOND": {
      if (state.phase !== "letter" || state.userResponded) return state;
      const match = isCurrentMatch(state);
      return {
        ...state,
        userResponded: true,
        feedback: match ? "correct" : "wrong",
        hits: match ? state.hits + 1 : state.hits,
        falseAlarms: match ? state.falseAlarms : state.falseAlarms + 1,
      };
    }

    case "DONE":
      return { ...state, phase: "done" };

    case "IDLE":
      return { ...initialState };

    default:
      return state;
  }
}

export default function NBackGame() {
  const { saveScore, getBest } = useProgress();
  const [state, dispatch] = useReducer(nbackReducer, initialState);
  const {
    phase, nLevel, sequence, currentIndex, userResponded,
    feedback, hits, falseAlarms, misses,
  } = state;

  const bestScore = getBest("nback");
  const currentLetter = phase === "letter" || phase === "blank" ? sequence[currentIndex] : null;
  const matchForCurrent = phase === "letter" && isCurrentMatch(state);

  // Letter visible → move to blank
  useEffect(() => {
    if (phase !== "letter") return;
    const id = setTimeout(() => {
      dispatch({ type: "SHOW_BLANK", wasMatch: matchForCurrent, responded: userResponded });
    }, 2000);
    return () => clearTimeout(id);
  }, [phase, currentIndex, matchForCurrent, userResponded]);

  // Blank → next letter or done
  useEffect(() => {
    if (phase !== "blank") return;
    const id = setTimeout(() => {
      if (currentIndex + 1 >= sequence.length) {
        dispatch({ type: "DONE" });
      } else {
        dispatch({ type: "NEXT_LETTER" });
      }
    }, 500);
    return () => clearTimeout(id);
  }, [phase, currentIndex, sequence.length]);

  // Save score on completion
  useEffect(() => {
    if (phase !== "done" || sequence.length === 0) return;
    const matchCount = sequence.slice(nLevel).filter(
      (_, i) => sequence[i + nLevel] === sequence[i]
    ).length;
    const score = Math.max(0, hits * 50 - falseAlarms * 25);
    saveScore("nback", score);
  }, [phase, hits, falseAlarms, misses, nLevel, sequence, saveScore]);

  const startGame = useCallback((n: number) => {
    dispatch({ type: "START", nLevel: n, sequence: generateSequence(TOTAL, n) });
  }, []);

  const totalMatches = sequence.slice(nLevel).filter(
    (_, i) => sequence[i + nLevel] === sequence[i]
  ).length;

  const accuracy = totalMatches > 0
    ? Math.round((hits / totalMatches) * 100)
    : 0;

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
          <span className="text-3xl">🔤</span>
          <h1 className="text-3xl font-bold text-white">N-Back</h1>
        </div>
        <p className="text-slate-400 mb-8">
          Mémorisez les lettres et indiquez quand la lettre actuelle correspond à celle vue {nLevel} étapes avant.
        </p>

        {/* Idle screen */}
        {phase === "idle" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">🔤</div>
            <h2 className="text-2xl font-bold text-white mb-3">Comment jouer ?</h2>
            <p className="text-slate-400 mb-2">
              Des lettres apparaissent une par une. Appuyez sur{" "}
              <strong className="text-teal-400">MATCH</strong> quand la lettre
              actuelle est la même que celle vue <strong>N étapes avant</strong>.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Évitez les fausses alarmes — elles réduisent votre score !
            </p>
            {bestScore > 0 && (
              <p className="text-teal-400 mb-6">
                Meilleur score : <strong>{bestScore}</strong>
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              {[
                { label: "1-Back", n: 1, emoji: "😊", hint: "Facile" },
                { label: "2-Back", n: 2, emoji: "🤔", hint: "Moyen" },
                { label: "3-Back", n: 3, emoji: "🧠", hint: "Difficile" },
              ].map(({ label, n, emoji, hint }) => (
                <button
                  key={n}
                  onClick={() => startGame(n)}
                  className="flex flex-col items-center gap-2 px-8 py-4 bg-teal-700 hover:bg-teal-600 text-white font-semibold rounded-xl transition-colors"
                >
                  <span className="text-2xl">{emoji}</span>
                  <span>{label}</span>
                  <span className="text-xs text-teal-200">{hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Playing screen */}
        {(phase === "letter" || phase === "blank") && (
          <>
            {/* Progress bar */}
            <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-6 py-3 mb-6">
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Lettre</div>
                <div className="text-lg font-bold text-teal-400">{currentIndex + 1}/{TOTAL}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Correct</div>
                <div className="text-lg font-bold text-green-400">{hits}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Faux</div>
                <div className="text-lg font-bold text-red-400">{falseAlarms}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Raté</div>
                <div className="text-lg font-bold text-amber-400">{misses}</div>
              </div>
            </div>

            {/* Letter display */}
            <div className="flex flex-col items-center gap-8">
              <div
                className={`
                  w-48 h-48 rounded-3xl flex items-center justify-center text-8xl font-black
                  transition-all duration-200
                  ${phase === "letter"
                    ? feedback === "correct"
                      ? "bg-green-800/60 border-2 border-green-500 scale-110"
                      : feedback === "wrong"
                      ? "bg-red-800/60 border-2 border-red-500"
                      : "bg-slate-700 border-2 border-teal-600"
                    : "bg-slate-800/20 border-2 border-slate-700 opacity-30"
                  }
                `}
              >
                {phase === "letter" ? currentLetter : ""}
              </div>

              {/* N-back hint */}
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                  Lettre vue {nLevel} étape(s) avant
                </div>
                <div className="text-2xl font-bold text-slate-400">
                  {currentIndex >= nLevel ? sequence[currentIndex - nLevel] : "—"}
                </div>
              </div>

              {/* Match button */}
              <button
                onClick={() => dispatch({ type: "RESPOND" })}
                disabled={phase !== "letter" || userResponded}
                className={`
                  px-16 py-5 text-xl font-bold rounded-2xl transition-all duration-150
                  ${userResponded
                    ? feedback === "correct"
                      ? "bg-green-700 text-white scale-95"
                      : "bg-red-700 text-white scale-95"
                    : "bg-teal-600 hover:bg-teal-500 text-white active:scale-95 shadow-lg shadow-teal-900/50"
                  }
                  disabled:cursor-not-allowed
                `}
              >
                {userResponded
                  ? feedback === "correct" ? "✓ Correct !" : "✗ Faux !"
                  : "MATCH !"}
              </button>

              <p className="text-slate-500 text-sm text-center">
                Appuyez si la lettre actuelle est la même que{" "}
                <strong className="text-teal-400">{sequence[currentIndex < nLevel ? 0 : currentIndex - nLevel]}</strong>{" "}
                ({nLevel}-Back)
              </p>
            </div>
          </>
        )}

        {/* Done screen */}
        {phase === "done" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">
              {accuracy >= 80 ? "🏆" : accuracy >= 60 ? "👍" : "💪"}
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Session terminée !</h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-700/60 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-400">{hits}</div>
                <div className="text-xs text-slate-400 mt-1">Bonnes réponses</div>
              </div>
              <div className="bg-slate-700/60 rounded-xl p-4">
                <div className="text-2xl font-bold text-red-400">{falseAlarms}</div>
                <div className="text-xs text-slate-400 mt-1">Fausses alarmes</div>
              </div>
              <div className="bg-slate-700/60 rounded-xl p-4">
                <div className="text-2xl font-bold text-amber-400">{misses}</div>
                <div className="text-xs text-slate-400 mt-1">Ratés</div>
              </div>
            </div>

            <p className="text-slate-400 mb-2">
              Précision : <strong className="text-white">{accuracy}%</strong>
              {" "}sur {totalMatches} cibles réelles
            </p>
            <p className="text-teal-400 font-bold text-2xl mb-6">
              Score : {Math.max(0, hits * 50 - falseAlarms * 25)}
            </p>
            <p className="text-slate-500 text-sm mb-6">
              {accuracy >= 80
                ? "Excellent travail ! Votre mémoire de travail est au top 🧠"
                : accuracy >= 60
                ? "Bon résultat ! Continuez à vous entraîner 💪"
                : "Continuez à pratiquer, vous progresserez rapidement ! 🚀"}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => startGame(nLevel)}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-600 text-white font-semibold rounded-xl transition-colors"
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
