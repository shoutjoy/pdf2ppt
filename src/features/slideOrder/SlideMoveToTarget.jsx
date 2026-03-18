import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Send } from 'lucide-react';

export function SlideMoveToTarget() {
  const {
    displayedSlides,
    reorderDisplayedSlides,
    currentSlideIdx,
    setCurrentSlideIdx,
    selectedSlideIndices,
    addLog,
  } = useApp();
  const [targetPageInput, setTargetPageInput] = useState('');

  const moveToPage = () => {
    const raw = targetPageInput.trim();
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1 || n > displayedSlides.length) {
      addLog(`1 ~ ${displayedSlides.length} 사이의 페이지 번호를 입력하세요.`);
      setTargetPageInput('');
      return;
    }
    const targetIndex = n - 1;

    const indicesToMove =
      selectedSlideIndices.size > 0
        ? Array.from(selectedSlideIndices).sort((a, b) => a - b)
        : [currentSlideIdx];

    if (indicesToMove.length === 0) {
      setTargetPageInput('');
      return;
    }
    if (indicesToMove.every((i) => i === targetIndex)) {
      setTargetPageInput('');
      return;
    }

    const next = [...displayedSlides];
    const moved = indicesToMove.map((i) => next[i]);
    indicesToMove.reverse().forEach((i) => next.splice(i, 1));
    const countBeforeTarget = indicesToMove.filter((i) => i < targetIndex).length;
    const insertAt = Math.max(0, targetIndex - countBeforeTarget);
    moved.forEach((s) => next.splice(insertAt, 0, s));
    reorderDisplayedSlides(next);
    setCurrentSlideIdx(insertAt);
    setTargetPageInput('');
    addLog(`슬라이드 ${indicesToMove.map((i) => i + 1).join(', ')}번을 ${n}페이지 위치로 이동`);
  };

  const label =
    selectedSlideIndices.size > 0
      ? `선택 ${selectedSlideIndices.size}개 → N페이지로`
      : '현재 슬라이드 → N페이지로';

  return (
    <form
      className="flex items-center gap-2 flex-wrap"
      onSubmit={(e) => {
        e.preventDefault();
        moveToPage();
      }}
    >
      <label className="text-[10px] font-bold text-slate-500 whitespace-nowrap">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={targetPageInput}
        onChange={(e) => setTargetPageInput(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder="페이지 번호"
        className="w-14 px-2 py-1 rounded border border-slate-200 text-xs font-bold text-center focus:ring-1 focus:ring-indigo-500 outline-none"
      />
      <button
        type="submit"
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-all"
      >
        <Send size={12} />
        이동
      </button>
    </form>
  );
}
