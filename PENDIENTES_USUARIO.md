# Pendientes del usuario (tareas operativas)

> Archivo vivo. Lo mantiene Claude en el chat de desarrollo: cuando termines una tarea, avísale y la quitará de
> aquí; cuando aparezca una nueva, la agregará. Para hacerlas, abre **otro chat** y pásale este archivo
> ("haz las tareas de PENDIENTES_USUARIO.md"). Las conversaciones de desarrollo son solo para código.
>
> Última actualización: 2026-11-24 · rama `react-supabase`

## Contexto para el otro chat
- Proyecto: PuntualiX 2.0, en `front-end/` (React, TypeScript y Supabase). Proyecto de Supabase: `ckppdfnzgbnwrnqrzkdx`.
- La app usa solo la anon key (`front-end/.env.local`). La `service_role` nunca se pega en el código ni en el chat.
- El CLI de Supabase ya tiene la sesión iniciada en este equipo. Si pide login: `npx supabase login`.
- Todos los comandos se ejecutan dentro de `front-end/`.

## Tareas, en este orden

### ★ Preguntar al instructor del SENA por el back-end (bloquea el desarrollo del paso 6b)
El SENA pide una carpeta `back-end/` escrita en un lenguaje de programación, para que la lógica no quede en el
front-end. Hay que preguntarle:
1. ¿Sirve Supabase como back-end? Es la base PostgreSQL con las reglas en PL/pgSQL (triggers y RLS) más funciones en
   TypeScript, todo dentro de `back-end/`. ¿O exige una API propia?
2. Si exige una API: ¿en qué lenguaje? Puede ser Node.js con Express, Python, Java o PHP.
3. ¿Pide una arquitectura concreta, como MVC, REST o capas?

Lleva la respuesta al chat de desarrollo. Las opciones y lo que cambia cada una están en `CONTEXTO_NUEVO_CHAT.md`,
sección 6.

### 0. Arreglar el despliegue en Vercel (en curso: el login falla)
Decisión del usuario (2026-11-24): el código se publica en `https://github.com/iverfuenfuen/-PuntualiX`, **solo con el
contenido de `front-end/`** y su historial. Ya está subido en `main`. El repositorio de la organización `puntualix-design`
no se usa porque la cuenta no tenía permiso, y el viejo `iverfuenfuen/Puntualix2.0` se deja como está.

**Estado (2026-11-24):** el proyecto de Vercel `puntuali-x` ya existe y despliega con el preset **Vite** (no Create
React App). Al iniciar sesión aparece "No fue posible conectar con el servidor". En la consola del navegador se ven
`Failed to load resource: net::ERR_CONNECTION_REFUSED` a **`localhost:54321/auth/v1/token?grant_type=password`**.

**Diagnóstico:** el build de Vercel quedó con `VITE_SUPABASE_URL` apuntando a un Supabase local (`localhost:54321`),
no al proyecto en la nube. El archivo local `front-end/.env.local` está bien y apunta a
`https://ckppdfnzgbnwrnqrzkdx.supabase.co`. El código no se toca.

**Pasos para arreglarlo:**
1. En Vercel, abre el proyecto `puntuali-x` y ve a **Settings → Environment Variables**.
2. Deja `VITE_SUPABASE_URL` exactamente en `https://ckppdfnzgbnwrnqrzkdx.supabase.co`, sin `/` final, sin comillas y
   sin espacios.
3. Comprueba que `VITE_SUPABASE_ANON_KEY` sea la misma llave de `front-end/.env.local` (empieza con `eyJ`). Nunca pongas
   la `service_role`. En ambas variables marca Production, Preview y Development.
4. Si hay variables que no se agregaron a mano (`SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_*`, `POSTGRES_*`), viene de la
   integración de Supabase en Vercel. Quítala en **Settings → Integrations**: la app no la usa.
5. Ve a **Deployments**, abre el último y elige **⋯ → Redeploy**, sin la caché de build. Hay que volver a desplegar
   porque Vite copia las variables dentro del código al compilar.
6. Recarga con Ctrl + F5 e inicia sesión con `admin@puntualix.com`. En la consola ya no deben salir peticiones a
   `localhost`.
7. Cambia la contraseña del admin, que hoy es débil (`12345678`) y la app ya es pública. Se hace en Supabase, en
   **Authentication → Users**.

**Después, conectar el dominio con Supabase:** copia el dominio que te dé Vercel (p. ej. `puntuali-x.vercel.app`). En
Supabase, abre **Authentication**, luego **URL Configuration**:
   - pon ese dominio en **Site URL**;
   - en **Redirect URLs**, agrega `https://<dominio>/restablecer` y `https://<dominio>/restablecer?invitacion=1`.
   Sin esto no funcionan las invitaciones ni la recuperación de contraseña en producción.

> Usuarios de prueba: `admin@puntualix.com`, `carlos.perez@puntualix.com` (instructor) y `juan.perez@puntualix.com`
> (aprendiz). Si olvidas una contraseña, cámbiala en **Authentication → Users** (sus correos no son reales:
> "Recuperar contraseña" no les llega). Los usuarios de las fichas demo no pueden iniciar sesión.

### 1. Pruebas manuales
Arranca la app con `npm run dev` y abre http://localhost:5173.

- **Admin (`admin@puntualix.com`)**
  - [ ] Fichas: registrar, actualizar, desactivar, asignar instructor y matricular (Etapa 2).
  - [ ] Dashboard, alertas, umbrales y bitácora (Etapa 4).
  - [ ] Estadísticas:
    - cambiar de corte;
    - en "Comparar", elegir hasta 5 fichas con las casillas;
    - elegir la estadística "Deserción";
    - elegir la dimensión "Instructor" y comparar 5;
    - cambiar la comparativa global a "Cumplimiento";
    - ver la deserción por sede o por ficha.
  - [ ] Reportes: generar el de la ficha 301002, abrir la hoja, guardarla como PDF, bajar el CSV y comprobar que la
    descarga queda en la Bitácora (Etapa 5).
- **Instructor (`carlos.perez@puntualix.com`)**
  - [ ] Fichas: el listado muestra solo sus fichas; prueba los filtros.
  - [ ] Ficha 2901102 (es líder), pestaña Aprendices:
    - abrir el historial de un aprendiz;
    - desactivar y reactivar su acceso.
  - [ ] Ficha 2901101 (solo está asignado): el botón de acceso no debe aparecer.
  - [ ] Registrar aprendiz con un correo real tuyo, en una ficha activa.
    - [x] Llega la invitación (probado en Vercel el 2026-11-24).
    - [ ] Abrir el enlace, crear la contraseña, entrar como el aprendiz y ver que aparece matriculado en la ficha.
- [ ] Si algo falla, anota la pantalla, qué hiciste y el mensaje, y pásalo al chat de desarrollo.

### 2. Borrar la carpeta `claude/` (sin punto) de la raíz
Es una copia vieja del agente. El agente que se usa está en `.claude/agents/revisor-refactor.md`, que no se borra.

### 3. Subir el límite de correos (si aún no lo hiciste)
El SMTP con Brevo ya funciona (2026-11-24). Falta solo: Supabase → **Authentication → Rate Limits** → "Rate limit
for sending emails" a ~30 por hora. No reactives en Brevo el bloqueo de IP para claves SMTP.

### 4. (Opcional, Etapa 8) Dominio propio
Comprar un dominio (p. ej. `puntualix.com`, 10–15 USD/año), conectarlo a Vercel y autenticarlo en Brevo para que los
correos salgan de `notificaciones@<dominio>` y no caigan en spam. El dominio `*.vercel.app` no sirve para esto.
