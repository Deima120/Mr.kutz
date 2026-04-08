/**
 * Formulario para crear o editar cliente
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as clientService from '../../services/clientService';
import AdminFormShell, {
  AdminFormCardHeader,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormSecondaryButton,
} from '../../components/admin/AdminFormShell';

export default function ClientFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      clientService
        .getClientById(id)
        .then((client) => {
          setFormData({
            firstName: client.first_name || '',
            lastName: client.last_name || '',
            email: client.email || '',
            phone: client.phone || '',
            notes: client.notes || '',
          });
        })
        .catch(() => setError('Cliente no encontrado'));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEdit) {
        await clientService.updateClient(id, formData);
        navigate(`/clients/${id}`, { replace: true });
      } else {
        const client = await clientService.createClient(formData);
        navigate(`/clients/${client.id}`, { replace: true });
      }
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err?.message || 'Error al guardar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminFormShell
      backTo="/clients"
      backLabel="Clientes"
      modeBadge={isEdit ? 'Edición' : 'Alta'}
      aside={{
        kicker: 'Experiencia',
        title: 'Cada dato suma al servicio',
        bullets: [
          'Correo y teléfono sirven para confirmar citas y enviar avisos.',
          'Las notas son solo para el equipo; el cliente no las ve.',
          'Tras guardar podrás ver historial y citas en su ficha.',
        ],
        statusLabel: 'Estado',
        statusValue: isEdit ? 'Modo edición' : 'Registro nuevo',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="relative h-full min-h-0 flex flex-col rounded-[1.28rem] bg-white/88 backdrop-blur-xl border border-white shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] overflow-hidden"
      >
        <div
          className="h-[3px] w-full shrink-0 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80"
          aria-hidden
        />
        <div className="px-5 py-4 sm:px-7 sm:py-5 flex flex-col min-h-0 gap-4 flex-1">
          <AdminFormCardHeader
            eyebrow="Ficha de cliente"
            title={isEdit ? 'Actualizar datos' : 'Registrar cliente'}
          />

          {error && (
            <div className="alert-error shrink-0 text-sm py-2.5" role="alert">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 shrink-0">
            <div className="group xl:col-span-1">
              <label htmlFor="firstName" className={ADMIN_FORM_LABEL_CLASS}>
                Nombre <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
                required
              />
            </div>
            <div className="group xl:col-span-1">
              <label htmlFor="lastName" className={ADMIN_FORM_LABEL_CLASS}>
                Apellido <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
                required
              />
            </div>
            <div className="group sm:col-span-2 xl:col-span-1">
              <label htmlFor="email" className={ADMIN_FORM_LABEL_CLASS}>
                Correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="group sm:col-span-2 xl:col-span-1">
              <label htmlFor="phone" className={ADMIN_FORM_LABEL_CLASS}>
                Teléfono
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="group flex-1 min-h-[5.5rem] flex flex-col">
            <label htmlFor="notes" className={ADMIN_FORM_LABEL_CLASS}>
              Notas internas
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className={`${ADMIN_FORM_FIELD_CLASS} resize-none flex-1 min-h-[5rem] xl:min-h-[6.5rem]`}
              placeholder="Preferencias, alergias, recordatorios para el equipo…"
            />
          </div>

          <AdminFormFooterActions>
            <AdminFormPrimaryButton disabled={loading}>
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando…
                </>
              ) : (
                'Guardar cliente'
              )}
            </AdminFormPrimaryButton>
            <AdminFormSecondaryButton onClick={() => navigate(-1)}>Cancelar</AdminFormSecondaryButton>
          </AdminFormFooterActions>
        </div>
      </form>
    </AdminFormShell>
  );
}
