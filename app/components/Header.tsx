import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🧠</span>
          <span className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
            Cérebros
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          <Link
            href="/games/memory"
            className="px-3 py-1.5 text-sm text-slate-300 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all"
          >
            Mémoire
          </Link>
          <Link
            href="/games/attention"
            className="px-3 py-1.5 text-sm text-slate-300 hover:text-green-400 hover:bg-slate-800 rounded-lg transition-all"
          >
            Attention
          </Link>
          <Link
            href="/games/speed"
            className="px-3 py-1.5 text-sm text-slate-300 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-all"
          >
            Vitesse
          </Link>
          <Link
            href="/games/reasoning"
            className="px-3 py-1.5 text-sm text-slate-300 hover:text-purple-400 hover:bg-slate-800 rounded-lg transition-all"
          >
            Raisonnement
          </Link>
          <Link
            href="/games/nback"
            className="px-3 py-1.5 text-sm text-slate-300 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-all"
          >
            N-Back
          </Link>
          <Link
            href="/games/stroop"
            className="px-3 py-1.5 text-sm text-slate-300 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
          >
            Stroop
          </Link>
          <Link
            href="/games/digitspan"
            className="px-3 py-1.5 text-sm text-slate-300 hover:text-orange-400 hover:bg-slate-800 rounded-lg transition-all"
          >
            Empan
          </Link>
          <Link
            href="/games/sequences"
            className="px-3 py-1.5 text-sm text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all"
          >
            Séquences
          </Link>
        </nav>
      </div>
    </header>
  );
}
