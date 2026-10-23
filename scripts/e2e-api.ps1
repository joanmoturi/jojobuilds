$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$run = Join-Path $root ('.test-runs\' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Force -Path $run | Out-Null
$env:DATABASE_URL = 'sqlite:///' + (Join-Path $run 'e2e.db').Replace('\', '/')
$env:DATA_DIR = Join-Path $run 'files'
$env:APP_ENV = 'test'
$env:WEB_ORIGIN = 'http://127.0.0.1:3011'
# Synthetic credentials exist only in this isolated test process/database.
$env:JOJOBUILDS_BOOTSTRAP_PASSWORD = 'synthetic-e2e-password'
Set-Location (Join-Path $root 'apps\api')
$python = Join-Path (Get-Location) '.venv\Scripts\python.exe'
& $python -m alembic upgrade head
if ($LASTEXITCODE -ne 0) { throw 'Test migration failed' }
& $python -m app.cli seed --email owner@example.com --name 'Demo Owner'
if ($LASTEXITCODE -ne 0) { throw 'Test seed failed' }
& $python -m app.cli demo-tenant --owner-email owner@example.com --email tenant-demo@example.com
if ($LASTEXITCODE -ne 0) { throw 'Test tenant setup failed' }
& $python -m app.cli demo-rentals --owner-email owner@example.com --email tenant-demo@example.com
if ($LASTEXITCODE -ne 0) { throw 'Test rental examples failed' }
& $python -m app.cli demo-staff --owner-email owner@example.com --email manager-demo@example.com --role manager --property-name 'Kilimani Heights'
if ($LASTEXITCODE -ne 0) { throw 'Test staff setup failed' }
$env:PYTHONPATH = (Get-Location).Path
& $python (Join-Path $root 'tests\e2e\seed_operations.py')
if ($LASTEXITCODE -ne 0) { throw 'Test provider setup failed' }
Remove-Item Env:\JOJOBUILDS_BOOTSTRAP_PASSWORD
& $python -m uvicorn app.main:app --host 127.0.0.1 --port 8011
exit $LASTEXITCODE
