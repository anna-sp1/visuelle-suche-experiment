/**
 * Nicht interaktive KI-Ringe an den unveränderten CSV-Koordinaten.
 */
function renderRing(containerId, originalX, originalY, elementSize, originalWidth = ORIGINAL_BILD_BREITE, image = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Skalierungsfaktor des aktuellen Bildschirms berechnen
    const rect = container.getBoundingClientRect();
    let scale = rect.width ? (rect.width / originalWidth) : 1;
    let offsetX = 0, offsetY = 0;
    if (image && image.naturalHeight) {
        // Layout dimensions use the same CSS coordinate system as absolute left/top.
        // getBoundingClientRect() can include a surrounding transform and may differ
        // from the image box. object-fit: contain can also add empty margins.
        const boxWidth = image.clientWidth || image.offsetWidth;
        const boxHeight = image.clientHeight || image.offsetHeight;
        if (boxWidth && boxHeight) {
            scale = Math.min(boxWidth / originalWidth, boxHeight / image.naturalHeight);
            offsetX = (image.offsetLeft || 0) + (boxWidth - originalWidth * scale) / 2;
            offsetY = (image.offsetTop || 0) + (boxHeight - image.naturalHeight * scale) / 2;
        }
    }

    // 2. Originalgrößen berechnen
    // 0.9 (formerly 1.2, before that 1.6): AI rings another 25% smaller (08.11.2026) so that dense images overlap less.
    // Large rings stay wider than the diagonal of large symbols (size_px 35 at 1000 px width).
    const originalRadius = (elementSize === 'groß') ? (19 * 0.9 * 2) : (12 * 0.9 * 2);
    const originalDiameter = originalRadius * 2;
    const currentX = offsetX + originalX * scale;
    const currentY = offsetY + originalY * scale;
    const currentDiameter = originalDiameter * scale;

    const ringElement = document.createElement('div');
    ringElement.classList.add('ki-ring'); 
    ringElement.style.position = 'absolute'; // Wichtig für Skalierung
    ringElement.style.width = currentDiameter + 'px';
    ringElement.style.height = currentDiameter + 'px';
    ringElement.style.left = currentX + 'px';
    ringElement.style.top = currentY + 'px';

    ringElement.style.pointerEvents = 'none';
    container.appendChild(ringElement);
    return ringElement;
}

/** Entfernbare manuelle Zählhilfe, ausschließlich für Training ohne KI. */
function renderTrainingMarker(container, x, y, image) {
    const marker = document.createElement('div');
    marker.classList.add('ki-ring', 'training-marker');
    // Large source symbols use size_px=35 (diagonal ~50px); 56px (formerly 72px) still encloses them.
    const scale = image?.naturalWidth ? (image.clientWidth || image.offsetWidth || image.naturalWidth) / image.naturalWidth : 1;
    const diameter = 56 * scale;
    marker.style.width = diameter + 'px';
    marker.style.height = diameter + 'px';
    marker.style.left = x + 'px';
    marker.style.top = y + 'px';
    marker.style.pointerEvents = 'auto';
    marker.addEventListener('click', function(event) {
        event.stopPropagation();
        marker.remove();
    });
    container.appendChild(marker);
    return marker;
}

// Highlights the image quarter the agent is currently searching (feedback 11.11.2026: the search
// order should be visible where participants are looking, not only in the side panel).
// Same helper for the configuration demo and the AI trials, so both look identical.
function showSearchArea(containerId, direction) {
    const container = document.getElementById(containerId);
    if (!container?.querySelector) return;
    let area = container.querySelector(':scope > .ai-search-area');
    if (!area) {
        area = document.createElement('div');
        area.className = 'ai-search-area';
        area.setAttribute('aria-hidden', 'true');
        container.appendChild(area);
    }
    const [vertical, horizontal] = direction.split('_');
    area.style.top = vertical === 'top' ? '0' : '50%';
    area.style.left = horizontal === 'left' ? '0' : '50%';
}
function clearSearchArea(containerId) {
    document.getElementById(containerId)?.querySelector?.(':scope > .ai-search-area')?.remove();
}

// Faint grey lines dividing the image into its four search areas (feedback 11.11.2026).
// Used on the configuration/standard preview image and in the AI practice (calibration) block.
function showQuadrantLines(containerId) {
    const container = document.getElementById(containerId);
    if (!container?.querySelector || container.querySelector(':scope > .quadrant-lines')) return;
    const lines = document.createElement('div');
    lines.className = 'quadrant-lines';
    lines.setAttribute('aria-hidden', 'true');
    container.appendChild(lines);
}

// Number of base ticks a step is held: steps with a ring are held for ringMs, empty steps for one tick.
function searchHoldTicks(drawnCount, ringMs) {
    return drawnCount > 0 ? Math.max(1, Math.round(ringMs / SEARCH_TICK_MS)) : 1;
}
// Lights up the elements of the search order that belong to the current step (null clears).
// Elements carry data-dim (direction/background/size/type) and data-v (value).
function markSearchStep(root, step) {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll('[data-dim][data-v]').forEach(el =>
        el.classList.toggle('is-searching', !!step && step[el.dataset.dim] === el.dataset.v));
}
