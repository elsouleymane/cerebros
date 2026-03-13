import Link from "next/link";

interface GameCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  borderColor: string;
  textColor: string;
  bgColor: string;
  benefit: string;
  bestScore?: number;
  scoreLabel?: string;
}

export default function GameCard({
  title,
  description,
  icon,
  href,
  color,
  borderColor,
  textColor,
  bgColor,
  benefit,
  bestScore,
  scoreLabel = "meilleur score",
}: GameCardProps) {
  return (
    <Link href={href} className="group block">
      <div
        className={`relative overflow-hidden rounded-2xl border ${borderColor} bg-slate-800/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/50 hover:${bgColor}`}
      >
        {/* Glow effect */}
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${color} rounded-2xl`}
        />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <span className="text-4xl">{icon}</span>
            {bestScore !== undefined && bestScore > 0 && (
              <div className={`text-right`}>
                <div className={`text-xs ${textColor} font-medium uppercase tracking-wide`}>
                  {scoreLabel}
                </div>
                <div className="text-lg font-bold text-white">{bestScore}</div>
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
          <p className="text-slate-400 text-sm mb-4">{description}</p>

          <div
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColor} bg-slate-900/50 px-3 py-1.5 rounded-full`}
          >
            <span>✓</span>
            {benefit}
          </div>

          <div
            className={`mt-4 flex items-center gap-1 text-sm font-semibold ${textColor} group-hover:gap-2 transition-all`}
          >
            Commencer l&apos;entraînement
            <span>→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
