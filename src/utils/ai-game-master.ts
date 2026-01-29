const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export interface QuestAnalysis {
    xp: number;
    attribute: 'STR' | 'INT' | 'WIS' | 'CHA' | 'DIS';
    reasoning: string;
}

export const analyzeQuestWithAI = async (questName: string): Promise<QuestAnalysis> => {
    if (!OPENROUTER_API_KEY) {
        console.warn("No OpenRouter API Key found. Using default values.");
        return { xp: 15, attribute: 'DIS', reasoning: 'Default (No API Key)' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for single analysis

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://habit-mastery.vercel.app",
                "X-Title": "HabitMaster RPG",
                "Content-Type": "application/json"
            },
            signal: controller.signal,
            body: JSON.stringify({
                "model": "tngtech/deepseek-r1t2-chimera:free",
                "messages": [
                    {
                        "role": "system",
                        "content": `You are the Game Master for an RPG Habit Tracker. 
            Analyze the user's habit/quest goal and assign it ONE attribute:
            - STR (Physical fitness)
            - INT (Learning, coding)
            - WIS (Meditation, planning)
            - CHA (Social)
            - DIS (Discipline, chores)
            
            Also assign XP (10-50).
            
            Return ONLY valid JSON: { "xp": number, "attribute": "Enum", "reasoning": "short string" }`
                    },
                    {
                        "role": "user",
                        "content": `Analyze this quest: "${questName}"`
                    }
                ]
            })
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`OpenRouter API Error: ${response.status}`);

        const data = await response.json();
        const rawContent = data.choices[0].message.content;

        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error("Could not parse JSON from AI response");

    } catch (error) {
        console.error("AI Game Master Error:", error);
        // Fallback
        const lower = questName.toLowerCase();
        let attr: QuestAnalysis['attribute'] = 'DIS';
        if (lower.includes('run') || lower.includes('gym')) attr = 'STR';
        if (lower.includes('read') || lower.includes('code')) attr = 'INT';
        return { xp: 15, attribute: attr, reasoning: 'Fallback' };
    } finally {
        clearTimeout(timeoutId);
    }
};

/**
 * GENERATES A LIST OF HABITS BASED ON SKILLS & GOAL
 */
export const generateHabitsWithAI = async (skills: string, goal: string): Promise<Array<{ name: string, xp: number, attribute: string }>> => {
    console.log('[AI Game Master] Requesting habits for:', { skills, goal });

    if (!OPENROUTER_API_KEY) {
        console.warn("No OpenRouter API Key found. Using fallback.");
        return getFallbackHabits(skills);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://habit-mastery.vercel.app",
                "X-Title": "HabitMaster RPG",
                "Content-Type": "application/json"
            },
            signal: controller.signal,
            body: JSON.stringify({
                "model": "tngtech/deepseek-r1t2-chimera:free",
                "messages": [
                    {
                        "role": "system",
                        "content": `You are a Habit RPG Game Master.
            User Skills/Interests: ${skills}
            Main Goal: ${goal}

            Generate 4-6 specific daily habits that help achieve this goal while aligning with their skills.
            For each habit, assign an Attribute [STR, INT, WIS, CHA, DIS] and XP (10-50).

            IMPORTANT: Return ONLY a raw JSON Array. Do not wrap in markdown code blocks. Do not add explanation.
            Example:
            [{"name":"Run 1km","xp":20,"attribute":"STR"},{"name":"Read 10 pages","xp":15,"attribute":"INT"}]
            `
                    },
                    {
                        "role": "user",
                        "content": "Generate quests now."
                    }
                ]
            })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenRouter API Error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const rawContent = data.choices[0]?.message?.content || "";
        console.log('[AI Game Master] Raw Response:', rawContent);

        // Attempt to extract JSON array
        // 1. Try direct parse
        try {
            return JSON.parse(rawContent);
        } catch (e) {
            // 2. Try to find array brackets with regex, handling newlines
            const match = rawContent.match(/\[([\s\S]*?)\]/);
            if (match) {
                return JSON.parse(match[0]);
            }
            throw new Error("No JSON array found in response");
        }

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        if (error.name === 'AbortError') {
            console.warn("AI generation timed out.");
        }
        // Fallback so the user isn't stuck
        return getFallbackHabits(skills);
    } finally {
        clearTimeout(timeoutId);
    }
};

const getFallbackHabits = (skills: string) => {
    // Basic heuristics based on skill keywords for a "smart" fallback
    const habits = [
        { name: "Plan Your Day", xp: 10, attribute: "WIS" }
    ];

    if (skills.toLowerCase().includes('fitness')) {
        habits.push({ name: "Workout 20m", xp: 20, attribute: "STR" });
    }
    if (skills.toLowerCase().includes('coding')) {
        habits.push({ name: "Write Code", xp: 20, attribute: "INT" });
    }
    if (skills.toLowerCase().includes('reading')) {
        habits.push({ name: "Read Chapter", xp: 15, attribute: "INT" });
    }
    if (habits.length < 3) {
        habits.push({ name: "Drink Water", xp: 10, attribute: "DIS" });
    }


    return habits;
};

export interface HeroPlan {
    quote: { text: string; author: string };
    advice: string;
    youtube_queries: string[];
    music_recommendations: string[];
    news_topics: string[];
    short_term_goals: string[];
    roadmap: Array<{ week: string; focus: string }>;
    focus_area: string;
}

export const generateHeroPlan = async (profile: any): Promise<HeroPlan> => {
    // 1. Construct a rich prompt based on user inputs
    // Profile contains: skills[], intensity (slider), focus (slider), motivations[], goal, reward_idea

    // Fallback if no key
    if (!OPENROUTER_API_KEY) {
        return {
            quote: { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            advice: "Start small. define your daily wins.",
            youtube_queries: ["Productivity Hacks", "Morning Routine 2024"],
            music_recommendations: ["Lo-fi Beats", "Epic Orchestral", "Deep Focus"],
            news_topics: ["Tech Trends", "Health Science", "Global Economy"],
            short_term_goals: ["Drink 2L Water", "Read 5 Pages", "Plan Tomorrow"],
            roadmap: [
                { week: "Week 1", focus: "Foundation" },
                { week: "Week 2", focus: "Consistency" },
                { week: "Week 3", focus: "Optimization" },
                { week: "Week 4", focus: "Mastery" }
            ],
            focus_area: "Discipline"
        };
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://habit-mastery.vercel.app",
                "X-Title": "HabitMaster RPG",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "tngtech/deepseek-r1t2-chimera:free",
                "messages": [
                    {
                        "role": "system",
                        "content": `You are an Elite RPG Life Architect & Data Analyst.
            Analyze this User Profile to build a High-Level Strategic Master Plan.
            
            USER PROFILE:
            - Skills: ${JSON.stringify(profile.skills)}
            - Intensity Level (0-100): ${profile.intensity}
            - Focus Style (0-100): ${profile.focus} (Low=Generalist, High=Specialist)
            - Motivations: ${JSON.stringify(profile.motivations)}
            - Real-world Reward: ${profile.reward_idea || "None"}
            - MAIN QUEST: "${profile.goal}"

            Generate a comprehensive JSON response (NO MARKDOWN) with:
            1. "quote": { "text": "Powerful quote aligning with their goal", "author": "Author" }
            2. "advice": "Specific strategic advice (max 25 words)."
            3. "short_term_goals": [Array of 3 immediate, specific tasks to do THIS WEEK]
            4. "roadmap": [Array of 4 objects { "week": "Week 1", "focus": "Theme" } covering the first month]
            5. "youtube_queries": [3 specific search terms for learning/growth]
            6. "music_recommendations": [3 specific genres/artists for their workflow]
            7. "news_topics": [3 specific topics to follow for news]
            8. "focus_area": "One powerful word theme"
            
            Return ONLY valid JSON.`
                    },
                    { "role": "user", "content": "Architect my destiny." }
                ]
            })
        });

        if (!response.ok) throw new Error("AI Error");
        const data = await response.json();
        const content = data.choices[0].message.content;

        const match = content.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : JSON.parse(content);

    } catch (e) {
        console.error(e);
        return {
            quote: { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
            advice: "Keep moving forward. Consistency is key.",
            youtube_queries: ["Motivation", "Discipline"],
            music_recommendations: ["Focus Flow", "Deep House", "Ambient"],
            news_topics: ["Self Improvement", "Tech", "Science"],
            short_term_goals: ["Organize Workspace", "Set Alarm", "Walk 10m"],
            roadmap: [{ week: "Week 1", focus: "Start" }, { week: "Week 2", focus: "Build" }, { week: "Week 3", focus: "Grow" }, { week: "Week 4", focus: "Scale" }],
            focus_area: "Resilience"
        };
    }
};
