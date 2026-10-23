-- CreateTable
CREATE TABLE `establishment` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `identityKey` CHAR(64) NOT NULL,
    `businessName` VARCHAR(180) NOT NULL,
    `officeType` VARCHAR(20) NOT NULL,
    `street` VARCHAR(220) NOT NULL,
    `barangay` VARCHAR(80) NOT NULL,
    `municipality` VARCHAR(80) NOT NULL,
    `province` VARCHAR(80) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `establishment_ownerId_identityKey_key`(`ownerId`, `identityKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `establishment_survey` (
    `id` VARCHAR(191) NOT NULL,
    `establishmentId` VARCHAR(191) NOT NULL,
    `surveyYear` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `draftJson` LONGTEXT NULL,
    `submittedJson` LONGTEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `establishment_survey_establishmentId_surveyYear_key`(`establishmentId`, `surveyYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `establishment_revision` (
    `id` VARCHAR(191) NOT NULL,
    `surveyId` VARCHAR(191) NOT NULL,
    `revision` INTEGER NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `answersJson` LONGTEXT NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `establishment_revision_surveyId_revision_key`(`surveyId`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `establishment_operation` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `establishmentId` VARCHAR(191) NOT NULL,
    `requestKey` VARCHAR(64) NOT NULL,
    `payloadHash` CHAR(64) NOT NULL,
    `recordVersion` INTEGER NOT NULL,
    `workspaceVersion` INTEGER NOT NULL,
    `revisionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `establishment_operation_establishmentId_idx`(`establishmentId`),
    UNIQUE INDEX `establishment_operation_ownerId_requestKey_key`(`ownerId`, `requestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `establishment` ADD CONSTRAINT `establishment_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `establishment_survey` ADD CONSTRAINT `establishment_survey_establishmentId_fkey` FOREIGN KEY (`establishmentId`) REFERENCES `establishment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `establishment_revision` ADD CONSTRAINT `establishment_revision_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `establishment_survey`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `establishment_revision` ADD CONSTRAINT `establishment_revision_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `establishment_operation` ADD CONSTRAINT `establishment_operation_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `establishment_operation` ADD CONSTRAINT `establishment_operation_establishmentId_fkey` FOREIGN KEY (`establishmentId`) REFERENCES `establishment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
