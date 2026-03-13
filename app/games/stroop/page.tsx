"use client";

import { useCallback, useEffect, useReducer } from "react";
import Link from "next/link";
import Header from "@/app/components/Header";
import { useProgress } from "@/app/hooks/useProgress";

const COLORS = [
  { name: "Rouge", tw: "text-red-500", btn: "bg-red-600 hover:bg-red-500 border-red-700" },
  { name: "Bleu", tw: "text-blue-500", btn: "bg-blue-600 hover:bg-blue-500 border-blue-700" },
  { name: "Vert", tw: "text-green-500", btn: "bg-green-600 hover:bg-green-500 border-green-700" },
  { name: "Jaune", tw: "text-yellow-400", btn: "bg-yellow-500 hover:bg-yellow-400 border-yellow-600" },
  { name: "Violet", tw: "text-purple-500", btn: "bg-purple-600 hover:bg-purple-500 border-purple-700" },
];

const TOTAL_QUESTIONS = 15;
const TIME_PER_QUESTION = 3; // seconds

interface StroopQuestion {
  word: typeof COLORS[number];  // what the text says
  ink: typeof COLORS[number];   // actual ink color
  options: typeof COLORS[number][]; // 4 shuffled answer options
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuestion(): StroopQuestion {
  // Pick word color and ink color (always different for a conflict trial)
  const wordIdx = Math.floor(Math.random() * COLORS.length);
  let inkIdx: number;
  do { inkIdx = Math.floor(Math.random() * COLORS.length); } while (inkIdx === wordIdx);

  const word = COLORS[wordIdx];
  const ink = COLORS[inkIdx];

  // Build 4 answer options: always include the correct (ink) color + 3 random others
  const others = COLORS.filter((_, i) => i !== inkIdx);
  const options = shuffle([ink, ...shuffle(others).slice(0, 3)]);

  return { word, ink, options };
}

function generateQuestions(total: number): StroopQuestion[] {
  return Array.from({ length: total }, generateQuestion);
}

type Phase = "idle" | "playing" | "feedback" | "done";

interface StroopState {
  phase: Phase;
  questions: StroopQuestion[];
  questionIndex: number;
  timeLeft: number;
  score: number;
  correctCount: number;
  selectedName: string | null;
  isCorrect: boolean | null;
}

type StroopAction =
  | { type: "START"; questions: StroopQuestion[] }
  | { type: "TICK" }
  | { type: "ANSWER"; colorName: string }
  | { type: "NEXT" }
  | { type: "IDLE" };

const initialState: StroopState = {
  phase: "idle",
  questions: [],
  questionIndex: 0,
  timeLeft: TIME_PER_QUESTION,
  score: 0,
  correctCount: 0,
  selectedName: null,
  isCorrect: null,
};

function stroopReducer(state: StroopState, action: StroopAction): StroopState {
  switch (action.type) {
    case "START":
      return { ...initialState, phase: "playing", questions: action.questions, timeLeft: TIME_PER_QUESTION };

    case "TICK": {
      if (state.phase !== "playing") return state;
      if (state.timeLeft > 1) return { ...state, timeLeft: state.timeLeft - 1 };
      // Time's up – auto-wrong
      return {
        ...state,
        phase: "feedback",
        selectedName: null,
        isCorrect: false,
        timeLeft: 0,
      };
    }

    case "ANSWER": {
      if (state.phase !== "playing") return state;
      const correct = state.questions[state.questionIndex].ink.name;
      const isCorrect = action.colorName === correct;
      const timeBonus = isCorrect ? state.timeLeft * 3 : 0;
      return {
        ...state,
        phase: "feedback",
        selectedName: action.colorName,
        isCorrect,
        score: state.score + (isCorrect ? 10 + timeBonus : 0),
        correctCount: isCorrect ? state.correctCount + 1 : state.correctCount,
      };
    }

    case "NEXT": {
      const nextIndex = state.questionIndex + 1;
      if (nextIndex >= state.questions.length) {
        return { ...state, phase: "done" };
      }
      return {
        ...state,
        phase: "playing",
        questionIndex: nextIndex,
        timeLeft: TIME_PER_QUESTION,
        selectedName: null,
        isCorrect: null,
      };
    }

    case "IDLE":
      return { ...initialState };

    default:
      return state;
  }
}

export default function StroopGame() {
  const { saveScore, getBest } = useProgress();
  const [state, dispatch] = useReducer(stroopReducer, initialState);
  const {
    phase, questions, questionIndex, timeLeft, score, correctCount,
    selectedName, isCorrect,
  } = state;

  const bestScore = getBest("stroop");
  const currentQ = questions[questionIndex];

  // Countdown timer
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [phase, questionIndex]);

  // Auto-advance after feedback
  useEffect(() => {
    if (phase !== "feedback") return;
    const id = setTimeout(() => dispatch({ type: "NEXT" }), 900);
    return () => clearTimeout(id);
  }, [phase, questionIndex]);

  // Save score on completion
  useEffect(() => {
    if (phase !== "done" || questions.length === 0) return;
    saveScore("stroop", score);
  }, [phase, score, questions.length, saveScore]);

  const startGame = useCallback(() => {
    dispatch({ type: "START", questions: generateQuestions(TOTAL_QUESTIONS) });
  }, []);

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
          <span className="text-3xl">🎨</span>
          <h1 className="text-3xl font-bold text-white">Test de Stroop</h1>
        </div>
        <p className="text-slate-400 mb-8">
          Ignorez le mot et cliquez sur la couleur de l&apos;encre. Entraînez votre flexibilité cognitive !
        </p>

        {/* Idle screen */}
        {phase === "idle" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-2xl font-bold text-white mb-3">Comment jouer ?</h2>

            {/* Demo */}
            <div className="bg-slate-900/60 rounded-xl p-4 mb-4">
              <p className="text-5xl font-black text-green-500 mb-2">ROUGE</p>
              <p className="text-slate-400 text-sm">→ Cliquez <strong className="text-green-400">Vert</strong>, pas Rouge !</p>
            </div>

            <p className="text-slate-400 text-sm mb-6">
              {TOTAL_QUESTIONS} questions · {TIME_PER_QUESTION}s par question
            </p>
            {bestScore > 0 && (
              <p className="text-rose-400 mb-6">
                Meilleur score : <strong>{bestScore}</strong>
              </p>
            )}
            <button
              onClick={startGame}
              className="px-10 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-lg rounded-xl transition-colors"
            >
              Commencer
            </button>
          </div>
        )}

        {/* Playing / Feedback screen */}
        {(phase === "playing" || phase === "feedback") && currentQ && (
          <>
            {/* Header bar */}
            <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-6 py-3 mb-6">
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Question</div>
                <div className="text-lg font-bold text-rose-400">{questionIndex + 1}/{TOTAL_QUESTIONS}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Score</div>
                <div className="text-lg font-bold text-white">{score}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Temps</div>
                <div className={`text-lg font-bold ${timeLeft <= 1 ? "text-red-400" : "text-amber-400"}`}>
                  {timeLeft}s
                </div>
              </div>
            </div>

            {/* Word display */}
            <div
              className={`
                rounded-2xl border-2 p-12 text-center mb-6 transition-colors duration-200
                ${phase === "feedback"
                  ? isCorrect ? "border-green-500 bg-green-900/20" : "border-red-500 bg-red-900/20"
                  : "border-slate-700 bg-slate-800/60"
                }
              `}
            >
              <p className={`text-7xl font-black ${currentQ.ink.tw}`}>
                {currentQ.word.name.toUpperCase()}
              </p>
              {phase === "feedback" && (
                <p className={`mt-4 text-lg font-bold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                  {isCorrect ? "✓ Correct !" : `✗ La bonne réponse était ${currentQ.ink.name}`}
                </p>
              )}
            </div>

            {/* Answer buttons */}
            <div className="grid grid-cols-2 gap-3">
              {currentQ.options.map((color) => (
                <button
                  key={color.name}
                  onClick={() => dispatch({ type: "ANSWER", colorName: color.name })}
                  disabled={phase === "feedback"}
                  className={`
                    py-4 text-lg font-bold rounded-xl border-2 text-white transition-all
                    ${phase === "feedback"
                      ? color.name === currentQ.ink.name
                        ? "opacity-100 ring-2 ring-white ring-offset-2 ring-offset-slate-900"
                        : color.name === selectedName
                        ? "opacity-50"
                        : "opacity-40"
                      : color.btn
                    }
                    disabled:cursor-not-allowed
                  `}
                >
                  {color.name}
                </button>
              ))}
            </div>

            {/* Instruction */}
            <p className="text-center text-slate-500 text-sm mt-4">
              Cliquez sur la <strong className="text-rose-400">couleur de l&apos;encre</strong>, pas sur le mot !
            </p>
          </>
        )}

        {/* Done screen */}
        {phase === "done" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">
              {correctCount >= 13 ? "🏆" : correctCount >= 10 ? "🎯" : "💪"}
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Terminé !</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-700/60 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-400">
                  {correctCount}/{TOTAL_QUESTIONS}
                </div>
                <div className="text-xs text-slate-400 mt-1">Bonnes réponses</div>
              </div>
              <div className="bg-slate-700/60 rounded-xl p-4">
                <div className="text-2xl font-bold text-rose-400">{score}</div>
                <div className="text-xs text-slate-400 mt-1">Score total</div>
              </div>
            </div>

            <p className="text-slate-500 text-sm mb-6">
              {correctCount >= 13
                ? "Excellent ! Votre inhibition cognitive est remarquable 🧠"
                : correctCount >= 10
                ? "Bon résultat ! Vous contrôlez bien vos interférences 👍"
                : "Continuez à pratiquer pour renforcer votre flexibilité cognitive 💪"}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={startGame}
                className="px-5 py-2.5 bg-rose-700 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors"
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
