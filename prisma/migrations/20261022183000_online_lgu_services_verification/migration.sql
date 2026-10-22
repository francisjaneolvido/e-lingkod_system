-- V14 additive verification metadata for Online LGU Services. Existing uploads remain usable and start as PENDING.
ALTER TABLE `service_request`
  ADD COLUMN `releaseApprovedAt` DATETIME(3) NULL,
  ADD COLUMN `releaseApprovedById` VARCHAR(191) NULL;
CREATE INDEX `service_request_releaseApprovedById_idx` ON `service_request` (`releaseApprovedById`);
ALTER TABLE `service_request` ADD CONSTRAINT `service_request_releaseApprovedById_fkey`
  FOREIGN KEY (`releaseApprovedById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `service_request_document`
  ADD COLUMN `verificationStatus` VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `verificationNote` TEXT NULL,
  ADD COLUMN `verifiedById` VARCHAR(191) NULL,
  ADD COLUMN `verifiedAt` DATETIME(3) NULL;

CREATE INDEX `service_request_document_verificationStatus_uploadedAt_idx` ON `service_request_document` (`verificationStatus`, `uploadedAt`);
CREATE INDEX `service_request_document_verifiedById_idx` ON `service_request_document` (`verifiedById`);
ALTER TABLE `service_request_document` ADD CONSTRAINT `service_request_document_verifiedById_fkey`
  FOREIGN KEY (`verifiedById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
