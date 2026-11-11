const CUSTOMIZATION_DIMENSIONS = Object.freeze({
    direction: Object.freeze(['top_left', 'top_right', 'bottom_right', 'bottom_left']),
    background: Object.freeze(['dark', 'light']),
    size: Object.freeze(['large', 'small']),
    type: Object.freeze(['L', 'O'])
});
// Participant-facing category names, shared by the customization and standard screens so both conditions use identical wording.
const CUSTOMIZATION_LABELS = Object.freeze({
    direction: 'Search direction',
    background: 'Background characteristic',
    size: 'Letter size',
    type: 'Letter type'
});
// Participant-facing value names in the configuration panels (both conditions). Stored values stay unchanged.
const CUSTOMIZATION_VALUE_LABELS = Object.freeze({ dark: 'dark areas', light: 'light areas' });
function customizationValueLabel(value) {
    return CUSTOMIZATION_VALUE_LABELS[value] || value.replaceAll('_', ' ');
}
// Search order shown as numbered chips (1, 2, ...) instead of arrows; same in both conditions.
function orderChips(values) {
    return values.map((value, index) => `<span class="ord-chip" data-dim="direction" data-v="${value}"><b>${index + 1}</b>${customizationValueLabel(value)}</span>`).join('');
}
// Standard board: the same controls as in the customization board, filled in and not clickable.
function staticDirectionGrid(order) {
    const cell = q => `<div class="dir-cell dir-set dir-static" data-dim="direction" data-v="${q}" title="${q.replaceAll('_', ' ')}">${order.indexOf(q) + 1}</div>`;
    return `<div id="dir-grid" class="dir-static-grid">${['top_left', 'top_right', 'bottom_left', 'bottom_right'].map(cell).join('')}</div>`;
}
// Background, size, type: slot 1 = what is searched first, slot 2 = the remaining value (filled in automatically).
// Customization: slot 1 is a dropdown. Standard: the same two slots, filled in and not editable.
function orderSelectPair(dimension, id) {
    const options = CUSTOMIZATION_DIMENSIONS[dimension].map(v => `<option value="${v}">${customizationValueLabel(v)}</option>`).join('');
    return `<div id="opt-${id}" class="opt-pair sel-pair" data-key="${dimension}">
        <span class="sel-slot"><b class="opt-num">1</b><select id="sel-${id}" class="ord-select"><option value="" selected disabled>choose</option>${options}</select></span>
        <span class="sel-slot sel-auto"><b class="opt-num">2</b><span id="auto-${id}" class="sel-auto-val"></span></span>
    </div>`;
}
function staticOptionPair(dimension, order) {
    return `<div class="opt-pair sel-pair">${order.map((v, i) => `<span class="sel-slot sel-done" data-dim="${dimension}" data-v="${v}"><b class="opt-num">${i + 1}</b><span class="${i === 0 ? 'ord-select ord-select-static' : 'sel-auto-val'}">${customizationValueLabel(v)}</span></span>`).join('')}</div>`;
}

// Image label of the preview example; the example is fixed and always has 14 defects (verdict reject).
const PREVIEW_BADGE_TEXT = 'Example component with more than 10 defects (correct verdict: Reject)';

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
    // Direction: click the four image areas in order (last area implied). Background, size, type: choose the first
    // value in the dropdown; the remaining value is filled in automatically.
    const selectors = fixedSettings ? [] : ['background', 'size', 'type'].map((key, index) =>
        ({ key, pair: document.getElementById(`opt-${index + 2}`), select: document.getElementById(`sel-${index + 2}`),
           auto: document.getElementById(`auto-${index + 2}`), value: [] }));
    const dirGrid = fixedSettings ? null : document.getElementById('dir-grid');
    const dirOutput = fixedSettings ? null : document.getElementById('order-1');
    // No preset: direction starts empty and selects start on an empty placeholder, so every dimension needs an active choice.
    let dirOrder = dirGrid ? [] : null;
    const apply = document.getElementById(fixedSettings ? 'preview-btn' : 'apply-btn');
    const proceed = document.getElementById('proceed-btn');
    const wrapper = document.getElementById('preview-image-wrapper');
    // The four search areas are always outlined on the preview image (both conditions).
    showQuadrantLines('preview-image-wrapper');
    const image = document.getElementById('preview-image');
    const status = document.getElementById('status-text');
    let active = true, busy = false, generation = 0, interval;

    function dirComplete() { return !dirGrid || dirOrder.length === CUSTOMIZATION_DIMENSIONS.direction.length; }
    function selectsComplete() { return selectors.every(({ key, value }) => value.length === CUSTOMIZATION_DIMENSIONS[key].length); }
    function read() {
        if (fixedSettings) return fixedSettings;
        if (!dirComplete() || !selectsComplete()) return null;
        const starts = Object.fromEntries(selectors.map(({ key, value }) => [key, value[0]]));
        const orders = Object.fromEntries(selectors.map(({ key, value }) => [key, value]));
        return buildCustomization(starts, { direction: dirOrder, ...orders });
    }
    function refreshButtons() {
        const blocked = busy || !dirComplete() || !selectsComplete();
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
        dirOutput.innerHTML = dirComplete()
            ? orderChips(dirOrder)
            : dirOrder.length
                ? `${orderChips(dirOrder)}<span class="ord-hint">(click the next area)</span>`
                : '<span class="ord-hint">(click the first area)</span>';
    }
    function showOrders() {
        renderDirection();
        refreshButtons();
        selectors.forEach(({ key, pair, auto, value }) => {
            auto.textContent = value.length ? customizationValueLabel(value[1]) : '';
            // Slots carry their current value so they can light up during the demo.
            pair.querySelectorAll('.sel-slot').forEach((slot, i) => { slot.dataset.dim = key; if (value[i]) slot.dataset.v = value[i]; else delete slot.dataset.v; });
            pair.querySelectorAll('.sel-slot').forEach(slot => slot.classList.toggle('sel-done', value.length > 0));
        });
        return read();
    }
    function setBusy(value) {
        busy = value;
        refreshButtons();
        selectors.forEach(({ select }) => { select.disabled = value; });
        if (dirGrid) dirGrid.classList.toggle('dir-busy', value);
    }
    function dispose() { active = false; generation++; clearInterval(interval); }
    selectors.forEach(selector => selector.select.addEventListener('change', () => {
        if (!active || busy) return;
        const first = selector.select.value;
        selector.value = [first, ...CUSTOMIZATION_DIMENSIONS[selector.key].filter(v => v !== first)];
        showOrders();
    }));
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
            let index = 0, hold = 0;
            const board = document.querySelector('.cfg-board');
            // Board cells of the direction grid can be lit by direction.
            board?.querySelectorAll('.dir-cell[data-q]').forEach(cell => { cell.dataset.dim = 'direction'; cell.dataset.v = cell.dataset.q; });
            const ringMs = Number(document.getElementById('preview-speed')?.value) || PREVIEW_SEARCH_RING_MS;
            function draw(row) {
                renderRing('preview-image-wrapper', row.center_x, row.center_y,
                    truth(row.is_small) ? 'klein' : 'groß', image.naturalWidth, image);
                rendered.add(row);
            }
            interval = setInterval(() => {
                if (!current()) return;
                if (hold > 1) { hold--; return; }
                if (index === steps.length) { finish(); return; }
                const step = steps[index++];
                status.style.whiteSpace = 'pre-line';
                status.innerHTML = `<span class="ai-thinking">Searching</span><br><span style="color:#64748b; font-size:15px;">Area ${settings.direction.order.indexOf(step.direction) + 1} of ${settings.direction.order.length}: ${step.direction.replaceAll('_', ' ')}<br><span class="search-substep">${step.background} areas, ${step.size}, ${step.type}</span></span>`;
                showSearchArea('preview-image-wrapper', step.direction);
                markSearchStep(board, step);
                let drawn = 0;
                marked.forEach(row => {
                    if (rendered.has(row)) return;
                    const left = row.center_x <= image.naturalWidth / 2;
                    const top = row.center_y <= image.naturalHeight / 2;
                    const direction = `${top ? 'top' : 'bottom'}_${left ? 'left' : 'right'}`;
                    if (direction === step.direction && (truth(row.bg_dark) ? 'dark' : 'light') === step.background &&
                        (truth(row.is_small) ? 'small' : 'large') === step.size && row.shape === step.type) { draw(row); drawn++; }
                });
                hold = searchHoldTicks(drawn, ringMs);
            }, SEARCH_TICK_MS);
            function finish() {
                if (!current()) return;
                clearInterval(interval);
                clearSearchArea('preview-image-wrapper');
                markSearchStep(board, null);
                // Preserve existing CSV false positives outside L/O, formerly shown in the final scan.
                marked.filter(row => !rendered.has(row)).forEach(draw);
                const verdict = rendered.size > 10 ? 'reject' : 'pass';
                wrapper.classList.add(`preview-${verdict}`);
                status.innerHTML = '<span style="color:#64748b; font-size:15px;">&#10003; Search complete</span>';
                const verdictBox = document.createElement('div');
                verdictBox.className = `ai-agent-verdict ai-verdict-${verdict}`;
                verdictBox.textContent = `Final verdict: ${verdict.toUpperCase()}`;
                status.appendChild(verdictBox);
                // The image label (PREVIEW_BADGE_TEXT) states from the start that this example should be rejected,
                // so the red frame reads as the intended outcome, not as an error.
                setBusy(false);
            }

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
