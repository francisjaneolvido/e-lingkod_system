ALTER TABLE `civic_report` ADD COLUMN `locationCapturedAt` DATETIME(3) NULL;
ALTER TABLE `report_photo` ADD COLUMN `validationStatus` VARCHAR(12) NOT NULL DEFAULT 'PENDING', ADD COLUMN `validationScore` DOUBLE NULL, ADD COLUMN `detectedContent` VARCHAR(500) NULL, ADD COLUMN `validationFeedback` VARCHAR(500) NULL, ADD COLUMN `validatedAt` DATETIME(3) NULL;
