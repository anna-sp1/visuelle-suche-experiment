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

        <!-- Gleiches Layout wie die Customization-Seite (Instruktion + Board), nur ohne Auswahlfelder -->
        <div class="preview-layout cfg-layout">

                <div id="preview-image-wrapper" style="grid-area: img; position:relative; width: min(100%, calc((100vh - 110px) * 1.25)); justify-self: end; aspect-ratio: 1000/800; background: #222; border: 2px solid #555; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    <img id="preview-image" src="bilder/preview_stimulus.jpg" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain;" />
                    <div id="preview-badge" style="position:absolute; bottom:10px; left:10px; background:rgba(0,0,0,0.7); color:white; padding:5px 10px; border-radius:4px; font-weight:bold;">${PREVIEW_BADGE_TEXT}</div>
                </div>

                <div id="instructions-text" class="cfg-instructions">
                    <strong>${agentId}</strong> was set up with a specific search order.<span style="display:block; height:6px;"></span>
                    Click <strong>Preview</strong> to run a demo (as often as you like), or <strong>Proceed</strong> once you are ready to practice the task with the agent.
                </div>

                <div class="cfg-board">
                    <div class="cfg-head">
                        <span class="cfg-name">${agentId}</span>
                        <div id="status-text" class="cfg-status"><span class="cfg-idle">Ready for preview...</span></div>
                    </div>
                    <div class="cfg-order">
                        <div class="cfg-order-label">Search order</div>
                        <div class="cfg-rows">
                            <div id="row-s1" class="cfg-row">
                                <strong>${CUSTOMIZATION_LABELS.direction}:</strong>
                                ${staticDirectionGrid(settings.direction.order)}
                                <output>${orderChips(settings.direction.order)}</output>
                            </div>
                            ${['background', 'size', 'type'].map((key, index) => `
                            <div id="row-s${index + 2}" class="cfg-row">
                                <strong>${CUSTOMIZATION_LABELS[key]}:</strong>
                                ${staticOptionPair(key, settings[key].order)}
                                <output></output>
                            </div>`).join('')}
                        </div>
                    </div>
                    <div class="cfg-foot">
                        <div class="cfg-speed">Demo speed:
                            <select id="preview-speed">
                                <option value="700">slow</option>
                                <option value="400" selected>normal</option>
                                <option value="150">fast</option>
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
            progress_optional: true,
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
