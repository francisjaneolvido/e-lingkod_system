-- V10.2 additive change: preserve existing jobs, accounts and civic reports.
-- Existing PUBLISHED rows stay published as legacy listings, but are NOT automatically verified.
ALTER TABLE `job_opportunity`
  MODIFY `status` ENUM('DRAFT','PENDING_REVIEW','RETURNED','PUBLISHED','CLOSED','FILLED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `version` INT NOT NULL DEFAULT 1,
  ADD COLUMN `reviewSource` VARCHAR(300) NULL,
  ADD COLUMN `reviewRequestedAt` DATETIME(3) NULL,
  ADD COLUMN `reviewedAt` DATETIME(3) NULL,
  ADD COLUMN `reviewedById` VARCHAR(191) NULL,
  ADD COLUMN `reviewNote` TEXT NULL,
  ADD COLUMN `employerVerified` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `vacancyVerified` BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX `job_opportunity_reviewedById_idx` ON `job_opportunity` (`reviewedById`);
ALTER TABLE `job_opportunity` ADD CONSTRAINT `job_opportunity_reviewedById_fkey`
  FOREIGN KEY (`reviewedById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `job_activity`
  ADD COLUMN `note` TEXT NULL,
  ADD COLUMN `previousStatus` VARCHAR(30) NULL,
  ADD COLUMN `nextStatus` VARCHAR(30) NULL;
