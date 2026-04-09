/**
 * Formulario para crear o editar cliente (compacto)
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

const NOTES_MAX = 500;

export default function ClientFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    documentType: '',
    documentNumber: '',
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
            documentType: client.document_type || '',
            documentNumber: client.document_number || '',
            notes: client.notes || '',
          });
        })
        .catch(() => setError('Cliente no encontrado'));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'notes' && value.length > NOTES_MAX) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.documentType.trim() || !formData.documentNumber.trim()) {
      setError('El tipo y número de documento son obligatorios.');
      setLoading(false);
      return;
    }

    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      documentType: formData.documentType.trim(),
      documentNumber: formData.documentNumber.trim(),
      notes: formData.notes.trim(),
    };

    try {
      if (isEdit) {
        await clientService.updateClient(id, payload);
        navigate(`/clients/${id}`, { replace: true });
      } else {
        const client = await clientService.createClient(payload);
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
          'Primero identifica al cliente con tipo y número de documento.',
          'Correo y teléfono sirven para confirmar citas y enviar avisos.',
          'Las notas son internas (máx. 500 caracteres) y el cliente no las ve.',
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
        <div className="px-4 py-3 sm:px-5 sm:py-4 flex flex-col min-h-0 gap-2.5 flex-1 overflow-y-auto">
          <AdminFormCardHeader
            eyebrow="Ficha de cliente"
            title={isEdit ? 'Actualizar datos' : 'Registrar cliente'}
          />

          {error && (
            <div className="alert-error shrink-0 text-xs py-2" role="alert">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 shrink-0">
            <div className="group">
              <label htmlFor="documentType" className={ADMIN_FORM_LABEL_CLASS}>
                Tipo de documento <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                id="documentType"
                name="documentType"
                list="client-doc-types"
                value={formData.documentType}
                onChange={handleChange}
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
                placeholder="Ej. CC, CE, NIT…"
                maxLength={40}
                required
                autoComplete="off"
              />
              <datalist id="client-doc-types">
                <option value="CC" />
                <option value="CE" />
                <option value="TI" />
                <option value="Pasaporte" />
                <option value="NIT" />
              </datalist>
            </div>
            <div className="group">
              <label htmlFor="documentNumber" className={ADMIN_FORM_LABEL_CLASS}>
                Número de documento <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                id="documentNumber"
                name="documentNumber"
                value={formData.documentNumber}
                onChange={handleChange}
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
                placeholder="Sin puntos ni espacios, si aplica"
                maxLength={80}
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 shrink-0">
            <div className="group">
              <label htmlFor="firstName" className={ADMIN_FORM_LABEL_CLASS}>
                Nombre <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
                required
              />
            </div>
            <div className="group">
              <label htmlFor="lastName" className={ADMIN_FORM_LABEL_CLASS}>
                Apellido <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
                required
              />
            </div>
            <div className="group">
              <label htmlFor="email" className={ADMIN_FORM_LABEL_CLASS}>
                Correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="group">
              <label htmlFor="phone" className={ADMIN_FORM_LABEL_CLASS}>
                Teléfono
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="group shrink-0">
            <div className="flex items-baseline justify-between gap-2 mb-0.5">
              <label htmlFor="notes" className={`${ADMIN_FORM_LABEL_CLASS} mb-0`}>
                Notas internas
              </label>
              <span className="text-[10px] text-stone-400 tabular-nums">
                {formData.notes.length}/{NOTES_MAX}
              </span>
            </div>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              maxLength={NOTES_MAX}
              className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm resize-none min-h-[3.25rem] max-h-24 leading-snug`}
              placeholder="Breve: preferencias, alergias…"
            />
          </div>

          <AdminFormFooterActions className="mt-1">
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
