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
    id: "services", number: "02", title: "Online LGU Services", shortTitle: "Apply for a service",
    description: "Digital applications para sa permits, IDs at clearances, nang hindi na kailangang pumila.",
    group: "Government", icon: Files, color: SERVICE_ICON_COLOR, surface: SERVICE_ICON_SURFACE,
    details: [
      { icon: FileText, text: "Online forms and document submissions" },
      { icon: Receipt, text: "Permits, IDs and clearances workflows" },
      { icon: BadgeCheck, text: "Application review and status updates" },
    ],
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
    id: "jobs", number: "05", title: "Job Matching", shortTitle: "Explore jobs",
    description: "Pag-uugnay ng local jobseekers at businesses ayon sa skills at job requirements.",
    group: "Opportunities", icon: BriefcaseBusiness, color: SERVICE_ICON_COLOR, surface: SERVICE_ICON_SURFACE,
    details: [
      { icon: UsersRound, text: "Import of SPES survey data and recorded skills" },
      { icon: Building2, text: "Local businesses and available opportunity references" },
      { icon: Handshake, text: "Survey-based skills-to-opportunity suggestions" },
    ],
    note: "PESO-curated opportunity discovery and optional skills profiles are active. SPES data is for consented aggregate insights only; no job application processing is included.",
  },
  {
    id: "census", number: "06", title: "Workforce & Social Census", shortTitle: "Community insights",
    description: "Organized worker census at social-status information para sa mas maayos na local planning.",
    group: "Opportunities", icon: ClipboardList, color: SERVICE_ICON_COLOR, surface: SERVICE_ICON_SURFACE,
    details: [
      { icon: Database, text: "Worker occupation, employment status and socioeconomic survey data" },
      { icon: BarChart3, text: "Aggregated statistics and community insights" },
      { icon: LockKeyhole, text: "Role-based access for personal information" },
    ],
    note: "Sensitive individual data must not appear in public reports. Show aggregated statistics only.",
  },
];
