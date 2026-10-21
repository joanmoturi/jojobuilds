# Mobile verification

```powershell
npm run typecheck --workspace=@jojobuilds/mobile
npm run test --workspace=@jojobuilds/mobile
npm run export:android --workspace=@jojobuilds/mobile
```

Four Jest + React Native Testing Library tests exercise disabled submit, retry
interaction, non-color status labeling and session restoration stability across
organization switches. Strict TypeScript, ESLint and Android Metro/Hermes export
passed. Export validates imports and bundles the app; it does not prove device
behavior or generate an APK.

Original JOJOBUILDS PNG icon assets match the website's monogram. On Windows,
regenerate them with `.\scripts\Generate-Icons.ps1` from the repository root.
Their appearance in installed launcher/adaptive/monochrome modes still needs
physical-device verification.

Manual device release gates: secure login/logout, expired/revoked session, slow
network/timeouts, workspace switch, staff restrictions, property/tenant search,
partial receipt + repeated taps, review approval, maintenance transitions,
notification reads, deep-link authorization, accessible touch targets and keyboard
behavior. Verify server persistence from the website after each native mutation.

No emulator, physical Android device, Maestro journey or iOS simulator was run
here. Browser mobile-width tests validate only the separate Next.js website.
Do not confuse those tests with native integration testing.
