# Run JOJOBUILDS on your Windows PC

Use PowerShell. Examples assume the existing project is at
`C:\Users\joanmoturi\Downloads\myproject`; change that path if you move it.

The website address does not start the application. Two processes must be
running: the FastAPI backend on port 8000 and the website on port 3000. Keep
their terminals open. Closing them, putting the PC to sleep or restarting Windows
can make the app unavailable.

## 1. Check whether it is already running

Open these addresses on this PC:

- Website: <http://localhost:3000>
- Database readiness: <http://127.0.0.1:8000/ready>

Readiness should return `{"status":"ready"}`. If both work, do not start duplicate
servers. Sign in with your existing account.

These PowerShell commands also check them:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/ready
(Invoke-WebRequest http://localhost:3000).StatusCode
```

## 2. Start the backend

In PowerShell terminal A:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject
$env:DATABASE_URL = 'sqlite:///./data/jojobuilds.db'
$env:DATA_DIR = './data'
$env:APP_ENV = 'development'
$env:COOKIE_SECURE = 'false'
$env:WEB_ORIGIN = 'http://localhost:3000'
.\scripts\Start-Api.ps1 -Initialize
```

Wait for `Uvicorn running on http://127.0.0.1:8000`. Leave this terminal open.
Initialization applies database migrations; it does not reset existing records.

The explicit database setting overrides an API `.env` file in this terminal.
Use SQLite only for local development, not public hosting or multiple workers.

## 3. Create your first account, if needed

In a separate PowerShell terminal, choose **one** option below. Commands prompt
for your password; it must have at least 12 characters. Typed password characters
may not appear in the terminal, which is normal.

Start by selecting the same database as the running backend:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject\apps\api
$env:DATABASE_URL = 'sqlite:///./data/jojobuilds.db'
$env:DATA_DIR = './data'
```

### Option A: synthetic demo

```powershell
.\.venv\Scripts\python.exe -m app.cli seed --email "demo-owner@example.com" --name "Demo Owner"
```

This creates a demo-marked portfolio with synthetic properties, tenants, charges,
payments and a maintenance request. Sign in with the email above and the password
you chose. This is an example account you create, not a preinstalled account.

### Option B: empty owner portfolio

Replace the example email with your own:

```powershell
.\.venv\Scripts\python.exe -m app.cli bootstrap --email "you@example.com" --name "Portfolio Owner"
```

Do not run both options with the same email. Accounts already created remain
available after restarting the app. For a password you have forgotten:

```powershell
.\.venv\Scripts\python.exe -m app.cli set-password --email "you@example.com"
```

This revokes that account's existing sessions. Only reset an account you are
authorized to administer.

## 4. Start the website

In PowerShell terminal B:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject
npm run dev:web
```

Wait for the ready message, then open <http://localhost:3000>. Use `localhost`,
not `127.0.0.1`, for the browser address in this mode so the configured origin
matches. Follow [the user guide](USER_GUIDE.md) after signing in.

## 5. Stop and restart

Press **Ctrl+C** in each server terminal to stop it. Data remains in
`apps\api\data`; never delete that directory to fix a startup error.

After rebooting, repeat steps 2 and 4. You do not need to create your account or
seed data again. These commands are not a Windows startup service.

If the servers were started in the background rather than your visible terminals,
identify their listening process IDs:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,8000 |
    Select-Object LocalPort,OwningProcess
```

Inspect the command line for a particular result:

```powershell
Get-CimInstance Win32_Process -Filter 'ProcessId = 12345' |
    Select-Object ProcessId,CommandLine
```

Replace `12345` with the actual ID. Only after confirming it belongs to this
project, stop that exact process with `Stop-Process -Id 12345`. Do not terminate
every Node/Python process or stop an unrelated application.

## Fresh installation on another PC

Install Node.js 24 and Python 3.14 from their official distributions. The
existing working copy already has dependencies, so do not reinstall on every run.

For a fresh checkout:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject
npm ci
Set-Location apps\api
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock
```

Then follow steps 2-4. For approved package mirrors, PostgreSQL and local email,
see [Local development](LOCAL_DEVELOPMENT.md). Do not disable certificate
verification or system security policy to work around installation failures.

## Common problems

| Symptom                                | What to do                                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Browser says connection refused        | Start both servers and wait for their ready messages                                                                        |
| Port already in use                    | Check whether this app is already running; do not start another copy on a different port without updating the configuration |
| Page opens but data/login fails        | Check `/ready` on port 8000 and the API terminal's error                                                                    |
| 403 when saving                        | Use `http://localhost:3000`; check `WEB_ORIGIN`, sign out/in and retry                                                      |
| 401 session expired                    | Sign in again; this response before login is normal                                                                         |
| Account already exists                 | Sign in or use the authorized `set-password` command; do not reseed                                                         |
| Demo portfolio is empty                | Check the selected organization and whether you chose `bootstrap` rather than `seed`                                        |
| PowerShell script execution is blocked | Use an approved signed-script/policy process, or run the equivalent Python commands below; do not weaken system policy      |

Equivalent backend commands, from `apps\api` with the environment settings in
step 2, if a script cannot be run:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Backup before real records

Follow [Backup and restore](BACKUP_AND_RESTORE.md), including a restore test to a
new directory and an encrypted off-PC copy. Local development is not a production
security or privacy sign-off.
