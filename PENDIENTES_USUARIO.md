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

### 0. Dar permiso de escritura en el repositorio nuevo (bloquea la subida del código)
Decisión del usuario (2026-11-24): el proyecto pasa a la organización, en `https://github.com/puntualix-design/-PuntualiX`,
y **solo con el contenido de `front-end/`**, con su historial. El repositorio viejo `iverfuenfuen/Puntualix2.0` se deja
como está.

El código ya está preparado en la rama local `solo-front-end`, pero la subida falló con un 403: la cuenta guardada en
este equipo es `iverfuenfuen` y no tiene permiso de escritura en ese repositorio.

Para resolverlo, una de dos:
- **Opción A (recomendada):**
  1. En GitHub, abre la organización `puntualix-design`, luego **People** (o **Settings** del repositorio,
     **Collaborators and teams**) y agrega a `iverfuenfuen` con rol **Write** o **Maintain**.
  2. Acepta la invitación desde la cuenta `iverfuenfuen`.
  3. Avísale al chat de desarrollo para que haga el push.
- **Opción B:** súbelo tú con una cuenta que sí tenga permiso. Desde `C:\SENA\Puntualix2.0`:
  `git push puntualix solo-front-end:main`. Si Windows pide credenciales, entra con esa cuenta.

### 0b. Conectar el repositorio nuevo a Vercel (después de la tarea 0)
1. En Vercel, **Add New**, luego **Project** e importa `puntualix-design/-PuntualiX`.
2. **Root Directory:** déjalo en la raíz, porque ahora el repositorio es solo el front-end.
3. **Framework:** Vite. El build y la salida se detectan solos (`npm run build`, `dist`).
4. **Environment Variables:** `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, con los mismos valores de
   `front-end/.env.local`. Nunca la `service_role`.
5. Al terminar, copia el dominio que te dé Vercel. En Supabase, abre **Authentication**, luego **URL Configuration**:
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
    - Debe llegar la invitación y el aprendiz debe aparecer matriculado.
    - Sin SMTP propio, Supabase solo envía a correos del equipo de la organización (ver tarea 3).
- [ ] Si algo falla, anota la pantalla, qué hiciste y el mensaje, y pásalo al chat de desarrollo.

### 2. Borrar la carpeta `claude/` (sin punto) de la raíz
Es una copia vieja del agente. El agente que se usa está en `.claude/agents/revisor-refactor.md`, que no se borra.

### 3. (Cuando puedas) Configurar SMTP propio
Para que las invitaciones lleguen a cualquier correo:
1. En el panel, abre **Authentication**, luego **Emails** y luego **SMTP Settings**.
2. Usa Gmail con contraseña de aplicación, Resend o Brevo.
