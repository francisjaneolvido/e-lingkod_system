import "server-only";
import { prisma } from "@/lib/prisma";
import type { StaffModule } from "@/lib/staff-modules";

export type NotificationInput = {
  userId: string;
  module: StaffModule | "SYSTEM";
  type: string;
  title: string;
  message: string;
  href?: string | null;
};

export async function createNotification(input: NotificationInput) {
  return prisma.notification.create({ data: { ...input, href: input.href || null } });
}

export async function createNotifications(inputs: NotificationInput[]) {
  if (!inputs.length) return { count: 0 };
  return prisma.notification.createMany({ data: inputs.map(input => ({ ...input, href: input.href || null })) });
}

export async function notifyAdmins(input: Omit<NotificationInput, "userId">) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  return createNotifications(admins.map(admin => ({ ...input, userId: admin.id })));
}

export async function notifyModuleStaff(module: StaffModule, input: Omit<NotificationInput, "userId" | "module">, department?: string | null) {
  const staff = await prisma.user.findMany({
    where: {
      role: "STAFF",
      ...(department?.trim() ? { department: department.trim() } : {}),
      staffPermissions: { some: { module } },
    },
    select: { id: true },
  });
  return createNotifications(staff.map(row => ({ ...input, module, userId: row.id })));
}

export async function notificationFeed(userId: string, take = 20) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take, select: { id: true, module: true, type: true, title: true, message: true, href: true, readAt: true, createdAt: true } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { unread, items: items.map(item => ({ ...item, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() ?? null })) };
}

export async function markNotificationRead(userId: string, id?: string) {
  if (id) return prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  return prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
