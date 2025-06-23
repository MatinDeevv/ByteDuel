-- Add missing columns to duels table for better match tracking
ALTER TABLE duels 
ADD COLUMN IF NOT EXISTS average_rating integer,
ADD COLUMN IF NOT EXISTS rating_difference integer,
ADD COLUMN IF NOT EXISTS creator_color text DEFAULT 'white',
ADD COLUMN IF NOT EXISTS opponent_color text DEFAULT 'black',
ADD COLUMN IF NOT EXISTS time_control text DEFAULT '15+0',
ADD COLUMN IF NOT EXISTS match_quality text DEFAULT 'good';

-- Add creator and opponent rating tracking
ALTER TABLE duels
ADD COLUMN IF NOT EXISTS creator_rating_before integer,
ADD COLUMN IF NOT EXISTS creator_rating_after integer,
ADD COLUMN IF NOT EXISTS creator_rating_change integer,
ADD COLUMN IF NOT EXISTS opponent_rating_before integer,
ADD COLUMN IF NOT EXISTS opponent_rating_after integer,
ADD COLUMN IF NOT EXISTS opponent_rating_change integer;

-- Add completion tracking
ALTER TABLE duels
ADD COLUMN IF NOT EXISTS creator_completion_time integer,
ADD COLUMN IF NOT EXISTS creator_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS opponent_completion_time integer,
ADD COLUMN IF NOT EXISTS opponent_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES users(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_duels_winner_id ON duels(winner_id);
CREATE INDEX IF NOT EXISTS idx_duels_average_rating ON duels(average_rating);
CREATE INDEX IF NOT EXISTS idx_duels_match_quality ON duels(match_quality);

-- Update existing duels with default values
UPDATE duels 
SET 
  average_rating = 1200,
  rating_difference = 0,
  creator_color = 'white',
  opponent_color = 'black',
  time_control = '15+0',
  match_quality = 'good'
WHERE average_rating IS NULL;