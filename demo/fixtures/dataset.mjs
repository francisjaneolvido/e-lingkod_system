// Synthetic, reserved-domain fixtures. Reference year never follows wall clock.
export const datasetVersion = 'elb-demo-2026-v1';
export const referenceYear = 2026;
const firstNames = ['Amihan', 'Basilio', 'Clara', 'Dalisay', 'Emilio', 'Felicity', 'Gabriel', 'Hiraya', 'Isabel', 'Joaquin', 'Karina', 'Leonardo', 'Marisol', 'Nicolas', 'Olivia', 'Paolo', 'Rafael', 'Sofia', 'Teresa', 'Vicente'];
const lastNames = ['Halimbawa', 'Luntian', 'Malaya', 'Sinag', 'Dalisay', 'Liwanag'];
export const accounts = Array.from({ length: 108 }, (_, index) => {
  const group = index < 80 ? 'individual' : index < 100 ? 'establishment' : index < 104 ? 'admin' : 'staff';
  const n = index < 80 ? index : index < 100 ? index - 80 : index < 104 ? index - 100 : index - 104;
  return { key: `${group}-${String(n + 1).padStart(2, '0')}`, index: n, group, firstName: firstNames[index % 20], lastName: lastNames[Math.floor(index / 20)], middleInitial: '', hasNoMiddleName: true,
    email: `${group}.${String(n + 1).padStart(2, '0')}@example.test`, password: `ElbDemo2026!${String(index + 1).padStart(3, '0')}`, phoneNumber: `+63900${String(index + 1).padStart(7, '0')}`,
    role: group === 'admin' ? 'ADMIN' : group === 'staff' ? 'STAFF' : 'CITIZEN',
    scenario: group === 'individual' ? n < 60 ? 'submitted' : n < 68 ? 'later-draft' : n < 74 ? 'incomplete-draft' : 'withdrawn' : group === 'establishment' ? n < 14 ? 'submitted' : n < 17 ? 'later-draft' : n === 17 ? 'draft-only' : 'withdrawn' : group,
  };
});
export const staffGrants = [
  { department: 'PESO', designation: 'Demo workforce analyst', modules: ['COMMUNITY_DATA', 'JOBS'] },
  { department: 'MSWDO', designation: 'Demo social data officer', modules: ['COMMUNITY_DATA'] },
  { department: 'PESO', designation: 'Demo opportunity encoder', modules: ['JOBS'] },
  { department: 'Municipal Engineering Office', designation: 'Demo project officer', modules: ['PROJECTS'] },
];
export function individualAnswers(index, barangays, skills, year = referenceYear) {
  const employment = ['EMPLOYED_FULL_TIME', 'EMPLOYED_PART_TIME', 'SELF_EMPLOYED', 'FREELANCER', 'INFORMAL_WORKER', 'SEASONAL_WORKER', 'OFW', 'FORMER_OFW', 'UNEMPLOYED_LOOKING', 'UNEMPLOYED_NOT_LOOKING', 'STUDENT', 'HOMEMAKER', 'RETIRED', 'BUSINESS_OWNER', 'OTHER'];
  const employmentStatus = employment[index % employment.length];
  return { surveyYear: year, status: 'SUBMITTED', barangay: barangays[index % barangays.length], ageGroup: employmentStatus === 'RETIRED' ? '65+' : ['18-24', '25-34', '35-44', '45-54', '55-64'][index % 5], educationLevel: ['ELEMENTARY', 'HIGH_SCHOOL', 'SENIOR_HIGH', 'VOCATIONAL', 'COLLEGE', 'POSTGRADUATE'][index % 6], employmentStatus,
    sex: index % 2 ? 'Female' : 'Male', civilStatus: index % 3 ? 'Single' : 'Married', pwdStatus: index % 9 ? 'No' : 'Yes', householdSize: index % 7 ? 1 + index % 6 : null,
    currentlyStudying: employmentStatus === 'STUDENT', occupation: ['Office assistant', 'Cook', 'Farmer', 'Technician', 'Caregiver', 'Designer'][index % 6], industry: ['Services', 'Food', 'Agriculture', 'Technology'][index % 4],
    skills: [skills[index % skills.length], skills[(index + 7) % skills.length]], qualifications: index % 3 ? [] : ['Synthetic TESDA training completion'], completedTraining: index % 4 ? [] : ['Demo livelihood orientation'],
    overseasExperience: employmentStatus === 'OFW' ? 'CURRENT' : employmentStatus === 'FORMER_OFW' ? 'FORMER' : 'NEVER', employmentHistory: 'Synthetic demonstration history; no real employment claims.',
    interestedNewWork: index % 3 !== 0, trainingInterest: ['YES', 'MAYBE', 'NO', 'NOT_NOW'][index % 4], trainingCategories: ['Livelihood'], trainingPrograms: index % 3 ? [] : ['Demo skills orientation'], interestedGovPrograms: index % 2 === 0, interestedLivelihood: index % 3 === 0, interestedEntrepreneurship: index % 5 === 0,
    businessType: employmentStatus === 'BUSINESS_OWNER' ? 'Synthetic household enterprise' : null, businessRegistered: employmentStatus === 'BUSINESS_OWNER' ? 'Unknown' : null,
    consentAggregated: true, consentOpportunityRecommendations: index % 4 !== 0, consentProgramRecommendations: index % 3 !== 0, feedback: '[DEMO] Synthetic survey, not a real person.' };
}
export function establishmentAnswers(index, barangays, industries, year = referenceYear) {
  const total = index % 5 === 0 ? null : 4 + index * 3;
  return { surveyYear: year, businessName: `[DEMO] ${['Sinag Farm', 'Luntian Foods', 'Malaya Workshop', 'Hiraya Services', 'Liwanag Cooperative'][index % 5]} ${String(index + 1).padStart(2, '0')}`, officeType: index % 4 ? 'MAIN' : 'BRANCH', street: `Demo Building ${index + 1}, Synthetic Street`, barangay: barangays[index % barangays.length], municipality: 'Los Baños', province: 'Laguna',
    employerType: index % 7 ? 'PRIVATE' : 'PUBLIC', organizationType: ['SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'CORPORATION', 'COOPERATIVE', 'GOVERNMENT', 'NONPROFIT'][index % 6], industry: industries[index % industries.length].value, productsServices: 'Synthetic local products and services for team demonstration only.', operatingStatus: ['OPERATING', 'OPERATING', 'TEMPORARILY_CLOSED', 'NOT_YET_OPERATING'][index % 4], marketReach: ['LOCAL', 'NATIONAL', 'INTERNATIONAL', 'MIXED'][index % 4], startYear: 2010 + index % 15, monthsOperated: index % 4 === 3 ? 0 : 12,
    totalWorkers: total, regularWorkers: total === null ? 2 : total - 2, nonRegularWorkers: total === null ? null : 2, partTimeWorkers: total === null ? null : 1,
    contactName: 'Demo Authorized Representative', contactPosition: 'Demo liaison', contactEmail: `establishment.${String(index + 1).padStart(2, '0')}@example.test`, contactPhone: '', workforceNotes: '[DEMO] Organizational headcounts; never individual respondents.' };
}
export const vacancyScenarios = Array.from({ length: 28 }, (_, i) => ({ key: `vacancy-${i + 1}`, index: i, status: i < 16 ? 'PUBLISHED' : i < 18 ? 'DRAFT' : i < 22 ? 'PENDING_REVIEW' : i < 24 ? 'RETURNED' : i < 26 ? 'CLOSED' : 'FILLED',
  futureB5: { salary: i % 2 ? 18000 + i * 500 : null, currency: 'PHP', payBasis: ['MONTHLY', 'DAILY', 'HOURLY'][i % 3], experienceYears: i % 4, certification: i % 3 ? null : 'Synthetic NC II scenario', supportedNow: false } }));
