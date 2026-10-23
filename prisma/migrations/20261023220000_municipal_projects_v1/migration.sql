-- Additive project transparency tables. No old data is modified or deleted.
CREATE TABLE `municipal_project` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `summary` TEXT NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `phase` VARCHAR(25) NOT NULL DEFAULT 'PLANNED',
  `leadOffice` VARCHAR(160) NOT NULL,
  `barangaysJson` TEXT NOT NULL,
  `sourceUrl` VARCHAR(500) NOT NULL,
  `status` VARCHAR(25) NOT NULL DEFAULT 'DRAFT',
  `createdById` VARCHAR(191) NOT NULL,
  `reviewedById` VARCHAR(191) NULL,
  `reviewNote` TEXT NULL,
  `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `municipal_project_status_phase_publishedAt_idx` (`status`, `phase`, `publishedAt`),
  INDEX `municipal_project_leadOffice_status_idx` (`leadOffice`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `municipal_project_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `municipal_project_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `municipal_project_update` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `details` TEXT NOT NULL,
  `progressPercent` INTEGER NULL,
  `phaseAfter` VARCHAR(25) NULL,
  `sourceUrl` VARCHAR(500) NOT NULL,
  `status` VARCHAR(25) NOT NULL DEFAULT 'PENDING_REVIEW',
  `reviewNote` TEXT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `reviewedById` VARCHAR(191) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `municipal_project_update_projectId_status_createdAt_idx` (`projectId`, `status`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `municipal_project_update_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `municipal_project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `municipal_project_update_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `municipal_project_update_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
