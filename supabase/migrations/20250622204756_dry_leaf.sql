/*
  # Create matchmaking queue table

  1. New Tables
    - `matchmaking_queue`
      - `user_id` (uuid, primary key, references users)
      - `mode` (text, game mode like 'ranked')
      - `queued_at` (timestamp, when user joined queue)

  2. Security
    - Enable RLS on `matchmaking_queue` table
    - Add policies for queue management
*/

CREATE TABLE IF NOT EXISTS matchmaking_queue (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL,
  queued_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage queue"
  ON matchmaking_queue
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);