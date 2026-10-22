-- V16 is additive: shared notifications, fair workload assignment and configurable service definitions.
CREATE TABLE `notification` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `module` VARCHAR(32) NOT NULL,
  `type` VARCHAR(48) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `message` TEXT NOT NULL,
  `href` VARCHAR(500) NULL,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `notification_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
  INDEX `notification_module_createdAt_idx`(`module`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `work_assignment` (
  `id` VARCHAR(191) NOT NULL,
  `module` VARCHAR(32) NOT NULL,
  `entityType` VARCHAR(40) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `department` VARCHAR(150) NULL,
  `assignedStaffId` VARCHAR(191) NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'OPEN',
  `claimDeadline` DATETIME(3) NULL,
  `acceptedAt` DATETIME(3) NULL,
  `declinedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `attemptCount` INTEGER NOT NULL DEFAULT 0,
  `lastOfferedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `work_assignment_module_entityType_entityId_key`(`module`, `entityType`, `entityId`),
  INDEX `work_assignment_assignedStaffId_status_claimDeadline_idx`(`assignedStaffId`, `status`, `claimDeadline`),
  INDEX `work_assignment_module_department_status_createdAt_idx`(`module`, `department`, `status`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `work_assignment_assignedStaffId_fkey` FOREIGN KEY (`assignedStaffId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `service_definition` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(80) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `shortTitle` VARCHAR(100) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `processingOffice` VARCHAR(150) NOT NULL,
  `departmentCode` VARCHAR(80) NOT NULL,
  `description` TEXT NOT NULL,
  `actionLabel` VARCHAR(100) NOT NULL,
  `intakeMode` VARCHAR(20) NOT NULL,
  `appointmentMode` VARCHAR(20) NOT NULL,
  `completionMode` VARCHAR(20) NOT NULL,
  `purposeLabel` VARCHAR(160) NOT NULL,
  `purposePlaceholder` TEXT NULL,
  `feeText` VARCHAR(160) NULL,
  `processingTimeText` VARCHAR(160) NULL,
  `assignmentStrategy` VARCHAR(30) NOT NULL DEFAULT 'AUTO_BALANCE',
  `acceptTimeoutMinutes` INTEGER NOT NULL DEFAULT 120,
  `published` BOOLEAN NOT NULL DEFAULT false,
  `configJson` LONGTEXT NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `service_definition_key_key`(`key`),
  INDEX `service_definition_published_category_title_idx`(`published`, `category`, `title`),
  INDEX `service_definition_departmentCode_published_idx`(`departmentCode`, `published`),
  PRIMARY KEY (`id`),
  CONSTRAINT `service_definition_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `service_definition_audit` (
  `id` VARCHAR(191) NOT NULL,
  `serviceDefinitionId` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(40) NOT NULL,
  `snapshotJson` LONGTEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `service_definition_audit_serviceDefinitionId_createdAt_idx`(`serviceDefinitionId`, `createdAt`),
  INDEX `service_definition_audit_actorId_createdAt_idx`(`actorId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `service_definition_audit_serviceDefinitionId_fkey` FOREIGN KEY (`serviceDefinitionId`) REFERENCES `service_definition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `service_definition_audit_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
