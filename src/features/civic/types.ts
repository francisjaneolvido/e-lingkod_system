import type { ReportStatus } from "./config";
export type ReportPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type CivicViewer = { id: string; name: string; email: string; role: string; department?: string | null; designation?: string | null };
export type ReportSummary = {
  id: string; trackingId: string; title: string; category: string; barangay: string;
  status: ReportStatus; assignedOffice: string | null; createdAt: string; updatedAt: string;
  photoId: string | null; reporterName?: string; priority: ReportPriority;
  assignedStaffId: string | null; assignedStaffName: string | null;
};
export type ReportEvent = {
  id: string; status: ReportStatus; note: string; assignedOffice: string | null;
  createdAt: string; author: string; visibility: "PUBLIC" | "INTERNAL"; action: string;
};
export type ResolutionSubmissionView = {
  id: string; reviewStatus: "PENDING" | "APPROVED" | "RETURNED";
  remarks: string; submittedByName: string; createdAt: string;
  reviewedAt: string | null; reviewerName: string | null;
  reviewNote: string | null; photos: { id: string }[];
};
export type CitizenResolutionFeedbackView = {
  id: string; resolutionSubmissionId: string; decision: "CONFIRMED" | "DISPUTED";
  reason: string | null; createdAt: string; photos: { id: string }[];
};
export type ReportDetail = ReportSummary & {
  description: string; address: string; latitude: number | null; longitude: number | null;
  locationSource: string; gpsAccuracy: number | null; version: number;
  photos: { id: string }[]; updates: ReportEvent[]; resolutionSubmissions: ResolutionSubmissionView[]; citizenFeedbacks: CitizenResolutionFeedbackView[];
  reporter?: { name: string; email: string };
};
export type PublicTracking = {
  trackingId: string; status: ReportStatus; assignedOffice: string | null; createdAt: string;
  updatedAt: string; verifiedEvidenceAvailable: boolean; updates: { id: string; status: ReportStatus; createdAt: string }[];
};
export type LocationValue = {
  latitude: string; longitude: string; accuracy: number | null; source: "GPS" | "MANUAL" | "ADDRESS";
};
