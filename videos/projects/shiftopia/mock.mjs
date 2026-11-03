// Stands in for Supabase and the ML service, on .invalid hosts so nothing can reach a real project.
// All names are made up. Rows are shaped as the app's own queries select them.
export const SUPABASE = "https://shiftopia-demo.supabase.invalid";
export const ML = "https://shiftopia-ml.demo.invalid";

const pad = (n) => String(n).padStart(2, "0");
const now = new Date();
export const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const offsetDay = (d) => {
  const x = new Date(now);
  x.setDate(x.getDate() + d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
const at = (hhmm) => new Date(`${today}T${hhmm}:00`).toISOString();

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const USER = uuid(1);
const ORG = uuid(10);
const DEPT = uuid(20);
const SUB = uuid(30);
const ROSTER = uuid(40);
const ROLE = { usher: uuid(51), security: uuid(52), food: uuid(53), supervisor: uuid(54) };

const org = { name: "Harbourside Convention Centre" };
const dept = { name: "Event Operations" };
const sub = { name: "Front of House" };

const staff = [
  ["Alex Morgan", USER],
  ["Jordan Blake", uuid(2)],
  ["Casey Lim", uuid(3)],
  ["Riley Tran", uuid(4)],
  ["Sam Okafor", uuid(5)],
  ["Taylor Quinn", uuid(6)],
];

const profile = (name, id) => ({
  id,
  employee_code: `HCC${id.slice(-3)}`,
  first_name: name.split(" ")[0],
  last_name: name.split(" ")[1],
  full_name: name,
  email: `${name.split(" ")[0].toLowerCase()}@example.com`,
  employment_type: "casual",
  is_active: true,
});

const shift = (n, roleId, roleName, start, end, empIdx) => {
  const emp = empIdx == null ? null : staff[empIdx];
  return {
    id: uuid(1000 + n),
    organization_id: ORG,
    department_id: DEPT,
    sub_department_id: SUB,
    roster_id: ROSTER,
    roster_date: today,
    shift_date: today,
    start_time: start,
    end_time: end,
    role_id: roleId,
    roles: { id: roleId, name: roleName },
    departments: dept,
    sub_departments: sub,
    group_type: "convention_centre",
    sub_group_name: "General",
    assigned_employee_id: emp ? emp[1] : null,
    assigned_profiles: emp ? { first_name: emp[0].split(" ")[0], last_name: emp[0].split(" ")[1], full_name: emp[0] } : null,
    lifecycle_status: "Published",
    assignment_status: emp ? "assigned" : "unassigned",
    unpaid_break_minutes: 30,
    is_cancelled: false,
    deleted_at: null,
    remuneration_level_id: uuid(61),
    version: 1,
  };
};

export const tables = {
  profiles: staff.map(([n, id]) => profile(n, id)),
  user_contracts: [{
    id: uuid(70), user_id: USER, organization_id: ORG, department_id: DEPT, sub_department_id: SUB, role_id: ROLE.supervisor,
    rem_level_id: uuid(61), employment_status: "Full-Time", status: "Active", access_level: "delta",
    organizations: org, departments: dept, sub_departments: sub, roles: { name: "Floor Supervisor" },
  }],
  app_access_certificates: [{
    id: uuid(71), user_id: USER, certificate_type: "Y", access_level: "delta", organization_id: ORG, department_id: DEPT, sub_department_id: SUB,
    is_active: true, organizations: org, departments: dept, sub_departments: sub,
  }],
  organizations: [{ id: ORG, name: org.name }],
  departments: [{ id: DEPT, name: dept.name, organization_id: ORG }],
  sub_departments: [{ id: SUB, name: sub.name, department_id: DEPT }],
  roles: [
    { id: ROLE.usher, name: "Usher", department_id: DEPT, sub_department_id: SUB },
    { id: ROLE.security, name: "Security Officer", department_id: DEPT, sub_department_id: SUB },
    { id: ROLE.food, name: "Food Attendant", department_id: DEPT, sub_department_id: SUB },
    { id: ROLE.supervisor, name: "Floor Supervisor", department_id: DEPT, sub_department_id: SUB },
  ],
  remuneration_levels: [
    { id: uuid(61), level_number: 1, level_name: "Level 1", hourly_rate_min: 28, hourly_rate_max: 32, description: "Casual staff" },
    { id: uuid(62), level_number: 2, level_name: "Level 2", hourly_rate_min: 33, hourly_rate_max: 38, description: "Team leads" },
  ],
  rosters: [{
    id: ROSTER, organization_id: ORG, department_id: DEPT, sub_department_id: SUB, start_date: offsetDay(-3), end_date: offsetDay(10),
    roster_date: today, status: "published", is_locked: false, name: "Front of House roster",
  }],
  roster_groups: [{ id: uuid(41), roster_id: ROSTER, name: "Convention", sort_order: 0, roster_subgroups: [{ id: uuid(42) }] }],
  roster_subgroups: [{ id: uuid(42), roster_group_id: uuid(41), name: "General", sort_order: 0 }],
  shifts: [
    shift(1, ROLE.usher, "Usher", "08:00", "16:00", 1),
    shift(2, ROLE.usher, "Usher", "09:00", "17:00", 2),
    shift(3, ROLE.security, "Security Officer", "08:00", "18:00", 3),
    shift(4, ROLE.food, "Food Attendant", "10:00", "15:00", 4),
    shift(5, ROLE.supervisor, "Floor Supervisor", "08:00", "17:00", 0),
    shift(6, ROLE.food, "Food Attendant", "11:00", "16:00", 5),
    shift(7, ROLE.usher, "Usher", "12:00", "17:00", null),
    shift(8, ROLE.security, "Security Officer", "16:00", "20:00", null),
  ],
  synthesis_runs: [],
  venueops_events: [
    {
      event_id: "EVT-2041", name: "Regional Tech Summit", event_type_name: "Conference", estimated_total_attendance: 1800,
      start_date_time: at("08:30"), end_date_time: at("17:00"), venue_names: "Hall A", is_canceled: false,
      venueops_functions: [{ venue_name: "Convention Centre", room_name: "Hall A" }],
    },
    {
      event_id: "EVT-2042", name: "Spring Awards Dinner", event_type_name: "Gala Dinner", estimated_total_attendance: 650,
      start_date_time: at("17:30"), end_date_time: at("20:00"), venue_names: "Grand Ballroom", is_canceled: false,
      venueops_functions: [{ venue_name: "Convention Centre", room_name: "Grand Ballroom" }],
    },
  ],
};

export const rpcs = {
  resolve_user_permissions: {
    typeX: [],
    typeY: { id: uuid(71), level: "delta", org_id: ORG, dept_id: DEPT, subdept_id: SUB, org_name: org.name, dept_name: dept.name, subdept_name: sub.name },
    allowed_scope_tree: { organizations: [{ id: ORG, name: org.name, departments: [{ id: DEPT, name: dept.name, subdepartments: [{ id: SUB, name: sub.name }] }] }] },
  },
};

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 86400;
export const authUser = { id: USER, aud: "authenticated", role: "authenticated", email: "alex@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const accessToken = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER, exp, role: "authenticated" })}.demo`;
export const session = { access_token: accessToken, refresh_token: "demo-refresh", token_type: "bearer", expires_in: 86400, expires_at: exp, user: authUser };

const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*" };

// Enough of PostgREST's filter syntax for the page's queries.
function matches(row, key, expr) {
  if (!(key in row)) return true;
  const dot = expr.indexOf(".");
  const op = expr.slice(0, dot);
  const val = expr.slice(dot + 1);
  const cell = row[key];
  if (op === "eq") return String(cell) === val;
  if (op === "neq") return String(cell) !== val;
  if (op === "is") return val === "null" ? cell == null : String(cell) === val;
  if (op === "in") return val.replace(/[()"]/g, "").split(",").includes(String(cell));
  if (op === "gte") return String(cell) >= val;
  if (op === "lte") return String(cell) <= val;
  if (op === "gt") return String(cell) > val;
  if (op === "lt") return String(cell) < val;
  return true;
}
const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns", "or", "and"]);

// Rows for a table, filtered the way the request asks.
function query(table, url) {
  let rows = tables[table] ?? [];
  for (const [k, v] of url.searchParams) if (!RESERVED.has(k)) rows = rows.filter((r) => matches(r, k, v));
  return rows;
}

// Headcount curve for one event and role. Stands in for the XGBoost regressors in ml/predict.py.
const PEAK = { Usher: 7, Security: 4, "Food Staff": 9, Supervisor: 2 };
function predict({ event_id, time_slice_index }) {
  const dinner = event_id === "EVT-2042";
  const minutes = 7 * 60 + time_slice_index * 30;
  const [from, to] = dinner ? [16.5 * 60, 20 * 60] : [8 * 60, 17.5 * 60];
  const out = {};
  for (const [role, peak] of Object.entries(PEAK)) {
    let v = 0;
    if (minutes >= from && minutes < to) {
      const t = (minutes - from) / (to - from);
      const entry = Math.exp(-(((t - 0.12) / 0.1) ** 2));
      const lunch = role === "Food Staff" ? Math.exp(-(((t - 0.5) / 0.14) ** 2)) : 0;
      const exit = Math.exp(-(((t - 0.92) / 0.09) ** 2));
      v = peak * (dinner ? 0.55 : 1) * Math.max(0.35, Math.min(1, entry + lunch + 0.8 * exit));
    }
    const value = Math.round(v * 10) / 10;
    out[role] = { predicted: value, corrected: value };
  }
  return out;
}

let nextId = 5000;
export async function installMock(context, { log } = {}) {
  await context.addInitScript(([s]) => {
    window.localStorage.setItem("icc-workforce-auth-token", JSON.stringify(s));
  }, [session]);

  // Nothing leaves the machine: anything not routed below gets aborted.
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") return route.continue();
    if (url.hostname === "api.dicebear.com") {
      return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#6366f1"/></svg>' });
    }
    log?.("aborted", url.href.slice(0, 120));
    return route.abort();
  });

  await context.route(`${ML}/**`, async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    return route.fulfill({ status: 200, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify(predict(req.postDataJSON())) });
  });

  await context.routeWebSocket(/supabase\.invalid/, () => {});

  await context.route(`${SUPABASE}/**`, async (route) => {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    const send = (body, status = 200, extra = {}) =>
      route.fulfill({ status, headers: { ...cors, "content-type": "application/json", ...extra }, body: body === undefined ? "" : JSON.stringify(body) });
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: cors });

    if (url.pathname.startsWith("/auth/v1/")) {
      if (url.pathname.endsWith("/user")) return send(authUser);
      if (url.pathname.endsWith("/token")) return send(session);
      return send({});
    }

    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      const name = url.pathname.split("/").pop();
      log?.("rpc", name);
      if (name === "sm_create_shift") {
        const { p_shift_data: p } = req.postDataJSON();
        const row = {
          ...p,
          id: uuid(++nextId),
          roles: tables.roles.find((r) => r.id === p.role_id) ?? null,
          departments: dept,
          sub_departments: sub,
          deleted_at: null,
          is_cancelled: false,
          version: 1,
        };
        tables.shifts.push(row);
        return send(row.id);
      }
      if (name in rpcs) return send(rpcs[name]);
      return send([]);
    }

    if (url.pathname.startsWith("/rest/v1/")) {
      const table = url.pathname.split("/").pop();
      const wantsOne = (req.headers().accept ?? "").includes("vnd.pgrst.object");
      log?.(method, table, tables[table] ? `(${tables[table].length})` : "(no fixture)", url.search.slice(0, 140));
      if (method === "GET" || method === "HEAD") {
        const rows = query(table, url);
        const headers = { "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` };
        if (wantsOne) return rows[0] ? send(rows[0], 200, headers) : send({ code: "PGRST116", message: "No rows found", details: null, hint: null }, 406);
        return send(rows, 200, headers);
      }
      if (method === "POST") {
        const input = req.postDataJSON();
        const inserted = (Array.isArray(input) ? input : [input]).map((r) => ({
          id: uuid(++nextId),
          created_at: new Date().toISOString(),
          attempted_count: 0, created_count: 0, deleted_count: 0, rolled_back_at: null,
          ...r,
        }));
        (tables[table] ??= []).push(...inserted);
        return send(wantsOne ? inserted[0] : inserted, 201);
      }
      if (method === "PATCH") {
        const rows = query(table, url);
        const patch = req.postDataJSON();
        rows.forEach((r) => Object.assign(r, patch));
        return send(wantsOne ? rows[0] : rows);
      }
      if (method === "DELETE") {
        const gone = new Set(query(table, url));
        tables[table] = (tables[table] ?? []).filter((r) => !gone.has(r));
        return send([]);
      }
    }
    return send({}, 404);
  });
}
