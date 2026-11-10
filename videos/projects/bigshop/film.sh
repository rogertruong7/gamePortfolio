#!/usr/bin/env bash
# Refilms this project's demo from nothing: copies the app, starts a throwaway database and the mocks,
# records, composes, and stops whatever it started. Run it from anywhere.
#
#   videos/projects/bigshop/film.sh            final render to web/public/videos/bigshop.{mp4,jpg}
#   videos/projects/bigshop/film.sh --draft    quick render, for checking
#
# APP_SOURCE overrides where the app is copied from. The source is only ever read.
# Request logs for the last run stay in videos/build/bigshop/logs.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIDEOS="$(cd "$HERE/../.." && pwd)"
APP_SOURCE="${APP_SOURCE:-$HOME/coding/bigshop}"
TMP_ROOT="${TMPDIR:-/tmp}"
TMP_ROOT="${TMP_ROOT%/}"

CONTAINER=portfolio-demo-pg
PG_PORT=5460
MOCK_PORT=4110
APP_PORT=4111
DATABASE_URL="postgres://postgres:demo@127.0.0.1:$PG_PORT/bigshop"
LOGS="$VIDEOS/build/bigshop/logs"

COMPOSE_FLAGS=()
for arg in "$@"; do
  case "$arg" in
    --draft) COMPOSE_FLAGS+=(--draft) ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

WORK=""
MOCK_PID=""
APP_PID=""
PG_CREATED=0
PG_STARTED=0

say() { echo "==> $*"; }

stop_group() {
  local pid="$1"
  [ -n "$pid" ] || return 0
  kill -TERM -- "-$pid" 2>/dev/null || return 0
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    kill -0 -- "-$pid" 2>/dev/null || return 0
    sleep 0.5
  done
  kill -KILL -- "-$pid" 2>/dev/null || true
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  say "stopping what this run started"
  stop_group "$APP_PID"
  stop_group "$MOCK_PID"
  if [ "$PG_CREATED" = 1 ]; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  elif [ "$PG_STARTED" = 1 ]; then
    docker stop "$CONTAINER" >/dev/null 2>&1 || true
  fi
  [ -n "$WORK" ] && rm -rf "$WORK"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

port_in_use() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

# Starts a command in its own process group, so stopping it takes its children too.
start_group() {
  local logfile="$1"
  shift
  set -m
  "$@" >"$logfile" 2>&1 &
  STARTED_PID=$!
  set +m
}

wait_for_http() {
  local url="$1" name="$2" pid="$3" tries="$4"
  for _ in $(seq 1 "$tries"); do
    curl -fsS -o /dev/null --max-time 20 "$url" 2>/dev/null && return 0
    kill -0 "$pid" 2>/dev/null || { echo "$name exited early; see $LOGS" >&2; return 1; }
    sleep 1
  done
  echo "$name wasn't ready at $url; see $LOGS" >&2
  return 1
}

# 0. Fail before touching anything if something else holds these ports.
[ -f "$APP_SOURCE/package.json" ] || { echo "no app at $APP_SOURCE" >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "docker isn't running" >&2; exit 1; }
for port in "$MOCK_PORT" "$APP_PORT"; do
  if port_in_use "$port"; then echo "port $port is already in use" >&2; exit 1; fi
done
PG_RUNNING="$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null || echo missing)"
if [ "$PG_RUNNING" != true ] && port_in_use "$PG_PORT"; then
  echo "port $PG_PORT is already in use" >&2
  exit 1
fi

rm -rf "$LOGS"
mkdir -p "$LOGS"
[ -d "$VIDEOS/node_modules" ] || (cd "$VIDEOS" && npm install)

# 1. A throwaway copy, without any secrets or build output.
WORK="$(mktemp -d "$TMP_ROOT/bigshop-film.XXXXXX")"
APP="$WORK/app"
say "copying $APP_SOURCE to $APP"
mkdir -p "$APP"
rsync -a --delete --exclude node_modules --exclude .next --exclude '.env*' --exclude .git --exclude .vercel \
  "$APP_SOURCE/" "$APP/"

# 2. Its dependencies.
say "installing dependencies"
(cd "$APP" && pnpm install --prefer-offline >"$LOGS/pnpm-install.log" 2>&1) || {
  echo "pnpm install failed; see $LOGS/pnpm-install.log" >&2
  exit 1
}

# 3. The database.
case "$PG_RUNNING" in
  true) say "using the running $CONTAINER" ;;
  false)
    say "starting $CONTAINER"
    docker start "$CONTAINER" >/dev/null
    PG_STARTED=1
    ;;
  *)
    say "creating $CONTAINER"
    docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=demo -p "$PG_PORT:5432" postgres:17-alpine >/dev/null
    PG_CREATED=1
    ;;
esac
for _ in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready -q -h 127.0.0.1 -U postgres 2>/dev/null && break
  sleep 1
done
docker exec "$CONTAINER" pg_isready -q -h 127.0.0.1 -U postgres
if ! docker exec "$CONTAINER" psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'bigshop'" | grep -q 1; then
  docker exec "$CONTAINER" createdb -U postgres bigshop
fi
say "running migrations"
(cd "$APP" && DATABASE_URL="$DATABASE_URL" pnpm db:migrate >"$LOGS/migrate.log" 2>&1) || {
  echo "migrations failed; see $LOGS/migrate.log" >&2
  exit 1
}

# 4. A master key that lives only as long as this run.
CREDENTIAL_KEYS="1:$(openssl rand -base64 32)"

# 5. The mocks and the app.
say "starting the mocks on $MOCK_PORT"
start_group "$LOGS/mocks.out" env MOCK_LOG="$LOGS/mocks.jsonl" node "$HERE/mock-anthropic.mjs"
MOCK_PID="$STARTED_PID"
wait_for_http "http://127.0.0.1:$MOCK_PORT/v1/models" mocks "$MOCK_PID" 15

say "starting the app on $APP_PORT"
cd "$APP"
start_group "$LOGS/next.log" env \
  NODE_ENV=development \
  NEXT_TELEMETRY_DISABLED=1 \
  DATABASE_URL="$DATABASE_URL" \
  CREDENTIAL_KEYS="$CREDENTIAL_KEYS" \
  ANTHROPIC_BASE_URL="http://127.0.0.1:$MOCK_PORT" \
  CUUGO_BASE_URL="http://127.0.0.1:$MOCK_PORT" \
  NET_GUARD_LOG="$LOGS/net-guard.jsonl" \
  NODE_OPTIONS="--require \"$HERE/net-guard.cjs\"" \
  node_modules/.bin/next dev --turbo -p "$APP_PORT" -H 127.0.0.1
APP_PID="$STARTED_PID"
cd "$VIDEOS"
wait_for_http "http://127.0.0.1:$APP_PORT/signin" app "$APP_PID" 180

# 6. The film.
say "recording"
FILM_BROWSER_LOG="$LOGS/browser.jsonl" node lib/record.mjs bigshop

# The film must have gone through the mocks, and nowhere it shouldn't.
tracker_calls="$(grep -c '"service":"tracker"' "$LOGS/mocks.jsonl" || true)"
price_calls="$(grep -c '"tool":"submit_prices"' "$LOGS/mocks.jsonl" || true)"
recipe_calls="$(grep -c '"tool":"submit_recipe"' "$LOGS/mocks.jsonl" || true)"
refused="$(grep -c '"refused":true' "$LOGS/net-guard.jsonl" || true)"
blocked="$(grep -c '"allowed":false' "$LOGS/browser.jsonl" || true)"
say "mocks saw $recipe_calls recipe searches, $tracker_calls tracker pages, $price_calls price searches"
say "server connections refused: $refused, browser requests blocked: $blocked"
if [ "$tracker_calls" = 0 ] || [ "$price_calls" = 0 ] || [ "$recipe_calls" = 0 ]; then
  echo "the app didn't use the mocks; not rendering this take" >&2
  exit 1
fi
if [ "$refused" != 0 ]; then
  echo "the app tried to reach a real service; see $LOGS/net-guard.jsonl" >&2
  exit 1
fi

say "composing"
node lib/compose.mjs bigshop ${COMPOSE_FLAGS[@]+"${COMPOSE_FLAGS[@]}"}
say "done: $(cd "$VIDEOS/.." && pwd)/web/public/videos/bigshop.mp4"
