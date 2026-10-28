/**
 * GLOBALE EINSTELLUNGEN (Configuration)
 */

// Datenspeicherung: JATOS (jatos.js, siehe docs/JATOS.md). Keine ID nötig; die Daten
// gehen an die Studie auf dem JATOS-Server, von dem die Seite geladen wurde.

// Prolific: Completion-URL aus den Prolific-Studieneinstellungen hier einfügen,
// z. B. "https://app.prolific.com/submissions/complete?cc=ABC123".
// Leer lassen ("") = keine Weiterleitung. Weitergeleitet wird nur, wenn der Link
// von Prolific kommt (PROLIFIC_PID und SESSION_ID in der URL) und JATOS die Daten bestätigt hat.
const PROLIFIC_COMPLETION_URL = "";

// Angaben für Einwilligung und Debriefing. Platzhalter in [ ] VOR DER LIVESCHALTUNG ERSETZEN!
const STUDY_INSTITUTE = "Institute of System Architectures in Aeronautics";
const CONTACT_EMAIL = "anna.spier@dlr.de";
const DPO_CONTACT = "[DPO CONTACT]";
const PAYMENT_AMOUNT = "[AMOUNT]";

// Experiment-Parameter
const ANZAHL_TRAINING_RUNDEN = 5; 
// Shared verdict coding; see docs/DATA_SCHEMA.md. Independent of Yes/No coding.
const VERDICT_CODES = Object.freeze({ pass: 1, reject: 2 });
const YES_NO_CODES = Object.freeze({ yes: 1, no: 2 });
// AI practice/main search timing remains 32 combinations * 15 ms = 480 ms.
const SEARCH_STEP_MS = 80;
// Preview-only pacing requested for a visibly sequential demonstration (5.76 seconds).
const PREVIEW_SEARCH_STEP_MS = 180;
let participantCustomization = null;

// Probanden-ID und Dateiname
const subject_id = crypto.randomUUID();
const dateiName = `proband_${subject_id}.csv`;

// Die dynamische Suchkonfiguration (unabhängig von der Versionsnummer)
let probandenConfig = [
    { category: 'direction', value: STANDARD_SEARCH_STARTS.direction, label: 'Direction', valueLabel: STANDARD_SEARCH_STARTS.direction.replaceAll('_', ' ') },
    { category: 'bg', value: STANDARD_SEARCH_STARTS.background, label: 'Background', valueLabel: STANDARD_SEARCH_STARTS.background + ' areas' },
    { category: 'size', value: STANDARD_SEARCH_STARTS.size, label: 'Size', valueLabel: STANDARD_SEARCH_STARTS.size },
    { category: 'type', value: STANDARD_SEARCH_STARTS.type, label: 'Type', valueLabel: STANDARD_SEARCH_STARTS.type }
];

// Original-Auflösung der Bilder (für dynamische Skalierung)
const ORIGINAL_BILD_BREITE = 1920;
const ORIGINAL_BILD_HOEHE = 1080;
