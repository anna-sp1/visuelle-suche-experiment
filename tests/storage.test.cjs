const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
// jatos: a stub of jatos.js whose submitResultData answers with `submit`; false = page outside JATOS.
function setup({ jatos = true, search = '', submit = async () => {} } = {}) {
 const nodes = {}, requests = [], ended = [];
 const stub = jatos && {
  urlQueryParameters: {},
  submitResultData: async data => { requests.push(data); return stub.submit(data); },
  endStudyWithoutRedirect: async () => { ended.push('end'); },
  abortStudyWithoutRedirect: async message => { ended.push('abort:' + message); },
  submit
 };
 const context = vm.createContext({ YES_NO_CODES:{yes:1,no:2}, VERDICT_CODES:{pass:1,reject:2}, dateiName:'unique.csv', PROLIFIC_COMPLETION_URL:'',
 URLSearchParams, setTimeout, window:{location:{search}},
 document:{body:{innerHTML:''}, getElementById:id => nodes[id] ||= {}},
 fetch:async () => { throw new Error('No other service may be contacted'); }
 });
 if (stub) context.jatos = stub;
 vm.runInContext(fs.readFileSync('conditions.js','utf8'),context);
 vm.runInContext(fs.readFileSync('storage.js','utf8'),context);
 return {context,nodes,requests,ended,stub};
}
const settle = () => new Promise(resolve=>setImmediate(resolve));
test('export validates every scale boundary and Yes/No; text and named selections survive CSV',()=>{
 const {context:c}=setup();
 for(let value=1;value<=7;value++) {
  const rows=c.prepareExportRows([{pre_ownership_1:value,ai_attitude_6:value,defect_pattern_confidence:value,data_use_consent:1,ai_error_pattern_choice:'orange',defect_pattern_text:'a,"b"\nline',standard_change_options:'["name"]',response:0}]);
  assert.equal(rows[0].pre_ownership_1,value); assert.equal(rows[0].standard_change_name_selected,true);
  assert.equal(rows[0].response,undefined);
  assert.match(c.analysisCsv(rows), /a,""b""\nline/);
 }
 for(const value of [0,8,-1,'1']) assert.throws(()=>c.prepareExportRows([{post_trust_1:value}]), /Invalid Likert/);
 for(const value of [0,3,'1']) assert.throws(()=>c.prepareExportRows([{data_use_consent:value}]), /Invalid Yes/);
 for(const value of ['green','',1]) assert.throws(()=>c.prepareExportRows([{ai_error_pattern_choice:value}]), /Invalid choice/);
});
test('failed JATOS upload retains identical CSV for retry; success only after confirmation, then the study ends',async()=>{
 const s=setup({submit:async()=>{throw new Error('offline');}}); const psych={data:{get:()=>({values:()=>[{post_trust_1:7}]})}};
 s.context.showSubmission(psych,false); await settle();
 assert.equal(s.requests.length,1); assert.equal(s.nodes['save-retry'].disabled,false);
 assert.match(s.nodes['save-status'].textContent,/could not be confirmed/);
 assert.deepEqual(s.ended,[]); // a failed upload never ends the study result
 s.stub.submit=async()=>{};
 await s.nodes['save-retry'].onclick(); await settle();
 assert.equal(s.requests[0],s.requests[1]);
 assert.match(s.requests[0],/"post_trust_1"/);
 assert.match(s.nodes['save-status'].textContent,/Data saved/);
 assert.deepEqual(s.ended,['end']);
 assert.equal(typeof s.nodes['save-download'].onclick,'function');
});
test('debug, invalid coding and pages outside JATOS never upload and retain download',async()=>{
 for(const [debug,row,jatos] of [[true,{pre_trust_1:1},true],[false,{pre_trust_1:0},true],[false,{pre_trust_1:1},false]]) {
  const s=setup({jatos}); s.context.showSubmission({data:{get:()=>({values:()=>[row]})}},debug);
  await settle();
  assert.equal(s.requests.length,0); assert.deepEqual(s.ended,[]); assert.equal(s.nodes['save-retry'].hidden,true);
  assert.equal(s.nodes['save-download'].hidden,false);
  assert.equal(typeof s.nodes['save-download'].onclick,'function');
 }
});
test('withdrawn consent uploads nothing and aborts the JATOS study result', async()=>{
 const s=setup(); s.context.showSubmission({data:{get:()=>({values:()=>[{pre_trust_1:1},{data_use_consent:2}]})}},false);
 await settle();
 assert.equal(s.requests.length,0); assert.deepEqual(s.ended,['abort:data_use_consent: no']);
 assert.match(s.nodes['save-status'].textContent,/have not been saved/);
 assert.equal(s.nodes['save-download'].hidden,true);
});
test('a failure while ending the study never takes back a confirmed upload', async()=>{
 const s=setup(); s.stub.endStudyWithoutRedirect=()=>{throw new Error('gone');};
 s.context.showSubmission({data:{get:()=>({values:()=>[{pre_trust_1:1}]})}},false);
 await settle();
 assert.match(s.nodes['save-status'].textContent,/Data saved/);
 assert.notEqual(s.nodes['save-retry'].hidden,false);
});
test('Prolific redirect follows the study link parameters JATOS keeps, only after the study ended', async()=>{
 const s=setup(); s.context.PROLIFIC_COMPLETION_URL='https://app.prolific.com/submissions/complete?cc=X';
 s.stub.urlQueryParameters={PROLIFIC_PID:'p',STUDY_ID:'s',SESSION_ID:'x'};
 const order=[]; s.stub.endStudyWithoutRedirect=async()=>{order.push('end');};
 s.context.setTimeout=(fn)=>{order.push('redirect'); fn();};
 s.context.showSubmission({data:{get:()=>({values:()=>[{pre_trust_1:1}]})}},false);
 await settle(); await settle();
 assert.deepEqual(order,['end','redirect']);
 assert.equal(s.context.window.location.href,'https://app.prolific.com/submissions/complete?cc=X');
 assert.match(s.nodes['save-status'].textContent,/redirected to Prolific/);
});

test('local download preserves CSV contents, filename and text without a network request', async()=>{
 const s=setup(); let blob, filename, clicked=false, revoked=false;
 s.context.Blob=Blob;
 s.context.URL={createObjectURL(value){blob=value;return 'blob:test';},revokeObjectURL(){revoked=true;}};
 s.context.document.createElement=()=>({click(){clicked=true;filename=this.download;},remove(){}});
 s.context.document.body.appendChild=()=>{};
 s.context.showSubmission({data:{get:()=>({values:()=>[{pre_trust_1:7,defect_pattern_noticed:2,ai_error_pattern_noticed:1,ai_error_pattern_text:'quote " and\nnewline'}]})}},true);
 s.nodes['save-download'].onclick();
 assert.equal(filename,'unique.csv'); assert.ok(clicked && revoked);
 assert.equal(s.requests.length,0);
 const csv=await blob.text();
 assert.match(csv,/"7","2","1","quote "" and\nnewline"/);
 assert.ok(!csv.includes('"0"'));
});

test('older JATOS without the *WithoutRedirect names still ends the study', async()=>{
 const s=setup(); delete s.stub.endStudyWithoutRedirect; s.stub.endStudyAjax=async()=>{s.ended.push('ajax');};
 s.context.showSubmission({data:{get:()=>({values:()=>[{pre_trust_1:1}]})}},false);
 await settle();
 assert.deepEqual(s.ended,['ajax']);
});
