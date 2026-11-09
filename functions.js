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
