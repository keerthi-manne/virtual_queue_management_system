-- Dynamic Counter Setup - Uses Your Existing Services
-- This will work with whatever services you have in your database

-- First, let's see what services you have
SELECT id, name FROM services ORDER BY name;

-- Now insert counters for each service dynamically
-- Each service gets 2-3 counters

-- Birth Certificate - 3 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(1, 3)
FROM services s
WHERE s.name = 'Birth Certificate';

-- Citizenship Application - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(4, 5)
FROM services s
WHERE s.name = 'Citizenship Application';

-- Death Certificate - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(6, 7)
FROM services s
WHERE s.name = 'Death Certificate';

-- Divorce Certificate - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(8, 9)
FROM services s
WHERE s.name = 'Divorce Certificate';

-- Driver License - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(10, 11)
FROM services s
WHERE s.name = 'Driver License';

-- Education Services - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(12, 13)
FROM services s
WHERE s.name = 'Education Services';

-- Health Services - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(14, 15)
FROM services s
WHERE s.name = 'Health Services';

-- Marriage Certificate - 3 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(16, 18)
FROM services s
WHERE s.name = 'Marriage Certificate';

-- Passport Application - 3 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(19, 21)
FROM services s
WHERE s.name = 'Passport Application';

-- Property Services - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(22, 23)
FROM services s
WHERE s.name = 'Property Services';

-- Special Permit - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(24, 25)
FROM services s
WHERE s.name = 'Special Permit';

-- Tax Services - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(26, 27)
FROM services s
WHERE s.name = 'Tax Services';

-- Utility Services - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(28, 29)
FROM services s
WHERE s.name = 'Utility Services';

-- Vehicle Registration - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
SELECT 
  (SELECT id FROM offices LIMIT 1),
  s.id,
  generate_series(30, 31)
FROM services s
WHERE s.name = 'Vehicle Registration';

-- Verify counters created
SELECT 
  s.name as service_name,
  COUNT(c.id) as counter_count,
  STRING_AGG(c.counter_number::text, ', ' ORDER BY c.counter_number) as counter_numbers
FROM services s
LEFT JOIN counters c ON s.id = c.service_id
GROUP BY s.id, s.name
ORDER BY s.name;
