const MANAGER_ROLES = new Set(['owner', 'admin'])

export function canManageTenantResources(role: string | null | undefined): boolean {
  return MANAGER_ROLES.has(role ?? '')
}

export function canConfirmTenantAlarms(role: string | null | undefined): boolean {
  return canManageTenantResources(role) || role === 'member' || role === 'support'
}

export const readOnlyTenantMessage = '当前角色仅可查看，请联系组织管理员'
