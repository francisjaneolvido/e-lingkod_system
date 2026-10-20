-- V10 additive migration: civic-reporting data and existing accounts stay intact.
CREATE TABLE `job_opportunity` (
  `id` VARCHAR(191) NOT NULL, `title` VARCHAR(150) NOT NULL, `employer` VARCHAR(150) NOT NULL,
  `sector` VARCHAR(80) NOT NULL, `workType` VARCHAR(30) NOT NULL, `barangay` VARCHAR(100) NOT NULL,
  `location` VARCHAR(180) NOT NULL, `description` TEXT NOT NULL, `skillsJson` TEXT NOT NULL,
  `interestsJson` TEXT NOT NULL, `education` VARCHAR(40) NOT NULL,
  `contactInfo` VARCHAR(250) NOT NULL, `externalUrl` VARCHAR(500) NULL,
  `status` ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `expiresAt` DATETIME(3) NULL, `publishedAt` DATETIME(3) NULL,
  `createdById` VARCHAR(191) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `job_opportunity_status_publishedAt_idx` (`status`,`publishedAt`),
  INDEX `job_opportunity_sector_workType_idx` (`sector`,`workType`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `jobseeker_profile` (
  `userId` VARCHAR(191) NOT NULL, `skillsJson` TEXT NOT NULL, `interestsJson` TEXT NOT NULL,
  `education` VARCHAR(40) NOT NULL, `preferredArea` VARCHAR(100) NOT NULL,
  `availability` VARCHAR(30) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL, PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `spes_import_batch` (
  `id` VARCHAR(191) NOT NULL, `sourceLabel` VARCHAR(120) NOT NULL,
  `importedById` VARCHAR(191) NOT NULL, `recordCount` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `spes_import_batch_createdAt_idx` (`createdAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `spes_survey_record` (
  `id` VARCHAR(191) NOT NULL, `batchId` VARCHAR(191) NOT NULL,
  `barangay` VARCHAR(100) NOT NULL, `education` VARCHAR(40) NOT NULL,
  `skillsJson` TEXT NOT NULL, `interestsJson` TEXT NOT NULL,
  `availability` VARCHAR(30) NOT NULL, INDEX `spes_survey_record_batchId_idx` (`batchId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `job_activity` (
  `id` VARCHAR(191) NOT NULL, `jobId` VARCHAR(191) NOT NULL, `actorId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(30) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `job_activity_jobId_createdAt_idx` (`jobId`,`createdAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `job_opportunity` ADD CONSTRAINT `job_opportunity_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `jobseeker_profile` ADD CONSTRAINT `jobseeker_profile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `spes_import_batch` ADD CONSTRAINT `spes_import_batch_importedById_fkey` FOREIGN KEY (`importedById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `spes_survey_record` ADD CONSTRAINT `spes_survey_record_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `spes_import_batch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_activity` ADD CONSTRAINT `job_activity_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `job_opportunity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_activity` ADD CONSTRAINT `job_activity_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
