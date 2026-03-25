import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
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
  X,
  Crop,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useEditorActions } from '../../hooks/useEditorActions';
import { SlideMatrixView } from '../slideOrder/SlideMatrixView';
import { SlideMoveToTarget } from '../slideOrder/SlideMoveToTarget';
import { LogPanel } from '../../components/LogPanel';
import { SourceSidebar } from '../../components/SourceSidebar';
import { FONT_FAMILIES } from '../../constants';
import { SHAPE_BORDER_LINE_OPTIONS, svgStrokeDashArray } from '../../utils/shapeLineStyle';
import { ReferenceImageUpload, CropModal, useCrop } from 'ImageCROP';

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
    addLog,
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
  const [referenceImagePanelOpen, setReferenceImagePanelOpen] = useState(false);

  const clampedIdx = Math.min(currentSlideIdx, Math.max(0, displayedSlides.length - 1));
  const curSlide = displayedSlides[clampedIdx];

  const handleReferenceCropCommitted = useCallback(
    (dataUrl) => {
      const el = {
        id: Date.now() + Math.random(),
        type: 'image',
        x: 100,
        y: 100,
        w: 200,
        h: 150,
        src: dataUrl,
        rotation: 0,
        opacity: 1,
      };
      updateCurrentSlideElements((els) => [...els, el]);
      setSelectedElementId(el.id);
      setReferenceImagePanelOpen(false);
    },
    [updateCurrentSlideElements, setSelectedElementId]
  );

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

  /** 슬라이드에 올린 이미지 요소 크롭 */
  const slideImageCropSourceRef = useRef(null);
  const slideImageCropElementIdRef = useRef(null);
  const [slideCropModalSrc, setSlideCropModalSrc] = useState(null);

  const applySlideImageCropResult = useCallback(
    (_, dataUrl) => {
      const id = slideImageCropElementIdRef.current;
      if (id == null) return;
      updateCurrentSlideElements((els) =>
        els.map((it) => (it.id === id ? { ...it, src: dataUrl } : it))
      );
      addLog('이미지가 크롭되었습니다.');
      slideImageCropSourceRef.current = null;
      slideImageCropElementIdRef.current = null;
      setSlideCropModalSrc(null);
    },
    [updateCurrentSlideElements, addLog]
  );

  const slideCropOpts = useMemo(
    () => ({
      getSource: (target) => (target === 'slideImage' ? slideImageCropSourceRef.current : null),
      applyResult: applySlideImageCropResult,
    }),
    [applySlideImageCropResult]
  );

  const {
    isCropping: isSlideImageCropping,
    cropSelection: slideCropSelection,
    cropContainerRef: slideCropContainerRef,
    startCrop: startSlideImageCrop,
    handleCropMouseDown: handleSlideCropMouseDown,
    executeCrop: executeSlideImageCrop,
    onCancelCrop: onCancelSlideImageCropBase,
  } = useCrop(slideCropOpts);

  const openSlideImageCrop = useCallback(() => {
    if (selectedElement?.type !== 'image' || !selectedElement?.src?.startsWith('data:image')) {
      addLog('크롭할 이미지가 없습니다.');
      return;
    }
    slideImageCropElementIdRef.current = selectedElement.id;
    slideImageCropSourceRef.current = selectedElement.src;
    setSlideCropModalSrc(selectedElement.src);
    startSlideImageCrop('slideImage');
  }, [selectedElement, addLog, startSlideImageCrop]);

  const handleCancelSlideImageCrop = useCallback(() => {
    slideImageCropSourceRef.current = null;
    slideImageCropElementIdRef.current = null;
    setSlideCropModalSrc(null);
    onCancelSlideImageCropBase();
  }, [onCancelSlideImageCropBase]);

  const getSlideScale = useCallback(() => {
    const r = editorContainerRef.current?.getBoundingClientRect();
    if (!r?.width) return { scaleX: 1, scaleY: 1 };
    return { scaleX: slideW / r.width, scaleY: slideH / r.height };
  }, [slideW, slideH]);

  const beginElementDrag = useCallback(
    (e, el) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startElX = el.x;
      const startElY = el.y;
      const { scaleX, scaleY } = getSlideScale();
      const onMove = (m) => {
        m.preventDefault();
        const dx = (m.clientX - startX) * scaleX;
        const dy = (m.clientY - startY) * scaleY;
        updateCurrentSlideElements((elements) =>
          elements.map((item) =>
            item.id === el.id ? { ...item, x: startElX + dx, y: startElY + dy } : item
          )
        );
      };
      const onUp = (upEv) => {
        upEv?.preventDefault?.();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove, { passive: false });
      window.addEventListener('mouseup', onUp);
    },
    [getSlideScale, updateCurrentSlideElements]
  );

  const beginElementResize = useCallback(
    (e, el, handle) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const sx = el.x;
      const sy = el.y;
      const sw = el.w;
      const sh = el.h;
      const { scaleX, scaleY } = getSlideScale();
      const minSize = 12;
      const onMove = (m) => {
        m.preventDefault();
        const dx = (m.clientX - startX) * scaleX;
        const dy = (m.clientY - startY) * scaleY;
        updateCurrentSlideElements((elements) =>
          elements.map((item) => {
            if (item.id !== el.id) return item;
            let x = sx;
            let y = sy;
            let w = sw;
            let h = sh;
            if (handle === 'se') {
              w = Math.max(minSize, sw + dx);
              h = Math.max(minSize, sh + dy);
            } else if (handle === 'sw') {
              const nw = Math.max(minSize, sw - dx);
              x = sx + (sw - nw);
              w = nw;
              h = Math.max(minSize, sh + dy);
            } else if (handle === 'ne') {
              w = Math.max(minSize, sw + dx);
              const nh = Math.max(minSize, sh - dy);
              y = sy + (sh - nh);
              h = nh;
            } else if (handle === 'nw') {
              const nw = Math.max(minSize, sw - dx);
              const nh = Math.max(minSize, sh - dy);
              x = sx + (sw - nw);
              y = sy + (sh - nh);
              w = nw;
              h = nh;
            } else if (handle === 'e') {
              w = Math.max(minSize, sw + dx);
            } else if (handle === 'w') {
              const nw = Math.max(minSize, sw - dx);
              x = sx + (sw - nw);
              w = nw;
            } else if (handle === 's') {
              h = Math.max(minSize, sh + dy);
            } else if (handle === 'n') {
              const nh = Math.max(minSize, sh - dy);
              y = sy + (sh - nh);
              h = nh;
            }
            return { ...item, x, y, w, h };
          })
        );
      };
      const onUp = (upEv) => {
        upEv?.preventDefault?.();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove, { passive: false });
      window.addEventListener('mouseup', onUp);
    },
    [getSlideScale, updateCurrentSlideElements]
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
            type="button"
            onClick={() => setReferenceImagePanelOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-50 flex flex-col items-center gap-0.5"
            title="참고 이미지 업로드·크롭"
          >
            <ImageIcon size={18} /> <span className="text-[8px] font-black">이미지</span>
          </button>
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
                style={{
                  containerType: 'inline-size',
                  backgroundImage: curSlide?.baseImage ? `url(${curSlide.baseImage})` : undefined,
                }}
                onClick={() => setSelectedElementId(null)}
              >
                {(curSlide?.elements || []).map((el) => {
                  const isSel = selectedElementId === el.id;
                  const fillOpacity = Math.min(1, Math.max(0, Number(el.opacity ?? 1)));
                  const handleStyle = (pos, cur) =>
                    `absolute bg-white border-2 border-indigo-500 shadow-sm z-[60] ${pos} ${cur}`;
                  return (
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
                        transform: `rotate(${Number(el.rotation ?? 0)}deg)`,
                        transformOrigin: 'center center',
                        border: isSel ? '2px solid #6366f1' : 'none',
                        cursor: 'move',
                        boxSizing: 'border-box',
                        zIndex: isSel ? 50 : 10,
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        touchAction: 'none',
                      }}
                      onMouseDown={(e) => beginElementDrag(e, el)}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          opacity: fillOpacity,
                          display: 'flex',
                          alignItems: el.type === 'text' ? 'flex-start' : 'center',
                          justifyContent: el.type === 'text' ? 'flex-start' : 'center',
                          boxSizing: 'border-box',
                          padding: el.type === 'text' ? '2px 4px' : 0,
                          minWidth: 0,
                          minHeight: 0,
                        }}
                      >
                      {el.type === 'text' && (
                        <div
                          style={{
                            fontSize: `clamp(11px, ${((el.fontSize || 24) / slideW) * 100}cqw, 320px)`,
                            fontWeight: el.isBold ? 'bold' : 'normal',
                            fontStyle: el.isItalic ? 'italic' : 'normal',
                            color: el.color || '#000',
                            fontFamily: el.fontFamily || 'Malgun Gothic',
                            width: '100%',
                            height: '100%',
                            lineHeight: 1.35,
                            wordBreak: 'keep-all',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap',
                            overflow: 'hidden',
                            pointerEvents: 'none',
                          }}
                        >
                          {String(el.content || '')}
                        </div>
                      )}
                      {el.type === 'image' && el.src && (
                        <img
                          src={el.src}
                          alt=""
                          draggable={false}
                          className="max-w-full max-h-full object-contain pointer-events-none select-none"
                        />
                      )}
                      {el.type === 'shape' && el.shapeType === 'arrowLine' && (() => {
                        const span = Math.min(96, Math.max(16, Number(el.arrowLineSpan) || 66));
                        const sw = Math.min(
                          18,
                          Math.max(
                            1,
                            el.arrowStrokeWidth != null
                              ? Number(el.arrowStrokeWidth)
                              : Math.max(2, (el.borderWidth || 2) * 2.5)
                          )
                        );
                        const hs = Math.min(32, Math.max(4, Number(el.arrowHeadSize) || 10));
                        const x1 = 50 - span / 2;
                        const x2 = 50 + span / 2;
                        const lineCol =
                          el.arrowLineColor?.startsWith('#') ? el.arrowLineColor : el.borderColor || '#000000';
                        const headCol =
                          el.arrowHeadColor?.startsWith('#')
                            ? el.arrowHeadColor
                            : lineCol;
                        return (
                          <div className="pointer-events-none w-full h-full flex items-center justify-center overflow-visible">
                            <svg
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                              className="w-full h-full"
                              style={{
                                transform:
                                  el.arrowDirection === 'up'
                                    ? 'rotate(-90deg)'
                                    : el.arrowDirection === 'down'
                                      ? 'rotate(90deg)'
                                      : el.arrowDirection === 'left'
                                        ? 'rotate(180deg)'
                                        : undefined,
                              }}
                            >
                              <defs>
                                <marker
                                  id={`arrow-cap-${el.id}`}
                                  markerWidth={hs}
                                  markerHeight={hs}
                                  refX={0}
                                  refY={hs / 2}
                                  orient="auto"
                                  markerUnits="userSpaceOnUse"
                                >
                                  <path d={`M0,0 L${hs},${hs / 2} L0,${hs} z`} fill={headCol} />
                                </marker>
                              </defs>
                              <line
                                x1={x1}
                                y1={50}
                                x2={x2}
                                y2={50}
                                stroke={lineCol}
                                strokeWidth={sw}
                                strokeLinecap="round"
                                strokeDasharray={svgStrokeDashArray(el.borderLineStyle)}
                                markerEnd={`url(#arrow-cap-${el.id})`}
                              />
                            </svg>
                          </div>
                        );
                      })()}
                      {el.type === 'shape' && el.shapeType === 'triangle' && (
                        <svg
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          className="pointer-events-none w-full h-full"
                        >
                          <polygon
                            points="50,10 90,88 10,88"
                            fill={el.bgColor === 'transparent' ? 'none' : el.bgColor || '#ffffff'}
                            stroke={el.borderColor || '#000000'}
                            strokeWidth={Math.max(1, (el.borderWidth || 2) * 2)}
                            strokeLinejoin="round"
                            strokeDasharray={svgStrokeDashArray(el.borderLineStyle)}
                          />
                        </svg>
                      )}
                      {el.type === 'shape' &&
                        el.shapeType !== 'arrowLine' &&
                        el.shapeType !== 'triangle' && (
                          <svg
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            className="pointer-events-none w-full h-full shrink-0"
                          >
                            {(() => {
                              const bw = el.borderWidth ?? 2;
                              const strokeW = bw > 0 ? Math.max(0.5, bw * 2) : 0;
                              const strokeCol = el.borderColor || '#000000';
                              const fill =
                                el.bgColor === 'transparent' ? 'none' : el.bgColor || '#ffffff';
                              const dash = svgStrokeDashArray(el.borderLineStyle);
                              const common = {
                                fill,
                                stroke: bw > 0 ? strokeCol : 'none',
                                strokeWidth: strokeW,
                                strokeDasharray: dash,
                                strokeLinejoin: 'round',
                                strokeLinecap: 'round',
                              };
                              if (el.shapeType === 'circle') {
                                return (
                                  <ellipse cx="50" cy="50" rx="50" ry="50" {...common} />
                                );
                              }
                              if (el.shapeType === 'roundedRect') {
                                return (
                                  <rect x="0" y="0" width="100" height="100" rx="12" ry="12" {...common} />
                                );
                              }
                              return <rect x="0" y="0" width="100" height="100" {...common} />;
                            })()}
                          </svg>
                        )}
                      </div>
                      {isSel && (
                        <>
                          <div
                            className={handleStyle('-top-1.5 -left-1.5', 'w-3 h-3 cursor-nw-resize')}
                            onMouseDown={(e) => beginElementResize(e, el, 'nw')}
                          />
                          <div
                            className={handleStyle('-top-1.5 left-1/2 -translate-x-1/2', 'w-3 h-3 cursor-n-resize')}
                            onMouseDown={(e) => beginElementResize(e, el, 'n')}
                          />
                          <div
                            className={handleStyle('-top-1.5 -right-1.5', 'w-3 h-3 cursor-ne-resize')}
                            onMouseDown={(e) => beginElementResize(e, el, 'ne')}
                          />
                          <div
                            className={handleStyle('top-1/2 -right-1.5 -translate-y-1/2', 'w-3 h-3 cursor-e-resize')}
                            onMouseDown={(e) => beginElementResize(e, el, 'e')}
                          />
                          <div
                            className={handleStyle('-bottom-1.5 -right-1.5', 'w-3 h-3 cursor-se-resize')}
                            onMouseDown={(e) => beginElementResize(e, el, 'se')}
                          />
                          <div
                            className={handleStyle('-bottom-1.5 left-1/2 -translate-x-1/2', 'w-3 h-3 cursor-s-resize')}
                            onMouseDown={(e) => beginElementResize(e, el, 's')}
                          />
                          <div
                            className={handleStyle('-bottom-1.5 -left-1.5', 'w-3 h-3 cursor-sw-resize')}
                            onMouseDown={(e) => beginElementResize(e, el, 'sw')}
                          />
                          <div
                            className={handleStyle('top-1/2 -left-1.5 -translate-y-1/2', 'w-3 h-3 cursor-w-resize')}
                            onMouseDown={(e) => beginElementResize(e, el, 'w')}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
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
              <p className="text-[10px] text-slate-400">
                타입: {selectedElement.type === 'text' ? '텍스트' : selectedElement.type === 'image' ? '이미지' : '도형'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[10px] font-bold text-slate-500 col-span-2">위치·크기 (슬라이드 좌표)</label>
                <div>
                  <span className="text-[10px] text-slate-400">X</span>
                  <input
                    type="number"
                    className="w-full p-1.5 border rounded text-sm"
                    value={Math.round(selectedElement.x ?? 0)}
                    onChange={(e) => {
                      const x = Number(e.target.value);
                      if (Number.isNaN(x)) return;
                      updateCurrentSlideElements((els) =>
                        els.map((it) => (it.id === selectedElementId ? { ...it, x } : it))
                      );
                    }}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Y</span>
                  <input
                    type="number"
                    className="w-full p-1.5 border rounded text-sm"
                    value={Math.round(selectedElement.y ?? 0)}
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      if (Number.isNaN(y)) return;
                      updateCurrentSlideElements((els) =>
                        els.map((it) => (it.id === selectedElementId ? { ...it, y } : it))
                      );
                    }}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">너비</span>
                  <input
                    type="number"
                    className="w-full p-1.5 border rounded text-sm"
                    value={Math.round(selectedElement.w ?? 0)}
                    onChange={(e) => {
                      const w = Math.max(8, Number(e.target.value));
                      if (Number.isNaN(w)) return;
                      updateCurrentSlideElements((els) =>
                        els.map((it) => (it.id === selectedElementId ? { ...it, w } : it))
                      );
                    }}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">높이</span>
                  <input
                    type="number"
                    className="w-full p-1.5 border rounded text-sm"
                    value={Math.round(selectedElement.h ?? 0)}
                    onChange={(e) => {
                      const h = Math.max(8, Number(e.target.value));
                      if (Number.isNaN(h)) return;
                      updateCurrentSlideElements((els) =>
                        els.map((it) => (it.id === selectedElementId ? { ...it, h } : it))
                      );
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500">회전 (°)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    className="flex-1 min-w-0"
                    value={Math.round(Number(selectedElement.rotation ?? 0))}
                    onChange={(e) => {
                      const rotation = Math.min(180, Math.max(-180, Number(e.target.value)));
                      updateCurrentSlideElements((els) =>
                        els.map((it) => (it.id === selectedElementId ? { ...it, rotation } : it))
                      );
                    }}
                  />
                  <input
                    type="number"
                    className="w-14 p-1 border rounded text-xs text-center"
                    value={Math.round(Number(selectedElement.rotation ?? 0))}
                    onChange={(e) => {
                      let rotation = Number(e.target.value);
                      if (Number.isNaN(rotation)) return;
                      rotation = ((((rotation + 180) % 360) + 360) % 360) - 180;
                      updateCurrentSlideElements((els) =>
                        els.map((it) => (it.id === selectedElementId ? { ...it, rotation } : it))
                      );
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500">불투명도 (alpha)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    className="flex-1 min-w-0"
                    value={Math.round((selectedElement.opacity ?? 1) * 100)}
                    onChange={(e) => {
                      const opacity = Math.min(1, Math.max(0, Number(e.target.value) / 100));
                      updateCurrentSlideElements((els) =>
                        els.map((it) => (it.id === selectedElementId ? { ...it, opacity } : it))
                      );
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-14 p-1 border rounded text-xs text-center"
                    value={Math.round((selectedElement.opacity ?? 1) * 100)}
                    onChange={(e) => {
                      let v = Number(e.target.value);
                      if (Number.isNaN(v)) return;
                      v = Math.min(100, Math.max(0, v));
                      const opacity = v / 100;
                      updateCurrentSlideElements((els) =>
                        els.map((it) => (it.id === selectedElementId ? { ...it, opacity } : it))
                      );
                    }}
                  />
                  <span className="text-[10px] text-slate-400 shrink-0">%</span>
                </div>
              </div>
              {selectedElement.type === 'image' && selectedElement.src?.startsWith('data:image') && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500">이미지 편집</label>
                  <button
                    type="button"
                    onClick={openSlideImageCrop}
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-black hover:bg-slate-800 border border-slate-700"
                  >
                    <Crop size={18} strokeWidth={2.5} />
                    Crop
                  </button>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    영역을 조절한 뒤 COMMIT CROP로 슬라이드 이미지를 바꿉니다.
                  </p>
                </div>
              )}
              {selectedElement.type === 'text' && (
                <>
                  <label className="block text-xs font-bold text-slate-500">내용</label>
                  <textarea
                    key={selectedElementId}
                    value={String(selectedElement.content || '')}
                    onChange={(e) => {
                      const content = e.target.value;
                      updateCurrentSlideElements((els) =>
                        els.map((it) => (it.id === selectedElementId ? { ...it, content } : it))
                      );
                    }}
                    className="w-full p-2 border rounded-lg text-sm"
                    rows={3}
                  />
                  <label className="block text-xs font-bold text-slate-500">폰트</label>
                  <select
                    value={selectedElement.fontFamily || 'Malgun Gothic'}
                    onChange={(e) => {
                      updateCurrentSlideElements((els) =>
                        els.map((it) =>
                          it.id === selectedElementId ? { ...it, fontFamily: e.target.value } : it
                        )
                      );
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
                      type="button"
                      onClick={() => {
                        updateCurrentSlideElements((els) =>
                          els.map((it) =>
                            it.id === selectedElementId
                              ? { ...it, fontSize: Math.max(8, (it.fontSize || 24) - 2) }
                              : it
                          )
                        );
                      }}
                      className="p-2 rounded bg-slate-100"
                    >
                      -
                    </button>
                    <span className="font-bold">{selectedElement.fontSize ?? 24}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateCurrentSlideElements((els) =>
                          els.map((it) =>
                            it.id === selectedElementId
                              ? { ...it, fontSize: (it.fontSize || 24) + 2 }
                              : it
                          )
                        );
                      }}
                      className="p-2 rounded bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                  <label className="block text-xs font-bold text-slate-500 mt-2">굵게</label>
                  <button
                    type="button"
                    onClick={() => {
                      updateCurrentSlideElements((els) =>
                        els.map((it) =>
                          it.id === selectedElementId ? { ...it, isBold: !it.isBold } : it
                        )
                      );
                    }}
                    className={`w-full py-2.5 rounded-lg text-sm font-black border-2 transition-colors ${
                      selectedElement.isBold
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    B 굵게
                  </button>
                  <label className="block text-xs font-bold text-slate-500 mt-2">글자 색</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      aria-label="글자 색"
                      className="h-10 w-full max-w-[120px] rounded-lg border border-slate-200 cursor-pointer p-1 bg-white"
                      value={
                        /^#[0-9A-Fa-f]{6}$/.test(String(selectedElement.color || '#000000').trim())
                          ? String(selectedElement.color || '#000000').trim()
                          : '#000000'
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        updateCurrentSlideElements((els) =>
                          els.map((it) =>
                            it.id === selectedElementId ? { ...it, color: v } : it
                          )
                        );
                      }}
                    />
                    <span className="text-[10px] text-slate-400 truncate" title={selectedElement.color || '#000000'}>
                      {selectedElement.color || '#000000'}
                    </span>
                  </div>
                </>
              )}
              {selectedElement.type === 'shape' && (
                <>
                  <label className="block text-xs font-bold text-slate-500">선 종류</label>
                  <select
                    value={selectedElement.borderLineStyle || 'solid'}
                    onChange={(e) => {
                      const borderLineStyle = e.target.value;
                      updateCurrentSlideElements((els) =>
                        els.map((it) =>
                          it.id === selectedElementId ? { ...it, borderLineStyle } : it
                        )
                      );
                    }}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    {SHAPE_BORDER_LINE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {selectedElement.type === 'shape' && selectedElement.shapeType === 'arrowLine' && (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">화살표</p>
                  <p className="text-[10px] font-bold text-slate-500 mb-1">색상</p>
                  <label className="block text-xs font-bold text-slate-500">선 색</label>
                  <input
                    type="color"
                    className="w-full h-9 border rounded cursor-pointer mb-2"
                    value={
                      selectedElement.arrowLineColor?.startsWith('#')
                        ? selectedElement.arrowLineColor
                        : selectedElement.borderColor?.startsWith('#')
                          ? selectedElement.borderColor
                          : '#000000'
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      updateCurrentSlideElements((els) =>
                        els.map((it) =>
                          it.id === selectedElementId
                            ? { ...it, arrowLineColor: v, borderColor: v }
                            : it
                        )
                      );
                    }}
                  />
                  <label className="block text-xs font-bold text-slate-500">화살촉 색</label>
                  <input
                    type="color"
                    className="w-full h-9 border rounded cursor-pointer mb-2"
                    value={
                      selectedElement.arrowHeadColor?.startsWith('#')
                        ? selectedElement.arrowHeadColor
                        : selectedElement.arrowLineColor?.startsWith('#')
                          ? selectedElement.arrowLineColor
                          : selectedElement.borderColor?.startsWith('#')
                            ? selectedElement.borderColor
                            : '#000000'
                    }
                    onChange={(e) => {
                      const arrowHeadColor = e.target.value;
                      updateCurrentSlideElements((els) =>
                        els.map((it) =>
                          it.id === selectedElementId ? { ...it, arrowHeadColor } : it
                        )
                      );
                    }}
                  />
                  <label className="block text-xs font-bold text-slate-500">선 길이 (박스 안 비율)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={16}
                      max={96}
                      className="flex-1 min-w-0"
                      value={Math.round(Number(selectedElement.arrowLineSpan ?? 66))}
                      onChange={(e) => {
                        const arrowLineSpan = Math.min(96, Math.max(16, Number(e.target.value)));
                        updateCurrentSlideElements((els) =>
                          els.map((it) =>
                            it.id === selectedElementId ? { ...it, arrowLineSpan } : it
                          )
                        );
                      }}
                    />
                    <span className="text-xs font-mono w-8 text-right">
                      {Math.round(Number(selectedElement.arrowLineSpan ?? 66))}
                    </span>
                  </div>
                  <label className="block text-xs font-bold text-slate-500 mt-1">선 두께</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={18}
                      className="flex-1 min-w-0"
                      value={Math.round(
                        selectedElement.arrowStrokeWidth != null
                          ? selectedElement.arrowStrokeWidth
                          : Math.max(2, (selectedElement.borderWidth || 2) * 2.5)
                      )}
                      onChange={(e) => {
                        const arrowStrokeWidth = Math.min(18, Math.max(1, Number(e.target.value)));
                        updateCurrentSlideElements((els) =>
                          els.map((it) =>
                            it.id === selectedElementId ? { ...it, arrowStrokeWidth } : it
                          )
                        );
                      }}
                    />
                    <span className="text-xs font-mono w-8 text-right">
                      {Math.round(
                        selectedElement.arrowStrokeWidth != null
                          ? selectedElement.arrowStrokeWidth
                          : Math.max(2, (selectedElement.borderWidth || 2) * 2.5)
                      )}
                    </span>
                  </div>
                  <label className="block text-xs font-bold text-slate-500 mt-1">화살촉 크기</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={4}
                      max={32}
                      className="flex-1 min-w-0"
                      value={Math.round(Number(selectedElement.arrowHeadSize) || 10)}
                      onChange={(e) => {
                        const arrowHeadSize = Math.min(32, Math.max(4, Number(e.target.value)));
                        updateCurrentSlideElements((els) =>
                          els.map((it) =>
                            it.id === selectedElementId ? { ...it, arrowHeadSize } : it
                          )
                        );
                      }}
                    />
                    <span className="text-xs font-mono w-8 text-right">
                      {Math.round(Number(selectedElement.arrowHeadSize) || 10)}
                    </span>
                  </div>
                </>
              )}
              {selectedElement.type === 'shape' && selectedElement.shapeType !== 'arrowLine' && (
                <>
                  <label className="block text-xs font-bold text-slate-500">테두리 두께</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full p-2 border rounded-lg text-sm"
                    value={selectedElement.borderWidth ?? 2}
                    onChange={(e) => {
                      const borderWidth = Math.max(0, Number(e.target.value) || 0);
                      updateCurrentSlideElements((els) =>
                        els.map((it) => (it.id === selectedElementId ? { ...it, borderWidth } : it))
                      );
                    }}
                  />
                  <label className="block text-xs font-bold text-slate-500">배경색</label>
                  <div className="flex gap-2 items-stretch">
                    <input
                      type="color"
                      className="flex-1 min-w-0 h-9 border rounded cursor-pointer"
                      value={
                        selectedElement.bgColor === 'transparent' || !selectedElement.bgColor?.startsWith('#')
                          ? '#ffffff'
                          : selectedElement.bgColor
                      }
                      onChange={(e) => {
                        updateCurrentSlideElements((els) =>
                          els.map((it) => (it.id === selectedElementId ? { ...it, bgColor: e.target.value } : it))
                        );
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        updateCurrentSlideElements((els) =>
                          els.map((it) =>
                            it.id === selectedElementId ? { ...it, bgColor: 'transparent' } : it
                          )
                        );
                      }}
                      className={`shrink-0 px-3 rounded-lg text-xs font-bold border transition-colors ${
                        selectedElement.bgColor === 'transparent'
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-400 ring-2 ring-indigo-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      투명
                    </button>
                  </div>
                  <label className="block text-xs font-bold text-slate-500">테두리 색</label>
                  <input
                    type="color"
                    className="w-full h-9 border rounded cursor-pointer"
                    value={selectedElement.borderColor?.startsWith('#') ? selectedElement.borderColor : '#000000'}
                    onChange={(e) => {
                      updateCurrentSlideElements((els) =>
                        els.map((it) => (it.id === selectedElementId ? { ...it, borderColor: e.target.value } : it))
                      );
                    }}
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  updateCurrentSlideElements((els) => els.filter((e) => e.id !== selectedElementId));
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

      {referenceImagePanelOpen && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReferenceImagePanelOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setReferenceImagePanelOpen(false)}
              className="absolute -top-1 -right-1 z-10 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 border border-slate-600 shadow-lg"
              aria-label="닫기"
            >
              <X size={18} />
            </button>
            <ReferenceImageUpload onCropCommitted={handleReferenceCropCommitted} className="rounded-2xl" />
          </div>
        </div>
      )}

      <CropModal
        isOpen={isSlideImageCropping}
        imageSrc={slideCropModalSrc}
        cropSelection={slideCropSelection}
        containerRef={slideCropContainerRef}
        onCropMouseDown={handleSlideCropMouseDown}
        onCommit={executeSlideImageCrop}
        onCancel={handleCancelSlideImageCrop}
      />
    </main>
  );
}
