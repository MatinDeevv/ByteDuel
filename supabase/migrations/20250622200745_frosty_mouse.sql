/*
  # Create users table

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `github_username` (text, optional)
      - `display_name` (text, required)
      - `skill_level` (text, beginner/intermediate/advanced)
      - `elo_rating` (integer, default 1200)
      - `games_played` (integer, default 0)
      - `games_won` (integer, default 0)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data
    - Add policy for public read access to display data
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  github_username text UNIQUE,
  display_name text NOT NULL,
  skill_level text NOT NULL DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  elo_rating integer NOT NULL DEFAULT 1200,
  games_played integer NOT NULL DEFAULT 0,
  games_won integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Public can read user display data"
  ON users
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);