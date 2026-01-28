export const createSpreadsheet = async (title: string, token: string) => {
    console.log('[Sheets API] Creating spreadsheet:', title);

    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            properties: { title }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Sheets API] Create failed:', response.status, errorText);

        let message = `Failed to create spreadsheet: ${response.status}`;
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error && errorJson.error.message) {
                message = errorJson.error.message;
            }
        } catch (e) {
            message += ` - ${errorText}`;
        }

        throw new Error(message);
    }

    const data = await response.json();
    console.log('[Sheets API] Created successfully:', data.spreadsheetId);
    return data;
};

export const appendData = async (spreadsheetId: string, range: string, values: any[][], token: string) => {
    console.log('[Sheets API] Appending data to:', spreadsheetId, 'range:', range);

    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Sheets API] Append failed:', response.status, errorText);

        let message = `Failed to append data: ${response.status}`;
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error && errorJson.error.message) {
                message = errorJson.error.message;
            }
        } catch (e) {
            message += ` - ${errorText}`;
        }

        throw new Error(message);
    }

    return await response.json();
};

export const getSpreadsheet = async (spreadsheetId: string, token: string) => {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 404) return null;
        const errorText = await response.text();
        console.error('[Sheets API] Get failed:', response.status, errorText);
        throw new Error(`Failed to get spreadsheet: ${response.status}`);
    }

    return await response.json();
};
