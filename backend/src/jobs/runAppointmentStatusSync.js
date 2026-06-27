/**
 * Ejecución única del sync de estados (Render Cron Job o npm run cron:appointment-status).
 */

import 'dotenv/config';
import prisma from '../lib/prisma.js';
import { connectDatabase } from '../config/database.js';
import { runAppointmentStatusSync } from './appointmentStatusJob.js';

const main = async () => {
  try {
    await connectDatabase();
    const result = await runAppointmentStatusSync();
    console.log('[cron:appointment-status]', JSON.stringify(result));
  } catch (err) {
    console.error('[cron:appointment-status] falló:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

main();
