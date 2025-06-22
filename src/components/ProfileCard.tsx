import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Mail, Calendar, Trophy, Target, TrendingUp, Settings, Link as LinkIcon } from 'lucide-react';
import AnimatedButton from './AnimatedButton';
import RatingDisplay from './RatingDisplay';
import { Profile as UserProfile } from '../lib/supabaseClient';
import { getRatingTier } from '../lib/elo';

interface ProfileCardProps {
  profile: UserProfile;
  isOwnProfile?: boolean;
  onEdit?: () => void;
  onSyncGitHub?: () => void;
  className?: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  isOwnProfile = false,
  onEdit,
  onSyncGitHub,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const tier = getRatingTier(profile.rating);
  const winRate = profile.wins + profile.losses > 0 
    ? ((profile.wins / (profile.wins + profile.losses)) * 100).toFixed(1)
    : '0.0';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <motion.div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header with gradient background */}
      <div className="relative h-24 bg-gradient-to-r from-blue-500 to-purple-600">
        <div className="absolute inset-0 bg-black/20" />
        {isOwnProfile && (
          <div className="absolute top-4 right-4">
            <AnimatedButton
              onClick={onEdit}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Settings className="h-4 w-4 mr-1" />
              Edit
            </AnimatedButton>
          </div>
        )}
      </div>

      {/* Profile Content */}
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="flex items-start justify-between -mt-12 mb-4">
          <div className="relative">
            <motion.div
              className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 overflow-hidden"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {profile.avatar_url && !imageError ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-500 dark:text-gray-400">
                  {profile.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </motion.div>
            
            {/* Tier badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
              <span className="text-lg">{tier.icon}</span>
            </div>
          </div>

          {/* Rating Display */}
          <div className="text-right mt-4">
            <RatingDisplay rating={profile.rating} size="lg" />
          </div>
        </div>

        {/* Name and Username */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {profile.display_name}
          </h2>
          {profile.github_username && (
            <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
              <Github className="h-4 w-4 mr-1" />
              <span>@{profile.github_username}</span>
              {isOwnProfile && (
                <button
                  onClick={onSyncGitHub}
                  className="ml-2 text-blue-500 hover:text-blue-600 transition-colors"
                  title="Sync with GitHub"
                >
                  <LinkIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          {profile.email && isOwnProfile && (
            <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mt-1">
              <Mail className="h-4 w-4 mr-1" />
              <span>{profile.email}</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <motion.div
            className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-center mb-1">
              <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {profile.wins}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Wins</p>
          </motion.div>

          <motion.div
            className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-center mb-1">
              <Target className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {profile.losses}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Losses</p>
          </motion.div>

          <motion.div
            className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {winRate}%
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Win Rate</p>
          </motion.div>
        </div>

        {/* Member Since */}
        <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
          <Calendar className="h-4 w-4 mr-1" />
          <span>Member since {formatDate(profile.created_at)}</span>
        </div>

        {/* GitHub Sync Prompt */}
        {isOwnProfile && !profile.github_username && (
          <motion.div
            className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Connect GitHub
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Sync your profile and showcase your coding journey
                </p>
              </div>
              <AnimatedButton
                onClick={onSyncGitHub}
                variant="primary"
                size="sm"
              >
                <Github className="h-4 w-4 mr-1" />
                Connect
              </AnimatedButton>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ProfileCard;