-- Remove only the forbidden ignored-column key; retain permitted analytical provenance.
UPDATE `community_import_record`
SET `rawJson` = CASE WHEN JSON_VALID(`rawJson`) THEN JSON_REMOVE(`rawJson`, '$.IGNORE') ELSE `rawJson` END
WHERE JSON_VALID(`rawJson`) AND JSON_CONTAINS_PATH(`rawJson`, 'one', '$.IGNORE');
