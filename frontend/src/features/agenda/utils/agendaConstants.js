export const AGENDA_STATUS_LABELS = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

export const AGENDA_STATUS_STYLES = {
  scheduled: 'bg-amber-50 text-amber-800 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  in_progress: 'bg-sky-50 text-sky-800 border-sky-200',
  completed: 'bg-stone-100 text-stone-700 border-stone-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  no_show: 'bg-red-50 text-red-700 border-red-200',
};

export const AGENDA_GRID_STATUS_STYLES = {
  scheduled: 'bg-amber-50 border-amber-400 text-amber-900',
  confirmed: 'bg-emerald-50 border-emerald-400 text-emerald-900',
  in_progress: 'bg-sky-50 border-sky-400 text-sky-900',
  completed: 'bg-stone-100 border-stone-400 text-stone-700',
  cancelled: 'bg-stone-100 border-stone-300 text-stone-500 line-through',
  no_show: 'bg-stone-100 border-stone-300 text-stone-500 line-through',
};

export const AGENDA_LIST_DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const AGENDA_WEEK_LIMIT = 200;
