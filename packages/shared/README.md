# shared

Paquete compartido entre modulos.

Responsabilidades iniciales:
- Tipos y DTOs
- Esquemas de validacion
- Utilidades comunes
- Constantes de dominio

## Estado actual
- Aun sin implementacion de codigo compartido.
- Existe contrato base en documentacion para iniciar integracion entre modulos.

## Fuente de verdad temporal
- `docs/MODULE_INTEGRATION_CONTRACTS.md`

## Objetivo inmediato de este paquete
1. Publicar tipos para `Land` y `RentalRequest`.
2. Centralizar enum de estados de solicitud.
3. Compartir esquemas de validacion para payloads de auth, filtros y decisiones
	 de propietario (`approved`/`rejected`).

## Criterio de adopcion
- `app-web`, `backend-api` y `admin-dashboard` deben consumir los contratos de
	este paquete para reducir drift entre frontend y backend.
