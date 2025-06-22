/*
  # Create highlights table

  1. New Tables
    - `highlights`
      - `id` (uuid, primary key)
      - `duel_id` (uuid, foreign key to duels)
      - `video_url` (text, highlight video URL)
      - `keystrokes_data` (text, JSON string of keystroke data)
      - `ai_commentary` (text, AI-generated commentary)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `highlights` table
    - Add policies for public access
*/

CREATE TABLE IF NOT EXISTS highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id uuid NOT NULL,
  video_url text NOT NULL,
  keystrokes_data text NOT NULL,
  ai_commentary text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'highlights_duel_id_fkey'
  ) THEN
    ALTER TABLE highlights ADD CONSTRAINT highlights_duel_id_fkey 
    FOREIGN KEY (duel_id) REFERENCES duels(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read highlights"
  ON highlights
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create highlights"
  ON highlights
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);