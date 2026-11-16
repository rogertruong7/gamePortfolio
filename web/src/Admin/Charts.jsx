import { useMemo, useState } from "react";
import styled from "styled-components";
import SortHeader from "./SortHeader.jsx";
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
                  ? `${Math.max(3, (day.sessions / highest) * 100)}%`
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

const compareRows = (key) =>
  key === "label"
    ? (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    : (a, b) => (a[key] ?? 0) - (b[key] ?? 0);

export const Breakdown = ({ rows, empty, showCv = false, nameLabel = "Name" }) => {
  const [sort, setSort] = useState({ key: "visitors", dir: "desc" });

  const sorted = useMemo(() => {
    if (!rows?.length) return [];
    const compare = compareRows(sort.key);
    const direction = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => direction * compare(a, b));
  }, [rows, sort]);

  if (!rows?.length) return <Quiet>{empty}</Quiet>;
  const highest = Math.max(...rows.map((row) => row.visitors));

  return (
    <Table>
      <thead>
        <tr>
          <SortHeader
            label={nameLabel}
            sortKey="label"
            sort={sort}
            onSort={setSort}
            startsDescending={false}
          />
          <SortHeader label="Visitors" sortKey="visitors" sort={sort} onSort={setSort} align="right" />
          <SortHeader label="Visits" sortKey="sessions" sort={sort} onSort={setSort} align="right" />
          {showCv && (
            <SortHeader label="Took CV" sortKey="cv_sessions" sort={sort} onSort={setSort} align="right" />
          )}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <tr key={row.label}>
            <NameCell title={row.label}>
              <NameText>{row.label}</NameText>
              <Track aria-hidden="true">
                <Fill style={{ width: `${(row.visitors / highest) * 100}%` }} />
              </Track>
            </NameCell>
            <NumberCell>{row.visitors}</NumberCell>
            <NumberCell>{row.sessions}</NumberCell>
            {showCv && <NumberCell>{row.cv_sessions || "–"}</NumberCell>}
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

const ReadOut = styled.p`
  margin: 0 0 8px;
  min-height: 1.4em;
  font-size: 0.875rem;
  color: ${color.muted};
`;

const Plot = styled.div`
  display: flex;
  align-items: stretch;
  gap: 2px;
  height: 140px;
  border-bottom: 1px solid ${color.lineStrong};
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
  border-radius: 2px 2px 0 0;
  background-color: ${({ $active }) => ($active ? color.accent : color.bar)};
`;

const AxisLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 0.8125rem;
  color: ${color.muted};
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;

  td {
    padding: 7px 10px;
    border-bottom: 1px solid ${color.line};
    vertical-align: top;
  }
`;

const NameCell = styled.td`
  max-width: 0;
  width: 100%;
`;

const NameText = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NumberCell = styled.td`
  text-align: right;
  white-space: nowrap;
`;

const Track = styled.div`
  height: 3px;
  margin-top: 4px;
  background-color: ${color.barSoft};
`;

const Fill = styled.div`
  height: 100%;
  background-color: ${color.bar};
`;
