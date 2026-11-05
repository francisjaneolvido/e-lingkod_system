export const IDENTITY_STATES = ['SUBMISSION_REQUIRED', 'PENDING', 'CORRECTIONS_REQUIRED', 'REJECTED', 'APPROVED', 'LEGACY'] as const;
export type IdentityStatus = typeof IDENTITY_STATES[number];

/** Missing or unknown state fails closed. Staff authorization is separate. */
export function hasCitizenFeatureAccess(viewer: {role: string; identityStatus?: string | null}) {
  if (viewer.role === 'ADMIN' || viewer.role === 'STAFF') return true;
  return viewer.role === 'CITIZEN' && (viewer.identityStatus === 'LEGACY' || viewer.identityStatus === 'APPROVED');
}

export function canReviewIdentity(status: string, currentRevision: number, submittedRevision: number) {
  return status === 'PENDING' && currentRevision === submittedRevision;
}

export function canSubmitIdentity(status: string) {
  return ['SUBMISSION_REQUIRED', 'CORRECTIONS_REQUIRED', 'REJECTED'].includes(status);
}
