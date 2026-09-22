import "server-only";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLES, ROLE_MODULES, type ModuleKey } from "@/lib/rbac";

export type PermissionAction = "view" | "create" | "edit" | "delete";
export type ModulePermissions = Record<PermissionAction, boolean>;
export type PermissionsMap = Record<Role, Record<ModuleKey, ModulePermissions>>;

// Modules that are inherently read-only or have no create/edit/delete concept.
const READ_ONLY_MODULES: ModuleKey[] = ["dashboard", "reports", "activity", "notifications", "profile", "portal"];

function defaultModulePermissions(role: Role, moduleKey: ModuleKey): ModulePermissions {
  const view = ROLE_MODULES[role]?.includes(moduleKey) ?? false;
  const write = view && !READ_ONLY_MODULES.includes(moduleKey) && (moduleKey !== "employees" || role === "SUPER_ADMIN" || role === "ADMIN") && (moduleKey !== "settings" || role === "SUPER_ADMIN" || role === "ADMIN");
  return { view, create: write, edit: write, delete: write };
}

const ALL_MODULE_KEYS = Array.from(
  new Set(Object.values(ROLE_MODULES).flat())
) as ModuleKey[];

let cache: PermissionsMap | null = null;
let cachedAt = 0;
const CACHE_MS = 5000;

export async function getPermissionsMap(): Promise<PermissionsMap> {
  if (cache && Date.now() - cachedAt < CACHE_MS) return cache;

  const rows = await prisma.rolePermission.findMany();
  const overrides = new Map(rows.map((r) => [`${r.role}:${r.module}`, r]));

  const map = {} as PermissionsMap;
  for (const role of ROLES) {
    map[role] = {} as Record<ModuleKey, ModulePermissions>;
    for (const moduleKey of ALL_MODULE_KEYS) {
      const override = overrides.get(`${role}:${moduleKey}`);
      map[role][moduleKey] = override
        ? { view: override.canView, create: override.canCreate, edit: override.canEdit, delete: override.canDelete }
        : defaultModulePermissions(role, moduleKey);
    }
  }

  cache = map;
  cachedAt = Date.now();
  return map;
}

export function invalidatePermissionsCache() {
  cache = null;
}

export async function getEffectiveModules(role: Role): Promise<ModuleKey[]> {
  if (role === "SUPER_ADMIN") return ALL_MODULE_KEYS;
  const map = await getPermissionsMap();
  return ALL_MODULE_KEYS.filter((m) => map[role][m]?.view);
}

export async function getCreatableModules(role: Role): Promise<ModuleKey[]> {
  if (role === "SUPER_ADMIN") return ALL_MODULE_KEYS;
  const map = await getPermissionsMap();
  return ALL_MODULE_KEYS.filter((m) => map[role][m]?.create);
}

export async function can(role: Role, moduleKey: ModuleKey, action: PermissionAction): Promise<boolean> {
  if (role === "SUPER_ADMIN") return true;
  const map = await getPermissionsMap();
  return map[role]?.[moduleKey]?.[action] ?? false;
}

export { ALL_MODULE_KEYS };
