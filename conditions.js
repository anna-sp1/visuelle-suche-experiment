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
 * Balanced condition assignment for links without ?version=.
 * DataPipe hands out conditions 0,1,2,3,0,... (enable "condition assignment" with
 * 4 conditions in the DataPipe dashboard). Used for Prolific links (SESSION_ID) and
 * for the internal pilot (?STUDY_ID=pilot_intern, no Prolific parameters).
 * With a Prolific ID, the assigned version is remembered in this browser, so a reload
 * keeps the same condition. Without one (internal pilot, possibly several people on
 * one computer), every new start gets the next condition.
 * Internal links (STUDY_ID, no Prolific SESSION_ID): if DataPipe cannot assign a
 * condition (e.g. assignment not active), the version is drawn at random in the
 * browser instead (simple randomization, condition_assignment = random_local).
 * Prolific links never fall back: there the study shows an error instead.
 * Links with ?version= (debugging, explicit tests) never ask DataPipe.
 */
function startWithCondition(start) {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = resolveExperimentCondition(window.location.search);
    if (fromUrl || params.has('version') || !(params.has('SESSION_ID') || params.has('STUDY_ID'))) return start(fromUrl, 'url');
    const key = params.get('PROLIFIC_PID') ? 'assigned_version_' + params.get('PROLIFIC_PID') : null;
    let stored = null;
    try { if (key) stored = window.localStorage.getItem(key); } catch (_) {}
    if (/^[1-4]$/.test(stored || '')) return start(EXPERIMENT_CONDITIONS[stored], 'datapipe_reload');
    fetch('https://pipe.jspsych.org/api/condition/', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: '*/*' },
        body: JSON.stringify({ experimentID: OSF_EXPERIMENT_ID })
    }).then(response => response.json()).then(result => {
        const index = result && result.condition;
        if (!Number.isInteger(index) || index < 0 || index > 3) throw new Error('No condition');
        return index;
    }).then(index => {
        try { if (key) window.localStorage.setItem(key, String(index + 1)); } catch (_) {}
        start(EXPERIMENT_CONDITIONS[index + 1], 'datapipe');
    }, () => {
        // Only the DataPipe request is handled here, so a later error can never start twice.
        if (!params.has('SESSION_ID')) return start(EXPERIMENT_CONDITIONS[1 + Math.floor(Math.random() * 4)], 'random_local');
        start(null, 'datapipe_failed');
    });
}
