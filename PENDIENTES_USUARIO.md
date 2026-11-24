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

### 1. Aplicar la migración 09 en Supabase
Hace que solo el instructor líder de una ficha pueda activar o desactivar el acceso de un aprendiz (HU02.4).
1. En el panel de Supabase, abre **SQL Editor** y luego **New query**.
2. Pega todo el contenido de `front-end/supabase/migrations/09_acceso_aprendiz_lider.sql` y pulsa **Run**.
3. Debe responder "Success. No rows returned". Se puede ejecutar varias veces sin problema.

### 2. Redesplegar la Edge Function `invitar-usuario`
Cambió para que el instructor pueda registrar aprendices en sus fichas.
```bash
npx supabase functions deploy invitar-usuario --project-ref ckppdfnzgbnwrnqrzkdx
```
Responde **Yes** a la pregunta. El aviso de Docker no importa. Debe terminar con "Deployed Functions".

### 3. Cargar las fichas de demostración (si aún no lo hiciste)
Son 10 fichas, 6 instructores y 182 aprendices de prueba, para estadísticas, reportes y el módulo Instructor.
1. En **SQL Editor** y **New query**, pega todo el contenido de `front-end/supabase/datos_demo_fichas.sql` y pulsa **Run**.
2. Al final aparece un aviso con lo que se creó. Si ya estaban cargadas, el aviso dice que no se hizo ningún cambio.
3. Para borrarlas más adelante, usa las 3 líneas que vienen en el encabezado del archivo.

### 4. Contraseña de los usuarios de prueba
Los usuarios son `admin@puntualix.com`, `carlos.perez@puntualix.com` (instructor) y `juan.perez@puntualix.com`
(aprendiz). Sus correos no son reales, así que "Recuperar contraseña" no les llega.
- Si no recuerdas la contraseña, ve a **Authentication**, luego **Users**, abre el usuario y cámbiala (mínimo 8
  caracteres, con letras y números).
- Los instructores y aprendices de las fichas demo no tienen contraseña y no pueden iniciar sesión.

### 5. Pruebas manuales
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
- **Instructor (`carlos.perez@puntualix.com`), después de las tareas 1 a 3**
  - [ ] Fichas: el listado muestra solo sus fichas; prueba los filtros.
  - [ ] Ficha 2901102 (es líder), pestaña Aprendices:
    - abrir el historial de un aprendiz;
    - desactivar y reactivar su acceso.
  - [ ] Ficha 2901101 (solo está asignado): el botón de acceso no debe aparecer.
  - [ ] Registrar aprendiz con un correo real tuyo, en una ficha activa.
    - Debe llegar la invitación y el aprendiz debe aparecer matriculado.
    - Sin SMTP propio, Supabase solo envía a correos del equipo de la organización (ver tarea 7).
- [ ] Si algo falla, anota la pantalla, qué hiciste y el mensaje, y pásalo al chat de desarrollo.

### 6. Borrar la carpeta `claude/` (sin punto) de la raíz
Es una copia vieja del agente. El agente que se usa está en `.claude/agents/revisor-refactor.md`, que no se borra.

### 7. (Cuando puedas) Configurar SMTP propio
Para que las invitaciones lleguen a cualquier correo:
1. En el panel, abre **Authentication**, luego **Emails** y luego **SMTP Settings**.
2. Usa Gmail con contraseña de aplicación, Resend o Brevo.
