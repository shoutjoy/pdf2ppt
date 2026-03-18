import React, { useRef, useMemo, useEffect } from 'react';
import {
  Type,
  Square,
  Circle,
  Triangle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Layout,
  List,
  LayoutGrid,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Move,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useEditorActions } from '../../hooks/useEditorActions';
import { SlideMatrixView } from '../slideOrder/SlideMatrixView';
import { SlideMoveToTarget } from '../slideOrder/SlideMoveToTarget';
import { LogPanel } from '../../components/LogPanel';
import { SourceSidebar } from '../../components/SourceSidebar';
import { FONT_FAMILIES } from '../../constants';

export function EditorView() {
  const {
    displayedSlides,
    currentSlideIdx,
    setCurrentSlideIdx,
    viewMode,
    setViewMode,
    editorZoom,
    setEditorZoom,
    selectedElementId,
    setSelectedElementId,
    versionHistory,
  } = useApp();
  const {
    insertBlankSlideAfter,
    deleteCurrentSlide,
    addTextElement,
    addRectElement,
    addRoundedRectElement,
    addTriangleElement,
    addCircleElement,
    addArrowLineElement,
    updateCurrentSlideElements,
    loadVersion,
  } = useEditorActions();
  const editorContainerRef = useRef(null);

  const clampedIdx = Math.min(currentSlideIdx, Math.max(0, displayedSlides.length - 1));
  const curSlide = displayedSlides[clampedIdx];

  useEffect(() => {
    if (currentSlideIdx >= displayedSlides.length && displayedSlides.length > 0) {
      setCurrentSlideIdx(displayedSlides.length - 1);
    }
  }, [displayedSlides.length, currentSlideIdx, setCurrentSlideIdx]);
  const slideW = curSlide?.width ?? 1000;
  const slideH = curSlide?.height ?? 562.5;
  const selectedElement = useMemo(
    () => curSlide?.elements?.find((el) => el.id === selectedElementId) || null,
    [curSlide, selectedElementId]
  );

  if (!displayedSlides.length) return null;

  return (
    <main className="flex-1 flex gap-0 min-h-0 overflow-hidden">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-4 min-h-0 overflow-hidden">
      {/* Left: tools + history */}
      <div className="lg:col-span-1 flex flex-row lg:flex-col gap-2 p-2 overflow-x-auto lg:overflow-y-auto">
        <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-row lg:flex-col gap-1">
          <p className="text-[9px] font-black text-slate-400 uppercase hidden lg:block">편집 도구</p>
          <button
            onClick={addTextElement}
            className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 flex flex-col items-center gap-0.5"
          >
            <Type size={18} /> <span className="text-[8px] font-black">텍스트</span>
          </button>
          <div className="grid grid-cols-2 gap-0.5">
            <button onClick={addRectElement} className="p-1.5 rounded-lg hover:bg-slate-50" title="사각형">
              <Square size={14} />
            </button>
            <button onClick={addRoundedRectElement} className="p-1.5 rounded-lg hover:bg-slate-50">
              <Square size={14} className="rounded-sm" />
            </button>
            <button onClick={addTriangleElement} className="p-1.5 rounded-lg hover:bg-slate-50">
              <Triangle size={14} />
            </button>
            <button onClick={addCircleElement} className="p-1.5 rounded-lg hover:bg-slate-50">
              <Circle size={14} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-0.5">
            <button onClick={() => addArrowLineElement('up')} className="p-1 rounded hover:bg-slate-50">
              <ArrowUp size={12} />
            </button>
            <button onClick={() => addArrowLineElement('down')} className="p-1 rounded hover:bg-slate-50">
              <ArrowDown size={12} />
            </button>
            <button onClick={() => addArrowLineElement('left')} className="p-1 rounded hover:bg-slate-50">
              <ArrowLeft size={12} />
            </button>
            <button onClick={() => addArrowLineElement('right')} className="p-1 rounded hover:bg-slate-50">
              <ArrowRight size={12} />
            </button>
          </div>
          <button
            onClick={() => document.getElementById('editor-img-add')?.click()}
            className="p-2 rounded-lg hover:bg-slate-50 flex flex-col items-center gap-0.5"
          >
            <ImageIcon size={18} /> <span className="text-[8px] font-black">이미지</span>
          </button>
          <input
            id="editor-img-add"
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file?.type.startsWith('image/')) return;
              const r = new FileReader();
              r.onload = (ev) => {
                const src = ev.target?.result;
                if (src) {
                  const el = {
                    id: Date.now(),
                    type: 'image',
                    x: 100,
                    y: 100,
                    w: 200,
                    h: 150,
                    src,
                  };
                  const elements = [...(curSlide?.elements || []), el];
                  updateCurrentSlideElements(elements);
                  setSelectedElementId(el.id);
                }
              };
              r.readAsDataURL(file);
              e.target.value = '';
            }}
          />
        </div>
        <div className="bg-white p-2 rounded-xl border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-0">
          <p className="text-[9px] font-black text-slate-400 uppercase p-1">History</p>
          <div className="flex-1 overflow-y-auto space-y-1">
            {versionHistory.map((h, i) => (
              <button
                key={i}
                onClick={() => loadVersion(h)}
                className="w-full p-2 rounded-lg text-left hover:bg-indigo-50 border border-transparent hover:border-indigo-100 text-[10px]"
              >
                {String(h.version)} — {String(h.timestamp)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Center: toolbar + matrix / vertical / single */}
      <div className="lg:col-span-8 flex flex-col gap-2 min-h-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            <button
              onClick={() => setViewMode('single')}
              className={`px-2 py-1.5 text-xs font-bold ${viewMode === 'single' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}
            >
              <Layout size={14} className="inline mr-1" /> 한 페이지
            </button>
            <button
              onClick={() => setViewMode('vertical')}
              className={`px-2 py-1.5 text-xs font-bold ${viewMode === 'vertical' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}
            >
              <List size={14} className="inline mr-1" /> 전체 배열
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-2 py-1.5 text-xs font-bold ${viewMode === 'matrix' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}
            >
              <LayoutGrid size={14} className="inline mr-1" /> 매트릭스
            </button>
          </div>
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg">
            <button onClick={() => setEditorZoom((z) => Math.max(50, z - 10))} className="p-1.5">
              <ZoomOut size={14} />
            </button>
            <span className="px-2 text-xs font-bold">{editorZoom}%</span>
            <button onClick={() => setEditorZoom((z) => Math.min(200, z + 10))} className="p-1.5">
              <ZoomIn size={14} />
            </button>
          </div>
          <button
            onClick={() => insertBlankSlideAfter(currentSlideIdx)}
            className="px-2 py-1.5 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700"
          >
            + 빈 페이지
          </button>
          <button
            onClick={deleteCurrentSlide}
            disabled={displayedSlides.length <= 1}
            className="px-2 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 disabled:opacity-40"
          >
            <Trash2 size={12} className="inline" /> 삭제
          </button>
          <button
            disabled={currentSlideIdx === 0}
            onClick={() => setCurrentSlideIdx((i) => i - 1)}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-xs font-bold text-slate-500">
            {currentSlideIdx + 1} / {displayedSlides.length}
          </span>
          <button
            disabled={currentSlideIdx === displayedSlides.length - 1}
            onClick={() => setCurrentSlideIdx((i) => i + 1)}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
          <SlideMoveToTarget />
        </div>

        {viewMode === 'matrix' && <SlideMatrixView />}

        {viewMode === 'vertical' && (
          <div className="flex-1 overflow-y-auto space-y-4 p-2 bg-slate-800/80 rounded-xl">
            {displayedSlides.map((slide, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentSlideIdx(idx)}
                className={`cursor-pointer rounded-xl overflow-hidden border-2 mx-auto ${
                  currentSlideIdx === idx ? 'border-indigo-500 ring-2 ring-indigo-400' : 'border-slate-600'
                }`}
                style={{
                  aspectRatio: `${slide.width || 1000}/${slide.height || 562.5}`,
                  maxWidth: '100%',
                }}
              >
                <div
                  className="w-full h-full bg-contain bg-center bg-no-repeat bg-slate-900"
                  style={{ backgroundImage: `url(${slide.baseImage})` }}
                />
              </div>
            ))}
          </div>
        )}

        {viewMode === 'single' && (
          <div className="flex-1 min-h-[400px] flex items-center justify-center overflow-auto p-2 bg-slate-800/80 rounded-xl">
            <div
              className="relative bg-slate-900 rounded-xl overflow-hidden shadow-xl shrink-0"
              style={{
                transform: `scale(${editorZoom / 100})`,
                transformOrigin: 'top center',
                aspectRatio: `${slideW}/${slideH}`,
                width: '100%',
                maxWidth: '100%',
              }}
              ref={editorContainerRef}
            >
              <div
                className="absolute inset-0 bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: curSlide?.baseImage ? `url(${curSlide.baseImage})` : undefined }}
                onClick={() => setSelectedElementId(null)}
              >
                {(curSlide?.elements || []).map((el) => (
                  <div
                    key={el.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(el.id);
                    }}
                    style={{
                      position: 'absolute',
                      left: `${(el.x / slideW) * 100}%`,
                      top: `${(el.y / slideH) * 100}%`,
                      width: `${(el.w / slideW) * 100}%`,
                      height: `${(el.h / slideH) * 100}%`,
                      border: selectedElementId === el.id ? '2px solid #6366f1' : 'none',
                      cursor: 'move',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: selectedElementId === el.id ? 50 : 10,
                    }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startElX = el.x;
                      const startElY = el.y;
                      const r = editorContainerRef.current?.getBoundingClientRect();
                      if (!r) return;
                      const scaleX = slideW / r.width;
                      const scaleY = slideH / r.height;
                      const onMove = (m) => {
                        const dx = (m.clientX - startX) * scaleX;
                        const dy = (m.clientY - startY) * scaleY;
                        const newElements = curSlide.elements.map((item) =>
                          item.id === el.id ? { ...item, x: startElX + dx, y: startElY + dy } : item
                        );
                        updateCurrentSlideElements(newElements);
                      };
                      const onUp = () => {
                        window.removeEventListener('mousemove', onMove);
                        window.removeEventListener('mouseup', onUp);
                      };
                      window.addEventListener('mousemove', onMove);
                      window.addEventListener('mouseup', onUp);
                    }}
                  >
                    {el.type === 'text' && (
                      <div
                        style={{
                          fontSize: `${el.fontSize || 24}px`,
                          fontWeight: el.isBold ? 'bold' : 'normal',
                          fontStyle: el.isItalic ? 'italic' : 'normal',
                          color: el.color || '#000',
                          fontFamily: el.fontFamily || 'Malgun Gothic',
                        }}
                      >
                        {String(el.content || '')}
                      </div>
                    )}
                    {el.type === 'image' && el.src && (
                      <img src={el.src} alt="" className="max-w-full max-h-full object-contain" />
                    )}
                    {el.type === 'shape' && (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: el.bgColor || '#fff',
                          border: `${el.borderWidth || 2}px solid ${el.borderColor || '#000'}`,
                          borderRadius: el.shapeType === 'circle' ? '50%' : el.shapeType === 'roundedRect' ? '12%' : 0,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: properties + log */}
      <div className="lg:col-span-3 flex flex-col gap-2 overflow-hidden min-h-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex-1 overflow-y-auto">
          {selectedElement ? (
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-500 uppercase">선택된 요소</p>
              {selectedElement.type === 'text' && (
                <>
                  <label className="block text-xs font-bold text-slate-500">내용</label>
                  <textarea
                    value={String(selectedElement.content || '')}
                    onChange={(e) => {
                      const content = e.target.value;
                      const newElements = curSlide.elements.map((it) =>
                        it.id === selectedElementId ? { ...it, content } : it
                      );
                      updateCurrentSlideElements(newElements);
                    }}
                    className="w-full p-2 border rounded-lg text-sm"
                    rows={3}
                  />
                  <label className="block text-xs font-bold text-slate-500">폰트</label>
                  <select
                    value={selectedElement.fontFamily || 'Malgun Gothic'}
                    onChange={(e) => {
                      const newElements = curSlide.elements.map((it) =>
                        it.id === selectedElementId ? { ...it, fontFamily: e.target.value } : it
                      );
                      updateCurrentSlideElements(newElements);
                    }}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    {FONT_FAMILIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <label className="block text-xs font-bold text-slate-500">글자 크기</label>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => {
                        const newElements = curSlide.elements.map((it) =>
                          it.id === selectedElementId ? { ...it, fontSize: Math.max(8, (it.fontSize || 24) - 2) } : it
                        );
                        updateCurrentSlideElements(newElements);
                      }}
                      className="p-2 rounded bg-slate-100"
                    >
                      -
                    </button>
                    <span className="font-bold">{selectedElement.fontSize ?? 24}</span>
                    <button
                      onClick={() => {
                        const newElements = curSlide.elements.map((it) =>
                          it.id === selectedElementId ? { ...it, fontSize: (it.fontSize || 24) + 2 } : it
                        );
                        updateCurrentSlideElements(newElements);
                      }}
                      className="p-2 rounded bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </>
              )}
              <button
                onClick={() => {
                  updateCurrentSlideElements(curSlide.elements.filter((e) => e.id !== selectedElementId));
                  setSelectedElementId(null);
                }}
                className="w-full py-2 rounded-lg text-xs font-bold bg-red-50 text-red-600"
              >
                요소 삭제
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 py-8">
              <Move size={40} />
              <p className="text-xs font-bold mt-2">슬라이드에서 요소를 선택하세요</p>
            </div>
          )}
        </div>
        <LogPanel />
      </div>
      </div>
      <SourceSidebar />
    </main>
  );
}
