import { SCORE_LABELS } from "../lib/scoring";

export const ScoreButtons = ({ value, onChange, subFactorId }) => {
  return (
    <div
      className="inline-flex border border-slate-950"
      role="radiogroup"
      data-testid={`score-group-${subFactorId}`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            data-testid={`score-${subFactorId}-${n}`}
            onClick={() => onChange(n)}
            title={SCORE_LABELS[n]}
            aria-label={`${SCORE_LABELS[n]} (${n})`}
            className={`w-10 h-10 sm:w-11 sm:h-11 text-sm font-display font-bold border-r border-slate-950 last:border-r-0 transition-transform duration-150 active:scale-95 ${
              selected
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-950 hover:bg-slate-100"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
};
