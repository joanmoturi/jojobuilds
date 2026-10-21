# Build and install JOJOBUILDS on Android

## Choose the correct kind of build

| Output                 | Purpose                                                              | Needs Metro on your PC? |
| ---------------------- | -------------------------------------------------------------------- | ----------------------- |
| Expo Go session        | Local native development; see [Run on Android](../RUN_ON_ANDROID.md) | Yes                     |
| Metro/Hermes JS export | Compile/import check, not an installable application                 | Not applicable          |
| Preview APK            | Signed standalone app you can install directly                       | No                      |
| Production AAB         | Google Play distribution artifact, not directly installable          | No                      |

The repository has passed JS export, but no signed APK or physical-device test
has been completed. Do not mistake build configuration for a verified release.

## 1. Deploy or choose the backend

For other users, first complete [Deployment](../DEPLOYMENT.md). Both the website
and API must have reachable HTTPS addresses.

An APK does not contain the database/API. If its API points to a home Wi-Fi
address, it will not work outside that network. Use synthetic data for all
unencrypted development traffic.

## 2. Approve Expo project, uploads and signing

EAS is an external service. Review current accounts, build limits/charges and
source-upload requirements before running its commands. Choose your own Expo
account/project and review the archive so it contains no tenant data, `.env`
secrets, databases, backups or signing files.

From the mobile app directory, not the monorepo root:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject\apps\mobile
npx eas-cli@latest login
npx eas-cli@latest init
```

Link the intended project or explicitly approve creating one. Review the generated
project ID/owner and preserve the existing JOJOBUILDS settings. The package ID is
currently `com.jojobuilds.landlord`; review your ownership/name before distribution.

The existing `eas.json` already contains preview APK and production AAB profiles.
Do not replace it with an unrelated default template.

## 3. Set the actual remote build environment

In the Expo project's environment-variable settings, configure **preview** and,
when ready, **production** separately:

```dotenv
EXPO_PUBLIC_API_URL=https://YOUR_REAL_DOMAIN/api/v1
EXPO_PUBLIC_WEB_URL=https://YOUR_REAL_DOMAIN
```

These endpoints are public and embedded into the app; they are not secrets.
Never put database URLs, passwords or provider tokens in them. An ignored local
`.env` is not sufficient configuration for a remote build.

Leave `JOJOBUILDS_ALLOW_HTTP` unset for normal/release builds. Explicitly select
the matching EAS environment in each build profile if necessary:

```json
{
  "cli": { "appVersionSource": "local" },
  "build": {
    "preview": {
      "environment": "preview",
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "environment": "production",
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

Review local `EXPO_PUBLIC_`/HTTP overrides too, because app configuration is
evaluated locally as well as during the build. Use the same intended settings.

## 4. Build, download and install a preview APK

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Approve signing only for the intended app. Back up the Android keystore and its
recovery information securely; never commit them. Internal build links can be
accessible to anyone holding the link unless you restrict access in Expo.

When complete, open your controlled build's APK download link on the phone.
If Android requests installation permission, allow only that trusted source for
this installation, then remove that permission afterwards. Do not disable
Play Protect or install an unrelated APK.

Open JOJOBUILDS and sign in with an account from the deployed backend. Verify
login/logout, partial payments, repeated taps, organization/role restrictions,
maintenance and website persistence on a real phone.

Follow [Release checklist](RELEASE_CHECKLIST.md). A successful APK build does not
complete server-side privacy/security gates.

## 5. Production/store release

After preview and release approval, update the app version/version code according
to the store's requirements and build:

```powershell
npx eas-cli@latest build --platform android --profile production
```

This creates an AAB. Google Play enrollment, privacy/data-safety disclosures,
testing tracks, store review and final release are separate manual actions.
Do not assume an EAS build automatically publishes to Play or deploys the API.

## Local native build alternative

Windows native builds need Android Studio, the supported JDK/SDK and adb. After
installing/configuring them, from `apps\mobile`:

```powershell
npx expo run:android --device
```

This generates/builds native development artifacts and needs the corresponding
development-server/network setup. Do not assume EAS `--local` is supported on
native Windows. System tools and this native build have not been verified here.

For an explicitly synthetic-only LAN binary, the existing config enables
cleartext only when `JOJOBUILDS_ALLOW_HTTP=1` is set at build time. Changing that
native setting requires rebuilding; it is not a way to make HTTP safe for real
users. Prefer HTTPS.

## Official references

- [APK configuration and installation](https://docs.expo.dev/build-reference/apk/)
- [Internal build distribution](https://docs.expo.dev/build/internal-distribution/)
- [EAS with monorepos](https://docs.expo.dev/build-reference/build-with-monorepos/)
- [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)
