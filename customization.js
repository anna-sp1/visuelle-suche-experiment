const CUSTOMIZATION_DIMENSIONS = Object.freeze({
    direction: Object.freeze(['top_left', 'top_right', 'bottom_right', 'bottom_left']),
    background: Object.freeze(['dark', 'light']),
    size: Object.freeze(['large', 'small']),
    type: Object.freeze(['L', 'O'])
});

/** starts: first value per dimension (rotated order). orders: optional full order per dimension (free permutation). */
function buildCustomization(starts, orders = {}) {
    const result = {};
    for (const [dimension, values] of Object.entries(CUSTOMIZATION_DIMENSIONS)) {
        const custom = orders[dimension];
        if (custom) {
            if (custom.length !== values.length || !values.every(v => custom.includes(v))) throw new Error(`Invalid customization order: ${dimension}`);
            result[dimension] = Object.freeze({ start: custom[0], order: Object.freeze([...custom]) });
            continue;
        }
        const index = values.indexOf(starts[dimension]);
        if (index < 0) throw new Error(`Invalid customization dimension: ${dimension}`);
        result[dimension] = Object.freeze({ start: starts[dimension],
            order: Object.freeze([...values.slice(index), ...values.slice(0, index)]) });
    }
    return Object.freeze(result);
}

function customizationCombinations(settings) {
    const steps = [];
    for (const direction of settings.direction.order)
        for (const background of settings.background.order)
            for (const size of settings.size.order)
                for (const type of settings.type.order) steps.push({ direction, background, size, type });
    return steps;
}

function customizationData(agentId, settings) {
    const data = { agent_id: agentId };
    for (const [dimension, value] of Object.entries(settings)) {
        data[`custom_${dimension}_start`] = value.start;
        data[`custom_${dimension}_order`] = JSON.stringify(value.order);
    }
    return data;
}

function applyCustomization(settings) {
    participantCustomization = settings;
    probandenConfig = Object.entries(settings).map(([dimension, value]) => ({
        category: dimension === 'background' ? 'bg' : dimension,
        label: dimension[0].toUpperCase() + dimension.slice(1),
        value: value.start,
        valueLabel: value.start.replaceAll('_', ' '),
        order: [...value.order]
    }));
}

/** Owns one preview screen; a generation token rejects stale load responses. */
function mountSearchPreview(jsPsych, agentId, fixedSettings = null) {
    // Direction is set by clicking the four image areas in order (free order); the other categories use selects.
    const selectors = fixedSettings ? [] : ['background', 'size', 'type'].map((key, index) =>
        ({ key, input: document.getElementById(`val-${index + 2}`), order: document.getElementById(`order-${index + 2}`) }));
    const dirGrid = fixedSettings ? null : document.getElementById('dir-grid');
    const dirOutput = fixedSettings ? null : document.getElementById('order-1');
    let dirOrder = dirGrid ? [...CUSTOMIZATION_DIMENSIONS.direction] : null;
    const apply = document.getElementById(fixedSettings ? 'preview-btn' : 'apply-btn');
    const proceed = document.getElementById('proceed-btn');
    const wrapper = document.getElementById('preview-image-wrapper');
    const image = document.getElementById('preview-image');
    const status = document.getElementById('status-text');
    let active = true, busy = false, generation = 0, interval;

    function dirComplete() { return !dirGrid || dirOrder.length === CUSTOMIZATION_DIMENSIONS.direction.length; }
    function read() {
        if (fixedSettings) return fixedSettings;
        if (!dirComplete()) return null;
        const starts = Object.fromEntries(selectors.map(({ key, input }) => [key, input.value]));
        return buildCustomization(starts, { direction: dirOrder });
    }
    function refreshButtons() {
        const blocked = busy || !dirComplete();
        apply.disabled = blocked;
        proceed.disabled = blocked;
    }
    function renderDirection() {
        if (!dirGrid) return;
        dirGrid.querySelectorAll('[data-q]').forEach(cell => {
            const position = dirOrder.indexOf(cell.dataset.q);
            cell.textContent = position >= 0 ? String(position + 1) : '';
            cell.classList.toggle('dir-set', position >= 0);
        });
        dirOutput.textContent = dirComplete()
            ? dirOrder.map(v => v.replaceAll('_', ' ')).join(' → ')
            : `${dirOrder.map(v => v.replaceAll('_', ' ')).join(' → ')}${dirOrder.length ? ' → ' : ''}… (click the next area)`;
    }
    function showOrders() {
        renderDirection();
        refreshButtons();
        const settings = read();
        if (!settings) return null;
        selectors.forEach(({ key, order }) => { order.textContent = settings[key].order.map(v => v.replaceAll('_', ' ')).join(' → '); });
        return settings;
    }
    function setBusy(value) {
        busy = value;
        refreshButtons();
        selectors.forEach(({ input }) => { input.disabled = value; });
        if (dirGrid) dirGrid.classList.toggle('dir-busy', value);
    }
    function dispose() { active = false; generation++; clearInterval(interval); }
    selectors.forEach(({ input }) => input.addEventListener('change', showOrders));
    if (dirGrid) {
        const remaining = () => CUSTOMIZATION_DIMENSIONS.direction.filter(v => !dirOrder.includes(v));
        const pick = cell => {
            if (!active || busy) return;
            const q = cell.dataset.q;
            if (dirComplete()) dirOrder = [q];              // a click on a complete order starts a new one
            else if (!dirOrder.includes(q)) dirOrder.push(q);
            if (dirOrder.length === CUSTOMIZATION_DIMENSIONS.direction.length - 1) dirOrder.push(...remaining()); // last area is implied
            showOrders();
        };
        dirGrid.querySelectorAll('[data-q]').forEach(cell => {
            cell.addEventListener('click', () => pick(cell));
            cell.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(cell); } });
        });
    }
    showOrders();

    proceed.addEventListener('click', () => {
        if (!active || busy) return;
        const settings = showOrders();
        if (!settings) return;
        if (!fixedSettings) applyCustomization(settings);
        const data = fixedSettings ? { agent_id: agentId } : customizationData(agentId, settings);
        jsPsych.data.addProperties(data);
        dispose();
        jsPsych.finishTrial(data);
    });

    apply.addEventListener('click', () => {
        if (!active || busy) return;
        const settings = showOrders();
        if (!settings) return;
        if (!fixedSettings) applyCustomization(settings);
        const token = ++generation;
        setBusy(true);
        clearInterval(interval);
        wrapper.querySelectorAll('.ki-ring').forEach(ring => ring.remove());
        wrapper.classList.remove('preview-pass', 'preview-reject');
        // Existing prototype template, not verified against the missing reference.
        status.textContent = `... starting search with ${settings.size.start} ${settings.type.start}s on ${settings.background.start} areas in the ${settings.direction.start.replaceAll('_', ' ')} ...`;
        let rows = null, started = false;
        const current = () => active && generation === token;
        function fail() {
            if (!current()) return;
            generation++;
            clearInterval(interval);
            status.textContent = 'Preview could not be loaded.';
            setBusy(false);
        }
        function start() {
            if (!current() || started || !rows || !image.complete || !image.naturalWidth) return;
            started = true;
            const steps = customizationCombinations(settings);
            const rendered = new Set();
            const truth = value => value === true || value === 'True' || value === 'true' || value === 1;
            const marked = rows.filter(row => truth(row.bekommt_kreis));
            let index = 0;
            function draw(row) {
                renderRing('preview-image-wrapper', row.center_x, row.center_y,
                    truth(row.is_small) ? 'klein' : 'groß', image.naturalWidth, image);
                rendered.add(row);
            }
            interval = setInterval(() => {
                if (!current()) return;
                const step = steps[index++];
                status.style.whiteSpace = 'pre-line';
                status.innerHTML = `<span class="ai-thinking">Searching</span><br><span style="color:#64748b; font-size:15px;">Area ${settings.direction.order.indexOf(step.direction) + 1} of ${settings.direction.order.length}: ${step.direction.replaceAll('_', ' ')}<br><span class="search-substep">${step.background} areas, ${step.size}, ${step.type}</span></span>`;
                marked.forEach(row => {
                    const left = row.center_x <= image.naturalWidth / 2;
                    const top = row.center_y <= image.naturalHeight / 2;
                    const direction = `${top ? 'top' : 'bottom'}_${left ? 'left' : 'right'}`;
                    if (direction === step.direction && (truth(row.bg_dark) ? 'dark' : 'light') === step.background &&
                        (truth(row.is_small) ? 'small' : 'large') === step.size && row.shape === step.type) draw(row);
                });
                if (index === steps.length) {
                    clearInterval(interval);
                    // Preserve existing CSV false positives outside L/O, formerly shown in the final scan.
                    marked.filter(row => !rendered.has(row)).forEach(draw);
                    const verdict = rendered.size > 10 ? 'reject' : 'pass';
                    wrapper.classList.add(`preview-${verdict}`);
                    status.innerHTML = '<span style="color:#64748b; font-size:15px;">&#10003; Search complete</span>';
                    const verdictBox = document.createElement('div');
                    verdictBox.className = `ai-agent-verdict ai-verdict-${verdict}`;
                    verdictBox.textContent = `Final verdict: ${verdict.toUpperCase()}`;
                    status.appendChild(verdictBox);
                    setBusy(false);
                }
            }, Number(document.getElementById('preview-speed')?.value) || PREVIEW_SEARCH_STEP_MS);
        }
        image.addEventListener('load', start, { once: true });
        image.addEventListener('error', fail, { once: true });
        if (image.complete && !image.naturalWidth) { fail(); return; }
        Papa.parse('tabellen/preview_stimulus.csv', {
            // The source CSV ends with a newline; it is not an incomplete symbol row.
            download: true, header: true, dynamicTyping: true, skipEmptyLines: true,
            complete(result) {
                if (!current()) return;
                rows = result.data.filter(row => row.shape);
                if (result.errors?.length || !rows.length || rows.some(row => row.bekommt_kreis === undefined ||
                    !Number.isFinite(row.center_x) || !Number.isFinite(row.center_y))) { fail(); return; }
                start();
            }, error: fail
        });
    });
    return dispose;
}

function mountCustomizationPreview(jsPsych, agentId) {
    return mountSearchPreview(jsPsych, agentId);
}
