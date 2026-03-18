import React, { useState } from 'react';
import { GripVertical, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function FileListWithOrder({ onRemove }) {
  const { uploadedFiles, setUploadedFiles } = useApp();
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const move = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= uploadedFiles.length) return;
    const next = [...uploadedFiles];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    setUploadedFiles(next);
  };

  const handleDragStart = (e, id, index) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };
  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  };
  const handleDragLeave = () => setDragOverId(null);
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    setDraggedId(null);
    setDragOverId(null);
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (Number.isNaN(fromIndex) || fromIndex === dropIndex) return;
    move(fromIndex, dropIndex);
  };
  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  if (uploadedFiles.length === 0) return null;

  return (
    <ul className="space-y-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
      {uploadedFiles.map((item, index) => (
        <li
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, item.id, index)}
          onDragOver={(e) => handleDragOver(e, item.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border bg-white transition-all ${
            draggedId === item.id ? 'opacity-50' : ''
          } ${dragOverId === item.id ? 'ring-2 ring-indigo-400 border-indigo-300' : 'border-slate-200'}`}
        >
          <span className="text-slate-400 cursor-grab active:cursor-grabbing" title="드래그하여 순서 변경">
            <GripVertical size={16} />
          </span>
          <span className="flex-1 text-left text-sm font-medium text-slate-800 truncate" title={item.name}>
            {index + 1}. {item.name}
          </span>
          <span className="text-[10px] text-slate-400">{(item.file.size / 1024).toFixed(1)} KB</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => move(index, index - 1)}
              disabled={index === 0}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500"
              title="위로"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => move(index, index + 1)}
              disabled={index === uploadedFiles.length - 1}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500"
              title="아래로"
            >
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
              title="제거"
            >
              <X size={14} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
