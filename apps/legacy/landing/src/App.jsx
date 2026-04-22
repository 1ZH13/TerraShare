import { useMemo, useState } from "react";

const appWebBaseUrl = import.meta.env.VITE_APP_WEB_URL || "http://localhost:5174";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
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

const pasos = [
  {
    numero: "1",
    titulo: "Publica tu terreno",
    descripcion: "Crea tu perfil de propietario y registra tus terrenos con fotos, ubicacion y condiciones."
  },
  {
    numero: "2",
    titulo: "Arrendatarios exploran",
    descripcion: "Sin login pueden ver catalogo, filtro por uso y mapa. Activan cuenta cuando estan listos."
  },
  {
    numero: "3",
    titulo: "Solicitan y negocian",
    descripcion: "Envian solicitud con periodo e uso propuesto. Tu revisas, aprobado o rechazas segun disponibilidad."
  },
  {
    numero: "4",
    titulo: "Cierran el trato",
    descripcion: "Pago integrado via Stripe, chat interno para coordinar y contrato con trazabilidad completa."
  }
];

const diferenciadores = [
  {
    icono: "📊",
    titulo: "Datos estandarizados",
    descripcion: "Informacion completa de agua, acceso, uso permitido y disponibilidad. Sin sorpresas."
  },
  {
    icono: "🔍",
    titulo: "Busqueda transparente",
    descripcion: "Filtros por tipo de suelo, provincia y precio. Vista previa sin login."
  },
  {
    icono: "⚡",
    titulo: "Decision en menos de 48h",
    descripcion: "Flujo rapido de solicitud a aprobacion. Notificaciones en cada cambio de estado."
  },
  {
    icono: "🔒",
    titulo: "Trazabilidad y contrato",
    descripcion: "Registro de todas las acciones. Pagos seguros y historial completo para ambas partes."
  }
];

function App() {
  const [usoSeleccionado, setUsoSeleccionado] = useState("Todos");
  const [correo, setCorreo] = useState("");
  const [mensajeCTA, setMensajeCTA] = useState("");
  const [loadingCTA, setLoadingCTA] = useState(false);

  const resultados = useMemo(() => {
    if (usoSeleccionado === "Todos") {
      return terrenos;
    }
    return terrenos.filter((terreno) => terreno.uso === usoSeleccionado);
  }, [usoSeleccionado]);

  const manejarCTA = async (evento) => {
    evento.preventDefault();

    if (!correo.includes("@") || !correo.includes(".")) {
      setMensajeCTA("Ingresa un correo valido para continuar.");
      return;
    }

    setLoadingCTA(true);
    setMensajeCTA("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: correo, source: "landing" })
      });

      if (res.ok) {
        setMensajeCTA("Listo. Te contactaremos para activar tu cuenta en TerraShare.");
        setCorreo("");
      } else {
        const data = await res.json();
        if (data.error?.code === "CONFLICT") {
          setMensajeCTA("Este correo ya esta registrado. Intenta iniciar sesion.");
        } else {
          setMensajeCTA("Algo salio mal. Intenta de nuevo.");
        }
      }
    } catch {
      setMensajeCTA("Error de conexion. Verifica tu red e intenta de nuevo.");
    } finally {
      setLoadingCTA(false);
    }
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
          <a href="#como-funciona">Como funciona</a>
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

        <section id="como-funciona" className="como-funciona reveal">
          <div className="section-head">
            <h2>Como funciona</h2>
            <p>
              TerraShare conecta propietarios y arrendatarios en cuatro pasos
              simples, sin procesos complejos ni kehilangan contactos informales.
            </p>
          </div>

          <ol className="pasos-grid">
            {pasos.map((paso) => (
              <li key={paso.numero} className="paso-item">
                <span className="paso-numero">{paso.numero}</span>
                <div>
                  <h3>{paso.titulo}</h3>
                  <p>{paso.descripcion}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="por-que" className="por-que reveal">
          <div className="section-head">
            <h2>Por que TerraShare</h2>
            <p>
              Construimos esta plataforma para resolver los problemas que hacen
              dificil el alquiler de tierras productivas en Panama.
            </p>
          </div>

          <div className="diferenciadores-grid">
            {diferenciadores.map((item) => (
              <div key={item.titulo} className="diferenciador-card">
                <span className="diferenciador-icono">{item.icono}</span>
                <h3>{item.titulo}</h3>
                <p>{item.descripcion}</p>
              </div>
            ))}
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
                disabled={loadingCTA}
              />
              <button className="btn btn-primary" type="submit" disabled={loadingCTA}>
                {loadingCTA ? "Enviando..." : "Recibir acceso"}
              </button>
            </div>
            {mensajeCTA ? <p className={`feedback ${mensajeCTA.includes("Error") || mensajeCTA.includes("mal") || mensajeCTA.includes("Intenta") ? "feedback-error" : ""}`}>{mensajeCTA}</p> : null}
          </form>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="brand">TerraShare</span>
            <p>Plataforma de alquiler de terrenos productivos en Panama.</p>
          </div>
          <div className="footer-links">
            <a href="#catalogo">Explorar</a>
            <a href={registroUrl}>Crear cuenta</a>
            <a href={loginUrl}>Iniciar sesion</a>
            <a href="#como-funciona">Como funciona</a>
          </div>
          <div className="footer-legal">
            <p>&copy; {new Date().getFullYear()} TerraShare. Todos los derechos reservados.</p>
            <p>
              <a href="#">Terminos de servicio</a> &middot; <a href="#">Privacidad</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;