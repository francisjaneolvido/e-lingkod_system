-- V7 is additive: existing reports, citizen evidence, and history remain intact.
-- The new status indicates that evidence awaits independent LGU approval.
ALTER TABLE `civic_report` MODIFY COLUMN `status`
  ENUM('SUBMITTED','UNDER_REVIEW','IN_PROGRESS','PENDING_VERIFICATION','RESOLVED','REJECTED')
  NOT NULL DEFAULT 'SUBMITTED';
ALTER TABLE `report_update` MODIFY COLUMN `status`
  ENUM('SUBMITTED','UNDER_REVIEW','IN_PROGRESS','PENDING_VERIFICATION','RESOLVED','REJECTED') NOT NULL;

CREATE TABLE `resolution_submission` (
  `id` VARCHAR(191) NOT NULL,
  `reportId` VARCHAR(191) NOT NULL,
  `submittedById` VARCHAR(191) NOT NULL,
  `remarks` TEXT NOT NULL,
  `reviewStatus` ENUM('PENDING','APPROVED','RETURNED') NOT NULL DEFAULT 'PENDING',
  `reviewedById` VARCHAR(191) NULL,
  `reviewNote` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `resolution_submission_reportId_createdAt_idx` (`reportId`, `createdAt`),
  INDEX `resolution_submission_submittedById_idx` (`submittedById`),
  CONSTRAINT `resolution_submission_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `civic_report` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `resolution_submission_submittedById_fkey` FOREIGN KEY (`submittedById`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `resolution_submission_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `resolution_proof_photo` (
  `id` VARCHAR(191) NOT NULL,
  `submissionId` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(40) NOT NULL DEFAULT 'image/jpeg',
  `byteSize` INTEGER NOT NULL,
  `data` MEDIUMBLOB NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `resolution_proof_photo_submissionId_idx` (`submissionId`),
  CONSTRAINT `resolution_proof_photo_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `resolution_submission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
