export type DiceNumber = 1 | 2 | 3 | 4 | 5 | 6;
export const DICE_NUMBERS: DiceNumber[] = [1, 2, 3, 4, 5, 6];

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  diceNumber: DiceNumber;
  question: string;
  /** Any of these counts as correct, e.g. ["Moses", "Prophet Moses"]. */
  acceptedAnswers: string[];
  reference?: string;
  difficulty?: Difficulty;
  explanation?: string;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  /** An emoji shown on the token. */
  token: string;
}

/** A snake (from > to) or a ladder (from < to). */
export interface Jump {
  id: string;
  from: number;
  to: number;
}

export type BoardSize = 50 | 64 | 100;
export const BOARD_SIZES: BoardSize[] = [50, 64, 100];

export interface BoardConfig {
  size: BoardSize;
  snakes: Jump[];
  ladders: Jump[];
}

export interface Rules {
  exactRollToFinish: boolean;
  showCorrectAnswer: boolean;
  extraTurnOnSix: boolean;
  sound: boolean;
  /** 0 = no timer. */
  answerTimerSeconds: number;
  lenientMatching: boolean;
  hostOverride: boolean;
  randomizeTurnOrder: boolean;
}

export interface Settings {
  version: 1;
  players: Player[];
  questions: Question[];
  board: BoardConfig;
  rules: Rules;
}

export type Phase = 'roll' | 'rolling' | 'question' | 'feedback' | 'moving' | 'finished';

export type AnswerOutcome = 'correct' | 'wrong' | 'timeout' | 'skipped';

export interface LogEntry {
  id: string;
  turn: number;
  playerId: string;
  roll: number;
  outcome: AnswerOutcome;
  from: number;
  /** Square reached by walking, before any snake or ladder. */
  landing: number;
  to: number;
  bounced: boolean;
  jump: 'snake' | 'ladder' | null;
  extraTurn: boolean;
  won: boolean;
}

export interface Feedback {
  outcome: AnswerOutcome;
  given: string;
  /** Set when the outcome came from the host buttons. */
  byHost: boolean;
}

/** One step of the token animation. */
export type MoveStep =
  | { kind: 'walk'; square: number }
  | { kind: 'snake'; jumpId: string; from: number; to: number }
  | { kind: 'ladder'; jumpId: string; from: number; to: number };

export interface PendingMove {
  /** Unique per move, so the token animation never mixes up two identical moves. */
  id: string;
  playerId: string;
  steps: MoveStep[];
  final: number;
}

export interface GameState {
  id: string;
  players: Player[];
  board: BoardConfig;
  order: string[];
  /** 0 = not on the board yet. */
  positions: Record<string, number>;
  /** Index into `order`. */
  current: number;
  phase: Phase;
  roll: number | null;
  questionId: string | null;
  /** When the current question was first shown (ms), so the answer timer survives a refresh. */
  askedAt: number | null;
  feedback: Feedback | null;
  pendingMove: PendingMove | null;
  /** Remaining question ids per dice number, so nothing repeats until a pool is used up. */
  bags: Record<DiceNumber, string[]>;
  lastAsked: Partial<Record<DiceNumber, string>>;
  log: LogEntry[];
  winnerId: string | null;
  turn: number;
  startedAt: number;
}
