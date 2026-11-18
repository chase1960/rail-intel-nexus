import type { AuthorityLevel, RiskLevel, EventStatus, ImpactLevel, IntelCategory } from './types';

export function tierClass(level: AuthorityLevel) {
  return `tier-badge-${level.toLowerCase()}`;
}

export function riskClass(risk: RiskLevel) {
  if (risk === 'P1') return 'bg-[color:var(--risk-p1-bg)] text-[color:var(--risk-p1)] border-[color:var(--risk-p1)]/30';
  if (risk === 'P2') return 'bg-[color:var(--risk-p2-bg)] text-[color:var(--risk-p2)] border-[color:var(--risk-p2)]/30';
  return 'bg-[color:var(--risk-p3-bg)] text-[color:var(--risk-p3)] border-[color:var(--risk-p3)]/30';
}

export function statusClass(status: EventStatus) {
  const map: Record<EventStatus, string> = {
    new: 'bg-slate-50 text-slate-600 border-slate-200',
    evidence_check: 'bg-sky-50 text-sky-700 border-sky-200',
    human_review: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    product_review: 'bg-blue-50 text-blue-700 border-blue-200',
    action_planned: 'bg-blue-50 text-blue-700 border-blue-200',
    assigned: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    effect_review: 'bg-teal-50 text-teal-700 border-teal-200',
    closed: 'bg-slate-100 text-slate-500 border-slate-200',
    watching: 'bg-purple-50 text-purple-700 border-purple-200',
    invalid_lead: 'bg-rose-50 text-rose-600 border-rose-200',
  };
  return map[status];
}

export function impactColor(level: ImpactLevel) {
  const map: Record<ImpactLevel, string> = {
    none: 'bg-muted/40 text-muted-foreground',
    possible: 'bg-blue-100 text-blue-700',
    clear: 'bg-amber-100 text-amber-800',
    high: 'bg-red-100 text-red-700 font-medium',
  };
  return map[level];
}

export function impactLabel(level: ImpactLevel) {
  return { none: '无影响', possible: '可能影响', clear: '明确影响', high: '高风险' }[level];
}

export function categoryLabel(c: IntelCategory) {
  return { policy: '政策监管', competitor: '功能竞品', sentiment: '舆论反馈' }[c];
}
