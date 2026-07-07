interface Props {
  error: unknown;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: Props) {
  const message = error instanceof Error ? error.message : "Error desconocido";
  return (
    <div role="alert" style={{ padding: "2rem", textAlign: "center", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h2 style={{ marginBottom: "1rem" }}>Algo salio mal</h2>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>{message}</p>
      <button
        onClick={resetErrorBoundary}
        style={{ padding: "0.5rem 1.5rem", cursor: "pointer" }}
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
