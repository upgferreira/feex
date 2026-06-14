import React, { useState } from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  onClose: () => void;
}

type Preset = 'today' | 'week' | 'lastweek' | 'month' | 'lastmonth' | 'selectmonth' | 'custom';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseISO(s: string) {
  if (!s) return null;
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}

function formatBR(s: string) {
  if (!s) return '';
  const [y,m,d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month+1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function Calendar({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const today = new Date();
  const sel = parseISO(value) || today;
  const [viewYear, setViewYear] = useState(sel.getFullYear());
  const [viewMonth, setViewMonth] = useState(sel.getMonth());
  const [showMonths, setShowMonths] = useState(false);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const selDay = parseISO(value);

  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 mb-3 cursor-pointer" onClick={() => setShowMonths(false)}>
        {formatBR(value) || 'dd/mm/aaaa'}
      </div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => { if (showMonths) setViewYear(y => y-1); else { if (viewMonth === 0) { setViewMonth(11); setViewYear(y=>y-1); } else setViewMonth(m=>m-1); }}} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400">«</button>
        <button onClick={() => setShowMonths(s => !s)} className="text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-green-600">
          {showMonths ? viewYear : `${MONTHS[viewMonth]} ${viewYear}`}
        </button>
        <button onClick={() => { if (showMonths) setViewYear(y => y+1); else { if (viewMonth === 11) { setViewMonth(0); setViewYear(y=>y+1); } else setViewMonth(m=>m+1); }}} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400">»</button>
      </div>

      {showMonths ? (
        <div className="grid grid-cols-4 gap-1">
          {MONTHS.map((m, i) => (
            <button key={m} onClick={() => { setViewMonth(i); setShowMonths(false); }}
              className={`py-1.5 text-xs rounded transition-colors ${viewMonth === i ? 'bg-green-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
              {m}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const iso = toISO(new Date(viewYear, viewMonth, day));
              const isSelected = selDay && toISO(selDay) === iso;
              const isToday = toISO(today) === iso;
              return (
                <button key={i} onClick={() => onChange(iso)}
                  className={`text-xs py-1.5 rounded transition-colors ${
                    isSelected ? 'bg-green-600 text-white font-bold' :
                    isToday ? 'border border-green-500 text-green-600 dark:text-green-400' :
                    'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                  {day}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange, onClose }) => {
  const [preset, setPreset] = useState<Preset>('custom');
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);

  const today = new Date();

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const t = today;
    if (p === 'today') {
      const s = toISO(t); setStart(s); setEnd(s);
    } else if (p === 'week') {
      const day = t.getDay();
      const mon = new Date(t); mon.setDate(t.getDate() - day + 1);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      setStart(toISO(mon)); setEnd(toISO(sun));
    } else if (p === 'lastweek') {
      const day = t.getDay();
      const mon = new Date(t); mon.setDate(t.getDate() - day - 6);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      setStart(toISO(mon)); setEnd(toISO(sun));
    } else if (p === 'month') {
      setStart(toISO(new Date(t.getFullYear(), t.getMonth(), 1)));
      setEnd(toISO(new Date(t.getFullYear(), t.getMonth()+1, 0)));
    } else if (p === 'lastmonth') {
      setStart(toISO(new Date(t.getFullYear(), t.getMonth()-1, 1)));
      setEnd(toISO(new Date(t.getFullYear(), t.getMonth(), 0)));
    } else if (p === 'selectmonth') {
      setStart(toISO(new Date(t.getFullYear(), t.getMonth(), 1)));
      setEnd(toISO(new Date(t.getFullYear(), t.getMonth()+1, 0)));
    }
  };

  const presets: { key: Preset; label: string }[] = [
    { key: 'today', label: 'Hoje' },
    { key: 'week', label: 'Esta semana' },
    { key: 'lastweek', label: 'Semana passada' },
    { key: 'month', label: 'Este mês' },
    { key: 'lastmonth', label: 'Mês passado' },
    { key: 'selectmonth', label: 'Selecionar mês' },
    { key: 'custom', label: 'Período customizado' },
  ];

  const showTwoCalendars = preset === 'custom' || preset === 'selectmonth';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex overflow-hidden" style={{ minWidth: showTwoCalendars ? 580 : 320 }}>
      {/* Calendars */}
      <div className="p-4 flex gap-6">
        <Calendar label="Início do período" value={start} onChange={s => { setStart(s); setPreset('custom'); }} />
        {showTwoCalendars && (
          <Calendar label="Fim do período" value={end} onChange={e => { setEnd(e); setPreset('custom'); }} />
        )}
      </div>

      {/* Presets */}
      <div className="border-l border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-1 min-w-[160px]">
        {presets.map(p => (
          <button key={p.key} onClick={() => applyPreset(p.key)}
            className={`text-left px-3 py-2 text-sm rounded transition-colors ${
              preset === p.key ? 'bg-green-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}>
            {p.label}
          </button>
        ))}
        <div className="mt-auto pt-3 flex gap-2">
          <button onClick={onClose} className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancelar
          </button>
          <button onClick={() => { onChange(start, end); onClose(); }}
            className="flex-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 font-medium">
            Filtrar
          </button>
        </div>
      </div>
    </div>
  );
};
