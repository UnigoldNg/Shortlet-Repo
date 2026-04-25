// Mirror of backend/server.py scoring schema. Keep in sync.
export const CATEGORIES = [
  {
    id: "location",
    name: "Location Quality",
    weight: 15,
    description: "Demand driver",
    sub_factors: [
      { id: "loc_area", name: "Area desirability (Ikeja / Lekki Phase 1 strength)", weight: 6 },
      { id: "loc_landmarks", name: "Proximity to landmarks (restaurants, malls, hotspots)", weight: 4 },
      { id: "loc_access", name: "Accessibility (road quality, traffic entry/exit)", weight: 3 },
      { id: "loc_security", name: "Security perception", weight: 2 },
    ],
  },
  {
    id: "property",
    name: "Property Quality",
    weight: 20,
    description: "Experience + retention",
    sub_factors: [
      { id: "prop_interior", name: "Interior finishing", weight: 6 },
      { id: "prop_layout", name: "Space design & layout", weight: 4 },
      { id: "prop_amenities", name: "Amenities (AC, WiFi, power, etc.)", weight: 5 },
      { id: "prop_maintenance", name: "Maintenance condition & frequency", weight: 5 },
    ],
  },
  {
    id: "media",
    name: "Media & Marketing Appeal",
    weight: 10,
    description: "First conversion trigger",
    sub_factors: [
      { id: "media_visual", name: "Visual appeal (aesthetic attractiveness)", weight: 10 },
    ],
  },
  {
    id: "pricing",
    name: "Pricing & Value Alignment",
    weight: 15,
    description: "Conversion sensitivity",
    sub_factors: [
      { id: "price_competitive", name: "Competitive pricing vs market", weight: 6 },
      { id: "price_value", name: "Value for money perception", weight: 5 },
      { id: "price_consistency", name: "Pricing consistency", weight: 4 },
    ],
  },
  {
    id: "availability",
    name: "Availability Reliability",
    weight: 15,
    description: "Core operational risk",
    sub_factors: [
      { id: "avail_calendar", name: "Calendar accuracy", weight: 6 },
      { id: "avail_response", name: "Owner responsiveness", weight: 5 },
      { id: "avail_doublebook", name: "Risk of double booking", weight: 4 },
    ],
  },
  {
    id: "owner",
    name: "Owner / Manager Alignment",
    weight: 10,
    description: "Determines control",
    sub_factors: [
      { id: "own_instant", name: "Willingness for instant booking", weight: 3 },
      { id: "own_pricing", name: "Willingness to honor pricing", weight: 2 },
      { id: "own_speed", name: "Responsiveness speed", weight: 2 },
      { id: "own_pro", name: "Professionalism", weight: 1.5 },
      { id: "own_comm", name: "Communication reliability", weight: 1.5 },
    ],
  },
  {
    id: "conversion",
    name: "Conversion Potential",
    weight: 10,
    description: "Revenue efficiency",
    sub_factors: [
      { id: "conv_visual", name: "Visual-driven conversion likelihood", weight: 3 },
      { id: "conv_offer", name: "Offer strength", weight: 3 },
      { id: "conv_demand", name: "Market demand alignment", weight: 4 },
    ],
  },
  {
    id: "operational",
    name: "Operational Feasibility",
    weight: 5,
    description: "Internal execution ease",
    sub_factors: [
      { id: "op_onboard", name: "Ease of onboarding", weight: 2 },
      { id: "op_manage", name: "Ease of managing bookings", weight: 2 },
      { id: "op_risk", name: "Risk level (refunds, disputes)", weight: 1 },
    ],
  },
];

export const SCORE_LABELS = {
  1: "Very Poor",
  2: "Below Average",
  3: "Acceptable",
  4: "Good",
  5: "Excellent",
};

export function computeLocal(scores) {
  let total = 0;
  const breakdown = {};
  for (const cat of CATEGORIES) {
    let earned = 0;
    let max = 0;
    for (const sf of cat.sub_factors) {
      const raw = Number(scores[sf.id] || 0);
      const clamped = Math.max(0, Math.min(5, raw));
      earned += (clamped / 5) * sf.weight;
      max += sf.weight;
    }
    total += earned;
    breakdown[cat.id] = {
      earned: Number(earned.toFixed(2)),
      max,
      percent: max ? Number(((earned / max) * 100).toFixed(1)) : 0,
    };
  }
  total = Number(total.toFixed(2));

  let tier;
  if (total >= 80) tier = 1;
  else if (total >= 65) tier = 2;
  else tier = 3;

  let canInstant = tier === 1;
  let overrideReason = null;
  if (tier === 1) {
    const weak = [];
    if (breakdown.availability.percent < 60) weak.push("Availability Reliability");
    if (breakdown.owner.percent < 60) weak.push("Owner Alignment");
    if (weak.length) {
      canInstant = false;
      overrideReason = `Score qualifies for Tier 1 but ${weak.join(
        " and "
      )} is weak (< 60%). Property cannot be marked Instant Booking.`;
    }
  }

  return {
    total_score: total,
    tier,
    can_instant_book: canInstant,
    override_reason: overrideReason,
    category_breakdown: breakdown,
  };
}

export function emptyScores() {
  const out = {};
  CATEGORIES.forEach((c) => c.sub_factors.forEach((sf) => (out[sf.id] = 0)));
  return out;
}

export function totalSubFactors() {
  return CATEGORIES.reduce((acc, c) => acc + c.sub_factors.length, 0);
}

export function answeredCount(scores) {
  let n = 0;
  CATEGORIES.forEach((c) =>
    c.sub_factors.forEach((sf) => {
      if (scores[sf.id] && scores[sf.id] > 0) n += 1;
    })
  );
  return n;
}
