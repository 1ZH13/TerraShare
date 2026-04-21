import { useMemo, useState } from "react";

const appWebBaseUrl = import.meta.env.VITE_APP_WEB_URL || "http://localhost:5174";
const registroUrl = `${appWebBaseUrl.replace(/\/$/, "")}/register`;
const loginUrl = `${appWebBaseUrl.replace(/\/$/, "")}/login`;

const terrenos = [
  {
    id: 1,
    nombre: "Finca El Tamarindo",
    ubicacion: "Los Santos",
    uso: "Agricultura",
    precio: 420,
    agua: "Pozo y rio cercano"
  },
  {
    id: 2,
    nombre: "Lote Vista Caisan",
    ubicacion: "Chiriqui",
    uso: "Ganaderia",
    precio: 560,
    agua: "Toma de quebrada"
  },
  {
    id: 3,
    nombre: "Parcela Rio Indio",
    ubicacion: "Cocle",
    uso: "Mixto",
    precio: 390,
    agua: "Sistema de riego"
  }
];

const filtrosUso = ["Todos", "Agricultura", "Ganaderia", "Mixto"];

function App() {
  const [usoSeleccionado, setUsoSeleccionado] = useState("Todos");
  const [correo, setCorreo] = useState("");
  const [mensajeCTA, setMensajeCTA] = useState("");

  const resultados = useMemo(() => {
    if (usoSeleccionado === "Todos") {
      return terrenos;
    }
    return terrenos.filter((terreno) => terreno.uso === usoSeleccionado);
  }, [usoSeleccionado]);

  const manejarCTA = (evento) => {
    evento.preventDefault();

    if (!correo.includes("@") || !correo.includes(".")) {
      setMensajeCTA("Ingresa un correo valido para continuar.");
      return;
    }

    setMensajeCTA("Listo. Te contactaremos para activar tu cuenta en TerraShare.");
    setCorreo("");
  };

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />

      <header className="top-nav">
        <a href="#inicio" className="brand">
          TerraShare
        </a>
        <nav className="menu">
          <a href="#catalogo">Explorar terrenos</a>
          <a href="#mapa">Mapa con filtros</a>
          <a href={loginUrl}>Iniciar sesion</a>
          <a href={registroUrl} className="menu-cta">
            Crear cuenta
          </a>
        </nav>
      </header>

      <main>
        <section id="inicio" className="hero reveal">
          <p className="tag">Plataforma para Panama</p>
          <h1>Encuentra o publica terrenos productivos en minutos.</h1>
          <p className="hero-copy">
            Conectamos propietarios y arrendatarios con informacion clara de uso,
            disponibilidad y condiciones. Descubre opciones en modo invitado y
            activa tu perfil cuando estes listo para negociar.
          </p>

          <div className="hero-actions">
            <a href={registroUrl} className="btn btn-primary">
              Empezar ahora
            </a>
            <a href="#catalogo" className="btn btn-ghost">
              Ver catalogo publico
            </a>
          </div>

          <ul className="hero-metrics" aria-label="Indicadores iniciales">
            <li>
              <strong>+120</strong>
              <span>Terrenos publicados en validacion</span>
            </li>
            <li>
              <strong>4.8/5</strong>
              <span>Satisfaccion en pilotos privados</span>
            </li>
            <li>
              <strong>&lt;48h</strong>
              <span>Tiempo medio de primera respuesta</span>
            </li>
          </ul>
        </section>

        <section id="catalogo" className="catalogo reveal">
          <div className="section-head">
            <h2>Catalogo en modo invitado</h2>
            <p>
              Puedes revisar terrenos sin login. Para solicitar alquiler y cerrar
              acuerdos, activas tu cuenta en segundos.
            </p>
          </div>

          <div className="filtros" role="tablist" aria-label="Filtro por uso">
            {filtrosUso.map((filtro) => {
              const activo = usoSeleccionado === filtro;
              return (
                <button
                  key={filtro}
                  className={activo ? "chip chip-active" : "chip"}
                  onClick={() => setUsoSeleccionado(filtro)}
                  type="button"
                >
                  {filtro}
                </button>
              );
            })}
          </div>

          <div className="cards-grid">
            {resultados.map((terreno) => (
              <article className="card" key={terreno.id}>
                <p className="card-kicker">{terreno.uso}</p>
                <h3>{terreno.nombre}</h3>
                <p>{terreno.ubicacion}</p>
                <p>Agua: {terreno.agua}</p>
                <p className="price">Desde ${terreno.precio}/mes</p>
              </article>
            ))}
          </div>
        </section>

        <section id="mapa" className="mapa reveal">
          <div>
            <h2>Mapa rapido con filtros clave</h2>
            <p>
              Visualiza zonas disponibles, precio estimado y tipos de uso para
              tomar decisiones mas rapidas.
            </p>
          </div>
          <div className="mapa-box" role="img" aria-label="Vista previa de mapa">
            <span>Vista de mapa (MVP)</span>
            <small>Integracion geoespacial avanzada en siguientes issues.</small>
          </div>
        </section>

        <section id="registro" className="registro reveal">
          <div className="section-head">
            <h2>CTA operacional: activa tu cuenta</h2>
            <p>
              Deja tu correo y te enviamos el enlace para registro/login en la app
              principal.
            </p>
            <p>
              Si ya deseas entrar directo, usa <a href={registroUrl}>registro</a> o{" "}
              <a href={loginUrl}>login</a>.
            </p>
          </div>
          <form className="cta-form" onSubmit={manejarCTA}>
            <label htmlFor="correo">Correo de contacto</label>
            <div className="form-row">
              <input
                id="correo"
                value={correo}
                onChange={(evento) => setCorreo(evento.target.value)}
                placeholder="tu@empresa.com"
                type="email"
                required
              />
              <button className="btn btn-primary" type="submit">
                Recibir acceso
              </button>
            </div>
            {mensajeCTA ? <p className="feedback">{mensajeCTA}</p> : null}
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;
