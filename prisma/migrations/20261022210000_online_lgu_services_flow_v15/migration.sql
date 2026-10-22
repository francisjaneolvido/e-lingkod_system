-- V15: keep staff recommendation and actual release/delivery notes separate.
-- Additive only; no existing Online LGU Services data is removed.
ALTER TABLE `service_request`
  ADD COLUMN `releaseNote` TEXT NULL AFTER `staffRecommendation`;
