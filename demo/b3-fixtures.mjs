// Additive versioned fixtures: never reset the v1 dataset or passwords.
export const b3FixtureVersion = 'elb-b3-fixtures-v1';
export const assistanceAssignments = [
  { barangay: 'Bambang', staffEmails: ['staff.01@example.test', 'staff.02@example.test'] },
  { barangay: 'Batong Malake', staffEmails: [] },
  { barangay: 'Maahas', staffEmails: ['staff.04@example.test'] },
];
export const censusImportFixture = {
  table: { headers: ['Reference', 'Barangay', 'Age group', 'Education', 'Employment'], fileType: 'CSV', sourceFilename: 'demo-b3-source-records.csv', rows: [
    ['DEMO-B3-A', 'Bambang', '25-34', 'college', 'employed'],
    ['DEMO-B3-A', 'Bambang', '25-34', 'college', 'employed'],
    ['DEMO-B3-B', 'Bambang', '25-34', 'college', 'employed'],
    ['DEMO-B3-C', 'Maahas', '35-44', 'vocational', 'unemployed'],
    ['DEMO-B3-C', 'Maahas', '45-54', 'vocational', 'unemployed'],
    ['DEMO-B3-D', 'Bambang', 'invalid-age', 'college', 'employed'],
    ['', 'Bambang', '', '', ''],
  ] },
  mapping: { 0: 'participantRef', 1: 'barangay', 2: 'ageGroup', 3: 'educationLevel', 4: 'employmentStatus' },
  meta: { source: 'DEMO-B3-SOURCE', surveyYear: 2026, activityName: '[DEMO] B3 source-record import scenarios', activityType: 'SYNTHETIC', implementingOffice: 'PESO', intendedUse: 'INTERNAL_STATISTICS' },
};
