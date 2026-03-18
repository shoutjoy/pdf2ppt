import { useCallback } from 'react';
import { useApp } from '../context/AppContext';

export function useEditorActions() {
  const {
    displayedSlides,
    setSlides,
    currentSlideIdx,
    setCurrentSlideIdx,
    setSelectedElementId,
    setVersionHistory,
    addLog,
  } = useApp();

  const updateCurrentSlideElements = useCallback(
    (newElements) => {
      const targetSlide = displayedSlides[currentSlideIdx];
      if (!targetSlide) return;
      setSlides((prev) =>
        prev.map((s) => (s === targetSlide ? { ...s, elements: newElements } : s))
      );
    },
    [currentSlideIdx, displayedSlides, setSlides]
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
        id: Date.now(),
        type,
        x: 100,
        y: 100,
        w: 200,
        h: 100,
        color: '#000000',
        bgColor: '#ffffff',
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
        rotation: 0,
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
        rotation: 0,
      }),
    saveVersion,
    loadVersion,
  };
}
