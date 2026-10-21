-- Additive change: preserve Better Auth's `name` column and existing user records.
-- Nullable structured fields allow existing accounts and invitation/seed flows to continue.
ALTER TABLE `user`
  ADD COLUMN `firstName` VARCHAR(100) NULL,
  ADD COLUMN `lastName` VARCHAR(100) NULL,
  ADD COLUMN `middleInitial` VARCHAR(1) NULL,
  ADD COLUMN `hasNoMiddleName` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `phoneNumber` VARCHAR(13) NULL;
