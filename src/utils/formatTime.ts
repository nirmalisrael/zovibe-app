export function formatTime(seconds: number | string | undefined | null): string {
  const num = typeof seconds === 'string' ? Number.parseFloat(seconds) : Number(seconds);
  if (!Number.isFinite(num) || num <= 0) return '';
  const m = Math.floor(num / 60);
  const s = Math.floor(num % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
