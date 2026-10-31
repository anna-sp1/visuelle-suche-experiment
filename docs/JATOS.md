# Datenspeicherung mit JATOS

Die WebApp läuft als Komponente einer JATOS-Studie ([jatos.org](https://www.jatos.org)). JATOS liefert die Seite aus, vergibt die Version (Condition) und speichert die Antworten. DataPipe und OSF werden nicht mehr verwendet.

## Was die WebApp mit JATOS macht

| Schritt | Umsetzung |
| --- | --- |
| Laden | `index.html` lädt `jatos.js` relativ (`<script src="jatos.js">`). JATOS stellt die Datei für jede Komponente bereit; sie gehört nicht in die Study Assets. Außerhalb von JATOS fehlt sie, und die WebApp verhält sich wie eine lokale Datei (siehe unten). |
| Linkparameter | Die Parameter des Studienlinks (`version`, `debug`, `PROLIFIC_PID`, `STUDY_ID`, `SESSION_ID`) liest die WebApp aus `jatos.urlQueryParameters`, ergänzt um die Parameter der Seitenadresse selbst (`studySearch()` in `conditions.js`). |
| Version | Ein Link mit `version=1` bis `4` nutzt diese Version (`condition_assignment = url`). Ohne `version` vergibt die **Batch Session** balanciert: Sie zählt die Starts je Version (`assigned_1` bis `assigned_4`), der nächste Start bekommt die Version mit den wenigsten, bei Gleichstand die niedrigste, also 1, 2, 3, 4, 1, … (`condition_assignment = jatos`). Gezählt werden Starts, nicht abgeschlossene Durchläufe, wie zuvor bei DataPipe. Gleichzeitige Starts weist JATOS über die Versionierung der Batch Session ab; die WebApp wählt dann neu. |
| Neuladen | Die vergebene Version steht in der Study Session (`assigned_version`). Erlaubt die Studie das Neuladen, behält ein neu geladener Durchlauf seine Version (`condition_assignment = jatos_reload`). |
| Ausfall | Kann JATOS keine Version vergeben: Links von Prolific (`PROLIFIC_PID` oder `SESSION_ID`) zeigen „The study could not be started“; andere Links (z. B. interner Pilot) ziehen die Version im Browser zufällig (`condition_assignment = random_local`). |
| Speichern | Erst nach **Submit** sendet die WebApp die Analyse-CSV mit `jatos.submitResultData` als Ergebnisdaten des Durchlaufs. Erst nach Bestätigung durch JATOS erscheint „Data saved“; danach beendet sie den Durchlauf (`endStudyWithoutRedirect`, Status FINISHED). Bei Fehlern bleiben Retry und Download CSV; Retry sendet denselben CSV-Text und ersetzt die vorherigen Ergebnisdaten. |
| Einwilligung zurückgezogen | Wird nach dem Debriefing „No“ gewählt, wird nichts gesendet. Der Durchlauf wird abgebrochen (`abortStudyWithoutRedirect`, Status ABORTED, Nachricht `data_use_consent: no`); JATOS behält dabei keine Ergebnisdaten. |
| Prolific | Wie bisher: Weiterleitung auf `PROLIFIC_COMPLETION_URL` (`config.js`), nur wenn gesetzt und `PROLIFIC_PID` und `SESSION_ID` im Studienlink stehen, und erst nachdem JATOS den Durchlauf beendet hat. Die „End Redirect URL“ in den JATOS-Studieneinstellungen wird nicht verwendet und sollte leer bleiben. |
| Debug | `debug=1` sendet nichts an JATOS und bietet nur den lokalen CSV-Download. |

## Studie in JATOS einrichten

Server mit Docker aufsetzen und Studie hochladen: [deploy/README.md](../deploy/README.md).

1. Die Studie als Archiv importieren: `deploy/study.sh upload` (über die JATOS-API) oder `deploy/study.sh` und `deploy/dist/visuelle-suche.jzip` in JATOS über „Import study“ hochladen. Das Archiv enthält `index.html`, die Skripte, `style.css`, `bilder/`, `tabellen/` und `data/generated/`, aber nicht `jatos.js`, und legt die eine Komponente mit `index.html` an.
2. Von Hand geht es auch: neue Studie anlegen, dieselben Dateien in ihre Study Assets kopieren und eine Komponente mit der HTML-Datei `index.html` anlegen. Ein späterer Import des Archivs legt dann eine zweite Studie an, weil die UUID nicht übereinstimmt.
3. Die Option zum Neuladen („Allow reload“) nach Bedarf setzen. Ist sie aus, zeigt JATOS beim Neuladen eine Fehlerseite; ist sie an, behält der Durchlauf seine Version, beginnt aber von vorn (die Antworten liegen bis Submit nur im Tab).
4. Studienlinks anlegen. Für Prolific den Link mit den Prolific-Platzhaltern in Prolific eintragen:

   ```text
   https://<jatos-server>/publix/<study-code>?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}
   ```

   Ohne `version` vergibt die Batch Session die Version. Feste Version oder Test: `&version=2`, ohne Upload `&version=2&debug=1`.
5. Vor dem Start die Batch Session des verwendeten Batches leeren, damit Testdurchläufe nicht mitgezählt werden.

## Daten abrufen

Jeder Durchlauf hat in JATOS ein Ergebnis; seine Ergebnisdaten sind die vollständige Analyse-CSV dieses Durchlaufs (Spalten in [DATA_SCHEMA.md](DATA_SCHEMA.md)). `subject_id` und, falls übergeben, die Prolific-Felder stehen in jeder Zeile. Beim Export mehrerer Ergebnisse als ein Textdokument hängt JATOS die CSVs aneinander, jede mit eigener Kopfzeile; zum Einlesen entweder je Ergebnis exportieren oder an den Kopfzeilen trennen.

JATOS speichert zu jedem Ergebnis außerdem eigene Metadaten (Zeitpunkte, Status, Worker-Typ und die Linkparameter). Diese sind nicht Teil der CSV.

## Außerhalb von JATOS

Ohne `jatos.js` (Datei lokal geöffnet, lokaler Testserver, GitHub Pages) startet die WebApp nur mit `version=1` bis `4` im Link und sendet keine Daten: Der Speicherbildschirm meldet „This page was not opened from the study server“ und bietet Download CSV an.

## Noch nicht geprüft

Getestet sind die Abläufe gegen eine nachgebildete `jatos.js` in den Node-Tests (`tests/conditions.test.cjs`, `tests/storage.test.cjs`); die verwendeten Funktionen wurden mit `jatos.js` 3.11.3 abgeglichen. Ein Durchlauf auf einem echten JATOS-Server steht aus, ebenso die Bestaetigung der Angaben zur Datenverarbeitung in der Einwilligung (JATOS-Server in Hamburg, siehe [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md)).
