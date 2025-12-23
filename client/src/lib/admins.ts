// Mock admin utilities
export const ADMIN_EMAILS: string[] = [
  "admin@ranked.chat"
];

export const SUPER_ADMIN_EMAILS = [
  "sezunmaj@gmail.com",
  "admin@ranked.chat" // Added for testing
];

export const isAdmin = (email?: string | null) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email) || SUPER_ADMIN_EMAILS.includes(email);
};

export const isSuperAdmin = (email?: string | null) => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email);
};
