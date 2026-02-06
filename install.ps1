param()
$nodeDir = Join-Path $PSScriptRoot 'node-portable\node-v20.20.0-win-x64'
$env:PATH = "$nodeDir;$env:PATH"
& (Join-Path $nodeDir 'npm.cmd') install
