# Android/iOS release checklist

| Status                   | Action                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Implemented and verified | TypeScript client compiles; unit tests run; Android JS/assets export succeeds                             |
| Requires my action       | Install a compatible Expo Go/development build and connect to the actual API                              |
| Requires my action       | Verify all core journeys on a physical Android device                                                     |
| Requires my action       | Configure stable HTTPS API/web endpoints and build ownership                                              |
| Requires my action       | Choose app identifiers, versioning, signing, credential backup and recovery                               |
| Requires my action       | Authorize any EAS account/project, remote upload or paid build                                            |
| Blocked                  | Signed APK/device validation was not possible without Android tooling/device or authorized external build |
| Deferred by design       | Push registration/delivery, camera attachments, biometrics, offline write queue                           |
| Requires my action       | Assess store privacy/Data Safety disclosures, privacy notice and screenshot assets                        |
| Requires my action       | Confirm compatibility against the deployed backend/OpenAPI contract                                       |
| Blocked                  | iOS native verification requires macOS/Xcode or authorized build infrastructure                           |
| Not applicable           | No Play Store/App Store publication has been requested or performed                                       |

Do not equate an exported JS bundle, a rendered screen or mocked component tests
with a signed, installed and usable native release.
