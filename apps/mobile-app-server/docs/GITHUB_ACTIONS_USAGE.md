
(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs % git commit -m "describe gh usage"
[main e482084] describe gh usage
 1 file changed, 23 insertions(+)
 create mode 100644 apps/mobile-app-server/docs/GITHUB_ACTIONS_AUTH.md
(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs % git push origin main
Enumerating objects: 10, done.
Counting objects: 100% (10/10), done.
Delta compression using up to 10 threads
Compressing objects: 100% (6/6), done.
Writing objects: 100% (6/6), 966 bytes | 966.00 KiB/s, done.
Total 6 (delta 3), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (3/3), completed with 3 local objects.
To github.com:inquisitivefrog/nodejs.git
   f90ab13..e482084  main -> main
(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs %

(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs % gh auth status
github.com
  ✓ Logged in to github.com account inquisitivefrog (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token: gho_************************************
  - Token scopes: 'gist', 'read:org', 'repo'
(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs %


(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs % gh status
Assigned Issues                                                                                    │ Assigned Pull Requests                                                                             
Nothing here ^_^                                                                                   │ Nothing here ^_^                                                                                   
                                                                                                   │                                                                                                    
Review Requests                                                                                    │ Mentions                                                                                           
Nothing here ^_^                                                                                   │ Nothing here ^_^                                                                                   
                                                                                                   │                                                                                                    
Repository Activity
Nothing here ^_^

(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs %

(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs % gh run list
STATUS  TITLE                                                  WORKFLOW     BRANCH  EVENT  ID           ELAPSED  AGE                   
✓       describe gh usage                                      CD Pipeline  main    push   20281158294  16s      less than a minute ago
X       describe gh usage                                      CI Pipeline  main    push   20281158282  42s      less than a minute ago
✓       update project README                                  CD Pipeline  main    push   20280752028  21s      about 16 minutes ago
X       update project README                                  CI Pipeline  main    push   20280752023  46s      about 16 minutes ago
X       configure Monitoring (Grafana,Prometheus) with Cursor  CI Pipeline  main    push   20280161480  36s      about 38 minutes ago
X       monitoring by prometheus, grafana via Cursor           CI Pipeline  main    push   20277909598  39s      about 2 hours ago
(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs %

(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs % gh workflow list
NAME               STATE   ID       
CD Pipeline        active  216473553
CI Pipeline        active  216447612
Dependency Review  active  216473555
(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs %

(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs % gh cache list
No caches found in inquisitivefrog/nodejs
(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs %

(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs % gh run view 20281158282

X main CI Pipeline · 20281158282
Triggered via push about 6 minutes ago

JOBS
X Run Tests in 38s (ID 58243179313)
  ✓ Set up job
  ✓ Initialize containers
  ✓ Checkout code
  ✓ Setup Node.js
  X Install dependencies
  - Run linter (if configured)
  - Run all tests with coverage
  - Upload coverage reports
  - Post Setup Node.js
  ✓ Post Checkout code
  ✓ Stop containers
  ✓ Complete job
- Docker Compose Integration Test in 0s (ID 58243245600)
- Security Scanning in 0s (ID 58243245656)
- Build Docker Images in 0s (ID 58243245672)

ANNOTATIONS
X Process completed with exit code 1.
Run Tests: .github#102

To see what failed, try: gh run view 20281158282 --log-failed
View this run on GitHub: https://github.com/inquisitivefrog/nodejs/actions/runs/20281158282
(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs %

(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs % gh run view 20281158282 --log-failed
Run Tests	Install dependencies	2025-12-16T20:06:09.0947537Z ##[group]Run npm ci
Run Tests	Install dependencies	2025-12-16T20:06:09.0947807Z npm ci
Run Tests	Install dependencies	2025-12-16T20:06:09.0991403Z shell: /usr/bin/bash -e {0}
Run Tests	Install dependencies	2025-12-16T20:06:09.0991642Z env:
Run Tests	Install dependencies	2025-12-16T20:06:09.0991813Z   NODE_VERSION: 20
Run Tests	Install dependencies	2025-12-16T20:06:09.0992165Z   REGISTRY: ghcr.io
Run Tests	Install dependencies	2025-12-16T20:06:09.0992387Z   IMAGE_PREFIX: inquisitivefrog/nodejs
Run Tests	Install dependencies	2025-12-16T20:06:09.0992627Z ##[endgroup]
Run Tests	Install dependencies	2025-12-16T20:06:12.1757673Z npm error code EUSAGE
Run Tests	Install dependencies	2025-12-16T20:06:12.1758257Z npm error
Run Tests	Install dependencies	2025-12-16T20:06:12.1759874Z npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
Run Tests	Install dependencies	2025-12-16T20:06:12.1761508Z npm error
Run Tests	Install dependencies	2025-12-16T20:06:12.1762277Z npm error Missing: @sentry/node@8.55.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1763123Z npm error Missing: @sentry/profiling-node@8.55.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1764105Z npm error Missing: @opentelemetry/context-async-hooks@1.30.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1765145Z npm error Missing: @opentelemetry/core@1.30.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1766120Z npm error Missing: @opentelemetry/instrumentation@0.57.2 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1767201Z npm error Missing: @opentelemetry/instrumentation-amqplib@0.46.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1768339Z npm error Missing: @opentelemetry/instrumentation-connect@0.43.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1769447Z npm error Missing: @opentelemetry/instrumentation-dataloader@0.16.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1771013Z npm error Missing: @opentelemetry/instrumentation-express@0.47.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1772335Z npm error Missing: @opentelemetry/instrumentation-fastify@0.44.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1773269Z npm error Missing: @opentelemetry/instrumentation-fs@0.19.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1774200Z npm error Missing: @opentelemetry/instrumentation-generic-pool@0.43.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1775159Z npm error Missing: @opentelemetry/instrumentation-graphql@0.47.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1776109Z npm error Missing: @opentelemetry/instrumentation-hapi@0.45.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1776941Z npm error Missing: @opentelemetry/instrumentation-http@0.57.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1777847Z npm error Missing: @opentelemetry/instrumentation-ioredis@0.47.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1778773Z npm error Missing: @opentelemetry/instrumentation-kafkajs@0.7.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1779567Z npm error Missing: @opentelemetry/instrumentation-knex@0.44.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1780109Z npm error Missing: @opentelemetry/instrumentation-koa@0.47.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1780696Z npm error Missing: @opentelemetry/instrumentation-lru-memoizer@0.44.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1781288Z npm error Missing: @opentelemetry/instrumentation-mongodb@0.51.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1782113Z npm error Missing: @opentelemetry/instrumentation-mongoose@0.46.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1783175Z npm error Missing: @opentelemetry/instrumentation-mysql@0.45.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1784282Z npm error Missing: @opentelemetry/instrumentation-mysql2@0.45.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1785549Z npm error Missing: @opentelemetry/instrumentation-nestjs-core@0.44.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1786701Z npm error Missing: @opentelemetry/instrumentation-pg@0.50.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1787882Z npm error Missing: @opentelemetry/instrumentation-redis-4@0.46.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1789094Z npm error Missing: @opentelemetry/instrumentation-tedious@0.18.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1790283Z npm error Missing: @opentelemetry/instrumentation-undici@0.10.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1791332Z npm error Missing: @opentelemetry/resources@1.30.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1792517Z npm error Missing: @opentelemetry/sdk-trace-base@1.30.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1793664Z npm error Missing: @opentelemetry/semantic-conventions@1.38.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1795115Z npm error Missing: @prisma/instrumentation@5.22.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1796008Z npm error Missing: @sentry/core@8.55.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1796811Z npm error Missing: @sentry/opentelemetry@8.55.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1797744Z npm error Missing: import-in-the-middle@1.15.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1798774Z npm error Missing: @opentelemetry/semantic-conventions@1.28.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1799792Z npm error Missing: @opentelemetry/api-logs@0.57.2 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1800684Z npm error Missing: @types/shimmer@1.2.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1802046Z npm error Missing: require-in-the-middle@7.5.2 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1802819Z npm error Missing: shimmer@1.2.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1803521Z npm error Missing: @types/connect@3.4.36 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1804469Z npm error Missing: @opentelemetry/instrumentation@0.57.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1805595Z npm error Missing: @opentelemetry/semantic-conventions@1.28.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1806561Z npm error Missing: forwarded-parse@2.1.2 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1807479Z npm error Missing: @opentelemetry/redis-common@0.36.2 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1808360Z npm error Missing: @types/mysql@2.15.26 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1809264Z npm error Missing: @opentelemetry/sql-common@0.40.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1810291Z npm error Missing: @opentelemetry/semantic-conventions@1.27.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1811231Z npm error Missing: @types/pg@8.6.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1812160Z npm error Missing: @types/pg-pool@2.0.6 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1812936Z npm error Missing: @types/tedious@4.0.14 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1813910Z npm error Missing: @opentelemetry/semantic-conventions@1.28.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1815046Z npm error Missing: @opentelemetry/semantic-conventions@1.28.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1816167Z npm error Missing: @opentelemetry/instrumentation@0.53.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1817032Z npm error Missing: node-abi@3.85.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1817822Z npm error Missing: pg-protocol@1.10.3 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1818568Z npm error Missing: pg-types@2.2.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1819320Z npm error Missing: acorn@8.15.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1820151Z npm error Missing: acorn-import-attributes@1.9.5 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1821084Z npm error Missing: module-details-from-path@1.0.4 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1822103Z npm error Missing: pg-int8@1.0.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1822928Z npm error Missing: postgres-array@2.0.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1823680Z npm error Missing: postgres-bytea@1.0.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1824523Z npm error Missing: postgres-date@1.0.7 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1825328Z npm error Missing: postgres-interval@1.2.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1826115Z npm error Missing: debug@4.4.3 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1826976Z npm error Missing: @opentelemetry/api-logs@0.57.1 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1827863Z npm error Missing: @opentelemetry/api-logs@0.53.0 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1828677Z npm error Missing: ms@2.1.3 from lock file
Run Tests	Install dependencies	2025-12-16T20:06:12.1829159Z npm error
Run Tests	Install dependencies	2025-12-16T20:06:12.1829612Z npm error Clean install a project
Run Tests	Install dependencies	2025-12-16T20:06:12.1830106Z npm error
Run Tests	Install dependencies	2025-12-16T20:06:12.1830467Z npm error Usage:
Run Tests	Install dependencies	2025-12-16T20:06:12.1830833Z npm error npm ci
Run Tests	Install dependencies	2025-12-16T20:06:12.1831170Z npm error
Run Tests	Install dependencies	2025-12-16T20:06:12.1831492Z npm error Options:
Run Tests	Install dependencies	2025-12-16T20:06:12.1832540Z npm error [--install-strategy <hoisted|nested|shallow|linked>] [--legacy-bundling]
Run Tests	Install dependencies	2025-12-16T20:06:12.1833791Z npm error [--global-style] [--omit <dev|optional|peer> [--omit <dev|optional|peer> ...]]
Run Tests	Install dependencies	2025-12-16T20:06:12.1835043Z npm error [--include <prod|dev|optional|peer> [--include <prod|dev|optional|peer> ...]]
Run Tests	Install dependencies	2025-12-16T20:06:12.1836285Z npm error [--strict-peer-deps] [--foreground-scripts] [--ignore-scripts] [--no-audit]
Run Tests	Install dependencies	2025-12-16T20:06:12.1837544Z npm error [--no-bin-links] [--no-fund] [--dry-run]
Run Tests	Install dependencies	2025-12-16T20:06:12.1838513Z npm error [-w|--workspace <workspace-name> [-w|--workspace <workspace-name> ...]]
Run Tests	Install dependencies	2025-12-16T20:06:12.1839657Z npm error [-ws|--workspaces] [--include-workspace-root] [--install-links]
Run Tests	Install dependencies	2025-12-16T20:06:12.1840370Z npm error
Run Tests	Install dependencies	2025-12-16T20:06:12.1841092Z npm error aliases: clean-install, ic, install-clean, isntall-clean
Run Tests	Install dependencies	2025-12-16T20:06:12.1841751Z npm error
Run Tests	Install dependencies	2025-12-16T20:06:12.1842378Z npm error Run "npm help ci" for more info
Run Tests	Install dependencies	2025-12-16T20:06:12.1843671Z npm error A complete log of this run can be found in: /home/runner/.npm/_logs/2025-12-16T20_06_09_164Z-debug-0.log
Run Tests	Install dependencies	2025-12-16T20:06:12.1951754Z ##[error]Process completed with exit code 1.
(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs % 

(⎈|N/A:N/A)tim@Timothys-MacBook-Air nodejs % gh run list --limit 1 --json databaseId --jq '.[0].databaseId' 
20281512581
(⎈|N/A:N/A)tim@Timothys-MacBook-Air nodejs % gh run list --limit 1 --json databaseId --jq '.[0].databaseId' | xargs gh run watch
X main CI Pipeline · 20281512581
Triggered via push about 1 minute ago

JOBS
X Run Tests in 1m24s (ID 58244477557)
  ✓ Set up job
  ✓ Initialize containers
  ✓ Checkout code
  ✓ Setup Node.js
  ✓ Install dependencies
  ✓ Run linter (if configured)
  X Run all tests with coverage
  - Upload coverage reports
  - Post Setup Node.js
  ✓ Post Checkout code
  ✓ Stop containers
  ✓ Complete job
- Build Docker Images in 0s (ID 58244603997)
- Security Scanning in 0s (ID 58244604129)
- Docker Compose Integration Test (ID 58244604245)

ANNOTATIONS
X Process completed with exit code 1.
Run Tests: .github#2595


X Run CI Pipeline (20281512581) completed with 'failure'

(⎈|N/A:N/A)tim@Timothys-MacBook-Air mobile-app-server % gh run watch 20281512581

