# Datenschema

## Aktueller CSV-Export

Eine Zeile je abgeschlossenem jsPsych-Trial, UTF-8, CSV mit doppelten Anfuehrungszeichen und CRLF. Leere Zellen bedeuten nicht erhoben/null. record_index ist der eindeutige fortlaufende Zeilenindex (1-basiert); trial_index ist fuer Stimuli phasenlokal. Rohes response, stimulus-HTML und question_order werden im Analyseexport entfernt. Keine Symboltabellen in Antwortzeilen.

| Variablen | Typ / Codierung |
| --- | --- |
| subject_id | Kryptografische UUID v4 pro Seitenstart, crypto.randomUUID; bleibt fuer Retry und Download gleich. Neuladen beginnt eine neue Sitzung. |
| PROLIFIC_PID, STUDY_ID, SESSION_ID | Optionale URL-Strings, nur vorhanden falls uebergeben; keine Voraussetzung. |
| experiment_version | 1/2/3/4 |
| condition_assignment | url = Version aus ?version= im Link; datapipe = balancierte Zuweisung durch DataPipe (Link ohne version, mit SESSION_ID von Prolific oder mit STUDY_ID, z. B. interner Pilot ?STUDY_ID=pilot_intern); datapipe_reload = Seite mit derselben Prolific-ID neu geladen, gespeicherte Version wiederverwendet (nur mit PROLIFIC_PID). |
| customization_condition, predictability_condition | customization/standard und low/high |
| agent_id | DA02 bei Standard; uppercase Teilnehmer-Agent-ID bei Customization, zuvor null. jsPsych addProperties ergaenzt auch vorhandene Zeilen. |
| wearing_glasses | 1=benoetigt und traegt Sehhilfe; 0=benoetigt keine. Kein Yes/No-Surveyitem. |
| record_index | 1-basierter Exportzeilenindex |
| phase | manual_training, ai_practice, main_task; pre_perceptions, post_perceptions, final_perceptions, ai_perceptions, final_pattern_probe; pre_perceptions_intro, main_task_transition, post_task_intro, responsibility_scenario, final_questionnaire_intro, submission. Aeltere Einfuehrungsseiten haben ggf. keine phase. |
| scale | ownership, satisfaction, trust, responsibility, manipulation, attitude bei Skalen |
| trial_index | Training 1-5, AI Practice 1-10, Main 1-30; sonst jsPsych-Index |
| trial_type, internal_node_id, time_elapsed | jsPsych Pluginname, Timeline-Knoten-ID und kumulative Millisekunden (soweit vom Plugin geliefert) |
| rt | Millisekunden; Stimuli ab geladenem Bild bis Antwort, AI einschliesslich Animation; Surveys nach Pluginmessung |
| stimulus_id | Quellenkennung des Stimulus |
| participant_verdict, participant_verdict_code | pass=1, reject=2; zentral VERDICT_CODES in config.js |
| manual_marker_count_at_response | Anzahl verbleibender manueller Trainingsmarker |
| specified_misses, specified_false_alarms | Ganze Zahlen aus Excel |
| agent_verdict | Pass/Reject exakt aus Trialplan |
| agreement_with_agent, response_correct | Boolean: Uebereinstimmung bzw. Richtigkeit gegen echte L/O-Defekte (>10 reject) |
| search_animation_duration_ms | Gemessene Dauer der KI-Suchanimation |
| preprocessing_seed | Fester Seed des generierten Plans |
| miss_symbol_ids, false_alarm_symbol_ids, ai_marked_symbol_ids, error_symbol_ids | JSON-Listen konkreter IDs; nur diese mehrwertigen Zuordnungen bleiben JSON |
| submitted | true auf der Abschlusszeile nach Submit |

## Survey-Spalten

Alle folgenden Likert-Felder sind ganzzahlig 1-7. Pluginindices 0-6 werden einmalig in on_finish um 1 erhoeht. Der Export validiert den Wertebereich erneut und verweigert bei Fehlern den Upload. Keine automatische Umpolung von Ownership Item 4.

- pre_ownership_1, pre_ownership_2, pre_ownership_3, pre_ownership_4
- pre_satisfaction_1, pre_satisfaction_2, pre_satisfaction_3
- attention_check_1: Instructed-Response-Item im pre-Satisfaction-Block (3. Position). Korrekte Antwort = 3 ("Somewhat disagree"); jeder andere Wert = nicht bestanden. Kein Bestandteil der Satisfaction-Skala.
- pre_trust_1, pre_trust_2
- post_satisfaction_1, post_satisfaction_2, post_satisfaction_3
- post_trust_1, post_trust_2
- responsibility_self, responsibility_agent
- manip_customized, manip_instructions, manip_search_strategy, manip_search_order, manip_predictable
- ai_attitude_1, ai_attitude_2, ai_attitude_3, ai_attitude_4, ai_attitude_5, ai_attitude_6
- suspicion_ai_real: 1 Item (1-7) nach GAAIS; nur fuer Sensitivitaetsanalyse.
- ati_1, ati_2, ati_3, ati_4: ATI-S, ganzzahlig 1-6 (6-stufig, Original-Format). Items 3 und 4 werden NICHT im Experiment umgepolt (Auswertung: 7 - Wert).

## Einwilligung, Demografie und Widerspruch

- consent_given: true auf der Einwilligungszeile (erster Bildschirm, phase consent).
- age: ganze Zahl 18-99; gender: woman / man / non_binary / other / prefer_not_to_say (phase final_demographics); education (höchster Abschluss, vereinfacht nach ISCED 2011): none_or_primary / lower_secondary / upper_secondary / vocational / bachelor / master / doctorate / prefer_not_to_say. Für den Bericht z. B. zusammenfassen: kein Hochschulabschluss (none_or_primary, lower_secondary, upper_secondary), berufliche Qualifikation (vocational), Hochschulabschluss (bachelor, master, doctorate).
- data_use_consent: Zustimmung nach dem Debriefing, YES_NO_CODES yes=1/no=2 (phase submission). Bei 2 wird nichts hochgeladen und kein CSV-Download angeboten; die Prolific-Weiterleitung bleibt.
- Angaben fuer Einwilligung und Debriefing stehen zentral in config.js (STUDY_INSTITUTE, CONTACT_EMAIL, DPO_CONTACT, PAYMENT_AMOUNT). Platzhalter in [ ] muessen vor der Liveschaltung ersetzt werden.
- Abschlussseite (storage.js): 'Thank you for taking part!' mit Statuszeile; Retry/Download CSV erscheinen nur bei Uebertragungsfehler, Debug-Lauf oder Validierungsfehler.

Anker (alle Stufen verbalisiert): 1=Strongly disagree, 2=Disagree, 3=Somewhat disagree, 4=Neither agree nor disagree, 5=Somewhat agree, 6=Agree, 7=Strongly agree; nur AI attitude: 1=Not at all, 7=Definitely.

Pattern-Spalten (Erkennen der Muster, alle Bedingungen): defect_pattern_choice = dark/light/no_difference (richtig: dark, Defekte liegen überwiegend auf dunklem Hintergrund); ai_error_pattern_choice = orange/blue/no_difference (richtig: orange in High, no_difference in Low, dort sind die KI-Fehler exakt 50/50 verteilt). *_choice_order = gezeigte Reihenfolge der Optionen (die ersten beiden pro Person zufällig, no_difference immer zuletzt). *_confidence = Sicherheit in die vorherige Antwort, 1 (not at all confident) bis 7 (very confident). Die Fragen stehen als Bestwette ("Even if you are not sure, please give your best guess") nach den Manipulationsitems; es gibt keine Ja/Nein- oder Freitextfrage mehr.

## Customization und Standard

custom_direction_start: top_left/top_right/bottom_right/bottom_left; custom_background_start: dark/light; custom_size_start: large/small; custom_type_start: L/O. custom_direction_order, custom_background_order, custom_size_order, custom_type_order: JSON-Listen der vollstaendigen Reihenfolge. Diese Felder werden bei Proceed global gespeichert.

standard_change_options und standard_change_option_labels: JSON-Listen stabiler IDs bzw. sichtbarer Texte. Zusaetzlich flache Boolean-Spalten standard_change_name_selected, standard_change_search_strategy_selected, standard_change_other_selected, standard_change_none_selected. Original-Freitexte: standard_change_name_text, standard_change_search_strategy_text, standard_change_other_text; nicht gestellte Fragen null. Ausgewaehlte Freitexte stehen auch als globale Eigenschaften zur Verfuegung.

## Submit, Fehler und Wiederholung

Prolific: Nach bestaetigtem Upload Weiterleitung auf PROLIFIC_COMPLETION_URL (config.js), nur wenn gesetzt und PROLIFIC_PID sowie SESSION_ID in der URL stehen. Fehlschlaege der Weiterleitung aendern die Erfolgsmeldung nicht.

Erst Submit beendet die Timeline und startet den vorhandenen DataPipe-POST an https://pipe.jspsych.org/api/data/ mit experimentID, filename=proband_<subject_id>.csv und data=Analyse-CSV. Erfolg wird erst nach HTTP-Erfolg und message="Success" bestaetigt. Bei Fehlern bleiben CSV und jsPsych-Daten im Tab; Retry sendet denselben Dateinamen und unveraenderten CSV-Inhalt. Download CSV ist jederzeit auf dem Speicherbildschirm moeglich. Debug sendet nichts und bietet nur lokalen Download. Bei ungueltigen Analysewerten kein Upload; Download der Rohdaten ausschliesslich zur Fehlerrettung (nicht als validierter Analysedatensatz). Schliessen/Neuladen des Tabs vor Download oder erfolgreichem Upload verliert den nicht persistenten Speicher. Keine weiteren Dienste, keine automatische lokale Ablage.

## Plan-Dateien (keine Teilnehmer-Antwortspalten)

## Vorverarbeitete Condition-Pläne (Schema; Ausgabe aktuell blockiert)

Geplante Dateien: `data/generated/conditions/v1_trials.json` bis `v4_trials.json`. Planfelder: `experiment_version`, `customization_condition`, `predictability_condition`, `seed` (Standard 20260909), `preprocessing_algorithm` (`predictability-v1`), `error_sequence_scope`, `trials` (10 AI Practice + 30 Main).

Jeder KI-Trial übernimmt die Excel-Spezifikation unverändert und ergänzt:

| Feld | Bedeutung |
| --- | --- |
| `symbols` | Symbolverzeichnis mit `symbol_id`, `source_csv_row`, `shape`, `color` (orange/blue), `size` (small/large). Originalkoordinaten etc. bleiben in der referenzierten CSV. |
| `symbol_id` | Stabiler Identifier `<stimulus_id>_s001` usw.; s001 entspricht CSV-Zeile 2 nach Header. |
| `ai_marked_symbol_ids` | Tatsächlich von der KI zu markierende Symbole, in CSV-Reihenfolge. Keine neue Auswahl zur Laufzeit. |
| `miss_symbol_ids` | Nicht markierte L/O, unabhängig von Farbe/Größe |
| `false_alarm_symbol_ids` | Markierte Nicht-L/O |
| `error_symbol_ids` | Explizite sequenzielle Fehlerliste, enthält jeden Miss/FA genau einmal. Low-Serienprüfung nutzt diese Reihenfolge einschließlich Trial-/Phasengrenzen. Die spätere Darstellung darf diese Sequenz nicht stillschweigend durch eine neue Zufallsreihenfolge ersetzen. |
| `seed` | Fester Preprocessing-Seed |
| `preprocessing_algorithm` | Algorithmusversion |
| `predictability_condition` | low/high |
| `balance_score` | Technisches Optimierungsmaß, siehe scripts/README.md; keine experimentelle Antwortvariable |

`specified_misses`, `specified_false_alarms` und `agent_verdict` stammen weiterhin aus Excel. Verdict bleibt exakt `Pass`/`Reject`, ohne Ableitung aus Ringanzahlen. Es gibt bei einem Validierungsfehler keine gültigen v1–v4-Ausgaben. Aktuelle Blocker: PREDICTABILITY_VALIDATION.md.

