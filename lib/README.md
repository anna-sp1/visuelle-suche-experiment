# Lokal mitgelieferte Bibliotheken (19.11.2026)

Bisher von CDNs geladen (unpkg, jsDelivr, cdnjs); jetzt lokal, damit beim Aufruf der Studie keine IP-Adresse an Dritte geht
(Ethikantrag: „The study website is hosted on the same server“). Dateien unverändert von den bisherigen CDN-Adressen
heruntergeladen; nur die Zeile `//# sourceMappingURL=https://unpkg.com/…` am Ende der vier jsPsych-Dateien entfernt
(die Entwicklerwerkzeuge des Browsers hätten sonst beim Öffnen die Source-Map von unpkg nachgeladen).

| Datei | Version | Quelle |
|---|---|---|
| jspsych.js | jsPsych 7.3.4 | https://unpkg.com/jspsych@7.3.4 |
| plugin-html-button-response.js | 1.2.0 | https://unpkg.com/@jspsych/plugin-html-button-response@1.2.0 |
| plugin-survey-text.js | 1.1.3 | https://unpkg.com/@jspsych/plugin-survey-text@1.1.3 |
| plugin-survey-likert.js | 1.1.3 | https://unpkg.com/@jspsych/plugin-survey-likert@1.1.3 |
| jspsych.css | 7.3.4 (Schrift Open Sans eingebettet) | https://unpkg.com/jspsych@7.3.4/css/jspsych.css |
| daisyui.css | daisyUI 5.7.39 | https://cdn.jsdelivr.net/npm/daisyui@5.7.39/daisyui.css |
| papaparse.min.js | Papa Parse 5.4.1 | https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js |

Lizenzen: jsPsych MIT, daisyUI MIT, Papa Parse MIT.
