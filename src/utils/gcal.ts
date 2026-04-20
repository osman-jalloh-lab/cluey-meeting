/**
 * Builds a Google Calendar "create event" URL with pre-filled fields.
 * Opens in a new tab — no backend or OAuth required.
 */
export function buildGCalUrl(opts: {
  title: string;
  details?: string;
  /** ISO date string for start; defaults to tomorrow at 9 AM local time */
  startIso?: string;
  /** Duration in minutes; defaults to 30 */
  durationMins?: number;
  /** Optional recurrence rule — adds RRULE to the event */
  recur?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
}): string {
  const { title, details = '', durationMins = 30, recur } = opts;

  // Default start: tomorrow at 9:00 AM local time
  const start = opts.startIso ? new Date(opts.startIso) : (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  })();

  const end = new Date(start.getTime() + durationMins * 60 * 1000);

  // Google Calendar format: YYYYMMDDTHHmmss (local, no Z suffix = local time)
  const fmt = (d: Date) =>
    [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
      'T',
      String(d.getHours()).padStart(2, '0'),
      String(d.getMinutes()).padStart(2, '0'),
      '00',
    ].join('');

  const rruleMap: Record<string, string> = {
    WEEKLY:   'RRULE:FREQ=WEEKLY',
    BIWEEKLY: 'RRULE:FREQ=WEEKLY;INTERVAL=2',
    MONTHLY:  'RRULE:FREQ=MONTHLY',
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details,
    dates: `${fmt(start)}/${fmt(end)}`,
  });

  if (recur && rruleMap[recur]) {
    params.set('recur', rruleMap[recur]);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
