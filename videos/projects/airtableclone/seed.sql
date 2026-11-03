-- Fake workspace for the portfolio demo: one session, three bases, and a 100,000-row customers table.
-- Run against the throwaway demo database only.
TRUNCATE "User", "Base" CASCADE;

INSERT INTO "User" (id, name, email) VALUES ('demo_user', 'Demo User', 'demo@example.com');
INSERT INTO "Session" (id, "sessionToken", "userId", expires)
VALUES ('demo_session', 'demo-session-token', 'demo_user', now() + interval '30 days');

INSERT INTO "Base" (id, "createdById", name, "lastOpened", colour, "subColour") VALUES
 ('custbase', 'demo_user', 'Customer success', now(), '#166EE1', '#F1F5FF'),
 ('roadbase',   'demo_user', 'Product roadmap',  now() - interval '2 hours', '#7C37EF', '#FCF3FF'),
 ('evbase',    'demo_user', 'Events calendar',  now() - interval '1 day', '#048A0E', '#E6FCE8');

INSERT INTO "Table" (id, "baseId", name, "rowName") VALUES
 ('customers', 'custbase', 'Customers', 'Customer'),
 ('renewals',  'custbase', 'Renewals',  'Renewal'),
 ('roadmap',   'roadbase',   'Features',  'Feature'),
 ('events',    'evbase',    'Events',    'Event');

INSERT INTO "View" (id, "tableId", name, position, "hiddenColumns") VALUES
 ('allcustomers',     'customers', 'All customers', 0, '{}'),
 ('gridrenewals', 'renewals',  'Grid view', 0, '{}'),
 ('gridroadmap',  'roadmap',   'Grid view', 0, '{}'),
 ('gridevents',   'events',    'Grid view', 0, '{}');

INSERT INTO "FilterGroup" ("viewId", position, operator) VALUES
 ('allcustomers', 0, 'AND'), ('gridrenewals', 0, 'AND'), ('gridroadmap', 0, 'AND'), ('gridevents', 0, 'AND');

INSERT INTO "Column" (id, "tableId", name, type, position) VALUES
 ('colname',   'customers', 'Name',   'STRING', 0),
 ('colcity',   'customers', 'City',   'STRING', 1000),
 ('colplan',   'customers', 'Plan',   'STRING', 2000),
 ('colseats',  'customers', 'Seats',  'INT',    3000),
 ('colstatus', 'customers', 'Status', 'STRING', 4000),
 ('colrname',  'renewals',  'Name',   'STRING', 0),
 ('colrdate',  'renewals',  'Notes',  'STRING', 1000),
 ('colfname',  'roadmap',   'Name',   'STRING', 0),
 ('colfnotes', 'roadmap',   'Notes',  'STRING', 1000),
 ('colename',  'events',    'Name',   'STRING', 0),
 ('colenotes', 'events',    'Notes',  'STRING', 1000);

-- A few rows in the smaller tables so they aren't empty if opened.
INSERT INTO "Row" (id, "tableId", position)
SELECT t.tbl || g, t.tbl, g FROM (VALUES ('renewals'), ('roadmap'), ('events')) t(tbl), generate_series(1, 3) g;
INSERT INTO "Cell" ("columnId", "rowId", value)
SELECT c.col, c.tbl || g, c.val || ' ' || g
FROM (VALUES ('colrname','renewals','Renewal'),('colrdate','renewals','Follow up'),
             ('colfname','roadmap','Feature'),('colfnotes','roadmap','Scoping'),
             ('colename','events','Meetup'),('colenotes','events','Venue booked')) c(col, tbl, val),
     generate_series(1, 3) g;

-- 100,000 customers, built from made-up name parts.
INSERT INTO "Row" (id, "tableId", position)
SELECT 'r' || g, 'customers', g FROM generate_series(1, 100000) g;

SELECT setseed(0.42);
INSERT INTO "Cell" ("columnId", "rowId", value)
SELECT 'colname', 'r' || g,
  (ARRAY['Avery','Blake','Casey','Devon','Ellis','Finley','Greer','Harper','Indigo','Jules','Kit','Linden','Marlow','Noor','Oakley','Peyton','Quinn','Reese','Sage','Tatum','Umi','Vale','Wren','Yael','Zuri'])[1 + floor(random() * 25)::int]
  || ' ' ||
  (ARRAY['Ashdown','Birchall','Calloway','Dunmore','Eastwick','Fairleigh','Greywood','Hollis','Ingram','Jessop','Kestrel','Lockwood','Merrow','Northcott','Oakhurst','Pemberton','Quillan','Rookwood','Stanway','Thackeray','Underhill','Vickery','Whitlock','Yardley'])[1 + floor(random() * 24)::int]
FROM generate_series(1, 100000) g
UNION ALL
SELECT 'colcity', 'r' || g, (ARRAY['Sydney','Melbourne','Brisbane','Perth','Adelaide','Hobart','Darwin','Canberra','Newcastle','Geelong','Wollongong','Cairns'])[1 + floor(random() * 12)::int] FROM generate_series(1, 100000) g
UNION ALL
SELECT 'colplan', 'r' || g, (ARRAY['Free','Starter','Team','Business','Enterprise'])[1 + floor(random() * 5)::int] FROM generate_series(1, 100000) g
UNION ALL
SELECT 'colseats', 'r' || g, (1 + floor(random() * 480)::int)::text FROM generate_series(1, 100000) g
UNION ALL
SELECT 'colstatus', 'r' || g, (ARRAY['Active','Active','Active','Trial','Churned','Onboarding'])[1 + floor(random() * 6)::int] FROM generate_series(1, 100000) g;

-- The film edits this cell, so it has to start as Churned.
UPDATE "Cell" SET value = 'Churned' WHERE "rowId" = 'r2' AND "columnId" = 'colstatus';

ANALYZE;
