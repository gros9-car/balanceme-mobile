# Plan de implementación ágil (6 sprints)

## Visión general
Proyecto móvil BalanceMe enfocado en bienestar emocional, seguimiento de hábitos, comunidad segura y recursos de autocuidado. Objetivo: entregar funcionalidades incrementales que cumplan los requisitos detallados, manteniendo calidad y validación continua con usuarios internos.

Cada sprint dura 2-3 semanas, incluye: planificación, ejecución, revisión, retrospectiva y documentación de entregables. Se adopta un backlog priorizado; al cierre de cada sprint se registran hallazgos y métricas clave (historias completadas, defectos, feedback de usuarios).

## Sprint 1 — Fundaciones (semana 1 a 3)
- Configuración de infraestructura Expo/Firebase y definición del diseño base.
- Implementación inicial de autenticación (registro, login, recuperación).
- Estructura de navegación y tema visual (claro/oscuro).
- Backlog grooming y definición de métricas de éxito por módulo.
- Documentación de arquitectura inicial y acuerdos de equipo.

**Entregables:** App navegable con autenticación funcional, guía de estilos, tablero backlog priorizado.

## Sprint 2 — Seguimiento de estados de ánimo y journaling (semana 4 a 6)
- Rediseño de registro emocional para permitir 5 emociones por día y almacenar puntajes de valencia/energía.
- Visualizaciones semanales/mensuales (Mood Insights) con resúmenes automáticos.
- Evolución del diario: múltiples entradas por día, etiquetado emocional (15 categorías), metas mensuales y UI de progreso.
- Ajustes de Firestore e índices necesarios.
- Pruebas manuales + documentación de uso de los módulos creados.

**Entregables:** MoodTracker actualizado, pantalla de insights, Journal con etiquetas y seguimiento mensual, notas de pruebas y guía rápida para usuarios internos.

## Sprint 3 — Autocuidado y recursos de emergencia (semana 7 a 9)
- Biblioteca offline con 5 respiraciones guiadas, 3 meditaciones (5/10/15 min) y 2 técnicas de relajación progresiva.
- Módulo de recursos de emergencia con estrategias de manejo de crisis y base inicial de 5 contactos geolocalizados.
- Integración en la pantalla Home mediante accesos rápidos y verificación offline.
- Validación de contenido con expertos (si aplica) y actualización del backlog con feedback.

**Entregables:** Pantallas SelfCare y Emergency funcionando offline, material de soporte (scripts, textos), checklist de validación de contenido.

## Sprint 4 — Comunidad anónima y notificaciones (semana 10 a 12)
- Reformulación del foro como comunidad anónima con alias, categorías (mínimo 2) y moderación básica (reportes).
- Integración con notificaciones locales para novedades del foro/progreso cuando corresponda.
- Lineamientos de convivencia y guía de moderación interna.
- Pruebas de carga ligera (datos simulados) y monitoreo básico de seguridad.

**Entregables:** HelpForum renovado, documentación de procesos de moderación, reporte de pruebas.

## Sprint 5 — Módulo de progreso y analítica (semana 13 a 15)
- Consolidación del módulo de progreso (metas simultáneas, reportes automatizados semanales, notificaciones, snapshots).
- Refinamiento de visualizaciones y panel Home (insights destacados, recordatorios de metas).
- Instrumentación de analítica interna (logs de uso clave) y panel de métricas mínimas.
- Sesión de revisión con stakeholders; ajustes según feedback.

**Entregables:** Progreso con reportes automáticos, dashboards internos básicos, minuta de revisión con acciones.

## Sprint 6 — Cierre y estabilidad (semana 16 a 18)
- End-to-end QA (casos críticos de ánimo, diario, autocuidado, comunidad, emergencias, metas).
- Documentación final (manual de usuario, guía de soporte, documentación técnica actualizada).
- Preparación para despliegue (verificación de dependencias, scripts de build, checklist de publicación Expo).
- Retrospectiva global y plan de mantenimiento continuo (backlog de mejoras).

**Entregables:** Informe de QA, documentación consolidada, checklist de lanzamiento y plan de mantenimiento post-sprints.

---
- **Rituales comunes:** daily standup, refinamiento semanal, demo interna al cierre de sprint, retro con acciones concretas.
- **Definición de hecho:** código revisado, pruebas manuales relevantes, documentación actualizada, feature flags/guardas según corresponda.
- **Métricas sugeridas:** historias completadas vs. plan, bugs abiertos/cerrados, tiempo de respuesta en comunidad, adopción de recursos de autocuidado.
