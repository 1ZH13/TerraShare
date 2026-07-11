/**
 * Verificación de seguridad para despliegue (#141, hallazgos G-1..G-3).
 *
 * Comprueba, en producción, que la configuración sensible no quede en valores
 * de desarrollo. Un fallo **fatal** (p. ej. el bypass de autenticación activo en
 * producción) aborta el arranque; los demás se registran como advertencias.
 */

export interface SecurityConfig {
  isProduction: boolean;
  allowDevAuthBypass: boolean;
  corsAllowedOrigins: string[];
  stripeConfigured: boolean;
  webhookSecretConfigured: boolean;
}

export interface SecurityCheckResult {
  /** Problemas que deben abortar el arranque en producción. */
  fatal: string[];
  /** Problemas que se registran pero no bloquean. */
  warnings: string[];
}

/**
 * Evalúa la configuración de seguridad. Fuera de producción no hay problemas
 * fatales (el entorno de dev usa deliberadamente valores relajados).
 */
export function checkProductionSecurity(config: SecurityConfig): SecurityCheckResult {
  const fatal: string[] = [];
  const warnings: string[] = [];

  if (!config.isProduction) {
    return { fatal, warnings };
  }

  // G-1: el bypass de autenticación (`x-dev-*`) NUNCA debe estar activo en
  // producción — permitiría suplantar a cualquier usuario sin token.
  if (config.allowDevAuthBypass) {
    fatal.push(
      "ALLOW_DEV_AUTH_BYPASS está activo en producción: deshabilítalo (ALLOW_DEV_AUTH_BYPASS=false).",
    );
  }

  // G-1: sin allowlist de CORS, el navegador no podrá llamar a la API (o se
  // habría abierto a "*"). Se avisa para evitar un despliegue mal configurado.
  if (config.corsAllowedOrigins.length === 0) {
    warnings.push(
      "CORS_ALLOWED_ORIGINS está vacío en producción: ningún origen del navegador podrá llamar a la API.",
    );
  }

  // G-3: la verificación de webhooks de Stripe requiere el secreto de firma.
  if (config.stripeConfigured && !config.webhookSecretConfigured) {
    warnings.push(
      "STRIPE_SECRET_KEY está configurado pero falta STRIPE_WEBHOOK_SECRET: los webhooks se rechazarán en producción.",
    );
  }

  return { fatal, warnings };
}

/**
 * Aplica la verificación sobre la configuración real: registra advertencias y
 * lanza si hay problemas fatales. Se llama al arrancar.
 */
export function enforceProductionSecurity(
  config: SecurityConfig,
  logger: Pick<Console, "warn" | "error"> = console,
): void {
  const { fatal, warnings } = checkProductionSecurity(config);

  for (const warning of warnings) {
    logger.warn(`[security] ${warning}`);
  }

  if (fatal.length > 0) {
    for (const problem of fatal) {
      logger.error(`[security] ${problem}`);
    }
    throw new Error(
      `Configuración de seguridad inválida para producción: ${fatal.join(" ")}`,
    );
  }
}
