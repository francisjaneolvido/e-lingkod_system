-- Additive Municipal Projects V3 fields for explicitly marked fictional DEMO records.
-- No changes to Jobs, Opportunities, Survey or Census tables.
ALTER TABLE `municipal_project`
  MODIFY COLUMN `sourceUrl` VARCHAR(500) NULL,
  ADD COLUMN `isDemo` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `photoPath` VARCHAR(240) NULL;
