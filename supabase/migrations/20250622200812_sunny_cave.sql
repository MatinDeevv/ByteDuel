/*
  # Create submissions table

  1. New Tables
    - `submissions`
      - `id` (uuid, primary key)
      - `duel_id` (uuid, foreign key to duels)
      - `user_id` (text, required)
      - `code` (text, submitted code)
      - `passed_tests` (integer, number of passed tests)
      - `total_tests` (integer, total number of tests)
      - `runtime_ms` (integer, execution time)
      - `submitted_at` (timestamp)
  2. Security
    - Enable RLS on `submissions` table
    - Add policies for public access
*/

CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id uuid NOT NULL,
  user_id text NOT NULL,
  code text NOT NULL,
  passed_tests integer NOT NULL,
  total_tests integer NOT NULL,
  runtime_ms integer NOT NULL,
  submitted_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'submissions_duel_id_fkey'
  ) THEN
    ALTER TABLE submissions ADD CONSTRAINT submissions_duel_id_fkey 
    FOREIGN KEY (duel_id) REFERENCES duels(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read submissions"
  ON submissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create submissions"
  ON submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);