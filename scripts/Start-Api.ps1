param(
    [switch]$Initialize,
    [switch]$Lan,
    [int]$Port = 8000
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root 'apps\api')
$python = Join-Path (Get-Location) '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) { throw 'Install the API virtual environment first; see docs\LOCAL_DEVELOPMENT.md.' }
if (-not $env:DATABASE_URL -and -not (Test-Path -LiteralPath '.env')) {
    Write-Host 'Explicit local mode: SQLite. Production requires PostgreSQL.'
    $env:DATABASE_URL = 'sqlite:///./data/jojobuilds.db'
}
New-Item -ItemType Directory -Path data -Force | Out-Null
if ($Initialize) {
    & $python -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { throw 'Migration failed; the API was not started.' }
}
$address = if ($Lan) { '0.0.0.0' } else { '127.0.0.1' }
if ($Lan) { Write-Warning 'LAN mode exposes the API to your network. Use only a trusted development network with synthetic data.' }
& $python -m uvicorn app.main:app --host $address --port $Port
exit $LASTEXITCODE
