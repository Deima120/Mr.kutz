/**
 * Servicio de auditoría genérico.
 * Registra acciones en la tabla AuditLog.
 */

import prisma from '../lib/prisma.js';

export async function logAudit({
  actorId,
  req,
  action,
  entityType,
  entityId,
  details,
}) {
  const finalActorId = actorId ?? req?.user?.id ?? null;
  const ipAddress = req?.ip ?? null;

  await prisma.auditLog.create({
    data: {
      actorId: finalActorId ?? undefined,
      action,
      entityType,
      entityId: entityId ?? null,
      ipAddress,
      details: details ?? undefined,
    },
  });
}

