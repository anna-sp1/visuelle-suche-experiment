// Analysis export and the existing DataPipe destination. No automatic backup service.
function prepareExportRows(rows) {
    return rows.map((original, index) => {
        const row = { ...original, record_index: index + 1 };
        for (const [key, value] of Object.entries(row)) {
            if (/^(pre_ownership_\d|(?:pre|post)_satisfaction_\d|(?:pre|post)_trust_\d|manip_.+|ai_attitude_\d|responsibility_(self|agent))$/.test(key) && value != null) {
                if (!Number.isInteger(value) || value < 1 || value > 7) throw new Error(`Invalid Likert: ${key}`);
            }
            if (['defect_pattern_noticed', 'ai_error_pattern_noticed', 'data_use_consent'].includes(key) && value != null && ![YES_NO_CODES.yes, YES_NO_CODES.no].includes(value)) throw new Error(`Invalid Yes/No: ${key}`);
        }
        if (row.participant_verdict != null && row.participant_verdict_code !== VERDICT_CODES[row.participant_verdict]) throw new Error('Invalid verdict code');
        if (row.standard_change_options) {
            const selected = JSON.parse(row.standard_change_options);
            for (const option of ['name', 'search_strategy', 'other', 'none']) row[`standard_change_${option}_selected`] = selected.includes(option);
        }
        // Relevant text answers already have named fields. Raw plugin answers are redundant.
        delete row.response;
        delete row.stimulus;
        delete row.question_order;
        return row;
    });
}

function analysisCsv(rows) {
    const fields = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const cell = value => '"' + (value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)).replaceAll('"', '""') + '"';
    return [fields.map(cell).join(','), ...rows.map(row => fields.map(field => cell(row[field])).join(','))].join('\r\n');
}

// Prolific: redirect only after a confirmed upload, and only for links coming from Prolific.
function redirectToProlific(status, message = 'Data saved. You will now be redirected to Prolific.') {
    const params = new URLSearchParams(window.location.search);
    if (!PROLIFIC_COMPLETION_URL || !params.has('PROLIFIC_PID') || !params.has('SESSION_ID')) return;
    status.textContent = message;
    setTimeout(() => { window.location.href = PROLIFIC_COMPLETION_URL; }, 2000);
}

function showSubmission(jsPsych, debug) {
    const originals = jsPsych.data.get().values();
    let rows, validationError = null;
    try { rows = prepareExportRows(originals); }
    catch (error) { rows = originals; validationError = error; }
    const csv = analysisCsv(rows); // Keep one immutable snapshot for every retry/download.
    // Final page. Retry/Download only appear if the upload fails (or in debug/validation-error cases).
    const finalButton = 'margin: 16px 12px 0 0; padding: 10px 22px; font-size: 15px; font-family: Arial, Helvetica, sans-serif; background: #2b3a4a; color: #ffffff; border: none; border-radius: 3px; cursor: pointer;';
    document.body.innerHTML = `<main class="doc-page" style="max-width: 1120px; margin: 0 auto; padding: 120px 56px; text-align: left; color: #222222; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6;">
        <h1 style="font-size: 26px; margin: 0 0 12px 0;">Thank you for taking part!</h1>
        <p id="save-status" style="margin: 0;"></p>
        <button id="save-retry" style="${finalButton}" hidden>Retry</button><button id="save-download" style="${finalButton}" hidden>Download CSV</button>
    </main>`;
    const status = document.getElementById('save-status'), retry = document.getElementById('save-retry');
    const download = document.getElementById('save-download');
    // Consent withdrawn after the debriefing: nothing is uploaded, payment is unaffected.
    if (originals.some(row => row.data_use_consent === YES_NO_CODES.no)) {
        retry.hidden = true;
        download.hidden = true;
        status.textContent = 'Your data have not been saved and will not be used. Thank you for taking part. You may close this window now.';
        try { redirectToProlific(status, 'Your data have not been saved. You will now be redirected to Prolific.'); } catch (_) {}
        return;
    }
    document.getElementById('save-download').onclick = () => {
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = dateiName;
        document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    };
    async function upload() {
        retry.disabled = true;
        status.textContent = 'Saving responses...';
        try {
            const result = await fetch('https://pipe.jspsych.org/api/data/', {
                method: 'POST', headers: { 'Content-Type': 'application/json', Accept: '*/*' },
                body: JSON.stringify({ experimentID: OSF_EXPERIMENT_ID, filename: dateiName, data: csv })
            });
            if (!result.ok) throw new Error('Upload failed');
            const receipt = await result.json();
            // DataPipe answers 200 "Success", or 202 with error: null when the storage provider is
            // briefly unavailable: DataPipe then keeps the data and retries the upload itself.
            // Both mean the data are safe. Any error code means they are not.
            const saved = receipt && !receipt.error && receipt.message === 'Success';
            const queued = receipt && result.status === 202 && receipt.error === null && typeof receipt.message === 'string';
            if (!saved && !queued) throw new Error('Upload not confirmed');
            status.textContent = 'Data saved. You may close this window now.';
            // Isolated so that a redirect problem can never turn a confirmed upload into an error message.
            try { redirectToProlific(status); } catch (_) {}
        } catch (_) {
            status.textContent = 'Upload could not be confirmed. Keep this page open and retry, or download your responses as CSV.';
            retry.hidden = false;
            download.hidden = false;
            retry.disabled = false;
        }
    }
    retry.onclick = upload;
    if (validationError) { retry.hidden = true; download.hidden = false; status.textContent = 'Data validation failed. Download the raw CSV for recovery and contact the study team. No upload was sent.'; }
    else if (debug) { retry.hidden = true; download.hidden = false; status.textContent = 'Debug run: download your responses as CSV. No upload was sent.'; }
    else upload();
}
