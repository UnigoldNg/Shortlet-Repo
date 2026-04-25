import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, SCORE_LABELS, computeLocal, emptyScores, answeredCount, totalSubFactors } from "../lib/scoring";
import { ScoreButtons } from "../components/ScoreButtons";
import { TierBadge } from "../components/TierBadge";
import { api } from "../lib/api";
import { ChevronLeft, ChevronRight, Save, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: "info", label: "Property Info" },
  ...CATEGORIES.map((c) => ({ id: c.id, label: c.name, weight: c.weight })),
  { id: "review", label: "Review & Submit" },
];

export default function NewEvaluation() {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [info, setInfo] = useState({ name: "", location: "", advisor_name: "", notes: "" });
  const [scores, setScores] = useState(emptyScores());
  const [submitting, setSubmitting] = useState(false);

  const current = STEPS[stepIdx];
  const live = useMemo(() => computeLocal(scores), [scores]);
  const answered = answeredCount(scores);
  const total = totalSubFactors();

  const setScore = (id, n) => setScores((s) => ({ ...s, [id]: n }));

  const canNext = () => {
    if (current.id === "info") {
      return info.name.trim().length > 0 && info.location.trim().length > 0;
    }
    if (current.id === "review") return true;
    const cat = CATEGORIES.find((c) => c.id === current.id);
    if (!cat) return true;
    return cat.sub_factors.every((sf) => scores[sf.id] > 0);
  };

  const next = () => {
    if (!canNext()) {
      toast.error(
        current.id === "info"
          ? "Please enter property name and location"
          : "Please score every sub-factor before continuing"
      );
      return;
    }
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const prev = () => {
    setStepIdx((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (answered < total) {
      toast.error(`Please complete all ${total} sub-factors. ${total - answered} remaining.`);
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.createEvaluation({ ...info, scores });
      toast.success("Evaluation saved");
      navigate(`/evaluation/${result.id}`);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.detail || "Failed to save evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8" data-testid="new-evaluation-page">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 lg:gap-0 border border-slate-950 bg-white">
        {/* Left rail */}
        <aside className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-slate-950 bg-slate-50 p-6 lg:p-8 lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto" data-testid="form-sidebar">
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
            Step {stepIdx + 1} / {STEPS.length}
          </div>
          <h2 className="mt-2 font-display font-black text-2xl tracking-tight text-slate-950">
            {current.label}
          </h2>

          {/* Live score */}
          <div className="mt-6 border border-slate-950 bg-white p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500">
              Live Score
            </div>
            <div className="mt-1 flex items-end gap-2">
              <div className="font-display font-black text-5xl tracking-tighter text-slate-950" data-testid="live-score">
                {live.total_score}
                <span className="text-2xl">%</span>
              </div>
            </div>
            <div className="mt-3">
              <TierBadge tier={live.tier} size="sm" testId="live-tier-badge" />
            </div>
            {live.override_reason && (
              <div className="mt-3 border-l-4 border-[#FF0000] bg-slate-950 text-white p-3 text-[11px] leading-snug" data-testid="live-override-warning">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#FF0000]" />
                  <span>Tier 1 blocked by override rule.</span>
                </div>
              </div>
            )}
            <div className="mt-4 text-[11px] text-slate-600">
              <span className="font-bold text-slate-950">{answered}</span> / {total} sub-factors
            </div>
            <div className="mt-2 h-1 bg-slate-200">
              <div
                className="h-full bg-slate-950 transition-all"
                style={{ width: `${(answered / total) * 100}%` }}
              />
            </div>
          </div>

          {/* Steps nav */}
          <ol className="mt-6 space-y-1">
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  data-testid={`step-jump-${s.id}`}
                  onClick={() => setStepIdx(i)}
                  className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2 border text-xs ${
                    i === stepIdx
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-transparent hover:bg-white text-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 inline-flex items-center justify-center text-[10px] font-bold border border-current">
                      {i + 1}
                    </span>
                    <span className="truncate">{s.label}</span>
                  </span>
                  {s.weight && (
                    <span className={`text-[10px] font-bold ${i === stepIdx ? "text-white/80" : "text-slate-500"}`}>
                      {s.weight}%
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </aside>

        {/* Main */}
        <main className="lg:col-span-3 p-6 lg:p-12">
          {current.id === "info" && (
            <PropertyInfoStep info={info} setInfo={setInfo} />
          )}

          {current.id !== "info" && current.id !== "review" && (
            <CategoryStep
              category={CATEGORIES.find((c) => c.id === current.id)}
              scores={scores}
              setScore={setScore}
              live={live}
            />
          )}

          {current.id === "review" && (
            <ReviewStep info={info} scores={scores} live={live} answered={answered} total={total} />
          )}

          {/* Navigation */}
          <div className="mt-10 pt-6 border-t border-slate-950/10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={prev}
              disabled={stepIdx === 0}
              data-testid="step-prev-btn"
              className="inline-flex items-center gap-2 px-5 h-11 text-xs uppercase tracking-[0.2em] font-bold border border-slate-950 disabled:opacity-30 disabled:pointer-events-none hover:-translate-y-[1px] hover:shadow-[2px_2px_0_0_#0A0A0A] transition-transform duration-150"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {stepIdx < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                data-testid="step-next-btn"
                className="inline-flex items-center gap-2 px-5 h-11 text-xs uppercase tracking-[0.2em] font-bold bg-slate-950 text-white border border-slate-950 hover:-translate-y-[1px] hover:shadow-[2px_2px_0_0_#0A0A0A] transition-transform duration-150"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                data-testid="submit-evaluation-btn"
                className="inline-flex items-center gap-2 px-6 h-11 text-xs uppercase tracking-[0.2em] font-bold bg-slate-950 text-white border border-slate-950 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {submitting ? "Saving…" : "Save Evaluation"}
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function PropertyInfoStep({ info, setInfo }) {
  return (
    <div data-testid="step-info">
      <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
        Step 1
      </div>
      <h1 className="mt-2 font-display font-black text-3xl lg:text-4xl tracking-tighter text-slate-950">
        Tell us about the property.
      </h1>
      <p className="mt-3 text-sm text-slate-600 max-w-xl">
        Two basic identifiers before we begin scoring across the 8-category framework.
      </p>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Property Name *">
          <input
            data-testid="input-property-name"
            value={info.name}
            onChange={(e) => setInfo({ ...info, name: e.target.value })}
            placeholder="e.g. Brookstone Apartments — Unit 3B"
            className="w-full h-12 px-4 border border-slate-950/20 focus:border-slate-950 outline-none focus:ring-1 focus:ring-slate-950 text-sm"
          />
        </Field>
        <Field label="Location *">
          <input
            data-testid="input-property-location"
            value={info.location}
            onChange={(e) => setInfo({ ...info, location: e.target.value })}
            placeholder="e.g. Lekki Phase 1, Lagos"
            className="w-full h-12 px-4 border border-slate-950/20 focus:border-slate-950 outline-none focus:ring-1 focus:ring-slate-950 text-sm"
          />
        </Field>
        <Field label="Advisor Name">
          <input
            data-testid="input-advisor-name"
            value={info.advisor_name}
            onChange={(e) => setInfo({ ...info, advisor_name: e.target.value })}
            placeholder="Optional"
            className="w-full h-12 px-4 border border-slate-950/20 focus:border-slate-950 outline-none focus:ring-1 focus:ring-slate-950 text-sm"
          />
        </Field>
        <Field label="Internal Notes">
          <input
            data-testid="input-notes"
            value={info.notes}
            onChange={(e) => setInfo({ ...info, notes: e.target.value })}
            placeholder="Optional context, owner contact, etc."
            className="w-full h-12 px-4 border border-slate-950/20 focus:border-slate-950 outline-none focus:ring-1 focus:ring-slate-950 text-sm"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500 mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}

function CategoryStep({ category, scores, setScore, live }) {
  const cb = live.category_breakdown[category.id];
  return (
    <div data-testid={`step-category-${category.id}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
            Category · {category.weight}% weight
          </div>
          <h1 className="mt-2 font-display font-black text-3xl lg:text-4xl tracking-tighter text-slate-950">
            {category.name}.
          </h1>
          <p className="mt-2 text-sm text-slate-600">{category.description}</p>
        </div>
        <div className="border border-slate-950 px-5 py-3">
          <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500">
            Section Score
          </div>
          <div className="font-display font-black text-2xl tracking-tighter">
            {cb.percent}%
          </div>
        </div>
      </div>

      <div className="mt-10 divide-y divide-slate-200">
        {category.sub_factors.map((sf) => (
          <div
            key={sf.id}
            className="py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            data-testid={`subfactor-row-${sf.id}`}
          >
            <div className="md:max-w-xl">
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                Weight · {sf.weight}%
              </div>
              <div className="mt-1 font-display font-medium text-base text-slate-950">
                {sf.name}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {scores[sf.id]
                  ? `Selected: ${scores[sf.id]} — ${SCORE_LABELS[scores[sf.id]]}`
                  : "Choose 1 (Very Poor) to 5 (Excellent)"}
              </div>
            </div>
            <ScoreButtons
              subFactorId={sf.id}
              value={scores[sf.id]}
              onChange={(n) => setScore(sf.id, n)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewStep({ info, scores, live, answered, total }) {
  return (
    <div data-testid="step-review">
      <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
        Step {STEPS.length}
      </div>
      <h1 className="mt-2 font-display font-black text-3xl lg:text-4xl tracking-tighter text-slate-950">
        Review & submit.
      </h1>
      <p className="mt-3 text-sm text-slate-600 max-w-xl">
        Final check before generating the report card.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-950">
        <Stat label="Property" value={info.name || "—"} />
        <Stat label="Location" value={info.location || "—"} />
        <Stat label="Advisor" value={info.advisor_name || "—"} />
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-950">
        <Stat
          label="Final Score"
          value={
            <span className="font-display font-black text-3xl tracking-tighter">
              {live.total_score}%
            </span>
          }
        />
        <Stat
          label="Tier"
          value={<TierBadge tier={live.tier} size="md" />}
        />
        <Stat
          label="Completion"
          value={
            <span className="inline-flex items-center gap-2 font-display font-bold">
              {answered}/{total}
              {answered === total && <Check className="w-4 h-4" />}
            </span>
          }
        />
      </div>

      {live.override_reason && (
        <div className="mt-6 bg-slate-950 text-white border-l-4 border-[#FF0000] p-5" data-testid="review-override-warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#FF0000] shrink-0" />
            <div>
              <div className="font-display font-bold text-lg">Override Triggered</div>
              <p className="mt-1 text-sm text-white/80 leading-relaxed">
                {live.override_reason}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((cat, i) => {
          const cb = live.category_breakdown[cat.id];
          return (
            <div
              key={cat.id}
              className={`border-r border-b border-slate-950 p-5 ${
                i % 4 === 3 ? "border-r-0" : ""
              } border-l ${i % 4 === 0 ? "border-l-slate-950" : "border-l-0"} -mr-px first:border-l-0`}
            >
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                {cat.name}
              </div>
              <div className="mt-2 font-display font-black text-2xl tracking-tighter text-slate-950">
                {cb.percent}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {cb.earned.toFixed(2)} / {cb.max} pts
              </div>
            </div>
          );
        })}
      </div>

      {scores && Object.values(scores).some((v) => !v) && (
        <div className="mt-6 border border-[#FF0000] p-4 text-sm text-[#FF0000]" data-testid="incomplete-warning">
          Some sub-factors are unanswered. Go back and complete them before saving.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-5 border-r last:border-r-0 border-slate-950">
      <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-slate-950">{value}</div>
    </div>
  );
}
