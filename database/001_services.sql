BEGIN;
CREATE TABLE IF NOT EXISTS service_requests (
 id uuid PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL DEFAULT 1,
 idempotency_key uuid NOT NULL UNIQUE,
 payload_hash text NOT NULL,
 customer_name text NOT NULL,
 email text NOT NULL,
 phone text NOT NULL DEFAULT '',
 kind text NOT NULL CHECK(kind IN ('stay','experience','combined')),
 property_id text CHECK(property_id IN ('apartment','house')),
 arrival date,
 departure date,
 guests integer NOT NULL CHECK(guests BETWEEN 1 AND 100),
 items jsonb NOT NULL,
 details jsonb NOT NULL,
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','planning','quoted','confirmed','in_progress','completed','cancelled')),
 assigned_to text NOT NULL DEFAULT '',
 internal_notes text NOT NULL DEFAULT '',
 quote_pesos integer CHECK(quote_pesos>=0),
 supplier_plan text NOT NULL DEFAULT '',
 CHECK(departure IS NULL OR arrival IS NOT NULL AND departure>arrival)
);
CREATE INDEX IF NOT EXISTS requests_status_created ON service_requests(status,created_at DESC);
CREATE TABLE IF NOT EXISTS resource_nights (
 property_id text NOT NULL,
 night date NOT NULL,
 request_id uuid NOT NULL REFERENCES service_requests(id),
 PRIMARY KEY(property_id,night)
);
CREATE INDEX IF NOT EXISTS nights_request ON resource_nights(request_id);
CREATE TABLE IF NOT EXISTS request_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id uuid NOT NULL REFERENCES service_requests(id),
 actor text NOT NULL,
 action text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mail_outbox (
 id uuid PRIMARY KEY,
 request_id uuid NOT NULL REFERENCES service_requests(id),
 recipient text NOT NULL,
 subject text NOT NULL,
 body text NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','uncertain')),
 created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz
);
COMMIT;

CREATE TABLE IF NOT EXISTS suppliers (
 id uuid PRIMARY KEY,
 name text NOT NULL,
 service text NOT NULL,
 contact text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '',
 active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
