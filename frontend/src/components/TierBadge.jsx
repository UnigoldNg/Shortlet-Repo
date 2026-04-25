export const TierBadge = ({ tier, size = "md", testId }) => {
  const map = {
    1: { label: "TIER 1", style: "bg-[#002FA7] text-white border-[#002FA7]" },
    2: { label: "TIER 2", style: "bg-[#FFD700] text-slate-950 border-[#FFD700]" },
    3: { label: "TIER 3", style: "bg-[#FF0000] text-white border-[#FF0000]" },
  };
  const cfg = map[tier] || map[3];
  const sz =
    size === "lg"
      ? "px-4 py-1.5 text-sm tracking-[0.25em]"
      : size === "sm"
      ? "px-2 py-0.5 text-[10px] tracking-[0.18em]"
      : "px-3 py-1 text-xs tracking-[0.2em]";
  return (
    <span
      data-testid={testId || `tier-badge-${tier}`}
      className={`inline-flex items-center font-display font-black uppercase border ${cfg.style} ${sz}`}
    >
      {cfg.label}
    </span>
  );
};
