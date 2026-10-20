-- Additive migration: creates invitation records only. No existing users are modified.
CREATE TABLE `staff_invitation` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `department` VARCHAR(120) NOT NULL,
    `designation` VARCHAR(120) NOT NULL,
    `modulesJson` TEXT NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `issuedById` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `activatedAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `staff_invitation_email_key`(`email`),
    UNIQUE INDEX `staff_invitation_tokenHash_key`(`tokenHash`),
    INDEX `staff_invitation_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `staff_invitation` ADD CONSTRAINT `staff_invitation_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
