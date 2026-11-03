-- Analytics for the /admin page. Safe to re-run.

CREATE TABLE IF NOT EXISTS sessions (
  id            uuid PRIMARY KEY,
  visitor_id    uuid NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  last_seen     timestamptz NOT NULL DEFAULT now(),
  active_ms     bigint NOT NULL DEFAULT 0,

  -- How they got here
  landing_path  text,
  referrer      text,
  source        text NOT NULL DEFAULT 'Direct',
  ref           text,
  utm           jsonb NOT NULL DEFAULT '{}',

  -- Derived on the server from the request
  ip            text,
  country       text,
  region        text,
  city          text,
  postal_code   text,
  latitude      double precision,
  longitude     double precision,
  timezone      text,
  org           text,
  isp           text,
  org_domain    text,
  user_agent    text,
  browser       text,
  os            text,
  device_type   text,
  device_model  text,
  is_bot        boolean NOT NULL DEFAULT false,

  -- Reported by the browser (screen size, language and so on)
  client        jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS sessions_started_at_idx ON sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS sessions_visitor_idx ON sessions (visitor_id, started_at);

CREATE TABLE IF NOT EXISTS events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id   uuid NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  type         text NOT NULL,
  name         text,
  path         text,
  meta         jsonb,
  occurred_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_session_idx ON events (session_id, occurred_at);
CREATE INDEX IF NOT EXISTS events_type_idx ON events (type, occurred_at);

-- Failed /admin logins, used to slow down password guessing.
CREATE TABLE IF NOT EXISTS login_attempts (
  ip            text NOT NULL,
  attempted_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_idx ON login_attempts (ip, attempted_at);
