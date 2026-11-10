import { useState } from "react";
import styled from "styled-components";
import { color, focusRing, PixelButton, Quiet } from "./theme.js";
import {
  describeDevice,
  describeEvent,
  describePlace,
  formatDateTime,
  formatDuration,
  plural,
} from "./format.js";

const shortId = (id) => id.slice(0, 8);

const Timeline = ({ session }) => {
  if (session.events.length === 0) return <Quiet>No actions recorded.</Quiet>;
  const start = new Date(session.started_at).getTime();

  return (
    <Steps>
      {session.events.map((event) => (
        <Step key={event.id}>
          <StepTime>
            +{formatDuration(Math.max(0, new Date(event.occurred_at).getTime() - start))}
          </StepTime>
          <StepText $highlight={event.type === "cv_download"}>
            {describeEvent(event)}
          </StepText>
        </Step>
      ))}
    </Steps>
  );
};

const Details = ({ session }) => {
  const client = session.client ?? {};
  const hasMap = session.latitude !== null && session.longitude !== null;
  const rows = [
    ["IP address", session.ip],
    ["Network owner", session.org],
    ["Internet provider", session.isp],
    ["Network website", session.org_domain],
    ["Postcode", session.postal_code],
    ["Time zone", client.timezone ?? session.timezone],
    ["Came from", session.referrer ?? "No referrer sent"],
    ["Tagged link", session.ref],
    ["Campaign", Object.values(session.utm ?? {}).join(", ")],
    ["First page", session.landing_path],
    ["Device", [session.device_type, session.device_model].filter(Boolean).join(", ")],
    [
      "Screen",
      client.screenWidth && `${client.screenWidth} by ${client.screenHeight}`,
    ],
    [
      "Window",
      client.viewportWidth && `${client.viewportWidth} by ${client.viewportHeight}`,
    ],
    ["Languages", client.languages?.join(", ") ?? client.language],
    ["Connection", client.connection],
    ["Colour scheme", client.colorScheme],
    ["Browser ID", session.user_agent],
  ].filter(([, value]) => value);

  return (
    <div>
      <Facts>
        {rows.map(([label, value]) => (
          <Fact key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </Fact>
        ))}
      </Facts>
      {hasMap && (
        <MapLink
          href={`https://www.google.com/maps?q=${session.latitude},${session.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Show location on a map
        </MapLink>
      )}
    </div>
  );
};

const Guest = ({ session }) => {
  const [isOpen, setIsOpen] = useState(false);
  const tookCv = session.events.some((event) => event.type === "cv_download");
  const placesVisited = session.events.filter((event) =>
    ["scene_enter", "open_item"].includes(event.type)
  ).length;

  return (
    <GuestRow>
      <GuestSummary aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>
        <SummaryMain>
          <When>{formatDateTime(session.started_at)}</When>
          <Who>
            {session.org ?? "Unknown network"}, {describePlace(session)}
          </Who>
        </SummaryMain>
        <SummaryFacts>
          <span>From {session.source}</span>
          <span>{describeDevice(session)}</span>
          <span>
            {session.visit_number === 1
              ? "First visit"
              : `Visit ${session.visit_number}`}{" "}
            for guest {shortId(session.visitor_id)}
          </span>
          <span>
            Stayed {formatDuration(session.active_ms)}, opened{" "}
            {plural(placesVisited, "place")}
          </span>
          {tookCv && <CvMark>Took your CV</CvMark>}
        </SummaryFacts>
      </GuestSummary>
      {isOpen && (
        <Expanded>
          <div>
            <ExpandedTitle>What they did</ExpandedTitle>
            <Timeline session={session} />
          </div>
          <div>
            <ExpandedTitle>What we know</ExpandedTitle>
            <Details session={session} />
          </div>
        </Expanded>
      )}
    </GuestRow>
  );
};

const GuestLedger = ({ sessions, hasMore, isLoadingMore, onLoadMore }) => {
  if (sessions.length === 0) {
    return (
      <Quiet>
        No guests in this period. Send someone a tagged link and they&apos;ll
        show up here.
      </Quiet>
    );
  }

  return (
    <>
      <Ledger>
        {sessions.map((session) => (
          <Guest key={session.id} session={session} />
        ))}
      </Ledger>
      {hasMore && (
        <LoadMore>
          <PixelButton onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading" : "Load older guests"}
          </PixelButton>
        </LoadMore>
      )}
    </>
  );
};

const Ledger = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 2px solid ${color.duskLine};
`;

const GuestRow = styled.li`
  border-bottom: 2px solid ${color.duskLine};
`;

const GuestSummary = styled.button`
  display: block;
  width: 100%;
  padding: 14px 8px;
  text-align: left;
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;

  &:hover,
  &[aria-expanded="true"] {
    background-color: ${color.dusk};
  }

  ${focusRing}
`;

const SummaryMain = styled.div`
  display: flex;
  flex-wrap: wrap;
  column-gap: 16px;
  align-items: baseline;
`;

const When = styled.span`
  font-family: "Pixelify Sans", serif;
  font-size: 1.1rem;
  color: ${color.lantern};
`;

const Who = styled.span`
  font-weight: 600;
  overflow-wrap: anywhere;
`;

const SummaryFacts = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  margin-top: 4px;
  font-size: 0.875rem;
  color: ${color.mist};
`;

const CvMark = styled.span`
  color: ${color.night};
  background-color: ${color.lantern};
  font-weight: 600;
  padding: 0 6px;
`;

const Expanded = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  padding: 16px 8px 24px;
  background-color: ${color.dusk};
`;

const ExpandedTitle = styled.h3`
  font-family: "Pixelify Sans", serif;
  font-weight: 500;
  font-size: 1.1rem;
  margin: 0 0 10px;
`;

const Steps = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
`;

const Step = styled.li`
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 8px;
  font-size: 0.875rem;
`;

const StepTime = styled.span`
  color: ${color.mist};
`;

const StepText = styled.span`
  overflow-wrap: anywhere;
  font-weight: ${({ $highlight }) => ($highlight ? 700 : 400)};
  color: ${({ $highlight }) => ($highlight ? color.lantern : color.ink)};
`;

const Facts = styled.dl`
  margin: 0;
  display: grid;
  gap: 6px;
`;

const Fact = styled.div`
  display: grid;
  grid-template-columns: 128px 1fr;
  gap: 8px;
  font-size: 0.875rem;

  dt {
    color: ${color.mist};
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

const MapLink = styled.a`
  display: inline-block;
  margin-top: 12px;
  font-size: 0.875rem;
  color: ${color.lantern};
  ${focusRing}
`;

const LoadMore = styled.div`
  margin-top: 16px;
  text-align: center;
`;

export default GuestLedger;
