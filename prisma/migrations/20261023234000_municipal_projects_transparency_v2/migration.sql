-- Additive migration for Projects module only. No Job Matching, Survey or Census tables are altered.
ALTER TABLE `municipal_project`
  ADD COLUMN `budgetPhp` DECIMAL(16,2) NULL,
  ADD COLUMN `budgetSourceUrl` VARCHAR(500) NULL,
  ADD COLUMN `fundingSource` VARCHAR(180) NULL,
  ADD COLUMN `contractor` VARCHAR(180) NULL,
  ADD COLUMN `procurementUrl` VARCHAR(500) NULL,
  ADD COLUMN `targetCompletion` DATETIME(3) NULL;

CREATE TABLE `municipal_office_directory` (
  `id` VARCHAR(191) NOT NULL,
  `officeName` VARCHAR(160) NOT NULL,
  `phone` VARCHAR(35) NULL,
  `extension` VARCHAR(15) NULL,
  `email` VARCHAR(190) NULL,
  `officeHours` VARCHAR(160) NULL,
  `address` VARCHAR(220) NULL,
  `notes` VARCHAR(350) NULL,
  `sourceUrl` VARCHAR(500) NOT NULL,
  `isPublished` BOOLEAN NOT NULL DEFAULT TRUE,
  `verifiedAt` DATETIME(3) NOT NULL,
  `verifiedById` VARCHAR(191) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `municipal_office_directory_officeName_key` (`officeName`),
  INDEX `municipal_office_directory_isPublished_officeName_idx` (`isPublished`, `officeName`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `municipal_office_proposal` (
  `id` VARCHAR(191) NOT NULL,
  `officeName` VARCHAR(160) NOT NULL,
  `phone` VARCHAR(35) NULL,
  `extension` VARCHAR(15) NULL,
  `email` VARCHAR(190) NULL,
  `officeHours` VARCHAR(160) NULL,
  `address` VARCHAR(220) NULL,
  `notes` VARCHAR(350) NULL,
  `sourceUrl` VARCHAR(500) NOT NULL,
  `status` VARCHAR(25) NOT NULL DEFAULT 'PENDING_REVIEW',
  `reviewNote` VARCHAR(700) NULL,
  `submittedById` VARCHAR(191) NOT NULL,
  `reviewedById` VARCHAR(191) NULL,
  `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedAt` DATETIME(3) NULL,
  INDEX `municipal_office_proposal_status_submittedAt_idx` (`status`, `submittedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
