# iOS status

The Expo project includes an iOS bundle identifier, but iOS has not been built,
signed, simulator-tested or device-tested. Windows cannot run Apple's simulator.

A macOS/Xcode environment or an explicitly authorized EAS iOS build is required.
App Store/device distribution can require an Apple Developer account, certificates
and provisioning profiles. Verify current account requirements and costs before
activation. Keep credentials outside source control.

Review SecureStore behavior, safe areas, navigation, keyboards, TLS and accessibility
on iOS rather than assuming Android verification covers it.
