# cal.aiagentlbs.com source-build deployment

Status: implementation reviewed; production rollout in progress

## Goal

Run the pinned Cal.diy source at `https://cal.aiagentlbs.com` from the private
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
- First-admin creation requires `Authorization: Bearer <SETUP_SECRET>` matching the
  `SETUP_SECRET` stored in Coolify. The public setup form cannot win a bootstrap race.

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
and the generated Bearer authorization header. A second request is rejected because
the database is no longer empty. Remove the setup secret from operator handoff
records after login has been verified.

## Deployment milestones

- [x] Pin upstream release and commit.
- [x] Create the private source repository and preserve the upstream remote.
- [x] Add a Coolify compose file that builds from local source.
- [x] Run targeted regression tests and Compose configuration validation.
- [x] Complete independent architecture/security review and resolve its code findings.
- [ ] Complete the full Node 20 container build in Coolify (the workstation runs unsupported Node 26 and has no Docker daemon).
- [ ] Create DNS, Coolify project/application, and runtime secrets.
- [ ] Verify migrations, exact deployed commit, HTTPS, Russian UI, signup/login,
  booking-page rendering, persistence after redeploy, and webhook configuration UI.
- [ ] Verify GitHub webhook autodeploy from a harmless follow-up commit.

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
