"use client";

import { useCallback, useEffect, useReducer } from "react";
import Link from "next/link";
import Header from "@/app/components/Header";
import { useProgress } from "@/app/hooks/useProgress";

const TOTAL_QUESTIONS = 10;
const TIME_PER_QUESTION = 10; // seconds

type Operation = "+" | "-" | "×";

interface Question {
  a: number;
  b: number;
  op: Operation;
  answer: number;
  choices: number[];
}

function generateQuestion(level: number): Question {
  const ops: Operation[] = level < 4 ? ["+", "-"] : ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  if (op === "+") {
    const max = 10 + level * 5;
    a = Math.floor(Math.random() * max) + 1;
    b = Math.floor(Math.random() * max) + 1;
    answer = a + b;
  } else if (op === "-") {
    const max = 10 + level * 5;
    a = Math.floor(Math.random() * max) + level;
    b = Math.floor(Math.random() * (a - 1)) + 1;
    answer = a - b;
  } else {
    const max = 2 + Math.min(level, 8);
    a = Math.floor(Math.random() * max) + 2;
    b = Math.floor(Math.random() * max) + 2;
    answer = a * b;
  }

  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const delta = Math.floor(Math.random() * 10) + 1;
    const wrong = Math.random() < 0.5 ? answer + delta : answer - delta;
    if (wrong !== answer && wrong > 0) wrongs.add(wrong);
  }

  const choices = [answer, ...wrongs].sort(() => Math.random() - 0.5);
  return { a, b, op, answer, choices };
}

type Phase = "idle" | "playing" | "done";

interface SpeedState {
  phase: Phase;
  question: Question | null;
  questionIndex: number;
  correct: number;
  timeLeft: number;
  lastResult: "correct" | "wrong" | "timeout" | null;
  score: number;
  level: number;
}

type SpeedAction =
  | { type: "START" }
  | { type: "NEXT_QUESTION"; question: Question; index: number; level: number }
  | { type: "ANSWER"; isCorrect: boolean; bonus: number; newScore: number; newCorrect: number; newLevel: number }
  | { type: "TIMEOUT" }
  | { type: "TICK" }
  | { type: "DONE" };

const initialSpeedState: SpeedState = {
  phase: "idle",
  question: null,
  questionIndex: 0,
  correct: 0,
  timeLeft: TIME_PER_QUESTION,
  lastResult: null,
  score: 0,
  level: 1,
};

function speedReducer(state: SpeedState, action: SpeedAction): SpeedState {
  switch (action.type) {
    case "START":
      return {
        ...initialSpeedState,
        phase: "playing",
        question: generateQuestion(1),
      };
    case "NEXT_QUESTION":
      return {
        ...state,
        question: action.question,
        questionIndex: action.index,
        level: action.level,
        timeLeft: TIME_PER_QUESTION,
        lastResult: null,
      };
    case "ANSWER":
      if (state.lastResult !== null) return state;
      return {
        ...state,
        lastResult: action.isCorrect ? "correct" : "wrong",
        score: action.newScore,
        correct: action.newCorrect,
        level: action.newLevel,
      };
    case "TIMEOUT":
      if (state.lastResult !== null) return state;
      return { ...state, lastResult: "timeout", timeLeft: 0 };
    case "TICK":
      if (state.phase !== "playing" || state.lastResult !== null || state.timeLeft <= 0)
        return state;
      return { ...state, timeLeft: state.timeLeft - 1 };
    case "DONE":
      return { ...state, phase: "done" };
    default:
      return state;
  }
}

export default function SpeedGame() {
  const { saveScore, getBest } = useProgress();
  const [state, dispatch] = useReducer(speedReducer, initialSpeedState);
  const { phase, question, questionIndex, correct, timeLeft, lastResult, score, level } = state;
  const bestScore = getBest("speed");

  // Visual countdown – dispatch is stable; calling it in an effect is fine
  useEffect(() => {
    if (phase !== "playing" || lastResult !== null) return;
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [phase, lastResult, questionIndex]);

  // Timeout per question
  useEffect(() => {
    if (phase !== "playing" || lastResult !== null) return;
    const id = setTimeout(() => dispatch({ type: "TIMEOUT" }), TIME_PER_QUESTION * 1000);
    return () => clearTimeout(id);
  }, [phase, lastResult, questionIndex]);

  // Advance to next question after result is shown
  useEffect(() => {
    if (lastResult === null || phase !== "playing") return;
    const nextQi = questionIndex + 1;
    const nextLevel = level;
    const id = setTimeout(() => {
      if (nextQi >= TOTAL_QUESTIONS) {
        dispatch({ type: "DONE" });
      } else {
        dispatch({
          type: "NEXT_QUESTION",
          question: generateQuestion(nextLevel),
          index: nextQi,
          level: nextLevel,
        });
      }
    }, 800);
    return () => clearTimeout(id);
  }, [lastResult, phase, questionIndex, level]);

  // Persist score when game ends
  useEffect(() => {
    if (phase === "done") {
      saveScore("speed", score);
    }
  }, [phase, score, saveScore]);

  const handleAnswer = useCallback(
    (choice: number) => {
      if (!question || lastResult !== null) return;
      const isCorrect = choice === question.answer;
      const bonus = isCorrect ? Math.max(10, timeLeft * 10) : 0;
      const newScore = score + bonus;
      const newCorrect = isCorrect ? correct + 1 : correct;
      const newLevel = isCorrect
        ? Math.min(10, level + (newCorrect % 3 === 0 ? 1 : 0))
        : level;
      dispatch({ type: "ANSWER", isCorrect, bonus, newScore, newCorrect, newLevel });
    },
    [question, lastResult, timeLeft, score, correct, level]
  );

  const timerPct = (timeLeft / TIME_PER_QUESTION) * 100;
  const timerColor =
    timeLeft > 5 ? "bg-green-500" : timeLeft > 2 ? "bg-amber-500" : "bg-red-500";

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
          <h1 className="text-3xl font-bold text-white">Calcul Mental</h1>
        </div>
        <p className="text-slate-400 mb-8">
          Répondez aux questions le plus vite possible. Plus vite = plus de points !
        </p>

        {phase === "idle" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">🔢</div>
            <h2 className="text-2xl font-bold text-white mb-2">Calcul Mental</h2>
            <p className="text-slate-400 mb-2">
              {TOTAL_QUESTIONS} questions · {TIME_PER_QUESTION}s par question
            </p>
            <p className="text-slate-500 text-sm mb-6">
              La difficulté augmente au fil des bonnes réponses
            </p>
            {bestScore > 0 && (
              <p className="text-amber-400 mb-6">
                Meilleur score : <strong>{bestScore}</strong> pts
              </p>
            )}
            <button
              onClick={() => dispatch({ type: "START" })}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
            >
              Commencer
            </button>
          </div>
        )}

        {phase === "playing" && question && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                Question <span className="text-white font-bold">{questionIndex + 1}</span>/{TOTAL_QUESTIONS}
              </span>
              <span className="text-amber-400 font-bold">Score : {score}</span>
              <span className="text-slate-400">
                Niveau <span className="text-white font-bold">{level}</span>
              </span>
            </div>

            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${timerColor} rounded-full transition-all duration-1000`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
            <div className="text-center text-sm text-slate-400">⏱ {timeLeft}s</div>

            <div
              className={`
                relative rounded-2xl border-2 p-10 text-center transition-colors
                ${lastResult === "correct" ? "bg-green-900/40 border-green-500"
                  : lastResult === "wrong" ? "bg-red-900/40 border-red-500"
                  : lastResult === "timeout" ? "bg-slate-800/40 border-slate-600"
                  : "bg-slate-800/60 border-slate-700"}
              `}
            >
              <div className="text-5xl font-bold text-white">
                {question.a} {question.op} {question.b} = ?
              </div>
              {lastResult === "correct" && (
                <div className="absolute top-3 right-3 text-green-400 font-bold">
                  +{Math.max(10, (timeLeft + 1) * 10)} pts ✓
                </div>
              )}
              {lastResult === "wrong" && (
                <div className="absolute top-3 right-3 text-red-400 font-bold">
                  ✗ {question.answer}
                </div>
              )}
              {lastResult === "timeout" && (
                <div className="absolute top-3 right-3 text-slate-400 font-bold">
                  ⏱ {question.answer}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {question.choices.map((choice) => (
                <button
                  key={choice}
                  onClick={() => handleAnswer(choice)}
                  disabled={lastResult !== null}
                  className={`
                    py-5 text-2xl font-bold rounded-xl border-2 transition-all
                    ${lastResult !== null
                      ? choice === question.answer
                        ? "bg-green-800/40 border-green-500 text-green-300"
                        : "bg-slate-800/40 border-slate-700 text-slate-500"
                      : "bg-slate-700 border-slate-600 hover:bg-amber-900/40 hover:border-amber-600 text-white cursor-pointer"}
                  `}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">
              {correct >= 8 ? "🏆" : correct >= 5 ? "🎯" : "💪"}
            </div>
            <h2 className="text-2xl font-bold text-white mb-6">Terminé !</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-900/50 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Bonnes réponses</div>
                <div className="text-3xl font-bold text-amber-400">
                  {correct}/{TOTAL_QUESTIONS}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Score total</div>
                <div className="text-3xl font-bold text-amber-400">{score}</div>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-8">
              {correct >= 8
                ? "Excellent ! Votre cerveau est bien entraîné ! 🧠"
                : correct >= 5
                ? "Pas mal ! Continuez à vous entraîner !"
                : "Continuez — vous progresserez vite ! 💪"}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => dispatch({ type: "START" })}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition-colors"
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
