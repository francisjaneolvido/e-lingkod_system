-- Preserve existing compensation/requirements as unknown, never invent pay.
ALTER TABLE `job_opportunity`
  ADD COLUMN `occupationCategory` VARCHAR(80) NULL,
  ADD COLUMN `employmentSector` VARCHAR(30) NULL,
  ADD COLUMN `workArrangement` VARCHAR(20) NULL,
  ADD COLUMN `experienceLevel` VARCHAR(30) NULL,
  ADD COLUMN `payMin` DECIMAL(12,2) NULL,
  ADD COLUMN `payMax` DECIMAL(12,2) NULL,
  ADD COLUMN `payCurrency` VARCHAR(3) NULL,
  ADD COLUMN `payBasis` VARCHAR(10) NULL,
  ADD COLUMN `negotiable` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `certificationsJson` TEXT NULL,
  ADD COLUMN `isDemo` BOOLEAN NOT NULL DEFAULT false;

-- Only the explicit existing demonstration label establishes this marker.
UPDATE `job_opportunity` SET `isDemo` = true
WHERE BINARY LEFT(`title`,6) = '[DEMO]' OR BINARY LEFT(`employer`,6) = '[DEMO]';

CREATE TABLE job_mutation (
 id VARCHAR(191) NOT NULL,actorId VARCHAR(191) NOT NULL,requestKey VARCHAR(128) NOT NULL,payloadHash CHAR(64) NOT NULL,jobId VARCHAR(191) NOT NULL,resultJson LONGTEXT NOT NULL,createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(id),UNIQUE KEY job_mutation_actorId_requestKey_key(actorId,requestKey),
 CONSTRAINT job_mutation_actor_fkey FOREIGN KEY(actorId) REFERENCES user(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT job_mutation_job_fkey FOREIGN KEY(jobId) REFERENCES job_opportunity(id) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE job_recommendation (
 id VARCHAR(191) NOT NULL,userId VARCHAR(191) NOT NULL,jobId VARCHAR(191) NOT NULL,publicationVersion INTEGER NOT NULL,notificationId VARCHAR(191) NOT NULL,createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(id),UNIQUE KEY job_recommendation_userId_jobId_publicationVersion_key(userId,jobId,publicationVersion),UNIQUE KEY job_recommendation_notificationId_key(notificationId),
 CONSTRAINT job_recommendation_user_fkey FOREIGN KEY(userId) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT job_recommendation_job_fkey FOREIGN KEY(jobId) REFERENCES job_opportunity(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT job_recommendation_notification_fkey FOREIGN KEY(notificationId) REFERENCES notification(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
