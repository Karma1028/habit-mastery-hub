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

    try {
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
                message += ` - ${errorText.substring(0, 100)}`;
            }

            throw new Error(message);
        }

        return await response.json();
    } catch (error) {
        // Network errors or other fetch issues
        console.error('[Sheets API] Network/Fetch error:', error);
        throw error;
    }
};


// --- DRIVE API HELPERS ---

export const findOrCreateFolder = async (folderName: string, token: string): Promise<string> => {
    console.log('[Drive API] Finding folder:', folderName);

    // 1. Search for existing folder
    const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
            console.log('[Drive API] Found existing folder:', data.files[0].id);
            return data.files[0].id;
        }
    }

    // 2. Create if not found
    console.log('[Drive API] Creating new folder...');
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        })
    });

    if (!createRes.ok) throw new Error('Failed to create folder');

    const folderData = await createRes.json();
    return folderData.id;
};

export const moveFileToFolder = async (fileId: string, folderId: string, token: string) => {
    console.log(`[Drive API] Moving file ${fileId} to folder ${folderId}`);

    // Determine the current parent (usually 'root') to remove it
    // For simplicity in this v3 API call, we can just use addParents/removeParents
    // But first we need to get current parents. 
    // Optimization: Just add parents.

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&fields=id,parents`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!res.ok) {
        console.warn('[Drive API] Move warning:', await res.text());
    }
};

export const getSpreadsheet = async (spreadsheetId: string, token: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 404) return null;
            const errorText = await response.text();
            console.error('[Sheets API] Get failed:', response.status, errorText);
            throw new Error(`Failed to get spreadsheet: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out after 10 seconds');
        }
        throw error;
    }
};
