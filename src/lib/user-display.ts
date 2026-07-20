import type { UserRole, UserStatus } from "@prisma/client";

import type { StatusBadgeTone } from "@/components/ui/status-badge";

export function roleLabel(role: UserRole) {
  if (role === "ADMIN") return "Admin";
  if (role === "LECTURER") return "Lecturer";
  return "Student";
}

export function statusLabel(status: UserStatus) {
  if (status === "ACTIVE") return "Active";
  if (status === "SUSPENDED") return "Suspended";
  return "Inactive";
}

export function roleTone(role: UserRole): StatusBadgeTone {
  if (role === "ADMIN") return "danger";
  if (role === "LECTURER") return "info";
  return "success";
}

export function statusTone(status: UserStatus): StatusBadgeTone {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "warning";
  return "neutral";
}
