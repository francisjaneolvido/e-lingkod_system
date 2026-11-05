-- Existing accounts retain access explicitly, without claiming ID verification.
ALTER TABLE `user`
  ADD COLUMN `identityStatus` VARCHAR(30) NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN `identityVersion` INTEGER NOT NULL DEFAULT 0;
-- Only future inserts require submission. Public signup also forces this state.
ALTER TABLE `user` ALTER COLUMN `identityStatus` SET DEFAULT 'SUBMISSION_REQUIRED';

CREATE TABLE `citizen_identity_submission` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `revision` INTEGER NOT NULL,
  `documentLabel` VARCHAR(120) NOT NULL,
  `submissionKey` VARCHAR(64) NOT NULL,
  `detailsJson` TEXT NOT NULL,
  `mimeType` VARCHAR(40) NOT NULL,
  `byteSize` INTEGER NOT NULL,
  `sha256` VARCHAR(64) NOT NULL,
  `data` MEDIUMBLOB NOT NULL,
  `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `citizen_identity_submission_userId_revision_key` (`userId`, `revision`),
  UNIQUE INDEX `citizen_identity_submission_userId_submissionKey_key` (`userId`, `submissionKey`),
  INDEX `citizen_identity_submission_submittedAt_id_idx` (`submittedAt`, `id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `citizen_identity_submission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `citizen_identity_review` (
  `id` VARCHAR(191) NOT NULL,
  `submissionId` VARCHAR(191) NOT NULL,
  `reviewerId` VARCHAR(191) NOT NULL,
  `decision` VARCHAR(30) NOT NULL,
  `reason` VARCHAR(1200) NOT NULL,
  `reviewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `citizen_identity_review_submissionId_key` (`submissionId`),
  INDEX `citizen_identity_review_reviewedAt_id_idx` (`reviewedAt`, `id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `citizen_identity_review_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `citizen_identity_submission` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `citizen_identity_review_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `rateLimit` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `count` INTEGER NOT NULL,
  `lastRequest` BIGINT NOT NULL,
  UNIQUE INDEX `rateLimit_key_key` (`key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
