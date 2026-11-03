import { BUILDINGS } from "./skylineData.js";

// Scattered rather than left to right, so a loading town lights up the way a real one does.
const scatter = (x, y) => (x * 37 + y * 61) % 97;

const PANES = BUILDINGS.flatMap(([x, top, width]) => {
  const panes = [];
  for (let y = top + 7; y < 36; y += 7) {
    for (let wx = x + 4; wx < x + width - 5; wx += 8) panes.push({ x: wx, y });
  }
  return panes;
}).sort((a, b) => scatter(a.x, a.y) - scatter(b.x, b.y));

// `lit` is how much of the town has its lights on, from 0 to 1.
const Skyline = ({ className, lit = 1 }) => {
  const litCount = Math.round(lit * PANES.length);
  return (
    <svg
      className={className}
      viewBox="0 0 384 40"
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {BUILDINGS.map(([x, top, width, wall, roof]) => (
        <g key={x}>
          <rect x={x} y={top} width={width} height={40 - top} fill={wall} />
          <rect x={x - 1} y={top} width={width + 2} height={2} fill={roof} />
          <rect x={x + 1} y={top - 2} width={width - 2} height={2} fill={roof} />
          <rect x={x + 3} y={top - 4} width={width - 6} height={2} fill={roof} />
        </g>
      ))}
      {PANES.map(({ x, y }, i) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={3}
          height={3}
          fill={i < litCount ? "#FFE9B8" : "#14235A"}
          fillOpacity={i < litCount ? 1 : 0.55}
        />
      ))}
    </svg>
  );
};

export default Skyline;
