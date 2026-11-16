import assert from "node:assert/strict";
import { test } from "node:test";
import { parseExclusion } from "../api/_lib/exclusions.js";
import { parseListOptions, SORTS } from "../api/admin/sessions.js";

const url = (query) => `https://example.com/api/admin/sessions?${query}`;

test("sessions default to newest first", () => {
  assert.deepEqual(parseListOptions(url("")), {
    sort: "when",
    dir: "DESC",
    offset: 0,
    search: null,
    cvOnly: false,
  });
});

test("only known sort columns reach the SQL", () => {
  assert.equal(parseListOptions(url("sort=stay&dir=asc")).sort, "stay");
  assert.equal(parseListOptions(url("sort=stay&dir=asc")).dir, "ASC");
  assert.equal(parseListOptions(url("sort=id;drop table sessions")).sort, "when");
  assert.equal(parseListOptions(url("sort=constructor")).sort, "when");
  assert.equal(parseListOptions(url("dir=sideways")).dir, "DESC");
  for (const key of Object.keys(SORTS)) {
    assert.equal(parseListOptions(url(`sort=${key}`)).sort, key);
  }
});

test("offset is a bounded whole number", () => {
  assert.equal(parseListOptions(url("offset=60")).offset, 60);
  assert.equal(parseListOptions(url("offset=-5")).offset, 0);
  assert.equal(parseListOptions(url("offset=abc")).offset, 0);
  assert.equal(parseListOptions(url("offset=999999")).offset, 10000);
});

test("search text has its LIKE wildcards escaped", () => {
  assert.equal(parseListOptions(url("q=%20canva%20")).search, "%canva%");
  assert.equal(parseListOptions(url("q=50%25_off")).search, "%50\\%\\_off%");
  assert.equal(parseListOptions(url("q=%20%20")).search, null);
  assert.equal(parseListOptions(url("cv=1")).cvOnly, true);
});

test("an IP address or guest ID can be hidden", () => {
  assert.deepEqual(parseExclusion({ kind: "ip", value: " 203.0.113.7 ", label: " Home " }), {
    kind: "ip",
    value: "203.0.113.7",
    label: "Home",
  });
  assert.deepEqual(parseExclusion({ kind: "ip", value: "2001:DB8::1" }), {
    kind: "ip",
    value: "2001:db8::1",
    label: null,
  });
  const id = "3f2b8c1e-9d4a-4b6f-8e2a-1c5d7e9f0a3b";
  assert.equal(parseExclusion({ kind: "visitor", value: id }).value, id);
});

test("anything else is refused", () => {
  assert.equal(parseExclusion(null), null);
  assert.equal(parseExclusion({ kind: "org", value: "Canva" }), null);
  assert.equal(parseExclusion({ kind: "ip", value: "not an ip" }), null);
  assert.equal(parseExclusion({ kind: "ip", value: "" }), null);
  assert.equal(parseExclusion({ kind: "visitor", value: "1234" }), null);
  assert.equal(parseExclusion({ kind: "ip", value: 42 }), null);
});

test("an Australian IP position is named by its nearest suburb", async () => {
  const { nearestSuburb } = await import("../api/_lib/suburbs.js");
  const parramatta = { country: "AU", latitude: -33.815, longitude: 151.005, postal_code: "2150" };
  assert.equal(nearestSuburb(parramatta).name, "Parramatta");
  assert.equal(nearestSuburb({ ...parramatta, latitude: "-33.815", longitude: "151.005" }).name, "Parramatta");
  assert.equal(nearestSuburb({ ...parramatta, country: "NZ" }), null);
  assert.equal(nearestSuburb({ ...parramatta, latitude: null }), null);
  // The middle of the desert is too far from any suburb to name one.
  assert.equal(nearestSuburb({ country: "AU", latitude: -25, longitude: 131 }), null);
});

test("suburb counts merge positions and count each guest once", async () => {
  const { suburbsBreakdown } = await import("../api/admin/overview.js");
  const point = { country: "AU", latitude: -33.815, longitude: 151.005, postal_code: "2150" };
  const rows = suburbsBreakdown([
    { ...point, visitor_id: "a", sessions: 2, cv_sessions: 1 },
    { ...point, latitude: -33.816, visitor_id: "a", sessions: 1, cv_sessions: 0 },
    { ...point, visitor_id: "b", sessions: 1, cv_sessions: 0 },
    { ...point, country: "US", visitor_id: "c", sessions: 5, cv_sessions: 0 },
  ]);
  assert.deepEqual(rows, [
    { label: "Parramatta, NSW", sessions: 4, cv_sessions: 1, visitors: 2 },
  ]);
});
