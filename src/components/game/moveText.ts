import type { LogEntry, Player } from '../../types';

const OUTCOME: Record<LogEntry['outcome'], string> = {
  correct: 'answered correctly',
  wrong: 'answered wrong',
  timeout: 'ran out of time',
  skipped: 'had no question',
};

/** "Ana rolled 4 → answered correctly → moved to 23 → climbed ladder to 44" */
export function describeMove(e: LogEntry, players: Player[]): string {
  const name = players.find((p) => p.id === e.playerId)?.name ?? 'Someone';
  const parts = [`${name} rolled ${e.roll}`, OUTCOME[e.outcome]];
  const moved = e.outcome === 'correct' || e.outcome === 'skipped';
  if (!moved) parts.push(`stays on ${e.from || 'start'}`);
  else {
    if (e.bounced) parts.push(`bounced back to ${e.landing}`);
    else parts.push(`moved to ${e.landing}`);
    if (e.jump === 'ladder') parts.push(`climbed ladder to ${e.to}`);
    if (e.jump === 'snake') parts.push(`slid down snake to ${e.to}`);
  }
  if (e.won) parts.push('won the game! 🏆');
  else if (e.extraTurn) parts.push('rolls again');
  return parts.join(' → ');
}
