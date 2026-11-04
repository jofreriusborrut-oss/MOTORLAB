import type { Card } from '../engine/cards';

export const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🐧', '🦉', '🐺', '🐻', '🐨', '🐙', '🦄', '🐲', '🤠', '😎'];

const SUIT_SYM: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const RANK_TXT: Record<string, string> = { T: '10' };

export function CardView({ card, size = 'md', dim = false, glow = false }: { card: Card | null; size?: 'sm' | 'md' | 'lg'; dim?: boolean; glow?: boolean }) {
  if (!card) return <div className={`pk-card pk-card-${size} pk-back`} />;
  const suit = card[1];
  return (
    <div className={`pk-card pk-card-${size} pk-suit-${suit}${dim ? ' pk-dim' : ''}${glow ? ' pk-glow' : ''}`}>
      <span className="pk-rank">{RANK_TXT[card[0]] ?? card[0]}</span>
      <span className="pk-suit">{SUIT_SYM[suit]}</span>
    </div>
  );
}

export function makeFmt(bbMode: boolean, bb: number) {
  return (n: number) => {
    if (bbMode && bb > 0) {
      const v = n / bb;
      return `${Number.isInteger(v) ? v : v.toFixed(1)} BB`;
    }
    return n.toLocaleString('ca-ES');
  };
}

let ctx: AudioContext | null = null;
export function beep(freq = 880, ms = 120, vol = 0.08) {
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.type = 'sine';
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
  } catch {
    /* sense so */
  }
}

export function inviteLink(code: string) {
  const u = new URL(location.href);
  const server = u.searchParams.get('servidor');
  u.search = `?sala=${code}${server ? `&servidor=${server}` : ''}`;
  u.hash = '';
  return u.toString();
}

export async function shareInvite(code: string): Promise<string> {
  const url = inviteLink(code);
  const text = `Vine a jugar a pòquer! Sala ${code}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Nit de Pòquer', text, url });
      return '';
    }
  } catch {
    return '';
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'Enllaç copiat';
  } catch {
    return url;
  }
}
