# README_INSTALL — instalar, probar y publicar Costacky

Este documento es para **mantenedores**. El README principal (`README.md`) está dirigido a las personas que instalan y usan Costacky.

## Estructura de publicación

La carpeta `costacky/` es la raíz del repositorio marketplace:

```text
costacky/
├── .claude-plugin/marketplace.json  # catálogo del marketplace
├── plugin/                          # raíz del plugin Costacky
│   ├── .claude-plugin/plugin.json
│   ├── skills/
│   ├── agents/
│   ├── workflows/
│   └── scripts/
├── README.md                        # guía para usuarios
└── README_INSTALL.md                # guía para mantenedores
```

El `source: "./plugin"` de `marketplace.json` es relativo a la raíz del marketplace. Por eso, al probar una sesión local se pasa `plugin/` a `--plugin-dir`, no la raíz `costacky/`.

## Probar localmente sin publicar

Desde PowerShell, cambia a la carpeta `costacky` y carga el plugin para una sola sesión:

```powershell
cd C:\ruta\al\repositorio\costacky
claude --plugin-dir .\plugin
```

En la TUI:

1. Ejecuta `/plugin` y confirma que Costacky está cargado como plugin `inline`.
2. Ejecuta `/costacky:setup`; el preflight no instala ni reconfigura herramientas sin autorización.
3. Prueba `/costacky:workflow <solicitud>` con una tarea sencilla.
4. Para probar Dynamic Workflow, pide una tarea de análisis inocua, revisa el plan y apruébalo antes de ejecutar `/costacky:execute-work`.
5. Después de editar archivos del plugin, ejecuta `/reload-plugins` o inicia otra sesión con `--plugin-dir`.

`--plugin-dir` no instala el plugin ni lo habilita en sesiones futuras. Tampoco muestra el diálogo de `userConfig`; para probar esa configuración usa un plugin instalado desde un marketplace y `/plugin configure costacky`.

### Instalar globalmente desde la copia local

Para habilitar Costacky en todos los proyectos de **tu usuario** antes de publicar en GitHub, registra la carpeta local como marketplace e instala el plugin con scope `user`:

```powershell
cd C:\ruta\al\repositorio\claude_agente_custom
claude plugin marketplace add .\costacky
claude plugin install costacky@costacky --scope user
```

Abre una sesión nueva o ejecuta `/reload-plugins`; comprueba la instalación con `/plugin`. Al ser un marketplace local con `source: "./plugin"`, Claude Code carga el plugin desde esa carpeta. Esto instala para el usuario actual, no para otras cuentas de Windows. Para quitarlo después, usa `claude plugin uninstall costacky@costacky --scope user`. Si ya no usarás el catálogo local, puedes ejecutar `claude plugin marketplace remove costacky`; ten en cuenta que quitar el marketplace también desinstala los plugins que se instalaron desde él.

Después de publicar el marketplace, sustituye la ruta local por GitHub:

```powershell
claude plugin marketplace add <owner>/costacky
claude plugin install costacky@costacky --scope user
```

Claude Code debe estar instalado y autenticado para hacer solicitudes al modelo. No se requiere una cuenta paga de Anthropic para publicar un marketplace propio en GitHub; sí puede haber requisitos de plan para enviar un plugin al directorio oficial.

### Cambiar de instalación local a la remota

Si ya tenés Costacky instalado desde la copia local y querés pasar a la versión del repositorio remoto, seguí estos pasos:

```powershell
# 1. Desinstalar el plugin local
claude plugin uninstall costacky@costacky --scope user

# 2. (Opcional) Quitar el marketplace local
claude plugin marketplace remove costacky

# 3. Agregar el marketplace remoto
claude plugin marketplace add JaimeHoracio/Costacky

# 4. Instalar desde el repo remoto
claude plugin install costacky@costacky --scope user
```

Luego reiniciá Claude Code (o ejecutá `/reload-plugins`) y verificá con `/plugin` y `/costacky:workflow`.

Nota: si ya tenés sesiones con la versión local, las skills/plugins de esa versión dejarán de estar disponibles tras el uninstall; las nuevas sesiones usarán la del repo remoto. También podés fijar una ref específica (ej. `JaimeHoracio/Costacky@v0.1.0`) si querés pin de versión.

## Validar antes de publicar

Desde la raíz de `costacky/`:

```powershell
node --test plugin/tests/*.test.mjs
claude plugin validate .
claude plugin validate .\plugin --profile directory
```

La validación del plugin puede advertir que falta un icono. Es una advertencia de presentación, no un fallo de carga. Si se agrega un icono, debe cumplir el formato y dimensiones que indique el validador actual.

Revisa además el diff y confirma que:

- `marketplace.json` mantiene `source: "./plugin"`;
- el nombre de entrada del marketplace y `plugin.json` siguen siendo `costacky`;
- no se agregaron credenciales, MCP servers duplicados ni permisos `Bash` persistentes;
- las instrucciones CodeGraph/Engram continúan recomendando sus instaladores oficiales y requieren consentimiento;
- el índice `.codegraph/` de cada proyecto se conserva.

## Publicar en un marketplace propio de GitHub

1. Crea un repositorio GitHub, normalmente llamado `costacky`, y publica **el contenido de esta carpeta** en la rama predeterminada. Se recomienda que la rama predeterminada sea `main`.
2. No hace falta registrar el plugin con Anthropic: al subir `.claude-plugin/marketplace.json`, el marketplace propio queda disponible para quienes puedan acceder al repositorio.
3. Indica a los usuarios que ejecuten:

   ```powershell
   claude plugin marketplace add <owner>/costacky
   claude plugin install costacky@costacky --scope user
   ```

   Para compartir la instalación con el proyecto, el usuario puede elegir `--scope project` en vez de `--scope user`. Los repositorios privados requieren que quien instala tenga acceso Git a ellos.

4. Para actualizar el marketplace instalado, el usuario ejecuta:

   ```powershell
   claude plugin update costacky@costacky
   ```

   El auto-update para marketplaces propios está desactivado por defecto y lo controla cada usuario.

## Rama `main`, versión del plugin y tags

Costacky usa un **source relativo** (`./plugin`), así que el plugin y el catálogo se obtienen de la misma revisión del marketplace. `claude plugin marketplace add <owner>/costacky` usa la rama predeterminada del repo; dejar `main` como predeterminada hace que las instalaciones sigan esa línea. También se puede fijar una ref explícita al agregar el marketplace, por ejemplo `owner/costacky@main`.

La versión actual está fijada en `plugin/.claude-plugin/plugin.json`:

```json
"version": "0.1.0"
```

**Hay que incrementar ese valor en cada release** (`0.1.1`, `0.2.0`, etc.). El campo `version` del manifest tiene prioridad para determinar si el plugin cambió. Si se publican commits nuevos dejando `0.1.0`, `claude plugin update` puede indicar que ya está en la última versión y mantener la copia anterior.

Proceso recomendado de release:

1. Cambia la versión en `plugin/.claude-plugin/plugin.json` y actualiza `CHANGELOG.md`.
2. Ejecuta tests y validaciones.
3. Haz commit y push a `main`.
4. Opcionalmente crea un tag de Git que corresponda a la versión, por ejemplo `v0.1.1`, y publícalo:

   ```powershell
   git tag v0.1.1
   git push origin main --tags
   ```

El tag es una etiqueta útil para releases, trazabilidad y rollback, pero **Claude Code no busca ni elige automáticamente el tag más reciente**. Los usuarios que agregan el marketplace sin ref siguen la rama predeterminada; los que agregan `owner/costacky@v0.1.1` fijan el marketplace a esa ref y no avanzan solos a `v0.1.2`.

## Directorio oficial de Anthropic (opcional)

Es un canal separado de tu marketplace GitHub. Para someter Costacky al directorio de claude.ai/Cowork se necesita una cuenta elegible con plan de pago y completar el proceso de revisión en el portal de desarrolladores. No es necesario para distribuirlo mediante tu propio marketplace, y la aprobación oficial no debe darse por garantizada.

## Referencias oficiales

- [Publicar y distribuir plugins](https://code.claude.com/docs/en/plugins/publish.md)
- [Referencia de marketplace](https://code.claude.com/docs/en/plugins/marketplace-reference.md)
- [Versiones y actualizaciones](https://code.claude.com/docs/en/plugins/loading.md#versions-and-updates)
- [Validar un plugin](https://code.claude.com/docs/en/plugins/create.md#test-and-debug)
