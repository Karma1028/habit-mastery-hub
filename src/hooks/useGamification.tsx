import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/integrations/firebase/firebase';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface UserStats {
    level: number;
    currentXp: number;
    nextLevelXp: number;
    attributes: {
        STR: number;
        INT: number;
        WIS: number;
        CHA: number;
        DIS: number;
    };
}

const DEFAULT_STATS: UserStats = {
    level: 1,
    currentXp: 0,
    nextLevelXp: 100,
    attributes: { STR: 5, INT: 5, WIS: 5, CHA: 5, DIS: 5 }
};

export function useGamification() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
    const [loading, setLoading] = useState(true);

    // Listen to stats in real-time
    useEffect(() => {
        if (!user) {
            setStats(DEFAULT_STATS);
            setLoading(false);
            return;
        }

        const docRef = doc(db, 'users', user.uid, 'stats', 'main');

        const unsubscribe = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                setStats(snap.data() as UserStats);
            } else {
                // Initialize if not exists
                setDoc(docRef, DEFAULT_STATS);
                setStats(DEFAULT_STATS);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const gainXp = useCallback(async (amount: number, attribute: keyof UserStats['attributes']) => {
        if (!user) return;

        // Local update first for speed (Optimistic)
        // Detailed logic:
        // 1. Add XP
        // 2. Add Attribute Point (maybe scaled?)
        // 3. Check Level Up

        let newStats = { ...stats };
        newStats.currentXp += amount;
        newStats.attributes[attribute] += 1; // Gain +1 stat for doing the habit

        let leveledUp = false;
        let overflow = 0;

        if (newStats.currentXp >= newStats.nextLevelXp) {
            leveledUp = true;
            overflow = newStats.currentXp - newStats.nextLevelXp;
            newStats.level += 1;
            newStats.currentXp = overflow;
            newStats.nextLevelXp = Math.floor(newStats.nextLevelXp * 1.25); // Curve
        }

        // Save
        try {
            const docRef = doc(db, 'users', user.uid, 'stats', 'main');
            await setDoc(docRef, newStats);

            if (leveledUp) {
                toast({
                    title: "🆙 LEVEL UP!",
                    description: `You reached Level ${newStats.level}!`,
                    className: "bg-yellow-500 text-white border-none font-bold"
                });
            }
        } catch (e) {
            console.error("Failed to save stats", e);
        }

    }, [user, stats, toast]);

    return {
        stats,
        loading,
        gainXp
    };
}
