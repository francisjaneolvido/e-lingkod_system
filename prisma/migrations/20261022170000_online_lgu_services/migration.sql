CREATE TABLE `service_request` (
  `id` VARCHAR(191) NOT NULL,
  `trackingId` VARCHAR(48) NOT NULL,
  `serviceKey` VARCHAR(80) NOT NULL,
  `serviceTitle` VARCHAR(180) NOT NULL,
  `requesterId` VARCHAR(191) NOT NULL,
  `purpose` TEXT NOT NULL,
  `formDataJson` LONGTEXT NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  `assignedDepartment` VARCHAR(150) NULL,
  `assignedStaffId` VARCHAR(191) NULL,
  `staffRecommendation` TEXT NULL,
  `finalNote` TEXT NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `submittedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `service_request_trackingId_key`(`trackingId`),
  INDEX `service_request_requesterId_createdAt_idx`(`requesterId`, `createdAt`),
  INDEX `service_request_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `service_request_assignedDepartment_assignedStaffId_status_idx`(`assignedDepartment`, `assignedStaffId`, `status`),
  INDEX `service_request_serviceKey_status_idx`(`serviceKey`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `service_request_document` (
  `id` VARCHAR(191) NOT NULL,
  `requestId` VARCHAR(191) NOT NULL,
  `requirementKey` VARCHAR(100) NOT NULL,
  `requirementLabel` VARCHAR(180) NOT NULL,
  `fileName` VARCHAR(220) NOT NULL,
  `mimeType` VARCHAR(80) NOT NULL,
  `byteSize` INTEGER NOT NULL,
  `data` MEDIUMBLOB NOT NULL,
  `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `service_request_document_requestId_requirementKey_idx`(`requestId`, `requirementKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `service_request_event` (
  `id` VARCHAR(191) NOT NULL,
  `requestId` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `action` VARCHAR(50) NOT NULL,
  `status` VARCHAR(40) NOT NULL,
  `note` TEXT NOT NULL,
  `visibleToCitizen` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `service_request_event_requestId_createdAt_idx`(`requestId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `service_appointment` (
  `id` VARCHAR(191) NOT NULL,
  `requestId` VARCHAR(191) NOT NULL,
  `scheduledAt` DATETIME(3) NOT NULL,
  `location` VARCHAR(220) NOT NULL,
  `agenda` TEXT NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PROPOSED',
  `proposedById` VARCHAR(191) NOT NULL,
  `citizenNote` TEXT NULL,
  `staffNote` TEXT NULL,
  `confirmedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `service_appointment_requestId_scheduledAt_idx`(`requestId`, `scheduledAt`),
  INDEX `service_appointment_status_scheduledAt_idx`(`status`, `scheduledAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `service_request` ADD CONSTRAINT `service_request_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `service_request` ADD CONSTRAINT `service_request_assignedStaffId_fkey` FOREIGN KEY (`assignedStaffId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `service_request_document` ADD CONSTRAINT `service_request_document_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `service_request`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `service_request_event` ADD CONSTRAINT `service_request_event_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `service_request`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `service_request_event` ADD CONSTRAINT `service_request_event_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `service_appointment` ADD CONSTRAINT `service_appointment_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `service_request`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `service_appointment` ADD CONSTRAINT `service_appointment_proposedById_fkey` FOREIGN KEY (`proposedById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
