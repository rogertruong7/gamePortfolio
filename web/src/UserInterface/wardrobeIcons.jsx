import { ink } from "./Modal.jsx";

// Little pictures for the wardrobe's options, drawn in the colours the player has picked so each
// tile shows what it will look like

const STROKE = { stroke: ink, strokeWidth: 1.6, strokeLinejoin: "round", strokeLinecap: "round" };
const WHITE = "#f7f7f3";

const Icon = ({ children }) => (
  <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
    {children}
  </svg>
);

const Face = ({ skin, cy = 27, r = 12 }) => (
  <>
    <circle cx="24" cy={cy} r={r} fill={skin} {...STROKE} />
    <ellipse cx="19.5" cy={cy + 1.5} rx="1.6" ry="2.2" fill={ink} />
    <ellipse cx="28.5" cy={cy + 1.5} rx="1.6" ry="2.2" fill={ink} />
  </>
);

const CAP = "M11 27 C10 14 17 8 24 8 C31 8 38 14 37 27 C35 21 30 17 24 18 C18 17 13 21 11 27 Z";
const SPIKES =
  "M10 28 L7 19 L13 20 L11 11 L18 15 L20 5 L25 13 L31 6 L31 14 L38 11 L36 19 L42 21 L37 28 C35 21 30 18 24 19 C18 18 13 22 10 28 Z";

// Drawn behind the face, then the front of the hair goes over it
const HAIR_BEHIND = {
  bob: ["M10 37 C8 22 14 12 24 12 C34 12 40 22 38 37 Z"],
  long: ["M9 46 C7 22 14 12 24 12 C34 12 41 22 39 46 Z"],
  ponytail: ["M33 15 C45 13 46 28 41 39 C40 30 38 24 32 21 Z"],
  twintails: [
    "M13 17 C3 19 3 32 7 40 C9 31 10 26 14 23 Z",
    "M35 17 C45 19 45 32 41 40 C39 31 38 26 34 23 Z",
  ],
};

export const HairIcon = ({ style, colour, skin }) => (
  <Icon>
    {(HAIR_BEHIND[style] ?? []).map((d) => (
      <path key={d} d={d} fill={colour} {...STROKE} />
    ))}
    {style === "bun" && <circle cx="24" cy="8" r="5.5" fill={colour} {...STROKE} />}
    <Face skin={skin} />
    <path d={style === "spiky" ? SPIKES : CAP} fill={colour} {...STROKE} />
  </Icon>
);

// The model's own outfit, in the colours painted on it
const ADVENTURER = { top: "#3a343d", straps: "#c8862c", trousers: "#5d5568" };

const TROUSERS = "M15 32 L33 32 L33 45 L26 45 L24 38 L22 45 L15 45 Z";
const SHORT_SLEEVES = "M14 10 L20 7 Q24 10 28 7 L34 10 L40 17 L35 21 L33 19 L33 32 L15 32 L15 19 L13 21 L8 17 Z";
const LONG_SLEEVES = "M14 10 L20 7 Q24 10 28 7 L34 10 L41 27 L36 29 L33 20 L33 33 L15 33 L15 20 L12 29 L7 27 Z";

export const OutfitIcon = ({ outfit, main, second }) => {
  switch (outfit) {
    case "tee":
      return (
        <Icon>
          <path d="M15 31 L33 31 L34 41 L26 41 L24 36 L22 41 L14 41 Z" fill={second} {...STROKE} />
          <path d={SHORT_SLEEVES} fill={main} {...STROKE} />
        </Icon>
      );
    case "hoodie":
      return (
        <Icon>
          <path d={TROUSERS} fill={second} {...STROKE} />
          <path d={LONG_SLEEVES} fill={main} {...STROKE} />
          <path d="M18 8 Q24 2 30 8 Q24 12 18 8 Z" fill={main} {...STROKE} />
          <path d="M19 23 H29 V29 H19 Z" fill="none" {...STROKE} />
          <path d="M22 11 V16 M26 11 V16" fill="none" {...STROKE} stroke={WHITE} />
        </Icon>
      );
    case "dress":
      return (
        <Icon>
          <path d="M18 21 L30 21 L39 42 Q24 46 9 42 Z" fill={main} {...STROKE} />
          <path d="M17 9 L21 7 Q24 10 27 7 L31 9 L34 14 L30 16 L30 22 L18 22 L18 16 L14 14 Z" fill={main} {...STROKE} />
          <path d="M18 20 H30 V24 H18 Z" fill={second} {...STROKE} />
        </Icon>
      );
    case "overalls":
      return (
        <Icon>
          <path d={SHORT_SLEEVES} fill={second} {...STROKE} />
          <path d={TROUSERS} fill={main} {...STROKE} />
          <path d="M18 15 H30 V33 H18 Z M18 15 L17 8 M30 15 L31 8" fill={main} {...STROKE} />
          <circle cx="20.5" cy="17.5" r="1.2" fill="#f2c84b" />
          <circle cx="27.5" cy="17.5" r="1.2" fill="#f2c84b" />
        </Icon>
      );
    case "suit":
      return (
        <Icon>
          <path d={TROUSERS} fill={main} {...STROKE} />
          <path d={LONG_SLEEVES} fill={main} {...STROKE} />
          <path d="M20 7.5 L24 21 L28 7.5 Q24 10 20 7.5 Z" fill={WHITE} {...STROKE} />
          <path d="M23 10 H25 L26 17 L24 20 L22 17 Z" fill={second} {...STROKE} />
        </Icon>
      );
    case "sailor":
      return (
        <Icon>
          <path d="M15 31 L33 31 L38 43 L10 43 Z" fill={main} {...STROKE} />
          <path d={LONG_SLEEVES} fill={WHITE} {...STROKE} />
          <path d="M16 8.5 L24 19 L32 8.5 L36 12 L24 23 L12 12 Z" fill={main} {...STROKE} />
          <path d="M21 20 L24 23 L27 20 L27 25 L24 23 L21 25 Z" fill={second} {...STROKE} />
        </Icon>
      );
    case "yukata":
      return (
        <Icon>
          <path
            d="M14 9 L20 7 L24 16 L28 7 L34 9 L42 23 L36 26 L33 21 L33 45 L15 45 L15 21 L12 26 L6 23 Z"
            fill={main}
            {...STROKE}
          />
          {[
            [19, 33],
            [28, 38],
            [21, 41],
            [29, 15],
            [17, 15],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill={second} />
          ))}
          <path d="M15 24 H33 V29 H15 Z" fill={second} {...STROKE} />
          <path d="M20 7.5 L28 24" fill="none" {...STROKE} />
        </Icon>
      );
    default:
      return (
        <Icon>
          <path d={TROUSERS} fill={ADVENTURER.trousers} {...STROKE} />
          <path d={SHORT_SLEEVES} fill={ADVENTURER.top} {...STROKE} />
          <path d="M18 9 L24 22 L30 9 M15 26 H33" fill="none" {...STROKE} stroke={ADVENTURER.straps} strokeWidth="2.4" />
        </Icon>
      );
  }
};

const BareHead = ({ skin, hair }) => (
  <>
    <Face skin={skin} cy={29} r={11} />
    <path d="M13 29 C12 18 18 13 24 13 C30 13 36 18 35 29 C33 23 29 21 24 21 C19 21 15 23 13 29 Z" fill={hair} {...STROKE} />
  </>
);

export const ExtraIcon = ({ extra, colour, skin, hair }) => {
  if (extra === "none") {
    return (
      <Icon>
        <circle cx="24" cy="24" r="13" fill="none" {...STROKE} strokeWidth="2.4" />
        <path d="M15 33 L33 15" {...STROKE} strokeWidth="2.4" />
      </Icon>
    );
  }
  return (
    <Icon>
      {extra === "catEars" && (
        <path d="M13 20 L14 6 L22 15 Z M35 20 L34 6 L26 15 Z" fill={hair} {...STROKE} />
      )}
      <BareHead skin={skin} hair={hair} />
      {extra === "bow" && (
        <>
          <path d="M31 13 L23 7 L24 18 Z M31 13 L40 8 L38 19 Z" fill={colour} {...STROKE} />
          <circle cx="31" cy="13" r="2.4" fill={colour} {...STROKE} />
        </>
      )}
      {extra === "cap" && (
        <path d="M12 23 C12 11 36 11 36 23 Z M30 22 L44 23 L42 26 L28 25 Z" fill={colour} {...STROKE} />
      )}
      {extra === "beanie" && (
        <>
          <path d="M12 23 C11 9 37 9 36 23 Z" fill={colour} {...STROKE} />
          <path d="M11 21 H37 V25 H11 Z" fill={colour} {...STROKE} />
          <circle cx="24" cy="7" r="3.5" fill={WHITE} {...STROKE} />
        </>
      )}
      {extra === "flower" && (
        <>
          {[0, 72, 144, 216, 288].map((angle) => (
            <circle
              key={angle}
              cx={35 + Math.cos((angle * Math.PI) / 180) * 3.6}
              cy={15 + Math.sin((angle * Math.PI) / 180) * 3.6}
              r="3"
              fill={colour}
              {...STROKE}
            />
          ))}
          <circle cx="35" cy="15" r="2.2" fill="#f6d35b" {...STROKE} />
        </>
      )}
      {extra === "glasses" && (
        <path
          d="M15.5 30.5 a4.2 4.2 0 1 0 8.4 0 a4.2 4.2 0 1 0 -8.4 0 Z M24.1 30.5 a4.2 4.2 0 1 0 8.4 0 a4.2 4.2 0 1 0 -8.4 0 Z"
          fill="rgba(255,255,255,0.25)"
          {...STROKE}
          stroke={colour}
          strokeWidth="2"
        />
      )}
    </Icon>
  );
};
