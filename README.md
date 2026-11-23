# Crave — Food Ordering System

A Java 21 / Spring Boot and React full-stack project for a **single restaurant**, with customer ordering, a staff kitchen dashboard and administrator controls. Built using the technology stack in your reference photos.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, JavaScript, HTML, CSS, Bootstrap 5 |
| Frontend tooling | Vite 7, npm, React Router 7, Axios |
| Backend | Java 21, Spring Boot 3.5.16, Maven |
| Authentication | Spring Security, BCrypt, signed JWT access tokens, optional Google OpenID Connect / OAuth2 |
| Persistence | MySQL, Spring Data JPA, Hibernate, Flyway migrations |
| Development | Eclipse with Spring Tools / STS, Postman |
| Verification | Spring Boot integration tests; H2 in MySQL mode for tests/demo |

Dependency versions are locked by `frontend/package-lock.json` and the Spring Boot parent POM. Use **JDK 21** (with `javac`, not only a JRE), **Maven 3.6.3+**, **Node.js 22.12+** (or Node 24 LTS), and **MySQL 8**. See the [Spring Boot requirements](https://docs.spring.io/spring-boot/3.5/system-requirements.html) and [Vite requirements](https://vite.dev/guide/).

## What works

- Public menu with search, categories and vegetarian filtering.
- Customer sign-up, email/password login, logout and editable name/phone profile.
- Cart with quantities, saved on the same browser; login survives refresh within the tab.
- Delivery address, phone and kitchen notes at checkout.
- Cash on delivery. ₹35 delivery fee, waived at a subtotal of ₹499 or more.
- Server-calculated totals and item availability checks; customers never submit prices.
- Order history and automatic status refresh every 12 seconds.
- Customers may cancel newly placed orders.
- Staff can view restaurant orders and move them through allowed status transitions.
- Admins can create, edit and remove menu items, toggle availability and assign user roles.
- Google sign-in when configured; the button stays hidden when not configured.
- Restaurant metrics based on the latest 200 orders; customer history shows the latest 100 orders.

Menu cards use food emoji rather than downloaded photographs, so no image service is needed. The optional Google font falls back to system fonts if offline.

## Start quickly: local demo

This mode uses an **in-memory H2 database**, not MySQL. Data resets whenever the backend restarts. It is intended for trying the project and running tests.

Terminal 1:

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=demo
```

Terminal 2:

```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. Keep port 5173 free; the configured frontend origin must match the port you open.

| Role | Email | Password |
| --- | --- | --- |
| Customer | customer@crave.test | Demo@12345 |
| Staff | staff@crave.test | Demo@12345 |
| Admin | admin@crave.test | Demo@12345 |

These accounts and the demo signing key exist only in the `demo` profile. Do not expose this profile publicly.

## Run with MySQL — the main project configuration

1. Install MySQL 8 or start the supplied Docker database:

```bash
# From the project root
cp .env.example .env
# Edit .env and change MYSQL_ROOT_PASSWORD before starting.
docker compose up -d
```

If MySQL is installed directly, create a database and a dedicated application user. The default connection expects database `crave`, user `crave` and password `crave_local`. Use your own password outside local development. The schema is created and versioned by Flyway; do not import an additional SQL schema manually.

2. Configure and start the backend. The application reads **operating system environment variables**. It does not automatically load a `.env` file; the root `.env` is for Docker Compose only.

Bash / macOS / Linux:

```bash
cd backend
export DB_URL='jdbc:mysql://localhost:3306/crave?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'
export DB_USERNAME='crave'
export DB_PASSWORD='crave_local'
export JWT_SECRET="$(openssl rand -hex 32)"
export ADMIN_EMAIL='admin@example.com'
export ADMIN_PASSWORD='Choose-a-long-unique-password'
mvn spring-boot:run
```

Windows PowerShell:

```powershell
cd backend
$env:DB_URL='jdbc:mysql://localhost:3306/crave?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'
$env:DB_USERNAME='crave'
$env:DB_PASSWORD='crave_local'
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$env:JWT_SECRET=[Convert]::ToBase64String($bytes)
$env:ADMIN_EMAIL='admin@example.com'
$env:ADMIN_PASSWORD='Choose-a-long-unique-password'
mvn spring-boot:run
```

`JWT_SECRET` must have at least 32 bytes; keep it stable across restarts if existing login tokens should remain valid. A new admin is created only when the configured email is unused. Existing accounts are never silently promoted or given a new password by the initializer. The configured admin password must have at least 12 characters. On a fresh database, the 12 sample dishes are inserted automatically.

3. Start the frontend as above. Register a customer through **Create an account**. To create staff access, register another account and change its role from the administrator's **Dashboard → User roles** page. Admins cannot change their own role.

## Eclipse / Spring Tools setup

1. Install JDK 21 and select it in **Preferences → Java → Installed JREs**.
2. Choose **File → Import → Maven → Existing Maven Projects** and select `backend`.
3. Run Maven **Update Project** if dependencies are unresolved.
4. Open the run configuration for `CraveApplication` and add `JWT_SECRET`, database credentials and initial admin variables in **Environment**. For a quick demo, set the Spring profile to `demo` instead.
5. Run as **Spring Boot App**. Run the React frontend separately with `npm run dev` in its folder.

## Enable Google login

Email/password login works without Google configuration. To enable Google:

1. Create an OAuth **Web application** client in Google Cloud, configure the consent screen and add test users if the app is in testing mode.
2. Add this authorized redirect URI exactly: `http://localhost:8080/login/oauth2/code/google`.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the backend environment.
4. Start with `mvn spring-boot:run -Dspring-boot.run.profiles=google`, or `demo,google` for the H2 demo.
5. Keep `FRONTEND_URL=http://localhost:5173`, or update it to your exact frontend origin.

Spring Security validates the OpenID Connect identity and verified email. A new Google account receives only the CUSTOMER role. To avoid silently linking unrelated accounts, an email already registered with a password must use password login. Google login uses a short-lived, single-use exchange code in the URL fragment, not an access token in a query string. Those exchange codes are held in process memory for 60 seconds; this implementation assumes a single backend instance.

Google login is implemented but requires your credentials and consent configuration to exercise the provider round trip. If deploying a separate frontend domain, route `/oauth2/*` and `/login/oauth2/*` to the backend, or update the Google login link to the backend origin. Setting `VITE_API_URL` changes API requests only.

## Backend organization

```text
backend/src/main/java/com/crave/
  controller/    HTTP endpoints and request validation
  service/       Business rules and transaction boundaries
  repository/    JPA database queries
  entity/        Database models
  dto/           Explicit request and response records
  security/      JWT issuing and Google login handling
  config/        Security, CORS and sample-data setup
  exception/     Consistent API errors
```

`src/main/resources/db/migration/V1__initial_schema.sql` defines users, menu items, orders and order lines. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the entity relationships, status flow and implementation decisions.

## Test and build

```bash
cd backend
mvn test
mvn package
# Run the packaged app after setting the MySQL/JWT environment variables:
java -jar target/food-ordering-1.0.0.jar
```

```bash
cd frontend
npm ci
npm test
npm run build
```

The backend tests use H2 in MySQL compatibility mode. They cover authentication, authorization, checkout prices, duplicate requests, order ownership, unavailable items, delivery fees, cancellation, menu administration and role changes. H2 tests do not replace a test against a real MySQL server. See `docs/VERIFICATION.md` for checks performed on this deliverable.

Import `postman/Crave.postman_collection.json` into Postman. Run **Customer login** for the H2 demo or edit its body to match a registered MySQL customer; it saves the access token. Then use **Place order** and **My orders**. Run **Staff login** to save a separate staff token for status updates. Request variables include `baseUrl`, `token`, `staffToken`, `menuItemId` and `orderId`.

## Scope and deployment notes

This is an educational full-stack project with a working single-restaurant ordering flow. Payment is cash on delivery; online payment gateways, delivery GPS, multiple restaurants, password reset, emails and refunds are outside the implemented scope. Dietary markers are menu labels and do not represent an allergy guarantee.

JWT access tokens expire after two hours. Sign out removes the browser token; immediate server-side revocation and refresh tokens are not implemented. Tokens are kept in sessionStorage, so deployment must protect against XSS and use HTTPS. Role permissions are loaded from the database on each request, so admin role changes apply to existing tokens. Public registration never accepts a role field.

The API uses bearer tokens rather than cookie authentication and is stateless; the separate Google authorization flow uses Spring Security's session/state handling. The frontend renders user text through React and the backend sends DTOs without password hashes. The configured CORS origin is exact. Before public production use, add rate limiting, pagination, auditing, observability, database backups and a production secret store. The supplied local MySQL URL disables TLS; configure database TLS for remote production connections. Serve the React build behind a server with SPA fallback and proxy the API/auth routes. Production hosting is not included.
