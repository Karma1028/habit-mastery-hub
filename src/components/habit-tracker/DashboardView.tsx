import { useMemo } from 'react';
import { Flame, Target } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { useHabits } from '@/hooks/useHabits';
import { DailyProgressRing } from './DailyProgressRing';

interface DashboardViewProps {
  currentDate: Date;
}

const getMonthDates = (year: number, month: number) => {
  const dates: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(new Date(year, month, d));
  }
  return dates;
};

export function DashboardView({ currentDate }: DashboardViewProps) {
  const { habits, isHabitCompleted } = useHabits();
  
  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthDates = useMemo(() => getMonthDates(year, month), [year, month]);

  const todayCompleted = useMemo(() => 
    habits.filter(h => isHabitCompleted(h.id, today)).length, 
    [habits, isHabitCompleted, today]
  );
  
  const todayRate = habits.length === 0 ? 0 : Math.round((todayCompleted / habits.length) * 100);

  const dailyStats = useMemo(() => {
    return monthDates.map(date => {
      const completed = habits.filter(h => isHabitCompleted(h.id, date)).length;
      const total = habits.length;
      const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
      return {
        date: date.toISOString().split('T')[0],
        day: date.getDate(),
        fullDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Overview</h1>
            <p className="text-sm text-muted-foreground font-medium">Monthly progress report</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Today's Focus Ring */}
          <div className="bg-card rounded-2xl shadow-card border border-border p-6 flex flex-col items-center justify-between relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="w-full flex justify-between items-start z-10">
              <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Today's Focus</h3>
              <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs font-bold">
                {today.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
            </div>
            <DailyProgressRing percentage={todayRate} />
            <div className="w-full grid grid-cols-2 gap-3 z-10">
              <div className="bg-muted border border-border p-3 rounded-xl text-center">
                <span className="block text-lg font-bold text-foreground">{todayCompleted}</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Done</span>
              </div>
              <div className="bg-muted border border-border p-3 rounded-xl text-center">
                <span className="block text-lg font-bold text-foreground">{habits.length - todayCompleted}</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Left</span>
              </div>
            </div>
          </div>

          {/* Consistency Trend Chart */}
          <div className="md:col-span-2 bg-card rounded-2xl shadow-card border border-border p-6 flex flex-col animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-foreground font-bold text-lg">Consistency Trend</h3>
                <p className="text-xs text-muted-foreground font-medium">Daily completion rate vs Goal</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-primary bg-secondary px-3 py-1.5 rounded-full border border-primary/20">
                <Flame size={14} className="fill-primary" />
                Active Streak
              </div>
            </div>
            <div className="flex-1 min-h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyStats} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }} 
                    interval={4} 
                    dy={10} 
                  />
                  <YAxis 
                    hide={false} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} 
                    domain={[0, 100]} 
                    ticks={[0, 50, 100]} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', 
                      fontWeight: 'bold',
                      backgroundColor: 'hsl(var(--card))'
                    }} 
                    itemStyle={{ color: 'hsl(var(--primary))' }} 
                  />
                  <ReferenceLine 
                    y={80} 
                    stroke="hsl(var(--destructive))" 
                    strokeDasharray="3 3" 
                    strokeWidth={2} 
                    label={{ 
                      position: 'top', 
                      value: 'Goal (80%)', 
                      fill: 'hsl(var(--destructive))', 
                      fontSize: 10, 
                      fontWeight: 700 
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorRate)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Habit Performance */}
        <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-muted/30">
            <h3 className="font-bold text-foreground text-lg">Habit Performance</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
              <Target size={14} /> Monthly Goal
            </div>
          </div>
          <div className="divide-y divide-border">
            {habits.map(habit => {
              const stats = getHabitStats(habit.id);
              const isHigh = stats.percentage >= 80;
              const isMed = stats.percentage >= 50 && stats.percentage < 80;
              return (
                <div key={habit.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/50 transition-colors gap-3">
                  <div className="flex items-center gap-4 min-w-[150px]">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      isHigh 
                        ? 'bg-secondary text-primary' 
                        : isMed 
                          ? 'bg-warning/10 text-warning' 
                          : 'bg-destructive/10 text-destructive'
                    }`}>
                      {stats.percentage}%
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">{habit.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Score</p>
                    </div>
                  </div>
                  <div className="flex-1 max-w-md flex items-center gap-3">
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          isHigh ? 'bg-primary' : isMed ? 'bg-warning' : 'bg-destructive'
                        }`} 
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
