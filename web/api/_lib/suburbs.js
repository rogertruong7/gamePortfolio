import { AU_SUBURBS } from "./auSuburbs.js";

// Beyond this the IP's location is too vague to name a suburb.
const MAX_KM = 25;
const KM_PER_DEGREE = 111.32;

let suburbs = null;

function loadSuburbs() {
  suburbs ??= AU_SUBURBS.split("\n").map((line) => {
    const [name, state, postcode, lat, lon] = line.split("|");
    return { name, state, postcode, lat: Number(lat), lon: Number(lon) };
  });
  return suburbs;
}

// Flat-earth distance: accurate enough over the few kilometres that matter here.
function distanceKm(lat, lon, place) {
  const x = (place.lon - lon) * Math.cos((lat * Math.PI) / 180);
  const y = place.lat - lat;
  return Math.hypot(x, y) * KM_PER_DEGREE;
}

// The Australian suburb nearest an IP's estimated position, or null. When the
// IP came with a postcode, suburbs in that postcode are preferred.
export function nearestSuburb({ country, latitude: lat, longitude: lon, postal_code: postcode }) {
  const latitude = lat === null ? NaN : Number(lat);
  const longitude = lon === null ? NaN : Number(lon);
  if (country !== "AU" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  const all = loadSuburbs();
  const inPostcode = postcode ? all.filter((place) => place.postcode === postcode) : [];
  const candidates = inPostcode.length > 0 ? inPostcode : all;

  let best = null;
  let bestKm = Infinity;
  for (const place of candidates) {
    const km = distanceKm(latitude, longitude, place);
    if (km < bestKm) {
      best = place;
      bestKm = km;
    }
  }
  if (!best || bestKm > MAX_KM) return null;
  return { name: best.name, state: best.state, postcode: best.postcode, km: Math.round(bestKm * 10) / 10 };
}
