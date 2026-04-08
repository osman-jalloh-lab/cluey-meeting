import { hashStr } from './hash';

const PALETTE = ['#b8d832', '#3b7dd8', '#d94f3d', '#c07830', '#2a9068', '#8b5cf6', '#e0609a'];

export function avaColor(name: string) {
  const c = PALETTE[Math.abs(hashStr(name)) % PALETTE.length];
  return { bg: c + '22', fg: c };
}

export function initials(name: string) {
  return name
    .split(/[\s,+]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}
