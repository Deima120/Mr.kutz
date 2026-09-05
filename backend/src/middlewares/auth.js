/**
 * Middleware de autenticación y autorización (Prisma)
 * - auth: verifica el JWT y carga usuario, rol, permisos e identidad
 * - authorize: verifica roles permitidos (forma antigua, sigue en uso)
 * - requirePermission: verifica permisos concretos (forma nueva)
 *
 * El JWT lleva únicamente `{ userId }`: todo lo demás se consulta aquí en cada
 * petición. Es más caro que meter el rol en el token, pero hace que cambiar el rol
 * o los permisos de alguien surta efecto de inmediato, y que `isActive: false` lo
 * expulse sin esperar a que caduque nada.
 */

import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { getJwtSecret, JWT_ALGORITHM } from '../config/jwtSecret.js';

/**
 * Verifica que el token JWT sea válido
 * Adjunta el usuario a req.user
 */
export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Se requiere autenticación para acceder a este recurso.',
        status: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    // algorithms explícito: defensa en profundidad contra confusión de algoritmos.
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] });

    // Los permisos viajan en el mismo include que ya se hacía para el rol, así que
    // no añaden un viaje extra a la base.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        // La identidad se resuelve por la EXISTENCIA de la fila, no por el nombre
        // del rol. Antes se consultaba solo si el rol se llamaba literalmente
        // 'barber' o 'client'; con roles personalizados eso dejaba a un usuario
        // sin `barber_id`/`client_id` y el filtrado de datos se le abría de par en
        // par. Ver el bloque de `getAll` en appointment.controller.js.
        barber: { select: { id: true } },
        client: { select: { id: true } },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado o inactivo.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role_id: user.roleId,
      is_active: user.isActive,
      role_name: user.role?.name,
      permissions: new Set((user.role?.permissions ?? []).map((rp) => rp.permission.code)),
    };

    if (user.barber) req.user.barber_id = user.barber.id;
    if (user.client) req.user.client_id = user.client.id;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Autoriza acceso basado en roles
 * @param {string[]} allowedRoles - Array de nombres de roles permitidos
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Debes iniciar sesión.' });
    }

    if (!allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos suficientes.' });
    }

    next();
  };
};

/**
 * ¿Tiene este usuario el permiso indicado?
 *
 * Falla cerrado: sin `req.user` o sin el conjunto de permisos cargado, la
 * respuesta es `false`. Nunca conceder por omisión.
 *
 * @param {object} reqUser el `req.user` que arma `auth`
 * @param {string} code código del catálogo, p. ej. 'clients.view'
 */
export const userCan = (reqUser, code) => Boolean(reqUser?.permissions?.has(code));

/**
 * Exige uno o varios permisos. Basta con tener **alguno** de los indicados, que es
 * lo que hace falta cuando una ruta sirve a dos alcances distintos (por ejemplo
 * `appointments.view.all` o `appointments.view.own`: ambos pueden entrar, y el
 * controlador decide después cuántos registros devuelve).
 *
 * Convive con `authorize()` a propósito. Las rutas se migran de una en una, así
 * que en todo momento hay rutas con el sistema viejo y rutas con el nuevo, y el
 * sistema sigue funcionando.
 */
export const requirePermission = (...codes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Debes iniciar sesión.' });
    }

    if (!codes.some((code) => userCan(req.user, code))) {
      return res.status(403).json({ success: false, message: 'No tienes permisos suficientes.' });
    }

    next();
  };
};
