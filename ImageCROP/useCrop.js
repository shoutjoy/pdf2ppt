import { useState, useRef, useCallback } from 'react';
import { applyCropToImageDataUrl } from './cropUtils';

const DEFAULT_SELECTION = { x: 10, y: 10, width: 80, height: 80 };

/**
 * @param {{
 *   getSource: (target: string, cropHistoryRef: React.MutableRefObject<{ url: string, itemId: number } | null>) => string | null,
 *   applyResult: (target: string, dataUrl: string, cropHistoryRef?: React.MutableRefObject<{ url: string, itemId: number } | null>) => void,
 *   saveCropOriginal?: (id: string | number, url: string) => Promise<void>
 * }} opts
 */
export function useCrop(opts = {}) {
  const { getSource, applyResult, saveCropOriginal } = opts;

  const [cropTarget, setCropTarget] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropSelection, setCropSelection] = useState({ ...DEFAULT_SELECTION });

  const cropContainerRef = useRef(null);
  const cropHistoryRef = useRef(null);

  const startCrop = useCallback((target) => {
    setCropTarget(target);
    setCropSelection({ ...DEFAULT_SELECTION });
    setIsCropping(true);
  }, []);

  const handleCropMouseDown = useCallback(
    (e, handle) => {
      e.stopPropagation();
      if (e.type === 'touchstart') e.preventDefault();
      const container = cropContainerRef.current;
      if (!container) return;
      const getCoords = (ev) =>
        ev.touches && ev.touches.length > 0
          ? { x: ev.touches[0].clientX, y: ev.touches[0].clientY }
          : { x: ev.clientX, y: ev.clientY };
      const start = getCoords(e);
      const startX = start.x;
      const startY = start.y;
      const initialSelection = { ...cropSelection };
      const cw = Math.max(1, container.clientWidth);
      const ch = Math.max(1, container.clientHeight);
      const onMove = (moveEv) => {
        const cur = getCoords(moveEv);
        const dx = ((cur.x - startX) / cw) * 100;
        const dy = ((cur.y - startY) / ch) * 100;
        setCropSelection((prev) => {
          let { x, y, width, height } = { ...initialSelection };
          if (handle === 'move') {
            x = Math.max(0, Math.min(100 - width, x + dx));
            y = Math.max(0, Math.min(100 - height, y + dy));
          } else {
            if (handle.includes('n')) {
              const ny = Math.max(0, y + dy);
              height = Math.max(5, height + (y - ny));
              y = ny;
            }
            if (handle.includes('s')) height = Math.max(5, Math.min(100 - y, height + dy));
            if (handle.includes('w')) {
              const nx = Math.max(0, x + dx);
              width = Math.max(5, width + (x - nx));
              x = nx;
            }
            if (handle.includes('e')) width = Math.max(5, Math.min(100 - x, width + dx));
          }
          return { x, y, width, height };
        });
      };
      const onTouchMove = (te) => {
        te.preventDefault();
        onMove(te);
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onUp);
        window.removeEventListener('touchcancel', onUp);
      };
      if (e.type === 'touchstart') {
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onUp);
        window.addEventListener('touchcancel', onUp);
      } else {
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      }
    },
    [cropSelection]
  );

  const executeCrop = useCallback(() => {
    if (!getSource || !applyResult) return;
    const source = getSource(cropTarget, cropHistoryRef);
    if (!source) return;
    if (cropTarget === 'history' && cropHistoryRef.current && saveCropOriginal) {
      saveCropOriginal(cropHistoryRef.current.itemId, source).catch(() => {});
    }
    if (cropTarget === 'result' && saveCropOriginal) {
      saveCropOriginal('result', source).catch(() => {});
    }
    applyCropToImageDataUrl(source, cropSelection)
      .then((data) => {
        applyResult(cropTarget, data, cropHistoryRef);
        if (cropTarget === 'history') cropHistoryRef.current = null;
        setIsCropping(false);
      })
      .catch(() => {
        setIsCropping(false);
      });
  }, [cropTarget, cropSelection, getSource, applyResult, saveCropOriginal]);

  const onCancelCrop = useCallback(() => {
    setIsCropping(false);
  }, []);

  return {
    cropTarget,
    isCropping,
    cropSelection,
    setCropSelection,
    cropContainerRef,
    cropHistoryRef,
    startCrop,
    handleCropMouseDown,
    executeCrop,
    onCancelCrop,
  };
}
