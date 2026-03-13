"use client";

import Header from "./components/Header";
import GameCard from "./components/GameCard";
import { useProgress } from "./hooks/useProgress";

const GAMES = [
  {
    id: "memory" as const,
    title: "Mémoire",
    description:
      "Retournez les cartes et trouvez les paires identiques. Entraînez votre mémoire de travail.",
    icon: "🃏",
    href: "/games/memory",
    color: "bg-blue-500",
    borderColor: "border-blue-800/50",
    textColor: "text-blue-400",
    bgColor: "bg-blue-950/20",
    benefit: "Améliore la mémoire",
    scoreLabel: "meilleur score",
  },
  {
    id: "attention" as const,
    title: "Attention",
    description:
      "Cliquez dès que la cible apparaît. Entraînez votre temps de réaction et votre concentration.",
    icon: "⚡",
    href: "/games/attention",
    color: "bg-green-500",
    borderColor: "border-green-800/50",
    textColor: "text-green-400",
    bgColor: "bg-green-950/20",
    benefit: "Renforce l'attention",
    scoreLabel: "meilleur (ms)",
  },
  {
    id: "speed" as const,
    title: "Vitesse",
    description:
      "Répondez rapidement aux questions de calcul mental. Entraînez la rapidité de traitement.",
    icon: "🔢",
    href: "/games/speed",
    color: "bg-amber-500",
    borderColor: "border-amber-800/50",
    textColor: "text-amber-400",
    bgColor: "bg-amber-950/20",
    benefit: "Accélère la réflexion",
    scoreLabel: "meilleur score",
  },
  {
    id: "reasoning" as const,
    title: "Raisonnement",
    description:
      "Mémorisez et reproduisez des séquences croissantes. Entraînez la logique et la mémoire séquentielle.",
    icon: "🔮",
    href: "/games/reasoning",
    color: "bg-purple-500",
    borderColor: "border-purple-800/50",
    textColor: "text-purple-400",
    bgColor: "bg-purple-950/20",
    benefit: "Entraîne le raisonnement",
    scoreLabel: "meilleur niveau",
  },
  {
    id: "nback" as const,
    title: "N-Back",
    description:
      "Identifiez si la lettre actuelle correspond à celle vue N étapes avant. Entraînez votre mémoire de travail.",
    icon: "🔤",
    href: "/games/nback",
    color: "bg-teal-500",
    borderColor: "border-teal-800/50",
    textColor: "text-teal-400",
    bgColor: "bg-teal-950/20",
    benefit: "Mémoire de travail",
    scoreLabel: "meilleur score",
  },
  {
    id: "stroop" as const,
    title: "Stroop",
    description:
      "Ignorez le mot et nommez la couleur de l'encre. Entraînez votre flexibilité et inhibition cognitive.",
    icon: "🎨",
    href: "/games/stroop",
    color: "bg-rose-500",
    borderColor: "border-rose-800/50",
    textColor: "text-rose-400",
    bgColor: "bg-rose-950/20",
    benefit: "Flexibilité cognitive",
    scoreLabel: "meilleur score",
  },
  {
    id: "digitspan" as const,
    title: "Empan de Chiffres",
    description:
      "Mémorisez des séquences de chiffres de plus en plus longues. Testez votre empan mnésique.",
    icon: "🔢",
    href: "/games/digitspan",
    color: "bg-orange-500",
    borderColor: "border-orange-800/50",
    textColor: "text-orange-400",
    bgColor: "bg-orange-950/20",
    benefit: "Mémoire numérique",
    scoreLabel: "meilleur score",
  },
  {
    id: "sequences" as const,
    title: "Séquences",
    description:
      "Trouvez la règle et devinez le prochain nombre. Exercez votre raisonnement logique et mathématique.",
    icon: "🔣",
    href: "/games/sequences",
    color: "bg-emerald-500",
    borderColor: "border-emerald-800/50",
    textColor: "text-emerald-400",
    bgColor: "bg-emerald-950/20",
    benefit: "Raisonnement logique",
    scoreLabel: "meilleur score",
  },
];

export default function Home() {
  const { getBest, getTotalSessions } = useProgress();
  const totalSessions = getTotalSessions();

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-indigo-500 rounded-full filter blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-600 rounded-full filter blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 text-sm px-4 py-2 rounded-full mb-6">
            <span>🧠</span>
            <span>Entraînement cérébral scientifique</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
            Musclez votre cerveau
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              chaque jour
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Améliorez votre mémoire, renforcez votre attention et accélérez
            votre réflexion grâce à des jeux basés sur la neuroscience.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            {[
              { label: "Sessions jouées", value: totalSessions || "0" },
              { label: "Jeux disponibles", value: "8" },
              { label: "Fonctions cognitives", value: "7" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits strip */}
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            {[
              "✦ Améliore la mémoire",
              "✦ Renforce l'attention",
              "✦ Accélère la réflexion",
              "✦ Entraîne le raisonnement",
              "✦ Améliore la qualité de vie",
              "✦ Reste en forme chaque jour",
            ].map((b) => (
              <span key={b}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Games grid */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12 animate-slide-up">
          <h2 className="text-3xl font-bold text-white mb-3">
            Choisissez votre entraînement
          </h2>
          <p className="text-slate-400">
            Chaque jeu cible une fonction cognitive spécifique pour un
            entraînement complet et efficace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {GAMES.map(({ id, ...game }, i) => (
            <div
              key={id}
              className="animate-slide-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <GameCard
                {...game}
                bestScore={getBest(id) || undefined}
              />
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-12 border-t border-slate-800">
        <h2 className="text-2xl font-bold text-white text-center mb-10">
          Comment ça fonctionne ?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              icon: "🎯",
              title: "Choisissez un jeu",
              desc: "Sélectionnez la compétence cognitive que vous souhaitez améliorer.",
            },
            {
              step: "2",
              icon: "🧠",
              title: "Entraînez-vous",
              desc: "Jouez et progressez grâce à des défis adaptés à votre niveau.",
            },
            {
              step: "3",
              icon: "📈",
              title: "Suivez vos progrès",
              desc: "Observez votre meilleur score et améliorez-vous chaque jour.",
            },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-900/50 border border-indigo-700/50 text-2xl mb-4">
                {icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-8 py-8 text-center text-slate-600 text-sm">
        <p>
          Cérebros &copy; {new Date().getFullYear()} — Entraînement cérébral
          inspiré par la neuroscience
        </p>
      </footer>
    </div>
  );
}
