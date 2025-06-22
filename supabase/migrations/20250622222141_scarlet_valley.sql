/*
  # Sample Data for Development and Testing

  1. Sample Profiles
    - Test users with various skill levels
    - Different rating ranges
    - GitHub integration examples

  2. Sample Duels
    - Completed matches with results
    - Active matches for testing
    - Various difficulty levels

  3. Sample Practice Sessions
    - Different topics and difficulties
    - Completed and in-progress sessions
*/

-- Insert sample profiles (only if not in production)
DO $$
BEGIN
  -- Only insert sample data in development
  IF current_setting('app.environment', true) != 'production' THEN
    
    -- Sample profiles
    INSERT INTO profiles (
      id, display_name, github_username, avatar_url, skill_level, 
      elo_rating, wins, losses, total_matches, current_streak, best_streak
    ) VALUES 
    (
      '00000000-0000-0000-0000-000000000001',
      'CodeMaster',
      'codemaster',
      'https://avatars.githubusercontent.com/u/1?v=4',
      'advanced',
      2150, 45, 7, 52, 5, 12
    ),
    (
      '00000000-0000-0000-0000-000000000002',
      'AlgoNinja',
      'algoninja',
      'https://avatars.githubusercontent.com/u/2?v=4',
      'advanced',
      2089, 38, 6, 44, 3, 8
    ),
    (
      '00000000-0000-0000-0000-000000000003',
      'ByteWarrior',
      'bytewarrior',
      'https://avatars.githubusercontent.com/u/3?v=4',
      'intermediate',
      1987, 42, 9, 51, 0, 7
    ),
    (
      '00000000-0000-0000-0000-000000000004',
      'DevGuru',
      'devguru',
      'https://avatars.githubusercontent.com/u/4?v=4',
      'intermediate',
      1923, 35, 6, 41, 2, 6
    ),
    (
      '00000000-0000-0000-0000-000000000005',
      'ScriptKid',
      'scriptkid',
      'https://avatars.githubusercontent.com/u/5?v=4',
      'beginner',
      1876, 28, 7, 35, 1, 4
    ),
    (
      '00000000-0000-0000-0000-000000000006',
      'DataDragon',
      'datadragon',
      'https://avatars.githubusercontent.com/u/6?v=4',
      'intermediate',
      1654, 22, 18, 40, 0, 3
    ),
    (
      '00000000-0000-0000-0000-000000000007',
      'LogicLion',
      'logiclion',
      'https://avatars.githubusercontent.com/u/7?v=4',
      'beginner',
      1432, 15, 20, 35, 0, 2
    ),
    (
      '00000000-0000-0000-0000-000000000008',
      'PixelPirate',
      'pixelpirate',
      'https://avatars.githubusercontent.com/u/8?v=4',
      'beginner',
      1298, 12, 23, 35, 0, 1
    );

    -- Sample user stats
    INSERT INTO user_stats (
      user_id, total_practice_sessions, average_solve_time, fastest_solve_time,
      favorite_topics, difficulty_distribution, perfect_solutions
    ) VALUES 
    (
      '00000000-0000-0000-0000-000000000001',
      156, 180, 45,
      ARRAY['algorithms', 'data-structures', 'dynamic-programming'],
      '{"easy": 20, "medium": 80, "hard": 56}',
      23
    ),
    (
      '00000000-0000-0000-0000-000000000002',
      134, 195, 52,
      ARRAY['algorithms', 'graphs', 'trees'],
      '{"easy": 15, "medium": 70, "hard": 49}',
      19
    ),
    (
      '00000000-0000-0000-0000-000000000003',
      98, 220, 67,
      ARRAY['arrays', 'strings', 'sorting'],
      '{"easy": 25, "medium": 55, "hard": 18}',
      15
    );

    -- Sample completed duels
    INSERT INTO duels (
      id, creator_id, opponent_id, status, mode, difficulty, topic,
      prompt, test_cases, winner_id, creator_rating_before, opponent_rating_before,
      creator_rating_after, opponent_rating_after, creator_rating_change, opponent_rating_change,
      creator_completion_time, opponent_completion_time, creator_attempts, opponent_attempts,
      created_at, started_at, ended_at
    ) VALUES 
    (
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      'completed', 'ranked', 'medium', 'arrays',
      'Find two numbers in an array that add up to a target sum.',
      '[{"input": "[2,7,11,15], 9", "expected": "[0,1]"}, {"input": "[3,2,4], 6", "expected": "[1,2]"}]',
      '00000000-0000-0000-0000-000000000001',
      2126, 2113, 2150, 2089, 24, -24,
      156, 203, 1, 2,
      NOW() - INTERVAL '2 days',
      NOW() - INTERVAL '2 days' + INTERVAL '30 seconds',
      NOW() - INTERVAL '2 days' + INTERVAL '4 minutes'
    ),
    (
      '10000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004',
      'completed', 'ranked', 'medium', 'strings',
      'Check if a string is a valid palindrome.',
      '[{"input": "\"A man, a plan, a canal: Panama\"", "expected": "true"}, {"input": "\"race a car\"", "expected": "false"}]',
      '00000000-0000-0000-0000-000000000003',
      1965, 1945, 1987, 1923, 22, -22,
      189, 245, 1, 3,
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day' + INTERVAL '45 seconds',
      NOW() - INTERVAL '1 day' + INTERVAL '6 minutes'
    );

    -- Sample practice sessions
    INSERT INTO practice_sessions (
      id, user_id, topic, difficulty, prompt, test_cases, hints,
      completed, score, completion_time, attempts, final_code
    ) VALUES 
    (
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000005',
      'arrays', 'easy',
      'Find the maximum element in an array.',
      '[{"input": "[1,3,2,5,4]", "expected": "5"}, {"input": "[10,20,30]", "expected": "30"}]',
      '["Think about iterating through the array", "Keep track of the maximum value seen so far"]',
      true, 95, 234, 2,
      'function findMax(arr) { return Math.max(...arr); }'
    ),
    (
      '20000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000006',
      'strings', 'medium',
      'Reverse words in a string.',
      '[{"input": "\"hello world\"", "expected": "\"world hello\""}, {"input": "\"a good   example\"", "expected": "\"example good a\""}]',
      '["Split the string by spaces", "Reverse the array of words", "Join them back together"]',
      true, 87, 456, 3,
      'function reverseWords(s) { return s.trim().split(/\\s+/).reverse().join(" "); }'
    );

    -- Refresh the leaderboards materialized view
    REFRESH MATERIALIZED VIEW leaderboards;

  END IF;
END $$;