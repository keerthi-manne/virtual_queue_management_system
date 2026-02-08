-- Complete Setup SQL for Virtual Queue Management System
-- Run this in Supabase SQL Editor

-- Step 1: First, let's check what office_id to use
-- Run this query first to see your existing office:
-- SELECT id, name FROM offices LIMIT 1;

-- If no office exists, create one with the specific ID:
INSERT INTO offices (id, name, location)
VALUES ('44d9958e-bba4-48d9-869c-3b46c3e31663', 'Main Municipal Office', 'City Center')
ON CONFLICT (id) DO NOTHING;

-- Step 2: Insert counters for all existing services (31 counters total)
-- All counters will use office_id: 44d9958e-bba4-48d9-869c-3b46c3e31663
-- Special Permit - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '21666635-9efd-4030-959f-f887cf7a4a73', 1),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '21666635-9efd-4030-959f-f887cf7a4a73', 2);

-- Passport Application - 3 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '225526e3-b414-4156-9ead-047e5d058502', 3),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '225526e3-b414-4156-9ead-047e5d058502', 4),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '225526e3-b414-4156-9ead-047e5d058502', 5);

-- Citizenship Application - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '4072f3f8-f189-472c-abcb-a4353294d110', 6),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '4072f3f8-f189-472c-abcb-a4353294d110', 7);

-- Divorce Certificate - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '408505ea-ed1a-47bd-8930-cee7eda7675d', 8),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '408505ea-ed1a-47bd-8930-cee7eda7675d', 9);

-- Marriage Certificate - 3 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '489eaff7-82ea-4487-8de4-2936a485b2cb', 10),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '489eaff7-82ea-4487-8de4-2936a485b2cb', 11),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '489eaff7-82ea-4487-8de4-2936a485b2cb', 12);

-- Education Services - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '50029f98-6d1e-4a2d-998b-2d3e45660acd', 13),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '50029f98-6d1e-4a2d-998b-2d3e45660acd', 14);

-- Vehicle Registration - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '52d0cd50-1b6e-486f-8b20-b3d643c49611', 15),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '52d0cd50-1b6e-486f-8b20-b3d643c49611', 16);

-- Health Services - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '65afa40e-4c4d-4d17-ac2d-971318c7930b', 17),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '65afa40e-4c4d-4d17-ac2d-971318c7930b', 18);

-- Tax Services - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '69ccd7b1-01dd-4509-bdb1-3c0d1ed1b3ad', 19),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '69ccd7b1-01dd-4509-bdb1-3c0d1ed1b3ad', 20);

-- Birth Certificate - 3 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '7a5cecc8-f951-4acc-afb7-857b30d91482', 21),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '7a5cecc8-f951-4acc-afb7-857b30d91482', 22),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '7a5cecc8-f951-4acc-afb7-857b30d91482', 23);

-- Utility Services - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '96757182-a434-4403-872d-af623d538bc9', 24),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '96757182-a434-4403-872d-af623d538bc9', 25);

-- Death Certificate - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '99ec40a9-7bdb-4f67-bf22-cec7477c2d30', 26),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', '99ec40a9-7bdb-4f67-bf22-cec7477c2d30', 27);

-- Driver License - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', 'cae4ad2c-8a62-41e1-b940-96281c04cc83', 28),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', 'cae4ad2c-8a62-41e1-b940-96281c04cc83', 29);

-- Property Services - 2 counters
INSERT INTO counters (office_id, service_id, counter_number)
VALUES 
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', 'd5bbd86b-8b0b-4755-884a-82a1e7a84cd3', 30),
  ('44d9958e-bba4-48d9-869c-3b46c3e31663', 'd5bbd86b-8b0b-4755-884a-82a1e7a84cd3', 31);

-- Step 3: Create test users in auth.users first (do this in Supabase Dashboard Authentication)
-- Then insert into users table

-- Admin User
-- First create in Supabase Auth with email: admin@test.com, password: admin123
-- Then run this (replace auth_user_id with the actual UUID from auth.users):
-- INSERT INTO users (auth_user_id, email, role, name, phone, office_id)
-- VALUES ('<auth_user_id_here>', 'admin@test.com', 'ADMIN', 'Admin User', '+1234567890', '44d9958e-bba4-48d9-869c-3b46c3e31663');

-- Staff User for Counter 1
-- First create in Supabase Auth with email: staff@test.com, password: staff123
-- INSERT INTO users (auth_user_id, email, role, name, phone, office_id, counter_id)
-- VALUES ('<auth_user_id_here>', 'staff@test.com', 'STAFF', 'Staff Member', '+1234567891', '44d9958e-bba4-48d9-869c-3b46c3e31663', '<counter_1_id>');

-- Citizen User
-- First create in Supabase Auth with email: citizen@test.com, password: citizen123
-- INSERT INTO users (auth_user_id, email, role, name, phone)
-- VALUES ('<auth_user_id_here>', 'citizen@test.com', 'USER', 'Test Citizen', '+1234567892');

-- Verify counters
SELECT 
  s.name as service_name,
  COUNT(c.id) as counter_count,
  STRING_AGG(c.counter_number::text, ', ' ORDER BY c.counter_number) as counter_numbers
FROM services s
LEFT JOIN counters c ON s.id = c.service_id
WHERE s.office_id = '44d9958e-bba4-48d9-869c-3b46c3e31663'
GROUP BY s.id, s.name
ORDER BY s.name;
