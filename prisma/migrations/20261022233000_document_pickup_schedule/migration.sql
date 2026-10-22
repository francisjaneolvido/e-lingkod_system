-- Additive migration only: preserves all existing service requests and interview/inspection appointments.
CREATE TABLE `service_pickup_slot` (
  `id` VARCHAR(191) NOT NULL,
  `requestId` VARCHAR(191) NOT NULL,
  `scheduledAt` DATETIME(3) NOT NULL,
  `location` VARCHAR(220) NOT NULL,
  `instructions` TEXT NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PROPOSED',
  `proposedById` VARCHAR(191) NOT NULL,
  `citizenNote` TEXT NULL,
  `claimantName` VARCHAR(180) NULL,
  `confirmedAt` DATETIME(3) NULL,
  `claimedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `service_pickup_slot_requestId_status_scheduledAt_idx`(`requestId`, `status`, `scheduledAt`),
  INDEX `service_pickup_slot_status_scheduledAt_idx`(`status`, `scheduledAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `service_pickup_slot` ADD CONSTRAINT `service_pickup_slot_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `service_request`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `service_pickup_slot` ADD CONSTRAINT `service_pickup_slot_proposedById_fkey` FOREIGN KEY (`proposedById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
