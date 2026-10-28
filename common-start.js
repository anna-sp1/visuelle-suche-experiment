/** Shared beginning for all four versions.
 * Text source: existing prototype; original reference still missing (OPEN_QUESTIONS.md).
 */
function createCommonBeginning(jsPsych) {
const timeline = [];

function createInfoScreen(title, contentHtml, btnText = "Next") {
    return `
        <div style="background:#0f172a; padding:40px; color:white; font-family:sans-serif; text-align:center; border-radius: 8px; max-width: 600px; margin: 40px auto; border: 1px solid #334155;">
            <h2 style="color:#deff9a; margin-top:0;">${title}</h2>
            <div style="font-size: 18px; line-height: 1.6; margin-bottom: 30px; text-align: left;">
                ${contentHtml}
            </div>
            <div style="text-align: center;">
                <button id="custom-next-btn" class="action-btn btn-start" style="padding: 12px 30px;">${btnText}</button>
            </div>
        </div>
    `;
}

// ==========================================
// 2. STORY INTRO (VOR DEM TRAINING)
// ==========================================

// Participant information and consent: first screen of the study.
const consentH2 = 'font-size: 17px; margin: 22px 0 6px 0;';
const consent_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
    <div class="consent-screen doc-page" style="position: fixed; inset: 0; overflow-y: auto; background: #ffffff; color: #222222; font-family: Arial, Helvetica, sans-serif; font-size: 15.5px; line-height: 1.6; text-align: left; z-index: 9999;">
        <div style="max-width: 1120px; margin: 0 auto; padding: 40px 56px 56px 56px;">
            <div style="font-size: 13px; color: #555555;">German Aerospace Center (DLR)<br>${STUDY_INSTITUTE}</div>
            <h1 style="font-size: 26px; font-weight: bold; margin: 18px 0 6px 0;">Participant information and consent</h1>
            <p style="margin: 0 0 22px 0;">Welcome, and thank you for your interest in this study! Please read the following information carefully before deciding whether to take part.</p>
            <div style="border-top: 1px solid #c8c8c8;"></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 48px;">
                <div>
                    <h2 style="${consentH2}">About the study</h2>
                    <p style="margin: 0;">This study is conducted by the German Aerospace Center (DLR), ${STUDY_INSTITUTE}. We investigate how people work together with an AI-based assistance system in a simulated visual inspection task. Some aspects of the study can only be explained in full at the end. You will receive a complete explanation after you have finished.</p>
                    <h2 style="${consentH2}">Procedure</h2>
                    <p style="margin: 0 0 10px 0;">You will practise the inspection task, get to know an assistant, and then classify a series of images with its support. Afterwards, you will answer questions about your experience, including questions on hypothetical work scenarios, your attitudes towards technology and AI, and your age and gender.</p>
                    <p style="margin: 0;">The study takes about 30–35 minutes. The visual task may be tiring but there is no time pressure, and you can take short breaks between task blocks. There are no known risks beyond those of regular computer use.</p>
                    <h2 style="${consentH2}">Requirements and payment</h2>
                    <p style="margin: 0;">You must be at least 18 years old, have normal or corrected-to-normal vision, have no known colour vision deficiency, and use a desktop or laptop computer. You will receive ${PAYMENT_AMOUNT} via Prolific. Payment does not depend on your performance. If you end the study early, you can request partial payment via a Prolific message.</p>
                </div>
                <div>
                    <h2 style="${consentH2}">Data processing and voluntariness</h2>
                    <p style="margin: 0 0 10px 0;">Your decisions, response times and questionnaire answers are recorded. These data are collected to better understand how the assistance is perceived and used by different people. They do not allow any conclusions to be drawn about your identity. The only identifier is your Prolific ID. It is used for payment, to prevent repeated participation and to handle withdrawal requests, and it will be removed from the data set two weeks after data collection has ended. It will not be possible to link your data to your name.</p>
                    <p style="margin: 0 0 10px 0;">The study results will be published in anonymised form, that means your data cannot be linked to your ID or identity. The anonymised data will be stored for at least 10 years. In the spirit of Open Science, the collected data may be made available in an open data repository. The purpose, nature, and extent of any potential reuse cannot be determined at this time.</p>
                    <p style="margin: 0;">Participation in this study is voluntary. You can withdraw from the study at any time and without providing any reason. If you end the study early, none of your data will be saved.</p>
                    <h2 style="${consentH2}">Questions and withdrawal</h2>
                    <p style="margin: 0;">You can request the deletion of your data within two weeks after your participation. To do so, you just need to provide your Prolific ID. For any questions, or to withdraw your consent and request the deletion of your data, please write a message via the Prolific portal or an e-mail to ${CONTACT_EMAIL}.</p>
                </div>
            </div>
            <h2 style="font-size: 17px; margin: 26px 0 6px 0;">Data protection</h2>
            <p style="margin: 0 0 10px 0;">Data are transmitted encrypted via the service DataPipe and stored in a restricted-access project on the Open Science Framework (OSF) in Germany (Frankfurt). Only the research team has access. The study website is hosted on GitHub Pages. GitHub logs IP addresses for security purposes. These are not accessible to the research team and are not linked to your study data. The legal basis for processing is your consent (Art. 6(1)(a) GDPR). You have the right to access, rectification, erasure and restriction of processing of your data, and to lodge a complaint with a data protection supervisory authority.</p>
            <p style="margin: 0;">Data protection officer: ${DPO_CONTACT}</p>
            <div style="border-top: 1px solid #c8c8c8; margin-top: 26px;"></div>
            <h2 style="${consentH2}">Declaration of consent</h2>
            <ul style="margin: 0; padding-left: 22px;">
                <li>I have read the information about the study and its procedure. I know that I can contact the research team with any questions.</li>
                <li>I agree to take part in this study, which takes about 30–35 minutes.</li>
                <li>I agree to the collection and processing of my data as described above. My data are recorded and analysed pseudonymously by the German Aerospace Center (DLR), using my Prolific ID and without my name. Only the research team can link my data to my Prolific ID.</li>
                <li>Two weeks after data collection has ended, the Prolific IDs will be deleted from the data set. My data are then anonymous, and no one will be able to link them to me.</li>
                <li>I can withdraw my consent at any time without any disadvantages and request the deletion of all my data, by sending a message via Prolific or an e-mail. Once the Prolific IDs have been deleted, my data can no longer be identified and therefore can no longer be deleted.</li>
                <li>I agree that my anonymised data may be used for further research purposes, may be published in an open science repository, and will be stored for at least 10 years.</li>
                <li>I have had enough time to make my decision. I know that participation is voluntary and that I can stop at any time without giving reasons.</li>
            </ul>
            <div style="margin-top: 22px;">
                <label style="display: block; margin-bottom: 8px; cursor: pointer;"><input type="checkbox" id="consent-agree" style="width: 16px; height: 16px; vertical-align: -2px; margin-right: 10px;">I have read the declaration of consent above and agree to take part.</label>
                <label style="display: block; cursor: pointer;"><input type="checkbox" id="consent-age" style="width: 16px; height: 16px; vertical-align: -2px; margin-right: 10px;">I confirm that I am at least 18 years old.</label>
                <button id="consent-btn" style="margin-top: 20px; padding: 10px 26px; font-size: 15px; font-family: Arial, Helvetica, sans-serif; background: #9aa3ad; color: #ffffff; border: none; border-radius: 3px; cursor: not-allowed;" disabled>Start the study</button>
            </div>
        </div>
    </div>`,
    choices: [],
    data: { phase: 'consent' },
    on_load: function() {
        const agree = document.getElementById('consent-agree'), age = document.getElementById('consent-age');
        const button = document.getElementById('consent-btn');
        const update = () => {
            button.disabled = !(agree.checked && age.checked);
            button.style.background = button.disabled ? '#9aa3ad' : '#2b3a4a';
            button.style.cursor = button.disabled ? 'not-allowed' : 'pointer';
        };
        agree.addEventListener('change', update);
        age.addEventListener('change', update);
        button.addEventListener('click', () => {
            if (!(agree.checked && age.checked)) return;
            jsPsych.finishTrial({ phase: 'consent', consent_given: true });
        });
    }
};

const glasses_check_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
    <!-- Vollflächiger weißer Hintergrund passend zur Vorlage -->
    <div class="glasses-screen" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: white; color: black; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; z-index: 9999;">
        <div class="glasses-card" style="max-width: 900px; padding: 40px; text-align: center;">
            <p style="font-size: 24px; line-height: 1.4; margin-bottom: 80px;">
                This study involves looking closely at small shapes and colors on your screen. <br>If you normally wear glasses or contacts for computer work, please put them on now.
            </p>
            
            <div style="display: flex; flex-direction: column; align-items: flex-end; width: max-content; margin: 0 auto 50px auto; gap: 25px;">
                <label style="font-size: 18px; cursor: pointer; display: flex; align-items: center;">
                    I need glasses or contacts for computer work and I am wearing them now.
                    <input type="radio" name="glasses" value="1" style="margin-left: 20px; width: 22px; height: 22px; cursor: pointer;">
                </label>
                <label style="font-size: 18px; cursor: pointer; display: flex; align-items: center;">
                    I do not need glasses or contacts for computer work.
                    <input type="radio" name="glasses" value="0" style="margin-left: 20px; width: 22px; height: 22px; cursor: pointer;">
                </label>
            </div>
            
            <!-- Der Button ist anfangs unsichtbar, damit der User eine Option wählen muss -->
            <button id="glasses-next-btn" class="action-btn" style="padding: 12px 30px; display: none; margin: 0 auto; background-color: #32b5a1; color: white; border: none; border-radius: 4px; font-size: 18px; cursor: pointer;">Next</button>
        </div>
    </div>
    `,
    choices: [],
    on_load: function() {
        const radios = document.querySelectorAll('input[name="glasses"]');
        const nextBtn = document.getElementById('glasses-next-btn');

        // Button einblenden, sobald eine Option angeklickt wird
        radios.forEach(r => r.addEventListener('change', () => {
            nextBtn.style.display = 'block';
        }));

        nextBtn.addEventListener('click', () => {
            const selection = document.querySelector('input[name="glasses"]:checked');
            if (!selection) return;
            const selected = selection.value;
            
            // Hängt die Spalte "wearing_glasses" (mit 1 oder 0) global an ALLE Datensätze dieses Probanden im Log an
            jsPsych.data.addProperties({ wearing_glasses: parseInt(selected) });
            
            jsPsych.finishTrial();
        });
    }
};

let intro_timeline = [
    consent_trial, // Einwilligung zuerst
    glasses_check_trial, // <--- Startbildschirm mit Brillen-Abfrage
    {
        // Text 1
        type: jsPsychHtmlButtonResponse,
        stimulus: createInfoScreen(
            "Context", 
            `<p>Imagine you work for a company that manufactures and maintains metal components.</p>
             <p>You will examine simplified radiographic images to identify material defects. If a component exceeds a specific threshold of defects, it is considered unsafe and must be rejected.</p>
             <p>This task is safety-critical: missing a defect means a faulty part may fail once it is in use, while falsely rejecting a good part causes unnecessary cost and delay. Avoid both types of errors.</p>`
        ),
        choices: [], 
        on_load: () => document.getElementById('custom-next-btn').addEventListener('click', () => jsPsych.finishTrial())
    },
    {
        // Text 2
        type: jsPsychHtmlButtonResponse,
        stimulus: createInfoScreen(
            "The Task", 
            `<p>You will view component images one by one. Your task is to classify each part based on its defects.</p>
             <p>An <strong>L</strong> or an <strong>O</strong> is a defect. Ignore all other letters. Orange and blue letters as well as large and small ones are equally important.</p>
             <p>Flag a component as <strong><i style="color: #d9534f;">reject</i></strong> if it contains <strong style="color: #d9534f;">more than 10</strong> defects. Otherwise, flag it as <strong><i style="color: #5cb85c;">pass</i></strong>.</p>
             <p>You can click on defects to mark them for easier counting. Click again to deselect.</p>`
        ),
        choices: [], 
        on_load: () => document.getElementById('custom-next-btn').addEventListener('click', () => jsPsych.finishTrial())
    },
    {
        // Text 3
        type: jsPsychHtmlButtonResponse,
        stimulus: createInfoScreen(
            "Practice", 
            `<div style="text-align: center;">
                 <p>Next, you will practice the task.</p>
                 <p>Later in the study, you will work with an AI agent that also follows a search strategy. While practicing, pay attention to how you search the images: where do you start, and what do you look for first?</p>
                 <p>Use the buttons below to classify each component:</p>
                 <ul style="display: inline-block; text-align: left; margin: 10px auto;">
                     <li><strong><i style="color: #5cb85c;">pass</i></strong>: 10 or less defects</li>
                     <li><strong><i style="color: #d9534f;">reject</i></strong>: more than 10 defects</li>
                 </ul>
                 <p>Defects are <strong>Ls</strong> and <strong>Os</strong>.</p>
             </div>`, 
            "Next"
        ),
        choices: [], 
        on_load: () => document.getElementById('custom-next-btn').addEventListener('click', () => jsPsych.finishTrial())
    }
];

timeline.push({
    timeline: intro_timeline
});

// ==========================================
// 3. TRAINING LOOP
// ==========================================
let training_timeline = []; 
for (let t = 1; t <= ANZAHL_TRAINING_RUNDEN; t++) {
    const formatierteNummer = String(t).padStart(3, '0');
    const stimulusId = `stimulus_training_${formatierteNummer}`;
    const bildPfad = `data/generated/assets/manual_training_${formatierteNummer}/stimulus.jpg`;
    let active = false;

    const training_trial = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
        <div class="experiment-container">
            <div id="image-wrapper" class="image-container trial-image-container" style="position:relative; cursor: crosshair;">
                <img id="training-image" src="${bildPfad}" style="position:absolute; top:0; left:0; width: 100%; height: 100%; object-fit: contain; border-radius: 4px;" />
            </div>
            <div class="right-column">
                <div style="background:#1e2229; padding:20px; border-radius:10px; color:white; font-family:sans-serif; border: 2px solid #555;">
                    <h3 style="margin-top:0; border-bottom:1px solid #333; padding-bottom:10px;">TRAINING (${t}/${ANZAHL_TRAINING_RUNDEN})</h3>
                    <p style="line-height:1.5; margin-bottom:14px;">
                        <b><i style="color:#2e7d5b;">pass</i></b>: 10 or less defects<br>
                        <b><i style="color:#c0392b;">reject</i></b>: more than 10 defects<br><br>
                        Defects are <b>L</b>s and <b>O</b>s.
                    </p>
                    <p style="color:#e0e0e0; line-height:1.5;">You can click anywhere on the image to place a marker as a counting aid.</p>
                    <p style="color:#e0e0e0; line-height:1.5;">You can click on an existing marker to remove it.</p>
                </div>
                <div class="button-container" style="margin-top: 20px;">
                    <button id="btn-pass" class="action-btn" style="background-color: #5cb85c;" disabled>pass</button>
                    <button id="btn-reject" class="action-btn btn-reset" disabled>reject</button>
                </div>
            </div>
        </div>
        `,
        choices: [],
        data: { phase: 'manual_training', trial_index: t, stimulus_id: stimulusId },
        on_finish: function(data) {
            active = false;
            // jsPsych also supplies a global trial_index; preserve the requested training index.
            data.trial_index = t;
        },
        on_load: function() {
            active = true;
            const imageWrapper = document.getElementById('image-wrapper');
            const image = document.getElementById('training-image');
            const passBtn = document.getElementById('btn-pass');
            const rejectBtn = document.getElementById('btn-reject');
            let responseStart = null;
            function enableResponse() {
                if (!active || responseStart !== null || !image.naturalWidth || !image.naturalHeight) return;
                imageWrapper.style.setProperty('aspect-ratio', `${image.naturalWidth} / ${image.naturalHeight}`, 'important');
                responseStart = performance.now();
                passBtn.disabled = false;
                rejectBtn.disabled = false;
            }
            image.addEventListener('load', enableResponse);
            if (image.complete) enableResponse();
            
            // 1. Interaktion: Freien Marker setzen
            imageWrapper.addEventListener('click', function(e) {
                if (!active || responseStart === null) return;
                // Verhindern, dass ein Marker gesetzt wird, wenn man auf einen bereits bestehenden klickt
                if(e.target.classList.contains('ki-ring')) return;

                // X/Y Koordinaten des Klicks relativ zum Bild berechnen
                const rect = imageWrapper.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;

                renderTrainingMarker(imageWrapper, clickX, clickY, image);
            });

            // 3. Navigation & Datenspeicherung
            function endTrial(decision) {
                if (!active || responseStart === null) return;
                const rt = performance.now() - responseStart;
                const markerCount = imageWrapper.querySelectorAll('.training-marker').length;
                active = false;
                passBtn.disabled = true;
                rejectBtn.disabled = true;
                jsPsych.finishTrial({
                    phase: 'manual_training',
                    trial_index: t,
                    stimulus_id: stimulusId,
                    participant_verdict: decision,
                    participant_verdict_code: VERDICT_CODES[decision],
                    rt: rt,
                    manual_marker_count_at_response: markerCount
                });
            }

            passBtn.addEventListener('click', () => endTrial('pass'));
            rejectBtn.addEventListener('click', () => endTrial('reject'));
        }
    };
    
    training_timeline.push(training_trial);
}

timeline.push({
    timeline: training_timeline,
    conditional_function: () => !window.debugSkipTrials
});

// ==========================================
// SCREEN DIREKT NACH DEM TRAINING (alle vier Versionen)
// ==========================================
const practice_finished_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
    <div style="background:#0f172a; padding: 60px 40px; color:white; font-family:sans-serif; text-align:center; border-radius: 8px; max-width: 700px; margin: 40px auto;">
        <p style="font-size: 24px; line-height: 1.4; margin-bottom: 30px;">
            You have finished the practice.
        </p>
        <p style="font-size: 24px; line-height: 1.4; margin-bottom: 40px;">
            Your company has introduced an intelligent assistance system for defect detection. In this next phase, an AI agent will assist you during the task.
        </p>
        <button id="next-btn-practice-done" class="action-btn btn-start" style="padding: 12px 30px;">Next</button>
    </div>
    `,
    choices: [],
    on_load: function() {
        document.getElementById('next-btn-practice-done').addEventListener('click', () => jsPsych.finishTrial());
    }
};

timeline.push({
    timeline: [practice_finished_trial]
});




return timeline;
}
