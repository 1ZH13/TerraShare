export function getDisplayName(user) {
  return (
    user?.fullName ||
    user?.firstName ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Usuario"
  );
}

export function isAdminUser(user) {
  const role = user?.publicMetadata?.role;
  const email = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  return role === "admin" || email === "terradmin@gmail.com";
}
