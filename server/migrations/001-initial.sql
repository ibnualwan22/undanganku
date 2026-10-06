CREATE TABLE undangan.admins (
  id smallint PRIMARY KEY CHECK (id = 1),
  username text NOT NULL,
  password_hash text NOT NULL
);

CREATE TABLE undangan.invitations (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  revision integer NOT NULL CHECK (revision > 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  published_at timestamptz,
  draft jsonb NOT NULL CHECK (jsonb_typeof(draft) = 'object'),
  published jsonb CHECK (jsonb_typeof(published) = 'object'),
  position integer NOT NULL
);

-- Only metadata and URLs live here. Media files remain in Cloudinary/local storage.
CREATE TABLE undangan.assets (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('image', 'audio')),
  name text NOT NULL,
  size bigint NOT NULL CHECK (size >= 0),
  mime text NOT NULL,
  created_at timestamptz NOT NULL,
  provider text NOT NULL CHECK (provider IN ('cloudinary', 'local')),
  url text NOT NULL,
  public_id text,
  position integer NOT NULL
);

CREATE TABLE undangan.responses (
  invitation_id text NOT NULL REFERENCES undangan.invitations(id) ON DELETE CASCADE,
  id text NOT NULL,
  name text NOT NULL,
  attendance text NOT NULL,
  guests integer NOT NULL CHECK (guests BETWEEN 0 AND 5),
  message text NOT NULL,
  visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  position integer NOT NULL,
  PRIMARY KEY (invitation_id, id)
);
CREATE INDEX responses_invitation_order ON undangan.responses(invitation_id, position);
