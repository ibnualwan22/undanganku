CREATE TABLE undangan.sessions (
  token_hash text PRIMARY KEY,
  username text NOT NULL,
  csrf text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expiry ON undangan.sessions(expires_at);
