import { useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';

export function useEditorActions() {
  const {
    slides,
    displayedSlides,
    setSlides,
    currentSlideIdx,
    setCurrentSlideIdx,
    setSelectedElementId,
    setVersionHistory,
    addLog,
  } = useApp();

  /** 현재 화면 슬라이드가 slides 배열의 몇 번째인지 (객체 참조 갱신 후에도 안정적으로 갱신) */
  const slideIndexInSlides = useMemo(() => {
    const t = displayedSlides[currentSlideIdx];
    if (!t) return -1;
    return slides.findIndex((s) => s === t);
  }, [slides, displayedSlides, currentSlideIdx]);

  const updateCurrentSlideElements = useCallback(
    (newElementsOrUpdater) => {
      setSlides((prev) => {
        const idx = slideIndexInSlides;
        if (idx < 0 || idx >= prev.length) return prev;
        const slideNow = prev[idx];
        const oldElements = slideNow.elements || [];
        const newElements =
          typeof newElementsOrUpdater === 'function'
            ? newElementsOrUpdater(oldElements)
            : newElementsOrUpdater;
        const next = [...prev];
        next[idx] = { ...slideNow, elements: newElements };
        return next;
      });
    },
    [slideIndexInSlides, setSlides]
  );

  const insertBlankSlideAfter = useCallback(
    (index) => {
      const refSlide = displayedSlides[index] || displayedSlides[0];
      const w = refSlide?.width || 1000;
      const h = refSlide?.height || 562.5;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      const firstSourceId = displayedSlides[0]?.sourceFileId ?? '';
      const newSlide = {
        baseImage: canvas.toDataURL('image/png'),
        width: w,
        height: h,
        elements: [],
        sourceFileId: firstSourceId,
      };
      setSlides((prev) => {
        const next = [...prev];
        const insertAfter = displayedSlides[index];
        const realIdx =
          insertAfter != null
            ? next.findIndex((s) => s === insertAfter) + 1
            : next.length;
        next.splice(realIdx, 0, newSlide);
        return next;
      });
      setCurrentSlideIdx(index + 1);
      addLog(`빈 페이지가 ${index + 2}번째에 추가되었습니다.`);
    },
    [displayedSlides, setSlides, setCurrentSlideIdx, addLog]
  );

  const deleteCurrentSlide = useCallback(() => {
    if (displayedSlides.length <= 1) {
      addLog('마지막 페이지는 삭제할 수 없습니다.');
      return;
    }
    const targetSlide = displayedSlides[currentSlideIdx];
    if (!targetSlide) return;
    setSlides((prev) => prev.filter((s) => s !== targetSlide));
    setCurrentSlideIdx(Math.min(currentSlideIdx, displayedSlides.length - 2));
    setSelectedElementId(null);
    addLog(`페이지 ${currentSlideIdx + 1}을(를) 삭제했습니다.`);
  }, [displayedSlides.length, currentSlideIdx, setSlides, setCurrentSlideIdx, setSelectedElementId, addLog]);

  const addElement = useCallback(
    (type, extra = {}) => {
      const newElement = {
        id: Date.now() + Math.random(),
        type,
        x: 100,
        y: 100,
        w: 200,
        h: 100,
        color: '#000000',
        bgColor: '#ffffff',
        rotation: 0,
        opacity: 1,
        ...extra,
      };
      const currentElements = displayedSlides[currentSlideIdx]?.elements || [];
      updateCurrentSlideElements([...currentElements, newElement]);
      setSelectedElementId(newElement.id);
    },
    [displayedSlides, currentSlideIdx, updateCurrentSlideElements, setSelectedElementId]
  );

  const addTextElement = useCallback(
    () =>
      addElement('text', {
        content: '텍스트 입력',
        fontSize: 24,
        fontFamily: 'Malgun Gothic',
        color: '#000000',
        isBold: false,
        isItalic: false,
        isUnderline: false,
        bgColor: 'transparent',
        w: 420,
        h: 56,
      }),
    [addElement]
  );

  const addShapeElement = useCallback(
    (shapeType) =>
      addElement('shape', {
        shapeType,
        w: 100,
        h: 100,
        bgColor: '#ffffff',
        borderColor: '#000000',
        borderWidth: 2,
      }),
    [addElement]
  );

  const saveVersion = useCallback(
    (slidesData, memo = '') => {
      const nextVerNum = (displayedSlides.length + 10) / 10;
      const newEntry = {
        version: `V${nextVerNum.toFixed(1)}`,
        slides: JSON.parse(JSON.stringify(slidesData)),
        timestamp: new Date().toLocaleTimeString(),
        memo,
      };
      setVersionHistory((prev) => [newEntry, ...prev]);
      addLog(`버전 저장됨: ${newEntry.version}`);
    },
    [displayedSlides.length, setVersionHistory, addLog]
  );

  const loadVersion = useCallback(
    (entry) => {
      setSlides(JSON.parse(JSON.stringify(entry.slides)));
      setSelectedElementId(null);
      addLog(`버전 불러오기: ${entry.version}`);
    },
    [setSlides, setSelectedElementId, addLog]
  );

  return {
    updateCurrentSlideElements,
    insertBlankSlideAfter,
    deleteCurrentSlide,
    addElement,
    addTextElement,
    addRectElement: () => addShapeElement('rect'),
    addRoundedRectElement: () => addShapeElement('roundedRect'),
    addTriangleElement: () => addShapeElement('triangle'),
    addCircleElement: () => addShapeElement('circle'),
    addArrowLineElement: (dir) =>
      addElement('shape', {
        shapeType: 'arrowLine',
        w: 120,
        h: 40,
        bgColor: 'transparent',
        borderColor: '#000000',
        borderWidth: 2,
        arrowDirection: dir,
        arrowLineColor: '#000000',
        arrowHeadColor: '#000000',
        /** viewBox(0~100) 기준 선 길이 (가로 화살표 기준) */
        arrowLineSpan: 66,
        /** 선 두께 (SVG user units) */
        arrowStrokeWidth: 5,
        /** 화살촉 크기 (픽셀에 가까운 마커 크기) */
        arrowHeadSize: 10,
      }),
    saveVersion,
    loadVersion,
  };
}
