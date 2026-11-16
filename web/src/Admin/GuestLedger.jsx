import { Fragment, useState } from "react";
import styled from "styled-components";
import SortHeader from "./SortHeader.jsx";
import { Table } from "./Charts.jsx";
import { Button, color, focusRing, LinkButton, Quiet, TextField } from "./theme.js";
import {
  describeDevice,
  describeEvent,
  describePlace,
  describeSuburb,
  formatDateTime,
  formatDuration,
  plural,
  shortId,
} from "./format.js";

const COLUMNS = [
  { key: "when", label: "When" },
  { key: "network", label: "Network", startsDescending: false },
  { key: "place", label: "Location", startsDescending: false },
  { key: "source", label: "Came from", startsDescending: false },
  { key: "device", label: "Device", startsDescending: false },
  { key: "visit", label: "Visit", align: "right" },
  { key: "stay", label: "Stayed", align: "right" },
  { key: "places", label: "Places", align: "right" },
  { key: "cv", label: "CV" },
];

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

const Details = ({ session, onHide }) => {
  const client = session.client ?? {};
  const hasMap = session.latitude !== null && session.longitude !== null;
  const label = session.org ?? describePlace(session);
  const rows = [
    ["IP address", session.ip],
    ["Guest ID", session.visitor_id],
    ["Network owner", session.org],
    ["Internet provider", session.isp],
    ["Network website", session.org_domain],
    ["Nearest suburb", describeSuburb(session)],
    ["City", session.city],
    ["Postcode", session.postal_code],
    ["Time zone", client.timezone ?? session.timezone],
    ["Referrer", session.referrer ?? "No referrer sent"],
    ["Tagged link", session.ref],
    ["Campaign", Object.values(session.utm ?? {}).join(", ")],
    ["First page", session.landing_path],
    ["Device", [session.device_type, session.device_model].filter(Boolean).join(", ")],
    ["Screen", client.screenWidth && `${client.screenWidth} by ${client.screenHeight}`],
    ["Window", client.viewportWidth && `${client.viewportWidth} by ${client.viewportHeight}`],
    ["Languages", client.languages?.join(", ") ?? client.language],
    ["Connection", client.connection],
    ["Colour scheme", client.colorScheme],
    ["Browser ID", session.user_agent],
  ].filter(([, value]) => value);

  return (
    <div>
      <Facts>
        {rows.map(([name, value]) => (
          <Fact key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </Fact>
        ))}
      </Facts>
      <Actions>
        {hasMap && (
          <MapLink
            href={`https://www.google.com/maps?q=${session.latitude},${session.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Show on a map
          </MapLink>
        )}
        {session.ip && (
          <LinkButton $danger type="button" onClick={() => onHide("ip", session.ip, label)}>
            Hide this IP address
          </LinkButton>
        )}
        <LinkButton
          $danger
          type="button"
          onClick={() => onHide("visitor", session.visitor_id, label)}
        >
          Hide this guest
        </LinkButton>
      </Actions>
    </div>
  );
};

const GuestRow = ({ session, isOpen, onToggle, onHide }) => (
  <Fragment>
    <ClickableRow $open={isOpen} onClick={onToggle}>
      <td>
        <ExpandButton
          type="button"
          aria-expanded={isOpen}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
        >
          {formatDateTime(session.started_at)}
        </ExpandButton>
      </td>
      <Wrap>{session.org ?? <Unknown>Unknown</Unknown>}</Wrap>
      <Wrap>{describePlace(session)}</Wrap>
      <Wrap>{session.source}</Wrap>
      <Wrap>{describeDevice(session)}</Wrap>
      <Num title={`Guest ${shortId(session.visitor_id)}`}>
        {session.visit_number === 1 ? "1st" : session.visit_number}
      </Num>
      <Num>{formatDuration(session.active_ms)}</Num>
      <Num>{session.places_count}</Num>
      <td>{session.took_cv ? <CvMark>Took CV</CvMark> : ""}</td>
    </ClickableRow>
    {isOpen && (
      <tr>
        <ExpandedCell colSpan={COLUMNS.length}>
          <Expanded>
            <div>
              <ExpandedTitle>What they did</ExpandedTitle>
              <Timeline session={session} />
            </div>
            <div>
              <ExpandedTitle>What we know</ExpandedTitle>
              <Details session={session} onHide={onHide} />
            </div>
          </Expanded>
        </ExpandedCell>
      </tr>
    )}
  </Fragment>
);

const GuestLedger = ({
  sessions,
  total,
  hasMore,
  isLoading,
  isLoadingMore,
  onLoadMore,
  sort,
  onSort,
  search,
  onSearch,
  cvOnly,
  onCvOnly,
  onHide,
}) => {
  const [openId, setOpenId] = useState(null);
  const isFiltered = search.trim() !== "" || cvOnly;

  return (
    <div>
      <Filters>
        <TextField
          type="search"
          aria-label="Search guests"
          placeholder="Search network, place, IP, browser…"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
        <CheckLabel>
          <input
            type="checkbox"
            checked={cvOnly}
            onChange={(event) => onCvOnly(event.target.checked)}
          />
          Only guests who took your CV
        </CheckLabel>
        <Count aria-live="polite">
          {isLoading ? "Loading…" : `${plural(total, "visit")}${isFiltered ? " match" : ""}`}
        </Count>
      </Filters>

      {sessions.length === 0 && !isLoading ? (
        <Quiet>
          {isFiltered
            ? "No visits match. Try a different search."
            : "No guests in this period. Send someone a tagged link and they'll show up here."}
        </Quiet>
      ) : (
        <Scroll>
          <Table>
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <SortHeader
                    key={column.key}
                    label={column.label}
                    sortKey={column.key}
                    sort={sort}
                    onSort={onSort}
                    align={column.align}
                    startsDescending={column.startsDescending}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <GuestRow
                  key={session.id}
                  session={session}
                  isOpen={openId === session.id}
                  onToggle={() => setOpenId(openId === session.id ? null : session.id)}
                  onHide={onHide}
                />
              ))}
            </tbody>
          </Table>
        </Scroll>
      )}

      {hasMore && (
        <LoadMore>
          <Button onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading…" : `Show more (${total - sessions.length} left)`}
          </Button>
        </LoadMore>
      )}
    </div>
  );
};

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 20px;
  margin-bottom: 12px;

  input[type="search"] {
    width: min(340px, 100%);
  }
`;

const CheckLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9375rem;
  cursor: pointer;

  input {
    width: 16px;
    height: 16px;
    accent-color: ${color.accent};
  }
`;

const Count = styled.span`
  margin-left: auto;
  font-size: 0.875rem;
  color: ${color.muted};
  font-variant-numeric: tabular-nums;
`;

const Scroll = styled.div`
  overflow-x: auto;
  background-color: ${color.surface};
  border: 1px solid ${color.line};
  border-radius: 6px;

  table {
    min-width: 900px;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
`;

const ClickableRow = styled.tr`
  cursor: pointer;
  background-color: ${({ $open }) => ($open ? "#fbf3e6" : "transparent")};

  &:hover {
    background-color: #fbf3e6;
  }
`;

const ExpandButton = styled.button`
  font: inherit;
  font-weight: 600;
  color: ${color.ink};
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  ${focusRing}
`;

const Wrap = styled.td`
  overflow-wrap: anywhere;
`;

const Num = styled.td`
  text-align: right;
  white-space: nowrap;
`;

const Unknown = styled.span`
  color: ${color.muted};
`;

const CvMark = styled.span`
  font-size: 0.8125rem;
  font-weight: 650;
  color: ${color.accent};
  white-space: nowrap;
`;

const ExpandedCell = styled.td`
  background-color: #fdfaf4;
`;

const Expanded = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 28px;
  padding: 8px 4px 16px;
`;

const ExpandedTitle = styled.h3`
  font-size: 0.9375rem;
  font-weight: 650;
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
  color: ${color.muted};
`;

const StepText = styled.span`
  overflow-wrap: anywhere;
  font-weight: ${({ $highlight }) => ($highlight ? 700 : 400)};
  color: ${({ $highlight }) => ($highlight ? color.accent : color.ink)};
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
    color: ${color.muted};
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-top: 14px;
  font-size: 0.875rem;
`;

const MapLink = styled.a`
  color: ${color.accent};
  text-underline-offset: 2px;
  ${focusRing}
`;

const LoadMore = styled.div`
  margin-top: 16px;
  text-align: center;
`;

export default GuestLedger;
