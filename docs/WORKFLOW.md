# Flujo de trabajo por Issues y PR

## 1. Modelo de trabajo
Se trabajara en ciclos cortos por issue/ticket.

Regla:
- Ningun cambio entra a main sin PR y revision de al menos 1 companero.

## 2. Estructura de ramas
- main: estable
- develop: integracion (opcional, segun tamano del equipo)
- feature/<issue-id>-<slug>
- fix/<issue-id>-<slug>
- chore/<slug>

Convencion por modulo:
- feature/landing/<issue-id>-<slug>
- feature/app-web/<issue-id>-<slug>
- feature/admin-dashboard/<issue-id>-<slug>
- feature/backend-api/<issue-id>-<slug>

## 3. Flujo operativo
1. Crear issue con alcance y criterios de aceptacion.
2. Asignar responsable y prioridad.
3. Crear rama desde main.
4. Implementar cambios atomicos.
5. Abrir PR referenciando el issue.
6. Pasar checks automaticos (CI).
7. Recibir aprobacion de otro companero.
8. Hacer squash merge.

## 4. Definiciones
Definition of Ready (DoR):
- Alcance claro.
- Criterios de aceptacion medibles.
- Dependencias identificadas.

Definition of Done (DoD):
- Criterios cumplidos.
- Tests relevantes en verde.
- Revisado y aprobado por otro miembro.
- Documentacion actualizada si aplica.

## 5. Politica de PR
Minimo requerido:
- 1 revisor obligatorio.
- Todos los checks de GitHub Actions en verde.
- Prohibido merge directo a main.

Recomendado:
- No hay limite fijo de lineas por PR.
- Si una entrega es muy grande, se recomienda dividirla por dominio o por etapas para facilitar la revision.
- Un PR debe resolver un solo issue principal.

## 6.1 Trabajo por modulos e issues
Etiquetas recomendadas:
- module:landing
- module:app-web
- module:admin-dashboard
- module:backend-api
- module:shared

Plantilla de plan por issue:
1. Objetivo funcional
2. Alcance tecnico
3. Criterios de aceptacion
4. Riesgos
5. Evidencia esperada

## 6. Branch protection (configuracion en GitHub)
Configurar para main:
- Require a pull request before merging.
- Require approvals: 1.
- Dismiss stale approvals when new commits are pushed.
- Require status checks to pass before merging.
- Require conversation resolution before merging.
- Restrict who can push directly a main.

## 7. CI minima en GitHub Actions
Checks sugeridos:
- install
- lint
- test unit/integration
- playwright e2e (smoke)
- security scan basico (dependencias)

## 8. Estrategia de repositorio
Se adopta una estrategia de monorepo con submodulos Git para separar ownership por modulo.

Propuesta inicial:
- apps/landing (submodulo opcional)
- apps/app-web (submodulo opcional)
- apps/admin-dashboard (submodulo opcional)
- apps/backend-api (submodulo opcional)
- packages/shared (directorio interno del monorepo)

Nota:
- Si el equipo prefiere simplicidad operativa, se puede migrar a monorepo puro sin submodulos mas adelante.
