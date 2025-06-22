export interface User {
  id: string;
  githubUsername?: string;
  displayName: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  eloRating: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: string;
}

export type GameMode = 'ranked-duel' | 'timed-trial' | 'tournament' | 'beat-the-bot' | 'practice';
export type PracticeMode = 'warm-up' | 'drills' | 'custom';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Duel {
  id: string;
  creatorId: string;
  opponentId?: string;
  status: 'waiting' | 'active' | 'completed';
  mode: GameMode;
  prompt: string;
  testCases: TestCase[];
  timeLimit: number;
  eloChange?: number;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface PracticeSession {
  id: string;
  userId: string;
  mode: PracticeMode;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  testCases: TestCase[];
  hintsUsed: number;
  completed: boolean;
  score: number;
  createdAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  status: 'registration' | 'active' | 'completed';
  maxPlayers: number;
  currentPlayers: string[];
  bracket: TournamentMatch[];
  createdAt: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  player1Id: string;
  player2Id?: string;
  winnerId?: string;
  duelId?: string;
  status: 'pending' | 'active' | 'completed';
}

export interface TestCase {
  input: string;
  expected: string;
}

export interface Submission {
  id: string;
  duelId: string;
  userId: string;
  code: string;
  passedTests: number;
  totalTests: number;
  runtimeMs: number;
  submittedAt: string;
}

export interface Highlight {
  id: string;
  duelId: string;
  videoUrl: string;
  keystrokesData: string;
  aiCommentary: string;
  createdAt: string;
}