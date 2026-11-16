import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { excludeThisBrowser } from "../Analytics/tracker.js";
import { Breakdown, DailyChart } from "./Charts.jsx";
import GuestLedger from "./GuestLedger.jsx";
import HiddenGuests from "./HiddenGuests.jsx";
import TaggedLinkMaker from "./TaggedLinkMaker.jsx";
import { formatDuration, plural, RANGES } from "./format.js";
import {
  Button,
  color,
  ErrorText,
  fontStack,
  Panel,
  PanelTitle,
  Quiet,
  TextField,
} from "./theme.js";

const SEARCH_DELAY_MS = 300;

class NotLoggedInError extends Error {}

async function readFailure(response) {
  if (response.status === 401) return new NotLoggedInError();
  if (response.status === 503) {
    return new Error("The database isn't configured. Check DATABASE_URL in Vercel.");
  }
  const body = await response.json().catch(() => ({}));
  return new Error(body.error ?? "The server couldn't load this data. Try refreshing.");
}

async function getJson(url) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw await readFailure(response);
  return response.json();
}

async function sendJson(method, url, body) {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await readFailure(response);
  return response.json();
}

const useDebounced = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const LoginScreen = ({ onLoggedIn }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        onLoggedIn();
        return;
      }
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Couldn't log in. Try again.");
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    }
    setIsSubmitting(false);
  };

  return (
    <Centred>
      <LoginBox>
        <Heading>Guestbook</Heading>
        <form onSubmit={submit}>
          <FieldLabel htmlFor="admin-password">Password</FieldLabel>
          <LoginRow>
            <TextField
              id="admin-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button $active disabled={isSubmitting}>
              {isSubmitting ? "Checking…" : "Log in"}
            </Button>
          </LoginRow>
          {error && <ErrorText role="alert">{error}</ErrorText>}
        </form>
      </LoginBox>
    </Centred>
  );
};

const Dashboard = ({ onLoggedOut }) => {
  const [days, setDays] = useState("30");
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingGuests, setIsLoadingGuests] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sort, setSort] = useState({ key: "when", dir: "desc" });
  const [search, setSearch] = useState("");
  const [cvOnly, setCvOnly] = useState(false);
  const [exclusions, setExclusions] = useState([]);
  const [yourIp, setYourIp] = useState(null);
  const [hideError, setHideError] = useState(null);
  const [error, setError] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const debouncedSearch = useDebounced(search, SEARCH_DELAY_MS);

  const handleFailure = useCallback(
    (failure) => {
      if (failure instanceof NotLoggedInError) onLoggedOut();
      else setError(failure.message);
    },
    [onLoggedOut]
  );

  const sessionsUrl = useCallback(
    (offset) => {
      const params = new URLSearchParams({
        days,
        sort: sort.key,
        dir: sort.dir,
        offset: String(offset),
      });
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (cvOnly) params.set("cv", "1");
      return `/api/admin/sessions?${params}`;
    },
    [days, sort, debouncedSearch, cvOnly]
  );

  useEffect(() => {
    let isCurrent = true;
    setError(null);
    Promise.all([
      getJson(`/api/admin/overview?days=${days}`),
      getJson("/api/admin/exclusions"),
    ])
      .then(([nextOverview, nextExclusions]) => {
        if (!isCurrent) return;
        setOverview(nextOverview);
        setExclusions(nextExclusions.exclusions);
        setYourIp(nextExclusions.yourIp);
      })
      .catch((failure) => {
        if (isCurrent) handleFailure(failure);
      });
    return () => {
      isCurrent = false;
    };
  }, [days, refreshCount, handleFailure]);

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingGuests(true);
    getJson(sessionsUrl(0))
      .then((next) => {
        if (!isCurrent) return;
        setSessions(next.sessions);
        setTotal(next.total);
        setHasMore(next.hasMore);
      })
      .catch((failure) => {
        if (isCurrent) handleFailure(failure);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingGuests(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [sessionsUrl, refreshCount, handleFailure]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const next = await getJson(sessionsUrl(sessions.length));
      setSessions((current) => [...current, ...next.sessions]);
      setTotal(next.total);
      setHasMore(next.hasMore);
    } catch (failure) {
      handleFailure(failure);
    }
    setIsLoadingMore(false);
  };

  const refresh = () => setRefreshCount((count) => count + 1);

  const hide = async (kind, value, label) => {
    setHideError(null);
    try {
      await sendJson("POST", "/api/admin/exclusions", { kind, value, label });
      refresh();
      return true;
    } catch (failure) {
      if (failure instanceof NotLoggedInError) onLoggedOut();
      else setHideError(failure.message);
      return false;
    }
  };

  const unhide = async ({ kind, value }) => {
    setHideError(null);
    try {
      await sendJson("DELETE", "/api/admin/exclusions", { kind, value });
      refresh();
    } catch (failure) {
      if (failure instanceof NotLoggedInError) onLoggedOut();
      else setHideError(failure.message);
    }
  };

  const logOut = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    onLoggedOut();
  };

  const range = RANGES.find((option) => option.days === days);
  const totals = overview?.totals;

  return (
    <Layout>
      <TopBar>
        <Heading>Guestbook</Heading>
        <Controls>
          <RangeGroup role="group" aria-label="Time range">
            {RANGES.map((option) => (
              <Button
                key={option.days}
                $active={option.days === days}
                aria-pressed={option.days === days}
                onClick={() => setDays(option.days)}
              >
                {option.label}
              </Button>
            ))}
          </RangeGroup>
          <Button onClick={refresh}>Refresh</Button>
          <Button onClick={logOut}>Log out</Button>
        </Controls>
      </TopBar>

      {error && <ErrorText role="alert">{error}</ErrorText>}

      {!overview && !error && <Quiet>Loading…</Quiet>}

      {overview && (
        <>
          <Summary>
            <Headline>
              {plural(totals.visitors, "guest")} {range.phrase}.{" "}
              {totals.cv_sessions === 0
                ? "Nobody has taken your CV."
                : `Your CV was taken on ${plural(totals.cv_sessions, "visit")}.`}
            </Headline>
            <Numbers>
              <Stat label="Visits" value={totals.sessions} />
              <Stat label="Came back" value={totals.returning_visitors} />
              <Stat label="Went into a building" value={totals.entered_building_sessions} />
              <Stat
                label="Average stay"
                value={formatDuration(totals.avg_active_seconds * 1000)}
              />
            </Numbers>
          </Summary>

          <Panel>
            <PanelTitle>Visits per day</PanelTitle>
            <DailyChart days={overview.daily} />
          </Panel>

          <Panel>
            <PanelTitle>Guests</PanelTitle>
            <GuestLedger
              sessions={sessions}
              total={total}
              hasMore={hasMore}
              isLoading={isLoadingGuests}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMore}
              sort={sort}
              onSort={setSort}
              search={search}
              onSearch={setSearch}
              cvOnly={cvOnly}
              onCvOnly={setCvOnly}
              onHide={hide}
            />
          </Panel>

          <Columns>
            <Panel>
              <PanelTitle>Where they came from</PanelTitle>
              <Breakdown
                rows={overview.sources}
                nameLabel="Source"
                showCv
                empty="No visits in this period."
              />
            </Panel>
            <Panel>
              <PanelTitle>Where they went</PanelTitle>
              <Breakdown
                rows={overview.places}
                nameLabel="Place"
                empty="Nobody has gone into a building in this period."
              />
            </Panel>
            <Panel>
              <PanelTitle>Companies and networks</PanelTitle>
              <Breakdown
                rows={overview.organisations}
                nameLabel="Network"
                showCv
                empty="No networks identified in this period."
              />
            </Panel>
            <Panel>
              <PanelTitle>Cities</PanelTitle>
              <Breakdown
                rows={overview.cities}
                nameLabel="City"
                empty="No cities identified in this period."
              />
            </Panel>
            <Panel>
              <PanelTitle>Countries</PanelTitle>
              <Breakdown
                rows={overview.countries}
                nameLabel="Country"
                empty="No countries identified in this period."
              />
            </Panel>
            <Panel>
              <PanelTitle>Devices</PanelTitle>
              <Breakdown
                rows={overview.devices}
                nameLabel="Device"
                empty="No devices recorded in this period."
              />
            </Panel>
            <Panel>
              <PanelTitle>Browsers</PanelTitle>
              <Breakdown
                rows={overview.browsers}
                nameLabel="Browser"
                empty="No browsers recorded in this period."
              />
            </Panel>
            <Panel>
              <PanelTitle>Links they clicked</PanelTitle>
              <Breakdown
                rows={overview.outbound}
                nameLabel="Link"
                empty="Nobody has clicked a link in this period."
              />
            </Panel>
          </Columns>

          <Columns>
            <Panel>
              <PanelTitle>Hidden guests</PanelTitle>
              <HiddenGuests
                exclusions={exclusions}
                yourIp={yourIp}
                onHide={hide}
                onUnhide={unhide}
                error={hideError}
              />
            </Panel>
            <Panel>
              <PanelTitle>Make a tagged link</PanelTitle>
              <TaggedLinkMaker />
            </Panel>
          </Columns>

          <Quiet>
            Visits from this browser aren&apos;t counted either, so checking this page
            won&apos;t skew it.
          </Quiet>
        </>
      )}
    </Layout>
  );
};

const Stat = ({ label, value }) => (
  <div>
    <NumberValue>{value}</NumberValue>
    <NumberLabel>{label}</NumberLabel>
  </div>
);

const AdminPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // Assume logged in: the first request bounces to the login screen on a 401.
  useEffect(() => {
    document.title = "Guestbook";
  }, []);

  const handleLoggedIn = useCallback(() => {
    excludeThisBrowser();
    setIsLoggedIn(true);
  }, []);
  const handleLoggedOut = useCallback(() => setIsLoggedIn(false), []);

  return (
    <Page>
      {isLoggedIn ? (
        <Dashboard onLoggedOut={handleLoggedOut} />
      ) : (
        <LoginScreen onLoggedIn={handleLoggedIn} />
      )}
    </Page>
  );
};

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow: auto;
  background-color: ${color.page};
  color: ${color.ink};
  font-family: ${fontStack};
  font-size: 15px;
  line-height: 1.5;
  user-select: text;
  -webkit-font-smoothing: antialiased;
`;

const Layout = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 24px 64px;
  display: grid;
  gap: 40px;
`;

const TopBar = styled.header`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
`;

const Heading = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const RangeGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-right: 8px;
`;

const Summary = styled.div`
  display: grid;
  gap: 20px;
`;

const Headline = styled.p`
  margin: 0;
  max-width: 36em;
  font-size: clamp(1.25rem, 2.6vw, 1.75rem);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
`;

const Numbers = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px 32px;
`;

const NumberValue = styled.div`
  font-size: 2rem;
  font-weight: 650;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
`;

const NumberLabel = styled.div`
  font-size: 0.875rem;
  color: ${color.muted};
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 40px 48px;
`;

const Centred = styled.div`
  box-sizing: border-box;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const LoginBox = styled.div`
  width: min(400px, 100%);
  display: grid;
  gap: 20px;
  padding: 28px;
  background-color: ${color.surface};
  border: 1px solid ${color.line};
  border-radius: 8px;
`;

const FieldLabel = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 0.875rem;
  color: ${color.muted};
`;

const LoginRow = styled.div`
  display: flex;
  gap: 8px;

  input {
    flex: 1;
  }
`;

export default AdminPage;
