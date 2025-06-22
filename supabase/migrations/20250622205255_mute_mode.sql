/*
  # Extend users table for authentication and GitHub integration

  1. New Columns
    - `avatar_url` (text) - Profile picture URL from GitHub or uploaded
    - `github_id` (text) - GitHub user ID for OAuth integration
    - `email` (text) - User email address
    - `wins` (integer) - Total wins count
    - `losses` (integer) - Total losses count
    - `last_active` (timestamp) - Last activity timestamp

  2. Security
    - Update RLS policies for new columns
    - Add indexes for performance

  3. GitHub Integration
    - Store GitHub profile data for seamless sync
*/

-- Add new columns to users table
DO $$
BEGIN
  -- Add avatar_url if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url text;
  END IF;

  -- Add github_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'github_id'
  ) THEN
    ALTER TABLE users ADD COLUMN github_id text UNIQUE;
  END IF;

  -- Add email if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email text;
  END IF;

  -- Add wins if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'wins'
  ) THEN
    ALTER TABLE users ADD COLUMN wins integer NOT NULL DEFAULT 0;
  END IF;

  -- Add losses if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'losses'
  ) THEN
    ALTER TABLE users ADD COLUMN losses integer NOT NULL DEFAULT 0;
  END IF;

  -- Add last_active if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE users ADD COLUMN last_active timestamptz DEFAULT now();
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active DESC);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Public can read user display data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;

-- Allow authenticated users to read their own full profile
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow public to read limited profile data for leaderboards/matches
CREATE POLICY "Public can read user display data"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to create their own profile
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);