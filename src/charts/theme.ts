/** Paleta validada (OKLCH, mode fosc, superfície #12161c) per a les sèries de dades. */
export const SERIES = {
  orange: '#e06c1f',
  blue: '#3388dd',
  green: '#22a06b',
  purple: '#a06cc8',
};

export const CHART = {
  grid: '#1e252e',
  axis: '#5d6977',
  text: '#8b97a6',
  surface: '#12161c',
};

/** Rampa seqüencial (un sol to) per a marxes ordenades: 1a = més clara. */
export function gearColor(i: number, n: number): string {
  const from = [168, 206, 245];
  const to = [32, 92, 170];
  const k = n <= 1 ? 0 : i / (n - 1);
  const c = from.map((f, j) => Math.round(f + (to[j] - f) * k));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export const axisProps = {
  stroke: CHART.axis,
  tick: { fill: CHART.text, fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace' },
  tickLine: false,
  axisLine: { stroke: CHART.grid },
} as const;

export const gridProps = { stroke: CHART.grid, strokeDasharray: '2 4', vertical: false } as const;
