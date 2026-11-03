-- Fake party for the portfolio demo. Run against the throwaway demo database only.
TRUNCATE partyroom_party CASCADE;
INSERT INTO partyroom_party (id, slug, name, date, "startTime", location, description, "houseRules", itinerary, mode)
VALUES ('11111111-1111-1111-1111-111111111111', 'rooftop', 'Rooftop Birthday', to_char(now() AT TIME ZONE 'Australia/Sydney','YYYY-MM-DD'), '18:00',
 '12 Example Lane, Sydney', 'Six teams, one rooftop, too many games.',
 E'Look after each other\nNo gatecrashers\nWear your nametag',
 '[{"time":"18:00","title":"Doors open","detail":"Grab your nametag"},{"time":"19:00","title":"Team games"},{"time":"21:00","title":"Cake and awards"}]', 'day');
INSERT INTO partyroom_guest ("partyId", name, team, rsvp, "signedInAt", "checkedInAt")
SELECT '11111111-1111-1111-1111-111111111111', n, t, 'going', now(), CASE WHEN t IS NULL THEN NULL ELSE now() END
FROM (VALUES ('Alex Park','red'),('Bella Tran','yellow'),('Chris Nguyen','green'),('Dana Lee','blue'),('Eli Wong','purple'),('Farah Khan','white'),
 ('Gabe Chen','red'),('Hana Sato','yellow'),('Ivan Costa','green'),('Jade Liu','blue'),('Kai Ito',NULL),('Luca Rossi',NULL)) v(n,t);
INSERT INTO partyroom_guest ("partyId", name) VALUES ('11111111-1111-1111-1111-111111111111','Sam Rivers');
