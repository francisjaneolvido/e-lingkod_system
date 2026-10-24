-- Preserve legacy unknown years. New anonymous imports require explicit source context.
ALTER TABLE `spes_import_batch` ADD COLUMN `surveyYear` INTEGER NULL;
ALTER TABLE `spes_survey_record` ADD COLUMN `originalRowNumber` INTEGER NULL;
