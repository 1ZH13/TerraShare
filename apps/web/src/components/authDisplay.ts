// Minimal structural shape of the Clerk user fields these helpers read,
// so they work with the Clerk UserResource without importing its full type.
interface ClerkUserLike {
  fullName?: string | null;
  firstName?: string | null;
  emailAddresses?: { emailAddress: string }[];
  publicMetadata?: Record<string, unknown>;
}

export function getDisplayName(user: ClerkUserLike | null | undefined): string {
  return (
    user?.fullName ||
    user?.firstName ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Usuario"
  );
}

export function isAdminUser(user: ClerkUserLike | null | undefined): boolean {
  const role = user?.publicMetadata?.role;
  const email = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  return role === "admin" || email === "terradmin@gmail.com";
}
