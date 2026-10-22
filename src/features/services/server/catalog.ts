import "server-only";
import { prisma } from "@/lib/prisma";
import {
  ONLINE_SERVICES,
  serviceByKey,
  type OnlineServiceDefinition,
  type SerializableOnlineServiceDefinition,
} from "../catalog";
import { Building2, FileCheck2, HeartHandshake, Landmark } from "lucide-react";

function iconFor(service: Pick<SerializableOnlineServiceDefinition, "key" | "category">) {
  const builtIn = serviceByKey(service.key);
  if (builtIn) return builtIn.icon;
  if (service.category === "Social Assistance") return HeartHandshake;
  if (service.category === "Certificates & Clearances") return FileCheck2;
  if (service.category === "Permits & Business") return Landmark;
  return Building2;
}

function safeConfig(row: { configJson: string } & Record<string, any>): SerializableOnlineServiceDefinition {
  let parsed: Partial<SerializableOnlineServiceDefinition> = {};
  try { parsed = JSON.parse(row.configJson || "{}"); } catch {}
  const built = serviceByKey(row.key);
  const base = built ? (() => { const { icon: _icon, ...rest } = built; return rest; })() : {};
  return {
    ...(base as SerializableOnlineServiceDefinition),
    ...(parsed as SerializableOnlineServiceDefinition),
    key: row.key,
    title: row.title,
    shortTitle: row.shortTitle,
    category: row.category,
    processingOffice: row.processingOffice,
    departmentCode: row.departmentCode,
    description: row.description,
    actionLabel: row.actionLabel,
    intakeMode: row.intakeMode,
    appointmentMode: row.appointmentMode,
    requiresAppointment: !["NONE","OPTIONAL"].includes(row.appointmentMode),
    completionMode: row.completionMode,
    purposeLabel: row.purposeLabel,
    purposePlaceholder: row.purposePlaceholder || undefined,
    feeText: row.feeText || undefined,
    processingTimeText: row.processingTimeText || undefined,
    assignmentStrategy: row.assignmentStrategy === "MANUAL" ? "MANUAL" : "AUTO_BALANCE",
    acceptTimeoutMinutes: row.acceptTimeoutMinutes,
    fields: Array.isArray((parsed as any).fields) ? (parsed as any).fields : (built?.fields ?? []),
    requirements: Array.isArray((parsed as any).requirements) ? (parsed as any).requirements : (built?.requirements ?? []),
    reviewChecklist: Array.isArray((parsed as any).reviewChecklist) ? (parsed as any).reviewChecklist : (built?.reviewChecklist ?? []),
    departmentAliases: Array.isArray((parsed as any).departmentAliases) ? (parsed as any).departmentAliases : (built?.departmentAliases ?? [row.departmentCode]),
    outcomeLabel: (parsed as any).outcomeLabel || built?.outcomeLabel || "LGU service outcome",
    serviceNotice: (parsed as any).serviceNotice || built?.serviceNotice || "Requirements and processing steps remain subject to the LGU Citizen's Charter.",
  } as SerializableOnlineServiceDefinition;
}

function hydrate(service: SerializableOnlineServiceDefinition): OnlineServiceDefinition {
  return { ...service, icon: iconFor(service), accent: serviceByKey(service.key)?.accent || "bg-[#eaf4f8] text-[#256b8d]" };
}

export async function resolveServiceDefinition(key: string, includeUnpublished = false): Promise<OnlineServiceDefinition | null> {
  const row = await prisma.serviceDefinition.findUnique({ where: { key } });
  if (row) {
    if (!row.published && !includeUnpublished) return null;
    return hydrate(safeConfig(row));
  }
  return serviceByKey(key);
}

export async function publishedServiceCatalog(): Promise<OnlineServiceDefinition[]> {
  const overrides = await prisma.serviceDefinition.findMany({ orderBy: [{ category: "asc" }, { title: "asc" }] });
  const byKey = new Map(overrides.map(row => [row.key, row]));
  const builtIns = ONLINE_SERVICES.flatMap(service => {
    const row = byKey.get(service.key);
    if (!row) return [service];
    byKey.delete(service.key);
    return row.published ? [hydrate(safeConfig(row))] : [];
  });
  const custom = [...byKey.values()].filter(row => row.published).map(row => hydrate(safeConfig(row)));
  return [...builtIns, ...custom];
}

export async function managedServiceCatalog() {
  const overrides = await prisma.serviceDefinition.findMany({ orderBy: [{ updatedAt: "desc" }], include: { createdBy: { select: { name: true } } } });
  const map = new Map(overrides.map(row => [row.key, row]));
  const rows = ONLINE_SERVICES.map(service => {
    const custom = map.get(service.key); if (custom) map.delete(service.key);
    if (custom) return { ...safeConfig(custom), published: custom.published, source: "CUSTOMIZED" as const, updatedAt: custom.updatedAt.toISOString(), createdBy: custom.createdBy.name };
    const { icon: _icon, ...serializable } = service;
    return { ...serializable, published: true, source: "SYSTEM" as const, updatedAt: null, createdBy: "System default" };
  });
  return [...rows, ...[...map.values()].map(custom => ({ ...safeConfig(custom), published: custom.published, source: "CUSTOM" as const, updatedAt: custom.updatedAt.toISOString(), createdBy: custom.createdBy.name }))];
}

export function serviceConfigForStorage(service: SerializableOnlineServiceDefinition) {
  const { key: _key, title: _title, shortTitle: _short, category: _category, processingOffice: _office, description: _description, actionLabel: _action, intakeMode: _intake, appointmentMode: _appointment, completionMode: _completion, purposeLabel: _purpose, purposePlaceholder: _placeholder, departmentCode: _dept, feeText: _fee, processingTimeText: _time, assignmentStrategy: _strategy, acceptTimeoutMinutes: _timeout, ...config } = service;
  return JSON.stringify(config);
}
