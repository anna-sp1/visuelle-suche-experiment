<#
.SYNOPSIS
Packs the experiment as a JATOS study archive (.jzip) on Windows, like "deploy/study.sh" without upload.

.DESCRIPTION
Run in PowerShell (Windows PowerShell 5.1 or PowerShell 7) from the repository:

    powershell -ExecutionPolicy Bypass -File deploy\build-study.ps1

It writes deploy\dist\visuelle-suche.jzip; import it in JATOS with "Import study".
Keep the file lists and the study's properties in step with deploy/study.sh
(tests/deploy.test.cjs compares them).

Entry names are written with forward slashes by hand: Compress-Archive in Windows
PowerShell 5.1 writes backslashes, which JATOS on Linux would keep in the file names.

.PARAMETER Output
Where to write the archive (default deploy\dist\visuelle-suche.jzip).
#>
param([string]$Output)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2

$here = $PSScriptRoot
$root = (Resolve-Path (Join-Path $here '..')).ProviderPath
$dirName = 'visuelle_suche'
if (-not $Output) { $Output = Join-Path $here 'dist/visuelle-suche.jzip' }
# Resolved against PowerShell's location, which .NET's own current directory need not follow.
$Output = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Output)

# What the page loads at runtime (index.html, its scripts, style.css, the preview image and
# table, the prepared trial plans and stimuli). Source archives, docs and tests stay out.
$Files = @('index.html', 'style.css', 'ai-trial.js', 'common-start.js', 'conditions.js', 'config.js',
           'customization.js', 'daisy-ui.js', 'experiment.js', 'functions.js', 'standard.js', 'storage.js')
$Directories = @('bilder', 'tabellen', 'data/generated')

# The study's properties, as JATOS 3.x writes them into an archive (serial version 3).
$study = @'
{
  "version": "3",
  "data": {
    "uuid": "d6170cad-1259-4972-957c-b8aec8e1caa7",
    "title": "Visuelle Suche Experiment",
    "description": "Visual search with an AI assistant: four versions, balanced by the batch session.",
    "groupStudy": false,
    "linearStudy": false,
    "allowPreview": false,
    "dirName": "visuelle_suche",
    "comments": "Built by deploy/build-study.ps1; see docs/JATOS.md.",
    "componentList": [{
      "uuid": "e312390f-424c-4c1b-9b17-aa42420456f4",
      "title": "Experiment",
      "htmlFilePath": "index.html",
      "reloadable": false,
      "active": true
    }],
    "batchList": [{
      "uuid": "a624d4b2-6bea-4abb-a250-0301b6ceaee7",
      "title": "Default",
      "active": true,
      "allowedWorkerTypes": ["Jatos", "PersonalSingle", "PersonalMultiple", "GeneralSingle", "GeneralMultiple"]
    }]
  }
}
'@

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Output) | Out-Null
if (Test-Path -LiteralPath $Output) { Remove-Item -LiteralPath $Output }

$zip = [System.IO.Compression.ZipFile]::Open($Output, [System.IO.Compression.ZipArchiveMode]::Create)
$count = 0
try {
    function Add-ArchiveFile([string]$path, [string]$name) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip, $path, $name, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        $script:count++
    }

    # UTF-8 without a byte order mark: JATOS's JSON reader does not accept one.
    $writer = New-Object System.IO.StreamWriter($zip.CreateEntry('visuelle-suche.jas').Open(), (New-Object System.Text.UTF8Encoding($false)))
    try { $writer.Write($study) } finally { $writer.Dispose() }
    $zip.CreateEntry("$dirName/") | Out-Null

    foreach ($file in $Files) {
        $path = Join-Path $root $file
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing $file" }
        Add-ArchiveFile $path "$dirName/$file"
    }
    foreach ($dir in $Directories) {
        $base = Join-Path $root $dir
        if (-not (Test-Path -LiteralPath $base -PathType Container)) { throw "Missing directory $dir" }
        Get-ChildItem -LiteralPath $base -Recurse -File | Sort-Object FullName | ForEach-Object {
            $relative = $_.FullName.Substring($root.Length).TrimStart('\', '/').Replace('\', '/')
            Add-ArchiveFile $_.FullName "$dirName/$relative"
        }
    }
} finally {
    $zip.Dispose()
}

$size = [math]::Round((Get-Item -LiteralPath $Output).Length / 1KB)
Write-Host "Built $Output ($count files, $size KiB)"
