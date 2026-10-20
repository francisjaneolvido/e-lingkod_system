-- V9: additive migration; existing citizen reports and proof history are retained.
ALTER TABLE `civic_report` MODIFY COLUMN `status`
  ENUM('SUBMITTED','UNDER_REVIEW','IN_PROGRESS','PENDING_VERIFICATION','RESOLVED','REJECTED','REOPENED')
  NOT NULL DEFAULT 'SUBMITTED';
ALTER TABLE `report_update` MODIFY COLUMN `status`
  ENUM('SUBMITTED','UNDER_REVIEW','IN_PROGRESS','PENDING_VERIFICATION','RESOLVED','REJECTED','REOPENED') NOT NULL;

CREATE TABLE `citizen_resolution_feedback` (
  `id` VARCHAR(191) NOT NULL,
  `reportId` VARCHAR(191) NOT NULL,
  `resolutionSubmissionId` VARCHAR(191) NOT NULL,
  `reporterId` VARCHAR(191) NOT NULL,
  `decision` ENUM('CONFIRMED','DISPUTED') NOT NULL,
  `reason` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `citizen_resolution_feedback_resolutionSubmissionId_key` (`resolutionSubmissionId`),
  INDEX `citizen_resolution_feedback_reportId_createdAt_idx` (`reportId`, `createdAt`),
  INDEX `citizen_resolution_feedback_reporterId_idx` (`reporterId`),
  CONSTRAINT `citizen_resolution_feedback_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `civic_report` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `citizen_resolution_feedback_resolutionSubmissionId_fkey` FOREIGN KEY (`resolutionSubmissionId`) REFERENCES `resolution_submission` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `citizen_resolution_feedback_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `citizen_feedback_photo` (
  `id` VARCHAR(191) NOT NULL,
  `feedbackId` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(40) NOT NULL DEFAULT 'image/jpeg',
  `byteSize` INTEGER NOT NULL,
  `data` MEDIUMBLOB NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `citizen_feedback_photo_feedbackId_idx` (`feedbackId`),
  CONSTRAINT `citizen_feedback_photo_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `citizen_resolution_feedback` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
