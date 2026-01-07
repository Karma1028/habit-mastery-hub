import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface HabitData {
  habits: { id: string; name: string; goal: number }[];
  completions: { habit_id: string; completion_date: string }[];
  metrics: { metric_date: string; mood: number | null; sleep_hours: number | null }[];
  streak: { current: number; best: number };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid token");
    }

    // Get the provider token for Google API access
    const { data: sessionData } = await supabase.auth.getSession();
    
    // For now, we'll use the token passed from the client
    const { action, data, accessToken, spreadsheetId } = await req.json();

    if (!accessToken) {
      return new Response(
        JSON.stringify({ 
          error: "Google access token required",
          needsReauth: true,
          message: "Please sign in with Google again to enable sheets sync"
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Test the access token
    const testResponse = await fetch("https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=" + accessToken);
    if (!testResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: "Google access token expired",
          needsReauth: true,
          message: "Your Google session has expired. Please sign in again."
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    switch (action) {
      case "create": {
        // Create a new Google Sheet
        const createResponse = await fetch(
          "https://sheets.googleapis.com/v4/spreadsheets",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              properties: {
                title: `HabitMaster - ${user.email}`,
              },
              sheets: [
                { properties: { title: "Summary", index: 0 } },
                { properties: { title: "Habits", index: 1 } },
                { properties: { title: "Completions", index: 2 } },
                { properties: { title: "Wellness", index: 3 } },
              ],
            }),
          }
        );

        if (!createResponse.ok) {
          const error = await createResponse.text();
          throw new Error(`Failed to create spreadsheet: ${error}`);
        }

        const sheet = await createResponse.json();
        
        // Store the spreadsheet ID in user metadata
        await supabase.from("profiles").upsert({
          user_id: user.id,
          spreadsheet_id: sheet.spreadsheetId,
          spreadsheet_url: sheet.spreadsheetUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        return new Response(
          JSON.stringify({ 
            success: true, 
            spreadsheetId: sheet.spreadsheetId,
            spreadsheetUrl: sheet.spreadsheetUrl 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "sync": {
        if (!spreadsheetId || !data) {
          throw new Error("Missing spreadsheetId or data");
        }

        const habitData = data as HabitData;
        const today = new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // Prepare sheet data
        const summaryData = [
          ["HabitMaster Dashboard"],
          ["Last Synced", today],
          [""],
          ["📊 Quick Stats"],
          ["Current Streak", `${habitData.streak.current} days`],
          ["Best Streak", `${habitData.streak.best} days`],
          ["Total Habits", habitData.habits.length],
          ["Total Completions", habitData.completions.length],
        ];

        const habitsData = [
          ["Habit Name", "Goal %", "Total Completions", "Completion Rate"],
          ...habitData.habits.map((h) => {
            const completionCount = habitData.completions.filter(
              (c) => c.habit_id === h.id
            ).length;
            const rate = completionCount > 0 ? `${Math.round((completionCount / 30) * 100)}%` : "0%";
            return [h.name, `${h.goal}%`, completionCount, rate];
          }),
        ];

        // Build completions timeline
        const dates = [...new Set(habitData.completions.map((c) => c.completion_date))].sort().reverse();
        const completionsData = [
          ["Date", ...habitData.habits.map((h) => h.name)],
          ...dates.slice(0, 90).map((date) => [
            date,
            ...habitData.habits.map((h) =>
              habitData.completions.some(
                (c) => c.habit_id === h.id && c.completion_date === date
              )
                ? "✅"
                : "❌"
            ),
          ]),
        ];

        const wellnessData = [
          ["Date", "Mood (1-5)", "Sleep (hours)"],
          ...habitData.metrics
            .sort((a, b) => b.metric_date.localeCompare(a.metric_date))
            .slice(0, 90)
            .map((m) => [
              m.metric_date,
              m.mood ? getMoodEmoji(m.mood) : "-",
              m.sleep_hours ? `${m.sleep_hours}h` : "-",
            ]),
        ];

        // Batch update all sheets
        const batchUpdateResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              valueInputOption: "USER_ENTERED",
              data: [
                { range: "Summary!A1", values: summaryData },
                { range: "Habits!A1", values: habitsData },
                { range: "Completions!A1", values: completionsData },
                { range: "Wellness!A1", values: wellnessData },
              ],
            }),
          }
        );

        if (!batchUpdateResponse.ok) {
          const error = await batchUpdateResponse.text();
          throw new Error(`Failed to update spreadsheet: ${error}`);
        }

        // Format the header rows
        await formatSpreadsheet(accessToken, spreadsheetId);

        return new Response(
          JSON.stringify({ success: true, message: "Synced successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-info": {
        // Get the user's spreadsheet info from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("spreadsheet_id, spreadsheet_url")
          .eq("user_id", user.id)
          .single();

        return new Response(
          JSON.stringify({ 
            success: true, 
            spreadsheetId: profile?.spreadsheet_id,
            spreadsheetUrl: profile?.spreadsheet_url
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

function getMoodEmoji(mood: number): string {
  const emojis = ["", "😤", "😔", "😐", "😊", "🤩"];
  return emojis[mood] || `${mood}`;
}

async function formatSpreadsheet(accessToken: string, spreadsheetId: string) {
  try {
    // Get sheet IDs
    const sheetResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    
    if (!sheetResponse.ok) return;
    
    const sheetData = await sheetResponse.json();
    const sheets = sheetData.sheets || [];

    const requests = sheets.map((sheet: any) => ({
      repeatCell: {
        range: {
          sheetId: sheet.properties.sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.16, green: 0.71, blue: 0.53 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    }));

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      }
    );
  } catch (e) {
    console.log("Format error (non-critical):", e);
  }
}
