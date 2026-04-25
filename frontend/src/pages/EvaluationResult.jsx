import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { CATEGORIES, SCORE_LABELS } from "../lib/scoring";
import { TierBadge } from "../components/TierBadge";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { ArrowLeft, Printer, Trash2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function EvaluationResult() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getEvaluation(id)
      .then((d) => {
        setEvaluation(d);
        if (search.get("print") === "1") {
          setTimeout(() => window.print(), 600);
        }
      })
      .catch(() => toast.error("Evaluation not found"))
      .finally(() => setLoading(false));
  }, [id, search]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this evaluation? This cannot be undone.")) return;
    try {
      await api.deleteEvaluation(id);
      toast.success("Deleted");
      navigate("/");
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) {
    return <div className="max-w-[1400px] mx-auto px-6 py-20 text-center text-slate-500">Loading…</div>;
  }
  if (!evaluation) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-20 text-center">
        <div className="font-display font-black text-3xl">Not found</div>
        <Link to="/" className="mt-4 inline-block underline">Back to Dashboard</Link>
      </div>
    );
  }

  const radarData = CATEGORIES.map((c) => ({
    category: c.name.replace(" Reliability", "").replace(" & Marketing Appeal", ""),
    value: evaluation.category_breakdown[c.id]?.percent || 0,
  }));

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8" data-testid="evaluation-result-page">
      {/* Toolbar (hidden on print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <Link
          to="/"
          data-testid="back-to-dashboard-btn"
          className="inline-flex items-center gap-2 px-4 h-10 text-xs uppercase tracking-[0.18em] font-bold border border-slate-950 hover:bg-slate-950 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            data-testid="print-pdf-btn"
            className="inline-flex items-center gap-2 px-4 h-10 text-xs uppercase tracking-[0.18em] font-bold bg-slate-950 text-white border border-slate-950 hover:-translate-y-[1px] hover:shadow-[2px_2px_0_0_#0A0A0A] transition-transform duration-150"
          >
            <Printer className="w-4 h-4" /> Export PDF
          </button>
          <button
            type="button"
            onClick={handleDelete}
            data-testid="delete-eval-btn"
            className="inline-flex items-center gap-2 px-4 h-10 text-xs uppercase tracking-[0.18em] font-bold border border-slate-950 hover:bg-[#FF0000] hover:text-white hover:border-[#FF0000] transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Report card */}
      <div id="report" className="border border-slate-950 bg-white">
        {/* Header */}
        <div className="p-6 lg:p-10 border-b border-slate-950">
          <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-500">
            Property Scoring Report
          </div>
          <div className="mt-3 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="min-w-0">
              <h1
                data-testid="result-property-name"
                className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter text-slate-950 leading-[0.9] break-words"
              >
                {evaluation.name}
              </h1>
              <div className="mt-3 text-sm text-slate-600">
                <span data-testid="result-property-location">{evaluation.location}</span>
                {evaluation.advisor_name && <> · Advisor: {evaluation.advisor_name}</>}
                {" · "}
                {new Date(evaluation.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
                Final Score
              </div>
              <div
                data-testid="result-final-score"
                className="font-display font-black text-7xl lg:text-8xl tracking-tighter text-slate-950 leading-none"
              >
                {evaluation.total_score}
                <span className="text-3xl">%</span>
              </div>
              <div className="mt-3 flex justify-end">
                <TierBadge tier={evaluation.tier} size="lg" testId="result-tier-badge" />
              </div>
            </div>
          </div>
        </div>

        {/* Override / Status */}
        <div className="border-b border-slate-950 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-950">
          <StatusCell
            label="Tier Classification"
            value={evaluation.tier_label}
          />
          <StatusCell
            label="Instant Booking"
            value={
              evaluation.can_instant_book ? (
                <span className="inline-flex items-center gap-2 text-[#002FA7] font-display font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Eligible
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-[#FF0000] font-display font-bold">
                  <XCircle className="w-4 h-4" /> Not Eligible
                </span>
              )
            }
            testId="result-instant-status"
          />
          <StatusCell
            label="Recommended Action"
            value={
              evaluation.tier === 1 && evaluation.can_instant_book
                ? "Onboard with Instant Booking"
                : evaluation.tier === 1
                ? "Onboard as Manual (Override Active)"
                : evaluation.tier === 2
                ? "Onboard as Manual / Non-Instant"
                : "Reject or Waitlist"
            }
          />
        </div>

        {evaluation.override_reason && (
          <div
            className="bg-slate-950 text-white border-l-4 border-[#FF0000] p-6 lg:p-8"
            data-testid="override-warning"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-[#FF0000] shrink-0 mt-1" />
              <div>
                <div className="font-display font-black text-xl tracking-tight uppercase">
                  Override Rule Triggered
                </div>
                <p className="mt-2 text-sm text-white/85 leading-relaxed max-w-3xl">
                  {evaluation.override_reason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Body grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-950">
          {/* Radar */}
          <div className="p-6 lg:p-10">
            <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
              Category Breakdown
            </div>
            <h2 className="mt-2 font-display font-black text-2xl tracking-tight text-slate-950">
              8-Axis Performance Map
            </h2>
            <div className="mt-6 h-[360px]" data-testid="radar-chart">
              <ResponsiveContainer>
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#0A0A0A" strokeOpacity={0.2} />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fontSize: 10, fill: "#0A0A0A", fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "#64748b" }}
                    stroke="#0A0A0A"
                    strokeOpacity={0.2}
                  />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="#0A0A0A"
                    fill="#0A0A0A"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category list */}
          <div className="p-6 lg:p-10">
            <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
              Detailed Scores
            </div>
            <h2 className="mt-2 font-display font-black text-2xl tracking-tight text-slate-950">
              Category Performance
            </h2>
            <div className="mt-6 divide-y divide-slate-200">
              {CATEGORIES.map((cat) => {
                const cb = evaluation.category_breakdown[cat.id];
                return (
                  <div key={cat.id} className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-display font-bold text-sm text-slate-950 truncate">
                          {cat.name}
                        </div>
                        <div className="text-[11px] text-slate-500">Weight {cat.weight}%</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-black text-lg tabular-nums">
                          {cb.percent}%
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {cb.earned.toFixed(2)} / {cb.max}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 h-1 bg-slate-200">
                      <div
                        className={`h-full ${
                          cb.percent >= 80
                            ? "bg-[#002FA7]"
                            : cb.percent >= 60
                            ? "bg-slate-950"
                            : "bg-[#FF0000]"
                        }`}
                        style={{ width: `${cb.percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sub-factor table */}
        <div className="border-t border-slate-950 p-6 lg:p-10">
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
            Sub-Factor Detail
          </div>
          <h2 className="mt-2 font-display font-black text-2xl tracking-tight text-slate-950">
            Score-by-score record
          </h2>

          <div className="mt-6 border border-slate-950">
            <div className="grid grid-cols-12 px-4 py-3 bg-slate-50 border-b border-slate-950 text-[10px] uppercase tracking-[0.22em] font-bold text-slate-600">
              <div className="col-span-7">Sub-factor</div>
              <div className="col-span-2 text-center">Weight</div>
              <div className="col-span-1 text-center">Score</div>
              <div className="col-span-2 text-right">Earned</div>
            </div>
            {CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-[11px] uppercase tracking-[0.2em] font-bold text-slate-700">
                  {cat.name}
                </div>
                {cat.sub_factors.map((sf) => {
                  const score = evaluation.scores[sf.id] || 0;
                  const earned = (score / 5) * sf.weight;
                  return (
                    <div
                      key={sf.id}
                      className="grid grid-cols-12 px-4 py-2.5 border-b border-slate-100 text-sm"
                      data-testid={`result-row-${sf.id}`}
                    >
                      <div className="col-span-7 text-slate-800">{sf.name}</div>
                      <div className="col-span-2 text-center text-slate-600 tabular-nums">{sf.weight}%</div>
                      <div className="col-span-1 text-center font-bold tabular-nums">
                        {score} <span className="text-slate-400 font-normal hidden sm:inline">· {SCORE_LABELS[score]}</span>
                      </div>
                      <div className="col-span-2 text-right font-display font-bold tabular-nums">
                        {earned.toFixed(2)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {evaluation.notes && (
            <div className="mt-8 border border-slate-950 p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500">
                Advisor Notes
              </div>
              <p className="mt-2 text-sm text-slate-800 leading-relaxed">{evaluation.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-950 p-6 text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500 flex items-center justify-between">
          <span>Shortlet Score · Internal Advisor Tool</span>
          <span>Report ID: {evaluation.id.slice(0, 8)}</span>
        </div>
      </div>
    </div>
  );
}

function StatusCell({ label, value, testId }) {
  return (
    <div className="p-6 lg:p-8" data-testid={testId}>
      <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-slate-950 font-display">{value}</div>
    </div>
  );
}
