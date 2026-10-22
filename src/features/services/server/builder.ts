import "server-only";
import { prisma } from "@/lib/prisma";
import { CivicError } from "@/features/civic/validation";
import type { CivicViewer } from "@/features/civic/types";
import type { SerializableOnlineServiceDefinition, ServiceField, ServiceRequirement } from "../catalog";
import { serviceConfigForStorage } from "./catalog";

function text(value: unknown, label: string, max: number, min = 1) {
  if (typeof value !== "string") throw new CivicError(`${label} is required.`);
  const v = value.trim();
  if (v.length < min || v.length > max) throw new CivicError(`${label} must be ${min}–${max} characters.`);
  return v;
}
function optional(value: unknown, max: number) { if (typeof value !== "string") return ""; return value.trim().slice(0,max); }
function slug(value: unknown) {
  const raw = text(value, "Service key", 80, 3).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw)) throw new CivicError("Service key must use lowercase letters, numbers and hyphens only.");
  return raw;
}

const CATEGORIES = ["Certificates & Clearances","Permits & Business","Social Assistance"];
const INTAKES = ["DIRECT","PRESCREEN"];
const APPOINTMENTS = ["NONE","OPTIONAL","INTERVIEW","INSPECTION","PICKUP"];
const COMPLETION = ["RELEASE","SERVICE"];
const FIELD_TYPES = ["text","textarea","select","date","number"];

function condition(value: any) {
  if (!value || typeof value !== "object") return undefined;
  const field = optional(value.field,80); const values = Array.isArray(value.values) ? value.values.filter((x:any)=>typeof x==="string"&&x.trim()).map((x:string)=>x.trim().slice(0,120)).slice(0,20) : [];
  return field && values.length ? { field, values } : undefined;
}

function fields(value: unknown): ServiceField[] {
  if (!Array.isArray(value)) throw new CivicError("Service questions must be a list.");
  if (value.length > 60) throw new CivicError("A service can have up to 60 questions.");
  const seen = new Set<string>();
  return value.map((raw:any,index) => {
    const key = optional(raw?.key,80) || `field-${index+1}`;
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)) throw new CivicError(`Question ${index+1} has an invalid key.`);
    if (seen.has(key)) throw new CivicError(`Question key “${key}” is duplicated.`); seen.add(key);
    const type = FIELD_TYPES.includes(raw?.type) ? raw.type : "text";
    const options = type === "select" ? (Array.isArray(raw?.options) ? raw.options.filter((x:any)=>typeof x==="string"&&x.trim()).map((x:string)=>x.trim().slice(0,120)).slice(0,30) : []) : undefined;
    if (type === "select" && !options?.length) throw new CivicError(`Question “${raw?.label || key}” needs at least one option.`);
    return {
      key,
      label: text(raw?.label, `Question ${index+1} label`, 180, 2),
      type,
      section: optional(raw?.section,100) || "Request details",
      required: raw?.required !== false,
      placeholder: optional(raw?.placeholder,300) || undefined,
      help: optional(raw?.help,500) || undefined,
      width: ["full","half","third"].includes(raw?.width) ? raw.width : "full",
      options,
      condition: condition(raw?.condition),
    } as ServiceField;
  });
}

function requirements(value: unknown): ServiceRequirement[] {
  if (!Array.isArray(value)) throw new CivicError("Requirements must be a list.");
  if (value.length > 40) throw new CivicError("A service can have up to 40 requirements.");
  const seen = new Set<string>();
  return value.map((raw:any,index) => {
    const key = optional(raw?.key,100) || `requirement-${index+1}`;
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)) throw new CivicError(`Requirement ${index+1} has an invalid key.`);
    if (seen.has(key)) throw new CivicError(`Requirement key “${key}” is duplicated.`); seen.add(key);
    return { key, label: text(raw?.label, `Requirement ${index+1}`, 180, 2), required: raw?.required !== false, help: optional(raw?.help,700)||undefined, examples: optional(raw?.examples,500)||undefined, condition: condition(raw?.condition) };
  });
}

export function parseServiceBuilderInput(input: unknown): SerializableOnlineServiceDefinition & { published:boolean; assignmentStrategy:"AUTO_BALANCE"|"MANUAL"; acceptTimeoutMinutes:number } {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CivicError("Invalid service configuration.");
  const d = input as any;
  const category = CATEGORIES.includes(d.category) ? d.category : "Certificates & Clearances";
  const intakeMode = INTAKES.includes(d.intakeMode) ? d.intakeMode : "DIRECT";
  const appointmentMode = APPOINTMENTS.includes(d.appointmentMode) ? d.appointmentMode : "NONE";
  const completionMode = COMPLETION.includes(d.completionMode) ? d.completionMode : "SERVICE";
  const assignmentStrategy = d.assignmentStrategy === "MANUAL" ? "MANUAL" : "AUTO_BALANCE";
  const timeout = Number(d.acceptTimeoutMinutes ?? 120);
  if (!Number.isInteger(timeout) || timeout < 15 || timeout > 1440) throw new CivicError("Staff acceptance window must be between 15 and 1,440 minutes.");
  const parsedFields = fields(d.fields ?? []);
  const parsedRequirements = requirements(d.requirements ?? []);
  const key = slug(d.key);
  const departmentCode = text(d.departmentCode, "Department code", 80, 2).toUpperCase();
  return {
    key,
    title: text(d.title,"Service name",180,3),
    shortTitle: optional(d.shortTitle,100) || text(d.title,"Service name",100,3),
    category: category as any,
    processingOffice: text(d.processingOffice,"Processing office",150,2),
    departmentCode,
    departmentAliases: Array.isArray(d.departmentAliases) ? d.departmentAliases.filter((x:any)=>typeof x==="string"&&x.trim()).map((x:string)=>x.trim().slice(0,120)).slice(0,20) : [departmentCode],
    description: text(d.description,"Description",1200,12),
    actionLabel: optional(d.actionLabel,100) || "Start request",
    intakeMode: intakeMode as any,
    requiresAppointment: !["NONE","OPTIONAL"].includes(appointmentMode),
    appointmentMode: appointmentMode as any,
    appointmentPurpose: optional(d.appointmentPurpose,220)||undefined,
    purposeLabel: optional(d.purposeLabel,160) || "Purpose / reason for request",
    purposePlaceholder: optional(d.purposePlaceholder,600)||undefined,
    purposeOptions: Array.isArray(d.purposeOptions) ? d.purposeOptions.filter((x:any)=>typeof x==="string"&&x.trim()).map((x:string)=>x.trim().slice(0,120)).slice(0,30) : undefined,
    prescreenFieldKeys: Array.isArray(d.prescreenFieldKeys) ? d.prescreenFieldKeys.filter((x:any)=>typeof x==="string").slice(0,20) : undefined,
    completionMode: completionMode as any,
    outcomeLabel: optional(d.outcomeLabel,180) || "LGU service outcome",
    serviceNotice: optional(d.serviceNotice,1500) || "Final requirements and processing steps follow the LGU Citizen's Charter and authorized office assessment.",
    reviewChecklist: Array.isArray(d.reviewChecklist) ? d.reviewChecklist.filter((x:any)=>typeof x==="string"&&x.trim()).map((x:string)=>x.trim().slice(0,400)).slice(0,20) : [],
    fields: parsedFields,
    requirements: parsedRequirements,
    feeText: optional(d.feeText,160)||undefined,
    processingTimeText: optional(d.processingTimeText,160)||undefined,
    assignmentStrategy,
    acceptTimeoutMinutes: timeout,
    published: d.published === true,
  } as any;
}

export async function saveServiceDefinition(input: unknown, viewer: CivicViewer) {
  if (viewer.role !== "ADMIN") throw new CivicError("Only Super Admin can manage the service catalog.",403);
  const value = parseServiceBuilderInput(input);
  const configJson = serviceConfigForStorage(value);
  const data = {
    title:value.title, shortTitle:value.shortTitle, category:value.category, processingOffice:value.processingOffice, departmentCode:value.departmentCode,
    description:value.description, actionLabel:value.actionLabel, intakeMode:value.intakeMode, appointmentMode:value.appointmentMode, completionMode:value.completionMode,
    purposeLabel:value.purposeLabel, purposePlaceholder:value.purposePlaceholder || null, feeText:value.feeText || null, processingTimeText:value.processingTimeText || null,
    assignmentStrategy:value.assignmentStrategy, acceptTimeoutMinutes:value.acceptTimeoutMinutes, published:value.published, configJson,
  };
  return prisma.$transaction(async tx => {
    const saved = await tx.serviceDefinition.upsert({ where:{key:value.key}, create:{key:value.key,createdById:viewer.id,...data}, update:data });
    await tx.serviceDefinitionAudit.create({ data:{serviceDefinitionId:saved.id,actorId:viewer.id,action:"SAVE",snapshotJson:JSON.stringify({...value,configJson:undefined})} });
    return saved;
  });
}
