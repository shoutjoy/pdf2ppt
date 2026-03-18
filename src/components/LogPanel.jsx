import React from 'react';
import { useApp } from '../context/AppContext';

export function LogPanel() {
  const { logs } = useApp();
  return (
    <div className="bg-slate-950 rounded-xl p-3 text-slate-400 font-mono text-[9px] h-36 overflow-y-auto border border-slate-800 shrink-0">
      <p className="text-indigo-400 font-black mb-2 uppercase tracking-widest text-left">LOGS</p>
      {logs.map((log, i) => (
        <div key={i} className="mb-1 text-left text-slate-500">
          <span className="text-slate-600">[{String(log.time)}]</span> {String(log.message)}
        </div>
      ))}
    </div>
  );
}
