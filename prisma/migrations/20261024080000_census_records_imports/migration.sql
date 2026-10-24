-- AlterTable
ALTER TABLE `community_import_batch` ADD COLUMN `reviewNeededCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `skippedCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `sourceKey` VARCHAR(180) NULL,
    ADD COLUMN `surveyYear` INTEGER NULL;

-- AlterTable
ALTER TABLE `community_import_record` ADD COLUMN `contentHash` CHAR(64) NULL,
    ADD COLUMN `outcome` VARCHAR(30) NOT NULL DEFAULT 'ACCEPTED',
    ADD COLUMN `outcomeReason` VARCHAR(500) NULL,
    ADD COLUMN `sourceKey` VARCHAR(180) NULL,
    ADD COLUMN `surveyYear` INTEGER NULL;

-- CreateTable
CREATE TABLE `census_review` (
    `id` VARCHAR(191) NOT NULL,
    `individualRevisionId` VARCHAR(191) NULL,
    `establishmentRevisionId` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `note` VARCHAR(1000) NULL,
    `requestKey` VARCHAR(80) NOT NULL,
    `payloadHash` CHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `census_review_individualRevisionId_createdAt_idx`(`individualRevisionId`, `createdAt`),
    INDEX `census_review_establishmentRevisionId_createdAt_idx`(`establishmentRevisionId`, `createdAt`),
    UNIQUE INDEX `census_review_actorId_requestKey_key`(`actorId`, `requestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `census_staff_scope` (
    `userId` VARCHAR(191) NOT NULL,
    `barangaysJson` TEXT NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `census_assistance_roster` (
    `barangay` VARCHAR(100) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `confirmedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`barangay`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `census_assistance_member` (
    `barangay` VARCHAR(100) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`barangay`, `staffId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `census_audit` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `target` VARCHAR(191) NOT NULL,
    `detailsJson` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `census_audit_action_target_createdAt_idx`(`action`, `target`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `census_source_record` (
    `identityKey` CHAR(64) NOT NULL,
    `sourceKey` VARCHAR(180) NOT NULL,
    `surveyYear` INTEGER NOT NULL,
    `sourceRef` VARCHAR(191) NOT NULL,
    `contentHash` CHAR(64) NOT NULL,
    `conflicted` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`identityKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `census_import_lock` (
    `id` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `census_review` ADD CONSTRAINT `census_review_individualRevisionId_fkey` FOREIGN KEY (`individualRevisionId`) REFERENCES `community_survey_revision`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `census_review` ADD CONSTRAINT `census_review_establishmentRevisionId_fkey` FOREIGN KEY (`establishmentRevisionId`) REFERENCES `establishment_revision`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `census_review` ADD CONSTRAINT `census_review_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `census_staff_scope` ADD CONSTRAINT `census_staff_scope_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `census_assistance_member` ADD CONSTRAINT `census_assistance_member_barangay_fkey` FOREIGN KEY (`barangay`) REFERENCES `census_assistance_roster`(`barangay`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `census_assistance_member` ADD CONSTRAINT `census_assistance_member_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `census_audit` ADD CONSTRAINT `census_audit_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

