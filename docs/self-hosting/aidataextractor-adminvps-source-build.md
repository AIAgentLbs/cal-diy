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
- Active nginx config: `/opt/cal-aidataextractor/nginx/cal.aidataextractor.pro.active.conf`; verified SHA-256 `6b7e715d5a85cdbc0bec16bc821e532e5733e37adce0e21786792084591d1fd7`.

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
