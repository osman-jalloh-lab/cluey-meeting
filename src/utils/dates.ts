export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  
  // Set both dates to start of day for accurate day difference
  const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diff = Math.floor((nowStart.getTime() - dStart.getTime()) / 86400000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
