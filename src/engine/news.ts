import { MEDIA, pick } from '../data/names';
import type { Game, NewsItem } from './types';

export function addNews(g: Game, text: string, tone: NewsItem['tone'] = 'neutral', src?: string) {
  const press = g.policies.premsa;
  const source = src ?? (tone === 'world' ? pick(MEDIA.world) : press === 2 ? pick(MEDIA.state) : press === 1 && Math.random() < 0.5 ? pick(MEDIA.state) : pick(MEDIA.free));
  g.news.unshift({ id: ++g.newsSeq, date: g.month, text, src: source, tone });
  if (g.news.length > 250) g.news.length = 250;
}

/** Notícia sobre el líder: amb censura, la premsa sempre en parla bé */
export function newsAboutMe(g: Game, honest: string, propaganda: string, tone: NewsItem['tone']) {
  if (g.inPower && g.policies.premsa === 2) addNews(g, propaganda, 'me');
  else if (g.inPower && g.policies.premsa === 1 && tone === 'bad' && Math.random() < 0.5) addNews(g, propaganda, 'me');
  else addNews(g, honest, tone === 'neutral' ? 'me' : tone);
}

export function leaderRef(g: Game) {
  return g.inPower ? `${g.def.title.toLowerCase()} ${g.playerName}` : `el líder de l'oposició ${g.playerName}`;
}
export function govRef(g: Game) {
  return g.inPower ? `El govern de ${g.playerName}` : `El govern de ${g.govLeader}`;
}
