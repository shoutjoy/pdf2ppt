import React, { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { LayoutGrid, Move } from 'lucide-react';

const COLUMNS = 6;

export function SlideMatrixView() {
  const {
    displayedSlides,
    reorderDisplayedSlides,
    currentSlideIdx,
    setCurrentSlideIdx,
    selectedSlideIndices,
    toggleSlideSelection,
    clearSlideSelection,
  } = useApp();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);

  const moveSlide = useCallback(
    (fromIndex, toIndex) => {
      if (fromIndex === toIndex || toIndex < 0 || toIndex >= displayedSlides.length) return;
      const next = [...displayedSlides];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      reorderDisplayedSlides(next);
      setCurrentSlideIdx(toIndex);
      setDraggedIndex(null);
      setDropTargetIndex(null);
    },
    [displayedSlides, reorderDisplayedSlides, setCurrentSlideIdx]
  );

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetIndex(index);
  };
  const handleDragLeave = () => setDropTargetIndex(null);
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!Number.isNaN(fromIndex)) moveSlide(fromIndex, dropIndex);
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  if (displayedSlides.length === 0) return null;

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-3 overflow-hidden">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
          <LayoutGrid size={14} />
          슬라이드 매트릭스 — 드래그하여 순서 변경
        </span>
        {selectedSlideIndices.size > 0 && (
          <button
            type="button"
            onClick={clearSlideSelection}
            className="text-[10px] font-bold text-slate-500 hover:text-indigo-600"
          >
            선택 해제
          </button>
        )}
      </div>
      <div
        className="flex-1 min-h-0 grid gap-2 overflow-auto"
        style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
      >
        {displayedSlides.map((slide, index) => (
          <div
            key={index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) toggleSlideSelection(index);
              else setCurrentSlideIdx(index);
            }}
            className={`relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all shrink-0 ${
              currentSlideIdx === index
                ? 'border-indigo-500 ring-2 ring-indigo-300'
                : selectedSlideIndices.has(index)
                  ? 'border-amber-500 ring-2 ring-amber-200'
                  : 'border-slate-200 hover:border-slate-300'
            } ${draggedIndex === index ? 'opacity-50' : ''} ${
              dropTargetIndex === index ? 'ring-2 ring-green-400 border-green-500' : ''
            }`}
          >
            <div
              className="absolute inset-0 bg-contain bg-center bg-no-repeat bg-slate-800"
              style={{ backgroundImage: `url(${slide.baseImage})` }}
            />
            <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] font-bold py-0.5 text-center">
              {index + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
