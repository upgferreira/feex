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
  if (!s) return 'dd/mm/aaaa';
  const [y,m,d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function Calendar({
  value, onChange, label, forceMonthPicker = false
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  forceMonthPicker?: boolean;
}) {
  const today = new Date();
  const sel = parseISO(value) || today;
  const [viewYear, setViewYear] = useState(sel.getFullYear());
  const [viewMonth, setViewMonth] = useState(sel.getMonth());
  const [showMonths, setShowMonths] = useState(forceMonthPicker);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  const selDay = parseISO(value);

  const prevMonth = () => {
    if (showMonths) { setViewYear(y => y - 1); return; }
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (showMonths) { setViewYear(y => y + 1); return; }
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const pickMonth = (i: number) => {
    setViewMonth(i);
    setShowMonths(false);
    if (forceMonthPicker) {
      // select full month
      const first = toISO(new Date(viewYear, i, 1));
      onChange(first);
    }
  };

  return (
    <div style={{ width: 200 }}>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 mb-3">
        {formatBR(value)}
      </div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 text-sm">«</button>
        <button onClick={() => setShowMonths(s => !s)} className="text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-green-600">
          {showMonths ? viewYear : `${MONTHS[viewMonth]} ${viewYear}`}
        </button>
        <button onClick={nextMonth} className="px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 text-sm">»</button>
      </div>

      {showMonths ? (
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((m, i) => (
            <button key={m} onClick={() => pickMonth(i)}
              className={`py-1.5 text-xs rounded transition-colors ${viewMonth === i ? 'bg-green-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
              {m}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => <div key={d} className="text-center text-xs text-gray-400 py-0.5">{d.slice(0,1)}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const iso = toISO(new Date(viewYear, viewMonth, day));
              const isSel = selDay && toISO(selDay) === iso;
              const isToday = toISO(today) === iso;
              return (
                <button key={i} onClick={() => onChange(iso)}
                  className={`text-xs py-1.5 rounded transition-colors ${
                    isSel ? 'bg-green-600 text-white font-bold' :
                    isToday ? 'ring-1 ring-green-500 text-green-600 dark:text-green-400' :
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
  const [preset, setPreset] = useState<Preset>(startDate ? 'custom' : 'custom');
  const [start, setStart] = useState(startDate || '');
  const [end, setEnd] = useState(endDate || '');

  const today = new Date();

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === 'today') {
      const s = toISO(today); setStart(s); setEnd(s);
    } else if (p === 'week') {
      const day = today.getDay();
      const mon = new Date(today); mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      setStart(toISO(mon)); setEnd(toISO(sun));
    } else if (p === 'lastweek') {
      const day = today.getDay();
      const mon = new Date(today); mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1) - 7);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      setStart(toISO(mon)); setEnd(toISO(sun));
    } else if (p === 'month') {
      setStart(toISO(new Date(today.getFullYear(), today.getMonth(), 1)));
      setEnd(toISO(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
    } else if (p === 'lastmonth') {
      setStart(toISO(new Date(today.getFullYear(), today.getMonth() - 1, 1)));
      setEnd(toISO(new Date(today.getFullYear(), today.getMonth(), 0)));
    }
    // selectmonth and custom: user picks via calendar
  };

  const presets: { key: Preset; label: string }[] = [
    { key: 'today',       label: 'Hoje' },
    { key: 'week',        label: 'Esta semana' },
    { key: 'lastweek',    label: 'Semana passada' },
    { key: 'month',       label: 'Este mês' },
    { key: 'lastmonth',   label: 'Mês passado' },
    { key: 'selectmonth', label: 'Selecionar mês' },
    { key: 'custom',      label: 'Customizado' },
  ];

  const handleStartChange = (s: string) => {
    setStart(s);
    if (preset === 'selectmonth') {
      const d = parseISO(s);
      if (d) setEnd(toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)));
    } else {
      setPreset('custom');
    }
  };

  // Layout: always show 2 calendars side by side when custom; 1 calendar when selectmonth; no calendar for simple presets
  const showTwo = preset === 'custom';
  const showOne = preset === 'selectmonth';
  const showCals = showTwo || showOne;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex overflow-hidden">
      {/* Calendars — fixed width so presets don't compress */}
      <div className="p-4 flex gap-5" style={{ minWidth: showTwo ? 460 : showOne ? 230 : 0, display: showCals ? 'flex' : 'none' }}>
        <Calendar
          label="Início do período"
          value={start}
          onChange={handleStartChange}
          forceMonthPicker={preset === 'selectmonth'}
        />
        {showTwo && (
          <Calendar
            label="Fim do período"
            value={end}
            onChange={e => { setEnd(e); setPreset('custom'); }}
          />
        )}
      </div>

      {/* Presets */}
      <div className="border-l border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-0.5" style={{ minWidth: 160 }}>
        {presets.map(p => (
          <button key={p.key} onClick={() => applyPreset(p.key)}
            className={`text-left px-3 py-2 text-sm rounded transition-colors ${
              preset === p.key ? 'bg-green-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}>
            {p.label}
          </button>
        ))}
        <div className="mt-auto pt-3 flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
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
