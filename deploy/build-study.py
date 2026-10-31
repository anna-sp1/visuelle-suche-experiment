"""Packs the experiment into a JATOS study archive (.jzip) for import into JATOS.

Usage (from anywhere):  python3 deploy/build-study.py [output.jzip]
Default output: deploy/dist/visuelle-suche.jzip

A JATOS study archive is a ZIP with one .jas file (the study's properties as JSON,
serial version 3, as JATOS 3.x exports it) and one directory, the study assets.
The UUIDs below are fixed: importing a newer archive updates the same study in
JATOS (its results stay) instead of creating a second one.
"""
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIR_NAME = 'visuelle_suche'

# What the page loads at runtime (index.html, its scripts, style.css, the preview
# image and table, and the prepared trial plans and stimuli). Source archives,
# docs, tests and build scripts stay out.
FILES = ['index.html', 'style.css', 'ai-trial.js', 'common-start.js', 'conditions.js', 'config.js',
         'customization.js', 'daisy-ui.js', 'experiment.js', 'functions.js', 'standard.js', 'storage.js']
DIRECTORIES = ['bilder', 'tabellen', 'data/generated']

STUDY = {
    'version': '3',
    'data': {
        'uuid': 'd6170cad-1259-4972-957c-b8aec8e1caa7',
        'title': 'Visuelle Suche Experiment',
        'description': 'Visual search with an AI assistant: four versions, balanced by the batch session.',
        'groupStudy': False,
        'linearStudy': False,
        'allowPreview': False,
        'dirName': DIR_NAME,
        'comments': 'Built by deploy/build-study.py; see docs/JATOS.md.',
        'componentList': [{
            'uuid': 'e312390f-424c-4c1b-9b17-aa42420456f4',
            'title': 'Experiment',
            'htmlFilePath': 'index.html',
            'reloadable': False,
            'active': True,
        }],
        'batchList': [{
            'uuid': 'a624d4b2-6bea-4abb-a250-0301b6ceaee7',
            'title': 'Default',
            'active': True,
            'allowedWorkerTypes': ['Jatos', 'PersonalSingle', 'PersonalMultiple', 'GeneralSingle', 'GeneralMultiple'],
        }],
    },
}


def asset_files():
    """Yields (path on disk, path inside the study assets) for every file to ship."""
    for name in FILES:
        path = ROOT / name
        if not path.is_file():
            sys.exit(f'Missing {name}')
        yield path, name
    for directory in DIRECTORIES:
        base = ROOT / directory
        if not base.is_dir():
            sys.exit(f'Missing directory {directory}')
        for path in sorted(base.rglob('*')):
            if path.is_file():
                yield path, path.relative_to(ROOT).as_posix()


def main():
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'deploy' / 'dist' / 'visuelle-suche.jzip'
    output.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('visuelle-suche.jas', json.dumps(STUDY, indent=2))
        archive.writestr(DIR_NAME + '/', '')
        for path, name in asset_files():
            archive.write(path, f'{DIR_NAME}/{name}')
            count += 1
    print(f'{output} ({count} files, {output.stat().st_size // 1024} KiB)')


if __name__ == '__main__':
    main()
