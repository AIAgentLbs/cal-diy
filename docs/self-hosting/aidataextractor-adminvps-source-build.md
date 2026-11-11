# AI Data Extractor calendar on AdminVPS

Status: deployed and publicly verified on 2026-08-25. Application SMTP and a production CRM webhook target remain unconfigured.

## Production contract

- Canonical URL: `https://cal.aidataextractor.pro`
- Russian alias: `https://cal.aidataextractor.ru`; HTTP and HTTPS return `301` to the canonical host while preserving the path and query string.
- Server: AdminVPS `157.22.230.99`.
- Public Corresponding Source: `https://github.com/AIAgentLbs/cal-diy/tree/cx/aidataextractor-ru`.
- Source image commit: `90bb3ff5811a5241805c08c2a1965b5c38ce2b42`.
- Deployed application image ID: `sha256:6cbceb1131a68c5f08a4a77134942ea102dc40ab41a5338400b7990f76ae3f80`.
- Current deployment/config commit: `be657ef21f3c84b0677ba3b017fa26377fcd2071`.
- GitHub source-build run: `https://github.com/AIAgentLbs/cal-diy/actions/runs/32839689352`.

The application runs as a Docker Swarm stack named `cal-aidataextractor` with isolated `web`, `cron`, and PostgreSQL services. The shared production nginx reaches `web` only through the existing overlay network alias `cal-web`; PostgreSQL has no host port.

## DNS and TLS

- `aidataextractor.pro` is managed through the Namecheap API. The complete zone has 15 records, including `cal A 157.22.230.99` with TTL 300.
- `aidataextractor.ru` is managed in Nethouse/Registrant. The `cal A 157.22.230.99` record has TTL 300 and panel record ID `5298505`.
- The `.ru` update was made only after snapshotting all 23 records. Verification found 24 records afterwards: all original rows were unchanged and the `cal` A record was the only addition.
- Let's Encrypt certificate lineage `cal.aidataextractor.pro` covers both `cal.aidataextractor.pro` and `cal.aidataextractor.ru`; the initial certificate expires on 2026-11-23 and Certbot renewal is installed.
- Active nginx config: `/opt/cal-aidataextractor/nginx/cal.aidataextractor.pro.active.conf`, bind-mounted into `deploy-stack_nginx`. The file is shared: the aidept vhost follows the `# aidept.pro (AIAgentLbs/aidept` marker. Install the calendar part only with `ops/adminvps/install-nginx-vhost.sh` (keeps the aidept tail, same inode, `nginx -t`, reload, auto-restore). SHA-256 after the 2026-11-10 install: `649f61d42175fe4c3924b689101e91628059e963caf1ecadc4b05a64735265b3`.
- `https://cal.aidataextractor.pro/` returns 302 to the public demo event `/mihailorama/demo` (query kept); `/auth/login` stays reachable for the owner.

## Zone recovery evidence

During the first Namecheap API write, incorrect setHosts parameter names caused a temporary empty `.pro` zone. The zone was restored immediately from the exact pre-write response saved at `/opt/cal-aidataextractor/backups/namecheap-aidataextractor-pro-before-cal-apply-20260825T104057Z.xml`.

Post-recovery checks confirmed all 14 original records plus the new `cal` A record. A second API run was idempotent with 15 records. The helper now uses Namecheap's required `HostNameN` and `RecordTypeN` fields, refuses an empty-zone write without an explicit restore snapshot, verifies the complete record multiset after each write, and has a regression test for the API field mapping.

The transient zone loss produced an `ENOTFOUND` alert for `mail.aidataextractor.pro`. After restoration, both authoritative Namecheap servers, Cloudflare DNS, and Google DNS returned `mail A 169.58.46.26` and `MX 10 mail.aidataextractor.pro`. HTTPS returned 200 with valid TLS; IMAPS 993 and Submission 587 were reachable from both the operator machine and AdminVPS.

## Acceptance evidence

- `https://cal.aidataextractor.pro/auth/login` returns 200.
- Browser title: `Вход | Календарь AI Data Extractor`; login page and administrator locale are Russian.
- `https://cal.aidataextractor.ru/auth/login?probe=doh` returns 301 to `https://cal.aidataextractor.pro/auth/login?probe=doh` through a public DNS-over-HTTPS resolver.
- Public resolvers `1.1.1.1`, `8.8.8.8`, `9.9.9.9`, and `77.88.8.8` return `157.22.230.99` for the `.ru` alias.
- Certificate SAN contains both hostnames.
- Swarm services `web`, `cron`, `postgres`, and shared nginx were all `1/1`; recent nginx logs contained no HTTP 5xx.
- Existing `aidataextractor.pro`, `app.aidataextractor.pro`, and `mail.aidataextractor.pro` smoke checks remained green after the nginx update.

## Remaining production gates

- Configure SMTP in the private server environment and verify password reset, booking confirmation, cancellation, and recipient-inbox delivery. Public signup remains disabled.
- Configure the real CRM webhook endpoint and signing requirements, then verify an actual booking event and CRM-side receipt.
- Complete the first real event type and external calendar connection under the owner account.

## 2026-11-10 branding and root redirect

- Owner complaint: the bare domain opened an «AI Agent Labs» login page. Fixed in PR https://github.com/AIAgentLbs/cal-diy/pull/2.
- Image `ghcr.io/aiagentlbs/cal-diy:aidataextractor-8fa03bab5cd48fab57df28c4e3fdcd21161022ca` (image ID `sha256:fe2dec8325c9beb8b82fdc70544fa884562b90dcdcf1c17f98396ec6bf552b13`), build run https://github.com/AIAgentLbs/cal-diy/actions/runs/42852040843.
- Redeploy: backup `.env` and `docker-stack.yml` into `backups/`, copy `docker-stack.adminvps.yml` to `docker-stack.yml`, set `CALDIY_IMAGE_NAME` in `.env`, `set -a; . ./.env; set +a; docker stack deploy -c docker-stack.yml cal-aidataextractor`. All three services returned to `1/1`.
- Verified live: `/` 302 to `/mihailorama/demo`; booking page and login show the AI Data Extractor logo; the booking form links terms to `https://aidataextractor.pro/oferta` and privacy to `https://aidataextractor.pro/privacy`; `/aiagentlabs-logo.svg` 404; the email logo `/emails/logo.png` is the AI Data Extractor mark. Slot selection reaches the confirmation form; no booking was submitted.

## Mail: use port 587 on AdminVPS (2026-11-11)

AdminVPS drops SMTP/TLS sessions to `smtp.resend.com` on ports 465, 2465 and 2587 after the first
few kilobytes: short messages pass, a booking e-mail with its `.ics` attachment stalls and
`/api/book/event` hangs without sending anything. Port 587 (STARTTLS) passes 60 KB messages.
`.env` therefore sets `EMAIL_SERVER_PORT=587` (backup of the previous `.env` in `backups/`).
The `demo` event uses Mike's Zoom personal room link as its location (Vaultwarden item
"Zoom — Mike Sadofyev (Workplace Pro, mihailorama@gmail.com)"); Cal Video has no Daily key here.
