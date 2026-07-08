import crypto from 'crypto';
import db from './db.js';

// ── QR token ──────────────────────────────────────────────
// Short, URL-safe, unique per employee. Encoded into the QR code so a scan
// lands directly on that employee's public review form.
export function makeToken() {
  return crypto.randomBytes(6).toString('hex'); // 12 hex chars
}

export function ensureToken(employeeId) {
  const row = db.prepare('SELECT qr_token FROM employees WHERE id = ?').get(employeeId);
  if (row && row.qr_token) return row.qr_token;
  const token = makeToken();
  db.prepare('UPDATE employees SET qr_token = ? WHERE id = ?').run(token, employeeId);
  return token;
}

// ── Sub-rating dimensions (Service Quality) ───────────────
export const SUB_DIMENSIONS = [
  { key: 'professionalism',    label: 'Professionalism' },
  { key: 'communication',      label: 'Communication' },
  { key: 'knowledge',          label: 'Knowledge' },
  { key: 'friendliness',       label: 'Friendliness' },
  { key: 'response_time',      label: 'Response Time' },
  { key: 'overall_experience', label: 'Overall Experience' },
];

// ── Bonus & incentive rules (demo defaults) ───────────────
// Tiers are evaluated top-down; the first satisfied tier wins.
export const BONUS_RULES = [
  { tier: 'Gold',   minAvg: 4.8, minReviews: 20, reward: '₹5,000 + Certificate', color: '#B7791F' },
  { tier: 'Silver', minAvg: 4.5, minReviews: 15, reward: '₹3,000',               color: '#64748B' },
  { tier: 'Bronze', minAvg: 4.0, minReviews: 10, reward: '₹1,500',               color: '#B45309' },
];

// Extra milestone (spec: "More than 100 Five-Star Reviews").
// Scaled to demo volumes as well, so it actually triggers.
export const STAR_PERFORMER_MIN_FIVE = 20;

export function bonusFor(avg, reviews) {
  for (const r of BONUS_RULES) {
    if (avg >= r.minAvg && reviews >= r.minReviews) return r;
  }
  return null;
}

// Composite 0–100 performance score: rating (70) + recommend rate (20) + volume (10).
export function performanceScore({ avg, reviews, recommendRate }) {
  const ratingPart = (avg / 5) * 70;
  const recPart = (recommendRate || 0) * 20;
  const volumePart = Math.min(reviews / 50, 1) * 10;
  return Math.round(ratingPart + recPart + volumePart);
}

// ── Period → start date (YYYY-MM-DD) ──────────────────────
export function periodStart(period, now = new Date()) {
  const d = new Date(now);
  switch (period) {
    case 'today':     d.setHours(0, 0, 0, 0); break;
    case 'weekly':    d.setDate(d.getDate() - 7); break;
    case 'monthly':   d.setMonth(d.getMonth() - 1); break;
    case 'quarterly': d.setMonth(d.getMonth() - 3); break;
    case 'yearly':    d.setFullYear(d.getFullYear() - 1); break;
    case 'all':
    default:          return null;
  }
  return d.toISOString().slice(0, 10);
}

// ── Aggregate one employee's review stats ─────────────────
// `since` optionally restricts to a period start (inclusive). Hidden reviews
// are always excluded from metrics.
export function employeeStats(employeeId, since = null) {
  const params = [employeeId];
  let where = "employee_id = ? AND status != 'hidden'";
  if (since) { where += ' AND created_at >= ?'; params.push(since); }

  const agg = db.prepare(`
    SELECT
      COUNT(*) AS total,
      COALESCE(AVG(overall_rating), 0) AS avg,
      SUM(CASE WHEN overall_rating = 5 THEN 1 ELSE 0 END) AS s5,
      SUM(CASE WHEN overall_rating = 4 THEN 1 ELSE 0 END) AS s4,
      SUM(CASE WHEN overall_rating = 3 THEN 1 ELSE 0 END) AS s3,
      SUM(CASE WHEN overall_rating = 2 THEN 1 ELSE 0 END) AS s2,
      SUM(CASE WHEN overall_rating = 1 THEN 1 ELSE 0 END) AS s1,
      SUM(CASE WHEN overall_rating >= 4 THEN 1 ELSE 0 END) AS positive,
      SUM(CASE WHEN overall_rating <= 2 THEN 1 ELSE 0 END) AS negative,
      SUM(CASE WHEN recommend = 1 THEN 1 ELSE 0 END) AS recommend_yes,
      COALESCE(AVG(professionalism), 0)    AS professionalism,
      COALESCE(AVG(communication), 0)      AS communication,
      COALESCE(AVG(knowledge), 0)          AS knowledge,
      COALESCE(AVG(friendliness), 0)       AS friendliness,
      COALESCE(AVG(response_time), 0)      AS response_time,
      COALESCE(AVG(overall_experience), 0) AS overall_experience
    FROM reviews WHERE ${where}
  `).get(...params);

  const total = agg.total || 0;
  const avg = Math.round((agg.avg || 0) * 100) / 100;
  const recommendRate = total ? agg.recommend_yes / total : 0;
  const distribution = { 5: agg.s5 || 0, 4: agg.s4 || 0, 3: agg.s3 || 0, 2: agg.s2 || 0, 1: agg.s1 || 0 };
  const subRatings = SUB_DIMENSIONS.map((d) => ({
    key: d.key, label: d.label, avg: Math.round((agg[d.key] || 0) * 100) / 100,
  }));

  return {
    total,
    avg,
    distribution,
    positive: agg.positive || 0,
    negative: agg.negative || 0,
    recommendYes: agg.recommend_yes || 0,
    recommendRate: Math.round(recommendRate * 100),
    satisfaction: total ? Math.round(((agg.positive || 0) / total) * 100) : 0,
    subRatings,
    fiveStar: agg.s5 || 0,
    performanceScore: performanceScore({ avg, reviews: total, recommendRate }),
    bonus: bonusFor(avg, total),
    starPerformer: (agg.s5 || 0) >= STAR_PERFORMER_MIN_FIVE,
  };
}
