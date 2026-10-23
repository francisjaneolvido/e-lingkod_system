import type { LucideIcon } from "lucide-react";
import {
  Camera, Files, Siren, BookOpenText, BriefcaseBusiness,
  MapPin, Hash, ImagePlus, FileText, Receipt, BadgeCheck,
  PhoneCall, BellRing, Building2, ClipboardList, Search, UsersRound,
  Handshake, Database, BarChart3, LockKeyhole,
} from "lucide-react";

export type ServiceGroup = "Community" | "Government" | "Opportunities";
export type Service = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  group: ServiceGroup;
  icon: LucideIcon;
  color: string;
  surface: string;
  number: string;
  details: { icon: LucideIcon; text: string }[];
  note?: string;
};

// Shared E-Lingkod Bayan icon palette — same visual identity for all six modules.
// The color is for service iconography, not semantic status indicators.
const SERVICE_ICON_COLOR = "#153B63";
const SERVICE_ICON_SURFACE = "#EDF5FB";

export const services: Service[] = [
  {
    id: "civic", number: "01", title: "Civic Reporting", shortTitle: "Report a concern",
    description: "Mag-ulat ng problema sa komunidad gamit ang larawan, lokasyon at tracking ID.",
    group: "Community", icon: Camera, color: SERVICE_ICON_COLOR, surface: SERVICE_ICON_SURFACE,
    details: [
      { icon: ImagePlus, text: "Photo upload as report evidence" },
      { icon: MapPin, text: "GPS geotagging (with browser location permission)" },
      { icon: Hash, text: "Unique tracking ID and LGU action status" },
    ],
    note: "GPS needs HTTPS or localhost and the user's location permission; report processing requires the backend.",
  },
  {
    id: "services", number: "02", title: "Online LGU Services", shortTitle: "Request an LGU service",
    description: "Digital requests para sa permits, clearances at assistance, with review, scheduling and status tracking.",
    group: "Government", icon: Files, color: SERVICE_ICON_COLOR, surface: SERVICE_ICON_SURFACE,
    details: [
      { icon: FileText, text: "Online forms and document submissions" },
      { icon: Receipt, text: "Permits, clearances and assistance workflows" },
      { icon: BadgeCheck, text: "Application review and status updates" },
    ],
    note: "Prototype workflow. Exact requirements, fees, processing times and issuing offices must be verified and configured by the implementing LGU before production use.",
  },
  {
    id: "emergency", number: "03", title: "Emergency Hotlines & Alerts", shortTitle: "Emergency help",
    description: "Mabilis na access sa PNP, BFP, ospital at MDRRMO, kasama ang official advisories.",
    group: "Community", icon: Siren, color: SERVICE_ICON_COLOR, surface: SERVICE_ICON_SURFACE,
    details: [
      { icon: PhoneCall, text: "One-tap call directory for verified emergency numbers" },
      { icon: BellRing, text: "Push advisories for severe weather and emergencies" },
      { icon: Building2, text: "Contact groups: PNP, BFP, hospital, MDRRMO" },
    ],
    note: "Real-time alerts and phone numbers will only be enabled after official data is connected and verified.",
  },
  {
    id: "directory", number: "04", title: "Municipal Projects & Services", shortTitle: "Find an office",
    description: "Directory ng LGU offices at services, kasama ang ongoing at future municipal projects.",
    group: "Government", icon: BookOpenText, color: SERVICE_ICON_COLOR, surface: SERVICE_ICON_SURFACE,
    details: [
      { icon: Building2, text: "Directory of offices and departments" },
      { icon: ClipboardList, text: "Requirements and step-by-step service guides" },
      { icon: Search, text: "Ongoing and future municipal projects" },
    ],
  },
  {
    id: "jobs", number: "05", title: "Citizen Profiling", shortTitle: "Citizen surveys",
    description: "Community employment survey, skills and training profiling, plus PESO-reviewed opportunity discovery.",
    group: "Opportunities", icon: BriefcaseBusiness, color: SERVICE_ICON_COLOR, surface: SERVICE_ICON_SURFACE,
    details: [
      { icon: UsersRound, text: "Community skills and preference-based recommendations" },
      { icon: Building2, text: "Verified local opportunity references" },
      { icon: Handshake, text: "Informational suggestions — never automatic applications" },
    ],
    note: "PESO-curated opportunity discovery is informational only. Citizen survey profiles are never sent to employers and no job application processing is included.",
  },
  {
    id: "census", number: "06", title: "Community Census", shortTitle: "Census · coming soon",
    description: "A separate community census module planned for a future implementation phase.",
    group: "Opportunities", icon: ClipboardList, color: SERVICE_ICON_COLOR, surface: SERVICE_ICON_SURFACE,
    details: [
      { icon: Database, text: "Dedicated census data model and collection workflow" },
      { icon: BarChart3, text: "Community demographic and planning statistics" },
      { icon: LockKeyhole, text: "Privacy and access controls before public release" },
    ],
    note: "Planned module only. Current employment, skills and training survey data belongs to Job Matching / Employment & Livelihood, not Census.",
  },
];
