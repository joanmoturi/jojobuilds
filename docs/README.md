# JOJOBUILDS documentation

Start with the guide for your role. The responsive website and Android
landlord/staff client share one backend; tenants and providers use the website.
GitHub contains the source, not a publicly hosted application.

## Using the application

| Reader / task                                                   | Guide                                                                               |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Owner, manager or finance staff                                 | [User guide](USER_GUIDE.md)                                                         |
| Tenant                                                          | [Tenant guide](TENANT_GUIDE.md)                                                     |
| Service provider                                                | [Provider guide](PROVIDER_GUIDE.md)                                                 |
| Understand properties, unit specifications and multiple rentals | [Units and agreements](USER_GUIDE.md#unit-specifications-tenants-and-other-bills)   |
| Follow an apartment, stall and bar example                      | [Worked example](USER_GUIDE.md#worked-example-one-tenant-three-rentals)             |
| Record water, garbage and service charges                       | [Tenant bills](USER_GUIDE.md#water-garbage-and-other-tenant-bills)                  |
| Track plumbers, electricians or security providers              | [Service providers](USER_GUIDE.md#service-providers-jobs-and-money-owed)            |
| Message property contacts and review owner oversight            | [Shared inbox](USER_GUIDE.md#property-conversations-and-owner-oversight)            |
| Submit a quotation or invoice                                   | [Provider billing](PROVIDER_GUIDE.md#quotations-and-invoices)                       |
| Review a provider's pending, paid or voided services            | [Provider payment views](PROVIDER_GUIDE.md#services-pending-and-paid)               |
| Track private tax, loan and personal-use entries                | [Owner finances](USER_GUIDE.md#owner-finances-tax-reminders-loans-and-personal-use) |
| Try genuine tenant or staff accounts                            | [Local account demonstrations](USER_GUIDE.md#try-the-tenant-website-locally)        |

The tenant guide can be shared with tenants. It intentionally omits owner
administration commands, account provisioning and private finance workflows.
Use your actual hosted website address when distributing it; a tenant cannot
reach a landlord's PC by entering `localhost` on their own phone.

## Install, start and operate

| Task                                                               | Guide                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| Start or restart on the existing Windows PC                        | [Run on PC](RUN_ON_PC.md)                            |
| Fresh checkout, dependencies, local configuration and email        | [Local development](LOCAL_DEVELOPMENT.md)            |
| Phone browser or native Expo development                           | [Run on Android](RUN_ON_ANDROID.md)                  |
| Routine operation and upgrades                                     | [Operations runbook](OPERATIONS_RUNBOOK.md)          |
| Protect and recover records                                        | [Backup and restore](BACKUP_AND_RESTORE.md)          |
| Stage and deploy for real users                                    | [Deployment](DEPLOYMENT.md)                          |
| Configure synthetic Netlify/Render/Neon staging and phased rollout | [Staging and rollout status](STAGING_AND_ROLLOUT.md) |
| Create a signed Android build                                      | [Android build guide](mobile/ANDROID_BUILD.md)       |
| Publish source to the repository                                   | [GitHub guide](GITHUB.md)                            |

For a local run, the API and website must both be running. Accounts and records
survive a restart; do not reseed or delete the data directory to fix startup.
Deployment requires a separate release process, not simply a GitHub push.

## Developer reference

| Topic                                                       | Guide / source                                |
| ----------------------------------------------------------- | --------------------------------------------- |
| Components and request flow                                 | [Architecture](ARCHITECTURE.md)               |
| Authentication, endpoint groups and request examples        | [API reference](API_REFERENCE.md)             |
| Roles, property assignments and tenant isolation            | [Authorization](AUTHORIZATION.md)             |
| Tables, identifiers and relationships                       | [Data model](DATA_MODEL.md)                   |
| Charges, allocations, recurring rules and outgoing payments | [Financial model](FINANCIAL_MODEL.md)         |
| Commands, test scope and verified limitations               | [Testing](TESTING.md)                         |
| Native-client setup and design                              | [Mobile architecture](mobile/ARCHITECTURE.md) |
| Original implementation scope and remaining work            | [Implementation plan](IMPLEMENTATION_PLAN.md) |

The checked-in [OpenAPI contract](../packages/api-client/openapi.json) is the
field-level API reference. Regenerate it after changing backend schemas with
`npm run api:generate`; do not maintain an independent mobile financial model.

## Before real tenant data or public hosting

Read [Security](SECURITY.md), [Privacy and compliance](PRIVACY_AND_COMPLIANCE.md),
the [post-build checklist](POST_BUILD_CHECKLIST.md) and [Deployment](DEPLOYMENT.md).

The application records reviewed financial activity; it does not connect to a
bank, move money, automatically calculate taxes or establish legal compliance.
Bank feeds, Daraja, WhatsApp/SMS and push delivery are not activated. Dependency
advisories and the documented PostgreSQL/device/deployment checks remain release
gates. A successful local demonstration is not a production-readiness claim.
