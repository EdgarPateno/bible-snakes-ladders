import { shuffle, type Rand } from '../lib/random';

export function nextTurnIndex(current: number, playerCount: number, extraTurn: boolean): number {
  if (extraTurn) return current;
  return (current + 1) % playerCount;
}

export function shuffleOrder(ids: string[], rand: Rand = Math.random): string[] {
  return shuffle(ids, rand);
}

export interface Standing {
  playerId: string;
  position: number;
  place: number;
}

export function standings(order: string[], positions: Record<string, number>, winnerId: string | null): Standing[] {
  const sorted = order
    .map((playerId, i) => ({ playerId, position: positions[playerId] ?? 0, i }))
    .sort((a, b) => {
      if (a.playerId === winnerId) return -1;
      if (b.playerId === winnerId) return 1;
      return b.position - a.position || a.i - b.i;
    });
  const out: Standing[] = [];
  sorted.forEach((s, idx) => {
    const prev = out[idx - 1];
    const tied = prev && s.playerId !== winnerId && prev.playerId !== winnerId && prev.position === s.position;
    out.push({ playerId: s.playerId, position: s.position, place: tied ? prev.place : idx + 1 });
  });
  return out;
}
