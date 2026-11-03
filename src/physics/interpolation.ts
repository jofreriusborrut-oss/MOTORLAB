import type { CurvePoint } from './types';

/**
 * Interpolació cúbica monòtona (Fritsch–Carlson) sobre els punts de la corba.
 * A diferència d'un spline cúbic clàssic, no crea pics ni oscil·lacions
 * inexistents entre punts: si l'usuari defineix una corba plana, la corba
 * interpolada també ho serà.
 */
export interface Interpolator {
  (x: number): number;
  xMin: number;
  xMax: number;
}

export function sortCurve(points: CurvePoint[]): CurvePoint[] {
  return [...points]
    .filter((p) => Number.isFinite(p.rpm) && Number.isFinite(p.torque))
    .sort((a, b) => a.rpm - b.rpm)
    .filter((p, i, arr) => i === 0 || p.rpm > arr[i - 1].rpm);
}

export function linearInterpolator(xs: number[], ys: number[]): Interpolator {
  const f = ((x: number) => {
    const n = xs.length;
    if (n === 0) return 0;
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
    return ys[i] + t * (ys[i + 1] - ys[i]);
  }) as Interpolator;
  f.xMin = xs[0] ?? 0;
  f.xMax = xs[xs.length - 1] ?? 0;
  return f;
}

export function monotoneCubic(xs: number[], ys: number[]): Interpolator {
  const n = xs.length;
  if (n < 3) return linearInterpolator(xs, ys);

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(xs[i + 1] - xs[i]);
    slope.push((ys[i + 1] - ys[i]) / dx[i]);
  }

  const m: number[] = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }

  const f = ((x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] > x) hi = mid;
      else lo = mid;
    }
    const h = dx[lo];
    const t = (x - xs[lo]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[lo] +
      (t3 - 2 * t2 + t) * h * m[lo] +
      (-2 * t3 + 3 * t2) * ys[lo + 1] +
      (t3 - t2) * h * m[lo + 1]
    );
  }) as Interpolator;
  f.xMin = xs[0];
  f.xMax = xs[n - 1];
  return f;
}

export function curveInterpolator(points: CurvePoint[]): Interpolator {
  const sorted = sortCurve(points);
  return monotoneCubic(
    sorted.map((p) => p.rpm),
    sorted.map((p) => Math.max(0, p.torque)),
  );
}
