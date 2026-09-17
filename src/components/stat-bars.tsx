import { STAT_LABELS } from "@/lib/exchange/constants";
import type { WeaponRatings } from "@/lib/exchange/store";

const KEYS: Array<keyof WeaponRatings> = ["damage", "accuracy", "range", "handling", "recoil"];

export function StatBars({ ratings, compact = false }: { ratings: WeaponRatings; compact?: boolean }) {
  return (
    <div className={compact ? "grid gap-1.5" : "grid gap-2"}>
      {KEYS.map((key) => {
        const val = Math.max(1, Math.min(10, Number(ratings[key]) || 1));
        return (
          <div key={key} className="grid grid-cols-[72px_1fr_18px] items-center gap-2">
            <span className="font-display text-[10px] uppercase tracking-[0.12em] text-muted">
              {STAT_LABELS[key]}
            </span>
            <div className="h-1.5 bg-fg/10">
              <div className="h-full bg-gold" style={{ width: `${(val / 10) * 100}%` }} />
            </div>
            <span className="text-right font-display text-[11px]">{val}</span>
          </div>
        );
      })}
    </div>
  );
}
