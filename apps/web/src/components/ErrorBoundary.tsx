import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Contiene los errores de render de las páginas (#261).
 *
 * Sin este límite, una excepción durante el render escalaba hasta el shell raíz
 * y React reemplazaba `<html>/<head>/<body>` por un `<div>`, dejando a toda la
 * app sin hojas de estilo hasta una recarga dura.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error no controlado en la interfaz:", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div className="page-shell">
        <div className="panel" style={{ textAlign: "center", padding: "3rem", maxWidth: 640, margin: "3rem auto" }}>
          <h1 style={{ marginBottom: "0.5rem" }}>Algo salió mal</h1>
          <p style={{ marginBottom: "1.5rem" }}>
            No pudimos mostrar esta pantalla. Puedes reintentar o volver al inicio.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={this.handleRetry}>
              Reintentar
            </button>
            <a className="btn btn-ghost" href="/">
              Volver al inicio
            </a>
          </div>
          {import.meta.env.DEV && (
            <pre style={{ marginTop: "1.5rem", textAlign: "left", overflowX: "auto", fontSize: "0.75rem", opacity: 0.7 }}>
              {error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
