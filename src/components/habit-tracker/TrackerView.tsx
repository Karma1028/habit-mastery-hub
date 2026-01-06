import { useMemo } from 'react';
import { Check, Plus, Trash2, Smile, Moon, Angry, Frown, Meh, Laugh, LucideIcon } from 'lucide-react';
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useHabits } from '@/hooks/useHabits';

interface TrackerViewProps {
  currentDate: Date;
}

const MOODS: Record<number, { icon: LucideIcon; colorClass: string }> = {
  1: { icon: Angry, colorClass: 'text-mood-angry' },
  2: { icon: Frown, colorClass: 'text-mood-bad' },
  3: { icon: Meh, colorClass: 'text-mood-okay' },
  4: { icon: Smile, colorClass: 'text-mood-good' },
  5: { icon: Laugh, colorClass: 'text-mood-great' }
};

const getMonthDates = (year: number, month: number) => {
  const dates: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(new Date(year, month, d));
  }
  return dates;
};

export function TrackerView({ currentDate }: TrackerViewProps) {
  const { habits, toggleHabit, addHabit, deleteHabit, isHabitCompleted, getMetric } = useHabits();
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthDates = useMemo(() => getMonthDates(year, month), [year, month]);
  const today = new Date();

  const dailyStats = useMemo(() => {
    return monthDates.map(date => {
      const completed = habits.filter(h => isHabitCompleted(h.id, date)).length;
      const total = habits.length;
      const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
      return {
        date: date.toISOString().split('T')[0],
        day: date.getDate(),
        completed,
        notDone: total - completed,
        rate
      };
    });
  }, [habits, monthDates, isHabitCompleted]);

  const getHabitStats = (habitId: string) => {
    let count = 0;
    monthDates.forEach(d => {
      if (isHabitCompleted(habitId, d)) count++;
    });
    const totalDays = monthDates.length;
    return {
      actual: totalDays,
      done: count,
      percentage: totalDays === 0 ? 0 : Math.round((count / totalDays) * 100)
    };
  };

  const getMetricStats = (type: 'mood' | 'sleep') => {
    if (type === 'mood') {
      let loggedDays = 0;
      monthDates.forEach(d => {
        if (getMetric(d)?.mood) loggedDays++;
      });
      return { label: 'Logged', value: loggedDays };
    }
    if (type === 'sleep') {
      let totalSleep = 0;
      let loggedDays = 0;
      monthDates.forEach(d => {
        const val = getMetric(d)?.sleep_hours;
        if (val) {
          totalSleep += Number(val);
          loggedDays++;
        }
      });
      const avg = loggedDays > 0 ? (totalSleep / loggedDays).toFixed(1) : 0;
      return { label: 'Avg Hrs', value: avg };
    }
    return { label: '-', value: 0 };
  };

  const handleAddHabit = () => {
    const name = prompt('Enter new habit name:');
    if (name) addHabit(name);
  };

  const handleDeleteHabit = (id: string) => {
    if (confirm('Delete this habit row?')) {
      deleteHabit(id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Toolbar */}
      <div className="border-b border-border px-4 py-2 flex items-center gap-2 bg-muted/30">
        <button 
          onClick={handleAddHabit} 
          className="flex items-center gap-1.5 text-xs font-bold bg-card border border-border px-3 py-1.5 rounded-lg hover:bg-secondary hover:border-primary/30 hover:text-primary text-muted-foreground shadow-sm transition-all"
        >
          <Plus size={14} /> New Habit
        </button>
        <div className="h-4 w-[1px] bg-border mx-2" />
        <span className="text-xs text-muted-foreground font-medium italic">Tap cells to mark as complete</span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="inline-block min-w-full align-middle relative">
          {/* Header */}
          <div className="flex sticky top-0 z-10 bg-card shadow-sm border-b border-border">
            <div className="sticky left-0 w-32 md:w-64 bg-muted border-r border-border p-3 font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
              Habit
            </div>
            {monthDates.map(date => {
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div 
                  key={date.toString()} 
                  className={`flex-shrink-0 w-11 text-center border-r border-border py-2 flex flex-col justify-center ${isToday ? 'bg-secondary' : ''}`}
                >
                  <span className="text-[9px] text-muted-foreground font-bold uppercase">
                    {date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                  </span>
                  <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {date.getDate()}
                  </span>
                </div>
              );
            })}
            <div className="flex-shrink-0 w-16 p-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-center border-r border-border flex items-center justify-center bg-muted">Actual</div>
            <div className="flex-shrink-0 w-16 p-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-center border-r border-border flex items-center justify-center bg-muted">Done</div>
            <div className="flex-shrink-0 w-24 p-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-center border-r border-border flex items-center justify-center bg-muted">Progress</div>
          </div>

          {/* Habit Rows */}
          {habits.map(habit => {
            const stats = getHabitStats(habit.id);
            return (
              <div key={habit.id} className="flex border-b border-border hover:bg-muted/30 group">
                <div className="sticky left-0 w-32 md:w-64 bg-card group-hover:bg-muted/30 border-r border-border p-3 flex items-center justify-between shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] z-0">
                  <span className="text-sm font-semibold text-foreground truncate">{habit.name}</span>
                  <button 
                    onClick={() => handleDeleteHabit(habit.id)} 
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {monthDates.map(date => {
                  const dateKey = date.toISOString().split('T')[0];
                  const isChecked = isHabitCompleted(habit.id, date);
                  return (
                    <div 
                      key={dateKey} 
                      onClick={() => toggleHabit(habit.id, date)} 
                      className={`flex-shrink-0 w-11 border-r border-border cursor-pointer flex items-center justify-center transition-all duration-200 ${
                        isChecked ? 'bg-primary' : 'hover:bg-muted'
                      }`}
                    >
                      {isChecked && <Check size={18} className="text-primary-foreground drop-shadow-sm" strokeWidth={3.5} />}
                    </div>
                  );
                })}
                <div className="flex-shrink-0 w-16 border-r border-border bg-muted/30 flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">{stats.actual}</span>
                </div>
                <div className="flex-shrink-0 w-16 border-r border-border bg-muted/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground">{stats.done}</span>
                </div>
                <div className="flex-shrink-0 w-24 border-r border-border bg-muted/30 flex items-center justify-center px-2">
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${stats.percentage}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground ml-1">{stats.percentage}%</span>
                </div>
              </div>
            );
          })}

          {/* Bio-Metrics Divider */}
          <div className="h-8 bg-muted border-t border-b border-border flex items-center px-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bio-Metrics</span>
          </div>

          {/* Mood Row */}
          <div className="flex border-b border-border bg-card group">
            <div className="sticky left-0 w-32 md:w-64 bg-card border-r border-border p-3 flex items-center gap-2 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] z-0">
              <div className="bg-info/10 p-1 rounded-md text-info"><Smile size={14} /></div>
              <span className="text-sm font-semibold text-foreground truncate">Mood</span>
            </div>
            {monthDates.map(date => {
              const dateKey = date.toISOString().split('T')[0];
              const moodVal = getMetric(date)?.mood;
              const MIcon = moodVal ? MOODS[moodVal].icon : null;
              return (
                <div key={dateKey} className="flex-shrink-0 w-11 border-r border-border flex items-center justify-center bg-muted/30">
                  {MIcon && <MIcon size={16} className={MOODS[moodVal!].colorClass} />}
                </div>
              );
            })}
            <div className="flex-shrink-0 w-16 border-r border-border bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground">Days</div>
            <div className="flex-shrink-0 w-16 border-r border-border bg-muted/30 flex items-center justify-center text-xs font-bold text-foreground">{getMetricStats('mood').value}</div>
            <div className="flex-shrink-0 w-24 border-r border-border bg-muted/30" />
          </div>

          {/* Sleep Row */}
          <div className="flex border-b border-border bg-card group">
            <div className="sticky left-0 w-32 md:w-64 bg-card border-r border-border p-3 flex items-center gap-2 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] z-0">
              <div className="bg-info/10 p-1 rounded-md text-info"><Moon size={14} /></div>
              <span className="text-sm font-semibold text-foreground truncate">Sleep Hours</span>
            </div>
            {monthDates.map(date => {
              const dateKey = date.toISOString().split('T')[0];
              const sleepVal = getMetric(date)?.sleep_hours;
              return (
                <div key={dateKey} className="flex-shrink-0 w-11 border-r border-border flex items-center justify-center bg-muted/30">
                  {sleepVal && Number(sleepVal) > 0 && <span className="text-xs font-bold text-info">{sleepVal}</span>}
                </div>
              );
            })}
            <div className="flex-shrink-0 w-16 border-r border-border bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground">Avg</div>
            <div className="flex-shrink-0 w-16 border-r border-border bg-muted/30 flex items-center justify-center text-xs font-bold text-foreground">{getMetricStats('sleep').value}</div>
            <div className="flex-shrink-0 w-24 border-r border-border bg-muted/30" />
          </div>

          {/* Stats Footer */}
          <div className="bg-muted border-t border-border sticky bottom-0 z-10 shadow-[0_-5px_10px_-5px_rgba(0,0,0,0.1)] mt-auto">
            <div className="flex border-b border-border">
              <div className="sticky left-0 w-32 md:w-64 bg-muted border-r border-border p-2 font-bold text-[10px] uppercase tracking-wider text-primary text-right shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">Done</div>
              {dailyStats.map(stat => (
                <div key={`done-${stat.date}`} className="flex-shrink-0 w-11 border-r border-border flex items-center justify-center bg-secondary/50">
                  <span className="text-[10px] font-bold text-primary">{stat.completed}</span>
                </div>
              ))}
              <div className="flex-shrink-0 w-[224px] border-r border-border bg-muted" />
            </div>
            <div className="flex border-b border-border">
              <div className="sticky left-0 w-32 md:w-64 bg-muted border-r border-border p-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-right shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">Not Done</div>
              {dailyStats.map(stat => (
                <div key={`notdone-${stat.date}`} className="flex-shrink-0 w-11 border-r border-border flex items-center justify-center">
                  <span className="text-[10px] font-medium text-muted-foreground">{stat.notDone}</span>
                </div>
              ))}
              <div className="flex-shrink-0 w-[224px] border-r border-border bg-muted" />
            </div>
            <div className="flex border-b border-border">
              <div className="sticky left-0 w-32 md:w-64 bg-muted border-r border-border p-2 font-bold text-[10px] uppercase tracking-wider text-foreground text-right shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">Percentage</div>
              {dailyStats.map(stat => (
                <div key={`pct-${stat.date}`} className="flex-shrink-0 w-11 border-r border-border flex items-center justify-center">
                  <span className="text-[10px] font-bold text-foreground">{stat.rate}%</span>
                </div>
              ))}
              <div className="flex-shrink-0 w-[224px] border-r border-border bg-muted" />
            </div>
            <div className="flex h-20 bg-card">
              <div className="sticky left-0 w-32 md:w-64 bg-card border-r border-border flex items-center justify-end p-3 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] z-20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Progress Trend</span>
              </div>
              <div style={{ width: `${monthDates.length * 44}px` }} className="flex-shrink-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyStats} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartColorTracker" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '4px', 
                        border: 'none', 
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)', 
                        padding: '4px 8px', 
                        fontSize: '12px' 
                      }} 
                      itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }} 
                      labelStyle={{ display: 'none' }} 
                      formatter={(value) => [`${value}%`]} 
                    />
                    <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#chartColorTracker)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-shrink-0 w-[224px] bg-muted border-l border-border" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
