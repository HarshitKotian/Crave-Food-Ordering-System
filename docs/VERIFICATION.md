# Verification — 23 November 2026

| Check | Result |
| --- | --- |
| Java 21 / Maven backend build and executable JAR packaging | Passed |
| Packaged application HTTP smoke check | Passed: health, menu, customer/staff login, checkout and order confirmation |
| Spring Boot integration tests | 12 passed, 0 failures, 0 errors |
| React interaction tests in jsdom | 6 passed |
| Vite production build | Passed |
| Flyway schema migration and Hibernate validation | Passed against H2 in MySQL compatibility mode |

Backend tests exercise the real Spring security filters, controllers, services, repositories and database through MockMvc. Frontend tests use mocked API responses and test filtering, cart quantities, disabled unavailable dishes, checkout success/failure and dashboard restrictions.

The source package excludes generated build folders and dependency caches. Use the commands in README.md to reproduce the builds.

## Checks still requiring a local setup

- A real MySQL 8 server was not available in this workspace. The default MySQL configuration, driver and migration are provided; verify the MySQL path with your own server.
- Google OAuth sign-in requires your client ID, client secret and configured Google consent screen. The external provider round trip has not been tested here.
- Chromium could not launch under the workspace's process restrictions. React interaction tests and a production build passed, but visual browser testing on desktop/mobile remains to be done locally.
