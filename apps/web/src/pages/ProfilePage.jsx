import { useClerk, useUser } from "@clerk/clerk-react";

export default function ProfilePage() {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();

  const userName = user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Usuario";
  const userEmail = user?.emailAddresses?.[0]?.emailAddress || "No disponible";
  const userImage = user?.imageUrl;

  const handleSignOut = async () => {
    await signOut({ redirectUrl: "/" });
  };

  return (
    <div>
      <div className="section-header">
        <h1>Mi Perfil</h1>
        <p>Gestiona tu informacion y preferencias</p>
      </div>

      <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}>
          <img
            src={userImage}
            alt={userName}
            style={{ width: "80px", height: "80px", borderRadius: "999px", objectFit: "cover" }}
          />
          <div>
            <h2 style={{ margin: "0 0 0.25rem" }}>{userName}</h2>
            <p style={{ margin: 0, opacity: 0.7 }}>{userEmail}</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <button className="btn btn-primary" onClick={() => openUserProfile()}>
            Editar perfil en Clerk
          </button>
          <button className="btn btn-ghost" onClick={() => openUserProfile({ mode: "manage" })}>
            Gestionar mi cuenta
          </button>
          <button className="btn btn-ghost" style={{ borderColor: "var(--danger)", color: "var(--danger)" }} onClick={handleSignOut}>
            Cerrar sesion
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem" }}>Informacion de cuenta</h3>
        <dl style={{ margin: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.5rem", padding: "0.75rem 0", borderBottom: "1px solid rgba(19,33,24,0.1)" }}>
            <dt>Email</dt>
            <dd style={{ fontWeight: 400 }}>{userEmail}</dd>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.5rem", padding: "0.75rem 0", borderBottom: "1px solid rgba(19,33,24,0.1)" }}>
            <dt>ID de usuario</dt>
            <dd style={{ fontWeight: 400, fontSize: "0.85rem", opacity: 0.7 }}>{user?.id}</dd>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.5rem", padding: "0.75rem 0" }}>
            <dt>Miembro desde</dt>
            <dd style={{ fontWeight: 400 }}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" }) : "No disponible"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}