import { useMemo } from 'react';
import { Check, Flame, CalendarCheck, Smile, Moon, Minus, Plus, Angry, Frown, Meh, Laugh, LucideIcon } from 'lucide-react';
import { useHabits } from '@/hooks/useHabits';

const MOODS: Record<number, { icon: LucideIcon; colorClass: string; label: string }> = {
  1: { icon: Angry, colorClass: 'text-mood-angry', label: 'Angry' },
  2: { icon: Frown, colorClass: 'text-mood-bad', label: 'Bad' },
  3: { icon: Meh, colorClass: 'text-mood-okay', label: 'Okay' },
  4: { icon: Smile, colorClass: 'text-mood-good', label: 'Good' },
  5: { icon: Laugh, colorClass: 'text-mood-great', label: 'Great' }
};

export function TodayView() {
  const { habits, toggleHabit, updateMetric, isHabitCompleted, getMetric } = useHabits();
  
  const today = useMemo(() => new Date(), []);
  const todayKey = today.toISOString().split('T')[0];
  
  const todayCompleted = useMemo(() => 
    habits.filter(h => isHabitCompleted(h.id, today)).length, 
    [habits, isHabitCompleted, today]
  );
  
  const todayRate = habits.length === 0 ? 0 : Math.round((todayCompleted / habits.length) * 100);
  
  const currentMetric = getMetric(today);
  const currentMood = currentMetric?.mood || 0;
  const currentSleep = currentMetric?.sleep_hours || 0;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        
        {/* Header Card */}
        <div className="bg-card p-6 rounded-2xl shadow-card border border-border animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Today's Focus</h1>
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 mt-1">
                <CalendarCheck size={14} />
                {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{todayRate}%</div>
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Complete</div>
            </div>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-700 ease-out rounded-full" 
              style={{ width: `${todayRate}%` }}
            />
          </div>
        </div>

        {/* Wellness Check Card */}
        <div className="bg-card p-6 rounded-2xl shadow-card border border-border animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Smile size={20} className="text-info" /> Wellness Check
          </h2>

          <div className="space-y-6">
            {/* Mood Selector */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Overall Mood</p>
              <div className="flex justify-between items-center bg-muted p-2 rounded-xl border border-border">
                {[1, 2, 3, 4, 5].map(m => {
                  const MIcon = MOODS[m].icon;
                  const isSelected = currentMood === m;
                  return (
                    <button
                      key={m}
                      onClick={() => updateMetric(today, 'mood', m)}
                      className={`p-2 rounded-lg transition-all transform duration-200 flex flex-col items-center gap-1 ${
                        isSelected 
                          ? 'bg-card shadow-md scale-110 ring-2 ring-primary/20' 
                          : 'hover:bg-card/50 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <MIcon size={28} className={isSelected ? MOODS[m].colorClass : 'text-muted-foreground'} />
                      {isSelected && <span className="text-[9px] font-bold text-muted-foreground">{MOODS[m].label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sleep Input */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Hours Slept</p>
              <div className="flex items-center gap-4 bg-muted p-3 rounded-xl border border-border max-w-[200px]">
                <button 
                  onClick={() => updateMetric(today, 'sleep', Math.max(0, currentSleep - 1))} 
                  className="p-1 bg-card rounded-md shadow-sm hover:bg-accent text-muted-foreground"
                >
                  <Minus size={18} />
                </button>
                <div className="flex-1 text-center flex items-center justify-center gap-1">
                  <Moon size={16} className="text-info" />
                  <span className="text-xl font-bold text-foreground">{currentSleep}</span>
                  <span className="text-xs text-muted-foreground font-medium">hrs</span>
                </div>
                <button 
                  onClick={() => updateMetric(today, 'sleep', currentSleep + 1)} 
                  className="p-1 bg-card rounded-md shadow-sm hover:bg-accent text-muted-foreground"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Habit List */}
        <div className="space-y-3">
          {habits.map((habit, index) => {
            const isDone = isHabitCompleted(habit.id, today);
            return (
              <div
                key={habit.id}
                onClick={() => toggleHabit(habit.id, today)}
                className={`relative overflow-hidden group p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between shadow-sm select-none animate-fade-in ${
                  isDone 
                    ? 'bg-primary border-primary transform scale-[1.01]' 
                    : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
                }`}
                style={{ animationDelay: `${0.2 + index * 0.05}s` }}
              >
                <div className="flex items-center gap-4 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                    isDone 
                      ? 'bg-primary-foreground border-primary-foreground text-primary' 
                      : 'bg-transparent border-border text-transparent group-hover:border-primary/50'
                  }`}>
                    <Check size={16} strokeWidth={4} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold transition-colors duration-300 ${
                      isDone ? 'text-primary-foreground' : 'text-foreground'
                    }`}>{habit.name}</h3>
                    {isDone && <p className="text-xs text-primary-foreground/70 font-medium">Completed!</p>}
                  </div>
                </div>
                {isDone && (
                  <Flame className="text-primary-foreground/30 absolute right-4 bottom-[-10px] w-24 h-24 transform rotate-12" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
