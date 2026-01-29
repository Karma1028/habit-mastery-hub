import { useMemo } from 'react';
import { useHabits } from '@/hooks/useHabits';
import { useGamification } from '@/hooks/useGamification';
import { ActiveQuests } from '../rpg/ActiveQuests';
import { HeroProfile } from '../rpg/HeroProfile';

export function TodayView() {
  const { habits, isHabitCompleted } = useHabits();
  const { stats } = useGamification();

  const today = new Date();

  // Calculate specific today stats if needed, but ActiveQuests handles list
  // HeroProfile handles top summary

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-background/50">
      <div className="max-w-2xl mx-auto space-y-8 pb-20">

        {/* Hero Banner (Compressed version of Profile) */}
        <div className="animate-fade-in">
          <HeroProfile stats={stats} />
        </div>

        {/* Quest Board */}
        <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border p-6 shadow-xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <ActiveQuests />
        </div>

      </div>
    </div>
  );
}
