/** Supplied question wording is verbatim; reference checkbox layout is still missing. */
function createStandardPreparation(jsPsych, agentId) {
    const settings = buildCustomization(STANDARD_SEARCH_STARTS);
    let disposePreview = () => {};
    let selected = [];
    const options = [
        { id: 'name', label: 'The agent‘s name', prompt: 'How would you change the agent‘s name?' },
        { id: 'search_strategy', label: 'The agent‘s search strategy', prompt: 'How would you change the agent‘s search strategy?' },
        { id: 'other', label: 'Something else', prompt: 'What else would you change and how?' },
        { id: 'none', label: 'I wouldn‘t change anything' }
    ];
    const preview = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
        <style>
            .preview-pass { border: 4px solid #5cb85c !important; box-shadow: 0 0 15px rgba(92, 184, 92, 0.5) !important; transition: all 0.3s; }
            .preview-reject { border: 4px solid #d9534f !important; box-shadow: 0 0 15px rgba(217, 83, 79, 0.5) !important; transition: all 0.3s; }
        </style>

        <!-- Gleiches Layout wie die Customization-Seite, nur ohne Auswahlfelder -->
        <div class="preview-layout" style="display: grid; grid-template-columns: minmax(0, 1fr) 460px; grid-template-rows: auto 1fr; grid-template-areas: 'img status' 'img panel'; gap: 16px; width: min(1180px, calc(100vw - 40px)); margin: 8px auto; align-items: start;">

                <div id="preview-image-wrapper" style="grid-area: img; position:relative; width: min(100%, calc((100vh - 60px) * 1.25)); justify-self: end; aspect-ratio: 1000/800; background: #222; border: 2px solid #555; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    <img id="preview-image" src="bilder/preview_stimulus.jpg" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain;" />
                    <div style="position:absolute; bottom:10px; left:10px; background:rgba(0,0,0,0.7); color:white; padding:5px 10px; border-radius:4px; font-weight:bold;">Preview Example</div>
                </div>

                <div style="grid-area: status; background: #d0d0d0; border: 2px solid #333; padding: 14px 16px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; color: #444; font-family: sans-serif; min-height: 130px;">
                    <div style="background: #999; border: 2px solid #333; padding: 4px 18px; font-size: 20px; font-weight: bold; letter-spacing: 4px; color: #111; margin-bottom: 12px;">
                        ${agentId}
                    </div>
                    <div id="status-text" style="font-size: 16px; line-height: 1.5; text-align: left; width: 100%;">
                        <span style="color:#888; font-style:italic;">Ready for preview...</span>
                    </div>
                </div>

                <div style="grid-area: panel; background:#0f172a; padding:18px 18px; color:white; font-family:sans-serif; border-radius: 8px; border: 1px solid #334155; box-sizing: border-box;">
                    <div id="instructions-text" style="text-align:center; font-size: 14px; line-height: 1.4; margin-bottom: 10px;">
                        <strong>${agentId}</strong> has learned a specific search order based on defect-occurrence probabilities.<br><br>
                        Click <strong style="color: #32b5a1;">Preview</strong> to run a demo (as often as you like), or <strong style="color: #32b5a1;">Proceed</strong> once you are ready to practice the task with the agent.
                    </div>

                    <div style="display: flex; flex-direction: column; align-items: stretch; gap: 6px;">
                        ${Object.entries(settings).map(([key, value], index) => `
                        <div id="row-s${index + 1}" style="display: flex; align-items: center; gap: 15px; padding: 4px 10px; border-radius: 8px; width: 100%; box-sizing: border-box; grid-template-columns: minmax(100px, 120px) minmax(0, 1fr);">
                            <strong style="color:#32b5a1; font-size: 16px; width: 120px;">${key[0].toUpperCase() + key.slice(1)}:</strong>
                            <output style="font-size:14px;">${value.order.map(v => v.replaceAll('_', ' ')).join(' → ')}</output>
                        </div>`).join('')}
                    </div>

                    <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 12px; flex-wrap: wrap;">
                        <div style="display:flex; align-items:center; gap:6px; font-size:13px; color:#526276;">Demo speed:
                            <select id="preview-speed" style="padding: 4px 6px; font-size: 13px; border-radius: 4px;">
                                <option value="320">slow</option>
                                <option value="180" selected>normal</option>
                                <option value="70">fast</option>
                            </select>
                        </div>
                        <button id="preview-btn" class="action-btn" style="background:#555; padding: 9px 18px; width: 120px;">Preview</button>
                        <button id="proceed-btn" class="action-btn btn-start" style="padding: 9px 18px; width: 120px;">Proceed</button>
                    </div>
                </div>
        </div>`,
        choices: [],
        on_load() {
            jsPsych.data.addProperties({ agent_id: agentId });
            disposePreview = mountSearchPreview(jsPsych, agentId, settings);
        },
        on_finish() { disposePreview(); }
    };
    const changeQuestion = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `<div style="max-width:800px;margin:40px auto;text-align:left;">
            <p>If you were able to change anything about the agent‘s features to improve it, what would it be?</p>
            <p style="font-size:15px;color:#526276;margin-top:-6px;">Please select all that apply.</p>
            ${options.map(option => `<label style="display:block;margin:18px 0;"><input type="checkbox" name="standard-change" value="${option.id}"> ${option.label}</label>`).join('')}
            <p id="standard-change-error" style="display:none;color:#a32935;font-size:15px;">Please select at least one option.</p>
            <button id="standard-change-next" class="action-btn btn-start">Next</button>
        </div>`,
        choices: [],
        on_load() {
            let submitted = false;
            const boxes = [...document.querySelectorAll('input[name="standard-change"]')];
            const error = document.getElementById('standard-change-error');
            // "I wouldn't change anything" excludes all other options and vice versa.
            boxes.forEach(box => box.addEventListener('change', () => {
                if (!box.checked) return;
                error.style.display = 'none';
                boxes.forEach(other => {
                    if (other !== box && (box.value === 'none' || other.value === 'none')) other.checked = false;
                });
            }));
            document.getElementById('standard-change-next').addEventListener('click', () => {
                if (submitted) return;
                const chosen = options.filter(option => boxes.some(box => box.checked && box.value === option.id));
                if (!chosen.length) { error.style.display = 'block'; return; }
                submitted = true;
                selected = chosen.map(option => option.id);
                const data = {
                    agent_id: agentId,
                    standard_change_options: JSON.stringify(selected),
                    standard_change_option_labels: JSON.stringify(chosen.map(option => option.label)),
                    standard_change_name_text: null,
                    standard_change_search_strategy_text: null,
                    standard_change_other_text: null
                };
                jsPsych.data.addProperties(data);
                jsPsych.finishTrial(data);
            });
        }
    };
    const followups = options.filter(option => option.prompt).map(option => {
        const field = `standard_change_${option.id}_text`;
        return {
            timeline: [{
                type: jsPsychSurveyText,
                questions: [{ prompt: option.prompt, name: field, rows: 5 }],
                button_label: 'Next',
                on_finish(data) {
                    const text = data.response[field];
                    data[field] = text;
                    jsPsych.data.addProperties({ [field]: text });
                }
            }],
            conditional_function() { return selected.includes(option.id); }
        };
    });
        const thanks = {
        type: jsPsychHtmlButtonResponse,
        stimulus: '<p>Thank you for your feedback.</p>',
        choices: ['Next'],
        data: { phase: 'standard_change_thanks' }
    };
    return [preview, changeQuestion, ...followups, thanks];
}
