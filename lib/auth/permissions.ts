export type AtlasRole = "operator" | "caller" | "client";

export type AtlasResource =
  | "companies"
  | "contacts"
  | "leads";

export type AtlasAction = "read" | "write" | "delete";

type PermissionMatrix = {
  [role in AtlasRole]: {
    [resource in AtlasResource]?: AtlasAction[];
  };
};

const matrix: PermissionMatrix = {
  operator: {
    companies: ["read", "write", "delete"],
    contacts: ["read", "write", "delete"],
    leads: ["read", "write", "delete"],
  },
  caller: {
    companies: ["read"],
    contacts: ["read", "write"],
    leads: [], // caller cannot access leads table directly
  },
  client: {
    companies: [],
    contacts: [],
    leads: [],
  },
};

export function canAccess(
  role: AtlasRole,
  resource: AtlasResource,
  action: AtlasAction
): boolean {
  return matrix[role]?.[resource]?.includes(action) ?? false;
}
