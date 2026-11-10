import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { excludeThisBrowser } from "../Analytics/tracker.js";
import { Breakdown, DailyChart } from "./Charts.jsx";
import GuestLedger from "./GuestLedger.jsx";
import TaggedLinkMaker from "./TaggedLinkMaker.jsx";
import { formatDuration, plural, RANGES } from "./format.js";
import {
  color,
  DialogueBox,
  Panel,
  PanelTitle,
  PixelButton,
  Quiet,
  TextField,
} from "./theme.js";

class NotLoggedInError extends Error {}

async function getJson(url) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (response.status === 401) throw new NotLoggedInError();
  if (!response.ok) {
    throw new Error(
      response.status === 503
        ? "The database isn't configured. Check DATABASE_URL in Vercel."
        : "The server couldn't load this data. Try refreshing."
    );
  }
  return response.json();
}

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
            <PixelButton $active disabled={isSubmitting}>
              {isSubmitting ? "Checking" : "Log in"}
            </PixelButton>
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
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  const handleFailure = useCallback(
    (failure) => {
      if (failure instanceof NotLoggedInError) onLoggedOut();
      else setError(failure.message);
    },
    [onLoggedOut]
  );

  useEffect(() => {
    let isCurrent = true;
    setError(null);
    Promise.all([
      getJson(`/api/admin/overview?days=${days}`),
      getJson(`/api/admin/sessions?days=${days}`),
    ])
      .then(([nextOverview, nextSessions]) => {
        if (!isCurrent) return;
        setOverview(nextOverview);
        setSessions(nextSessions.sessions);
        setHasMore(nextSessions.hasMore);
      })
      .catch((failure) => {
        if (isCurrent) handleFailure(failure);
      });
    return () => {
      isCurrent = false;
    };
  }, [days, refreshCount, handleFailure]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const before = encodeURIComponent(sessions[sessions.length - 1].started_at);
      const next = await getJson(
        `/api/admin/sessions?days=${days}&before=${before}`
      );
      setSessions((current) => [...current, ...next.sessions]);
      setHasMore(next.hasMore);
    } catch (failure) {
      handleFailure(failure);
    }
    setIsLoadingMore(false);
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
          {RANGES.map((option) => (
            <PixelButton
              key={option.days}
              $active={option.days === days}
              aria-pressed={option.days === days}
              onClick={() => setDays(option.days)}
            >
              {option.label}
            </PixelButton>
          ))}
          <PixelButton onClick={() => setRefreshCount((count) => count + 1)}>
            Refresh
          </PixelButton>
          <PixelButton onClick={logOut}>Log out</PixelButton>
        </Controls>
      </TopBar>

      {error && <ErrorText role="alert">{error}</ErrorText>}

      {!overview && !error && <Quiet>Opening the guestbook</Quiet>}

      {overview && (
        <>
          <DialogueBox>
            <Headline>
              {plural(totals.visitors, "guest")} came through town {range.phrase}.{" "}
              {totals.cv_sessions === 0
                ? "Nobody has taken your CV."
                : `Your CV was taken on ${plural(totals.cv_sessions, "visit")}.`}
            </Headline>
          </DialogueBox>

          <Numbers>
            <Stat label="Visits" value={totals.sessions} />
            <Stat label="Came back" value={totals.returning_visitors} />
            <Stat label="Went into a building" value={totals.entered_building_sessions} />
            <Stat
              label="Average stay"
              value={formatDuration(totals.avg_active_seconds * 1000)}
            />
          </Numbers>

          <Panel>
            <PanelTitle>Visits per day</PanelTitle>
            <DailyChart days={overview.daily} />
          </Panel>

          <Columns>
            <Panel>
              <PanelTitle>Where they came from</PanelTitle>
              <Breakdown
                rows={overview.sources}
                showCv
                empty="No visits in this period."
              />
            </Panel>
            <Panel>
              <PanelTitle>Where they went</PanelTitle>
              <Breakdown
                rows={overview.places}
                empty="Nobody has gone into a building in this period."
              />
            </Panel>
          </Columns>

          <Panel>
            <PanelTitle>Make a tagged link</PanelTitle>
            <TaggedLinkMaker />
          </Panel>

          <Panel>
            <PanelTitle>Guests</PanelTitle>
            <GuestLedger
              sessions={sessions}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMore}
            />
          </Panel>

          <Columns>
            <Panel>
              <PanelTitle>Companies and networks</PanelTitle>
              <Breakdown
                rows={overview.organisations}
                showCv
                empty="No networks identified in this period."
              />
            </Panel>
            <Panel>
              <PanelTitle>Cities</PanelTitle>
              <Breakdown rows={overview.cities} empty="No cities identified in this period." />
            </Panel>
            <Panel>
              <PanelTitle>Countries</PanelTitle>
              <Breakdown rows={overview.countries} empty="No countries identified in this period." />
            </Panel>
            <Panel>
              <PanelTitle>Devices</PanelTitle>
              <Breakdown rows={overview.devices} empty="No devices recorded in this period." />
            </Panel>
            <Panel>
              <PanelTitle>Browsers</PanelTitle>
              <Breakdown rows={overview.browsers} empty="No browsers recorded in this period." />
            </Panel>
            <Panel>
              <PanelTitle>Links they clicked</PanelTitle>
              <Breakdown rows={overview.outbound} empty="Nobody has clicked a link in this period." />
            </Panel>
          </Columns>

          <Quiet>Visits from this browser aren&apos;t counted, so checking this page won&apos;t skew it.</Quiet>
        </>
      )}
    </Layout>
  );
};

const Stat = ({ label, value }) => (
  <NumberBlock>
    <NumberValue>{value}</NumberValue>
    <NumberLabel>{label}</NumberLabel>
  </NumberBlock>
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
  background-color: ${color.night};
  color: ${color.ink};
  font-family: "Open Sans", sans-serif;
  line-height: 1.5;
  user-select: text;
`;

const Layout = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 24px 64px;
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
  font-family: "Pixelify Sans", serif;
  font-weight: 600;
  font-size: 2.5rem;
  line-height: 1;
  margin: 0;
  color: ${color.lantern};
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Headline = styled.p`
  margin: 0;
  max-width: 28em;
  font-family: "Determination Mono", "Pixelify Sans", serif;
  font-size: clamp(1.4rem, 3.4vw, 2.25rem);
  line-height: 1.25;
`;

const Numbers = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px 32px;
`;

const NumberBlock = styled.div`
  border-left: 4px solid ${color.duskLine};
  padding-left: 12px;
`;

const NumberValue = styled.div`
  font-family: "Pixelify Sans", serif;
  font-size: 2rem;
  line-height: 1.1;
`;

const NumberLabel = styled.div`
  font-size: 0.875rem;
  color: ${color.mist};
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 40px;
`;

const Centred = styled.div`
  box-sizing: border-box;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const LoginBox = styled(DialogueBox)`
  width: min(420px, 100%);
  display: grid;
  gap: 20px;
`;

const FieldLabel = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 0.875rem;
  color: ${color.mist};
`;

const LoginRow = styled.div`
  display: flex;
  gap: 8px;

  input {
    flex: 1;
  }
`;

const ErrorText = styled.p`
  margin: 12px 0 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${color.lantern};
`;

export default AdminPage;
