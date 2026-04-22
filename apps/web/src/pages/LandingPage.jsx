import { useState } from "react";
import { Link } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";

const featuredLands = [
  { id: "1", name: "Finca El Tamarindo", location: "Los Santos", use: "Agricultura", price: 420 },
  { id: "2", name: "Lote Vista Caisan", location: "Chiriqui", use: "Ganaderia", price: 560 },
  { id: "3", name: "Parcela Rio Indio", location: "Cocle", use: "Mixto", price: 390 },
];

const steps = [
  { icon: "01", title: "Publica tu terreno", desc: "Registra tus terrenos con fotos, ubicacion y condiciones de uso." },
  { icon: "02", title: "Arrendatarios exploran", desc: "Sin login pueden explorar el catalogo, filtrar por uso y ver detalles." },
  { icon: "03", title: "Reciben solicitudes", desc: "Revisan cada solicitud, piden info adicional si es necesario y deciden." },
  { icon: "04", title: "Cierran el trato", desc: "Firman acuerdo, procesan pago seguro y coordinan por chat interno." },
];

export default function LandingPage() {
  const { openSignUp } = useClerk();

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />

      <nav className="glass-nav">
        <Link to="/" className="brand">TerraShare</Link>
        <nav className="menu">
          <Link to="/catalog">Terrenos</Link>
          <Link to="/login">Iniciar sesion</Link>
        </nav>
        <div className="auth-actions">
          <Link to="/register" className="btn btn-primary">Crear cuenta</Link>
        </div>
      </nav>

      <main>
        <section className="hero-section">
          <div className="hero-content">
            <span className="hero-tag">Panama</span>
            <h1 className="hero-title">Terrenos productivos<br />a tu alcance</h1>
            <p className="hero-subtitle">
              Conectamos propietarios con arrendatarios de forma clara y segura.
              Explora el catalogo sin login, solicita cuando estes listo.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => openSignUp({})}>
                Publicar mi terreno
              </button>
              <Link to="/catalog" className="btn btn-ghost btn-lg">
                Ver catalogo
              </Link>
            </div>
          </div>
        </section>

        <section className="catalog-preview">
          <div className="section-header">
            <h2>Terrenos destacados</h2>
            <p>Explora opciones disponibles ahora mismo</p>
          </div>
          <div className="cards-grid">
            {featuredLands.map((land) => (
              <Link key={land.id} to={`/lands/${land.id}`} className="land-card">
                <span className="card-badge">{land.use}</span>
                <h3>{land.name}</h3>
                <p>{land.location}</p>
                <div className="card-footer">
                  <span className="card-price">${land.price}/mes</span>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <Link to="/catalog" className="btn btn-ghost">
              Ver todos los terrenos
            </Link>
          </div>
        </section>

        <section className="how-it-works">
          <div className="section-header">
            <h2>Como funciona</h2>
            <p>Cuatro pasos simples para Arrendar o publicar</p>
          </div>
          <div className="steps-grid">
            {steps.map((step, index) => (
              <div key={step.icon} className="step-card" style={{ animationDelay: `${index * 100}ms` }}>
                <span className="step-number">{step.icon}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="landing-footer">
          <div className="footer-brand">
            <span className="brand">TerraShare</span>
            <p>Alquiler de terrenos productivos en Panama</p>
          </div>
          <div className="footer-links">
            <Link to="/catalog">Terrenos</Link>
            <Link to="/login">Iniciar sesion</Link>
            <Link to="/register">Crear cuenta</Link>
          </div>
          <p className="footer-copy">&copy; {new Date().getFullYear()} TerraShare</p>
        </footer>
      </main>
    </div>
  );
}