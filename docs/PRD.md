# PRD - TerraShare

## 1. Resumen del producto
TerraShare es una plataforma de alquiler de terrenos para agricultura, ganaderia u otros usos productivos.

Objetivo principal:
- Conectar propietarios de terrenos con personas o empresas que necesiten alquilar terreno por periodos definidos.

Resultado esperado del MVP:
- Publicar terrenos.
- Buscar terrenos en listado y mapa con filtros.
- Solicitar alquiler.
- Gestionar aprobacion/rechazo de solicitudes.
- Ver estado de contratos y pagos.

## 2. Problema
Hoy el alquiler de terrenos suele manejarse por contactos informales, sin trazabilidad y sin datos estandarizados.

Dolores principales:
- Poca visibilidad de terrenos disponibles.
- Informacion incompleta de ubicacion, tipo de suelo, agua, acceso y restricciones.
- Proceso lento para llegar a acuerdos.
- Falta de historial de solicitudes, acuerdos y cumplimiento.

## 3. Usuarios y roles
- Propietario: publica terrenos, define condiciones, revisa solicitudes.
- Arrendatario: busca terrenos, solicita alquiler, hace seguimiento de su solicitud.
- Administrador: modera publicaciones, gestiona reportes, aplica politicas.

## 4. Alcance MVP
Incluye:
- Registro e inicio de sesion.
- Modo invitado: explorar publicaciones sin login.
- Perfil de usuario.
- Publicacion de terrenos (datos, fotos, disponibilidad, precio, usos permitidos).
- Busqueda por filtros en listado y mapa.
- Flujo de solicitud de alquiler.
- Chat mixto: interno en plataforma y opcion externa via WhatsApp.
- Aprobacion o rechazo por propietario.
- Pagos dentro de la plataforma (fase 1, alcance basico).
- Dashboard basico con metricas.

No incluye en fase 1:
- Geoespacial avanzado (mapas complejos, calculo de rutas).
- Firma digital legal integrada.
- Conciliacion bancaria avanzada y facturacion compleja.

## 5. Requerimientos funcionales
1. El sistema debe permitir crear, editar y desactivar publicaciones de terreno.
2. El sistema debe permitir filtrar por tipo de terreno, ubicacion, precio y disponibilidad.
3. El sistema debe permitir enviar solicitud de alquiler con fecha inicio, fecha fin y uso propuesto.
4. El propietario debe poder aprobar o rechazar solicitudes.
5. El sistema debe registrar cambios de estado en solicitudes y contratos.
6. El sistema debe permitir al administrador bloquear contenido o usuarios que incumplan politicas.
7. El sistema debe permitir visualizacion publica de terrenos sin requerir login.
8. El sistema debe requerir login para publicar, solicitar alquiler, pagar y usar chat interno.
9. El sistema debe permitir que cada usuario agregue telefono para habilitar contacto externo por WhatsApp.
10. El sistema debe contar con panel administrativo para moderacion y trazabilidad basica.

## 6. Requerimientos no funcionales
- Seguridad: autenticacion, autorizacion por rol, validacion de entrada, rate limit.
- Escalabilidad: API modular sobre Hono y Bun.
- Disponibilidad inicial objetivo: 99.5% mensual.
- Observabilidad: logging estructurado y alertas basicas.
- Calidad: pruebas E2E con Playwright y CI en GitHub Actions.

## 7. Reglas de negocio iniciales
1. Un terreno puede tener uno o mas usos permitidos (ejemplo: agricultura, ganaderia).
2. Un terreno no puede aprobar dos alquileres que se solapen en tiempo.
3. Solo el propietario del terreno puede aprobar o rechazar solicitudes de ese terreno.
4. Usuarios bloqueados no pueden publicar ni solicitar alquiler.
5. Toda solicitud debe tener estado: draft, pending_owner, approved, rejected, cancelled.

## 8. KPI del MVP
- Tiempo medio desde solicitud hasta decision.
- Tasa de aprobacion de solicitudes.
- Numero de terrenos activos por categoria.
- Conversion de visita a solicitud.

## 9. Riesgos
- Datos incompletos en publicaciones.
- Conflictos por disponibilidad no actualizada.
- Riesgo legal por condiciones de uso no claras.

## 10. Preguntas abiertas para cerrar antes de desarrollo
1. Que datos minimos legales deben pedirse para Panama?
2. Habra verificacion de identidad para publicar terrenos desde fase 1?
3. Que proveedor de pagos se prioriza para Panama en fase 1?

## 11. Decisiones confirmadas
1. Pais inicial: Panama.
2. Moneda operativa: USD/PAB (paridad 1:1).
3. Pagos: dentro de la plataforma desde fase 1.
4. Flujo de colaboracion: trabajo por issues/tickets + PR.
5. Merge a main: requiere 1 aprobacion obligatoria.
6. Descubrimiento del catalogo: listado + mapa con filtros en MVP.
7. Chat: mixto (interno + externo via WhatsApp con telefono).
8. Acceso: login opcional para ver, obligatorio para acciones transaccionales.

## 12. Cuenta admin inicial (solo desarrollo)
- Email semilla local: terradmin@gmail.com
- Password temporal local: 123

Regla obligatoria:
- No usar credenciales temporales en produccion.
- Rotar password y mover secretos a variables de entorno antes del primer despliegue real.
