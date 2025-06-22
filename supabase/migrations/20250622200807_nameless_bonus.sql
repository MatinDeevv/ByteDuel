/*
  # Create tournaments table

  1. New Tables
    - `tournaments`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `status` (text, registration/active/completed)
      - `max_players` (integer, required)
      - `current_players` (text array, player IDs)
      - `bracket` (jsonb, tournament bracket data)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `tournaments` table
    - Add policies for public access
*/

CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'registration' CHECK (status IN ('registration', 'active', 'completed')),
  max_players integer NOT NULL,
  current_players text[] NOT NULL DEFAULT '{}',
  bracket jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tournaments"
  ON tournaments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create tournaments"
  ON tournaments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update tournaments"
  ON tournaments
  FOR UPDATE
  TO anon, authenticated
  USING (true);