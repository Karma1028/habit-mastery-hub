import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, Dumbbell, BookOpen, Heart, Code, Palette, DollarSign, Globe, Music, Coffee, Zap, Shield, Target, Trophy } from 'lucide-react';
import { useHabits } from '@/hooks/useHabits';
import { useToast } from '@/hooks/use-toast';

interface WizardStep {
    id: number;
    title: string;
    description: string;
}

const STEPS: WizardStep[] = [
    { id: 1, title: "Choose Your Arsenal", description: "Select your core skills." },
    { id: 2, title: "Combat Style", description: "Tune your daily intensity." },
    { id: 3, title: "The Prize", description: "What fuels your ambition?" },
    { id: 4, title: "The Mission", description: "Define your ultimate objective." }
];

const SKILLS = [
    { id: 'fitness', label: 'Fitness', icon: Dumbbell, color: 'text-red-500' },
    { id: 'coding', label: 'Coding', icon: Code, color: 'text-blue-500' },
    { id: 'reading', label: 'Reading', icon: BookOpen, color: 'text-yellow-500' },
    { id: 'mindfulness', label: 'Mindfulness', icon: Heart, color: 'text-pink-500' },
    { id: 'art', label: 'Creativity', icon: Palette, color: 'text-purple-500' },
    { id: 'finance', label: 'Finance', icon: DollarSign, color: 'text-green-500' },
    { id: 'social', label: 'Social', icon: Globe, color: 'text-indigo-500' },
    { id: 'music', label: 'Music', icon: Music, color: 'text-orange-500' },
    { id: 'discipline', label: 'Discipline', icon: Coffee, color: 'text-slate-500' },
];

const MOTIVATIONS = [
    { id: 'unlocks', label: 'Unlocking New Content/Features' },
    { id: 'visuals', label: 'Visual Progress (Charts/Graphs)' },
    { id: 'streak', label: 'Maintaining High Streaks' },
    { id: 'knowledge', label: 'Learning & Mastery' },
];

export function CharacterCreationWizard({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState(1);
    const { addHabit } = useHabits();
    const { toast } = useToast();

    // Form State
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [sliders, setSliders] = useState({
        intensity: 50, // Casual vs Hardcore
        focus: 50,     // Broad vs Deep
    });
    const [motivations, setMotivations] = useState<string[]>([]);
    const [mainGoal, setMainGoal] = useState('');
    const [rewardIdea, setRewardIdea] = useState('');

    const [loading, setLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingText, setLoadingText] = useState("");

    // AI Loading Simulation Effect
    useEffect(() => {
        if (!loading) return;

        let progress = 0;
        const interval = setInterval(() => {
            progress += 1; // Increment progress
            setLoadingProgress(Math.min(progress, 90)); // Cap at 90% until done

            // Specific text based on progress & user inputs
            if (progress < 20) setLoadingText(`Analyzing proficiency in ${selectedSkills[0]?.toUpperCase() || "SKILLS"}...`);
            else if (progress < 40) setLoadingText(`Calibrating Intensity to ${sliders.intensity}%...`);
            else if (progress < 60) setLoadingText(`Aligning Motivation: ${motivations[0] || "GROWTH"}...`);
            else if (progress < 80) setLoadingText(`Processing Quest: "${mainGoal.substring(0, 20)}..."`);
            else setLoadingText("Finalizing Master Plan Strategy...");

        }, 50); // Fast increment to simulate "thinking"

        return () => clearInterval(interval);
    }, [loading, selectedSkills, sliders, motivations, mainGoal]);

    const handleNext = () => {
        if (step < 4) setStep(s => s + 1);
        else finishWizard();
    };

    const finishWizard = async () => {
        setLoading(true);

        try {
            // 1. INSTANTLY create "Starter" habits based on selections (Deterministic)
            const starters = getStarterHabits(selectedSkills);

            // Promise.all for speed, non-blocking
            await Promise.all(starters.map(h => addHabit(h.name, h.params).catch(e => console.warn("Failed to add habit", h.name, e))));

            // 2. KICK OFF AI IN BACKGROUND
            const userProfile = {
                skills: selectedSkills,
                intensity: sliders.intensity,
                focus: sliders.focus,
                motivations,
                reward_idea: rewardIdea,
                goal: mainGoal
            };

            console.log("Setting pending profile:", userProfile);
            localStorage.setItem('hero_profile_pending', JSON.stringify(userProfile));

            // Force progress to 100% before closing
            setLoadingProgress(100);
            setLoadingText("Systems Synchronized.");

            // Brief delay to show 100% state
            await new Promise(resolve => setTimeout(resolve, 800));

            toast({
                title: "Journey Begun",
                description: "Your habits are set. The AI is strategizing in the shadows...",
            });

        } catch (e) {
            console.error("Wizard Error:", e);
        } finally {
            setLoading(false);
            onComplete();
        }
    };

    const getStarterHabits = (skills: string[]) => {
        // Fast, instant mapping
        const habits = [];
        if (skills.includes('fitness')) habits.push({ name: "Morning Stretch (5m)", params: { xp: 10, attribute: 'STR' } });
        if (skills.includes('coding')) habits.push({ name: "Code for 15m", params: { xp: 15, attribute: 'INT' } });
        if (skills.includes('reading')) habits.push({ name: "Read 5 Pages", params: { xp: 10, attribute: 'INT' } });
        if (skills.includes('mindfulness')) habits.push({ name: "Breathe (2m)", params: { xp: 10, attribute: 'WIS' } });
        if (skills.includes('art')) habits.push({ name: "Sketch (10m)", params: { xp: 10, attribute: 'CHA' } });
        if (skills.includes('finance')) habits.push({ name: "Check Budget", params: { xp: 10, attribute: 'WIS' } });
        if (skills.includes('music')) habits.push({ name: "Practice Scales (10m)", params: { xp: 15, attribute: 'CHA' } });

        // Default fallback if sparse selection
        if (habits.length === 0) habits.push({ name: "Drink Water", params: { xp: 5, attribute: 'DIS' } });

        habits.push({ name: "Check Quest Log", params: { xp: 5, attribute: 'DIS' } });
        return habits;
    };

    const toggleSkill = (id: string) => {
        setSelectedSkills(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const toggleMotivation = (id: string) => {
        setMotivations(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-300">
            <Card className="w-full max-w-2xl bg-card border-primary/20 shadow-2xl overflow-hidden relative min-h-[600px] flex flex-col">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" />

                {/* Header */}
                <div className="p-8 border-b border-border/50 relative z-10">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Sparkles className="text-primary" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-wide">{STEPS[step - 1].title}</h2>
                                <p className="text-sm text-muted-foreground">{STEPS[step - 1].description}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-muted-foreground uppercase">Step {step} / 4</p>
                            <div className="w-24 h-1 bg-muted mt-1 rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${(step / 4) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 p-8 overflow-y-auto relative z-10">
                    <AnimatePresence mode="wait">

                        {/* STEP 1: SKILLS */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="grid grid-cols-3 gap-4"
                            >
                                {SKILLS.map((skill) => {
                                    const isSelected = selectedSkills.includes(skill.id);
                                    return (
                                        <button
                                            key={skill.id}
                                            onClick={() => toggleSkill(skill.id)}
                                            className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-3 hover:scale-105 active:scale-95 ${isSelected ? `border-primary bg-primary/10` : 'border-dashed border-border hover:border-primary/50'}`}
                                        >
                                            <skill.icon size={32} className={isSelected ? skill.color : 'text-muted-foreground'} />
                                            <span className={`font-bold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{skill.label}</span>
                                        </button>
                                    )
                                })}
                            </motion.div>
                        )}

                        {/* STEP 2: SLIDERS */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-10 py-4"
                            >
                                <div className="space-y-4">
                                    <div className="flex justify-between font-bold">
                                        <span className="flex items-center gap-2"><Coffee size={18} /> Casual</span>
                                        <span className="flex items-center gap-2 text-primary"><Zap size={18} /> Hardcore</span>
                                    </div>
                                    <Slider
                                        defaultValue={[50]}
                                        max={100}
                                        step={1}
                                        value={[sliders.intensity]}
                                        onValueChange={(val) => setSliders({ ...sliders, intensity: val[0] })}
                                        className="cursor-pointer"
                                    />
                                    <p className="text-xs text-center text-muted-foreground">
                                        {sliders.intensity < 30 ? "I want small, easy wins." : sliders.intensity > 70 ? "Push me to my limits." : "Balance work and life."}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between font-bold">
                                        <span className="flex items-center gap-2"><Shield size={18} /> Broad</span>
                                        <span className="flex items-center gap-2 text-primary"><Target size={18} /> Focused</span>
                                    </div>
                                    <Slider
                                        defaultValue={[50]}
                                        max={100}
                                        step={1}
                                        value={[sliders.focus]}
                                        onValueChange={(val) => setSliders({ ...sliders, focus: val[0] })}
                                        className="cursor-pointer"
                                    />
                                    <p className="text-xs text-center text-muted-foreground">
                                        {sliders.focus < 30 ? "Jack of all trades." : sliders.focus > 70 ? "Master of one." : "A mix of everything."}
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: MOTIVATIONS & REWARDS */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-8"
                            >
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg">What drives you?</h3>
                                    {MOTIVATIONS.map((m) => (
                                        <div key={m.id} className="flex items-center space-x-4 p-4 rounded-lg border bg-card/50 hover:bg-muted/50 transition-colors">
                                            <Checkbox
                                                id={m.id}
                                                checked={motivations.includes(m.id)}
                                                onCheckedChange={() => toggleMotivation(m.id)}
                                                className="w-5 h-5 border-2"
                                            />
                                            <label htmlFor={m.id} className="cursor-pointer flex-1 font-medium">{m.label}</label>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <h3 className="font-bold text-lg">Real World Loot</h3>
                                    <p className="text-sm text-muted-foreground">What will you treat yourself to when you reach Level 10?</p>
                                    <Input
                                        value={rewardIdea}
                                        onChange={(e) => setRewardIdea(e.target.value)}
                                        placeholder="e.g. A Cheat Meal, New Game, Weekend Trip..."
                                        className="h-12 bg-muted/20"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 4: GOAL */}
                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="flex flex-col h-full justify-center space-y-6"
                            >
                                <div className="space-y-2 text-center">
                                    <Trophy size={48} className="mx-auto text-primary mb-4 animate-bounce" />
                                    <h3 className="text-2xl font-black">One Last Thing...</h3>
                                    <p className="text-muted-foreground">Describe your Main Quest in your own words. The AI will use this, your skills, and your playstyle to build your Master Plan.</p>
                                </div>
                                <Input
                                    value={mainGoal}
                                    onChange={(e) => setMainGoal(e.target.value)}
                                    placeholder="e.g. Become a Senior React Developer by December..."
                                    className="h-16 text-xl text-center bg-muted/20 border-primary/30 focus:border-primary font-bold shadow-inner"
                                />
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-border/50 bg-background/50 backdrop-blur-sm">
                    <div className="flex gap-4">
                        {step > 1 && (
                            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="h-12 px-6">
                                Back
                            </Button>
                        )}
                        <Button
                            onClick={handleNext}
                            disabled={step === 1 && selectedSkills.length === 0}
                            className="flex-1 h-12 text-lg font-bold shadow-lg shadow-primary/25"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : step === 4 ? "Initialize System" : "Next"}
                        </Button>
                    </div>
                </div>

            </Card>

            {/* FUNKY AI LOADING OVERLAY (THEMED) */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        // Changed from bg-black/90 to bg-background/95 to match app theme
                        className="absolute inset-0 z-50 bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 overflow-hidden"
                    >
                        {/* Background Animated Gradients - More Subtle */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <motion.div
                                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,var(--primary)_90deg,transparent_180deg,var(--secondary)_270deg,transparent_360deg)] opacity-10"
                            />
                        </div>

                        <div className="w-full max-w-md space-y-10 text-center relative z-10">

                            {/* Central Power Orb - Themed */}
                            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                                {/* Outer Rings */}
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 rounded-full border-t-4 border-primary shadow-[0_0_30px_rgba(var(--primary),0.5)]"
                                />
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-4 rounded-full border-b-4 border-secondary shadow-[0_0_30px_rgba(var(--secondary),0.5)]"
                                />

                                {/* Core Icon */}
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    <Sparkles className="text-foreground drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" size={48} />
                                </motion.div>
                            </div>

                            {/* Text - Clean & Modern */}
                            <div className="space-y-4">
                                <h3 className="text-3xl font-black text-foreground tracking-tight uppercase">
                                    Constructing Reality
                                </h3>
                                <motion.div
                                    key={loadingText}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="h-8 flex items-center justify-center"
                                >
                                    <p className="text-muted-foreground font-mono font-bold text-sm bg-muted/30 px-3 py-1 rounded border border-border">
                                        {">"} {loadingText} <span className="animate-blink">_</span>
                                    </p>
                                </motion.div>
                            </div>

                            {/* RPG Funky Progress Bar - Themed */}
                            <div className="space-y-2 max-w-xs mx-auto">
                                <div className="h-6 w-full bg-muted/50 rounded-none border-2 border-border/50 relative skew-x-[-15deg] overflow-hidden shadow-inner">
                                    {/* Grid Background */}
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_90%,rgba(255,255,255,0.05)_90%)] bg-[length:20px_100%]" />

                                    {/* Fill */}
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-primary to-secondary"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${loadingProgress}%` }}
                                        transition={{ type: "spring", stiffness: 50 }}
                                    />

                                    {/* Shine Effect */}
                                    <motion.div
                                        animate={{ x: ["-100%", "200%"] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12"
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-black tracking-widest text-muted-foreground uppercase">
                                    <span>Syncing...</span>
                                    <span>{loadingProgress}%</span>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


