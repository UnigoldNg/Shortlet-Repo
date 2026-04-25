import { Link, useLocation } from "react-router-dom";
import { Plus, LayoutDashboard } from "lucide-react";

export const Header = () => {
  const { pathname } = useLocation();
  const isDashboard = pathname === "/";

  return (
    <header
      className="sticky top-0 z-50 bg-white border-b border-slate-950"
      data-testid="app-header"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-3"
          data-testid="header-logo-link"
        >
          <div className="w-8 h-8 bg-slate-950 flex items-center justify-center">
            <span className="text-white font-black text-sm font-display">SP</span>
          </div>
          <div className="leading-tight">
            <div className="font-display font-black tracking-tight text-base text-slate-950">
              SHORTLET SCORE
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Internal Advisor Tool
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            to="/"
            data-testid="nav-dashboard-link"
            className={`hidden sm:inline-flex items-center gap-2 px-4 h-10 text-xs uppercase tracking-[0.18em] font-bold border border-slate-950 transition-transform duration-150 ${
              isDashboard
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-950 hover:-translate-y-[1px] hover:shadow-[2px_2px_0_0_#0A0A0A]"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <Link
            to="/new"
            data-testid="nav-new-evaluation-link"
            className="inline-flex items-center gap-2 px-4 h-10 text-xs uppercase tracking-[0.18em] font-bold bg-slate-950 text-white border border-slate-950 hover:-translate-y-[1px] hover:shadow-[2px_2px_0_0_#0A0A0A] transition-transform duration-150"
          >
            <Plus className="w-3.5 h-3.5" />
            New Evaluation
          </Link>
        </nav>
      </div>
    </header>
  );
};
