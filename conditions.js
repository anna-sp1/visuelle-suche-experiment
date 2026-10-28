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

/** True when the page runs as a JATOS component (jatos.js loaded from the JATOS server). */
function inJatos() {
    return typeof jatos !== 'undefined' && jatos !== null && typeof jatos.submitResultData === 'function';
}

/**
 * Query string of the study link. Inside JATOS the component page's own address need not
 * carry the study link's parameters (?version=, ?debug=, PROLIFIC_PID, ...); jatos.js keeps
 * them in jatos.urlQueryParameters. Parameters in the page's own address come first.
 */
function studySearch() {
    const parameters = new URLSearchParams(window.location.search);
    const fromJatos = inJatos() && jatos.urlQueryParameters ? jatos.urlQueryParameters : {};
    for (const [key, value] of Object.entries(fromJatos)) {
        if (!parameters.has(key) && value != null) parameters.append(key, String(value));
    }
    const search = parameters.toString();
    return search ? '?' + search : '';
}

/**
 * Balanced assignment through the JATOS batch session: it counts how many starts each version
 * got (assigned_1 .. assigned_4) and gives the next start the version with the fewest, the lowest
 * version on a tie, so starts go 1,2,3,4,1,... A batch session change that collides with another
 * participant's is refused by JATOS (batch session versioning), and the choice is made again.
 */
function assignBalancedVersion(attempt = 0) {
    const counts = [1, 2, 3, 4].map(version => Number(jatos.batchSession.get('assigned_' + version)) || 0);
    const index = counts.indexOf(Math.min(...counts));
    return Promise.resolve(jatos.batchSession.set('assigned_' + (index + 1), counts[index] + 1)).then(
        () => index + 1,
        error => {
            if (attempt >= 9) throw error;
            return new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))
                .then(() => assignBalancedVersion(attempt + 1));
        });
}

/**
 * Condition for this run. Links with ?version= (debugging, explicit tests) use that version.
 * Inside JATOS, links without it get a balanced version from the batch session (above). The
 * version is kept in the study session, so a reload (if the study allows reloads) keeps it.
 * If JATOS cannot assign one: links from Prolific (PROLIFIC_PID or SESSION_ID) show an error,
 * other links (e.g. an internal pilot) draw the version at random in the browser
 * (condition_assignment = random_local, simple randomization).
 * Outside JATOS (opened from the files or another web server) only ?version= starts the study.
 */
function startWithCondition(start) {
    if (!inJatos()) return start(resolveExperimentCondition(window.location.search), 'url');
    jatos.onLoad(() => {
        const search = studySearch();
        const params = new URLSearchParams(search);
        const fromUrl = resolveExperimentCondition(search);
        if (fromUrl || params.has('version')) return start(fromUrl, 'url');
        const stored = String((jatos.studySessionData && jatos.studySessionData.assigned_version) || '');
        if (/^[1-4]$/.test(stored)) return start(EXPERIMENT_CONDITIONS[stored], 'jatos_reload');
        assignBalancedVersion().then(version => {
            // Remembering it is best effort: a failure here must not cost the assignment.
            const session = Object.assign({}, jatos.studySessionData, { assigned_version: version });
            return Promise.resolve(jatos.setStudySessionData(session)).then(() => version, () => version);
        }).then(version => start(EXPERIMENT_CONDITIONS[version], 'jatos'), () => {
            // Only the JATOS requests are handled here, so a later error can never start twice.
            if (!params.has('SESSION_ID') && !params.has('PROLIFIC_PID')) return start(EXPERIMENT_CONDITIONS[1 + Math.floor(Math.random() * 4)], 'random_local');
            start(null, 'jatos_failed');
        });
    });
}
