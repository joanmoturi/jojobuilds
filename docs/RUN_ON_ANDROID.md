# Run JOJOBUILDS on your Android phone

There are three different experiences. Choose one rather than mixing their
addresses and startup instructions:

| Option             | What it is                                         | Needs your PC running?                                 |
| ------------------ | -------------------------------------------------- | ------------------------------------------------------ |
| Native development | JOJOBUILDS inside compatible Expo Go on your phone | Yes: API + Expo; website for web-only actions          |
| Mobile browser     | The responsive website in Chrome on your phone     | Yes when hosted on your PC; no after public deployment |
| Installed APK      | A signed standalone JOJOBUILDS application         | No Metro server; it still needs a reachable backend    |

Native Android is a landlord/staff client. Tenants use the website. Physical
Android testing has not yet been completed; these are the setup instructions,
not a claim that the phone or APK was already verified.

## A. Native app on your phone using Expo Go

### 1. Prepare your PC and account

Complete [Run on PC](RUN_ON_PC.md) first, including a synthetic demo account.
Connect the PC and phone to the same trusted private Wi-Fi. Guest Wi-Fi/client
isolation, approved VPN policies and firewalls may prevent device-to-PC access.
Do not disable security controls or use public Wi-Fi to work around this.

Keep the PC awake. Use synthetic information only over development HTTP.

### 2. Find the PC's Wi-Fi IPv4 address

Run:

```powershell
Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } |
    Select-Object InterfaceAlias,@{Name='IPv4';Expression={$_.IPv4Address.IPAddress}}
```

Choose the active Wi-Fi adapter, not a Docker/VPN adapter. The following examples
use **192.168.1.20**; replace every occurrence with your actual IPv4 address.

On a physical phone, `localhost` means the phone itself, not the PC.
`10.0.2.2` is for the standard Android emulator, not a physical phone.

### 3. Restart the backend with LAN access

Stop the existing loopback backend using its own terminal/process as described
in the PC guide. Do not start a second backend on the occupied port.

In a new PowerShell terminal:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject
$env:DATABASE_URL = 'sqlite:///./data/jojobuilds.db'
$env:DATA_DIR = './data'
$env:APP_ENV = 'development'
$env:COOKIE_SECURE = 'false'
$env:WEB_ORIGIN = 'http://localhost:3000'
.\scripts\Start-Api.ps1 -Initialize -Lan
```

This exposes port 8000 on the PC's network interfaces. Restrict access to your
trusted private network with the firewall; never forward this port on your
router.

On the phone, open `http://192.168.1.20:8000/ready` in Chrome. Do not continue
until you see `{"status":"ready"}`. If this fails, the native app will fail too.

### 4. Configure and start the Android project

In another PC terminal, set the public endpoints and start Expo:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject
$env:EXPO_PUBLIC_API_URL = 'http://192.168.1.20:8000/api/v1'
$env:EXPO_PUBLIC_WEB_URL = 'http://192.168.1.20:3000'
npm run start --workspace=@jojobuilds/mobile -- --go --lan
```

These variables apply to this terminal and its child processes. If you restart
PowerShell, set them again. Alternatively, put the same two values in the ignored
`apps\mobile\.env`; do not copy the emulator defaults without changing them.
Never put passwords, database URLs or bank credentials in `EXPO_PUBLIC_` values.

The API URL must end in `/api/v1`; the website URL must not. After changing an
endpoint, fully reload the app. If an old endpoint remains, stop Expo and restart
with `npm run start --workspace=@jojobuilds/mobile -- --go --lan --clear`.

For web-only actions, also start the LAN website using option B below. Basic
native browsing/payment operations need the API and Expo, not the web process.

### 5. Install the matching Expo Go and sign in

The project uses **Expo SDK 55**. Use the Android SDK-55-compatible Expo Go from
[Expo's official download selector](https://expo.dev/go), not an arbitrary APK
download site. The latest Play Store Expo Go may target a different SDK.

Open Expo Go, scan the QR code printed by your PC's Expo terminal and wait for
the app to load. Sign in using the same synthetic account as the website.
You should see the same portfolio records.

Under **More**, open **Service providers & bills** for contacts, supplier
obligations and outgoing payment history; **Recurring & variable tenant bills**
for fixed rules or manually entered water/garbage/service bills; and, as owner,
**Private owner finances** for manual tax/loan obligations and personal-use
payments. Maintenance requests show tenant/unit information and can be assigned
to a registered provider. These workflows record amounts and payment history,
not bank transfers or automatic tax calculations.

Keep the API and Expo terminals open. A QR code starts the development client;
it does not publish the app or make your backend available on the internet.
Do not use an Expo tunnel as a supposed fix for an unreachable private API.

## B. Website in Chrome on your phone

This is not an APK and is not a fully offline/PWA experience.

Find your PC IP as above. Stop the existing API and website processes before
restarting them with the following settings.

In API terminal A:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject
$env:DATABASE_URL = 'sqlite:///./data/jojobuilds.db'
$env:DATA_DIR = './data'
$env:APP_ENV = 'development'
$env:COOKIE_SECURE = 'false'
$env:WEB_ORIGIN = 'http://192.168.1.20:3000'
.\scripts\Start-Api.ps1 -Initialize -Lan
```

In website terminal B:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject
$env:API_INTERNAL_URL = 'http://127.0.0.1:8000'
npm exec --workspace=@jojobuilds/web -- next dev --hostname 0.0.0.0 --port 3000
```

On the phone, open **http://192.168.1.20:3000** and sign in. Use that same address
on the PC during this mode; browser write checks expect exactly that origin.
Do not substitute `localhost`, another hostname or a different port.

If using option A too, leave its Expo endpoints set to these LAN addresses.
Native bearer authentication does not require changing the browser origin back.

When returning to PC-only mode, stop these processes and follow the PC guide to
restore loopback binding and `WEB_ORIGIN=http://localhost:3000`.

## C. Firewall and connection troubleshooting

If prompted, allow only the relevant Python/Node process on your trusted
**Private** network. Do not disable Windows Firewall.

If an explicit rule is needed and permitted by your device/network policy, an
administrator can create this narrowly named, private-subnet development rule:

```powershell
New-NetFirewallRule -Name 'JOJOBUILDS-Local-Testing' -DisplayName 'JOJOBUILDS local testing' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000,8000,8081 -RemoteAddress LocalSubnet -Profile Private
```

Remove that development rule when finished:

```powershell
Remove-NetFirewallRule -Name 'JOJOBUILDS-Local-Testing'
```

Port 8081 is Expo's default; use the actual port printed by Expo if it differs.
The native app needs 8000 and Expo's port; browser testing needs 3000.

| Symptom                               | Check                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Phone cannot open `/ready`            | Correct PC IP, API `-Lan`, trusted private Wi-Fi and scoped firewall access                                       |
| QR opens but app cannot reach backend | `EXPO_PUBLIC_API_URL` is the PC IP, not `localhost`/`10.0.2.2`; fully reload                                      |
| Expo Go incompatible project          | Install the official SDK-55-compatible Android build                                                              |
| Website opens but writes return 403   | Exact LAN `WEB_ORIGIN`, current sign-in and CSRF/session                                                          |
| PC sleeps and app stops working       | Keep PC awake during LAN testing                                                                                  |
| LAN IP changed                        | Update both endpoints and browser origin, restart API/Expo and reload                                             |
| Installed APK rejects HTTP            | Use HTTPS; only an explicitly synthetic LAN build may enable the existing `JOJOBUILDS_ALLOW_HTTP=1` build setting |

## D. Install a standalone APK or publish to users

Follow [Android builds](mobile/ANDROID_BUILD.md). An internal APK includes the
JavaScript bundle and does not need Expo Go/Metro, but it does not include your
backend or database.

For other users, deploy the backend and website first using [Deployment](DEPLOYMENT.md).
Build the APK with their public HTTPS addresses, leave HTTP disabled and complete
device testing. An APK pointing at `192.168...` works only on that private network.

An APK is directly installable; a production AAB is for store distribution.
Neither a JS export nor a GitHub repository is an installed Android app.

## Official references

- [SDK 55 SecureStore](https://docs.expo.dev/versions/v55.0.0/sdk/securestore/)
- [Expo Go version mismatch](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/)
- [Expo CLI and LAN development](https://docs.expo.dev/more/expo-cli/)
- [Expo environment variables](https://docs.expo.dev/guides/environment-variables/)
- [Building Android APKs](https://docs.expo.dev/build-reference/apk/)
