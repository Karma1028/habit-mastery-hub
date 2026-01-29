import { useMemo, useState } from 'react';
import { useHabits } from '@/hooks/useHabits';
import { useGamification } from '@/hooks/useGamification';
import { DailyProgressRing } from './DailyProgressRing';
import { HeroProfile } from '../rpg/HeroProfile';
import { SkillHexagon } from '../rpg/SkillHexagon';
import { ActiveQuests } from '../rpg/ActiveQuests';
import { AIContentWidget } from '../rpg/AIContentWidget';
import { CharacterCreationWizard } from '../rpg/CharacterCreationWizard';
import { Smile, Moon, Minus, Plus, Angry, Frown, Meh, Laugh, LucideIcon, Lock, Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardViewProps {
  currentDate: Date;
}

const MOODS: Record<number, { icon: LucideIcon; colorClass: string; label: string }> = {
  1: { icon: Angry, colorClass: 'text-mood-angry', label: 'Angry' },
  2: { icon: Frown, colorClass: 'text-mood-bad', label: 'Bad' },
  3: { icon: Meh, colorClass: 'text-mood-okay', label: 'Okay' },
  4: { icon: Smile, colorClass: 'text-mood-good', label: 'Good' },
  5: { icon: Laugh, colorClass: 'text-mood-great', label: 'Great' }
};

export function DashboardView({ currentDate }: DashboardViewProps) {


  const { habits, isHabitCompleted, updateMetric, getMetric } = useHabits();
  const { stats } = useGamification();

  const [showWizard, setShowWizard] = useState(false);

  const today = new Date();

  // Create memoized calculations to avoid re-renders
  const todayCompleted = useMemo(() =>
    habits.filter(h => isHabitCompleted(h.id, today)).length,
    [habits, isHabitCompleted, today]
  );

  const todayRate = habits.length === 0 ? 0 : Math.round((todayCompleted / habits.length) * 100);

  const currentMetric = getMetric(today);
  const currentMood = currentMetric?.mood || 0;
  const currentSleep = currentMetric?.sleep_hours || 0;

  // Trigger wizard if user has no habits (New User) or manually requested
  const shouldShowWizard = habits.length === 0 || showWizard;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-background/50">

      {/* Onboarding Wizard */}
      {shouldShowWizard && (
        <CharacterCreationWizard onComplete={() => {
          setShowWizard(false);
        }} />
      )}

      <div className="max-w-7xl mx-auto pb-20 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN (65%) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Top Row: Focus & Wellness */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Today's Focus */}
            <div className="bg-card rounded-2xl shadow-card border border-border p-6 flex flex-col items-center justify-between relative overflow-hidden">
              <div className="w-full flex justify-between items-start z-10 mb-2">
                <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Today's Focus</h3>
                <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs font-bold">
                  {today.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <DailyProgressRing percentage={todayRate} />
              </div>
              <div className="mt-4 text-center">
                <p className="text-2xl font-black text-foreground">{todayRate}%</p>
                <p className="text-xs text-muted-foreground font-bold uppercase">Daily Goal</p>
              </div>
            </div>

            {/* Wellness Check (Relocated) */}
            <div className="bg-card rounded-2xl shadow-card border border-border p-6 flex flex-col justify-between">
              <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-4">Wellness Check</h3>

              {/* Mood */}
              <div className="mb-6">
                <div className="flex justify-between items-center bg-muted/50 p-2 rounded-xl">
                  {[1, 2, 3, 4, 5].map(m => {
                    const MIcon = MOODS[m].icon;
                    const isSelected = currentMood === m;
                    return (
                      <button
                        key={m}
                        onClick={() => updateMetric(today, 'mood', m)}
                        className={`transition-all transform duration-200 ${isSelected ? 'scale-125 text-primary' : 'text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100'
                          }`}
                      >
                        <MIcon size={24} className={isSelected ? MOODS[m].colorClass : ''} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sleep */}
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-xl">
                <span className="text-xs font-bold flex items-center gap-2"><Moon size={14} /> Sleep</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateMetric(today, 'sleep', Math.max(0, currentSleep - 1))} className="hover:bg-background p-1 rounded"><Minus size={14} /></button>
                  <span className="font-bold text-lg w-6 text-center">{currentSleep}</span>
                  <button onClick={() => updateMetric(today, 'sleep', currentSleep + 1)} className="hover:bg-background p-1 rounded"><Plus size={14} /></button>
                </div>
              </div>
            </div>
          </div>


          {/* AI Content Widget */}
          <AIContentWidget />

          {/* Active Quests */}
          <div className="bg-card/50 rounded-2xl border border-border p-6 backdrop-blur-sm min-h-[400px]">
            <ActiveQuests />
          </div>

        </div>

        {/* RIGHT COLUMN (35%) - The HUD */}
        <div className="lg:col-span-4 space-y-6">

          {/* Actions Row */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowWizard(true)} className="gap-2 border-primary/20 hover:bg-primary/10 hover:text-primary">
              <Sparkles size={14} /> Recalibrate Plan
            </Button>
          </div>

          {/* Hero Profile */}
          <HeroProfile stats={stats} />

          {/* Skill Hexagon */}
          <SkillHexagon stats={stats} />

          {/* Rewards Shop (Mini) */}
          <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-2xl border border-indigo-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Gift size={18} className="text-purple-500" /> Rewards
              </h3>
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded font-bold">Lvl 5 Unlock</span>
            </div>

            <div className="space-y-3">
              <div className="bg-background/40 p-3 rounded-xl flex items-center gap-3 opacity-50">
                <div className="p-2 bg-muted rounded-lg"><Lock size={16} /></div>
                <div>
                  <p className="text-sm font-bold">Dark Mode+</p>
                  <p className="text-[10px] text-muted-foreground">Unlock 'Midnight' Theme</p>
                </div>
              </div>
              <div className="bg-background/40 p-3 rounded-xl flex items-center gap-3 opacity-50">
                <div className="p-2 bg-muted rounded-lg"><Lock size={16} /></div>
                <div>
                  <p className="text-sm font-bold">New Avatar</p>
                  <p className="text-[10px] text-muted-foreground">Unlock 'Warrior' Badge</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" className="w-full mt-4 text-xs h-8">View All Rewards</Button>
          </div>

        </div>

      </div>
    </div>
  );
}
