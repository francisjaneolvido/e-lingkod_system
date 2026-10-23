-- Retain confirmation identity separately from the actual collection claimant.
ALTER TABLE service_pickup_slot ADD COLUMN confirmedClaimantName VARCHAR(180) NULL;

-- Only active CONFIRMED legacy rows have an authoritative confirmation name.
-- Old CLAIMED rows retain their actual claimantName; the earlier confirmation
-- was overwritten by old application code and must not be fabricated.
UPDATE service_pickup_slot SET confirmedClaimantName = claimantName WHERE status = 'CONFIRMED';
