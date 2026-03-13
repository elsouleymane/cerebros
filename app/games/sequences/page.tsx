"use client";

import { useCallback, useEffect, useReducer } from "react";
import Link from "next/link";
import Header from "@/app/components/Header";
import { useProgress } from "@/app/hooks/useProgress";

const TOTAL_QUESTIONS = 12;
const TIME_PER_QUESTION = 12; // seconds

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type PatternType =
  | { kind: "arithmetic"; start: number; step: number }
  | { kind: "geometric"; start: number; ratio: number }
  | { kind: "alternating"; startA: number; startB: number; stepA: number; stepB: number }
  | { kind: "squares" }
  | { kind: "fibonacci"; a: number; b: number }
  | { kind: "double_arithmetic"; start: number; step1: number; step2: number };

function buildSequence(pattern: PatternType, terms: number): number[] {
  switch (pattern.kind) {
    case "arithmetic": {
      return Array.from({ length: terms }, (_, i) => pattern.start + i * pattern.step);
    }
    case "geometric": {
      return Array.from({ length: terms }, (_, i) => pattern.start * Math.pow(pattern.ratio, i));
    }
    case "alternating": {
      return Array.from({ length: terms }, (_, i) =>
        i % 2 === 0 ? pattern.startA + Math.floor(i / 2) * pattern.stepA : pattern.startB + Math.floor(i / 2) * pattern.stepB
      );
    }
    case "squares": {
      const offset = Math.floor(Math.random() * 4) + 1;
      return Array.from({ length: terms }, (_, i) => (i + offset) * (i + offset));
    }
    case "fibonacci": {
      const seq = [pattern.a, pattern.b];
      for (let i = 2; i < terms; i++) seq.push(seq[i - 1] + seq[i - 2]);
      return seq;
    }
    case "double_arithmetic": {
      // Steps alternate between step1 and step2
      const seq = [pattern.start];
      for (let i = 1; i < terms; i++) {
        seq.push(seq[i - 1] + (i % 2 === 1 ? pattern.step1 : pattern.step2));
      }
      return seq;
    }
  }
}

function getNextValue(pattern: PatternType, terms: number): number {
  const full = buildSequence(pattern, terms + 1);
  return full[terms];
}

interface Question {
  sequence: number[];
  answer: number;
  options: number[];
  label: string;
}

function generateWrongOptions(answer: number, sequence: number[]): number[] {
  const step = sequence.length >= 2 ? Math.abs(sequence[sequence.length - 1] - sequence[sequence.length - 2]) : 5;
  const candidates = new Set<number>();
  const offsets = [1, 2, 3, -1, -2, step, step + 1, step - 1, step * 2, Math.round(step * 1.5)];
  for (const off of shuffle(offsets)) {
    const w1 = answer + off;
    const w2 = answer - off;
    if (w1 !== answer && w1 > 0) candidates.add(w1);
    if (w2 !== answer && w2 > 0) candidates.add(w2);
    if (candidates.size >= 3) break;
  }
  // Fill remaining if needed
  let extra = answer + 7;
  while (candidates.size < 3) {
    if (extra !== answer) candidates.add(extra);
    extra++;
  }
  return [...candidates].slice(0, 3);
}

function makeQuestion(difficulty: "easy" | "medium" | "hard"): Question {
  const patterns: PatternType[] = [];

  if (difficulty === "easy") {
    const step = Math.floor(Math.random() * 5) + 2;
    const start = Math.floor(Math.random() * 5) + 1;
    patterns.push(
      { kind: "arithmetic", start, step },
      { kind: "arithmetic", start, step: step * 2 },
      { kind: "double_arithmetic", start, step1: 2, step2: 3 },
    );
  } else if (difficulty === "medium") {
    const start = Math.floor(Math.random() * 3) + 1;
    const a = Math.floor(Math.random() * 10) + 1;
    const b = a + Math.floor(Math.random() * 5) + 1;
    patterns.push(
      { kind: "geometric", start, ratio: 2 },
      { kind: "alternating", startA: start, startB: start + 3, stepA: 3, stepB: 4 },
      { kind: "fibonacci", a, b },
      { kind: "double_arithmetic", start, step1: 3, step2: 5 },
    );
  } else {
    const start = Math.floor(Math.random() * 4) + 1;
    const a = Math.floor(Math.random() * 5) + 1;
    const b = a + Math.floor(Math.random() * 8) + 2;
    patterns.push(
      { kind: "geometric", start, ratio: 3 },
      { kind: "squares" },
      { kind: "fibonacci", a, b },
      { kind: "alternating", startA: start, startB: start + 5, stepA: 4, stepB: 6 },
    );
  }

  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  const terms = difficulty === "easy" ? 4 : difficulty === "medium" ? 5 : 5;
  const sequence = buildSequence(pattern, terms);
  const answer = getNextValue(pattern, terms);
  const wrongOptions = generateWrongOptions(answer, sequence);
  const options = shuffle([answer, ...wrongOptions]);

  const label =
    pattern.kind === "arithmetic" ? "Suite arithmétique" :
    pattern.kind === "geometric" ? "Suite géométrique" :
    pattern.kind === "alternating" ? "Suite alternée" :
    pattern.kind === "squares" ? "Suite de carrés" :
    pattern.kind === "fibonacci" ? "Suite de Fibonacci" :
    "Suite à double pas";

  return { sequence, answer, options, label };
}

function generateQuestions(): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < 4; i++) qs.push(makeQuestion("easy"));
  for (let i = 0; i < 4; i++) qs.push(makeQuestion("medium"));
  for (let i = 0; i < 4; i++) qs.push(makeQuestion("hard"));
  return shuffle(qs);
}

type Phase = "idle" | "playing" | "feedback" | "done";

interface SequencesState {
  phase: Phase;
  questions: Question[];
  questionIndex: number;
  timeLeft: number;
  score: number;
  correctCount: number;
  selectedOption: number | null;
  isCorrect: boolean | null;
}

type SequencesAction =
  | { type: "START"; questions: Question[] }
  | { type: "TICK" }
  | { type: "ANSWER"; value: number }
  | { type: "NEXT" }
  | { type: "IDLE" };

const initialState: SequencesState = {
  phase: "idle",
  questions: [],
  questionIndex: 0,
  timeLeft: TIME_PER_QUESTION,
  score: 0,
  correctCount: 0,
  selectedOption: null,
  isCorrect: null,
};

function sequencesReducer(state: SequencesState, action: SequencesAction): SequencesState {
  switch (action.type) {
    case "START":
      return { ...initialState, phase: "playing", questions: action.questions, timeLeft: TIME_PER_QUESTION };

    case "TICK": {
      if (state.phase !== "playing") return state;
      if (state.timeLeft > 1) return { ...state, timeLeft: state.timeLeft - 1 };
      return { ...state, phase: "feedback", selectedOption: null, isCorrect: false, timeLeft: 0 };
    }

    case "ANSWER": {
      if (state.phase !== "playing") return state;
      const correct = action.value === state.questions[state.questionIndex].answer;
      const timeBonus = correct ? state.timeLeft * 5 : 0;
      return {
        ...state,
        phase: "feedback",
        selectedOption: action.value,
        isCorrect: correct,
        score: state.score + (correct ? 100 + timeBonus : 0),
        correctCount: correct ? state.correctCount + 1 : state.correctCount,
      };
    }

    case "NEXT": {
      const nextIndex = state.questionIndex + 1;
      if (nextIndex >= state.questions.length) return { ...state, phase: "done" };
      return {
        ...state,
        phase: "playing",
        questionIndex: nextIndex,
        timeLeft: TIME_PER_QUESTION,
        selectedOption: null,
        isCorrect: null,
      };
    }

    case "IDLE":
      return { ...initialState };

    default:
      return state;
  }
}

export default function SequencesGame() {
  const { saveScore, getBest } = useProgress();
  const [state, dispatch] = useReducer(sequencesReducer, initialState);
  const {
    phase, questions, questionIndex, timeLeft, score, correctCount,
    selectedOption, isCorrect,
  } = state;

  const bestScore = getBest("sequences");
  const currentQ = questions[questionIndex];

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [phase, questionIndex]);

  // Auto-advance after feedback
  useEffect(() => {
    if (phase !== "feedback") return;
    const id = setTimeout(() => dispatch({ type: "NEXT" }), 1200);
    return () => clearTimeout(id);
  }, [phase, questionIndex]);

  // Save score
  useEffect(() => {
    if (phase !== "done" || questions.length === 0) return;
    saveScore("sequences", score);
  }, [phase, score, questions.length, saveScore]);

  const startGame = useCallback(() => {
    dispatch({ type: "START", questions: generateQuestions() });
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
          <span className="text-3xl">🔣</span>
          <h1 className="text-3xl font-bold text-white">Séquences</h1>
        </div>
        <p className="text-slate-400 mb-8">
          Trouvez la règle qui régit la suite de nombres et devinez le prochain terme.
        </p>

        {/* Idle */}
        {phase === "idle" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">🔣</div>
            <h2 className="text-2xl font-bold text-white mb-3">Comment jouer ?</h2>

            <div className="bg-slate-900/60 rounded-xl p-4 mb-4 text-left">
              <p className="text-slate-400 text-sm mb-2">Exemple :</p>
              <p className="text-2xl font-bold text-white text-center mb-1">2 · 4 · 8 · 16 · <span className="text-emerald-400">?</span></p>
              <p className="text-slate-400 text-sm text-center">→ Réponse : <strong className="text-emerald-400">32</strong> (×2 à chaque fois)</p>
            </div>

            <p className="text-slate-400 text-sm mb-6">
              {TOTAL_QUESTIONS} questions · {TIME_PER_QUESTION}s par question · 3 niveaux de difficulté
            </p>
            {bestScore > 0 && (
              <p className="text-emerald-400 mb-6">
                Meilleur score : <strong>{bestScore}</strong>
              </p>
            )}
            <button
              onClick={startGame}
              className="px-10 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl transition-colors"
            >
              Commencer
            </button>
          </div>
        )}

        {/* Playing / Feedback */}
        {(phase === "playing" || phase === "feedback") && currentQ && (
          <>
            {/* Progress bar */}
            <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-6 py-3 mb-6">
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Question</div>
                <div className="text-lg font-bold text-emerald-400">{questionIndex + 1}/{TOTAL_QUESTIONS}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Score</div>
                <div className="text-lg font-bold text-white">{score}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Temps</div>
                <div className={`text-lg font-bold ${timeLeft <= 3 ? "text-red-400" : "text-amber-400"}`}>
                  {timeLeft}s
                </div>
              </div>
            </div>

            {/* Sequence display */}
            <div
              className={`
                rounded-2xl border-2 p-8 mb-6 transition-colors duration-200
                ${phase === "feedback"
                  ? isCorrect ? "border-green-500 bg-green-900/20" : "border-red-500 bg-red-900/20"
                  : "border-slate-700 bg-slate-800/60"
                }
              `}
            >
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-4 text-center">
                {currentQ.label}
              </p>
              <div className="flex flex-wrap justify-center items-center gap-3">
                {currentQ.sequence.map((n, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">{n}</span>
                    </div>
                    <span className="text-slate-500 text-lg">·</span>
                  </div>
                ))}
                <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center
                  ${phase === "feedback"
                    ? isCorrect
                      ? "bg-green-800/60 border-green-500"
                      : "bg-red-800/60 border-red-500"
                    : "bg-emerald-900/30 border-emerald-500 animate-pulse"
                  }
                `}>
                  <span className={`text-xl font-bold ${
                    phase === "feedback"
                      ? isCorrect ? "text-green-300" : "text-red-300"
                      : "text-emerald-400"
                  }`}>
                    {phase === "feedback" ? currentQ.answer : "?"}
                  </span>
                </div>
              </div>

              {phase === "feedback" && (
                <p className={`text-center mt-4 font-bold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                  {isCorrect
                    ? "✓ Correct !"
                    : selectedOption === null
                    ? `⏱ Temps écoulé ! La réponse était ${currentQ.answer}`
                    : `✗ La réponse était ${currentQ.answer}`}
                </p>
              )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
              {currentQ.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => dispatch({ type: "ANSWER", value: opt })}
                  disabled={phase === "feedback"}
                  className={`
                    py-4 text-2xl font-bold rounded-xl border-2 transition-all
                    ${phase === "feedback"
                      ? opt === currentQ.answer
                        ? "bg-green-800/60 border-green-500 text-green-300"
                        : opt === selectedOption
                        ? "bg-red-800/60 border-red-500 text-red-300 opacity-70"
                        : "bg-slate-800/40 border-slate-700 text-slate-500 opacity-40"
                      : "bg-slate-700 hover:bg-slate-600 border-slate-600 hover:border-emerald-500 text-white"
                    }
                    disabled:cursor-not-allowed
                  `}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Done */}
        {phase === "done" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">
              {correctCount >= 10 ? "🏆" : correctCount >= 7 ? "🎯" : "💪"}
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Terminé !</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-700/60 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-400">{correctCount}/{TOTAL_QUESTIONS}</div>
                <div className="text-xs text-slate-400 mt-1">Bonnes réponses</div>
              </div>
              <div className="bg-slate-700/60 rounded-xl p-4">
                <div className="text-2xl font-bold text-emerald-400">{score}</div>
                <div className="text-xs text-slate-400 mt-1">Score total</div>
              </div>
            </div>

            <p className="text-slate-500 text-sm mb-6">
              {correctCount >= 10
                ? "Excellent raisonnement logique ! 🧠"
                : correctCount >= 7
                ? "Bon résultat, votre logique est solide ! 👍"
                : "Continuez à vous entraîner pour progresser ! 💪"}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={startGame}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
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
