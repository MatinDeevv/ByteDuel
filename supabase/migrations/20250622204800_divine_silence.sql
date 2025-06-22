/*
  # Create duel results table

  1. New Tables
    - `duel_results`
      - `duel_id` (uuid, primary key, references duels)
      - `winner_id` (uuid, references users)
      - `loser_id` (uuid, references users)
      - `winner_delta` (integer, Elo rating change for winner)
      - `loser_delta` (integer, Elo rating change for loser)
      - `timestamp` (timestamp, when duel completed)

  2. Security
    - Enable RLS on `duel_results` table
    - Add policies for reading results
*/

CREATE TABLE IF NOT EXISTS duel_results (
  duel_id uuid PRIMARY KEY REFERENCES duels(id) ON DELETE CASCADE,
  winner_id uuid REFERENCES users(id) ON DELETE CASCADE,
  loser_id uuid REFERENCES users(id) ON DELETE CASCADE,
  winner_delta integer NOT NULL,
  loser_delta integer NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE duel_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read duel results"
  ON duel_results
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create duel results"
  ON duel_results
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);