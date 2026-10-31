const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('the JATOS study archive ships every local file index.html loads, but not jatos.js', () => {
    const script = read('deploy/build-study.py');
    const shipped = JSON.parse(script.match(/^FILES = (\[[^\]]*\])/m)[1].replace(/'/g, '"'));
    const html = read('index.html');
    const local = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1])
        .filter(file => !/^https?:/.test(file) && file !== 'jatos.js');
    assert.ok(local.includes('experiment.js') && local.includes('style.css'));
    for (const file of ['index.html', ...local]) assert.ok(shipped.includes(file), `${file} missing from build-study.py FILES`);
    for (const file of shipped) assert.ok(fs.existsSync(path.join(root, file)), `${file} does not exist`);
    assert.ok(!shipped.includes('jatos.js'));
});
