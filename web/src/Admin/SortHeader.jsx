import styled from "styled-components";
import { nextSort } from "./format.js";
import { color, focusRing } from "./theme.js";

const SortHeader = ({ label, sortKey, sort, onSort, align = "left", startsDescending = true }) => {
  const isActive = sort.key === sortKey;
  const ariaSort = isActive ? (sort.dir === "asc" ? "ascending" : "descending") : "none";

  return (
    <Th aria-sort={ariaSort} $align={align}>
      <SortButton
        type="button"
        $active={isActive}
        $align={align}
        onClick={() => onSort(nextSort(sort, sortKey, startsDescending))}
      >
        {label}
        <Arrow aria-hidden="true" $active={isActive}>
          {isActive ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
        </Arrow>
      </SortButton>
    </Th>
  );
};

export const Th = styled.th`
  text-align: ${({ $align }) => $align};
  font-weight: 600;
  font-size: 0.8125rem;
  color: ${color.muted};
  padding: 8px 10px;
  border-bottom: 1px solid ${color.lineStrong};
  white-space: nowrap;
`;

const SortButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-direction: ${({ $align }) => ($align === "right" ? "row-reverse" : "row")};
  font: inherit;
  color: ${({ $active }) => ($active ? color.ink : "inherit")};
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;

  &:hover {
    color: ${color.ink};
  }

  ${focusRing}
`;

const Arrow = styled.span`
  font-size: 0.75rem;
  opacity: ${({ $active }) => ($active ? 1 : 0.4)};
`;

export default SortHeader;
