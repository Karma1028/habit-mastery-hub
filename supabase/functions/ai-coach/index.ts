import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, habitData } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // Build context from habit data
    const habitContext = habitData ? `
Current User Data:
- Total Habits: ${habitData.habits?.length || 0}
- Habits: ${habitData.habits?.map((h: any) => h.name).join(', ') || 'None'}
- Current Streak: ${habitData.streak?.current || 0} days
- Best Streak: ${habitData.streak?.best || 0} days
- Recent Completions: ${habitData.recentCompletions || 0} in last 7 days
- Average Mood (7 days): ${habitData.avgMood || 'N/A'}
- Average Sleep (7 days): ${habitData.avgSleep || 'N/A'} hours
- Completion Rate (7 days): ${habitData.weeklyRate || 0}%
- Monthly Rate: ${habitData.monthlyRate || 0}%
- Most Consistent Habit: ${habitData.bestHabit || 'N/A'}
- Needs Improvement: ${habitData.worstHabit || 'N/A'}
` : '';

    const systemPrompt = `You are HabitMaster AI Coach - a friendly, encouraging, and insightful personal habit coach. Your role is to:

1. Analyze the user's habit tracking data and provide personalized insights
2. Celebrate their wins and acknowledge their progress
3. Identify patterns and suggest improvements
4. Provide motivation and accountability
5. Answer questions about habits, wellness, and productivity
6. Give specific, actionable advice based on their data

${habitContext}

Guidelines:
- Be warm, supportive, and encouraging
- Use emojis sparingly but effectively 🎯
- Keep responses concise but helpful
- Reference their actual data when giving advice
- If they're doing well, celebrate it!
- If they're struggling, be empathetic and offer practical tips
- Focus on progress, not perfection`;

    // Try primary model first, fallback to secondary
    const models = [
      "xiaomi/mimo-v2-flash:free",
      "tngtech/deepseek-r1t2-chimera:free"
    ];

    let response;
    let lastError;

    for (const model of models) {
      try {
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://habitmaster.lovable.app",
            "X-Title": "HabitMaster AI Coach",
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              ...messages,
            ],
            stream: true,
            max_tokens: 1000,
          }),
        });

        if (response.ok) {
          console.log(`Successfully using model: ${model}`);
          break;
        } else {
          const errorText = await response.text();
          console.error(`Model ${model} failed:`, response.status, errorText);
          lastError = errorText;
        }
      } catch (err) {
        console.error(`Model ${model} error:`, err);
        lastError = err;
      }
    }

    if (!response || !response.ok) {
      console.error("All models failed, last error:", lastError);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI Coach error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
