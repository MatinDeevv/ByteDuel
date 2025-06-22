import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Github, Trophy, Target, Clock, Code } from 'lucide-react';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedCard from '../components/AnimatedCard';
import ProfileCard from '../components/ProfileCard';
import PageTransition from '../components/PageTransition';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import { Profile as UserProfile } from '../lib/supabaseClient';
import { supabase } from '../lib/supabaseClient';

interface MatchHistoryEntry {
  id: string;
  opponent_name: string;
  opponent_avatar?: string;
  result: 'win' | 'loss' | 'draw';
  rating_change: number;
  completion_time?: number;
  created_at: string;
  duel_prompt: string;
}

const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile, syncWithGitHub } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingGitHub, setSyncingGitHub] = useState(false);

  const isOwnProfile = !userId || userId === user?.id;
  const displayProfile = isOwnProfile ? currentUserProfile : profile;

  useEffect(() => {
    loadProfileData();
  }, [userId, user]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      // Load profile
      if (isOwnProfile && currentUserProfile) {
        setProfile(currentUserProfile);
      } else if (userId) {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);
      }

      // Load match history
      const targetUserId = isOwnProfile ? user?.id : userId;
      if (targetUserId) {
        const { data: historyData, error: historyError } = await supabase
          .from('match_history')
          .select(`
            *,
            opponent:opponent_id (
              display_name,
              avatar_url
            ),
            duel:duel_id (
              prompt
            )
          `)
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!historyError && historyData) {
          const formattedHistory: MatchHistoryEntry[] = historyData.map((entry: any) => ({
            id: entry.id,
            opponent_name: entry.opponent?.display_name || 'Unknown',
            opponent_avatar: entry.opponent?.avatar_url,
            result: entry.result,
            rating_change: entry.rating_change,
            completion_time: entry.completion_time,
            created_at: entry.created_at,
            duel_prompt: entry.duel?.prompt?.slice(0, 100) + '...' || 'Coding Challenge',
          }));
          setMatchHistory(formattedHistory);
        }
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGitHub = async () => {
    if (!isOwnProfile) return;
    
    setSyncingGitHub(true);
    try {
      const githubUsername = prompt('Enter your GitHub username:');
      if (githubUsername) {
        await syncWithGitHub(githubUsername);
        await loadProfileData(); // Reload to show updated data
      }
    } catch (error) {
      console.error('Failed to sync with GitHub:', error);
      alert('Failed to sync with GitHub. Please try again.');
    } finally {
      setSyncingGitHub(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-500';
      case 'loss': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win': return <Trophy className="h-4 w-4" />;
      case 'loss': return <Target className="h-4 w-4" />;
      default: return <Code className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <motion.div
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  if (!displayProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Profile Not Found
          </h1>
          <AnimatedButton onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </AnimatedButton>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <AnimatedButton
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </AnimatedButton>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {isOwnProfile ? 'My Profile' : `${displayProfile.display_name}'s Profile`}
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <ProfileCard
                profile={displayProfile}
                isOwnProfile={isOwnProfile}
                onSyncGitHub={handleSyncGitHub}
                className="sticky top-8"
              />
            </div>

            {/* Match History */}
            <div className="lg:col-span-2">
              <AnimatedCard>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    Match History
                  </h2>

                  {matchHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No matches played yet. Start competing to see your history!
                      </p>
                      {isOwnProfile && (
                        <AnimatedButton
                          onClick={() => navigate('/')}
                          className="mt-4"
                        >
                          Find a Match
                        </AnimatedButton>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {matchHistory.map((match, index) => (
                        <motion.div
                          key={match.id}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="flex items-center space-x-4">
                            {/* Result Icon */}
                            <div className={`p-2 rounded-full ${
                              match.result === 'win' ? 'bg-green-100 dark:bg-green-900/20' :
                              match.result === 'loss' ? 'bg-red-100 dark:bg-red-900/20' :
                              'bg-gray-100 dark:bg-gray-800'
                            }`}>
                              <div className={getResultColor(match.result)}>
                                {getResultIcon(match.result)}
                              </div>
                            </div>

                            {/* Opponent Info */}
                            <div className="flex items-center space-x-3">
                              {match.opponent_avatar ? (
                                <img
                                  src={match.opponent_avatar}
                                  alt={match.opponent_name}
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
                                  {match.opponent_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  vs {match.opponent_name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {match.duel_prompt}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            {/* Rating Change */}
                            <div className={`font-bold ${
                              match.rating_change > 0 ? 'text-green-500' :
                              match.rating_change < 0 ? 'text-red-500' :
                              'text-gray-500'
                            }`}>
                              {match.rating_change > 0 ? '+' : ''}{match.rating_change}
                            </div>
                            
                            {/* Completion Time */}
                            {match.completion_time && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTime(match.completion_time)}
                              </div>
                            )}
                            
                            {/* Date */}
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(match.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </AnimatedCard>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ProfilePage;