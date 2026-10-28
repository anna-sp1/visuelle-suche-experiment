const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
function boot(search, jatos) {
    const calls = { initialized: 0, properties: {}, timeline: null, events: [] };
    const context = vm.createContext({ crypto: require('node:crypto').webcrypto,
        URLSearchParams, setTimeout: fn => setImmediate(fn), ...(jatos ? { jatos } : {}),
        window: { location: { search } },
        document: { body: { innerHTML: '' } },
        jsPsychHtmlButtonResponse: 'button',
        jsPsychSurveyLikert: 'likert',
        jsPsychSurveyText: 'text',
        initJsPsych(options) {
            calls.initialized++;
            calls.finish = options.on_finish;
            return {
                data: {
                    get: () => ({ values: () => [{ pre_trust_1: 7 }] }),
                    addProperties(properties) {
                        Object.assign(calls.properties, properties);
                        calls.events.push('properties');
                    },
                    displayData() { calls.displayed = true; }
                },
                run(timeline) { calls.timeline = timeline; calls.events.push('run'); }
            };
        }
    });
    for (const file of ['conditions.js', 'config.js', 'functions.js', 'common-start.js', 'customization.js', 'standard.js', 'ai-trial.js', 'storage.js', 'experiment.js']) {
        if (file === 'experiment.js') {
            context.loadAiResources = (condition, options) => { calls.loaderOptions = options; return ({ then(fn) {
                fn(Array.from({ length: 40 }, (_, i) => ({ plan: {
                    phase: i < 10 ? 'ai_practice' : 'main_task', trial_index: i < 10 ? i + 1 : i - 9
                }, symbols: [] })));
                return { catch() {} };
            } }); };
            // Existing introduction/preview tests isolate the AI implementation, tested separately.
            context.createAiTrial = ({ plan }) => ({ type: 'button', data: plan,
                stimulus: () => 'stimulus_001.jpg DA02' });
        }
        vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
    }
    return { calls, context };
}

test('only explicit debug=1 enables partial loading and Submit never uploads debug data', () => {
    for (const version of [1, 3]) for (const suffix of ['', '&debug=1', '&debug=0', '&debug=true', '&debug=1&debug=1']) {
        const s = boot(`?version=${version}${suffix}`);
        const debug = suffix === '&debug=1';
        assert.equal(s.calls.loaderOptions.allowValidatedPartial, debug);
        if (!debug) continue;
        const nodes = {}, requests = [];
        s.context.document.getElementById = id => nodes[id] ||= {};
        s.context.fetch = async (...args) => { requests.push(args); return { ok: true }; };
        // Exercise the actual storage implementation from experiment's Submit/on_finish path.
        s.calls.timeline.at(-1).on_finish({});
        s.calls.finish();
        assert.equal(requests.length, 0);
        assert.equal(nodes['save-retry'].hidden, true);
        assert.equal(typeof nodes['save-download'].onclick, 'function');
    }
});

test('unique UUID, optional Prolific fields and Submit gate', () => {
    const a = boot('?version=1&PROLIFIC_PID=p&STUDY_ID=s&SESSION_ID=x');
    const b = boot('?version=1');
    assert.match(a.calls.properties.subject_id, /^[0-9a-f-]{36}$/);
    assert.notEqual(a.calls.properties.subject_id, b.calls.properties.subject_id);
    assert.equal(a.calls.properties.PROLIFIC_PID, 'p');
    assert.equal(a.calls.properties.STUDY_ID, 's');
    assert.equal(a.calls.properties.SESSION_ID, 'x');
    assert.equal(b.calls.properties.PROLIFIC_PID, undefined);
    let uploads = 0;
    a.context.showSubmission = () => uploads++;
    a.calls.finish(); assert.equal(uploads, 0);
    const submit = a.calls.timeline.at(-1);
    assert.equal(submit.stimulus, '<p>Thank you very much for taking part in this study. Your responses have been recorded, please click Submit to finish.</p>');
    assert.equal(submit.choices[0], 'Submit');
    submit.on_finish({}); a.calls.finish(); assert.equal(uploads, 1);
});

for (const [version, customization, predictability] of [
    [1, true, 'low'], [2, true, 'high'], [3, false, 'low'], [4, false, 'high']
]) {
    test(`?version=${version}: metadata, flow and agent name`, () => {
        const { calls, context } = boot(`?version=${version}`);
        assert.deepEqual(calls.properties, {
            subject_id: calls.properties.subject_id,
            agent_id: customization ? null : 'DA02',
            experiment_version: version,
            condition_assignment: 'url',
            customization_condition: customization ? 'customization' : 'standard',
            predictability_condition: predictability
        });
        assert.deepEqual(calls.events, ['properties', 'run']);
        const definition = vm.runInContext(`EXPERIMENT_CONDITIONS[${version}]`, context);
        assert.equal(definition.customizationEnabled, customization);
        assert.equal(definition.agentNameMode, customization ? 'participant' : 'fixed');
        assert.equal(definition.fixedAgentName, customization ? null : 'DA02');
        assert.ok(Object.isFrozen(definition));
        // No development loop/menu or admin configuration in normal runs.
        assert.ok(calls.timeline.every(node => !node.loop_function));
        assert.ok(calls.timeline[0].timeline[0].stimulus.includes('Declaration of consent')); // consent first
        assert.ok(calls.timeline[0].timeline[1].stimulus.includes('glasses'));
        assert.equal(calls.timeline[1].timeline.length, 5); // training retained
        assert.equal(calls.timeline[3].conditional_function(), !customization);
        assert.equal(calls.timeline[4].conditional_function(), customization);
        // Version 3 must not accidentally become the legacy admin mode.
        const roundHtml = calls.timeline[5].timeline[0].stimulus();
        assert.ok(!roundHtml.includes('admin-next-btn'));
        if (!customization) assert.ok(roundHtml.includes('DA02'));
    });
}

for (const search of ['', '?version=', '?version=0', '?version=5', '?version=abc',
    '?version=01', '?version=1.0', '?version=1&version=2', '?version=1&version=1',
    '?debug=1', '?debug=1&version=bad']) {
    test(`${search || '(no query)'}: configuration error without experiment start`, () => {
        const { calls, context } = boot(search);
        assert.equal(calls.initialized, 0);
        assert.equal(calls.timeline, null);
        assert.match(context.document.body.innerHTML, /Configuration error/);
    });
}

test('explicit debug tools retain URL condition during calibration without skipping trials', () => {
    const { calls } = boot('?version=3&debug=1');
    const tools = calls.timeline[0];
    const menu = tools.timeline[0];
    assert.equal(menu.choices.length, 2);
    menu.on_finish({ response: 1 });
    assert.equal(tools.loop_function(), true);
    assert.equal(tools.timeline[1].conditional_function(), true);
    menu.on_finish({ response: 0 });
    assert.equal(tools.loop_function(), false);
    assert.ok(calls.timeline[1].timeline[0].stimulus.includes('Declaration of consent'));
    assert.ok(calls.timeline[1].timeline[1].stimulus.includes('glasses'));
    assert.equal(calls.timeline[2].timeline.length, 5);
    assert.ok(calls.timeline[6].timeline[0].stimulus().includes('stimulus_001.jpg'));
    assert.equal(calls.properties.experiment_version, 3);
    assert.equal(calls.properties.customization_condition, 'standard');
    calls.finish(); // Debug completion must not upload.
    assert.equal(calls.displayed, undefined); // No completion action before Submit.
});

for (const flag of ['debug=0', 'debug=true', 'debug=01', 'debug=1&debug=0']) {
    test(`${flag}: no development menu`, () => {
        const { calls } = boot(`?version=1&${flag}`);
        assert.ok(calls.timeline.every(node => !node.loop_function));
    });
}

test('HTML loads condition definitions before the experiment', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.ok(html.indexOf('src="conditions.js"') < html.indexOf('src="experiment.js"'));
});

// A stub of jatos.js: one batch session shared by every start, with JATOS's versioning
// (`conflicts` sets are refused, as a concurrent change by another participant would be).
function jatosServer({ conflicts = 0, failing = false } = {}) {
    const batch = {};
    return {
        batch,
        participant(urlQueryParameters = {}, studySessionData = {}) {
            const stub = {
                urlQueryParameters, studySessionData, saved: null,
                onLoad: fn => fn(),
                submitResultData: async () => {},
                setStudySessionData: async data => { stub.saved = data; stub.studySessionData = data; },
                batchSession: {
                    get: key => batch[key],
                    set: async (key, value) => {
                        if (failing) throw new Error('batch channel closed');
                        if (conflicts > 0) { conflicts--; batch[key] = (batch[key] || 0) + 1; throw new Error('conflict'); }
                        batch[key] = value;
                    }
                }
            };
            return stub;
        }
    };
}
const settled = async () => { for (let i = 0; i < 40; i++) await new Promise(resolve => setImmediate(resolve)); };

test('JATOS: starts without ?version= get balanced versions from the batch session', async () => {
    const server = jatosServer();
    const versions = [];
    for (let i = 0; i < 9; i++) {
        const participant = server.participant();
        const { calls } = boot('', participant);
        await settled();
        versions.push(calls.properties.experiment_version);
        assert.equal(calls.properties.condition_assignment, 'jatos');
        assert.equal(participant.saved.assigned_version, calls.properties.experiment_version);
    }
    assert.deepEqual(versions, [1, 2, 3, 4, 1, 2, 3, 4, 1]);
    assert.deepEqual(server.batch, { assigned_1: 3, assigned_2: 2, assigned_3: 2, assigned_4: 2 });
});

test('JATOS: a refused batch session change chooses again from the updated counts', async () => {
    const server = jatosServer({ conflicts: 1 });
    const { calls } = boot('', server.participant());
    await settled();
    // The refused change was another start taking version 1, so this one gets version 2.
    assert.equal(calls.properties.experiment_version, 2);
    assert.deepEqual(server.batch, { assigned_1: 1, assigned_2: 1 });
});

test('JATOS: study link parameters, reloads and failures', async () => {
    const server = jatosServer();
    let s = boot('', server.participant({ version: '3', PROLIFIC_PID: 'p', SESSION_ID: 'x', debug: '0' }));
    assert.equal(s.calls.properties.experiment_version, 3);
    assert.equal(s.calls.properties.condition_assignment, 'url');
    assert.equal(s.calls.properties.PROLIFIC_PID, 'p');
    assert.deepEqual(server.batch, {}); // ?version= never counts in the batch session
    s = boot('', server.participant({ version: '7' }));
    assert.match(s.context.document.body.innerHTML, /Configuration error/);
    s = boot('', server.participant({}, { assigned_version: 4 }));
    assert.equal(s.calls.properties.experiment_version, 4);
    assert.equal(s.calls.properties.condition_assignment, 'jatos_reload');
    assert.deepEqual(server.batch, {});

    const broken = jatosServer({ failing: true });
    s = boot('', broken.participant({ STUDY_ID: 'pilot_intern' }));
    await settled();
    assert.equal(s.calls.properties.condition_assignment, 'random_local');
    assert.match(String(s.calls.properties.experiment_version), /^[1-4]$/);
    for (const prolific of [{ PROLIFIC_PID: 'p' }, { SESSION_ID: 'x' }]) {
        s = boot('', broken.participant(prolific));
        await settled();
        assert.equal(s.calls.initialized, 0);
        assert.match(s.context.document.body.innerHTML, /could not be started/);
    }
});

test('HTML loads jatos.js and no DataPipe plugin', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.ok(html.includes('<script src="jatos.js"></script>'));
    assert.ok(html.indexOf('src="jatos.js"') < html.indexOf('src="conditions.js"'));
    for (const file of ['index.html', 'conditions.js', 'config.js', 'storage.js', 'experiment.js']) {
        assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /pipe\.jspsych\.org|plugin-pipe|OSF_EXPERIMENT_ID/i, file);
    }
});
