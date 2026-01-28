import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/firebase';
import { useAuth } from './useAuth';

export interface Habit {
  id: string;
  name: string;
  goal: number;
  sort_order: number;
}

export interface HabitCompletion {
  id?: string;
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

  // Fetch all data from Firestore
  useEffect(() => {
    if (!user) {
      setHabits([]);
      setCompletions([]);
      setMetrics([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      try {
        // Fetch habits
        const habitsRef = collection(db, 'users', user.uid, 'habits');
        const habitsQuery = query(habitsRef, orderBy('sort_order'));
        const habitsSnapshot = await getDocs(habitsQuery);
        const habitsData = habitsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Habit[];

        // Fetch metrics
        const metricsRef = collection(db, 'users', user.uid, 'metrics');
        // Limit to prevent fetching entire history
        const metricsQuery = query(metricsRef, limit(365));
        const metricsSnapshot = await getDocs(metricsQuery);
        const metricsData = metricsSnapshot.docs.map(doc => ({
          ...doc.data(),
        })) as DailyMetric[];

        // Fetch recent completions optimization
        const completionsRef = collection(db, 'users', user.uid, 'completions');
        // In a real app we'd filter by date range, for now just limit volume
        const completionsQuery = query(completionsRef, limit(2000));
        const completionsSnapshot = await getDocs(completionsQuery);
        const completionsData = completionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as HabitCompletion[];

        setHabits(habitsData);
        setCompletions(completionsData);
        setMetrics(metricsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }

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

  const toggleHabit = useCallback(async (habitId: string, date: Date) => {
    if (!user) return;

    const dateKey = date.toISOString().split('T')[0];
    const isCompleted = completionsMap[habitId]?.has(dateKey);

    if (isCompleted) {
      // Find and delete completion
      const completion = completions.find(
        c => c.habit_id === habitId && c.completion_date === dateKey
      );
      if (completion?.id) {
        await deleteDoc(doc(db, 'users', user.uid, 'completions', completion.id));
        setCompletions(prev =>
          prev.filter(c => !(c.habit_id === habitId && c.completion_date === dateKey))
        );
      }
    } else {
      // Add completion
      const completionsRef = collection(db, 'users', user.uid, 'completions');
      const docRef = await addDoc(completionsRef, {
        habit_id: habitId,
        completion_date: dateKey,
      });
      setCompletions(prev => [
        ...prev,
        { id: docRef.id, habit_id: habitId, completion_date: dateKey },
      ]);
    }
  }, [user, completionsMap, completions]);

  const addHabit = useCallback(async (name: string) => {
    if (!user || !name.trim()) return;

    const maxOrder = Math.max(0, ...habits.map(h => h.sort_order));
    const habitsRef = collection(db, 'users', user.uid, 'habits');
    const docRef = await addDoc(habitsRef, {
      name: name.trim(),
      goal: 100,
      sort_order: maxOrder + 1,
    });

    setHabits(prev => [
      ...prev,
      { id: docRef.id, name: name.trim(), goal: 100, sort_order: maxOrder + 1 },
    ]);
  }, [user, habits]);

  const deleteHabit = useCallback(async (habitId: string) => {
    if (!user) return;

    await deleteDoc(doc(db, 'users', user.uid, 'habits', habitId));
    setHabits(prev => prev.filter(h => h.id !== habitId));
    setCompletions(prev => prev.filter(c => c.habit_id !== habitId));
  }, [user]);

  const updateMetric = useCallback(async (date: Date, type: 'mood' | 'sleep', value: number) => {
    if (!user) return;

    const dateKey = date.toISOString().split('T')[0];
    const existing = metricsMap[dateKey];

    const newData = {
      metric_date: dateKey,
      mood: type === 'mood' ? value : (existing?.mood ?? null),
      sleep_hours: type === 'sleep' ? value : (existing?.sleep_hours ?? null),
    };

    const metricRef = doc(db, 'users', user.uid, 'metrics', dateKey);
    await setDoc(metricRef, newData);

    setMetrics(prev => {
      const filtered = prev.filter(m => m.metric_date !== dateKey);
      return [...filtered, newData];
    });
  }, [user, metricsMap]);

  const isHabitCompleted = useCallback((habitId: string, date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return completionsMap[habitId]?.has(dateKey) ?? false;
  }, [completionsMap]);

  const getMetric = useCallback((date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return metricsMap[dateKey];
  }, [metricsMap]);

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
          currentStreak = 0;
        } else if (tempStreak > 0 && currentStreak === 0) {
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
      exportedAt: new Date().toISOString(),
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
    exportData,
  };
}
