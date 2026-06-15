/**
 * Página de formulario de cita (ruta independiente para edición y enlaces externos).
 */

import { useNavigate, useParams } from 'react-router-dom';
import AppointmentForm from '@/features/appointments/components/AppointmentForm';

export default function AppointmentFormPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams();

  return (
    <AppointmentForm
      editId={editId || null}
      onSuccess={({ created, updated } = {}) =>
        navigate('/appointments', {
          replace: true,
          state: created ? { appointmentCreated: true } : updated ? { appointmentUpdated: true } : {},
        })
      }
      onCancel={() => navigate('/appointments')}
    />
  );
}
