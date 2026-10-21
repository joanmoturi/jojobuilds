# Native local development

For complete physical-phone and browser instructions, including server restarts,
LAN addresses, Expo Go compatibility and firewall scope, use
[Run on Android](../RUN_ON_ANDROID.md).

Install root dependencies (`npm ci`) and start/migrate the existing API, not a
second backend. A physical phone and emulator have different host addresses:

- Android emulator: `http://10.0.2.2:8000/api/v1`
- Physical phone: computer's trusted LAN IPv4, for example
  `http://192.168.1.20:8000/api/v1`

Copy `apps\mobile\.env.example` to `.env` and set EXPO_PUBLIC_API_URL and
EXPO_PUBLIC_WEB_URL. These endpoints are public configuration, never credentials.
For phone access, use `.\scripts\Start-Api.ps1 -Lan`; approve only a narrow trusted
local firewall rule if needed. HTTP development must use synthetic data.
Never expose the API publicly through a tunnel with real records.

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject
npm run dev:mobile
```

Use a compatible Expo Go for SDK 55 on Android, or a matching development build.
Latest store Expo Go may not support an older SDK. Obtain compatible versions only
from official Expo sources. Scan the CLI QR code on a trusted network.

For an emulator, install Android Studio/SDK, configure ANDROID_HOME, Java and adb,
start a device, then `npm run android --workspace=@jojobuilds/mobile`.
Those system tools are not installed/verified in this environment.

Sign in with an account bootstrapped or invited through the shared API.
Landlords/managers/finance/agents/staff are supported; tenants use the website.
If there is no backend connection, fix the endpoint/network rather than inserting
mock success responses. Account recovery opens the website.
