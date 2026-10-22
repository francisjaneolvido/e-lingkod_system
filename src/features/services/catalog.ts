import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  FileBadge2,
  FileCheck2,
  HeartHandshake,
  Landmark,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type ServiceFieldType = "text" | "textarea" | "select" | "date" | "number";
export type ServiceFieldWidth = "full" | "half" | "third";
export type ServiceValidationRule = "TIN" | "YEAR" | "POSITIVE_INTEGER" | "SENIOR_BIRTHDATE";
export type AppointmentMode = "NONE" | "OPTIONAL" | "INTERVIEW" | "INSPECTION" | "PICKUP";
export type ServiceCondition = { field: string; values: string[] };

export type ServiceField = {
  key: string;
  label: string;
  type: ServiceFieldType;
  section: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  help?: string;
  width?: ServiceFieldWidth;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  validation?: ServiceValidationRule;
  condition?: ServiceCondition;
};

export type ServiceRequirement = {
  key: string;
  label: string;
  required?: boolean;
  help?: string;
  examples?: string;
  condition?: ServiceCondition;
};

export type IntakeMode = "DIRECT" | "PRESCREEN";
export type CompletionMode = "RELEASE" | "SERVICE";
export type ServiceCategory = "Certificates & Clearances" | "Permits & Business" | "Social Assistance";

export type OnlineServiceDefinition = {
  key: string;
  title: string;
  shortTitle: string;
  category: ServiceCategory;
  processingOffice: string;
  description: string;
  actionLabel: string;
  intakeMode: IntakeMode;
  requiresAppointment: boolean;
  appointmentMode: AppointmentMode;
  appointmentPurpose?: string;
  purposeLabel: string;
  purposePlaceholder?: string;
  purposeOptions?: string[];
  prescreenFieldKeys?: string[];
  departmentCode: string;
  departmentAliases: string[];
  completionMode: CompletionMode;
  outcomeLabel: string;
  serviceNotice: string;
  reviewChecklist: string[];
  fields: ServiceField[];
  requirements: ServiceRequirement[];
  icon: LucideIcon;
  accent: string;
};

export type SerializableOnlineServiceDefinition = Omit<OnlineServiceDefinition, "icon">;

export function serviceForClient(service: OnlineServiceDefinition): SerializableOnlineServiceDefinition {
  const { icon: _icon, ...serializable } = service;
  return serializable;
}

const commonIdentity: ServiceRequirement = {
  key: "valid-id",
  label: "Valid government-issued ID or accepted identity document",
  required: true,
  help: "Upload a clear copy. The processing office will confirm which IDs are accepted for the transaction.",
};

export const ONLINE_SERVICES: OnlineServiceDefinition[] = [
  {
    key: "mayors-business-permit",
    title: "Mayor's / Business Permit",
    shortTitle: "Business Permit",
    category: "Permits & Business",
    processingOffice: "Business Permits and Licensing Office (BPLO)",
    description: "Start a new, renewal or amendment request using business details commonly found in LGU unified business application forms.",
    actionLabel: "Start permit request",
    intakeMode: "DIRECT",
    requiresAppointment: false,
    appointmentMode: "OPTIONAL",
    appointmentPurpose: "Assessment, compliance review, inspection or payment validation when required",
    purposeLabel: "What are you filing for?",
    purposePlaceholder: "Briefly state the business permit transaction and any concern the BPLO should know before review.",
    departmentCode: "BPLO",
    departmentAliases: ["BPLO", "BUSINESS PERMITS", "BUSINESS PERMIT", "LICENSING"],
    completionMode: "RELEASE",
    outcomeLabel: "Business permit / official release instruction",
    serviceNotice: "This online intake prepares the request for BPLO review. Fees, inspections and final documentary requirements remain subject to your LGU's current Citizen's Charter and business classification.",
    reviewChecklist: [
      "Business registration details match the uploaded registration document.",
      "Business name, ownership type and operating address are consistent across the request.",
      "Required clearances and proof of occupancy/address are readable and current.",
      "Any assessment, inspection or payment step required by the LGU has been completed before release.",
    ],
    icon: Landmark,
    accent: "bg-[#eaf4fb] text-[#236d99]",
    fields: [
      { key: "transactionType", section: "Application", label: "Transaction type", type: "select", required: true, width: "half", options: ["New business", "Renewal", "Amendment / update"] },
      { key: "businessType", section: "Application", label: "Business organization", type: "select", required: true, width: "half", options: ["Sole proprietorship", "One Person Corporation", "Partnership", "Corporation", "Cooperative", "Other"] },
      { key: "businessName", section: "Business registration", label: "Registered business name", type: "text", required: true, width: "half", minLength: 2, maxLength: 160, placeholder: "Name shown on DTI / SEC / CDA record" },
      { key: "tradeName", section: "Business registration", label: "Trade name / franchise", type: "text", required: false, width: "half", maxLength: 160, placeholder: "If different from registered name" },
      { key: "registrationNumber", section: "Business registration", label: "DTI / SEC / CDA registration number", type: "text", required: true, width: "half", maxLength: 80 },
      { key: "tin", section: "Business registration", label: "Tax Identification Number (TIN)", type: "text", required: false, width: "half", validation: "TIN", help: "Optional at intake; enter only if required for your LGU transaction." },
      { key: "businessAddress", section: "Business operation", label: "Business location address", type: "textarea", required: true, width: "full", minLength: 8, maxLength: 500, placeholder: "House/building, street, barangay, municipality/city" },
      { key: "lineOfBusiness", section: "Business operation", label: "Line of business / primary products or services", type: "textarea", required: true, width: "full", minLength: 3, maxLength: 500 },
      { key: "businessArea", section: "Business operation", label: "Business area (sq.m.)", type: "number", required: false, width: "third", min: 0, max: 1000000 },
      { key: "employeeCount", section: "Business operation", label: "Total employees", type: "number", required: false, width: "third", min: 0, max: 1000000, validation: "POSITIVE_INTEGER" },
      { key: "permitNumber", section: "Existing permit", label: "Current permit / business ID number", type: "text", required: true, width: "half", maxLength: 80, condition: { field: "transactionType", values: ["Renewal", "Amendment / update"] }, help: "Required for renewal or amendment when a current permit/account already exists." },
    ],
    requirements: [
      commonIdentity,
      { key: "business-registration", label: "DTI / SEC / CDA registration or equivalent business registration", required: true, examples: "DTI Certificate, SEC registration, CDA certificate" },
      { key: "barangay-clearance", label: "Barangay business clearance, if already issued / required", required: false, help: "Some LGUs integrate this step while others require a separate barangay clearance." },
      { key: "proof-address", label: "Proof of business location / right to occupy", required: true, examples: "Lease contract, tax declaration/title, authorization, or other accepted occupancy proof" },
      { key: "prior-permit", label: "Previous business permit / official receipt", required: true, condition: { field: "transactionType", values: ["Renewal", "Amendment / update"] }, help: "Required in this workflow for renewal or amendment requests." },
    ],
  },
  {
    key: "building-permit",
    title: "Building Permit",
    shortTitle: "Building Permit",
    category: "Permits & Business",
    processingOffice: "Office of the Building Official / Engineering Office",
    description: "Provide project, property and professional details for preliminary review before technical evaluation and inspection.",
    actionLabel: "Start building permit",
    intakeMode: "DIRECT",
    requiresAppointment: true,
    appointmentMode: "INSPECTION",
    appointmentPurpose: "Technical review / site inspection",
    purposeLabel: "Project request summary",
    purposePlaceholder: "Briefly describe the construction, renovation, repair or change of use you are requesting approval for.",
    departmentCode: "OBO",
    departmentAliases: ["OBO", "BUILDING OFFICIAL", "ENGINEERING", "ENGINEERING OFFICE"],
    completionMode: "RELEASE",
    outcomeLabel: "Building permit / technical release instruction",
    serviceNotice: "Building permit requirements vary by project scope and occupancy. This intake captures common Unified Building Permit information; the OBO may request signed/sealed plans, ancillary permits and additional technical documents.",
    reviewChecklist: [
      "Scope of work and occupancy/use are clearly stated.",
      "Property ownership or authorization is supported by documents.",
      "Plans and professional information are consistent with the declared project.",
      "Technical review / inspection findings have been resolved before final recommendation.",
    ],
    icon: Building2,
    accent: "bg-[#edf4fb] text-[#376b96]",
    fields: [
      { key: "projectType", section: "Project scope", label: "Scope of work", type: "select", required: true, width: "half", options: ["New construction", "Addition / expansion", "Renovation / alteration", "Repair", "Conversion / change of use", "Other"] },
      { key: "occupancyType", section: "Project scope", label: "Proposed occupancy / use", type: "select", required: true, width: "half", options: ["Residential", "Commercial", "Industrial", "Institutional", "Mixed use", "Other"] },
      { key: "projectAddress", section: "Property", label: "Project / property address", type: "textarea", required: true, width: "full", minLength: 8, maxLength: 500 },
      { key: "ownership", section: "Property", label: "Applicant relationship to property", type: "select", required: true, width: "half", options: ["Registered owner", "Authorized representative", "Lessee with owner's authority", "Contractor / professional representative", "Other"] },
      { key: "titleTaxDeclaration", section: "Property", label: "TCT / OCT / Tax Declaration reference", type: "text", required: false, width: "half", maxLength: 120 },
      { key: "storeys", section: "Project details", label: "Number of storeys", type: "number", required: false, width: "third", min: 1, max: 200, validation: "POSITIVE_INTEGER" },
      { key: "estimatedArea", section: "Project details", label: "Total floor area (sq.m.)", type: "number", required: false, width: "third", min: 0, max: 5000000 },
      { key: "estimatedCost", section: "Project details", label: "Estimated project cost (PHP)", type: "number", required: false, width: "third", min: 0, max: 100000000000 },
      { key: "professionalName", section: "Design professional", label: "Architect / civil engineer in charge", type: "text", required: false, width: "half", maxLength: 160 },
      { key: "professionalLicense", section: "Design professional", label: "PRC license number", type: "text", required: false, width: "half", maxLength: 80 },
    ],
    requirements: [
      commonIdentity,
      { key: "property-proof", label: "Proof of ownership or authority over the property", required: true, examples: "Title/tax declaration, deed or accepted equivalent" },
      { key: "owner-authorization", label: "Owner authorization / authority to file", required: true, condition: { field: "ownership", values: ["Authorized representative", "Lessee with owner's authority", "Contractor / professional representative", "Other"] }, help: "Required when the applicant is not the registered owner." },
      { key: "plans", label: "Architectural / engineering plans for initial review", required: true, help: "Upload a readable preliminary set. Signed/sealed originals or separate ancillary plans may still be required by the OBO." },
      { key: "locational-clearance", label: "Locational / zoning clearance, if already available", required: false },
      { key: "other-technical", label: "Other technical / ancillary permit document", required: false, examples: "Electrical, plumbing, sanitary, mechanical or electronics documents as applicable" },
    ],
  },
  {
    key: "certificate-of-residency",
    title: "Certificate of Residency",
    shortTitle: "Residency Certificate",
    category: "Certificates & Clearances",
    processingOffice: "Assigned LGU / Barangay Records Office",
    description: "Request certification of local residency for employment, school, banking, government or another lawful purpose.",
    actionLabel: "Request certificate",
    intakeMode: "DIRECT",
    requiresAppointment: false,
    appointmentMode: "NONE",
    purposeLabel: "Purpose of certificate",
    purposeOptions: ["Employment", "School / scholarship", "Bank / financial requirement", "Government transaction", "Business requirement", "Legal / administrative requirement", "Other"],
    departmentCode: "RECORDS",
    departmentAliases: ["RECORDS", "BARANGAY", "MAYOR", "ADMINISTRATIVE"],
    completionMode: "RELEASE",
    outcomeLabel: "Certificate of Residency",
    serviceNotice: "Residency verification may require barangay or local records and acceptable proof of address. Final issuance remains subject to the responsible office's verification.",
    reviewChecklist: [
      "Applicant identity matches the citizen account and uploaded identity document.",
      "Declared local address is supported by acceptable proof or local records.",
      "Purpose and requested copies are reasonable and complete.",
    ],
    icon: FileBadge2,
    accent: "bg-[#edf8f4] text-[#2f816b]",
    fields: [
      { key: "copies", section: "Certificate request", label: "Number of copies", type: "number", required: true, width: "half", min: 1, max: 10, validation: "POSITIVE_INTEGER" },
      { key: "residencyAddress", section: "Residency details", label: "Current local address", type: "textarea", required: true, width: "full", minLength: 8, maxLength: 500 },
      { key: "barangay", section: "Residency details", label: "Barangay", type: "text", required: true, width: "half", minLength: 2, maxLength: 100 },
      { key: "residencySinceYear", section: "Residency details", label: "Resident since (year)", type: "number", required: false, width: "half", validation: "YEAR", min: 1900, max: 2100 },
    ],
    requirements: [
      commonIdentity,
      { key: "proof-residency", label: "Proof of current residency", required: true, examples: "Barangay record/certification, utility/billing record, lease, or another proof accepted by the issuing office" },
    ],
  },
  {
    key: "first-time-jobseeker",
    title: "First-Time Jobseeker Assistance",
    shortTitle: "First-Time Jobseeker",
    category: "Certificates & Clearances",
    processingOffice: "PESO / Assigned Barangay Office",
    description: "Request screening and guidance for first-time jobseeker certification and covered pre-employment documents.",
    actionLabel: "Request assistance",
    intakeMode: "PRESCREEN",
    requiresAppointment: true,
    appointmentMode: "INTERVIEW",
    appointmentPurpose: "Eligibility checking / oath and certification guidance",
    purposeLabel: "What first-time jobseeker assistance do you need?",
    purposePlaceholder: "Tell PESO or the barangay what you are trying to complete for your first employment application.",
    prescreenFieldKeys: ["jobseekerStatus", "barangay", "firstTimeDeclaration", "requestedDocument"],
    departmentCode: "PESO",
    departmentAliases: ["PESO", "EMPLOYMENT", "BARANGAY"],
    completionMode: "SERVICE",
    outcomeLabel: "Eligibility guidance / first-time jobseeker assistance",
    serviceNotice: "RA 11261 benefits are generally availed once and rely on barangay certification of first-time jobseeker status and residency. This module assists with local processing; it does not automatically issue documents from other agencies.",
    reviewChecklist: [
      "Applicant is requesting first-time jobseeker processing rather than an ordinary employment clearance.",
      "Declared barangay residency information is sufficient for local verification.",
      "Barangay certification / undertaking is available or the applicant has been guided on how to obtain it.",
      "Requested assistance is within the LGU/PESO role or properly referred to another agency.",
    ],
    icon: BriefcaseBusiness,
    accent: "bg-[#eef4ff] text-[#506ea3]",
    fields: [
      { key: "jobseekerStatus", section: "Eligibility intake", label: "Current situation", type: "select", required: true, width: "half", options: ["First time actively seeking employment", "Preparing pre-employment documents", "Referred by PESO / barangay", "Unsure if I qualify"] },
      { key: "barangay", section: "Eligibility intake", label: "Barangay of residence", type: "text", required: true, width: "half", minLength: 2, maxLength: 100 },
      { key: "residencyMonths", section: "Eligibility intake", label: "Approximate months residing in the barangay", type: "number", required: true, width: "half", min: 0, max: 1200, validation: "POSITIVE_INTEGER", help: "Used for screening only; the barangay performs the official residency certification." },
      { key: "firstTimeDeclaration", section: "Eligibility intake", label: "First-time jobseeker declaration", type: "select", required: true, width: "half", options: ["Yes — this is my first time actively seeking employment", "I am not sure and need guidance"] },
      { key: "requestedDocument", section: "Assistance needed", label: "Document / process you need assistance with", type: "select", required: true, width: "half", options: ["Barangay certification / oath guidance", "Police / NBI clearance guidance", "PSA document guidance", "Medical / pre-employment requirement guidance", "PESO employment documentation assistance", "Other"] },
      { key: "intendedUse", section: "Assistance needed", label: "Employer / application purpose or concern", type: "textarea", required: true, width: "full", minLength: 8, maxLength: 800 },
    ],
    requirements: [
      { ...commonIdentity, required: false },
      { key: "barangay-certification", label: "Barangay first-time jobseeker certification, if already issued", required: false },
      { key: "oath-undertaking", label: "Oath of Undertaking, if already accomplished", required: false },
    ],
  },
  {
    key: "business-clearance",
    title: "Business Clearance / Certification",
    shortTitle: "Business Clearance",
    category: "Certificates & Clearances",
    processingOffice: "Business Permits and Licensing Office (BPLO)",
    description: "Request a local business clearance, certification or certified business record for a specific transaction.",
    actionLabel: "Request clearance",
    intakeMode: "DIRECT",
    requiresAppointment: false,
    appointmentMode: "NONE",
    purposeLabel: "Purpose of clearance / certification",
    purposePlaceholder: "State where the clearance will be submitted and why it is being requested.",
    departmentCode: "BPLO",
    departmentAliases: ["BPLO", "BUSINESS PERMITS", "BUSINESS PERMIT", "LICENSING"],
    completionMode: "RELEASE",
    outcomeLabel: "Business clearance / certification",
    serviceNotice: "The exact clearance name, validity and required supporting records depend on the transaction and LGU policy. Existing permit/account details help BPLO locate the correct business record.",
    reviewChecklist: [
      "Business identity matches local permit/account records where available.",
      "Purpose clearly identifies the requested certification or receiving office.",
      "Representative authority is documented when the requester is not the registered owner/officer.",
    ],
    icon: BadgeCheck,
    accent: "bg-[#edf8f5] text-[#2b856e]",
    fields: [
      { key: "businessName", section: "Business record", label: "Business / trade name", type: "text", required: true, width: "half", minLength: 2, maxLength: 160 },
      { key: "requesterCapacity", section: "Business record", label: "Requester capacity", type: "select", required: true, width: "half", options: ["Registered owner / proprietor", "Authorized representative", "Corporate officer / partner"] },
      { key: "permitNumber", section: "Business record", label: "Business permit / account number", type: "text", required: false, width: "half", maxLength: 80 },
      { key: "businessAddress", section: "Business record", label: "Business address", type: "textarea", required: true, width: "full", minLength: 8, maxLength: 500 },
      { key: "receivingOffice", section: "Request", label: "Receiving office / organization", type: "text", required: false, width: "half", maxLength: 180 },
      { key: "copies", section: "Request", label: "Number of copies", type: "number", required: true, width: "third", min: 1, max: 10, validation: "POSITIVE_INTEGER" },
    ],
    requirements: [
      commonIdentity,
      { key: "business-proof", label: "Current / previous business permit or registration reference", required: false },
      { key: "authorization", label: "Authorization letter / proof of authority", required: true, condition: { field: "requesterCapacity", values: ["Authorized representative", "Corporate officer / partner"] }, help: "Required when the requester is not the registered owner/proprietor." },
    ],
  },
  {
    key: "solo-parent-assistance",
    title: "Solo Parent Services / Assistance",
    shortTitle: "Solo Parent",
    category: "Social Assistance",
    processingOffice: "MSWDO / Local Social Welfare Office",
    description: "Request pre-screening for solo-parent registration, assessment, referral or program assistance.",
    actionLabel: "Request assistance",
    intakeMode: "PRESCREEN",
    requiresAppointment: true,
    appointmentMode: "INTERVIEW",
    appointmentPurpose: "Social worker assessment / interview",
    purposeLabel: "What help or service are you requesting?",
    purposePlaceholder: "Briefly describe the solo-parent registration, renewal, benefit concern or referral you need.",
    prescreenFieldKeys: ["assistanceNeed", "parentingSituation", "barangay"],
    departmentCode: "MSWDO",
    departmentAliases: ["MSWDO", "CSWDO", "SOCIAL WELFARE", "SOCIAL WELFARE AND DEVELOPMENT"],
    completionMode: "SERVICE",
    outcomeLabel: "Assessment / referral / local solo-parent service result",
    serviceNotice: "Solo-parent eligibility is determined by the authorized social welfare office under applicable law and current implementing rules. The online form is an intake and document-preparation tool, not an automatic eligibility decision.",
    reviewChecklist: [
      "Requested service is clearly identified (registration, renewal, benefit inquiry or referral).",
      "Household / dependent information is sufficient for social-worker assessment.",
      "Supporting civil, residency and income-related documents are reviewed only as applicable to the applicant's case.",
      "Assessment outcome and referral/next step are recorded before completion.",
    ],
    icon: HeartHandshake,
    accent: "bg-[#fff3ee] text-[#ad6850]",
    fields: [
      { key: "assistanceNeed", section: "Service needed", label: "What service do you need?", type: "select", required: true, width: "half", options: ["New solo-parent registration / ID guidance", "Renewal / record update", "Benefits / program inquiry", "Assessment / referral", "Other assistance"] },
      { key: "parentingSituation", section: "Assessment intake", label: "Situation for assessment", type: "select", required: true, width: "half", options: ["Unmarried parent solely caring for child/children", "Widowed parent", "Separated / abandoned parent", "Spouse is detained / incapacitated / absent", "Family member / guardian providing sole parental care", "Other / needs social worker assessment"] },
      { key: "dependentChildren", section: "Assessment intake", label: "Number of dependent children", type: "number", required: true, width: "third", min: 1, max: 30, validation: "POSITIVE_INTEGER" },
      { key: "youngestChildAge", section: "Assessment intake", label: "Age of youngest dependent", type: "number", required: false, width: "third", min: 0, max: 30, validation: "POSITIVE_INTEGER" },
      { key: "barangay", section: "Assessment intake", label: "Barangay", type: "text", required: true, width: "third", minLength: 2, maxLength: 100 },
    ],
    requirements: [
      { ...commonIdentity, required: false },
      { key: "proof-residency", label: "Barangay / residency certification, if already available", required: false },
      { key: "child-civil-record", label: "Birth certificate(s) / civil record of child or children, if applicable", required: false },
      { key: "circumstance-proof", label: "Supporting document relevant to the parenting circumstance", required: false, examples: "Death certificate, court/order record, medical certificate or other appropriate proof" },
      { key: "income-proof", label: "Income / livelihood information, if requested for a benefit assessment", required: false },
    ],
  },
  {
    key: "pwd-assistance",
    title: "PWD Registration / Services Assistance",
    shortTitle: "PWD Services",
    category: "Social Assistance",
    processingOffice: "PDAO / CSWDO / MSWDO",
    description: "Request pre-screening for PWD registration, renewal, record update, referral or accessibility-related local services.",
    actionLabel: "Request assistance",
    intakeMode: "PRESCREEN",
    requiresAppointment: true,
    appointmentMode: "INTERVIEW",
    appointmentPurpose: "PWD application verification / service coordination",
    purposeLabel: "What PWD service do you need?",
    purposePlaceholder: "Briefly explain the registration, renewal, record update, benefit inquiry or referral you need.",
    prescreenFieldKeys: ["transactionType", "filingFor", "barangay"],
    departmentCode: "PDAO",
    departmentAliases: ["PDAO", "PWD", "CSWDO", "MSWDO", "SOCIAL WELFARE"],
    completionMode: "SERVICE",
    outcomeLabel: "PWD registration / service assessment result",
    serviceNotice: "PWD registration may involve sensitive health information. This intake intentionally collects only what is needed for routing; the authorized office validates disability documentation and official registry fields.",
    reviewChecklist: [
      "Transaction type and applicant/representative relationship are clear.",
      "Identity and required disability documentation are reviewed by the authorized office.",
      "Any discrepancy or missing requirement is returned to the citizen with a specific correction note.",
      "Accessibility accommodations for any appointment are recorded and supported.",
    ],
    icon: UsersRound,
    accent: "bg-[#f0f1ff] text-[#6565a6]",
    fields: [
      { key: "transactionType", section: "PWD service", label: "Transaction", type: "select", required: true, width: "half", options: ["New registration / ID guidance", "Renewal", "Record update / transfer", "Benefit / program inquiry", "Referral / other assistance"] },
      { key: "filingFor", section: "PWD service", label: "Who is filing?", type: "select", required: true, width: "half", options: ["I am the applicant", "Parent / guardian", "Authorized representative"] },
      { key: "barangay", section: "PWD service", label: "Barangay", type: "text", required: true, width: "half", minLength: 2, maxLength: 100 },
      { key: "existingPwdId", section: "PWD service", label: "Existing PWD ID number", type: "text", required: false, width: "half", maxLength: 80, help: "For renewal / record update, if available." },
      { key: "accessibilityNeed", section: "Appointment support", label: "Accessibility / accommodation needed for an LGU visit", type: "textarea", required: false, width: "full", maxLength: 700, placeholder: "Example: wheelchair-accessible area, sign-language support, companion assistance" },
    ],
    requirements: [
      { ...commonIdentity, required: false },
      { key: "medical-certificate", label: "Medical / disability certificate, when applicable", required: false, help: "The authorized office determines the appropriate disability documentation, especially for non-apparent disability." },
      { key: "id-photo", label: "Recent ID photo, if already available", required: false },
      { key: "old-pwd-id", label: "Existing / expired PWD ID", required: true, condition: { field: "transactionType", values: ["Renewal", "Record update / transfer"] } },
      { key: "authorization", label: "Guardian / representative authorization or supporting document", required: true, condition: { field: "filingFor", values: ["Parent / guardian", "Authorized representative"] } },
    ],
  },
  {
    key: "senior-citizen-assistance",
    title: "Senior Citizen / OSCA Services",
    shortTitle: "Senior Citizen",
    category: "Social Assistance",
    processingOffice: "Office for Senior Citizens Affairs (OSCA)",
    description: "Request screening for OSCA registration, ID concerns, record updates, benefits inquiry or local senior-citizen assistance.",
    actionLabel: "Request assistance",
    intakeMode: "PRESCREEN",
    requiresAppointment: true,
    appointmentMode: "INTERVIEW",
    appointmentPurpose: "OSCA identity / residency verification and service coordination",
    purposeLabel: "What OSCA service do you need?",
    purposePlaceholder: "Briefly describe the registration, ID, record update, benefit inquiry or referral you need.",
    prescreenFieldKeys: ["assistanceNeed", "representative", "birthDate", "barangay"],
    departmentCode: "OSCA",
    departmentAliases: ["OSCA", "SENIOR CITIZEN", "SENIOR CITIZENS AFFAIRS"],
    completionMode: "SERVICE",
    outcomeLabel: "OSCA registration / service result",
    serviceNotice: "OSCA verifies age, identity, residency and any representative authority before registration or record changes. Exact requirements remain subject to the local OSCA Citizen's Charter.",
    reviewChecklist: [
      "Senior citizen's identity, age and residency details are sufficient for OSCA verification.",
      "Existing OSCA record / ID number is checked for renewal or record update when available.",
      "Representative authority is verified when someone files on behalf of the senior citizen.",
      "Requested benefit, referral or registration outcome is clearly recorded.",
    ],
    icon: FileCheck2,
    accent: "bg-[#fff7e9] text-[#a77a25]",
    fields: [
      { key: "assistanceNeed", section: "OSCA service", label: "What service do you need?", type: "select", required: true, width: "half", options: ["New registration / ID guidance", "ID replacement / renewal", "Record update", "Benefits / program inquiry", "Referral / other assistance"] },
      { key: "representative", section: "OSCA service", label: "Who is filing?", type: "select", required: true, width: "half", options: ["I am the senior citizen", "Authorized family member / representative"] },
      { key: "birthDate", section: "Senior information", label: "Senior citizen date of birth", type: "date", required: true, width: "half", validation: "SENIOR_BIRTHDATE" },
      { key: "barangay", section: "Senior information", label: "Barangay", type: "text", required: true, width: "half", minLength: 2, maxLength: 100 },
      { key: "existingOscaId", section: "Senior information", label: "Existing OSCA ID number", type: "text", required: false, width: "half", maxLength: 80 },
    ],
    requirements: [
      { ...commonIdentity, label: "Proof of identity / age", required: false },
      { key: "proof-residency", label: "Proof of local residency, if requested by OSCA", required: false },
      { key: "old-osca-id", label: "Existing OSCA ID / senior citizen record", required: true, condition: { field: "assistanceNeed", values: ["ID replacement / renewal", "Record update"] } },
      { key: "authorization", label: "Authorization / representative document", required: true, condition: { field: "representative", values: ["Authorized family member / representative"] } },
    ],
  },
];

export function conditionMatches(condition: ServiceCondition | undefined, values: Record<string,string>) {
  if (!condition) return true;
  return condition.values.includes(values[condition.field] || "");
}

export function activeServiceFields(service: OnlineServiceDefinition, values: Record<string,string>) {
  return service.fields.filter(field => conditionMatches(field.condition, values));
}

export function activeServiceRequirements(service: OnlineServiceDefinition, values: Record<string,string>) {
  return service.requirements.filter(requirement => conditionMatches(requirement.condition, values));
}

function normalizeDepartment(value: string) { return value.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim(); }
export function departmentMatchesService(service: OnlineServiceDefinition, department?: string | null) {
  const normalized = normalizeDepartment(department || "");
  if (!normalized) return false;
  return [service.departmentCode, service.processingOffice, ...service.departmentAliases].some(alias => {
    const candidate = normalizeDepartment(alias);
    return candidate === normalized || normalized.includes(candidate) || candidate.includes(normalized);
  });
}

export function serviceNeedsAppointment(service: Pick<OnlineServiceDefinition, "appointmentMode">) {
  return !["NONE", "OPTIONAL"].includes(service.appointmentMode);
}

export const SERVICE_CATEGORIES: ServiceCategory[] = ["Certificates & Clearances", "Permits & Business", "Social Assistance"];
export function serviceByKey(key: string) { return ONLINE_SERVICES.find(service => service.key === key) ?? null; }
