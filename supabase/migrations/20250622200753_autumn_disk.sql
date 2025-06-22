/*
  # Create duels table

  1. New Tables
    - `duels`
      - `id` (uuid, primary key)
      - `creator_id` (text, required)
      - `opponent_id` (text, optional)
      - `status` (text, waiting/active/completed)
      - `mode` (text, game mode)
      - `prompt` (text, challenge description)
      - `test_cases` (jsonb, test cases array)
      - `time_limit` (integer, seconds)
      - `elo_change` (numeric, optional)
      - `created_at` (timestamp)
      - `started_at` (timestamp, optional)
      - `ended_at` (timestamp, optional)
  2. Security
    - Enable RLS on `duels` table
    - Add policies for public read/write access (for guest users)
*/

CREATE TABLE IF NOT EXISTS duels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id text NOT NULL,
  opponent_id text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  mode text NOT NULL,
  prompt text NOT NULL,
  test_cases jsonb NOT NULL,
  time_limit integer NOT NULL,
  elo_change numeric,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

ALTER TABLE duels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read duels"
  ON duels
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create duels"
  ON duels
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update duels"
  ON duels
  FOR UPDATE
  TO anon, authenticated
  USING (true);