import { describe, expect, it } from "bun:test";
import { apiErrorMessage } from "./api-error";

describe("apiErrorMessage", () => {
  it("prefiere el detalle por campo sobre el mensaje genérico (#390)", () => {
    // Cuerpo real devuelto por el backend al crear un terreno con título "s".
    const body = {
      code: "VALIDATION_ERROR",
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: [{ field: "title", message: "Título debe tener al menos 3 caracteres" }],
      },
    };

    expect(apiErrorMessage(body, 400, "Bad Request")).toBe(
      "Título debe tener al menos 3 caracteres",
    );
  });

  it("junta varios detalles en una sola línea", () => {
    const body = {
      error: {
        message: "Invalid request data",
        details: [
          { field: "title", message: "Título debe tener al menos 3 caracteres" },
          { field: "area", message: "Área debe ser mayor a 0" },
        ],
      },
    };

    expect(apiErrorMessage(body, 400, "Bad Request")).toBe(
      "Título debe tener al menos 3 caracteres · Área debe ser mayor a 0",
    );
  });

  it("cae al mensaje general cuando no hay detalles", () => {
    const body = { error: { message: "Only owner or admin can add photos to this land" } };
    expect(apiErrorMessage(body, 403, "Forbidden")).toBe(
      "Only owner or admin can add photos to this land",
    );
  });

  it("ignora detalles vacíos o mal formados en vez de mostrar líneas en blanco", () => {
    const body = {
      error: {
        message: "Invalid request data",
        details: [{ field: "title" }, { message: "   " }, null],
      },
    };
    expect(apiErrorMessage(body, 400, "Bad Request")).toBe("Invalid request data");
  });

  it("tolera un `details` que no sea lista", () => {
    const body = { error: { message: "Invalid request data", details: "roto" } };
    expect(apiErrorMessage(body, 400, "Bad Request")).toBe("Invalid request data");
  });

  it("cae al código HTTP cuando el cuerpo no trae nada útil", () => {
    expect(apiErrorMessage({}, 502, "Bad Gateway")).toBe("HTTP 502: Bad Gateway");
    expect(apiErrorMessage(null, 500, "Internal Server Error")).toBe(
      "HTTP 500: Internal Server Error",
    );
  });
});
