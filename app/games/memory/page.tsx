"use client";

import { useCallback, useEffect, useReducer } from "react";
import Link from "next/link";
import Header from "@/app/components/Header";
import { useProgress } from "@/app/hooks/useProgress";

const EMOJI_PAIRS = [
  "🦁", "🐘", "🦊", "🐬", "🦋", "🌺", "🍓", "🎸",
  "🚀", "🏆", "🎭", "🌈", "⚽", "🎨", "🍕", "🔥",
];

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairs = 8): Card[] {
  const chosen = shuffle(EMOJI_PAIRS).slice(0, pairs);
  const doubled = [...chosen, ...chosen];
  return shuffle(doubled).map((emoji, id) => ({
    id,
    emoji,
    flipped: false,
    matched: false,
  }));
}

type GamePhase = "idle" | "playing" | "won";

interface MemoryState {
  phase: GamePhase;
  cards: Card[];
  firstSelected: { id: number; emoji: string } | null;
  /** ids to unflip after a delay; null when no unflip is pending */
  pendingUnflip: { id1: number; id2: number } | null;
  isLocked: boolean;
  moves: number;
  seconds: number;
  pairsFound: number;
  totalPairs: number;
}

type MemoryAction =
  | { type: "START"; cards: Card[]; totalPairs: number }
  | { type: "FLIP"; id: number }
  | { type: "UNFLIP" }
  | { type: "TICK" }
  | { type: "IDLE" };

const initialState: MemoryState = {
  phase: "idle",
  cards: [],
  firstSelected: null,
  pendingUnflip: null,
  isLocked: false,
  moves: 0,
  seconds: 0,
  pairsFound: 0,
  totalPairs: 8,
};

function memoryReducer(state: MemoryState, action: MemoryAction): MemoryState {
  switch (action.type) {
    case "START":
      return {
        ...initialState,
        phase: "playing",
        cards: action.cards,
        totalPairs: action.totalPairs,
      };

    case "FLIP": {
      if (state.phase !== "playing" || state.isLocked) return state;
      const card = state.cards.find((c) => c.id === action.id);
      if (!card || card.flipped || card.matched) return state;

      const flippedCards = state.cards.map((c) =>
        c.id === action.id ? { ...c, flipped: true } : c
      );

      // First card of a pair
      if (!state.firstSelected) {
        return {
          ...state,
          cards: flippedCards,
          firstSelected: { id: action.id, emoji: card.emoji },
        };
      }

      // Second card of a pair
      const first = state.firstSelected;
      const newMoves = state.moves + 1;

      if (first.emoji === card.emoji) {
        const matchedCards = flippedCards.map((c) =>
          c.id === first.id || c.id === action.id ? { ...c, matched: true } : c
        );
        const newPairsFound = state.pairsFound + 1;
        return {
          ...state,
          cards: matchedCards,
          firstSelected: null,
          moves: newMoves,
          pairsFound: newPairsFound,
          phase: newPairsFound === state.totalPairs ? "won" : "playing",
          pendingUnflip: null,
        };
      }

      // No match – lock and schedule an unflip
      return {
        ...state,
        cards: flippedCards,
        firstSelected: null,
        moves: newMoves,
        isLocked: true,
        pendingUnflip: { id1: first.id, id2: action.id },
      };
    }

    case "UNFLIP": {
      if (!state.pendingUnflip) return state;
      const { id1, id2 } = state.pendingUnflip;
      return {
        ...state,
        cards: state.cards.map((c) =>
          (c.id === id1 || c.id === id2) && !c.matched
            ? { ...c, flipped: false }
            : c
        ),
        isLocked: false,
        pendingUnflip: null,
      };
    }

    case "TICK":
      if (state.phase !== "playing") return state;
      return { ...state, seconds: state.seconds + 1 };

    case "IDLE":
      return { ...initialState };

    default:
      return state;
  }
}

export default function MemoryGame() {
  const { saveScore, getBest } = useProgress();
  const [state, dispatch] = useReducer(memoryReducer, initialState);
  const { phase, cards, isLocked, moves, seconds, pairsFound, totalPairs, pendingUnflip } = state;
  const bestScore = getBest("memory");

  // Timer – dispatch is stable; calling it in an effect is fine
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Unflip non-matching pair after a short delay
  useEffect(() => {
    if (!pendingUnflip) return;
    const id = setTimeout(() => dispatch({ type: "UNFLIP" }), 800);
    return () => clearTimeout(id);
  }, [pendingUnflip]);

  // Persist score when game is won
  useEffect(() => {
    if (phase !== "won") return;
    const score = Math.max(100, 1000 - moves * 10 - seconds * 2);
    saveScore("memory", score);
  }, [phase, moves, seconds, saveScore]);

  const startGame = useCallback((numPairs: number) => {
    dispatch({ type: "START", cards: buildDeck(numPairs), totalPairs: numPairs });
  }, []);

  const flipCard = useCallback((id: number) => {
    dispatch({ type: "FLIP", id });
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const cols = totalPairs <= 6 ? 4 : totalPairs <= 8 ? 4 : 5;

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          ← Retour
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🃏</span>
          <h1 className="text-3xl font-bold text-white">Jeu de Mémoire</h1>
        </div>
        <p className="text-slate-400 mb-8">
          Retournez les cartes et trouvez toutes les paires identiques.
        </p>

        {phase === "idle" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">🃏</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Choisissez la difficulté
            </h2>
            {bestScore > 0 && (
              <p className="text-blue-400 mb-6">
                Meilleur score : <strong>{bestScore}</strong>
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              {[
                { label: "Facile", pairs: 6, emoji: "😊" },
                { label: "Moyen", pairs: 8, emoji: "🤔" },
                { label: "Difficile", pairs: 12, emoji: "🧠" },
              ].map(({ label, pairs: p, emoji }) => (
                <button
                  key={label}
                  onClick={() => startGame(p)}
                  className="flex flex-col items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
                >
                  <span className="text-2xl">{emoji}</span>
                  <span>{label}</span>
                  <span className="text-xs text-blue-200">{p} paires</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {(phase === "playing" || phase === "won") && (
          <>
            <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-6 py-3 mb-6">
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Paires</div>
                <div className="text-lg font-bold text-blue-400">
                  {pairsFound}/{totalPairs}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Coups</div>
                <div className="text-lg font-bold text-white">{moves}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Temps</div>
                <div className="text-lg font-bold text-white">{fmt(seconds)}</div>
              </div>
              <button
                onClick={() => dispatch({ type: "IDLE" })}
                className="text-sm text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                Recommencer
              </button>
            </div>

            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => flipCard(card.id)}
                  disabled={card.flipped || card.matched || isLocked}
                  className={`
                    aspect-square rounded-xl text-3xl font-bold flex items-center justify-center
                    transition-all duration-300 select-none
                    ${
                      card.matched
                        ? "bg-blue-900/40 border-2 border-blue-500 opacity-60"
                        : card.flipped
                        ? "bg-slate-600 border-2 border-slate-400 scale-105"
                        : "bg-slate-700 border-2 border-slate-600 hover:bg-slate-600 hover:border-slate-500 cursor-pointer"
                    }
                  `}
                >
                  {card.flipped || card.matched ? card.emoji : ""}
                </button>
              ))}
            </div>

            {phase === "won" && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 text-center max-w-sm mx-4">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Félicitations !
                  </h2>
                  <p className="text-slate-400 mb-1">
                    {moves} coups · {fmt(seconds)}
                  </p>
                  <p className="text-blue-400 font-bold text-xl mb-6">
                    Score : {Math.max(100, 1000 - moves * 10 - seconds * 2)}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => startGame(totalPairs)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
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
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
