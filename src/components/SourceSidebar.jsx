import React from 'react';
import { ChevronUp, ChevronDown, ChevronRight, PanelRightClose } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function SourceSidebar() {
  const {
    uploadedFiles,
    sourceOrder,
    setSourceOrder,
    selectedSourceIds,
    toggleSourceSelection,
    isSourceSidebarCollapsed,
    setIsSourceSidebarCollapsed,
    addLog,
  } = useApp();

  if (uploadedFiles.length < 2) return null;

  const orderedSources = sourceOrder
    .map((id) => uploadedFiles.find((f) => f.id === id))
    .filter(Boolean);

  const moveSource = (fromIndex, direction) => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= sourceOrder.length) return;
    const next = [...sourceOrder];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    setSourceOrder(next);
    addLog(`소스 순서 변경됨`);
  };

  const handleApplyOrder = () => {
    addLog('순서가 적용되었습니다. (PPTX, PDF, 이미지 제작 시 반영)');
  };

  return (
    <div className="flex flex-shrink-0">
      <div
        className={`flex flex-col bg-slate-800 border-l border-slate-700 transition-all duration-200 ${
          isSourceSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-56 min-w-[200px]'
        }`}
      >
        {!isSourceSidebarCollapsed && (
          <>
            <div className="flex items-center justify-between p-3 border-b border-slate-600">
              <span className="text-sm font-bold text-white uppercase tracking-wider">source</span>
              <button
                onClick={() => setIsSourceSidebarCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                title="사이드바 숨기기"
              >
                <PanelRightClose size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[calc(100vh-200px)]">
            {orderedSources.map((source, index) => (
              <div
                key={source.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700/80 transition-colors"
              >
                <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSourceIds.has(source.id)}
                    onChange={() => toggleSourceSelection(source.id)}
                    className="rounded border-slate-500 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-200 truncate" title={source.name}>
                    {source.name}
                  </span>
                </label>
                <div className="flex flex-col gap-0.5 shrink-0">
                  <span className="text-[9px] text-slate-500 font-bold">순서</span>
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveSource(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded bg-amber-600/80 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white"
                      title="위로"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSource(index, 'down')}
                      disabled={index === orderedSources.length - 1}
                      className="p-1 rounded bg-amber-600/80 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white"
                      title="아래로"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-slate-600">
            <button
              type="button"
              onClick={handleApplyOrder}
              className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-colors"
            >
              순서적용
            </button>
          </div>
        </>
      )}
      </div>
      {isSourceSidebarCollapsed && (
      <button
        onClick={() => setIsSourceSidebarCollapsed(false)}
        className="self-center p-2 bg-slate-800 rounded-l-lg border border-slate-700 border-r-0 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
        title="소스 사이드바 열기"
      >
        <ChevronRight size={16} />
      </button>
    )}
  </div>
  );
}
