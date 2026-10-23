import type { Player, Rules, Settings } from '../types';
import { classicLayout } from '../logic/board';
import { DEFAULT_QUESTIONS } from './defaultQuestions';

export const PLAYER_COLORS = ['#c0392b', '#1f6fb2', '#2e8b57', '#d68910', '#7d3c98', '#17a2a2', '#d6336c', '#5d6d7e'];
export const PLAYER_TOKENS = ['🕊️', '🦁', '🐑', '🐟', '⭐', '🍇', '🌿', '🔥', '🐫', '👑', '📜', '⛵'];
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export const DEFAULT_PLAYERS: Player[] = [
  { id: 'p-ana', name: 'Ana', color: PLAYER_COLORS[0], token: '🕊️' },
  { id: 'p-ben', name: 'Ben', color: PLAYER_COLORS[1], token: '🦁' },
  { id: 'p-grace', name: 'Grace', color: PLAYER_COLORS[2], token: '🐑' },
];

export const DEFAULT_RULES: Rules = {
  exactRollToFinish: true,
  showCorrectAnswer: true,
  extraTurnOnSix: false,
  sound: true,
  answerTimerSeconds: 0,
  lenientMatching: true,
  hostOverride: true,
  randomizeTurnOrder: false,
};

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  players: DEFAULT_PLAYERS,
  questions: DEFAULT_QUESTIONS,
  board: classicLayout(100),
  rules: DEFAULT_RULES,
};
