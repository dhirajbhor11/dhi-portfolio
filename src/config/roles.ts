
export const USER_ROLES = {
  FRIENDS: 'friends',
  FAMILY: 'family',
  PARENTS: 'parents',
  COLLEAGUES: 'colleagues',
  MANAGER: 'manager',
  HR: 'hr',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ALL_ROLES: UserRole[] = Object.values(USER_ROLES);

export const DEFAULT_ROLE: UserRole = USER_ROLES.FRIENDS;
