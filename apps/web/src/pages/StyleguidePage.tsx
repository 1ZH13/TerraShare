import { useId, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Navbar,
  Sidebar,
  Stepper,
} from "../components/ui";
import type { BuscoOfrezcoMode } from "../components/ui";

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  marginBottom: "3rem",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
  alignItems: "center",
};

export default function StyleguidePage() {
  const [mode, setMode] = useState<BuscoOfrezcoMode>("busco");
  const [step, setStep] = useState(1);
  const emailId = useId();
  const nameId = useId();
  const errId = useId();

  const steps = ["Datos", "Ubicación", "Precio", "Fotos"];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <header style={{ marginBottom: "2.5rem" }}>
        <h1 className="ts-display">Styleguide</h1>
        <p style={{ color: "var(--ts-text-secondary)", maxWidth: "60ch" }}>
          Sistema de diseño editorial de TerraShare (issue #134, Fase 1). Tokens, tipografía y
          primitivos base.
        </p>
      </header>

      {/* Tipografía */}
      <section style={sectionStyle}>
        <h2 className="ts-title">Tipografía</h2>
        <div className="ts-display">Display · Spectral</div>
        <h1 className="ts-title">Título H1 · Spectral</h1>
        <h2 className="ts-title">Título H2 · Spectral</h2>
        <h3 className="ts-title">Título H3 · Spectral</h3>
        <p>
          Cuerpo en Hanken Grotesk. La interfaz usa esta sans legible para párrafos, labels,
          botones y navegación. Referencia: <span className="ts-mono">pay_a1b2c3</span>.
        </p>
      </section>

      {/* Colores */}
      <section style={sectionStyle}>
        <h2 className="ts-title">Paleta</h2>
        <div style={rowStyle}>
          {(
            [
              ["Crema", "--ts-bg"],
              ["Superficie", "--ts-surface"],
              ["Bosque", "--ts-green"],
              ["Verde tinta", "--ts-green-ink"],
              ["Sage", "--ts-sage"],
              ["Terracota", "--ts-clay"],
              ["Borde", "--ts-border"],
            ] as const
          ).map(([label, token]) => (
            <div key={token} style={{ textAlign: "center", fontSize: "0.75rem" }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "var(--ts-radius)",
                  background: `var(${token})`,
                  border: "1px solid var(--ts-border)",
                }}
              />
              <div style={{ marginTop: 6, color: "var(--ts-text-secondary)" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons */}
      <section style={sectionStyle}>
        <h2 className="ts-title">Button</h2>
        <div style={rowStyle}>
          <Button variant="primary">Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Peligro</Button>
          <Button variant="primary" disabled>
            Deshabilitado
          </Button>
        </div>
        <div style={rowStyle}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button href="#" variant="secondary">
            Como enlace
          </Button>
        </div>
      </section>

      {/* Badges */}
      <section style={sectionStyle}>
        <h2 className="ts-title">Badge</h2>
        <div style={rowStyle}>
          <Badge tone="green">Publicada</Badge>
          <Badge tone="beige">Pendiente</Badge>
          <Badge tone="clay" dot>
            Sin leer
          </Badge>
          <Badge tone="neutral">Borrador</Badge>
        </div>
      </section>

      {/* Card */}
      <section style={sectionStyle}>
        <h2 className="ts-title">Card</h2>
        <div style={{ ...rowStyle, alignItems: "stretch" }}>
          <Card style={{ maxWidth: 280 }}>
            <h3 className="ts-title" style={{ marginBottom: "0.5rem" }}>
              Finca La Esperanza
            </h3>
            <p style={{ color: "var(--ts-text-secondary)", margin: 0 }}>
              Chiriquí · 2.4 ha · riego por goteo.
            </p>
          </Card>
          <Card interactive style={{ maxWidth: 280 }}>
            <Badge tone="green">Alquiler</Badge>
            <h3 className="ts-title" style={{ margin: "0.6rem 0 0.25rem" }}>
              Tarjeta interactiva
            </h3>
            <p style={{ color: "var(--ts-text-secondary)", margin: 0 }}>Pasa el cursor.</p>
          </Card>
          <Card flat style={{ maxWidth: 280 }}>
            <p style={{ margin: 0 }}>Variante flat (sin sombra).</p>
          </Card>
        </div>
      </section>

      {/* Fields */}
      <section style={sectionStyle}>
        <h2 className="ts-title">Field / Input</h2>
        <div style={{ display: "grid", gap: "1rem", maxWidth: 380 }}>
          <Field label="Nombre" htmlFor={nameId} required>
            <Input id={nameId} placeholder="Finca La Esperanza" />
          </Field>
          <Field label="Correo" htmlFor={emailId} hint="No lo compartiremos.">
            <Input id={emailId} type="email" placeholder="tu@correo.com" />
          </Field>
          <Field label="Precio" htmlFor={errId} error="Ingresa un monto válido.">
            <Input id={errId} invalid defaultValue="-10" />
          </Field>
        </div>
      </section>

      {/* Stepper */}
      <section style={sectionStyle}>
        <h2 className="ts-title">Stepper</h2>
        <Card>
          <Stepper steps={steps} current={step} />
          <div style={{ ...rowStyle, marginTop: "1.25rem" }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            >
              Siguiente
            </Button>
          </div>
        </Card>
      </section>

      {/* Navbar */}
      <section style={sectionStyle}>
        <h2 className="ts-title">Navbar</h2>
        <Navbar
          mode={mode}
          onModeChange={setMode}
          userName="Ana Torres"
          userMenuItems={[
            { label: "Mi perfil", href: "#" },
            { label: "Mis terrenos", href: "#" },
          ]}
          onSignOut={() => window.alert("Cerrar sesión")}
        />
        <p style={{ color: "var(--ts-text-secondary)", fontSize: "0.85rem" }}>
          Modo activo: <strong>{mode}</strong>
        </p>
      </section>

      {/* Sidebar */}
      <section style={sectionStyle}>
        <h2 className="ts-title">Sidebar (admin)</h2>
        <div style={{ maxWidth: 260 }}>
          <Sidebar
            items={[
              { label: "Dashboard", href: "#", active: true },
              { label: "Usuarios", href: "#" },
              { label: "Terrenos", href: "#" },
              { separator: true },
              { label: "Leads", href: "#" },
            ]}
            footer={
              <button
                type="button"
                className="ds-sidebar__item"
                onClick={() => window.alert("Salir")}
              >
                Cerrar sesión
              </button>
            }
          />
        </div>
      </section>
    </div>
  );
}
