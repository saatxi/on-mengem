/** Temps relatiu en català («fa 5 min», «ahir»…); a partir d'una setmana, la data. */
export const timeAgo = (dateStr: string | undefined, now = Date.now()): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const min = Math.floor((now - date.getTime()) / 60000);
  if (min < 1) return 'ara mateix';
  if (min < 60) return `fa ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `fa ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ahir';
  if (d < 7) return `fa ${d} dies`;
  return date.toLocaleDateString('ca', { day: 'numeric', month: 'short', year: d > 300 ? 'numeric' : undefined });
};

/** Si la data és del mes en curs (hora local). Accepta dates soles («2026-10-05») i instants ISO. */
export const isInCurrentMonth = (dateStr: string | undefined, now = new Date()): boolean => {
  if (!dateStr) return false;
  // Una data sola és local; new Date() la llegiria com a UTC i podria canviar de mes
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(`${dateStr}T00:00`) : new Date(dateStr);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};
