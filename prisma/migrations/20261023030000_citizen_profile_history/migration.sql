-- Additive B1 migration. Existing application records are retained.
ALTER TABLE `community_survey`
  ADD COLUMN `employmentHistory` TEXT NULL,
  ADD COLUMN `overseasExperience` VARCHAR(20) NULL,
  ADD COLUMN `qualificationsJson` TEXT NOT NULL DEFAULT ('[]'),
  ADD COLUMN `completedTrainingJson` TEXT NOT NULL DEFAULT ('[]');

CREATE TABLE `community_survey_workspace` (
  `id` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL,
  `surveyYear` INTEGER NOT NULL, `version` INTEGER NOT NULL DEFAULT 0,
  `draftJson` LONGTEXT NULL, `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `community_survey_workspace_userId_surveyYear_key` (`userId`, `surveyYear`),
  CONSTRAINT `community_survey_workspace_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `community_survey_revision` (
  `id` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL, `actorId` VARCHAR(191) NOT NULL,
  `surveyYear` INTEGER NOT NULL, `revision` INTEGER NOT NULL, `action` VARCHAR(20) NOT NULL,
  `schemaVersion` INTEGER NOT NULL DEFAULT 2, `requestKey` VARCHAR(80) NOT NULL,
  `payloadHash` VARCHAR(64) NOT NULL, `resultVersion` INTEGER NOT NULL,
  `answersJson` LONGTEXT NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `community_survey_revision_userId_requestKey_key` (`userId`, `requestKey`),
  UNIQUE INDEX `community_survey_revision_userId_surveyYear_revision_key` (`userId`, `surveyYear`, `revision`),
  INDEX `community_survey_revision_userId_surveyYear_createdAt_idx` (`userId`, `surveyYear`, `createdAt`),
  CONSTRAINT `community_survey_revision_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `community_survey_revision_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `citizen_profile_consent` (
  `userId` VARCHAR(191) NOT NULL, `matching` BOOLEAN NOT NULL DEFAULT false,
  `programs` BOOLEAN NOT NULL DEFAULT false, `version` INTEGER NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`userId`),
  CONSTRAINT `citizen_profile_consent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill only the one submitted revision actually present; never invent older history.
INSERT INTO `community_survey_workspace` (`id`, `userId`, `surveyYear`, `version`, `draftJson`, `updatedAt`)
SELECT CONCAT('legacy_ws_', SHA2(CONCAT(s.`userId`, ':', s.`surveyYear`), 256)), s.`userId`, s.`surveyYear`,
  IF(s.`status` = 'SUBMITTED', 1, 0), IF(s.`status` = 'DRAFT', JSON_OBJECT(
  'surveyYear', s.`surveyYear`,
  'status', s.`status`,
  'barangay', s.`barangay`,
  'ageGroup', s.`ageGroup`,
  'sex', s.`sex`,
  'civilStatus', s.`civilStatus`,
  'pwdStatus', s.`pwdStatus`,
  'householdSize', s.`householdSize`,
  'currentlyStudying', s.`currentlyStudying`,
  'educationLevel', s.`educationLevel`,
  'employmentStatus', s.`employmentStatus`,
  'occupation', s.`occupation`,
  'industry', s.`industry`,
  'workArrangement', s.`workArrangement`,
  'workLocationScope', s.`workLocationScope`,
  'employmentLength', s.`employmentLength`,
  'workRelatedToEducation', s.`workRelatedToEducation`,
  'interestedNewWork', s.`interestedNewWork`,
  'skillsJson', s.`skillsJson`,
  'skillLevelsJson', s.`skillLevelsJson`,
  'trainingInterest', s.`trainingInterest`,
  'trainingCategoriesJson', s.`trainingCategoriesJson`,
  'trainingProgramsJson', s.`trainingProgramsJson`,
  'trainingReason', s.`trainingReason`,
  'trainingBarriersJson', s.`trainingBarriersJson`,
  'employmentBarriersJson', s.`employmentBarriersJson`,
  'preferredOccupationsJson', s.`preferredOccupationsJson`,
  'preferredIndustry', s.`preferredIndustry`,
  'preferredWorkArrangement', s.`preferredWorkArrangement`,
  'preferredWorkLocation', s.`preferredWorkLocation`,
  'willingOutsideMunicipality', s.`willingOutsideMunicipality`,
  'interestedGovPrograms', s.`interestedGovPrograms`,
  'interestedLivelihood', s.`interestedLivelihood`,
  'interestedEntrepreneurship', s.`interestedEntrepreneurship`,
  'businessType', s.`businessType`,
  'businessSector', s.`businessSector`,
  'businessLocationType', s.`businessLocationType`,
  'businessSize', s.`businessSize`,
  'businessRegistered', s.`businessRegistered`,
  'businessYears', s.`businessYears`,
  'businessChallengesJson', s.`businessChallengesJson`,
  'businessSupportJson', s.`businessSupportJson`,
  'programAwareness', s.`programAwareness`,
  'informationAccess', s.`informationAccess`,
  'participatedConsultation', s.`participatedConsultation`,
  'inclusivePlanning', s.`inclusivePlanning`,
  'priorityProgramsJson', s.`priorityProgramsJson`,
  'publicServiceBarriersJson', s.`publicServiceBarriersJson`,
  'serviceSatisfaction', s.`serviceSatisfaction`,
  'feedback', s.`feedback`,
  'consentAggregated', s.`consentAggregated`,
  'consentOpportunityRecommendations', s.`consentOpportunityRecommendations`,
  'consentProgramRecommendations', s.`consentProgramRecommendations`,
  'employmentHistory', s.`employmentHistory`,
  'overseasExperience', s.`overseasExperience`,
  'qualificationsJson', s.`qualificationsJson`,
  'completedTrainingJson', s.`completedTrainingJson`
), NULL), s.`updatedAt`
FROM `community_survey` s;

INSERT INTO `community_survey_revision` (`id`, `userId`, `actorId`, `surveyYear`, `revision`, `action`, `schemaVersion`, `requestKey`, `payloadHash`, `resultVersion`, `answersJson`, `createdAt`)
SELECT CONCAT('legacy_rev_', SHA2(s.`id`, 256)), s.`userId`, s.`userId`, s.`surveyYear`, 1, 'SUBMITTED', 1,
  CONCAT('legacy_', SHA2(s.`id`, 256)), SHA2(s.`id`, 256), 1, JSON_OBJECT(
  'surveyYear', s.`surveyYear`,
  'status', s.`status`,
  'barangay', s.`barangay`,
  'ageGroup', s.`ageGroup`,
  'sex', s.`sex`,
  'civilStatus', s.`civilStatus`,
  'pwdStatus', s.`pwdStatus`,
  'householdSize', s.`householdSize`,
  'currentlyStudying', s.`currentlyStudying`,
  'educationLevel', s.`educationLevel`,
  'employmentStatus', s.`employmentStatus`,
  'occupation', s.`occupation`,
  'industry', s.`industry`,
  'workArrangement', s.`workArrangement`,
  'workLocationScope', s.`workLocationScope`,
  'employmentLength', s.`employmentLength`,
  'workRelatedToEducation', s.`workRelatedToEducation`,
  'interestedNewWork', s.`interestedNewWork`,
  'skillsJson', s.`skillsJson`,
  'skillLevelsJson', s.`skillLevelsJson`,
  'trainingInterest', s.`trainingInterest`,
  'trainingCategoriesJson', s.`trainingCategoriesJson`,
  'trainingProgramsJson', s.`trainingProgramsJson`,
  'trainingReason', s.`trainingReason`,
  'trainingBarriersJson', s.`trainingBarriersJson`,
  'employmentBarriersJson', s.`employmentBarriersJson`,
  'preferredOccupationsJson', s.`preferredOccupationsJson`,
  'preferredIndustry', s.`preferredIndustry`,
  'preferredWorkArrangement', s.`preferredWorkArrangement`,
  'preferredWorkLocation', s.`preferredWorkLocation`,
  'willingOutsideMunicipality', s.`willingOutsideMunicipality`,
  'interestedGovPrograms', s.`interestedGovPrograms`,
  'interestedLivelihood', s.`interestedLivelihood`,
  'interestedEntrepreneurship', s.`interestedEntrepreneurship`,
  'businessType', s.`businessType`,
  'businessSector', s.`businessSector`,
  'businessLocationType', s.`businessLocationType`,
  'businessSize', s.`businessSize`,
  'businessRegistered', s.`businessRegistered`,
  'businessYears', s.`businessYears`,
  'businessChallengesJson', s.`businessChallengesJson`,
  'businessSupportJson', s.`businessSupportJson`,
  'programAwareness', s.`programAwareness`,
  'informationAccess', s.`informationAccess`,
  'participatedConsultation', s.`participatedConsultation`,
  'inclusivePlanning', s.`inclusivePlanning`,
  'priorityProgramsJson', s.`priorityProgramsJson`,
  'publicServiceBarriersJson', s.`publicServiceBarriersJson`,
  'serviceSatisfaction', s.`serviceSatisfaction`,
  'feedback', s.`feedback`,
  'consentAggregated', s.`consentAggregated`,
  'consentOpportunityRecommendations', s.`consentOpportunityRecommendations`,
  'consentProgramRecommendations', s.`consentProgramRecommendations`,
  'employmentHistory', s.`employmentHistory`,
  'overseasExperience', s.`overseasExperience`,
  'qualificationsJson', s.`qualificationsJson`,
  'completedTrainingJson', s.`completedTrainingJson`
), COALESCE(s.`submittedAt`, s.`updatedAt`)
FROM `community_survey` s WHERE s.`status` = 'SUBMITTED';

-- Effective consent starts with the latest submitted annual choice, never an older grant.
INSERT INTO `citizen_profile_consent` (`userId`, `matching`, `programs`, `version`, `updatedAt`)
SELECT s.`userId`, s.`consentOpportunityRecommendations`, s.`consentProgramRecommendations`, 0, s.`updatedAt`
FROM `community_survey` s
WHERE s.`status` = 'SUBMITTED' AND NOT EXISTS (
  SELECT 1 FROM `community_survey` newer
  WHERE newer.`userId` = s.`userId` AND newer.`status` = 'SUBMITTED' AND newer.`surveyYear` > s.`surveyYear`
);
-- Preserve existing explicitly created legacy optional profiles only if no survey choice overrides them.
INSERT INTO `citizen_profile_consent` (`userId`, `matching`, `programs`, `version`, `updatedAt`)
SELECT p.`userId`, true, false, 0, p.`updatedAt` FROM `jobseeker_profile` p
WHERE NOT EXISTS (SELECT 1 FROM `citizen_profile_consent` c WHERE c.`userId` = p.`userId`);

