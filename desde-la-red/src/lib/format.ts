/** Utilidades de formato para el modo demo (todo en español). */

export const greetingForNow = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

export const todayLabel = (date = new Date()) => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
};

export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const days = Math.round(minutes / 1440);
  return `${days} días`;
};

export const formatPrice = (amount: number, currency = 'USD') =>
  `${currency === 'USD' ? '$' : ''}${amount.toLocaleString('es-MX')} ${currency}`;

/** Devuelve los próximos `count` días como opciones de reserva. */
export interface DayOption {
  key: string;
  weekday: string;
  day: string;
  month: string;
  full: string;
}

export const upcomingDays = (count = 14, from = new Date()): DayOption[] => {
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from);
    d.setDate(from.getDate() + i + 1);
    return {
      key: d.toISOString().slice(0, 10),
      weekday: weekdays[d.getDay()],
      day: String(d.getDate()).padStart(2, '0'),
      month: months[d.getMonth()],
      full: `${weekdays[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`,
    };
  });
};

export const timeSlots = ['07:30', '09:00', '11:00', '13:30', '16:00', '18:30', '20:00'];

/** Normaliza texto para búsquedas: sin acentos, minúsculas. */
export const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const matches = (needle: string, ...haystacks: (string | undefined)[]) => {
  const q = normalize(needle.trim());
  if (!q) return true;
  return haystacks.some((h) => (h ? normalize(h).includes(q) : false));
};
