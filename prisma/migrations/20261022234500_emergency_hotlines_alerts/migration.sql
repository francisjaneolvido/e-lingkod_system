-- Additive migration. No existing tables or records are deleted.
CREATE TABLE `emergency_hotline` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(140) NOT NULL,
  `category` VARCHAR(30) NOT NULL,
  `office` VARCHAR(160) NOT NULL,
  `phone` VARCHAR(35) NOT NULL,
  `extension` VARCHAR(15) NULL,
  `note` VARCHAR(350) NULL,
  `sourceUrl` VARCHAR(500) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `verifiedAt` DATETIME(3) NOT NULL,
  `verifiedById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `emergency_hotline_isActive_category_idx` (`isActive`, `category`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `emergency_hotline_proposal` (
  `id` VARCHAR(191) NOT NULL,
  `targetId` VARCHAR(191) NULL,
  `operation` VARCHAR(20) NOT NULL,
  `title` VARCHAR(140) NOT NULL,
  `category` VARCHAR(30) NOT NULL,
  `office` VARCHAR(160) NOT NULL,
  `phone` VARCHAR(35) NOT NULL,
  `extension` VARCHAR(15) NULL,
  `note` VARCHAR(350) NULL,
  `sourceUrl` VARCHAR(500) NOT NULL,
  `status` VARCHAR(25) NOT NULL DEFAULT 'PENDING',
  `submittedById` VARCHAR(191) NOT NULL,
  `reviewedById` VARCHAR(191) NULL,
  `reviewNote` VARCHAR(600) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedAt` DATETIME(3) NULL,
  INDEX `emergency_hotline_proposal_status_createdAt_idx` (`status`, `createdAt`),
  INDEX `emergency_hotline_proposal_submittedById_createdAt_idx` (`submittedById`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `emergency_alert` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `details` TEXT NOT NULL,
  `safetyInstructions` TEXT NOT NULL,
  `sourceUrl` VARCHAR(500) NOT NULL,
  `issuingOffice` VARCHAR(160) NOT NULL,
  `severity` VARCHAR(25) NOT NULL,
  `barangaysJson` TEXT NOT NULL,
  `status` VARCHAR(25) NOT NULL DEFAULT 'DRAFT',
  `createdById` VARCHAR(191) NOT NULL,
  `reviewedById` VARCHAR(191) NULL,
  `reviewNote` VARCHAR(600) NULL,
  `startsAt` DATETIME(3) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `publishedAt` DATETIME(3) NULL,
  `archivedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `emergency_alert_status_startsAt_expiresAt_idx` (`status`, `startsAt`, `expiresAt`),
  INDEX `emergency_alert_createdById_status_idx` (`createdById`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `emergency_action_log` (
  `id` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(30) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(40) NOT NULL,
  `actorId` VARCHAR(191) NOT NULL,
  `detail` VARCHAR(800) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `emergency_action_log_entityType_entityId_createdAt_idx` (`entityType`, `entityId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
