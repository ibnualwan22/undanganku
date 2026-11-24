ALTER TABLE undangan.invitations ADD COLUMN access jsonb;
CREATE UNIQUE INDEX invitation_access_username ON undangan.invitations ((access->>'username')) WHERE access IS NOT NULL;
ALTER TABLE undangan.assets ADD COLUMN invitation_id text;
ALTER TABLE undangan.sessions ADD COLUMN principal jsonb NOT NULL DEFAULT '{"role":"admin"}'::jsonb;
