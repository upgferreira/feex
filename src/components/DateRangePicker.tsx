import React, { useState } from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  onClose: () => void;
}

type Preset = 'today' | 'week' | 'lastweek' | 'month' | 'lastmonth' | 'selectmonth' | 'custom';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS_ABBR = ['D','S','T','Q','Q','S','S'];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseISO(s: string): Date | null {
  if (!s) return null;
  const [y,m,d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m-1, d);
}
function formatBR(s: string) {
  if (!s) return 'dd/mm/aaaa';
  const [y,m,d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function DayCalendar({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const today = new Date();
  const sel = parseISO(value);
  const init = sel || today;
  const [vy, setVy] = useState(init.getFullYear());
  const [vm, setVm] = useState(init.getMonth());

  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const firstDay = new Date(vy, vm, 1).getDay();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const prev = () => { if (vm === 0) { setVm(11); setVy(y => y-1); } else setVm(m => m-1); };
  const next = () => { if (vm === 11) { setVm(0); setVy(y => y+1); } else setVm(m => m+1); };

  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm mb-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-40">
        {formatBR(value)}
      </div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prev} className="px-1.5 text-gray-400 hover:text-green-600 text-base">«</button>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{MONTHS[vm]} {vy}</span>
        <button onClick={next} className="px-1.5 text-gray-400 hover:text-green-600 text-base">»</button>
      </div>
      <div className="grid grid-cols-7 text-center mb-1">
        {DAYS_ABBR.map((d, i) => <div key={i} className="text-xs text-gray-400 py-0.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 text-center">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso = toISO(new Date(vy, vm, day));
          const isSel = sel && toISO(sel) === iso;
          const isToday = toISO(today) === iso;
          return (
            <button key={i} onClick={() => onChange(iso)}
              className={`text-xs py-1 rounded transition-colors ${
                isSel ? 'bg-green-600 text-white font-bold' :
                isToday ? 'ring-1 ring-green-500 text-green-600' :
                'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthCalendar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const sel = parseISO(value);
  const [vy, setVy] = useState((sel || new Date()).getFullYear());

  return (
    <div style={{ width: 200 }}>
      <p className="text-xs text-gray-400 mb-1">Mês selecionado</p>
      <div className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm mb-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
        {sel ? `${String(sel.getMonth()+1).padStart(2,'0')}/${sel.getFullYear()}` : 'mm/aaaa'}
      </div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setVy(y => y-1)} className="px-1.5 text-gray-400 hover:text-green-600 text-base">«</button>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{vy}</span>
        <button onClick={() => setVy(y => y+1)} className="px-1.5 text-gray-400 hover:text-green-600 text-base">»</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MONTHS.map((m, i) => {
          const isSel = sel && sel.getMonth() === i && sel.getFullYear() === vy;
          return (
            <button key={m} onClick={() => onChange(toISO(new Date(vy, i, 1)))}
              className={`py-2 text-xs rounded transition-colors font-medium ${
                isSel ? 'bg-green-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange, onClose }) => {
  const [preset, setPreset] = useState<Preset>('custom');
  const [start, setStart] = useState(startDate || '');
  const [end, setEnd]     = useState(endDate   || '');
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
      setEnd(toISO(new Date(today.getFullYear(), today.getMonth()+1, 0)));
    } else if (p === 'lastmonth') {
      setStart(toISO(new Date(today.getFullYear(), today.getMonth()-1, 1)));
      setEnd(toISO(new Date(today.getFullYear(), today.getMonth(), 0)));
    }
    // selectmonth and custom: user picks via calendar
  };

  const handleMonthPick = (iso: string) => {
    const d = parseISO(iso);
    if (!d) return;
    setStart(toISO(new Date(d.getFullYear(), d.getMonth(), 1)));
    setEnd(toISO(new Date(d.getFullYear(), d.getMonth()+1, 0)));
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

  // Calendar section — always rendered, content changes by preset
  const renderCalendars = () => {
    if (preset === 'selectmonth') {
      return (
        <div className="p-4 border-r border-gray-200 dark:border-gray-700" style={{ width: 240 }}>
          <MonthCalendar value={start} onChange={handleMonthPick} />
        </div>
      );
    }
    if (preset === 'custom') {
      return (
        <div className="p-4 border-r border-gray-200 dark:border-gray-700 flex gap-5">
          <DayCalendar label="Início do período" value={start} onChange={setStart} />
          <DayCalendar label="Fim do período"    value={end}   onChange={setEnd}   />
        </div>
      );
    }
    // Simple presets: show selected date range as text
    return (
      <div className="p-4 border-r border-gray-200 dark:border-gray-700 flex flex-col justify-center gap-2" style={{ width: 220 }}>
        <div>
          <p className="text-xs text-gray-400 mb-1">Início do período</p>
          <div className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{formatBR(start)}</div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Fim do período</p>
          <div className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{formatBR(end)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex overflow-hidden">
      {renderCalendars()}

      {/* Presets */}
      <div className="p-3 flex flex-col gap-0.5" style={{ minWidth: 170 }}>
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
