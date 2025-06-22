/*
  # Add rating column to users table

  1. Changes
    - Add `rating` column to users table with default 1200 (standard Elo starting rating)
    - Update existing users to have the default rating

  2. Notes
    - Uses standard chess Elo rating system starting point
    - All existing users will get the default rating
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'rating'
  ) THEN
    ALTER TABLE users ADD COLUMN rating integer NOT NULL DEFAULT 1200;
  END IF;
END $$;