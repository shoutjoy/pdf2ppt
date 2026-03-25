import React from 'react';
import { createPortal } from 'react-dom';
import { Crop, Check } from 'lucide-react';

const CROP_LAYER_STYLE = {
  zIndex: 999999,
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

/** Tailwind 미번들 환경에서도 보이도록 인라인 스타일 핸들 (드래그·리사이즈) */
const HANDLE = {
  zIndex: 50,
  backgroundColor: '#ffffff',
  border: '2px solid #2563eb',
  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
  touchAction: 'none',
  pointerEvents: 'auto',
};

function CornerHandle({ style, onMouseDown, onTouchStart }) {
  return (
    <div
      role="presentation"
      style={{
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 9999,
        ...HANDLE,
        ...style,
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    />
  );
}

function EdgeHandle({ style, onMouseDown, onTouchStart }) {
  return (
    <div
      role="presentation"
      style={{
        position: 'absolute',
        ...HANDLE,
        ...style,
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    />
  );
}

export default function CropModal({
  isOpen,
  imageSrc,
  cropSelection,
  containerRef,
  onCropMouseDown,
  onCommit,
  onCancel,
}) {
  if (!isOpen || !imageSrc) return null;

  const { x, y, width, height } = cropSelection;
  const x2 = x + width;
  const y2 = y + height;

  const modal = (
    <div
      className="overflow-y-auto overflow-x-hidden bg-black/95 backdrop-blur-md"
      style={CROP_LAYER_STYLE}
      role="dialog"
      aria-modal="true"
      aria-label="AREA MANAGEMENT"
    >
      <div className="flex min-h-full flex-col items-center justify-center gap-6 px-4 py-8 sm:px-8 sm:py-10">
        <div className="text-center shrink-0">
          <h3 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-3 tracking-widest uppercase flex-wrap">
            <Crop size={28} className="text-blue-500 shrink-0" /> AREA MANAGEMENT
          </h3>
          <p className="text-xs text-neutral-400 mt-2 font-bold">
            파란 점·막대를 드래그해 영역을 조절한 뒤 COMMIT CROP를 누르세요.
          </p>
        </div>

        <div className="w-full max-w-5xl flex justify-center shrink-0">
          <div
            ref={containerRef}
            className="relative inline-block max-w-full rounded-2xl overflow-visible border border-white/10 shadow-2xl select-none bg-neutral-900"
            style={{ touchAction: 'auto' }}
          >
            <img
              src={imageSrc}
              alt="Crop preview"
              className="relative z-[1] block max-w-full w-auto h-auto object-contain pointer-events-none"
              style={{ maxHeight: 'min(50vh, 520px)' }}
              draggable={false}
            />

            <div
              className="absolute inset-0 z-10 pointer-events-none bg-black/0"
              aria-hidden
            >
              <div className="absolute left-0 top-0 right-0 bg-black/65" style={{ height: `${y}%` }} />
              <div
                className="absolute left-0 right-0 bg-black/65"
                style={{ top: `${y2}%`, bottom: 0 }}
              />
              <div
                className="absolute left-0 bg-black/65"
                style={{ top: `${y}%`, width: `${x}%`, height: `${height}%` }}
              />
              <div
                className="absolute right-0 bg-black/65"
                style={{ top: `${y}%`, width: `${100 - x2}%`, height: `${height}%` }}
              />
            </div>

            <div
              className="absolute z-20"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${width}%`,
                height: `${height}%`,
                border: '2px solid #60a5fa',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.35)',
                pointerEvents: 'auto',
                touchAction: 'none',
              }}
            >
              <div
                className="absolute inset-0 cursor-move bg-transparent"
                style={{ pointerEvents: 'auto' }}
                onMouseDown={(e) => onCropMouseDown(e, 'move')}
                onTouchStart={(e) => onCropMouseDown(e, 'move')}
              />
              <CornerHandle
                style={{ left: -8, top: -8, cursor: 'nwse-resize' }}
                onMouseDown={(e) => onCropMouseDown(e, 'nw')}
                onTouchStart={(e) => onCropMouseDown(e, 'nw')}
              />
              <CornerHandle
                style={{ right: -8, top: -8, cursor: 'nesw-resize' }}
                onMouseDown={(e) => onCropMouseDown(e, 'ne')}
                onTouchStart={(e) => onCropMouseDown(e, 'ne')}
              />
              <CornerHandle
                style={{ left: -8, bottom: -8, cursor: 'nesw-resize' }}
                onMouseDown={(e) => onCropMouseDown(e, 'sw')}
                onTouchStart={(e) => onCropMouseDown(e, 'sw')}
              />
              <CornerHandle
                style={{ right: -8, bottom: -8, cursor: 'nwse-resize' }}
                onMouseDown={(e) => onCropMouseDown(e, 'se')}
                onTouchStart={(e) => onCropMouseDown(e, 'se')}
              />
              <EdgeHandle
                style={{
                  left: '50%',
                  top: -8,
                  width: 40,
                  height: 14,
                  marginLeft: -20,
                  borderRadius: 6,
                  cursor: 'ns-resize',
                }}
                onMouseDown={(e) => onCropMouseDown(e, 'n')}
                onTouchStart={(e) => onCropMouseDown(e, 'n')}
              />
              <EdgeHandle
                style={{
                  left: '50%',
                  bottom: -8,
                  width: 40,
                  height: 14,
                  marginLeft: -20,
                  borderRadius: 6,
                  cursor: 'ns-resize',
                }}
                onMouseDown={(e) => onCropMouseDown(e, 's')}
                onTouchStart={(e) => onCropMouseDown(e, 's')}
              />
              <EdgeHandle
                style={{
                  left: -8,
                  top: '50%',
                  width: 14,
                  height: 40,
                  marginTop: -20,
                  borderRadius: 6,
                  cursor: 'ew-resize',
                }}
                onMouseDown={(e) => onCropMouseDown(e, 'w')}
                onTouchStart={(e) => onCropMouseDown(e, 'w')}
              />
              <EdgeHandle
                style={{
                  right: -8,
                  top: '50%',
                  width: 14,
                  height: 40,
                  marginTop: -20,
                  borderRadius: 6,
                  cursor: 'ew-resize',
                }}
                onMouseDown={(e) => onCropMouseDown(e, 'e')}
                onTouchStart={(e) => onCropMouseDown(e, 'e')}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 sm:gap-4 justify-center shrink-0 pb-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-10 sm:px-14 py-3 sm:py-4 rounded-2xl bg-neutral-800 text-neutral-300 font-black uppercase hover:bg-neutral-700 border border-neutral-600 text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCommit}
            className="px-12 sm:px-16 py-3 sm:py-4 rounded-2xl bg-blue-600 text-white font-black uppercase flex items-center gap-3 hover:bg-blue-500 text-sm sm:text-base"
          >
            <Check size={24} className="shrink-0" /> COMMIT CROP
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
