BEGIN;
CREATE TABLE IF NOT EXISTS properties (
 id text PRIMARY KEY,
 name text NOT NULL,
 capacity integer CHECK(capacity>0),
 opening_date date,
 minimum_nights integer NOT NULL DEFAULT 1 CHECK(minimum_nights>0),
 published boolean NOT NULL DEFAULT false,
 confirmation_enabled boolean NOT NULL DEFAULT false,
 resource_group text,
 description text NOT NULL DEFAULT ''
);
INSERT INTO properties(id,name,capacity,opening_date,published,confirmation_enabled,resource_group,description) VALUES
('apartment','Apartment',5,'2027-01-01',true,true,'apartment','25 m²; shared outdoor kitchen and shower; indoor toilet and washbasin'),
('kobo','Kobo House',NULL,'2027-01-01',true,false,NULL,'Approximately 55 m² across two floors; final capacity and resource independence require verification'),
('residence','Sogod Residence / Upper Floor',NULL,NULL,true,false,NULL,'Premium concept, approximately 100 m²; details to be confirmed'),
('house','Legacy house — mapping required',NULL,NULL,false,false,NULL,'Do not map historical requests without verifying the physical unit')
ON CONFLICT(id) DO NOTHING;
ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_property_id_check;
ALTER TABLE service_requests ADD CONSTRAINT service_requests_property_id_check CHECK(property_id IN ('apartment','house','kobo','residence'));
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS supplier_confirmed boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS proposals (
 id uuid PRIMARY KEY,
 request_id uuid NOT NULL REFERENCES service_requests(id),
 revision integer NOT NULL,
 state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','shared','accepted','superseded','withdrawn')),
 currency text NOT NULL DEFAULT 'PHP' CHECK(currency='PHP'),
 lines jsonb NOT NULL,
 total_minor integer NOT NULL CHECK(total_minor>=0),
 cost_minor integer NOT NULL CHECK(cost_minor>=0),
 terms text NOT NULL,
 valid_until timestamptz NOT NULL,
 token_hash text,
 accepted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(request_id,revision)
);
CREATE INDEX IF NOT EXISTS proposals_request ON proposals(request_id,revision DESC);
ALTER TABLE service_requests ALTER COLUMN quote_pesos TYPE numeric(14,2);
COMMIT;
