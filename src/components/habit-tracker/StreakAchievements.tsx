import { useMemo } from 'react';
import { 
  Flame, 
  Trophy, 
  Star, 
  Zap, 
  Crown, 
  Target, 
  Sparkles,
  Medal,
  Award,
  Rocket
} from 'lucide-react';
import { useHabits } from '@/hooks/useHabits';
import { motion } from 'framer-motion';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  requirement: number;
  type: 'streak' | 'total' | 'perfect';
  color: string;
  bgColor: string;
}

const ACHIEVEMENTS: Achievement[] = [
  // Streak achievements
  { id: 'streak_3', name: 'Getting Started', description: '3 day streak', icon: Flame, requirement: 3, type: 'streak', color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  { id: 'streak_7', name: 'Week Warrior', description: '7 day streak', icon: Zap, requirement: 7, type: 'streak', color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { id: 'streak_14', name: 'Two Week Titan', description: '14 day streak', icon: Star, requirement: 14, type: 'streak', color: 'text-amber-500', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  { id: 'streak_30', name: 'Monthly Master', description: '30 day streak', icon: Trophy, requirement: 30, type: 'streak', color: 'text-primary', bgColor: 'bg-secondary' },
  { id: 'streak_60', name: 'Diamond Streak', description: '60 day streak', icon: Crown, requirement: 60, type: 'streak', color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'streak_100', name: 'Century Club', description: '100 day streak', icon: Sparkles, requirement: 100, type: 'streak', color: 'text-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  
  // Total completions
  { id: 'total_10', name: 'First Steps', description: '10 total completions', icon: Target, requirement: 10, type: 'total', color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  { id: 'total_50', name: 'Committed', description: '50 total completions', icon: Medal, requirement: 50, type: 'total', color: 'text-teal-500', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
  { id: 'total_100', name: 'Habit Hero', description: '100 total completions', icon: Award, requirement: 100, type: 'total', color: 'text-indigo-500', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  { id: 'total_500', name: 'Legend', description: '500 total completions', icon: Rocket, requirement: 500, type: 'total', color: 'text-rose-500', bgColor: 'bg-rose-100 dark:bg-rose-900/30' },
];

export function StreakAchievements() {
  const { streak, completionsMap, habits } = useHabits();
  
  const totalCompletions = useMemo(() => {
    let count = 0;
    Object.values(completionsMap).forEach(set => {
      count += set.size;
    });
    return count;
  }, [completionsMap]);

  const unlockedAchievements = useMemo(() => {
    return ACHIEVEMENTS.filter(achievement => {
      if (achievement.type === 'streak') {
        return streak.best >= achievement.requirement;
      } else if (achievement.type === 'total') {
        return totalCompletions >= achievement.requirement;
      }
      return false;
    });
  }, [streak.best, totalCompletions]);

  const lockedAchievements = useMemo(() => {
    return ACHIEVEMENTS.filter(achievement => {
      if (achievement.type === 'streak') {
        return streak.best < achievement.requirement;
      } else if (achievement.type === 'total') {
        return totalCompletions < achievement.requirement;
      }
      return true;
    });
  }, [streak.best, totalCompletions]);

  const getProgress = (achievement: Achievement) => {
    if (achievement.type === 'streak') {
      return Math.min(100, (streak.best / achievement.requirement) * 100);
    } else if (achievement.type === 'total') {
      return Math.min(100, (totalCompletions / achievement.requirement) * 100);
    }
    return 0;
  };

  const getCurrentValue = (achievement: Achievement) => {
    if (achievement.type === 'streak') return streak.best;
    if (achievement.type === 'total') return totalCompletions;
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-primary">{streak.current}</div>
          <div className="text-xs text-muted-foreground font-medium">Current Streak</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-warning">{streak.best}</div>
          <div className="text-xs text-muted-foreground font-medium">Best Streak</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-info">{totalCompletions}</div>
          <div className="text-xs text-muted-foreground font-medium">Total Done</div>
        </div>
      </div>

      {/* Unlocked Achievements */}
      {unlockedAchievements.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-primary" />
            Unlocked ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {unlockedAchievements.map((achievement, index) => {
              const Icon = achievement.icon;
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`${achievement.bgColor} rounded-xl p-4 border border-border relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-10 transform translate-x-4 -translate-y-4">
                    <Icon size={64} />
                  </div>
                  <Icon size={24} className={achievement.color} />
                  <h4 className="font-bold text-sm text-foreground mt-2">{achievement.name}</h4>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {lockedAchievements.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-muted-foreground mb-3">Next Goals</h3>
          <div className="space-y-2">
            {lockedAchievements.slice(0, 4).map(achievement => {
              const Icon = achievement.icon;
              const progress = getProgress(achievement);
              const current = getCurrentValue(achievement);
              return (
                <div
                  key={achievement.id}
                  className="bg-card rounded-xl p-4 border border-border flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon size={20} className="text-muted-foreground opacity-50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-muted-foreground truncate">{achievement.name}</h4>
                      <span className="text-xs text-muted-foreground">{current}/{achievement.requirement}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary/50 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
