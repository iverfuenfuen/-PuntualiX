-- =====================================================================
-- PuntualiX — 07. Comentarios (fuente del Diccionario de Datos)
-- Visibles en Supabase > Table Editor. El archivo DICCIONARIO_DATOS.md
-- se genera a partir de estos comentarios con: npm run docs:diccionario
-- =====================================================================

-- SEDES
comment on table  public.sedes is 'Sedes físicas del centro de formación.';
comment on column public.sedes.id is 'Identificador de la sede.';
comment on column public.sedes.nombre is 'Nombre oficial de la sede (único).';
comment on column public.sedes.direccion is 'Dirección física.';
comment on column public.sedes.activa is 'Indica si la sede está en uso.';
comment on column public.sedes.created_at is 'Fecha de creación del registro.';

-- ÁREAS
comment on table  public.areas is 'Áreas temáticas o de especialidad que agrupan programas e instructores.';
comment on column public.areas.id is 'Identificador del área.';
comment on column public.areas.nombre is 'Nombre del área (único).';
comment on column public.areas.created_at is 'Fecha de creación del registro.';

-- AMBIENTES
comment on table  public.ambientes is 'Ambientes de aprendizaje (aulas, laboratorios) de cada sede. RF05.';
comment on column public.ambientes.id is 'Identificador del ambiente.';
comment on column public.ambientes.sede_id is 'Sede a la que pertenece el ambiente.';
comment on column public.ambientes.nombre is 'Nombre del ambiente (único dentro de la sede).';
comment on column public.ambientes.capacidad is 'Número máximo de aprendices.';
comment on column public.ambientes.created_at is 'Fecha de creación del registro.';

-- PROGRAMAS
comment on table  public.programas is 'Programas de formación del catálogo institucional.';
comment on column public.programas.id is 'Identificador del programa.';
comment on column public.programas.codigo is 'Código oficial del programa SENA (único).';
comment on column public.programas.nombre is 'Nombre del programa de formación.';
comment on column public.programas.nivel is 'Nivel de formación: tecnico, tecnologo, auxiliar, operario, especializacion.';
comment on column public.programas.area_id is 'Área a la que pertenece el programa.';
comment on column public.programas.activo is 'Indica si el programa se oferta actualmente.';
comment on column public.programas.created_at is 'Fecha de creación del registro.';

-- COMPETENCIAS
comment on table  public.competencias is 'Competencias que componen un programa de formación. RF08, RF15.';
comment on column public.competencias.id is 'Identificador de la competencia.';
comment on column public.competencias.programa_id is 'Programa al que pertenece.';
comment on column public.competencias.codigo is 'Código de la competencia (único dentro del programa).';
comment on column public.competencias.nombre is 'Nombre de la competencia.';
comment on column public.competencias.horas is 'Duración en horas.';
comment on column public.competencias.created_at is 'Fecha de creación del registro.';

-- RESULTADOS DE APRENDIZAJE
comment on table  public.resultados_aprendizaje is 'Resultados de aprendizaje (RA) de cada competencia. RF08.';
comment on column public.resultados_aprendizaje.id is 'Identificador del resultado de aprendizaje.';
comment on column public.resultados_aprendizaje.competencia_id is 'Competencia a la que pertenece.';
comment on column public.resultados_aprendizaje.codigo is 'Código del RA (único dentro de la competencia).';
comment on column public.resultados_aprendizaje.descripcion is 'Descripción del resultado esperado.';
comment on column public.resultados_aprendizaje.created_at is 'Fecha de creación del registro.';

-- PERFILES
comment on table  public.perfiles is 'Datos de todos los usuarios. Extiende auth.users (Supabase Auth guarda correo y contraseña cifrada). RF02, CU02.';
comment on column public.perfiles.id is 'Mismo uuid del usuario en auth.users.';
comment on column public.perfiles.tipo_documento is 'Tipo de documento: CC, TI, CE, PPT.';
comment on column public.perfiles.numero_documento is 'Número de documento (único junto con el tipo).';
comment on column public.perfiles.nombres is 'Nombres del usuario.';
comment on column public.perfiles.apellidos is 'Apellidos del usuario.';
comment on column public.perfiles.correo is 'Correo de acceso (copiado de auth.users, único).';
comment on column public.perfiles.telefono is 'Teléfono de contacto.';
comment on column public.perfiles.rol is 'Rol: administrador, instructor o aprendiz. Solo lo cambia un administrador (HU02.3).';
comment on column public.perfiles.estado is 'activo / inactivo. Un usuario inactivo no puede operar, pero conserva su historial (HU02.4).';
comment on column public.perfiles.sede_id is 'Sede principal del usuario.';
comment on column public.perfiles.avatar_url is 'Ruta de la foto de perfil (bucket avatares).';
comment on column public.perfiles.created_at is 'Fecha de creación del registro.';
comment on column public.perfiles.updated_at is 'Fecha de la última modificación (automática).';

-- INSTRUCTORES
comment on table  public.instructores is 'Datos propios del rol instructor (relación 1:1 con perfiles). HU02.1.';
comment on column public.instructores.id is 'uuid del perfil del instructor.';
comment on column public.instructores.area_id is 'Área de desempeño.';
comment on column public.instructores.especialidad is 'Especialidad del instructor.';
comment on column public.instructores.fecha_ingreso is 'Fecha de vinculación a la institución.';
comment on column public.instructores.created_at is 'Fecha de creación del registro.';

-- FICHAS
comment on table  public.fichas is 'Fichas (grupos) de formación. CU10, RF04-RF06.';
comment on column public.fichas.id is 'Identificador interno de la ficha.';
comment on column public.fichas.numero is 'Número de ficha SENA (solo dígitos, único).';
comment on column public.fichas.programa_id is 'Programa de formación.';
comment on column public.fichas.sede_id is 'Sede donde se imparte.';
comment on column public.fichas.ambiente_id is 'Ambiente de aprendizaje asignado.';
comment on column public.fichas.jornada is 'Jornada: manana, tarde, noche, mixta.';
comment on column public.fichas.modalidad is 'Modalidad: presencial, virtual, hibrida.';
comment on column public.fichas.fecha_inicio is 'Fecha de inicio de la formación.';
comment on column public.fichas.fecha_fin is 'Fecha de finalización (debe ser posterior al inicio).';
comment on column public.fichas.estado is 'activa, en_pausa, etapa_productiva, finalizada, inactiva (HU10.3: desactivar conserva el historial).';
comment on column public.fichas.instructor_lider_id is 'Instructor líder responsable de la ficha.';
comment on column public.fichas.created_by is 'Usuario que registró la ficha.';
comment on column public.fichas.created_at is 'Fecha de creación del registro.';
comment on column public.fichas.updated_at is 'Fecha de la última modificación (automática).';

-- FICHA_INSTRUCTORES
comment on table  public.ficha_instructores is 'Asignación de uno o varios instructores a una ficha, por competencia. HU10.4.';
comment on column public.ficha_instructores.id is 'Identificador de la asignación.';
comment on column public.ficha_instructores.ficha_id is 'Ficha asignada.';
comment on column public.ficha_instructores.instructor_id is 'Instructor asignado.';
comment on column public.ficha_instructores.competencia_id is 'Competencia que imparte en la ficha.';
comment on column public.ficha_instructores.fecha_inicio is 'Inicio de la asignación.';
comment on column public.ficha_instructores.fecha_fin is 'Fin de la asignación.';
comment on column public.ficha_instructores.created_at is 'Fecha de creación del registro.';

-- MATRÍCULAS
comment on table  public.matriculas is 'Vinculación de aprendices a fichas. Un aprendiz solo tiene una matrícula activa. HU02.2, RF07.';
comment on column public.matriculas.id is 'Identificador de la matrícula.';
comment on column public.matriculas.ficha_id is 'Ficha en la que se matricula.';
comment on column public.matriculas.aprendiz_id is 'Perfil del aprendiz.';
comment on column public.matriculas.fecha_matricula is 'Fecha de matrícula.';
comment on column public.matriculas.estado is 'matriculado, aplazado, retirado, desertor, certificado.';
comment on column public.matriculas.vocero is 'ninguno, titular o suplente (máximo uno de cada tipo por ficha).';
comment on column public.matriculas.created_at is 'Fecha de creación del registro.';
comment on column public.matriculas.updated_at is 'Fecha de la última modificación (automática).';

-- SESIONES
comment on table  public.sesiones is 'Clases programadas o ejecutadas de una competencia en una fecha. Base del cumplimiento docente. RF08, HU12.2.';
comment on column public.sesiones.id is 'Identificador de la sesión.';
comment on column public.sesiones.ficha_id is 'Ficha de la sesión.';
comment on column public.sesiones.competencia_id is 'Competencia trabajada.';
comment on column public.sesiones.resultado_id is 'Resultado de aprendizaje trabajado.';
comment on column public.sesiones.instructor_id is 'Instructor que dicta la sesión.';
comment on column public.sesiones.fecha is 'Fecha de la sesión (año, mes y día, HU03.3).';
comment on column public.sesiones.hora_inicio is 'Hora de inicio.';
comment on column public.sesiones.hora_fin is 'Hora de fin (posterior al inicio).';
comment on column public.sesiones.estado is 'programada, ejecutada (automático al registrar asistencia) o cancelada.';
comment on column public.sesiones.created_at is 'Fecha de creación del registro.';

-- ASISTENCIAS
comment on table  public.asistencias is 'Estado de asistencia de cada aprendiz en cada sesión. RF08, RF09, CU03.';
comment on column public.asistencias.id is 'Identificador del registro de asistencia.';
comment on column public.asistencias.sesion_id is 'Sesión a la que corresponde.';
comment on column public.asistencias.aprendiz_id is 'Aprendiz (debe estar matriculado en la ficha de la sesión).';
comment on column public.asistencias.estado is 'presente, ausente o justificada (pasa a justificada al aprobarse una justificación).';
comment on column public.asistencias.observacion is 'Observación del instructor.';
comment on column public.asistencias.registrado_por is 'Usuario que registró la asistencia.';
comment on column public.asistencias.registrado_en is 'Fecha y hora del registro, asignada por el servidor e inmutable (RF09).';
comment on column public.asistencias.actualizado_en is 'Fecha y hora de la última corrección (HU03.4).';

-- JUSTIFICACIONES
comment on table  public.justificaciones is 'Soportes presentados por aprendices para justificar inasistencias. RF10, RF11, CU08.';
comment on column public.justificaciones.id is 'Identificador de la justificación.';
comment on column public.justificaciones.asistencia_id is 'Inasistencia justificada (una justificación por inasistencia).';
comment on column public.justificaciones.aprendiz_id is 'Aprendiz que la presenta.';
comment on column public.justificaciones.documento_path is 'Ruta del soporte en Storage (bucket justificaciones).';
comment on column public.justificaciones.comentario is 'Comentario del aprendiz.';
comment on column public.justificaciones.estado is 'pendiente (al crearse), aprobada o rechazada.';
comment on column public.justificaciones.revisado_por is 'Instructor que la revisó (automático).';
comment on column public.justificaciones.revisado_en is 'Fecha y hora de la revisión (automática).';
comment on column public.justificaciones.observacion_revision is 'Comentario del instructor sobre la decisión (HU08.5).';
comment on column public.justificaciones.created_at is 'Fecha de creación del registro.';

-- JUSTIFICACION_HISTORIAL
comment on table  public.justificacion_historial is 'Historial de cambios de estado de cada justificación (automático). RF12, HU11.2.';
comment on column public.justificacion_historial.id is 'Identificador del cambio.';
comment on column public.justificacion_historial.justificacion_id is 'Justificación modificada.';
comment on column public.justificacion_historial.estado_anterior is 'Estado antes del cambio (vacío al crearse).';
comment on column public.justificacion_historial.estado_nuevo is 'Estado después del cambio.';
comment on column public.justificacion_historial.cambiado_por is 'Usuario que hizo el cambio.';
comment on column public.justificacion_historial.observacion is 'Observación registrada en el cambio.';
comment on column public.justificacion_historial.created_at is 'Fecha y hora del cambio.';

-- UMBRALES
comment on table  public.umbrales_alerta is 'Porcentajes de inasistencia que disparan alertas, configurables por el administrador. RF17.';
comment on column public.umbrales_alerta.id is 'Identificador del umbral.';
comment on column public.umbrales_alerta.prioridad is 'Prioridad de la alerta que genera: baja, media, alta (única).';
comment on column public.umbrales_alerta.porcentaje_inasistencia is 'Porcentaje de inasistencias no justificadas (0-100] a partir del cual se alerta.';
comment on column public.umbrales_alerta.descripcion is 'Descripción del umbral.';
comment on column public.umbrales_alerta.activo is 'Si está inactivo no genera alertas.';
comment on column public.umbrales_alerta.actualizado_por is 'Administrador que lo modificó por última vez.';
comment on column public.umbrales_alerta.updated_at is 'Fecha de la última modificación (automática).';

-- ALERTAS
comment on table  public.alertas is 'Alertas generadas automáticamente por inasistencia o novedades de ficha. RF16, CU09.';
comment on column public.alertas.id is 'Identificador de la alerta.';
comment on column public.alertas.tipo is 'inasistencia_aprendiz, riesgo_ficha, ficha_sin_lider, sesion_sin_registro.';
comment on column public.alertas.prioridad is 'baja, media, alta (según el umbral alcanzado).';
comment on column public.alertas.ficha_id is 'Ficha relacionada.';
comment on column public.alertas.aprendiz_id is 'Aprendiz relacionado (solo en alertas de inasistencia individual).';
comment on column public.alertas.porcentaje is 'Porcentaje de inasistencia que la originó.';
comment on column public.alertas.descripcion is 'Texto descriptivo de la alerta.';
comment on column public.alertas.estado is 'nueva, en_seguimiento, atendida, descartada.';
comment on column public.alertas.atendida_por is 'Usuario que la atendió.';
comment on column public.alertas.atendida_en is 'Fecha en que fue atendida.';
comment on column public.alertas.created_at is 'Fecha de generación.';

-- NOTIFICACIONES
comment on table  public.notificaciones is 'Avisos individuales mostrados en la campana de notificaciones. HU09.1-HU09.4.';
comment on column public.notificaciones.id is 'Identificador de la notificación.';
comment on column public.notificaciones.usuario_id is 'Destinatario.';
comment on column public.notificaciones.alerta_id is 'Alerta que la originó (si aplica).';
comment on column public.notificaciones.titulo is 'Título corto.';
comment on column public.notificaciones.mensaje is 'Contenido del aviso.';
comment on column public.notificaciones.leida is 'Si el destinatario ya la leyó.';
comment on column public.notificaciones.created_at is 'Fecha de envío.';

-- REPORTES
comment on table  public.reportes is 'Historial de reportes generados y sus archivos. RF18, RF20, CU05, CU06.';
comment on column public.reportes.id is 'Identificador del reporte.';
comment on column public.reportes.tipo is 'ficha, instructor, aprendiz, estadisticas, desercion, cumplimiento_instructores.';
comment on column public.reportes.titulo is 'Título visible del reporte.';
comment on column public.reportes.ficha_id is 'Ficha consultada (si aplica).';
comment on column public.reportes.instructor_id is 'Instructor consultado (si aplica).';
comment on column public.reportes.aprendiz_id is 'Aprendiz consultado (si aplica).';
comment on column public.reportes.fecha_desde is 'Inicio del periodo evaluado.';
comment on column public.reportes.fecha_hasta is 'Fin del periodo evaluado.';
comment on column public.reportes.parametros is 'Filtros usados al generarlo (sede, área, jornada...), en formato JSON.';
comment on column public.reportes.formato is 'pdf, xlsx o csv.';
comment on column public.reportes.archivo_path is 'Ruta del archivo en Storage (bucket reportes).';
comment on column public.reportes.estado is 'generando, listo, error.';
comment on column public.reportes.generado_por is 'Usuario que lo generó.';
comment on column public.reportes.created_at is 'Fecha de generación.';

-- MATERIALES
comment on table  public.materiales is 'Material de apoyo publicado por instructores para las fichas. CU07.';
comment on column public.materiales.id is 'Identificador del material.';
comment on column public.materiales.titulo is 'Nombre del material.';
comment on column public.materiales.descripcion is 'Descripción del contenido.';
comment on column public.materiales.tipo is 'documento, presentacion, video, enlace.';
comment on column public.materiales.categoria is 'guia_aprendizaje, actividad_practica, material_competencia, material_evaluacion.';
comment on column public.materiales.competencia_id is 'Competencia relacionada.';
comment on column public.materiales.ficha_id is 'Ficha que puede verlo.';
comment on column public.materiales.archivo_path is 'Ruta del archivo en Storage (bucket materiales).';
comment on column public.materiales.enlace_url is 'URL externa (alternativa al archivo).';
comment on column public.materiales.fecha_inicio is 'Fecha desde la que está disponible.';
comment on column public.materiales.fecha_fin is 'Fecha hasta la que está disponible.';
comment on column public.materiales.estado is 'publicado u oculto (HU07.4 desactivar).';
comment on column public.materiales.subido_por is 'Instructor que lo publicó.';
comment on column public.materiales.created_at is 'Fecha de creación del registro.';
comment on column public.materiales.updated_at is 'Fecha de la última modificación (automática).';

-- BITÁCORA
comment on table  public.bitacora is 'Registro de auditoría inmutable de operaciones del sistema (solo inserción). RF19, CU11.';
comment on column public.bitacora.id is 'Identificador del evento.';
comment on column public.bitacora.fecha is 'Fecha y hora del evento.';
comment on column public.bitacora.usuario_id is 'Usuario responsable.';
comment on column public.bitacora.rol is 'Rol del usuario al momento del evento.';
comment on column public.bitacora.modulo is 'Módulo del sistema afectado.';
comment on column public.bitacora.accion is 'acceso, registro, modificacion, eliminacion, consulta, descarga.';
comment on column public.bitacora.tabla is 'Tabla afectada (en cambios de datos).';
comment on column public.bitacora.registro_id is 'Identificador del registro afectado.';
comment on column public.bitacora.detalle is 'Descripción legible del evento.';
comment on column public.bitacora.datos_anteriores is 'Copia JSON del registro antes del cambio.';
comment on column public.bitacora.datos_nuevos is 'Copia JSON del registro después del cambio.';
comment on column public.bitacora.resultado is 'exito, alerta, error.';

-- VISTAS
comment on view public.v_asistencia_aprendiz is 'Indicadores de asistencia por aprendiz y ficha. RF13, HU04.2.';
comment on view public.v_asistencia_aprendiz_competencia is 'Indicadores de asistencia por aprendiz y competencia. RF15, HU04.3.';
comment on view public.v_asistencia_competencia is 'Indicadores de asistencia por ficha y competencia. RF15.';
comment on view public.v_fichas_resumen is 'Resumen de cada ficha con aprendices, % de asistencia y nivel de riesgo. RF04, RF05, RF14, RF21.';
comment on view public.v_cumplimiento_instructor is 'Sesiones planificadas vs. ejecutadas por instructor y ficha. HU12.2, HU12.4.';
