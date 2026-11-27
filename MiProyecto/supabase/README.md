# Supabase — Guía paso a paso para crear y conectar la base de PuntualiX

Tiempo estimado: 20 minutos. No necesitas instalar nada adicional: todo se hace desde el navegador,
salvo el paso 8 (opcional).

## Contenido de esta carpeta

| Archivo | Qué hace |
|---|---|
| `migrations/01_tipos_y_tablas.sql` | Tipos (enum), 21 tablas e índices |
| `migrations/02_funciones_y_triggers.sql` | Reglas de negocio: perfiles automáticos, validaciones, alertas, historial, bitácora |
| `migrations/03_vistas.sql` | Vistas de estadísticas (asistencia por aprendiz, ficha, competencia y cumplimiento docente) |
| `migrations/04_seguridad_rls.sql` | Permisos por rol (Row Level Security) |
| `migrations/05_storage.sql` | Buckets de archivos: justificaciones, materiales, reportes, avatares |
| `migrations/06_datos_iniciales.sql` | Catálogos: sedes, áreas, programas, competencias, umbrales 10/20/30 % |
| `migrations/07_comentarios.sql` | Descripción de cada tabla y columna (fuente del diccionario de datos) |
| `migrations/08_usuarios_demo.sql` | **Opcional**: 3 usuarios de prueba y una ficha con asistencias |
| `DICCIONARIO_DATOS.md` | Diccionario de datos (generado con `npm run docs:diccionario`) |
| `tests/` · `scripts/` | Pruebas automáticas del SQL (`npm run test:db`) y generador del diccionario |

---

## Paso 1 — Crear el proyecto

1. Entra a <https://supabase.com> e inicia sesión (puedes usar tu cuenta de GitHub).
2. Pulsa **New project**.
3. Completa:
   - **Name:** `puntualix`
   - **Database Password:** pulsa *Generate a password* y **guárdala** en un lugar seguro.
   - **Region:** `South America (São Paulo)`, la más cercana a Colombia (menor latencia, RNF1).
4. Pulsa **Create new project** y espera 1–2 minutos a que termine.

## Paso 2 — Configurar la autenticación

En el menú izquierdo, abre **Authentication**:

1. **Sign In / Providers → Email:** déjalo activado.
2. **Desactiva "Allow new users to sign up".** En PuntualiX nadie se registra solo: el administrador crea
   instructores (HU02.1) y el instructor crea aprendices (HU02.2).
3. **Policies o Password security** (el nombre depende de la versión del panel): longitud mínima **8** y exigir
   letras y números (RNF2).
4. **URL Configuration:**
   - **Site URL:** `http://localhost:5173`. Cuando despliegues en Vercel, cámbiala por la URL pública.
   - **Redirect URLs:** agrega `http://localhost:5173/**` y, más adelante, `https://TU-APP.vercel.app/**`.
     Sin esto no funciona el enlace de *recuperar contraseña* (HU01.3).

## Paso 3 — Ejecutar los scripts SQL


1. En el menú izquierdo, abre **SQL Editor** y pulsa **New query**.
2. Abre `migrations/01_tipos_y_tablas.sql` en VS Code, copia **todo** el contenido, pégalo y pulsa **Run**.
   Debe aparecer *Success. No rows returned*.
3. Repite con **una consulta nueva por archivo**, en este orden: `02` → `03` → `04` → `05` → `06` → `07`.

> ⚠️ El orden importa: cada archivo usa lo que creó el anterior. Si un archivo falla, lee el mensaje, corrige y
> vuelve a ejecutar **solo ese archivo**. Si el error dice *already exists*, ese archivo ya se había ejecutado.

**Comprobación:**
- **Table Editor:** deben aparecer 21 tablas.
- **Storage:** deben aparecer 4 buckets.
- En **Table Editor → umbrales_alerta** debe haber 3 filas.

## Paso 4 — (Opcional) Usuarios de prueba

1. Abre **Authentication → Users → Add user → Create new user** y crea estos tres usuarios. Activa
   **Auto Confirm User** y usa una contraseña de al menos 8 caracteres:
   - `admin@puntualix.com`
   - `carlos.perez@puntualix.com`
   - `juan.perez@puntualix.com`
2. En **SQL Editor**, ejecuta `migrations/08_usuarios_demo.sql`. El script asigna los roles administrador,
   instructor y aprendiz, y crea la ficha **301002** con 5 sesiones. El aprendiz tiene 2 inasistencias (40 %), así
   que ya verás una **alerta automática de prioridad alta**.

## Paso 5 — Copiar las credenciales al proyecto

1. Abre **Project Settings** (ícono de engranaje) → **API Keys** o **Data API**, según la versión del panel.
2. Copia:
   - **Project URL**, con la forma `https://xxxxxxxx.supabase.co`.
   - La llave **anon** / **publishable**, que empieza por `eyJ...` o `sb_publishable_...`.

   > 🔒 **Nunca** copies la llave `service_role` / `secret` en el front-end: salta todos los permisos.
3. En la carpeta `MiProyecto/`, copia `.env.example` con el nombre `.env.local` y pega los valores:
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
   `.env.local` está en `.gitignore` y no se sube al repositorio.

## Paso 6 — Probar la conexión

```bash
cd MiProyecto
npm install      # solo la primera vez
npm run dev
```

Abre <http://localhost:5173>. Debe aparecer **"Conexión correcta"**. Según lo que veas:
- **"Faltan las credenciales":** revisa el nombre del archivo (`.env.local`) y reinicia `npm run dev`.
- **Un error que menciona `umbrales_alerta`:** no se ejecutaron los scripts del paso 3.

## Paso 7 — Configurar Vercel (al desplegar)

En **Vercel → Project → Settings → Environment Variables**, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
con los mismos valores. Después actualiza la *Site URL* y las *Redirect URLs* del paso 2.

## Paso 8 — (Recomendado) Generar los tipos de TypeScript

Esto activa el autocompletado de tablas y columnas en el editor:

```bash
npx supabase login
npx supabase gen types typescript --project-id TU_PROJECT_ID --schema public > src/types/database.types.ts
```

El `project-id` es la parte `xxxxxxxx` de la Project URL. Repite este comando cada vez que cambie el esquema.

---

## Cómo funciona la seguridad (resumen)

- **Supabase Auth** guarda correos y contraseñas cifradas. La tabla `perfiles` guarda el resto de datos y el rol.
- **El rol nunca lo decide el usuario.** Al crear una cuenta, el trigger lee el rol desde `app_metadata`, que solo
  puede escribir el servidor. Un trigger impide que alguien que no sea administrador cambie su propio rol.
- **RLS:** cada consulta del navegador se filtra según quién la hace:
  - **Administrador:** ve todo.
  - **Instructor:** ve solo las fichas donde es líder o está asignado.
  - **Aprendiz:** ve solo su información y la de su ficha.
- **Reglas que se aplican en la base**, aunque el front-end tenga un error:
  - La fecha y hora de cada asistencia las pone el servidor (RF09).
  - Toda justificación nace *pendiente*.
  - Al aprobar una justificación, la asistencia pasa a *justificada*.
  - El historial de justificaciones se escribe solo (RF12).
  - La bitácora no se puede editar ni borrar (RF19).
- **Alertas (RF16):** al registrar una asistencia se recalcula el % de inasistencias del aprendiz y de la ficha.
  Si se supera un umbral activo de `umbrales_alerta`, se crea la alerta y se notifica a los responsables.

## Pendiente para próximas etapas

- **Crear usuarios desde la app** (HU02.1 y HU02.2). Con la llave pública no se pueden crear cuentas de otras
  personas, así que se hará con una **Edge Function** que use la llave `service_role` en el servidor. Está
  planificado para la Etapa 1 y la Etapa 3. Mientras tanto, los usuarios se crean desde el panel (paso 4).
- **Generar archivos PDF y XLSX de reportes:** Etapa 5.

## Verificar el SQL sin Supabase

```bash
npm run test:db            # ejecuta todas las migraciones en una base local y prueba 38 reglas por rol
npm run docs:diccionario   # regenera DICCIONARIO_DATOS.md desde el esquema
```

---

## Edge Function `invitar-usuario` (Etapa 3: registrar usuarios)

Crear cuentas necesita la llave `service_role`, que **nunca** puede estar en el navegador. Por eso el registro de
instructores, aprendices y administradores pasa por esta función, que corre en los servidores de Supabase:
`supabase/functions/invitar-usuario/index.ts`.

**Qué hace:** comprueba que quien llama es un administrador activo, valida los datos, verifica que el correo y el
documento no existan, envía la **invitación por correo**, asigna el rol (y los datos de instructor) y lo registra en
la bitácora. Si algo falla después de crear la cuenta, la elimina para no dejar cuentas a medias.

### Desplegarla (una sola vez, y cada vez que cambie el archivo)

Desde la carpeta `MiProyecto/`:

```bash
npx supabase login                      # abre el navegador para autorizar (solo la primera vez)
npx supabase functions deploy invitar-usuario --project-ref TU-ID-DE-PROYECTO
```

`TU-ID-DE-PROYECTO` es el código de 20 letras de la Project URL (`https://ESTE-CODIGO.supabase.co`).
No hay que configurar variables: Supabase entrega a la función `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

Mientras no esté desplegada, la app muestra: *"El servicio de invitaciones no está disponible…"*.

### El correo de invitación

1. **Redirect URLs** (Authentication → URL Configuration): debe incluir `http://localhost:5173/**` (y la URL de
   Vercel cuando se publique). El correo lleva a `/restablecer?invitacion=1`, donde el usuario crea su contraseña.
2. **Límite del correo de Supabase:** el servidor de correo incluido solo envía unos pocos mensajes por hora y,
   en proyectos nuevos, **solo a correos de miembros del equipo del proyecto**. Para invitar a instructores y
   aprendices reales configure un SMTP propio en **Authentication → Emails → SMTP Settings** (por ejemplo Gmail con
   contraseña de aplicación, Resend o Brevo).
3. Opcional: personalice la plantilla **Invite user** en **Authentication → Emails → Templates** (en español).
