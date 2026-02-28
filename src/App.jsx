import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, FileText, Play, Download, Loader2, CheckCircle2, 
  AlertCircle, Layout, Eraser, Settings, Move, RotateCcw, 
  Type, Image as ImageIcon, ChevronLeft, ChevronRight, 
  Bold, Plus, Minus, Trash2, Save, Square, Circle, Triangle, Pipette,
  Check, X, History, FileDown, FileType, Crop, Italic, Underline as UnderlineIcon,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RectangleVertical, List, FolderOpen, ZoomIn, ZoomOut
} from 'lucide-react';
import {
  saveProjectToIndexedDB,
  listProjectsFromIndexedDB,
  loadProjectFromIndexedDB,
  serializePTI,
  parsePTI,
} from './ptiStorage';

const FONT_FAMILIES = [
  { label: '맑은 고딕', value: 'Malgun Gothic' },
  { label: '굴림', value: 'Gulim' },
  { label: '돋움', value: 'Dotum' },
  { label: '바탕', value: 'Batang' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Verdana', value: 'Verdana' },
];

// External Library URLs
const LIB_SCRIPTS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@3.12.0/dist/pptxgen.bundle.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

export default function App() {
  const APP_VERSION = "V1.2";
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, processing, preview, error
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Slide Data & Editing State
  const [slides, setSlides] = useState([]); 
  const [slideOrientation, setSlideOrientation] = useState('landscape'); // 'landscape' | 'portrait' — 빈 페이지 추가 시 적용
  const [viewMode, setViewMode] = useState('single'); // 'single' = 가로모드(한 페이지씩), 'vertical' = 세로모드(전체 페이지 세로 배열)
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]); 
  
  // PTI 저장/불러오기
  const [projectName, setProjectName] = useState('');
  const [goToPageInput, setGoToPageInput] = useState('');
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedProjectsList, setSavedProjectsList] = useState([]);
  
  // 슬라이드쇼
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [slideshowSlideIdx, setSlideshowSlideIdx] = useState(0);
  
  // 편집 캔버스 확대/축소 (50 ~ 200%)
  const [editorZoom, setEditorZoom] = useState(100);
  
  // Tool States

  // Image crop modal (when adding image from file)
  const [imageCropSrc, setImageCropSrc] = useState(null);
  const [imageCropNatural, setImageCropNatural] = useState({ w: 0, h: 0 });
  const [cropSelection, setCropSelection] = useState({ x: 0, y: 0, w: 1, h: 1 });
  const cropDragRef = useRef(null);
  const cropImageRef = useRef(null);

  const editorContainerRef = useRef(null);
  const goToPageInputRef = useRef(null);

  const goToPage = () => {
    const raw = (goToPageInputRef.current?.value ?? goToPageInput).trim();
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1 || n > slides.length) {
      setGoToPageInput('');
      if (goToPageInputRef.current) goToPageInputRef.current.value = '';
      return;
    }
    const newIndex = n - 1; // 1-based → 0-based
    if (newIndex === currentSlideIdx) {
      setGoToPageInput('');
      if (goToPageInputRef.current) goToPageInputRef.current.value = '';
      return;
    }
    const next = [...slides];
    const [moved] = next.splice(currentSlideIdx, 1);
    next.splice(newIndex, 0, moved);
    setSlides(next);
    setCurrentSlideIdx(newIndex);
    setGoToPageInput('');
    if (goToPageInputRef.current) goToPageInputRef.current.value = '';
  };

  // Derived State: Calculate selected element early to avoid ReferenceErrors
  const selectedElement = useMemo(() => {
    const currentSlide = slides[currentSlideIdx];
    return currentSlide?.elements?.find(el => el.id === selectedElementId) || null;
  }, [slides, currentSlideIdx, selectedElementId]);

  const curSlide = slides[currentSlideIdx];
  const slideW = curSlide?.width ?? 1000;
  const slideH = curSlide?.height ?? 562.5;

  const DEFAULT_SETTINGS = { widthRatio: 9.2, heightRatio: 3.1, xRatio: 96.9, yRatio: 98.4 };
  const [maskSettings, setMaskSettings] = useState({ ...DEFAULT_SETTINGS });

  // Load external libraries on mount
  useEffect(() => {
    const loadScripts = async () => {
      for (const src of LIB_SCRIPTS) {
        if (!document.querySelector(`script[src="${src}"]`)) {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          document.head.appendChild(script);
        }
      }
    };
    loadScripts();
  }, []);

  const addLog = (message) => {
    const msgString = typeof message === 'object' ? JSON.stringify(message) : String(message);
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), message: msgString }, ...prev.slice(0, 49)]);
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setStatus('idle');
      setSlides([]);
      setVersionHistory([]);
      setError(null);
      addLog(`파일 로드됨: ${selectedFile.name}`);
    } else {
      setError('PDF 파일만 업로드 가능합니다.');
    }
  };

  const loadPTIFromFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = parsePTI(reader.result);
        if (!data || !data.slides || !Array.isArray(data.slides)) {
          setError('올바른 PTI 파일이 아닙니다.');
          setStatus('error');
          return;
        }
        setSlides(data.slides);
        if (typeof data.currentSlideIdx === 'number') setCurrentSlideIdx(Math.min(data.currentSlideIdx, data.slides.length - 1));
        if (data.slideOrientation) setSlideOrientation(data.slideOrientation);
        if (data.viewMode) setViewMode(data.viewMode);
        setProjectName(file.name);
        setFile(null);
        setStatus('preview');
        setVersionHistory([]);
        setError(null);
        addLog(`PTI 파일 불러옴: ${file.name}`);
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    };
    reader.readAsText(file);
  };

  const handleOpenFile = (selectedFile) => {
    if (!selectedFile) return;
    const name = (selectedFile.name || '').toLowerCase();
    const isPTI = name.endsWith('.pti') || selectedFile.type === 'application/json';
    if (isPTI) {
      loadPTIFromFile(selectedFile);
    } else if (selectedFile.type === 'application/pdf') {
      handleFile(selectedFile);
    } else {
      setError('PDF 또는 PTI 파일을 선택해 주세요.');
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const f = e.dataTransfer.files[0];
      const name = (f.name || '').toLowerCase();
      const isPTI = name.endsWith('.pti') || f.type === 'application/json';
      if (isPTI) loadPTIFromFile(f);
      else handleFile(f);
    }
  };

  const processPdf = async () => {
    if (!file) return;
    try {
      setStatus('processing');
      setProgress(0);
      addLog('PDF 고해상도 렌더링 시작...');

      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const newSlides = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        // Auto-mask NotebookLM logo
        const m = maskSettings;
        const w = (canvas.width * m.widthRatio) / 100;
        const h = (canvas.height * m.heightRatio) / 100;
        const x = (canvas.width * m.xRatio) / 100 - (w / 2);
        const y = (canvas.height * m.yRatio) / 100 - (h / 2);
        const pixelData = context.getImageData(Math.max(0, Math.floor(x-2)), Math.max(0, Math.floor(y-2)), 1, 1).data;
        context.fillStyle = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;
        context.fillRect(x, y, w, h);

        newSlides.push({
          baseImage: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height,
          elements: []
        });
        setProgress(Math.round((i / numPages) * 100));
      }

      setSlides(newSlides);
      saveInitialVersion(newSlides);
      setStatus('preview');
      setCurrentSlideIdx(0);
      addLog('슬라이드 변환 완료.');
    } catch (err) {
      setError('PDF 처리 실패: ' + err.message);
      setStatus('error');
    }
  };

  const saveInitialVersion = (slidesData) => {
    const newEntry = {
      version: `V1.0`,
      slides: JSON.parse(JSON.stringify(slidesData)),
      timestamp: new Date().toLocaleTimeString(),
      memo: "초기 변환"
    };
    setVersionHistory([newEntry]);
  };

  const saveVersion = (slidesData, memo = "") => {
    const nextVerNum = (versionHistory.length + 10) / 10;
    const newEntry = {
      version: `V${nextVerNum.toFixed(1)}`,
      slides: JSON.parse(JSON.stringify(slidesData)),
      timestamp: new Date().toLocaleTimeString(),
      memo
    };
    setVersionHistory(prev => [newEntry, ...prev]);
    addLog(`버전 저장됨: ${newEntry.version}`);
  };

  const loadVersion = (entry) => {
    setSlides(JSON.parse(JSON.stringify(entry.slides)));
    setSelectedElementId(null);
    addLog(`버전 불러오기 성공: ${entry.version}`);
  };

  const insertBlankSlideAfter = (index) => {
    const refSlide = slides[index] || slides[0];
    const w = refSlide ? (refSlide.width || 1000) : 1000;
    const h = refSlide ? (refSlide.height || 562.5) : 562.5;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    const blankImage = canvas.toDataURL('image/png');
    const newSlide = { baseImage: blankImage, width: w, height: h, elements: [] };
    setSlides(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, newSlide);
      return next;
    });
    setCurrentSlideIdx(index + 1);
    addLog(`빈 페이지가 ${index + 2}번째에 추가되었습니다. (기존 슬라이드와 동일 크기: ${Math.round(w)}×${Math.round(h)})`);
  };

  const deleteCurrentSlide = () => {
    if (slides.length <= 1) {
      addLog('마지막 페이지는 삭제할 수 없습니다.');
      return;
    }
    const idx = currentSlideIdx;
    setSlides(prev => prev.filter((_, i) => i !== idx));
    setCurrentSlideIdx(Math.min(idx, slides.length - 2));
    setSelectedElementId(null);
    addLog(`페이지 ${idx + 1}을(를) 삭제했습니다.`);
  };

  const updateCurrentSlideElements = (newElements) => {
    setSlides(prev => {
      const updated = [...prev];
      if (updated[currentSlideIdx]) {
        updated[currentSlideIdx].elements = newElements;
      }
      return updated;
    });
  };

  const addElement = (type, extra = {}) => {
    const newElement = {
      id: Date.now(),
      type, x: 100, y: 100, w: 200, h: 100,
      color: '#000000', bgColor: '#ffffff',
      ...extra
    };
    const currentElements = slides[currentSlideIdx]?.elements || [];
    updateCurrentSlideElements([...currentElements, newElement]);
    setSelectedElementId(newElement.id);
  };

  const addTextElement = () => addElement('text', {
    content: '텍스트 입력',
    fontSize: 24,
    fontFamily: 'Malgun Gothic',
    color: '#000000',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    bgColor: 'transparent'
  });
  const addShapeElement = (shapeType) => addElement('shape', {
    shapeType,
    w: 100,
    h: 100,
    bgColor: '#ffffff',
    borderColor: '#000000',
    borderWidth: 2,
    rotation: 0
  });
  const addRectElement = () => addShapeElement('rect');
  const addRoundedRectElement = () => addShapeElement('roundedRect');
  const addTriangleElement = () => addShapeElement('triangle');
  const addCircleElement = () => addShapeElement('circle');
  const addArrowLineElement = (dir) => addElement('shape', { shapeType: 'arrowLine', w: 120, h: 40, bgColor: 'transparent', borderColor: '#000000', borderWidth: 2, arrowDirection: dir, rotation: 0 });

  const openImageCrop = (dataUrl) => {
    setImageCropSrc(dataUrl);
    setCropSelection({ x: 0, y: 0, w: 1, h: 1 });
    setImageCropNatural({ w: 0, h: 0 });
  };

  const closeImageCrop = () => {
    setImageCropSrc(null);
    if (cropDragRef.current) cropDragRef.current = null;
  };

  const onCropImageLoad = () => {
    const img = cropImageRef.current;
    if (img && imageCropSrc) {
      setImageCropNatural({ w: img.naturalWidth, h: img.naturalHeight });
    }
  };

  const getCropRectFromEvent = (e) => {
    const img = cropImageRef.current;
    if (!img) return null;
    const r = img.getBoundingClientRect();
    const rx = (e.clientX - r.left) / r.width;
    const ry = (e.clientY - r.top) / r.height;
    return { x: Math.max(0, Math.min(1, rx)), y: Math.max(0, Math.min(1, ry)) };
  };

  const handleCropMouseDown = (e) => {
    const p = getCropRectFromEvent(e);
    if (p) cropDragRef.current = { startX: p.x, startY: p.y };
  };

  const handleCropMouseMove = (e) => {
    if (!cropDragRef.current) return;
    const p = getCropRectFromEvent(e);
    if (!p) return;
    const { startX, startY } = cropDragRef.current;
    const x = Math.max(0, Math.min(1, Math.min(startX, p.x)));
    const y = Math.max(0, Math.min(1, Math.min(startY, p.y)));
    const w = Math.max(0.01, Math.min(1 - x, Math.abs(p.x - startX)));
    const h = Math.max(0.01, Math.min(1 - y, Math.abs(p.y - startY)));
    setCropSelection({ x, y, w, h });
  };

  const handleCropMouseUp = () => {
    cropDragRef.current = null;
  };

  useEffect(() => {
    if (!imageCropSrc) return;
    const onMove = (e) => { if (cropDragRef.current) handleCropMouseMove(e); };
    const onUp = () => { if (cropDragRef.current) handleCropMouseUp(); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [imageCropSrc]);

  const applyImageCrop = () => {
    if (!imageCropSrc || !imageCropNatural.w) return;
    const img = new Image();
    img.onload = () => {
      const { x, y, w, h } = cropSelection;
      const px = Math.floor(x * imageCropNatural.w);
      const py = Math.floor(y * imageCropNatural.h);
      const pw = Math.max(1, Math.floor(w * imageCropNatural.w));
      const ph = Math.max(1, Math.floor(h * imageCropNatural.h));
      const canvas = document.createElement('canvas');
      canvas.width = pw;
      canvas.height = ph;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, px, py, pw, ph, 0, 0, pw, ph);
      let dataUrl = canvas.toDataURL('image/png');
      const aspect = ph / pw;
      const defaultW = 200;
      const addImage = (src) => {
        addElement('image', { src, w: defaultW, h: defaultW * aspect });
        addLog('이미지 크롭 후 추가됨.');
        closeImageCrop();
      };
      addImage(dataUrl);
    };
    img.src = imageCropSrc;
  };

  const exportToPptx = async () => {
    try {
      setStatus('processing');
      addLog('PPTX 생성 중...');
      const pptx = new window.PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      const hex = (c) => (c || '').toString().replace('#', '');
      slides.forEach((slideData) => {
        const slide = pptx.addSlide();
        slide.addImage({ data: slideData.baseImage, x: 0, y: 0, w: '100%', h: '100%' });
        const w = slideData.width || 1000, h = slideData.height || 562.5;
        slideData.elements.forEach(el => {
          const opts = { x: `${(el.x / w) * 100}%`, y: `${(el.y / h) * 100}%`, w: `${(el.w / w) * 100}%`, h: `${(el.h / h) * 100}%` };
          if (el.type === 'text') {
            slide.addText(String(el.content || ''), {
              ...opts,
              fontSize: el.fontSize,
              bold: el.isBold,
              italic: el.isItalic,
              underline: el.isUnderline,
              color: hex(el.color || '#000000'),
              fill: el.bgColor !== 'transparent' ? { color: hex(el.bgColor || '#ffffff') } : null,
              fontFace: el.fontFamily || 'Malgun Gothic',
              align: 'center',
              valign: 'middle'
            });
          } else if (el.type === 'image') {
            slide.addImage({ data: el.src, ...opts });
          } else if (el.type === 'shape') {
            const fill = { color: hex(el.bgColor || '#ffffff') };
            const line = (el.borderColor && (el.borderWidth || 0) > 0) ? { color: hex(el.borderColor), pt: Math.min(5, el.borderWidth || 2) } : null;
            let st = pptx.ShapeType.rect;
            if (el.shapeType === 'roundedRect') st = pptx.ShapeType.roundRect || pptx.ShapeType.rect;
            else if (el.shapeType === 'circle') st = pptx.ShapeType.ellipse;
            else if (el.shapeType === 'triangle') st = pptx.ShapeType.triangle;
            else if (el.shapeType === 'arrowLine') {
              const dir = el.arrowDirection || 'right';
              st = dir === 'up' ? (pptx.ShapeType.upArrow || pptx.ShapeType.triangle) : dir === 'down' ? (pptx.ShapeType.downArrow || pptx.ShapeType.triangle) : dir === 'left' ? (pptx.ShapeType.leftArrow || pptx.ShapeType.triangle) : (pptx.ShapeType.rightArrow || pptx.ShapeType.triangle);
            }
            try {
              slide.addShape(st, { ...opts, fill, line });
            } catch (_) {
              slide.addShape(pptx.ShapeType.rect, { ...opts, fill, line });
            }
          }
        });
      });
      await pptx.writeFile({ fileName: `Slide_Master_${Date.now()}.pptx` });
      setStatus('preview');
      addLog('PPTX 다운로드 완료.');
    } catch (err) { setError(err.message); setStatus('error'); }
  };

  const exportToPdf = async () => {
    try {
      setStatus('processing');
      addLog('PDF 생성 중...');
      const { jsPDF } = window.jspdf;
      const first = slides[0];
      const fw = first?.width || 1000, fh = first?.height || 562.5;
      const pdf = new jsPDF({ orientation: fw > fh ? 'landscape' : 'portrait', unit: 'px', format: [fw, fh] });
      const hexToRgb = (hex) => {
        const h = (hex || '').replace('#', '');
        if (h.length !== 6) return [255, 255, 255];
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      };
      const setFill = (el) => { const [r, g, b] = hexToRgb(el.bgColor || '#ffffff'); pdf.setFillColor(r, g, b); };
      const setStroke = (el) => {
        const [r, g, b] = hexToRgb(el.borderColor || '#000000');
        pdf.setDrawColor(r, g, b);
        pdf.setLineWidth(Math.min(5, Math.max(0, Number(el.borderWidth) || 0)));
      };
      for (let i = 0; i < slides.length; i++) {
        if (i > 0) {
          const s = slides[i];
          const sw = s.width || 1000, sh = s.height || 562.5;
          pdf.addPage([sw, sh], sw > sh ? 'landscape' : 'portrait');
        }
        const s = slides[i];
        const sw = s.width || 1000, sh = s.height || 562.5;
        pdf.addImage(s.baseImage, 'PNG', 0, 0, sw, sh);
        s.elements.forEach(el => {
          if (el.type === 'shape') {
            setFill(el);
            setStroke(el);
            const x = el.x, y = el.y, w = el.w, h = el.h;
            if (el.shapeType === 'circle') {
              const r = Math.min(w, h) / 2;
              try { pdf.ellipse(x + w/2, y + h/2, r, r, 'FD'); } catch (_) { pdf.rect(x, y, w, h, 'FD'); }
            } else {
              pdf.rect(x, y, w, h, 'FD');
            }
          }
          if (el.type === 'text' && el.bgColor !== 'transparent' && el.bgColor) {
            setFill(el);
            pdf.rect(el.x, el.y, el.w, el.h, 'F');
          }
          if (el.type === 'image') pdf.addImage(el.src, 'PNG', el.x, el.y, el.w, el.h);
          if (el.type === 'text') {
            const [r, g, b] = hexToRgb(el.color || '#000000');
            pdf.setTextColor(r, g, b);
            pdf.setFontSize((el.fontSize || 24) * 1.5);
            pdf.setFont(undefined, el.isBold ? 'bold' : 'normal', el.isItalic ? 'italic' : 'normal');
            pdf.text(String(el.content || ''), el.x + el.w/2, el.y + el.h/2, { align: 'center', baseline: 'middle' });
          }
        });
      }
      pdf.save(`Slide_Export_${Date.now()}.pdf`);
      setStatus('preview');
      addLog('PDF 다운로드 완료.');
    } catch (err) { setError(err.message); setStatus('error'); }
  };

  const getPTIData = () => ({
    slides: JSON.parse(JSON.stringify(slides)),
    currentSlideIdx,
    slideOrientation,
    viewMode,
  });

  const savePTIToIndexedDB = async () => {
    if (!slides.length) { addLog('저장할 슬라이드가 없습니다.'); return; }
    const name = projectName.trim() || window.prompt('저장할 프로젝트 이름 (.pti)', `Project_${Date.now()}.pti`);
    if (!name) return;
    const finalName = name.endsWith('.pti') ? name : `${name}.pti`;
    try {
      await saveProjectToIndexedDB(finalName, getPTIData());
      setProjectName(finalName);
      addLog(`PTI 저장됨: ${finalName}`);
    } catch (err) {
      setError('저장 실패: ' + err.message);
      setStatus('error');
    }
  };

  const openLoadModal = async () => {
    try {
      const list = await listProjectsFromIndexedDB();
      setSavedProjectsList(list);
      setShowLoadModal(true);
    } catch (err) {
      addLog('목록 불러오기 실패: ' + err.message);
    }
  };

  const loadPTIFromIndexedDB = async (id) => {
    try {
      const data = await loadProjectFromIndexedDB(id);
      if (!data || !data.slides || !Array.isArray(data.slides)) {
        addLog('올바른 PTI 데이터가 아닙니다.');
        return;
      }
      setSlides(data.slides);
      if (typeof data.currentSlideIdx === 'number') setCurrentSlideIdx(Math.min(data.currentSlideIdx, data.slides.length - 1));
      if (data.slideOrientation) setSlideOrientation(data.slideOrientation);
      if (data.viewMode) setViewMode(data.viewMode);
      setProjectName(id);
      setStatus('preview');
      setShowLoadModal(false);
      setVersionHistory([]);
      addLog(`불러옴: ${id}`);
    } catch (err) {
      addLog('불러오기 실패: ' + err.message);
    }
  };

  const exportPTIFile = () => {
    if (!slides.length) { addLog('내보낼 슬라이드가 없습니다.'); return; }
    const json = serializePTI(getPTIData());
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = projectName || `Project_${Date.now()}.pti`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    addLog('PTI 파일로 내보냈습니다.');
  };

  const importPTIFile = (e) => {
    const f = e.target?.files?.[0];
    if (f) loadPTIFromFile(f);
    e.target.value = '';
  };

  const startSlideshow = () => {
    if (!slides.length) return;
    setSlideshowSlideIdx(currentSlideIdx);
    setIsSlideshowActive(true);
  };

  const exitSlideshow = () => setIsSlideshowActive(false);

  useEffect(() => {
    if (!isSlideshowActive) return;
    const onKey = (e) => {
      if (e.key === 'Escape') exitSlideshow();
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setSlideshowSlideIdx((i) => (i < slides.length - 1 ? i + 1 : i));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSlideshowSlideIdx((i) => (i > 0 ? i - 1 : i));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSlideshowActive, slides.length]);

  const exportAsLongVerticalImage = async () => {
    if (!slides.length) return;
    try {
      setStatus('processing');
      addLog('세로 길게 이미지 생성 중...');
      const totalWidth = Math.max(...slides.map(s => s.width || 1000));
      const totalHeight = slides.reduce((sum, s) => sum + (s.height || 562.5), 0);
      const mainCanvas = document.createElement('canvas');
      mainCanvas.width = totalWidth;
      mainCanvas.height = totalHeight;
      const mainCtx = mainCanvas.getContext('2d');
      let offsetY = 0;
      const hexToRgb = (hex) => {
        const h = (hex || '').replace('#', '');
        if (h.length !== 6) return [0, 0, 0];
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      };
      for (const slide of slides) {
        const sw = slide.width || 1000, sh = slide.height || 562.5;
        const off = document.createElement('canvas');
        off.width = sw;
        off.height = sh;
        const ctx = off.getContext('2d');
        const baseImg = new Image();
        await new Promise((res, rej) => { baseImg.onload = res; baseImg.onerror = rej; baseImg.src = slide.baseImage; });
        ctx.drawImage(baseImg, 0, 0);
        for (const el of slide.elements || []) {
          if (el.type === 'image' && el.src) {
            const img = new Image();
            await new Promise((res, rej) => { img.onload = res; img.onerror = res; img.src = el.src; });
            if (img.complete && img.naturalWidth) ctx.drawImage(img, el.x, el.y, el.w, el.h);
          } else if (el.type === 'shape') {
            const [r, g, b] = hexToRgb(el.borderColor || '#000000');
            ctx.strokeStyle = `rgb(${r},${g},${b})`;
            ctx.lineWidth = Math.min(10, Math.max(0, Number(el.borderWidth) || 0));
            const fill = el.bgColor === 'transparent' ? null : (el.bgColor || '#ffffff');
            if (fill) {
              const [fr, fg, fb] = hexToRgb(fill);
              ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
            }
            const x = el.x, y = el.y, w = el.w, h = el.h;
            if (el.shapeType === 'circle') {
              const rad = Math.min(w, h) / 2;
              ctx.beginPath();
              ctx.ellipse(x + w/2, y + h/2, rad, rad, 0, 0, Math.PI * 2);
              if (fill) ctx.fill();
              if (ctx.lineWidth) ctx.stroke();
            } else {
              if (fill) ctx.fillRect(x, y, w, h);
              if (ctx.lineWidth) ctx.strokeRect(x, y, w, h);
            }
          } else if (el.type === 'text') {
            if (el.bgColor && el.bgColor !== 'transparent') {
              const [fr, fg, fb] = hexToRgb(el.bgColor);
              ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
              ctx.fillRect(el.x, el.y, el.w, el.h);
            }
            const [r, g, b] = hexToRgb(el.color || '#000000');
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.font = `${el.isBold ? 'bold ' : ''}${el.isItalic ? 'italic ' : ''}${el.fontSize || 24}px ${el.fontFamily || 'Malgun Gothic'}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(el.content || ''), el.x + el.w/2, el.y + el.h/2);
          }
        }
        const drawX = (totalWidth - sw) / 2;
        mainCtx.drawImage(off, drawX, offsetY, sw, sh);
        offsetY += sh;
      }
      const link = document.createElement('a');
      link.download = `Slides_Long_${Date.now()}.png`;
      link.href = mainCanvas.toDataURL('image/png');
      link.click();
      setStatus('preview');
      addLog('세로 길게 PNG 다운로드 완료.');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-4 md:p-6 font-sans text-slate-900 select-none flex flex-col overflow-x-hidden">
      {/* Header - 모바일에서 세로 배치·줄바꿈 */}
      <header className="mb-2 sm:mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-white p-2 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          <div className="bg-indigo-600 p-1 rounded-lg text-white flex items-center justify-center flex-shrink-0"><Layout size={12}/></div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black tracking-tight text-slate-800 truncate">PDF to Image Master <span className="text-indigo-600">{APP_VERSION}</span></h1>
            <p className="text-[7px] sm:text-[8px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">Precision Edit & Version Control</p>
          </div>
        </div>
        
        {status === 'preview' && (
          <div className="flex gap-0.5 flex-wrap items-center justify-end">
            <div className="flex items-center gap-1 mr-1 order-1 w-full sm:w-auto">
              <span className="text-[8px] font-bold text-slate-500 whitespace-nowrap">PTI:</span>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="이름.pti"
                className="flex-1 min-w-0 max-w-[120px] sm:max-w-none sm:w-24 px-1.5 py-1 rounded border border-slate-200 text-[10px] font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button onClick={savePTIToIndexedDB} className="flex items-center gap-0.5 bg-violet-600 text-white px-2 py-1 rounded-lg text-[9px] font-bold hover:bg-violet-700" title="IndexedDB에 PTI로 저장">
              <Save size={10}/> PTI 저장
            </button>
            <button onClick={openLoadModal} className="flex items-center gap-0.5 bg-violet-500 text-white px-2 py-1 rounded-lg text-[9px] font-bold hover:bg-violet-600" title="저장된 PTI 불러오기">
              <FolderOpen size={10}/> 불러오기
            </button>
            <label className="flex items-center gap-0.5 bg-slate-600 text-white px-2 py-1 rounded-lg text-[9px] font-bold hover:bg-slate-700 cursor-pointer">
              <Upload size={10}/> PTI 열기
              <input type="file" accept=".pti,application/json" className="hidden" onChange={importPTIFile} />
            </label>
            <button onClick={exportPTIFile} className="flex items-center gap-0.5 bg-slate-500 text-white px-2 py-1 rounded-lg text-[9px] font-bold hover:bg-slate-600" title=".pti 파일로 다운로드">
              <Download size={10}/> PTI 내보내기
            </button>
            <div className="w-px bg-slate-200 mx-0.5 h-5"></div>
            <button onClick={startSlideshow} className="flex items-center gap-0.5 bg-rose-500 text-white px-2 py-1 rounded-lg text-[9px] font-bold hover:bg-rose-600" title="슬라이드쇼 재생">
              <Play size={10}/> 슬라이드쇼
            </button>
            <div className="w-px bg-slate-200 mx-0.5 h-5"></div>
            <button onClick={() => saveVersion(slides, "수동 저장")} className="flex items-center gap-0.5 bg-slate-800 text-white px-2 py-1 rounded-lg text-[9px] font-bold hover:bg-black transition-all">
              <History size={10}/> 버전 저장
            </button>
            <div className="w-px bg-slate-200 mx-0.5"></div>
            <button onClick={exportToPptx} className="flex items-center gap-0.5 bg-indigo-600 text-white px-2 py-1 rounded-lg text-[9px] font-bold hover:bg-indigo-700">
              <FileType size={10}/> PPTX
            </button>
            <button onClick={exportToPdf} className="flex items-center gap-0.5 bg-emerald-600 text-white px-2 py-1 rounded-lg text-[9px] font-bold hover:bg-emerald-700">
              <FileDown size={10}/> PDF
            </button>
            <button onClick={exportAsLongVerticalImage} className="flex items-center gap-0.5 bg-amber-500 text-white px-2 py-1 rounded-lg text-[9px] font-bold hover:bg-amber-600" title="전체 슬라이드를 세로로 이어 붙인 한 장의 이미지">
              <RectangleVertical size={10}/> 세로이미지제작
            </button>
            <button onClick={() => { setFile(null); setStatus('idle'); setSlides([]); }} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={14}/></button>
          </div>
        )}
      </header>

      {/* PTI 불러오기 모달 */}
      {showLoadModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowLoadModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-800">저장된 PTI 불러오기</h2>
              <button onClick={() => setShowLoadModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {savedProjectsList.length === 0 ? (
                <p className="text-slate-500 text-sm">저장된 프로젝트가 없습니다.</p>
              ) : (
                savedProjectsList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => loadPTIFromIndexedDB(p.id)}
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-left transition-all"
                  >
                    <p className="font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.savedAt ? new Date(p.savedAt).toLocaleString() : ''}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 슬라이드쇼 전체화면 */}
      {isSlideshowActive && slides.length > 0 && (
        <div className="fixed inset-0 z-[1200] bg-black flex items-center justify-center" onClick={() => setSlideshowSlideIdx((i) => (i < slides.length - 1 ? i + 1 : i))}>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <div
              className="relative bg-slate-900"
              style={{
                width: '100%',
                maxWidth: '100%',
                maxHeight: '100%',
                aspectRatio: `${slides[slideshowSlideIdx]?.width || 1000}/${slides[slideshowSlideIdx]?.height || 562.5}`,
              }}
            >
              <div
                className="absolute inset-0 bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${slides[slideshowSlideIdx]?.baseImage})` }}
              />
              {(slides[slideshowSlideIdx]?.elements || []).map((el) => {
                const sw = slides[slideshowSlideIdx].width || 1000;
                const sh = slides[slideshowSlideIdx].height || 562.5;
                return (
                  <div
                    key={el.id}
                    className="absolute flex items-center justify-center pointer-events-none"
                    style={{
                      left: `${(el.x / sw) * 100}%`,
                      top: `${(el.y / sh) * 100}%`,
                      width: `${(el.w / sw) * 100}%`,
                      height: `${(el.h / sh) * 100}%`,
                      transform: `rotate(${el.rotation || 0}deg)`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {el.type === 'text' && (
                      <div
                        style={{
                          fontSize: `${el.fontSize || 24}px`,
                          fontWeight: el.isBold ? 'bold' : 'normal',
                          fontStyle: el.isItalic ? 'italic' : 'normal',
                          textDecoration: el.isUnderline ? 'underline' : 'none',
                          color: el.color || '#000000',
                          fontFamily: el.fontFamily || 'Malgun Gothic',
                          textAlign: 'center',
                          width: '100%',
                          wordBreak: 'break-all',
                          padding: '2px',
                        }}
                      >
                        {String(el.content || '')}
                      </div>
                    )}
                    {el.type === 'image' && <img src={el.src} alt="" className="max-w-full max-h-full object-contain" />}
                    {el.type === 'shape' && (() => {
                      const stroke = el.borderColor || '#000000';
                      const fill = el.bgColor === 'transparent' ? 'transparent' : (el.bgColor || '#ffffff');
                      const bw = Math.max(0, Number(el.borderWidth) || 0);
                      const dir = el.arrowDirection || 'right';
                      if (el.shapeType === 'arrowLine') {
                        const lineProps = { up: { x1: 50, y1: 90, x2: 50, y2: 15 }, down: { x1: 50, y1: 10, x2: 50, y2: 85 }, left: { x1: 90, y1: 50, x2: 15, y2: 50 }, right: { x1: 10, y1: 50, x2: 85, y2: 50 } }[dir];
                        const headPoints = { up: '45,10 55,10 50,0', down: '45,90 55,90 50,100', left: '10,45 10,55 0,50', right: '90,45 90,55 100,50' }[dir];
                        return (
                          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <line {...lineProps} stroke={stroke} strokeWidth={Math.max(2, bw * 2)} strokeLinecap="round" fill="none" />
                            <polygon points={headPoints} fill={stroke} stroke="none" />
                          </svg>
                        );
                      }
                      const baseStyle = { width: '100%', height: '100%', backgroundColor: fill, border: fill === 'transparent' ? (bw > 0 ? `${bw}px solid ${stroke}` : 'none') : `${bw}px solid ${stroke}`, boxSizing: 'border-box' };
                      if (el.shapeType === 'roundedRect') return <div style={{ ...baseStyle, borderRadius: '12%' }} />;
                      if (el.shapeType === 'triangle') {
                        return (
                          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <polygon points="50,5 95,95 5,95" fill={fill} stroke={stroke} strokeWidth={bw} />
                          </svg>
                        );
                      }
                      if (el.shapeType === 'circle') return <div style={{ ...baseStyle, borderRadius: '50%' }} />;
                      return <div style={baseStyle} />;
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setSlideshowSlideIdx((i) => (i > 0 ? i - 1 : i)); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all"
            aria-label="이전"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setSlideshowSlideIdx((i) => (i < slides.length - 1 ? i + 1 : i)); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all"
            aria-label="다음"
          >
            <ChevronRight size={32} />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 text-white text-sm font-bold">
            {slideshowSlideIdx + 1} / {slides.length}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); exitSlideshow(); }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all"
            aria-label="종료"
          >
            <X size={28} />
          </button>
        </div>
      )}

      <main className={`flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-4 min-h-0 min-w-0 ${status === 'preview' && viewMode === 'vertical' ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {status === 'idle' ? (
          <div className="lg:col-span-12 flex items-center justify-center h-full overflow-auto">
            <div 
              className={`max-w-xl w-full p-20 bg-white border-4 border-dashed rounded-[3rem] text-center cursor-pointer transition-all
                ${isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-slate-200 hover:border-indigo-400'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('pdfInput').click()}
            >
              <Upload size={64} className={`mx-auto mb-6 transition-colors ${isDragging ? 'text-indigo-600 animate-bounce' : 'text-slate-300'}`} />
              <h2 className="text-2xl font-black text-slate-700">PDF 또는 PTI 파일을 드롭하여 시작</h2>
              <p className="text-slate-400 mt-2 font-medium">PDF: 변환 후 편집 · PTI: 저장된 프로젝트 불러오기</p>
              <input id="pdfInput" type="file" className="hidden" accept=".pti,.pdf,application/pdf,application/json" onChange={(e) => { handleOpenFile(e.target.files?.[0]); e.target.value = ''; }} />
              <label htmlFor="pdfInput" className="mt-4 inline-block text-sm font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer underline">
                또는 PDF / PTI 파일 선택
              </label>
              {file && (
                <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between animate-in zoom-in">
                  <div className="text-left"><p className="font-bold text-indigo-900 truncate max-w-[250px]">{String(file.name)}</p><p className="text-[10px] text-indigo-400 font-bold">{(file.size/1024/1024).toFixed(2)} MB</p></div>
                  <button onClick={(e) => { e.stopPropagation(); processPdf(); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black shadow-lg hover:bg-indigo-700">변환 시작</button>
                </div>
              )}
            </div>
          </div>
        ) : status === 'processing' ? (
          <div className="lg:col-span-12 flex flex-col items-center justify-center h-full">
            <div className="relative w-40 h-40 mb-8">
              <div className="absolute inset-0 border-8 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center font-black text-3xl text-indigo-600">{progress}%</div>
            </div>
            <h2 className="text-2xl font-black">프로세싱 중...</h2>
          </div>
        ) : status === 'preview' ? (
          <>
            {/* Left Sidebar: 편집 도구 - 모바일에서 가로 스크롤 */}
            <div className="lg:col-span-1 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible p-2 lg:pr-2 min-h-0 lg:min-w-[88px] order-2 lg:order-1 shrink-0 lg:shrink">
              <div className="bg-white p-2 rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 flex flex-row lg:flex-col gap-0.5 flex-shrink-0 lg:flex-shrink flex-nowrap lg:flex-nowrap">
                <p className="text-[9px] font-black text-slate-400 uppercase px-2 py-1.5 border-b border-slate-100 tracking-wider hidden lg:block">편집 도구</p>
                <div className="h-px bg-slate-100 mx-1"></div>
                <button onClick={addTextElement} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 flex flex-col items-center justify-center gap-0.5 min-h-[52px]">
                  <Type size={18}/> <span className="text-[8px] font-black uppercase">텍스트</span>
                </button>
                <div className="h-px bg-slate-100 mx-1"></div>
                <p className="text-[8px] font-black text-slate-400 uppercase px-1">도형</p>
                <div className="grid grid-cols-2 gap-0.5">
                  <button onClick={addRectElement} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500 flex flex-col items-center gap-0" title="사각형"><Square size={14}/></button>
                  <button onClick={addRoundedRectElement} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500 flex flex-col items-center gap-0" title="둥근 사각형"><Square size={14} className="rounded-sm"/></button>
                  <button onClick={addTriangleElement} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500 flex flex-col items-center gap-0" title="삼각형"><Triangle size={14}/></button>
                  <button onClick={addCircleElement} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500 flex flex-col items-center gap-0" title="원"><Circle size={14}/></button>
                </div>
                <p className="text-[8px] font-black text-slate-400 uppercase px-1 mt-1">화살표</p>
                <div className="grid grid-cols-4 gap-0.5">
                  <button onClick={() => addArrowLineElement('up')} className="p-1 rounded hover:bg-slate-50 text-slate-500" title="위"><ArrowUp size={12}/></button>
                  <button onClick={() => addArrowLineElement('down')} className="p-1 rounded hover:bg-slate-50 text-slate-500" title="아래"><ArrowDown size={12}/></button>
                  <button onClick={() => addArrowLineElement('left')} className="p-1 rounded hover:bg-slate-50 text-slate-500" title="왼쪽"><ArrowLeft size={12}/></button>
                  <button onClick={() => addArrowLineElement('right')} className="p-1 rounded hover:bg-slate-50 text-slate-500" title="오른쪽"><ArrowRight size={12}/></button>
                </div>
                <div className="h-px bg-slate-100 mx-1 mt-1"></div>
                <button onClick={() => document.getElementById('imgAdd').click()} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 flex flex-col items-center justify-center gap-0.5 min-h-[52px]">
                  <ImageIcon size={18}/> <span className="text-[8px] font-black uppercase">이미지</span>
                  <input id="imgAdd" type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || !file.type.startsWith('image/')) return;
                    const r = new FileReader();
                    r.onload = (ev) => openImageCrop(ev.target?.result);
                    r.readAsDataURL(file);
                    e.target.value = '';
                  }}/>
                </button>
              </div>
              
              {/* History List */}
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-0">
                <p className="text-[9px] font-black text-slate-400 uppercase p-2 border-b border-slate-100 tracking-wider">History</p>
                <div className="flex-1 overflow-y-auto p-1 space-y-2">
                  {versionHistory.map((h, i) => (
                    <button key={i} onClick={() => loadVersion(h)} className="w-full p-2 rounded-lg text-left hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all group">
                      <p className="text-[10px] font-black text-slate-700 group-hover:text-indigo-600">{String(h.version)}</p>
                      <p className="text-[8px] text-slate-400 font-bold">{String(h.timestamp)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Canvas Editor - 모바일에서 먼저 표시(order-1), 슬라이드 최대 크기 제한 */}
            <div className={`lg:col-span-8 flex flex-col gap-2 min-h-0 flex-1 overflow-hidden order-1 lg:order-2 ${viewMode === 'vertical' ? 'min-h-min' : ''}`} style={viewMode === 'vertical' ? { minHeight: 'min-content' } : undefined}>
              {/* 도구 바 - 모바일에서 줄바꿈 */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white p-2 sm:p-3 rounded-xl shadow-sm border border-slate-200 shrink-0">
                <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                  <div className="flex rounded-lg overflow-hidden border border-slate-200" title="보기 방식">
                    <button onClick={() => setViewMode('single')} className={`px-3 py-1.5 text-[10px] font-black transition-all flex items-center gap-1 ${viewMode === 'single' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`} title="가로모드: 한 페이지씩 보기"><Layout size={14}/> 한 페이지</button>
                    <button onClick={() => setViewMode('vertical')} className={`px-3 py-1.5 text-[10px] font-black transition-all flex items-center gap-1 ${viewMode === 'vertical' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`} title="세로모드: 전체 페이지 세로 배열"><List size={14}/> 전체 배열</button>
                  </div>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200" title="확대/축소">
                    <button onClick={() => setEditorZoom((z) => Math.max(50, z - 10))} className="px-3 py-1.5 text-[10px] font-black text-slate-500 hover:bg-slate-100 flex items-center gap-1" title="축소"><ZoomOut size={14}/></button>
                    <span className="px-2 py-1.5 text-[10px] font-black text-slate-600 min-w-[3rem] text-center">{editorZoom}%</span>
                    <button onClick={() => setEditorZoom((z) => Math.min(200, z + 10))} className="px-3 py-1.5 text-[10px] font-black text-slate-500 hover:bg-slate-100 flex items-center gap-1" title="확대"><ZoomIn size={14}/></button>
                  </div>
                  <button onClick={() => insertBlankSlideAfter(currentSlideIdx)} className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-indigo-200 transition-all">+ 빈 페이지</button>
                  <button onClick={deleteCurrentSlide} disabled={slides.length <= 1} className="px-3 py-1.5 rounded-lg text-[10px] font-black transition-all bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1" title="현재 페이지 삭제"><Trash2 size={12}/> 삭제</button>
                  <button disabled={currentSlideIdx === 0} onClick={() => setCurrentSlideIdx(p => p - 1)} className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all text-slate-500 touch-manipulation" aria-label="이전"><ChevronLeft size={20}/></button>
                  <span className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Page {currentSlideIdx + 1} / {slides.length}</span>
                  <form
                    className="flex items-center gap-1"
                    onSubmit={(e) => { e.preventDefault(); goToPage(); }}
                  >
                    <label className="text-[10px] font-bold text-slate-500 whitespace-nowrap">N페이지로 끼워넣기</label>
                    <input
                      ref={goToPageInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={goToPageInput}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        setGoToPageInput(v);
                      }}
                      placeholder="번호"
                      className="w-12 px-1.5 py-1 rounded border border-slate-200 text-[10px] font-bold text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <button type="button" onClick={goToPage} className="px-2 py-1 rounded-lg text-[10px] font-black bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-all">이동</button>
                  </form>
                </div>
                  <button disabled={currentSlideIdx === slides.length - 1} onClick={() => setCurrentSlideIdx(p => p + 1)} className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all text-slate-500 touch-manipulation" aria-label="다음"><ChevronRight size={20}/></button>
                </div>
              </div>
              {/* 세로모드: 전체 슬라이드를 세로로 스크롤 */}
              {viewMode === 'vertical' && (
                <div className="flex-1 min-h-[120px] overflow-y-auto rounded-xl bg-slate-800/80 p-3 space-y-4 border border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider sticky top-0 py-1 bg-slate-800/95 z-10">전체 페이지 (클릭하여 편집할 슬라이드 선택)</p>
                  {slides.map((slide, idx) => (
                    <div
                      key={idx}
                      onClick={() => setCurrentSlideIdx(idx)}
                      className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all mx-auto ${currentSlideIdx === idx ? 'border-indigo-500 ring-2 ring-indigo-400/50' : 'border-slate-600 hover:border-slate-500'}`}
                      style={{
                        aspectRatio: `${slide.width || 1000}/${slide.height || 562.5}`,
                        maxWidth: '100%',
                        width: '100%'
                      }}
                    >
                      <div className="w-full h-full bg-contain bg-center bg-no-repeat bg-slate-900" style={{ backgroundImage: `url(${slide.baseImage})` }} />
                    </div>
                  ))}
                </div>
              )}
              {/* 편집 캔버스 - 최대 너비 제한으로 슬라이드 크기 적정화, 모바일에서 전체 너비 */}
              <div className="flex items-start justify-center overflow-auto min-h-[200px] sm:min-h-[280px] flex-1 w-full">
                <div className="w-full max-w-full flex justify-center items-start px-0 sm:px-4" style={{ transform: `scale(${editorZoom / 100})`, transformOrigin: 'top center' }}>
                  <div ref={editorContainerRef} className={`relative bg-slate-900 rounded-xl sm:rounded-[2rem] overflow-hidden shadow-2xl flex-shrink-0 w-full max-w-[min(100%,56rem)] ${viewMode === 'vertical' ? 'max-h-[50vh]' : ''}`} style={{ aspectRatio: `${slideW}/${slideH}` }}>
                <div className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: slides[currentSlideIdx]?.baseImage ? `url(${slides[currentSlideIdx].baseImage})` : undefined }} onClick={() => setSelectedElementId(null)}>
                  {(slides[currentSlideIdx]?.elements || []).map(el => (
                    <div key={el.id} onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
                      style={{
                        position: 'absolute',
                        left: `${(el.x / slideW) * 100}%`, top: `${(el.y / slideH) * 100}%`, width: `${(el.w / slideW) * 100}%`, height: `${(el.h / slideH) * 100}%`,
                        border: selectedElementId === el.id ? '2px solid #6366f1' : 'none',
                        backgroundColor: (el.type === 'shape' && el.bgColor === 'transparent') ? 'transparent' : (el.bgColor || 'transparent'),
                        cursor: 'move', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: selectedElementId === el.id ? 50 : 10,
                        transform: `rotate(${el.rotation || 0}deg)`,
                        transformOrigin: 'center center'
                      }}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        const sx = e.clientX, sy = e.clientY, ox = el.x, oy = el.y;
                        const r = editorContainerRef.current.getBoundingClientRect(), s = slideW / r.width;
                        const mv = (m) => {
                          const nx = ox + (m.clientX - sx) * s, ny = oy + (m.clientY - sy) * (slideH / r.height);
                          updateCurrentSlideElements(slides[currentSlideIdx].elements.map(item => item.id === el.id ? { ...item, x: nx, y: ny } : item));
                        };
                        const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
                        window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
                      }}>
                      {el.type === 'text' && (
                        <div
                          style={{
                            fontSize: `${el.fontSize || 24}px`,
                            fontWeight: el.isBold ? 'bold' : 'normal',
                            fontStyle: el.isItalic ? 'italic' : 'normal',
                            textDecoration: el.isUnderline ? 'underline' : 'none',
                            color: el.color || '#000000',
                            fontFamily: el.fontFamily || 'Malgun Gothic',
                            textAlign: 'center',
                            width: '100%',
                            wordBreak: 'break-all',
                            padding: '5px',
                            boxSizing: 'border-box'
                          }}
                        >
                          {String(el.content || '')}
                        </div>
                      )}
                      {el.type === 'image' && <img src={el.src} className="max-w-full max-h-full object-contain pointer-events-none" alt="" />}
                      {el.type === 'shape' && (() => {
                        const stroke = el.borderColor || '#000000';
                        const fill = (el.bgColor === 'transparent' ? 'transparent' : (el.bgColor || '#ffffff'));
                        const bw = Math.max(0, Number(el.borderWidth) || 0);
                        const dir = el.arrowDirection || 'right';
                        if (el.shapeType === 'arrowLine') {
                          const lineProps = { up: { x1: 50, y1: 90, x2: 50, y2: 15 }, down: { x1: 50, y1: 10, x2: 50, y2: 85 }, left: { x1: 90, y1: 50, x2: 15, y2: 50 }, right: { x1: 10, y1: 50, x2: 85, y2: 50 } }[dir];
                          const headPoints = { up: '45,10 55,10 50,0', down: '45,90 55,90 50,100', left: '10,45 10,55 0,50', right: '90,45 90,55 100,50' }[dir];
                          return (
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <line {...lineProps} stroke={stroke} strokeWidth={Math.max(2, bw * 2)} strokeLinecap="round" fill="none"/>
                              <polygon points={headPoints} fill={stroke} stroke="none"/>
                            </svg>
                          );
                        }
                        const baseStyle = { width: '100%', height: '100%', backgroundColor: fill, border: fill === 'transparent' ? (bw > 0 ? `${bw}px solid ${stroke}` : 'none') : `${bw}px solid ${stroke}`, boxSizing: 'border-box' };
                        if (el.shapeType === 'roundedRect') return <div style={{ ...baseStyle, borderRadius: '12%' }} />;
                        if (el.shapeType === 'triangle') {
                          return (
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <polygon points="50,5 95,95 5,95" fill={fill} stroke={stroke} strokeWidth={bw}/>
                            </svg>
                          );
                        }
                        if (el.shapeType === 'circle') return <div style={{ ...baseStyle, borderRadius: '50%' }} />;
                        return <div style={baseStyle} />;
                      })()}
                      {selectedElementId === el.id && (
                        <>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-indigo-600 border-2 border-white cursor-grab active:cursor-grabbing flex items-center justify-center"
                          title="회전"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const r = editorContainerRef.current.getBoundingClientRect();
                            const s = slideW / r.width;
                            const elLeft = el.x + el.w/2, elTop = el.y + el.h/2;
                            const toAngle = (clientX, clientY) => {
                              const px = (clientX - r.left) * s, py = (clientY - r.top) * (slideH / r.height);
                              return Math.atan2(py - elTop, px - elLeft) * (180 / Math.PI);
                            };
                            let startAngle = toAngle(e.clientX, e.clientY);
                            let startRotation = el.rotation || 0;
                            const mv = (m) => {
                              const currentAngle = toAngle(m.clientX, m.clientY);
                              let delta = currentAngle - startAngle;
                              if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
                              updateCurrentSlideElements(slides[currentSlideIdx].elements.map(item => item.id === el.id ? { ...item, rotation: startRotation + delta } : item));
                            };
                            const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
                            window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
                          }}
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white cursor-nwse-resize"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const sx = e.clientX, sy = e.clientY, ow = el.w, oh = el.h;
                            const r = editorContainerRef.current.getBoundingClientRect(), s = slideW / r.width;
                            const mv = (m) => {
                              const nw = Math.max(20, ow + (m.clientX - sx) * s), nh = Math.max(20, oh + (m.clientY - sy) * (slideH / r.height));
                              updateCurrentSlideElements(slides[currentSlideIdx].elements.map(item => item.id === el.id ? { ...item, w: nw, h: nh } : item));
                            };
                            const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
                            window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
                          }}
                        />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar: 설정 - 모바일에서 하단(order-3) */}
            <div className="lg:col-span-3 flex flex-col gap-2 overflow-hidden min-h-0 order-3">
              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-y-auto flex flex-col min-h-0">
                {selectedElement ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">설정</span>
                      <button onClick={() => { updateCurrentSlideElements(slides[currentSlideIdx].elements.filter(e => e.id !== selectedElement.id)); setSelectedElementId(null); }} className="text-red-400 p-1.5 hover:bg-red-50 rounded-lg transition-all" title="삭제"><Trash2 size={16}/></button>
                    </div>

                    <div className="space-y-3 text-left">
                      {selectedElement.type !== 'shape' && (
                        <>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">배경 색상</label>
                          <div className="flex gap-2 items-center">
                            <input type="color" value={selectedElement.bgColor === 'transparent' ? '#ffffff' : (selectedElement.bgColor || '#ffffff')} onChange={(e) => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, bgColor: e.target.value } : it))} className="w-10 h-10 rounded-xl cursor-pointer border-2 border-slate-100 flex-shrink-0" />
                            <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, bgColor: 'transparent' } : it))} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black border transition-all ${selectedElement.bgColor === 'transparent' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>투명</button>
                            <button onClick={async () => { if(window.EyeDropper) { const d = new window.EyeDropper(); const res = await d.open(); updateCurrentSlideElements(slides[currentSlideIdx].elements.map(e => e.id === selectedElementId ? { ...e, bgColor: res.sRGBHex } : e)); } }} className="p-2 bg-slate-50 hover:bg-indigo-50 rounded-lg text-slate-400" title="스포이드"><Pipette size={14}/></button>
                          </div>
                        </>
                      )}
                    </div>

                    {selectedElement.type === 'shape' && (
                      <div className="space-y-3 pt-3 border-t border-slate-100 text-left">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">도형 스타일</p>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">내부 색</label>
                          <div className="flex gap-2 items-center">
                            <input type="color" value={selectedElement.bgColor === 'transparent' ? '#ffffff' : (selectedElement.bgColor || '#ffffff')} onChange={(e) => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, bgColor: e.target.value } : it))} className="flex-1 h-9 rounded-lg cursor-pointer border border-slate-200" disabled={selectedElement.bgColor === 'transparent'} />
                            <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, bgColor: it.bgColor === 'transparent' ? '#ffffff' : 'transparent' } : it))} className={`py-2 px-3 rounded-xl text-[10px] font-black border transition-all ${selectedElement.bgColor === 'transparent' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>투명</button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">테두리 색</label>
                          <input type="color" value={selectedElement.borderColor || '#000000'} onChange={(e) => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, borderColor: e.target.value } : it))} className="w-full h-9 rounded-lg cursor-pointer border border-slate-200" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">테두리 두께</label>
                          <div className="flex gap-1 items-center">
                            <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, borderWidth: Math.max(0, (it.borderWidth || 2) - 1) } : it))} className="p-2 bg-slate-100 hover:bg-indigo-100 rounded-lg"><Minus size={14}/></button>
                            <span className="flex-1 text-center text-sm font-black min-w-[2rem]">{selectedElement.borderWidth ?? 2}</span>
                            <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, borderWidth: (it.borderWidth || 2) + 1 } : it))} className="p-2 bg-slate-100 hover:bg-indigo-100 rounded-lg"><Plus size={14}/></button>
                          </div>
                          <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, borderWidth: 0 } : it))} className="mt-2 w-full py-2 rounded-lg text-[10px] font-black border border-slate-200 hover:bg-slate-50 text-slate-600">선 투명 (두께 0)</button>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">회전 (°)</label>
                          <div className="flex gap-1 items-center">
                            <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, rotation: Math.round((it.rotation || 0) - 15) } : it))} className="p-2 bg-slate-100 hover:bg-indigo-100 rounded-lg"><Minus size={14}/></button>
                            <span className="flex-1 text-center text-sm font-black min-w-[2.5rem]">{Math.round(selectedElement.rotation || 0)}°</span>
                            <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, rotation: Math.round((it.rotation || 0) + 15) } : it))} className="p-2 bg-slate-100 hover:bg-indigo-100 rounded-lg"><Plus size={14}/></button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedElement.type === 'text' && (
                      <div className="space-y-3 pt-3 border-t border-slate-100 text-left">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">내용 (한글 지원)</label>
                        <textarea value={String(selectedElement.content || '')} onChange={(e) => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, content: e.target.value } : it))} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm h-28 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-300 font-sans resize-none" placeholder="텍스트 입력" />
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">폰트</label>
                        <select value={selectedElement.fontFamily || 'Malgun Gothic'} onChange={(e) => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, fontFamily: e.target.value } : it))} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-sm">
                          {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">글자 색</label>
                        <input type="color" value={selectedElement.color || '#000000'} onChange={(e) => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, color: e.target.value } : it))} className="w-full h-10 rounded-xl cursor-pointer border border-slate-200" />
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">글자 크기</label>
                        <div className="flex gap-1 items-center">
                          <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, fontSize: Math.max(8, (it.fontSize || 24) - 2) } : it))} className="p-2 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 rounded-lg transition-colors"><Minus size={14}/></button>
                          <span className="flex-1 text-center text-sm font-black text-slate-700 min-w-[3rem]">{selectedElement.fontSize ?? 24}</span>
                          <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, fontSize: (it.fontSize || 24) + 2 } : it))} className="p-2 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 rounded-lg transition-colors"><Plus size={14}/></button>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, isBold: !it.isBold } : it))} className={`flex-1 min-w-[4rem] py-2 rounded-xl border text-[10px] font-black transition-all flex items-center justify-center gap-1 ${selectedElement.isBold ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}><Bold size={14}/> 굵게</button>
                          <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, isItalic: !it.isItalic } : it))} className={`flex-1 min-w-[4rem] py-2 rounded-xl border text-[10px] font-black transition-all flex items-center justify-center gap-1 ${selectedElement.isItalic ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}><Italic size={14}/> 기울임</button>
                          <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, isUnderline: !it.isUnderline } : it))} className={`flex-1 min-w-[4rem] py-2 rounded-xl border text-[10px] font-black transition-all flex items-center justify-center gap-1 ${selectedElement.isUnderline ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}><UnderlineIcon size={14}/> 밑줄</button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 gap-3 py-8">
                    <Move size={40} className="text-slate-300"/>
                    <p className="text-xs font-black text-slate-400 leading-relaxed">슬라이드의 요소를<br/>선택하여 편집하세요</p>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-950 rounded-xl p-3 text-slate-400 font-mono text-[9px] h-36 overflow-y-auto border border-slate-800 shrink-0">
                <p className="text-indigo-400 font-black mb-2 uppercase tracking-widest text-left">LOGS</p>
                {logs.map((log, i) => <div key={i} className="mb-1 text-left text-slate-500"><span className="text-slate-600">[{String(log.time)}]</span> {String(log.message)}</div>)}
              </div>
            </div>
          </>
        ) : null}
      </main>

      {/* Image Crop Modal */}
      {imageCropSrc && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && closeImageCrop()}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Crop size={20} className="text-indigo-600"/>
                <h2 className="text-lg font-black text-slate-800">이미지 크롭</h2>
              </div>
              <button onClick={closeImageCrop} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <p className="text-xs text-slate-500 px-4 pb-2">이미지 위에서 드래그하여 넣을 영역을 선택한 뒤 크롭 적용을 누르세요.</p>
            <div 
              className="relative flex-1 flex items-center justify-center min-h-[300px] bg-slate-100 overflow-hidden"
              onMouseDown={handleCropMouseDown}
              onMouseMove={handleCropMouseMove}
              onMouseLeave={handleCropMouseUp}
              style={{ cursor: 'crosshair' }}
            >
              <div className="relative inline-block max-w-full max-h-[60vh]">
                <img
                  ref={cropImageRef}
                  src={imageCropSrc}
                  alt="크롭할 이미지"
                  onLoad={onCropImageLoad}
                  className="block max-w-full max-h-[60vh] w-auto h-auto object-contain select-none"
                  draggable={false}
                  style={{ pointerEvents: 'none', display: 'block' }}
                />
                {imageCropNatural.w > 0 && (
                  <>
                    <div 
                      className="absolute inset-0 bg-black/50 transition-[clip-path] duration-75 pointer-events-none"
                      style={{ 
                        clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${cropSelection.x * 100}% ${cropSelection.y * 100}%, ${cropSelection.x * 100}% ${(cropSelection.y + cropSelection.h) * 100}%, ${(cropSelection.x + cropSelection.w) * 100}% ${(cropSelection.y + cropSelection.h) * 100}%, ${(cropSelection.x + cropSelection.w) * 100}% ${cropSelection.y * 100}%, ${cropSelection.x * 100}% ${cropSelection.y * 100}%)` 
                      }}
                    />
                    <div 
                      className="absolute border-2 border-indigo-400 border-dashed ring-2 ring-white/50 pointer-events-none"
                      style={{ 
                        left: `${cropSelection.x * 100}%`, 
                        top: `${cropSelection.y * 100}%`, 
                        width: `${cropSelection.w * 100}%`, 
                        height: `${cropSelection.h * 100}%` 
                      }}
                    />
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100">
              <button onClick={closeImageCrop} className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all">취소</button>
              <button onClick={applyImageCrop} className="px-4 py-2 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center gap-2">
                <Crop size={16}/> 크롭 적용
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="fixed inset-0 bg-red-600/90 backdrop-blur-md flex items-center justify-center z-[1000] p-10">
          <div className="bg-white p-10 rounded-[3rem] text-center max-w-md shadow-2xl animate-in zoom-in duration-300">
            <AlertCircle size={64} className="mx-auto text-red-500 mb-6" />
            <h2 className="text-2xl font-black mb-2 text-slate-800">오류가 발생했습니다</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">{error}</p>
            <button onClick={() => { setFile(null); setStatus('idle'); setSlides([]); }} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg">확인 후 초기화</button>
          </div>
        </div>
      )}
    </div>
  );
}