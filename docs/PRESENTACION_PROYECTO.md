# TerraShare

TerraShare está montado como una plataforma por capas, no como una aplicación monolítica. La idea central es separar la experiencia de usuario, la lógica de negocio y la persistencia para que cada parte evolucione sin romper las demás. Por eso el repositorio está dividido en `apps/web`, `apps/backend-api` y `packages/shared`. El frontend compone la interfaz y los estados de navegación; el backend concentra las reglas de negocio, la validación y los permisos; y el paquete compartido evita duplicar contratos entre cliente y servidor.

## Arquitectura

La arquitectura sigue un modelo de aplicación web con una API central. `apps/web` reúne en una sola interfaz las vistas públicas, el catálogo, el dashboard de usuario y el panel administrativo. `apps/backend-api` expone los servicios del dominio bajo `/api/v1` y funciona como la capa que toma decisiones importantes: qué datos devolver, qué acciones permitir y cómo aplicar las reglas de acceso. Esa separación hace que la UI pueda cambiar sin tocar la lógica crítica, y también que el backend pueda escalar sin depender de detalles visuales.

En términos de diseño, la aplicación no se construyó para que el navegador sea el centro de la lógica. El navegador orquesta interacción, filtros y navegación, pero el comportamiento importante vive en la API. Eso es útil porque mantiene un límite claro entre presentación y negocio, y además deja la base preparada para crecer por módulos sin mezclar responsabilidades.

## Conexiones

La comunicación entre frontend y backend se hace por HTTP y JSON. El frontend consume la API con una URL base configurable por variables de entorno, y el backend responde con rutas versionadas bajo `/api/v1`. El navegador no toca la base de datos directamente: siempre pasa por la API, que valida la solicitud, aplica reglas y devuelve la respuesta ya procesada.

En la capa de identidad, Clerk actúa como proveedor de autenticación y control de acceso. El backend usa esa identidad para decidir qué puede hacer cada usuario, y también diferencia entre vistas públicas, dashboard y administración. Stripe entra en el flujo de pagos como servicio externo, así que el backend se apoya en webhooks y en endpoints específicos para cerrar el circuito de cobro. Todo esto se configura con variables de entorno, lo que permite mover el mismo código entre local, pruebas y producción sin cambiar la base del proyecto.

## Base de datos

La persistencia principal es MongoDB. Ahí se guardan usuarios, terrenos, solicitudes de alquiler, contratos, pagos, chats, auditoría y leads. El modelo encaja bien con documentos porque cada entidad tiene campos propios y no todas comparten la misma estructura. Además, el backend define índices sobre campos frecuentes como `id`, `ownerId`, `tenantId`, `status` y `email`, para que las consultas importantes se mantengan rápidas y consistentes.

La capa de datos está pensada para no bloquear el desarrollo. Cuando MongoDB está disponible, la API trabaja contra la base real; cuando no, algunas rutas pueden apoyarse en memoria para desarrollo local o pruebas controladas. También existen seeds para levantar datos de ejemplo y validar flujos sin depender de carga manual. En otras palabras, la base real está pensada para producción, pero el entorno local sigue siendo usable y reproducible.

## Catálogo y mapa

La sección de catálogo no es solo una lista de terrenos; está pensada como un espacio de exploración visual. `CatalogPage` carga los terrenos una vez desde la API con `listLands()`, y luego aplica filtros en memoria por uso, provincia, precio y búsqueda textual. Esa decisión hace que la lista y el mapa siempre trabajen sobre el mismo conjunto de datos filtrados, en lugar de manejar estados separados que puedan desincronizarse.

El mapa vive en `PanamaMap` y usa Leaflet como motor geográfico. La vista se construye con `MapContainer` como contenedor principal, `TileLayer` para la base cartográfica, `Marker` y `Popup` para cada terreno, y `GeoJSON` para pintar las provincias de Panamá a partir de `panama-provinces.geojson`. Además, `ProvinceLayer` colorea cada provincia según la cantidad de terrenos disponibles, y `MapController` usa `useMap()` para hacer `flyTo` cuando se selecciona un terreno. La posición de cada marker se obtiene con `getLandPosition`, así que el mapa no es decorativo: es una vista sincronizada con el catálogo. Si el GeoJSON no carga, la app sigue funcionando con los markers, porque el mapa es una representación de los datos, no la fuente de verdad.

La relación entre lista y mapa es clave. El estado `selectedId` define qué terreno está activo, y ese mismo estado hace que el card y el marker seleccionado se mantengan alineados. Eso convierte el catálogo en una interfaz de navegación geográfica, donde el usuario puede filtrar, comparar y abrir detalle sin perder contexto visual.

## Tests

La estrategia de pruebas está orientada a proteger los flujos reales de la plataforma. Playwright se usa para validar recorridos de usuario en navegador, tanto en páginas públicas como en rutas protegidas. GitHub Actions ejecuta build y smoke tests para detectar fallos antes de que el cambio llegue a `main`. El backend también tiene pruebas de rutas y lógica base, para asegurar que la API siga respondiendo como espera el frontend.

Lo importante aquí no es solo comprobar que el proyecto compile, sino que sigan funcionando las piezas que más suelen romperse en una app de este tipo: navegación, autenticación, filtros, permisos y comunicación entre frontend, backend y persistencia. Esa combinación de tests hace que el sistema sea más confiable y que los cambios futuros tengan una red de seguridad real.
