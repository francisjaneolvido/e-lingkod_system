-- Safe additive migration. Existing report history remains public by default.
ALTER TABLE `civic_report`
  ADD COLUMN `assignedStaffId` VARCHAR(191) NULL,
  ADD COLUMN `priority` ENUM('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL';
CREATE INDEX `civic_report_assignedOffice_assignedStaffId_status_idx`
  ON `civic_report` (`assignedOffice`, `assignedStaffId`, `status`);
CREATE INDEX `civic_report_priority_createdAt_idx`
  ON `civic_report` (`priority`, `createdAt`);
ALTER TABLE `civic_report`
  ADD CONSTRAINT `civic_report_assignedStaffId_fkey`
  FOREIGN KEY (`assignedStaffId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `report_update`
  ADD COLUMN `visibility` ENUM('PUBLIC','INTERNAL') NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN `action` VARCHAR(24) NOT NULL DEFAULT 'STATUS',
  ADD COLUMN `priority` ENUM('LOW','NORMAL','HIGH','URGENT') NULL,
  ADD COLUMN `assignedStaffId` VARCHAR(191) NULL;
