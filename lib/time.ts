/** "2h ago" / "5h ago" / "3d ago" — the meta line on a feed card. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

/** "RM" from "Ryan M." / "ryan_m" — avatar fallback initials. */
export function initials(name: string): string {
  const parts = name.replace(/[_.-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}
