import { useCallback, useEffect, useRef, useState } from 'react';

export type PlayState = 'aturat' | 'en-marxa' | 'pausa' | 'finalitzat';

/**
 * Rellotge de reproducció basat en requestAnimationFrame. Avança el temps de
 * simulació en temps real (multiplicat per `rate`) fins a `duration`.
 */
export function usePlayback(duration: number, rate: number) {
  const [t, setT] = useState(0);
  const [state, setState] = useState<PlayState>('aturat');
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);
  const tRef = useRef(0);

  const stopLoop = () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    last.current = null;
  };

  const loop = useCallback(
    (now: number) => {
      if (last.current === null) last.current = now;
      const dt = Math.min(0.1, (now - last.current) / 1000);
      last.current = now;
      const next = Math.min(duration, tRef.current + dt * rate);
      tRef.current = next;
      setT(next);
      if (next >= duration) {
        setState('finalitzat');
        stopLoop();
        return;
      }
      raf.current = requestAnimationFrame(loop);
    },
    [duration, rate],
  );

  const start = () => {
    if (state === 'en-marxa') return;
    if (tRef.current >= duration) {
      tRef.current = 0;
      setT(0);
    }
    setState('en-marxa');
    stopLoop();
    raf.current = requestAnimationFrame(loop);
  };
  const pause = () => {
    if (state !== 'en-marxa') return;
    stopLoop();
    setState('pausa');
  };
  const reset = () => {
    stopLoop();
    tRef.current = 0;
    setT(0);
    setState('aturat');
  };

  // Si canvia la simulació (nova configuració) o la velocitat, reprèn amb el nou bucle
  useEffect(() => {
    if (state === 'en-marxa') {
      stopLoop();
      raf.current = requestAnimationFrame(loop);
    }
    return stopLoop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop]);

  useEffect(() => {
    if (tRef.current > duration) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  return { t, state, start, pause, reset };
}
