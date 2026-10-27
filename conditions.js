/** Central condition definitions. Predictability behavior is specified separately. */
// Retains the prototype's fixed defaults; no Colour dimension is inferred.
const STANDARD_SEARCH_STARTS = Object.freeze({
    direction: 'top_left', background: 'dark', size: 'large', type: 'L'
});
const EXPERIMENT_CONDITIONS = Object.freeze({
    1: Object.freeze({ version: 1, customizationEnabled: true, customizationCondition: 'customization', predictabilityCondition: 'low', agentNameMode: 'participant', fixedAgentName: null }),
    2: Object.freeze({ version: 2, customizationEnabled: true, customizationCondition: 'customization', predictabilityCondition: 'high', agentNameMode: 'participant', fixedAgentName: null }),
    3: Object.freeze({ version: 3, customizationEnabled: false, customizationCondition: 'standard', predictabilityCondition: 'low', agentNameMode: 'fixed', fixedAgentName: 'DA02' }),
    4: Object.freeze({ version: 4, customizationEnabled: false, customizationCondition: 'standard', predictabilityCondition: 'high', agentNameMode: 'fixed', fixedAgentName: 'DA02' })
});

function resolveExperimentCondition(search) {
    const parameters = new URLSearchParams(search);
    const versions = parameters.getAll('version');
    // Reject missing, ambiguous and non-canonical values; never choose a default.
    return versions.length === 1 && /^[1-4]$/.test(versions[0])
        ? EXPERIMENT_CONDITIONS[versions[0]]
        : null;
}

function isExperimentDebugEnabled(search) {
    const values = new URLSearchParams(search).getAll('debug');
    return values.length === 1 && values[0] === '1';
}

/**
 * Balanced condition assignment for Prolific links without ?version=.
 * DataPipe hands out conditions 0,1,2,3,0,... (enable "condition assignment" with
 * 4 conditions in the DataPipe dashboard). The assigned version is remembered in
 * this browser per Prolific ID, so a reload keeps the same condition.
 * Links with ?version= (internal pilot, debug) never ask DataPipe.
 */
function startWithCondition(start) {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = resolveExperimentCondition(window.location.search);
    if (fromUrl || params.has('version') || !params.has('SESSION_ID')) return start(fromUrl, 'url');
    const key = 'assigned_version_' + params.get('PROLIFIC_PID');
    let stored = null;
    try { stored = window.localStorage.getItem(key); } catch (_) {}
    if (/^[1-4]$/.test(stored || '')) return start(EXPERIMENT_CONDITIONS[stored], 'datapipe_reload');
    fetch('https://pipe.jspsych.org/api/condition/', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: '*/*' },
        body: JSON.stringify({ experimentID: OSF_EXPERIMENT_ID })
    }).then(response => response.json()).then(result => {
        const index = result && result.condition;
        if (!Number.isInteger(index) || index < 0 || index > 3) throw new Error('No condition');
        try { window.localStorage.setItem(key, String(index + 1)); } catch (_) {}
        start(EXPERIMENT_CONDITIONS[index + 1], 'datapipe');
    }).catch(() => start(null, 'datapipe_failed'));
}
