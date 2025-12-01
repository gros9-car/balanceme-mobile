import { createNavigationContainerRef } from "@react-navigation/native";

/**
 * Referencia global al contenedor de navegación, usada fuera de componentes
 * de React (por ejemplo desde handlers de notificaciones) para disparar
 * navegaciones imperativas de forma segura.
 */
export const navigationRef = createNavigationContainerRef();
