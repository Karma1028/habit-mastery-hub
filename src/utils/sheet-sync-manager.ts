import { readSheetData, updateSheetCell, appendData } from './google-sheets';

interface SyncConfig {
    spreadsheetId: string;
    token: string;
}

/**
 * Ensures the Google Sheet has a header row consistent with the current habit list.
 * If a habit is missing from the headers, it adds it to the next available column.
 */
export const syncHeaders = async (habits: { id: string; name: string }[], config: SyncConfig) => {
    const { spreadsheetId, token } = config;

    // 1. Read current headers (Row 1)
    const existingHeaders = (await readSheetData(spreadsheetId, 'Sheet1!1:1', token))[0] || [];

    // Default Headers
    if (existingHeaders.length === 0) {
        const defaults = ['Date', 'Mood', 'Sleep'];
        const habitNames = habits.map(h => h.name);
        await appendData(spreadsheetId, 'Sheet1!A1', [[...defaults, ...habitNames]], token);
        return;
    }

    // 2. Find missing habits
    const missingHabits = habits.filter(h => !existingHeaders.includes(h.name));

    if (missingHabits.length > 0) {
        console.log('[Sync] Adding missing columns:', missingHabits.map(h => h.name));
        // Append these to the end of Row 1
        // We calculate column index... or just use append which might put it in a new row if not careful.
        // Safer to just append to the *end* of the header row.
        // Actually, 'appendData' usually appends *rows*. To add columns, we need to know where to start.

        const nextColIndex = existingHeaders.length;
        const startColLetter = getColumnLetter(nextColIndex);
        const range = `Sheet1!${startColLetter}1`;

        await updateSheetCell(spreadsheetId, range, missingHabits.map(h => h.name), token);
        // Note: updateSheetCell expects a single value, but we can send an array if we change the util to accept [][] or modify loop. 
        // For simplicity, let's just re-write the WHOLE header row if it changed, it's safer.

        const newHeaders = [...existingHeaders, ...missingHabits.map(h => h.name)];
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!1:1?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [newHeaders] })
        });
    }
};

/**
 * Syncs a single "Toggle" action to the sheet.
 * Finds the row for the given date, finds the column for the habit, and sets TRUE/FALSE.
 */
export const syncHabitToggle = async (
    habitName: string,
    date: Date,
    isCompleted: boolean,
    config: SyncConfig
) => {
    const { spreadsheetId, token } = config;
    const dateKey = date.toISOString().split('T')[0];

    // 1. Read all dates (Column A) to find the row index
    const dateCol = await readSheetData(spreadsheetId, 'Sheet1!A:A', token);
    // Flatten array of arrays [['Date'], ['2023-10-01']] -> ['Date', '2023-10-01']
    const flatDates = dateCol.map(row => row[0]);

    let rowIndex = flatDates.indexOf(dateKey);

    // 2. If date doesn't exist, Create it
    if (rowIndex === -1) {
        console.log('[Sync] New date row:', dateKey);
        await appendData(spreadsheetId, 'Sheet1!A:A', [[dateKey]], token);
        // It's usually the last one now
        rowIndex = flatDates.length; // 0-indexed match, size of prev array is index of new one (since headers are 0)
        // Wait, if headers are row 1 (index 0), arrays use 0-index.
        // Google Sheets uses 1-index for Range.
        // rowIndex returned by indexOf is 0-based.
        // So actual Sheet Row Number = rowIndex + 1.

        // If we just appended, it's at the end.
        rowIndex = flatDates.length;
    }

    const sheetRowNumber = rowIndex + 1;

    // 3. Find Column for Habit
    const headers = (await readSheetData(spreadsheetId, 'Sheet1!1:1', token))[0] || [];
    const colIndex = headers.indexOf(habitName);

    if (colIndex === -1) {
        console.warn(`[Sync] Habit '${habitName}' not found in headers. Run syncHeaders first.`);
        return;
    }

    const colLetter = getColumnLetter(colIndex);
    const cellRange = `Sheet1!${colLetter}${sheetRowNumber}`;

    console.log(`[Sync] Updating ${cellRange} -> ${isCompleted}`);
    await updateSheetCell(spreadsheetId, cellRange, isCompleted, token);
};


// Helper to convert index (0, 1, 2) to Letter (A, B, C)
const getColumnLetter = (index: number): string => {
    let letter = '';
    while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
    }
    return letter;
};
