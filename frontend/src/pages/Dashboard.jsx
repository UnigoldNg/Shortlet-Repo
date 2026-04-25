import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { TierBadge } from "../components/TierBadge";
import { Search, Plus, FileText, Trash2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

const TIER_FILTERS = [
  { value: "all", label: "All" },
  { value: "1", label: "Tier 1" },
  { value: "2", label: "Tier 2" },
  { value: "3", label: "Tier 3" },
];

const StatCard = ({ label, value, accent, testId }) => (
  <div
    data-testid={testId}
    className={`border border-slate-950 p-6 ${accent || "bg-white"}`}
  >
    <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
      {label}
    </div>
    <div className="font-display font-black text-4xl lg:text-5xl tracking-tighter mt-2 text-slate-950">
      {value}
    </div>
  </div>
);

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [tierFilter, setTierFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (tierFilter !== "all") params.tier = Number(tierFilter);
      if (q.trim()) params.q = q.trim();
      const [list, s] = await Promise.all([api.listEvaluations(params), api.stats()]);
      setItems(list);
      setStats(s);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load evaluations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [tierFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete evaluation for "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteEvaluation(id);
      toast.success("Evaluation deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8 lg:py-12" data-testid="dashboard-page">
      {/* Hero */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-10 border-b border-slate-950">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-500 mb-3">
            Property Evaluations
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black text-slate-950 leading-[0.9]">
            Score. Classify.<br />Decide.
          </h1>
          <p className="mt-4 text-sm md:text-base text-slate-600 max-w-xl">
            Evaluate every shortlet against the standardized 8-category framework.
            Output a tier, flag override risks, share a printable report.
          </p>
        </div>
        <Link
          to="/new"
          data-testid="hero-new-evaluation-btn"
          className="inline-flex items-center gap-2 self-start lg:self-auto px-6 h-12 text-xs uppercase tracking-[0.2em] font-bold bg-slate-950 text-white border border-slate-950 hover:-translate-y-[1px] hover:shadow-[3px_3px_0_0_#0A0A0A] transition-transform duration-150"
        >
          <Plus className="w-4 h-4" />
          Start New Evaluation
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 mt-10 border border-slate-950 divide-x divide-slate-950 [&>*]:border-0">
        <StatCard
          testId="stat-total"
          label="Total Evaluated"
          value={stats?.total ?? "—"}
        />
        <StatCard
          testId="stat-tier1"
          label="Tier 1"
          value={stats?.tier1 ?? "—"}
          accent="bg-[#002FA7] text-white [&>div:first-child]:text-white/70 [&>div:last-child]:text-white"
        />
        <StatCard
          testId="stat-tier2"
          label="Tier 2"
          value={stats?.tier2 ?? "—"}
          accent="bg-[#FFD700] [&>div:first-child]:text-slate-700"
        />
        <StatCard
          testId="stat-tier3"
          label="Tier 3"
          value={stats?.tier3 ?? "—"}
          accent="bg-[#FF0000] text-white [&>div:first-child]:text-white/80 [&>div:last-child]:text-white"
        />
        <StatCard
          testId="stat-instant"
          label="Instant Eligible"
          value={stats?.instant_eligible ?? "—"}
        />
      </div>

      {/* Filters */}
      <div className="mt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex border border-slate-950">
          {TIER_FILTERS.map((f) => (
            <button
              key={f.value}
              data-testid={`filter-tier-${f.value}`}
              onClick={() => setTierFilter(f.value)}
              className={`px-4 h-11 text-xs uppercase tracking-[0.18em] font-bold border-r border-slate-950 last:border-r-0 transition-colors ${
                tierFilter === f.value
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-950 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex border border-slate-950" data-testid="search-form">
          <div className="flex items-center pl-3 bg-white">
            <Search className="w-4 h-4 text-slate-500" />
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or location"
            data-testid="search-input"
            className="h-11 w-64 md:w-80 px-3 outline-none bg-white text-sm placeholder:text-slate-400"
          />
          <button
            type="submit"
            data-testid="search-btn"
            className="h-11 px-4 bg-slate-950 text-white text-xs uppercase tracking-[0.18em] font-bold"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="mt-6 border border-slate-950 bg-white" data-testid="evaluations-table-wrapper">
        <div className="grid grid-cols-12 px-4 py-3 border-b border-slate-950 bg-slate-50 text-[10px] uppercase tracking-[0.22em] font-bold text-slate-600">
          <div className="col-span-4">Property</div>
          <div className="col-span-3">Location</div>
          <div className="col-span-1 text-center">Score</div>
          <div className="col-span-2">Tier</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500" data-testid="loading-state">
            Loading evaluations…
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center" data-testid="empty-state">
            <div className="font-display font-black text-3xl tracking-tight text-slate-950">
              No evaluations yet
            </div>
            <p className="mt-3 text-sm text-slate-600 max-w-md mx-auto">
              {tierFilter !== "all" || q
                ? "No matches for the current filter. Try widening the search."
                : "Start scoring your first property to see it here."}
            </p>
            <Link
              to="/new"
              data-testid="empty-new-btn"
              className="inline-flex mt-6 items-center gap-2 px-5 h-11 text-xs uppercase tracking-[0.18em] font-bold bg-slate-950 text-white border border-slate-950"
            >
              <Plus className="w-4 h-4" />
              New Evaluation
            </Link>
          </div>
        ) : (
          items.map((e) => (
            <div
              key={e.id}
              data-testid={`evaluation-row-${e.id}`}
              className="grid grid-cols-12 px-4 py-4 border-b border-slate-200 last:border-b-0 items-center hover:bg-slate-50 transition-colors text-sm"
            >
              <div className="col-span-4 min-w-0">
                <button
                  onClick={() => navigate(`/evaluation/${e.id}`)}
                  data-testid={`row-name-${e.id}`}
                  className="text-left font-display font-bold text-base text-slate-950 hover:underline truncate"
                >
                  {e.name}
                </button>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {new Date(e.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  {e.advisor_name ? ` · ${e.advisor_name}` : ""}
                </div>
              </div>
              <div className="col-span-3 text-slate-700 truncate">{e.location}</div>
              <div className="col-span-1 text-center font-display font-black text-lg text-slate-950">
                {e.total_score}%
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <TierBadge tier={e.tier} size="sm" />
                {e.tier === 1 && !e.can_instant_book && (
                  <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#FF0000]">
                    Override
                  </span>
                )}
              </div>
              <div className="col-span-2 flex items-center justify-end gap-1">
                <Link
                  to={`/evaluation/${e.id}`}
                  data-testid={`row-view-${e.id}`}
                  className="inline-flex items-center gap-1 px-3 h-9 text-[11px] uppercase tracking-[0.18em] font-bold border border-slate-950 hover:bg-slate-950 hover:text-white transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> View
                </Link>
                <Link
                  to={`/evaluation/${e.id}?print=1`}
                  data-testid={`row-pdf-${e.id}`}
                  className="inline-flex items-center justify-center w-9 h-9 border border-slate-950 hover:bg-slate-950 hover:text-white transition-colors"
                  title="Open & Print PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => handleDelete(e.id, e.name)}
                  data-testid={`row-delete-${e.id}`}
                  className="inline-flex items-center justify-center w-9 h-9 border border-slate-950 hover:bg-[#FF0000] hover:text-white hover:border-[#FF0000] transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
