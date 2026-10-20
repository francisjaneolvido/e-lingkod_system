-- CreateTable
CREATE TABLE `civic_report` (
    `id` VARCHAR(191) NOT NULL,
    `trackingId` VARCHAR(48) NOT NULL,
    `submissionKey` VARCHAR(64) NOT NULL,
    `reporterId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `barangay` VARCHAR(100) NOT NULL,
    `address` VARCHAR(300) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `locationSource` VARCHAR(12) NOT NULL DEFAULT 'ADDRESS',
    `gpsAccuracy` DOUBLE NULL,
    `status` ENUM('SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    `assignedOffice` VARCHAR(120) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `civic_report_trackingId_key`(`trackingId`),
    INDEX `civic_report_reporterId_createdAt_idx`(`reporterId`, `createdAt`),
    INDEX `civic_report_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `civic_report_reporterId_submissionKey_key`(`reporterId`, `submissionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_photo` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(40) NOT NULL DEFAULT 'image/jpeg',
    `byteSize` INTEGER NOT NULL,
    `data` MEDIUMBLOB NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `report_photo_reportId_idx`(`reportId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_update` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `status` ENUM('SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') NOT NULL,
    `assignedOffice` VARCHAR(120) NULL,
    `note` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `report_update_reportId_createdAt_idx`(`reportId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `civic_report` ADD CONSTRAINT `civic_report_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_photo` ADD CONSTRAINT `report_photo_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `civic_report`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_update` ADD CONSTRAINT `report_update_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `civic_report`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_update` ADD CONSTRAINT `report_update_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
