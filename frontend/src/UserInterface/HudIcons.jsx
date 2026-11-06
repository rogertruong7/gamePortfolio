// Pixel icons for the wardrobe and the player count, drawn on a grid like the help popup's

export const ShirtIcon = ({ size = 22 }) => (
  <svg
    viewBox="0 0 14 12"
    width={size}
    height={(size * 12) / 14}
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M4 0h2v1h2V0h2v1h1v1h1v1h1v1h1v2h-3v6H3V6H0V4h1V3h1V2h1V1h1z"
    />
    <path fill="#fff" opacity="0.55" d="M6 1h2v1H6zM4 7h1v4H4z" />
  </svg>
);

export const PeopleIcon = ({ size = 20 }) => (
  <svg
    viewBox="0 0 14 11"
    width={size}
    height={(size * 11) / 14}
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    <path fill="currentColor" opacity="0.55" d="M9 0h3v1h1v3h-1v1H9V4H8V1h1zM8 6h5v1h1v4H9V8H8z" />
    <path fill="currentColor" d="M3 1h3v1h1v3H6v1H3V5H2V2h1zM1 7h7v1h1v3H0V8h1z" />
  </svg>
);
