/*
  # Create practice sessions table

  1. New Tables
    - `practice_sessions`
      - `id` (uuid, primary key)
      - `user_id` (text, required)
      - `mode` (text, practice mode)
      - `topic` (text, practice topic)
      - `difficulty` (text, easy/medium/hard)
      - `prompt` (text, challenge description)
      - `test_cases` (jsonb, test cases array)
      - `hints_used` (integer, default 0)
      - `completed` (boolean, default false)
      - `score` (integer, default 0)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `practice_sessions` table
    - Add policies for public access (for guest users)
*/

CREATE TABLE IF NOT EXISTS practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  mode text NOT NULL,
  topic text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  prompt text NOT NULL,
  test_cases jsonb NOT NULL,
  hints_used integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read practice sessions"
  ON practice_sessions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create practice sessions"
  ON practice_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update practice sessions"
  ON practice_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true);