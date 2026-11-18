/** Date helpers. All intel timestamps are stored as ISO strings (local display is trimmed). */

export const HOUR = 3600_000;
export const DAY = 24 * HOUR;

export function nowIso(): string {
  return new Date().toISOString();
}

/** Accepts ISO, `YYYY-MM-DD HH:mm`, `YYYY/M/D`, `YYYY年M月D日 HH:mm`. */
export function parsePublishedAt(input: string, fallback = new Date()): string {
  const text = (input ?? "").trim();
  if (!text) return fallback.toISOString();
  const normalized = text
    .replace(/年|月/g, "-")
    .replace(/日/g, " ")
    .replace(/\//g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const isoLike = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (isoLike) {
    const [, y, m, d, hh = "0", mm = "0", ss = "0"] = isoLike;
    const date = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss),
    );
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? fallback.toISOString() : parsed.toISOString();
}

export function hoursBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / HOUR;
}

/** `2026-11-18 14:05` — the only display format used in UI. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDate(iso: string): string {
  return formatDateTime(iso).slice(0, 10);
}

export function weekdayCn(iso: string): string {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][new Date(iso).getDay()];
}

export function relativeFrom(iso: string, now = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} 天前`;
  return `${Math.round(days / 30)} 个月前`;
}

/** Freshness decay used by the scoring card: 1.0 within 24h, 0.2 at 7 days. */
export function freshnessScore(iso: string, now: Date): number {
  const ageHours = Math.max(0, (now.getTime() - new Date(iso).getTime()) / HOUR);
  if (ageHours <= 24) return 1;
  if (ageHours >= 24 * 7) return 0.2;
  const t = (ageHours - 24) / (24 * 6);
  return 1 - 0.8 * t;
}

export function windowLabel(startIso: string, endIso: string): string {
  const days = Math.max(1, Math.round(hoursBetween(startIso, endIso) / 24));
  return `${formatDate(startIso)} → ${formatDate(endIso)}（${days} 天窗口）`;
}

/** Relative offsets make the sample corpus always look "this week" instead of frozen in time. */
export function offsetFromNow(hoursAgo: number, now = new Date()): string {
  return new Date(now.getTime() - hoursAgo * HOUR).toISOString();
}
