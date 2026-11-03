import { useState } from "react";
import styled from "styled-components";
import { color, focusRing, Quiet } from "./theme.js";
import { formatDay, plural } from "./format.js";

export const DailyChart = ({ days }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const highest = Math.max(1, ...days.map((day) => day.sessions));
  const active = activeIndex === null ? null : days[activeIndex];

  return (
    <div>
      <ReadOut aria-live="polite">
        {active
          ? `${formatDay(active.day)}: ${plural(active.sessions, "visit")} from ${plural(active.visitors, "visitor")}`
          : `Busiest day: ${plural(highest, "visit")}. Hover over a bar for that day.`}
      </ReadOut>
      <Plot onMouseLeave={() => setActiveIndex(null)}>
        {days.map((day, index) => (
          <Column
            key={day.day}
            tabIndex={0}
            aria-label={`${formatDay(day.day)}: ${plural(day.sessions, "visit")}`}
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
          >
            <Bar
              $active={activeIndex === index}
              style={{
                height: day.sessions
                  ? `${Math.max(4, (day.sessions / highest) * 100)}%`
                  : 0,
              }}
            />
          </Column>
        ))}
      </Plot>
      {days.length > 0 && (
        <AxisLabels>
          <span>{formatDay(days[0].day)}</span>
          <span>{formatDay(days[days.length - 1].day)}</span>
        </AxisLabels>
      )}
    </div>
  );
};

export const Breakdown = ({ rows, empty, showCv = false }) => {
  if (!rows?.length) return <Quiet>{empty}</Quiet>;
  const highest = Math.max(...rows.map((row) => row.visitors));

  return (
    <List>
      {rows.map((row) => (
        <Row key={row.label}>
          <RowText>
            <RowLabel title={row.label}>{row.label}</RowLabel>
            <RowValue>
              {plural(row.visitors, "visitor")}
              {showCv && row.cv_sessions > 0 && `, ${row.cv_sessions} took your CV`}
            </RowValue>
          </RowText>
          <Track aria-hidden="true">
            <Fill style={{ width: `${(row.visitors / highest) * 100}%` }} />
          </Track>
        </Row>
      ))}
    </List>
  );
};

const ReadOut = styled.p`
  margin: 0 0 8px;
  min-height: 1.4em;
  font-size: 0.875rem;
  color: ${color.mist};
`;

const Plot = styled.div`
  display: flex;
  align-items: stretch;
  gap: 2px;
  height: 140px;
  border-bottom: 2px solid ${color.duskLine};
`;

const Column = styled.div`
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: flex-end;
  ${focusRing}
`;

const Bar = styled.div`
  width: 100%;
  max-width: 28px;
  margin: 0 auto;
  border-radius: 4px 4px 0 0;
  background-color: ${color.lantern};
  opacity: ${({ $active }) => ($active ? 1 : 0.8)};
`;

const AxisLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 0.8125rem;
  color: ${color.mist};
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
`;

const Row = styled.li`
  min-width: 0;
`;

const RowText = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.875rem;
  margin-bottom: 4px;
`;

const RowLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${color.ink};
`;

const RowValue = styled.span`
  flex-shrink: 0;
  color: ${color.mist};
`;

const Track = styled.div`
  height: 6px;
  background-color: ${color.dusk};
`;

const Fill = styled.div`
  height: 100%;
  border-radius: 0 3px 3px 0;
  background-color: ${color.lantern};
`;
