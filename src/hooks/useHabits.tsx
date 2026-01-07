import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Habit {
  id: string;
  name: string;
  goal: number;
  sort_order: number;
}

export interface HabitCompletion {
  habit_id: string;
  completion_date: string;
}

export interface DailyMetric {
  metric_date: string;
  mood: number | null;
  sleep_hours: number | null;
}

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      const [habitsRes, completionsRes, metricsRes] = await Promise.all([
        supabase.from('habits').select('id, name, goal, sort_order').order('sort_order'),
        supabase.from('habit_completions').select('habit_id, completion_date'),
        supabase.from('daily_metrics').select('metric_date, mood, sleep_hours')
      ]);

      if (habitsRes.data) setHabits(habitsRes.data);
      if (completionsRes.data) setCompletions(completionsRes.data);
      if (metricsRes.data) setMetrics(metricsRes.data);
      
      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Create a map of completions for quick lookup
  const completionsMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    completions.forEach(c => {
      if (!map[c.habit_id]) map[c.habit_id] = new Set();
      map[c.habit_id].add(c.completion_date);
    });
    return map;
  }, [completions]);

  // Create a map of metrics for quick lookup
  const metricsMap = useMemo(() => {
    const map: Record<string, DailyMetric> = {};
    metrics.forEach(m => {
      map[m.metric_date] = m;
    });
    return map;
  }, [metrics]);

  const toggleHabit = async (habitId: string, date: Date) => {
    if (!user) return;
    
    const dateKey = date.toISOString().split('T')[0];
    const isCompleted = completionsMap[habitId]?.has(dateKey);

    if (isCompleted) {
      // Delete completion
      await supabase
        .from('habit_completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('completion_date', dateKey);
      
      setCompletions(prev => prev.filter(c => !(c.habit_id === habitId && c.completion_date === dateKey)));
    } else {
      // Add completion
      const { data } = await supabase
        .from('habit_completions')
        .insert({ habit_id: habitId, user_id: user.id, completion_date: dateKey })
        .select()
        .single();
      
      if (data) {
        setCompletions(prev => [...prev, { habit_id: data.habit_id, completion_date: data.completion_date }]);
      }
    }
  };

  const addHabit = async (name: string) => {
    if (!user || !name.trim()) return;
    
    const maxOrder = Math.max(0, ...habits.map(h => h.sort_order));
    const { data } = await supabase
      .from('habits')
      .insert({ user_id: user.id, name: name.trim(), goal: 100, sort_order: maxOrder + 1 })
      .select()
      .single();
    
    if (data) {
      setHabits(prev => [...prev, { id: data.id, name: data.name, goal: data.goal, sort_order: data.sort_order }]);
    }
  };

  const deleteHabit = async (habitId: string) => {
    await supabase.from('habits').delete().eq('id', habitId);
    setHabits(prev => prev.filter(h => h.id !== habitId));
    setCompletions(prev => prev.filter(c => c.habit_id !== habitId));
  };

  const updateMetric = async (date: Date, type: 'mood' | 'sleep', value: number) => {
    if (!user) return;
    
    const dateKey = date.toISOString().split('T')[0];
    const existing = metricsMap[dateKey];

    const newData = {
      user_id: user.id,
      metric_date: dateKey,
      mood: type === 'mood' ? value : (existing?.mood ?? null),
      sleep_hours: type === 'sleep' ? value : (existing?.sleep_hours ?? null)
    };

    const { data } = await supabase
      .from('daily_metrics')
      .upsert(newData, { onConflict: 'user_id,metric_date' })
      .select()
      .single();
    
    if (data) {
      setMetrics(prev => {
        const filtered = prev.filter(m => m.metric_date !== dateKey);
        return [...filtered, { metric_date: data.metric_date, mood: data.mood, sleep_hours: data.sleep_hours }];
      });
    }
  };

  const isHabitCompleted = (habitId: string, date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return completionsMap[habitId]?.has(dateKey) ?? false;
  };

  const getMetric = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return metricsMap[dateKey];
  };

  // Calculate current streak (consecutive days with all habits done)
  const calculateStreak = useMemo(() => {
    if (habits.length === 0) return { current: 0, best: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    // Check up to 365 days back
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateKey = checkDate.toISOString().split('T')[0];
      
      const allDone = habits.every(h => completionsMap[h.id]?.has(dateKey));
      
      if (allDone) {
        tempStreak++;
        if (i === currentStreak) {
          currentStreak = tempStreak;
        }
      } else {
        if (i === 0) {
          // Today not done, check if yesterday was
          currentStreak = 0;
        } else if (tempStreak > 0 && currentStreak === 0) {
          // First break after today
          currentStreak = tempStreak;
        }
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak);
    
    return { current: currentStreak, best: bestStreak };
  }, [habits, completionsMap]);

  // Export data for Google Sheets sync
  const exportData = useMemo(() => {
    return {
      habits: habits.map(h => ({ id: h.id, name: h.name, goal: h.goal })),
      completions: completions,
      metrics: metrics,
      streak: calculateStreak,
      exportedAt: new Date().toISOString()
    };
  }, [habits, completions, metrics, calculateStreak]);

  return {
    habits,
    loading,
    toggleHabit,
    addHabit,
    deleteHabit,
    updateMetric,
    isHabitCompleted,
    getMetric,
    completionsMap,
    metricsMap,
    streak: calculateStreak,
    exportData
  };
}
