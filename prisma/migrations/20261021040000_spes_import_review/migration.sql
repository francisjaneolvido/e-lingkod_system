-- V10.4A: additive, preserves all existing survey records and imports.
ALTER TABLE `spes_import_batch`
  ADD COLUMN `datasetKind` VARCHAR(20) NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN `fingerprint` VARCHAR(64) NULL,
  ADD COLUMN `status` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `voidedAt` DATETIME(3) NULL,
  ADD COLUMN `voidedById` VARCHAR(191) NULL,
  ADD COLUMN `voidReason` VARCHAR(500) NULL;
CREATE UNIQUE INDEX `spes_import_batch_fingerprint_key` ON `spes_import_batch`(`fingerprint`);
CREATE INDEX `spes_import_batch_status_datasetKind_idx` ON `spes_import_batch`(`status`, `datasetKind`);
-- Existing explicitly labeled demo/fictitious sources are categorized as DEMO.
-- All other historical sources stay UNCLASSIFIED rather than being assumed real.
UPDATE `spes_import_batch` SET `datasetKind`='DEMO'
 WHERE LOWER(`sourceLabel`) LIKE '%demo%' OR LOWER(`sourceLabel`) LIKE '%fictional%';
CREATE TABLE `spes_import_event` (
  `id` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(30) NOT NULL,
  `note` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `spes_import_event_batchId_createdAt_idx` (`batchId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `spes_import_event` ADD CONSTRAINT `spes_import_event_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `spes_import_batch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `spes_import_event` ADD CONSTRAINT `spes_import_event_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
