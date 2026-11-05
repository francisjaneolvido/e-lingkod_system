import assert from 'node:assert/strict';
import {test} from 'node:test';
import {existsSync} from 'node:fs';
import {loadServerTypescript} from './helpers/load-typescript.mjs';
loadServerTypescript();
const modulePath = '../src/features/identity/policy.ts';
const policy = existsSync(new URL(modulePath, import.meta.url)) ? await import(modulePath) : {};

test('Citizen access requires explicit legacy or approved identity, independently of email verification', () => {
  assert.equal(typeof policy.hasCitizenFeatureAccess, 'function', 'identity access policy must exist');
  for (const identityStatus of ['SUBMISSION_REQUIRED', 'PENDING', 'CORRECTIONS_REQUIRED', 'REJECTED', undefined, 'forged']) {
    assert.equal(policy.hasCitizenFeatureAccess({role:'CITIZEN', identityStatus, emailVerified:true}), false);
  }
  for (const identityStatus of ['LEGACY','APPROVED']) assert.equal(policy.hasCitizenFeatureAccess({role:'CITIZEN', identityStatus, emailVerified:false}), true);
  for (const role of ['ADMIN','STAFF']) assert.equal(policy.hasCitizenFeatureAccess({role, identityStatus:'SUBMISSION_REQUIRED'}), true);
});

test('only pending exact revisions can be reviewed; correction and rejection require resubmission', () => {
  assert.equal(typeof policy.canReviewIdentity, 'function', 'identity review policy must exist');
  assert.equal(policy.canReviewIdentity('PENDING', 2, 2), true);
  assert.equal(policy.canReviewIdentity('PENDING', 3, 2), false);
  for (const state of ['SUBMISSION_REQUIRED','CORRECTIONS_REQUIRED','REJECTED','APPROVED','LEGACY']) assert.equal(policy.canReviewIdentity(state, 2, 2), false);
});

test('new documents are accepted only while access is limited; approvals cannot transfer to different documents', () => {
  assert.equal(typeof policy.canSubmitIdentity, 'function', 'identity submission policy must exist');
  for (const status of ['SUBMISSION_REQUIRED','CORRECTIONS_REQUIRED','REJECTED']) assert.equal(policy.canSubmitIdentity(status), true);
  for (const status of ['PENDING','APPROVED','LEGACY',undefined]) assert.equal(policy.canSubmitIdentity(status), false);
});
