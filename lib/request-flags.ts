// Constantes que comparte proxy.ts con el servidor. Sin imports: el proxy no debe cargar los configs.

/** Encabezado que proxy.ts agrega a las peticiones de /admin: el panel va siempre en inglés (también <html lang>). */
export const ADMIN_REQUEST_HEADER = "x-gxr-admin";
