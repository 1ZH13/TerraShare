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
- feature/web/<issue-id>-<slug>
- feature/backend-api/<issue-id>-<slug>
- feature/landing/<issue-id>-<slug>
- fix/<issue-id>-<slug>
- chore/<slug>

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
- El body del PR debe incluir keyword de cierre de issue (`Closes #<id>`, `Fixes #<id>` o `Resolves #<id>`).

Recomendado:
- No hay limite fijo de lineas por PR.
- Si una entrega es muy grande, se recomienda dividirla por dominio o por etapas para facilitar la revision.
- Un PR debe resolver un solo issue principal.

## 6.1 Trabajo por modulos e issues
Etiquetas recomendadas:
- module:web (frontend unificado)
- module:backend-api
- module:landing (legacy)
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
- Marcar como requerido el check `Require closing keyword`.
- Require conversation resolution before merging.
- Restrict who can push directly a main.

## 7. CI minima en GitHub Actions
Checks sugeridos:
- install
- lint
- test unit/integration
- playwright e2e (smoke)
- security scan basico (dependencias)

Check implementado para gobernanza de issues:
- `Require closing keyword` (`.github/workflows/require-linked-issue.yml`)
- Valida que el body del PR tenga una keyword de cierre de issue.

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

## 9. Como actualizar el local despues de un merge
Objetivo:
- Que todo el equipo trabaje siempre sobre una base actualizada de `main`.

Paso 1: actualizar `main` local
```bash
git checkout main
git fetch origin
git pull origin main
```

Paso 2: actualizar tu rama de trabajo activa
Opcion recomendada (segura para la mayoria del equipo):
```bash
git checkout feature/<issue-id>-<slug>
git fetch origin
git merge origin/main
```

Opcion alternativa (historial lineal):
```bash
git checkout feature/<issue-id>-<slug>
git fetch origin
git rebase origin/main
```

Paso 3: limpieza de ramas ya fusionadas (opcional)
```bash
git branch -d feature/<rama-ya-mergeada>
git fetch --prune
```

Regla de equipo:
- Antes de iniciar una nueva tarea o abrir un PR, sincronizar primero `main` y despues la rama de trabajo.

## 10. Quien puede revisar un PR
Regla operativa actual:
- No es obligatorio asignar un reviewer manualmente para poder aprobar.
- Cualquier colaborador con permisos `Write`, `Maintain` o `Admin` puede revisar y aprobar.
- Se mantiene el requisito de 1 aprobacion minima antes del merge.

Cuando si conviene asignar reviewer:
- PR con alto impacto (auth, pagos, permisos, migraciones).
- PR grande que toque multiples modulos.
- Cambio que requiera feedback de un especialista del dominio.

Configuracion recomendada en GitHub para mantener este comportamiento:
- `Require a pull request before merging`: habilitado.
- `Require approvals`: 1 o mas.
- `Require review from Code Owners`: deshabilitado (si se desea que revise cualquier colaborador).
- `Require conversation resolution before merging`: habilitado.

Nota:
- Si en el futuro se habilita `CODEOWNERS` obligatorio, entonces si sera necesario que aprueben los owners definidos para las rutas afectadas.

## 11. Edicion segura del body del PR (evitar texto corrupto)
Problema conocido:
- Si se edita el body del PR con archivos temporales en codificacion incorrecta, GitHub puede mostrar caracteres corruptos.

Recomendacion:
- Preferir `gh pr edit <numero> --body "texto"` para cambios directos.
- Si se usa `--body-file`, guardar el archivo explicitamente en UTF-8.

Ejemplo con PowerShell (UTF-8 explicito):
```powershell
$body = @"
## Resumen
- Cambio principal.

Closes #123
"@
$body | Out-File -FilePath pr_body_utf8.md -Encoding utf8
gh pr edit 123 --body-file pr_body_utf8.md
```

Higiene:
- No commitear archivos temporales de cuerpo de PR (`pr_body*.txt`, `pr_body*.md`).
