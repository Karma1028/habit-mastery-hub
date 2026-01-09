import { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Moon, 
  Smile, 
  BarChart3,
  Target,
  Activity
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { useHabits } from '@/hooks/useHabits';
import { StreakAchievements } from './StreakAchievements';

export function AnalyticsView() {
  const { habits, completionsMap, metricsMap, isHabitCompleted, streak } = useHabits();

  // Get last 30 days data
  const last30Days = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      days.push(date);
    }
    return days;
  }, []);

  // Daily completion rate over 30 days
  const dailyCompletionData = useMemo(() => {
    return last30Days.map(date => {
      const dateKey = date.toISOString().split('T')[0];
      const completed = habits.filter(h => completionsMap[h.id]?.has(dateKey)).length;
      const rate = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
      const metric = metricsMap[dateKey];
      
      return {
        date: dateKey,
        day: date.getDate(),
        weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rate,
        completed,
        mood: metric?.mood || null,
        sleep: metric?.sleep_hours || null
      };
    });
  }, [last30Days, habits, completionsMap, metricsMap]);

  // Weekly averages
  const weeklyData = useMemo(() => {
    const weeks: any[] = [];
    for (let w = 0; w < 4; w++) {
      const weekDays = dailyCompletionData.slice(w * 7, (w + 1) * 7 + (w === 3 ? 2 : 0));
      const avgRate = weekDays.length > 0 
        ? Math.round(weekDays.reduce((acc, d) => acc + d.rate, 0) / weekDays.length)
        : 0;
      const avgMood = weekDays.filter(d => d.mood).length > 0
        ? (weekDays.reduce((acc, d) => acc + (d.mood || 0), 0) / weekDays.filter(d => d.mood).length).toFixed(1)
        : null;
      const avgSleep = weekDays.filter(d => d.sleep).length > 0
        ? (weekDays.reduce((acc, d) => acc + (d.sleep || 0), 0) / weekDays.filter(d => d.sleep).length).toFixed(1)
        : null;
      weeks.push({
        week: `Week ${w + 1}`,
        rate: avgRate,
        mood: avgMood ? parseFloat(avgMood) : 0,
        sleep: avgSleep ? parseFloat(avgSleep) : 0
      });
    }
    return weeks;
  }, [dailyCompletionData]);

  // Habit performance breakdown
  const habitPerformance = useMemo(() => {
    return habits.map(habit => {
      let completed = 0;
      last30Days.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        if (completionsMap[habit.id]?.has(dateKey)) completed++;
      });
      return {
        name: habit.name.length > 12 ? habit.name.slice(0, 12) + '...' : habit.name,
        fullName: habit.name,
        completed,
        rate: Math.round((completed / 30) * 100)
      };
    });
  }, [habits, last30Days, completionsMap]);

  // Day of week analysis
  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStats = days.map(day => ({ name: day, completions: 0, total: 0 }));
    
    last30Days.forEach(date => {
      const dayIndex = date.getDay();
      const dateKey = date.toISOString().split('T')[0];
      dayStats[dayIndex].total += habits.length;
      habits.forEach(h => {
        if (completionsMap[h.id]?.has(dateKey)) {
          dayStats[dayIndex].completions++;
        }
      });
    });

    return dayStats.map(d => ({
      day: d.name,
      rate: d.total > 0 ? Math.round((d.completions / d.total) * 100) : 0
    }));
  }, [last30Days, habits, completionsMap]);

  // Calculate trends
  const trends = useMemo(() => {
    const thisWeek = dailyCompletionData.slice(-7);
    const lastWeek = dailyCompletionData.slice(-14, -7);
    
    const thisWeekAvg = thisWeek.reduce((acc, d) => acc + d.rate, 0) / 7;
    const lastWeekAvg = lastWeek.reduce((acc, d) => acc + d.rate, 0) / 7;
    const rateTrend = thisWeekAvg - lastWeekAvg;

    const thisWeekMoods = thisWeek.filter(d => d.mood);
    const lastWeekMoods = lastWeek.filter(d => d.mood);
    const thisWeekMoodAvg = thisWeekMoods.length > 0 
      ? thisWeekMoods.reduce((acc, d) => acc + (d.mood || 0), 0) / thisWeekMoods.length 
      : 0;
    const lastWeekMoodAvg = lastWeekMoods.length > 0
      ? lastWeekMoods.reduce((acc, d) => acc + (d.mood || 0), 0) / lastWeekMoods.length
      : 0;
    const moodTrend = thisWeekMoodAvg - lastWeekMoodAvg;

    return { rateTrend, moodTrend, thisWeekAvg: Math.round(thisWeekAvg) };
  }, [dailyCompletionData]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground font-medium">Deep dive into your habits</p>
          </div>
        </div>

        {/* Trend Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-primary" />
              <span className="text-xs font-bold text-muted-foreground uppercase">Weekly Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">{trends.thisWeekAvg}%</span>
              <span className={`text-xs font-medium flex items-center gap-0.5 ${
                trends.rateTrend >= 0 ? 'text-primary' : 'text-destructive'
              }`}>
                {trends.rateTrend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(trends.rateTrend).toFixed(0)}%
              </span>
            </div>
          </div>
          
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Smile size={16} className="text-info" />
              <span className="text-xs font-bold text-muted-foreground uppercase">Mood Trend</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium flex items-center gap-0.5 ${
                trends.moodTrend >= 0 ? 'text-primary' : 'text-destructive'
              }`}>
                {trends.moodTrend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {trends.moodTrend >= 0 ? 'Improving' : 'Declining'}
              </span>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-warning" />
              <span className="text-xs font-bold text-muted-foreground uppercase">Current Streak</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{streak.current} days</span>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-destructive" />
              <span className="text-xs font-bold text-muted-foreground uppercase">Best Streak</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{streak.best} days</span>
          </div>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 30-Day Trend */}
          <div className="bg-card rounded-2xl shadow-card border border-border p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" />
              30-Day Completion Trend
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyCompletionData}>
                  <defs>
                    <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    ticks={[0, 50, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`${value}%`, 'Completion']}
                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorCompletions)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Day of Week Performance */}
          <div className="bg-card rounded-2xl shadow-card border border-border p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-info" />
              Best Days to Complete Habits
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`${value}%`, 'Avg Completion']}
                  />
                  <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Habit Radar Chart */}
          {habits.length > 0 && habits.length <= 8 && (
            <div className="bg-card rounded-2xl shadow-card border border-border p-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Target size={18} className="text-warning" />
                Habit Strength Radar
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={habitPerformance}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="name" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                    />
                    <Radar
                      name="Completion Rate"
                      dataKey="rate"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: any, name: any, props: any) => [
                        `${value}% (${props.payload.completed}/30 days)`,
                        props.payload.fullName
                      ]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Weekly Comparison */}
          <div className="bg-card rounded-2xl shadow-card border border-border p-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              Weekly Progress
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 5 }}
                    name="Completion %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        <div className="bg-card rounded-2xl shadow-card border border-border p-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <h3 className="font-bold text-foreground mb-4 text-lg">🏆 Achievements</h3>
          <StreakAchievements />
        </div>
      </div>
    </div>
  );
}
