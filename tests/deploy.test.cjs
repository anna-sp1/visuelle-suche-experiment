const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('the JATOS study archive ships every local file index.html loads, but not jatos.js', () => {
    const script = read('deploy/study.sh');
    const shipped = script.match(/^FILES=\(([^)]*)\)/m)[1].trim().split(/\s+/);
    const html = read('index.html');
    const local = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1])
        .filter(file => !/^https?:/.test(file) && file !== 'jatos.js');
    assert.ok(local.includes('experiment.js') && local.includes('style.css'));
    for (const file of ['index.html', ...local]) assert.ok(shipped.includes(file), `${file} missing from FILES in deploy/study.sh`);
    for (const file of shipped) assert.ok(fs.existsSync(path.join(root, file)), `${file} does not exist`);
    assert.ok(!shipped.includes('jatos.js'));
});

test('the Windows build script packs the same files and study as deploy/study.sh', () => {
    const sh = read('deploy/study.sh'), ps = read('deploy/build-study.ps1');
    const shList = name => sh.match(new RegExp(`^${name}=\\(([^)]*)\\)`, 'm'))[1].trim().split(/\s+/);
    const psList = name => [...ps.match(new RegExp(`^\\$${name} = @\\(([^)]*)\\)`, 'm'))[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
    assert.deepEqual(psList('Files'), shList('FILES'));
    assert.deepEqual(psList('Directories'), shList('DIRECTORIES'));
    const study = text => JSON.parse(text.match(/^\{\n  "version"[\s\S]*?\n\}$/m)[0].replace('$dir_name', 'visuelle_suche'));
    const fromSh = study(sh), fromPs = study(ps);
    fromSh.data.comments = fromPs.data.comments;
    assert.deepEqual(fromPs, fromSh);
});
