# cal.aiagentlbs.com source-build deployment

Status: deployed and infrastructure-verified on 2026-08-21; SMTP and owner onboarding remain pending

## Goal

Run the pinned Cal.diy source at `https://cal.aiagentlbs.com` from the public
`AIAgentLbs/cal-diy` repository. Coolify must compile the checked-out source;
the deployment must not pull a prebuilt Cal.diy application image.

## Source contract

- Upstream: `https://github.com/calcom/cal.diy.git`
- Initial release: `v6.2.0`
- Initial upstream commit: `1c193cca8682b33b9866c792186033f7ef886682`
- Public Corresponding Source/deploy repository: `https://github.com/AIAgentLbs/cal-diy`
- `upstream` remains the original source remote; `origin` is the public patch repository.
- The repository stays public while the modified network service is available,
  so users can obtain the exact AGPL Corresponding Source and deployment files.
- Production uses `docker-compose.coolify.yml`, whose `web` service has a local
  `build:` context. The `aiagentlabs-cal-diy-source:local` name only lets the
  `cron` service reuse that exact locally compiled image; it is never pulled
  from a registry. PostgreSQL is the only pulled runtime image.

## Isolation and persistence

- One application and one PostgreSQL service in a dedicated Coolify project.
- PostgreSQL is not published to the host and persists in `cal-postgres-data`.
- The web container exposes port 3000 only to Coolify's proxy.
- Runtime secrets live only in Coolify environment variables.
- Build-time database credentials are deliberately non-secret and never reach PostgreSQL.
- Runtime database/auth/cron/setup secrets use empty Compose interpolation
  defaults so Coolify can parse its build-only environment. The `web` and
  `cron` commands fail closed before startup if any required secret is absent;
  `DATABASE_URL` is assembled only inside the runtime container.
- Public signup is disabled until SMTP delivery is configured and verified.
- First-admin creation requires `Authorization: Bearer <SETUP_SECRET>` or the same
  secret as the JSON `setup_secret` field, matching the value stored in Coolify.
  The public setup form cannot win a bootstrap race. Turborepo starts in loose
  runtime-env mode so secrets intentionally absent from the image build reach Next.js.

## Exact Coolify routing values

- Compose domain mapping: service `web` -> `https://cal.aiagentlbs.com:3000`.
  The port is the container port consumed by Coolify's proxy, not a host binding.
- `NEXT_PUBLIC_WEBAPP_URL=https://cal.aiagentlbs.com`
- `ALLOWED_HOSTNAMES='"cal.aiagentlbs.com"'` — the environment value itself
  includes the JSON string quotes. An unquoted hostname or JSON array is invalid here.
- PostgreSQL has no public domain, published port, or proxy route.

## Branding

The source Dockerfile accepts the public branding values at build time so client
bundles do not fall back to Cal.com branding:

- `NEXT_PUBLIC_APP_NAME=AI Agent Labs Calendar`
- `NEXT_PUBLIC_COMPANY_NAME=AI Agent Labs`
- `NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS=info@aiagentlbs.com`
- `NEXT_PUBLIC_WEBAPP_URL=https://cal.aiagentlbs.com`
- `NEXT_PUBLIC_POWERED_BY_URL=https://github.com/AIAgentLbs/cal-diy`
- `NEXT_PUBLIC_SOURCE_CODE_URL=https://github.com/AIAgentLbs/cal-diy`

Russian is already present in the pinned source at
`packages/i18n/locales/ru/common.json`. Russian browser and account locale must
be checked after deployment rather than inferred from the file alone.

The fork replaces the default wordmark, icon, favicon references, and accessible
logo text with AI Agent Labs assets and copy. The existing booking-page footer
loads the same customized `/api/logo`, while its target comes from the AGPL-side
`NEXT_PUBLIC_POWERED_BY_URL` constant; no commercially licensed `features/ee`
source is modified. This is an AGPL source patch, not an upstream commercial
white-label switch. Public pages still require a post-deploy screenshot/text
audit because upstream help links or product-specific copy can change between releases.
The public booking footer and authenticated sidebar visibly link to the exact
Corresponding Source as `Исходный код / Source code`.

## Webhooks and email

- `TASKER_ENABLE_WEBHOOKS=1` puts webhook work into Cal.diy's database-backed task queue.
- The private `cron` service invokes both `/api/tasks/cron` and
  `/api/cron/webhookTriggers` once per minute with separate secrets.
- Task logs intentionally contain identifiers and counts but not serialized
  payloads; regression tests protect webhook secrets and attendee email addresses.
- SMTP variables are deliberately unset in source control. Keep
  `NEXT_PUBLIC_DISABLE_SIGNUP=true` until a domain-authorized sender has passed
  a real invite, verification, booking confirmation, cancellation, and recipient-inbox smoke test.

Create the first administrator once, before announcing the domain, by posting
the setup form fields to `/api/auth/setup` with `Content-Type: application/json`
and either the generated Bearer authorization header or JSON `setup_secret` field.
A second request is rejected because the database is no longer empty. Do not copy
the setup secret into operator handoff records after login has been verified.

## Production evidence (2026-08-21)

- Domain: `https://cal.aiagentlbs.com`; DNS resolves to `5.78.46.146`; TLS verification succeeds.
- Coolify application: `p4f9qrrdzm2aaiiulhtkm5vd`.
- Deployed application commit: `3552475987ff6a12fcb9822a4e532a867120b508`.
- Locally compiled application image: `sha256:564c5e084559bd5c64dadcde7290741b9ecd53e946fa886bf8370c45d8049adf`.
- The GitHub-triggered deployment finished successfully and all three services run:
  PostgreSQL and web are healthy; cron runs with its inapplicable inherited web
  healthcheck disabled.
- Startup found 588 Prisma migrations and reported no pending migrations.
- First admin `mihailorama@gmail.com` exists; a repeat bootstrap returns
  `400 No setup needed`; credentials login succeeds. The password is stored in
  the operator's macOS Keychain, not in Git or this document.
- Account locale is `ru`; the Russian login UI, custom application title, logo,
  DNS, and TLS were checked over the public domain.
- `/api/tasks/cron` and `/api/cron/webhookTriggers` both return HTTP 200 with
  their separate runtime credentials. The cron PID remains up across multiple cycles.
- Public signup stays disabled. Admin 2FA/onboarding, the first real event type,
  external calendar accounts, SMTP delivery, and the production CRM webhook target
  require owner-specific inputs and are intentionally not claimed complete.
- A full source build can temporarily consume 20-25 GB. The server's existing
  hourly disk guard and weekly cache task were repaired to use the supported
  `docker builder prune -f`; final free space was 32 GB (79% used). No Docker
  volumes or application databases were removed.

## Deployment milestones

- [x] Pin upstream release and commit.
- [x] Create the public source repository and preserve the upstream remote.
- [x] Add a Coolify compose file that builds from local source.
- [x] Run targeted regression tests and Compose configuration validation.
- [x] Complete independent architecture/security review and resolve its code findings.
- [x] Complete the full Node 20 source build in Coolify.
- [x] Create DNS, Coolify project/application, persistent PostgreSQL, and runtime secrets.
- [x] Verify migrations, exact deployed commit, HTTPS, Russian UI/account locale,
  protected bootstrap, credentials login, cron endpoints, and persistence across redeploys.
- [x] Verify GitHub webhook autodeploy from follow-up commits.
- [ ] Complete owner onboarding and admin 2FA, then create the first real event type
  and verify its public booking page and Corresponding Source link.
- [ ] Configure SMTP and verify invite, password reset, booking, cancellation,
  and recipient-inbox delivery while keeping public signup disabled until green.
- [ ] Configure the production CRM webhook URL/signing secret and verify a real
  booking event, retry behavior, and CRM-side receipt.

## Update procedure

1. Fetch `upstream` and inspect the target release notes and diff.
2. Create an update branch from the deployed `main` revision.
3. Merge the exact upstream tag; do not float on upstream `main`.
4. Resolve local Dockerfile/branding patches explicitly.
5. Build and test locally, then deploy to staging or a preview domain.
6. Back up PostgreSQL before a release containing Prisma migrations.
7. Merge to `main`, observe the Coolify deployment, and verify the exact SHA.

## Rollback

Before any upgrade that can run Prisma migrations, open the Coolify terminal
for this Compose application and create a custom-format dump from the live stack:

```bash
docker compose -f docker-compose.coolify.yml exec -T postgres \
  pg_dump -U cal -d cal -Fc > cal-before-<release>.dump
sha256sum cal-before-<release>.dump > cal-before-<release>.dump.sha256
docker compose -f docker-compose.coolify.yml exec -T postgres \
  pg_restore --list < cal-before-<release>.dump >/dev/null
```

Store the dump and checksum outside the application volume. To restore, stop
`web` and `cron`, create a fresh database, restore with
`docker compose -f docker-compose.coolify.yml exec -T postgres pg_restore
--clean --if-exists --no-owner -U cal -d cal < cal-before-<release>.dump`, then deploy the exact
application SHA that produced that schema. A UI-only application rollback is
safe only when no migration ran; otherwise the matching dump and exact prior
SHA are both required.
