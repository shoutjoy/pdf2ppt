import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, FileText, Play, Download, Loader2, CheckCircle2, 
  AlertCircle, Layout, Eraser, Settings, Move, RotateCcw, 
  Type, Image as ImageIcon, ChevronLeft, ChevronRight, 
  Bold, Plus, Minus, Trash2, Save, Square, Circle, Triangle, Pipette, Scissors,
  Check, X, History, FileDown, FileType
} from 'lucide-react';

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
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]); 
  
  // Tool States
  const [captureMode, setCaptureMode] = useState(false); 
  const [selection, setSelection] = useState(null); 
  const [lastCaptureRect, setLastCaptureRect] = useState(null); 

  const editorContainerRef = useRef(null);

  // Derived State: Calculate selected element early to avoid ReferenceErrors
  const selectedElement = useMemo(() => {
    const currentSlide = slides[currentSlideIdx];
    return currentSlide?.elements?.find(el => el.id === selectedElementId) || null;
  }, [slides, currentSlideIdx, selectedElementId]);

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
    if (selectedFile?.type === 'application/pdf') {
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
      handleFile(e.dataTransfer.files[0]);
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

  const addTextElement = () => addElement('text', { content: '텍스트 입력', fontSize: 24, isBold: false, bgColor: 'transparent' });
  const addRectElement = () => addElement('shape', { shapeType: 'rect', w: 100, h: 100 });

  const handleCapture = () => {
    if (!selection || Math.abs(selection.w) < 10) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const currentSlide = slides[currentSlideIdx];
      const scaleX = currentSlide.width / 1000;
      const scaleY = currentSlide.height / 562.5;
      const normX = Math.min(selection.x, selection.x + selection.w);
      const normY = Math.min(selection.y, selection.y + selection.h);
      const normW = Math.abs(selection.w);
      const normH = Math.abs(selection.h);
      canvas.width = normW * scaleX;
      canvas.height = normH * scaleY;
      ctx.drawImage(img, normX * scaleX, normY * scaleY, normW * scaleX, normH * scaleY, 0, 0, canvas.width, canvas.height);
      const capturedData = canvas.toDataURL('image/png');
      const newEl = { id: Date.now(), type: 'image', src: capturedData, x: normX, y: normY, w: normW, h: normH };
      setLastCaptureRect({ x: normX, y: normY, w: normW, h: normH });
      const currentElements = slides[currentSlideIdx]?.elements || [];
      updateCurrentSlideElements([...currentElements, newEl]);
      setSelectedElementId(newEl.id);
      setSelection(null);
      setCaptureMode(false);
      addLog('영역 캡처 성공.');
    };
    img.src = slides[currentSlideIdx].baseImage;
  };

  const patchOriginalArea = () => {
    if (!lastCaptureRect) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width; canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const scaleX = img.width / 1000;
      const scaleY = img.height / 562.5;
      const pixel = ctx.getImageData(Math.max(0, Math.floor(lastCaptureRect.x * scaleX - 2)), Math.max(0, Math.floor(lastCaptureRect.y * scaleY - 2)), 1, 1).data;
      const hexColor = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
      const patchEl = { id: Date.now(), type: 'shape', shapeType: 'rect', x: lastCaptureRect.x, y: lastCaptureRect.y, w: lastCaptureRect.w, h: lastCaptureRect.h, bgColor: hexColor };
      const currentElements = slides[currentSlideIdx]?.elements || [];
      updateCurrentSlideElements([...currentElements, patchEl]);
      setLastCaptureRect(null);
      addLog('원본 영역이 패치되었습니다.');
    };
    img.src = slides[currentSlideIdx].baseImage;
  };

  const exportToPptx = async () => {
    try {
      setStatus('processing');
      addLog('PPTX 생성 중...');
      const pptx = new window.PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      slides.forEach((slideData) => {
        const slide = pptx.addSlide();
        slide.addImage({ data: slideData.baseImage, x: 0, y: 0, w: '100%', h: '100%' });
        slideData.elements.forEach(el => {
          const opts = { x: `${(el.x / 1000) * 100}%`, y: `${(el.y / 562.5) * 100}%`, w: `${(el.w / 1000) * 100}%`, h: `${(el.h / 562.5) * 100}%` };
          if (el.type === 'text') slide.addText(String(el.content || ''), { ...opts, fontSize: el.fontSize, bold: el.isBold, color: (el.color || '#000000').replace('#', ''), fill: el.bgColor !== 'transparent' ? { color: (el.bgColor || '#ffffff').replace('#', '') } : null, fontFace: 'Malgun Gothic', align: 'center', valign: 'middle' });
          else if (el.type === 'image') slide.addImage({ data: el.src, ...opts });
          else if (el.type === 'shape') slide.addShape(pptx.ShapeType.rect, { ...opts, fill: { color: (el.bgColor || '#ffffff').replace('#', '') } });
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
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1000, 562.5] });
      for (let i = 0; i < slides.length; i++) {
        if (i > 0) pdf.addPage([1000, 562.5], 'landscape');
        const s = slides[i];
        pdf.addImage(s.baseImage, 'PNG', 0, 0, 1000, 562.5);
        s.elements.forEach(el => {
          if (el.type === 'shape' || (el.type === 'text' && el.bgColor !== 'transparent')) {
            pdf.setFillColor(el.bgColor || '#ffffff');
            pdf.rect(el.x, el.y, el.w, el.h, 'F');
          }
          if (el.type === 'image') pdf.addImage(el.src, 'PNG', el.x, el.y, el.w, el.h);
          if (el.type === 'text') {
            pdf.setTextColor(el.color || '#000000');
            pdf.setFontSize(el.fontSize * 1.5);
            pdf.text(String(el.content || ''), el.x + el.w/2, el.y + el.h/2, { align: 'center', baseline: 'middle' });
          }
        });
      }
      pdf.save(`Slide_Export_${Date.now()}.pdf`);
      setStatus('preview');
      addLog('PDF 다운로드 완료.');
    } catch (err) { setError(err.message); setStatus('error'); }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 font-sans text-slate-900 select-none flex flex-col overflow-hidden">
      {/* Header */}
      <header className="mb-4 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white"><Layout size={24}/></div>
          <div>
            <h1 className="text-xl font-black tracking-tight">PDF to Image Master <span className="text-indigo-600">{APP_VERSION}</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Precision Edit & Version Control</p>
          </div>
        </div>
        
        {status === 'preview' && (
          <div className="flex gap-2">
            <button onClick={() => saveVersion(slides, "수동 저장")} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-black transition-all">
              <History size={18}/> 버전 저장
            </button>
            <div className="w-px bg-slate-200 mx-1"></div>
            <button onClick={exportToPptx} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 shadow-lg">
              <FileType size={18}/> PPTX
            </button>
            <button onClick={exportToPdf} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 shadow-lg">
              <FileDown size={18}/> PDF
            </button>
            <button onClick={() => { setFile(null); setStatus('idle'); setSlides([]); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X/></button>
          </div>
        )}
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">
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
              <h2 className="text-2xl font-black text-slate-700">PDF 파일을 드롭하여 시작</h2>
              <p className="text-slate-400 mt-2 font-medium">자동 로고 제거 및 편집 환경이 구성됩니다.</p>
              <input id="pdfInput" type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFile(e.target.files[0])} />
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
            {/* Left Toolbar */}
            <div className="lg:col-span-1 flex flex-col gap-3 overflow-y-auto pr-2 min-w-[100px]">
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-2">
                <button onClick={() => { setCaptureMode(!captureMode); setSelection(null); }} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${captureMode ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-500'}`}>
                  <Scissors size={20}/> <span className="text-[9px] font-black uppercase">캡처</span>
                </button>
                <div className="h-px bg-slate-100 mx-2"></div>
                <button onClick={addTextElement} className="p-3 rounded-xl hover:bg-slate-50 text-slate-500 flex flex-col items-center gap-1">
                  <Type size={20}/> <span className="text-[9px] font-black uppercase">텍스트</span>
                </button>
                <button onClick={addRectElement} className="p-3 rounded-xl hover:bg-slate-50 text-slate-500 flex flex-col items-center gap-1">
                  <Square size={20}/> <span className="text-[9px] font-black uppercase">사각형</span>
                </button>
                <button onClick={() => document.getElementById('imgAdd').click()} className="p-3 rounded-xl hover:bg-slate-50 text-slate-500 flex flex-col items-center gap-1">
                  <ImageIcon size={20}/> <span className="text-[9px] font-black uppercase">이미지</span>
                  <input id="imgAdd" type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const r = new FileReader();
                    r.onload = (ev) => addElement('image', { src: ev.target.result, w: 200, h: 200 });
                    r.readAsDataURL(e.target.files[0]);
                  }}/>
                </button>
              </div>
              
              {/* History List */}
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
                <p className="text-[9px] font-black text-slate-300 uppercase p-2 border-b">History</p>
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

            {/* Canvas Editor */}
            <div className="lg:col-span-8 flex flex-col gap-4 overflow-hidden min-h-0">
              <div ref={editorContainerRef} className={`relative bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl ${captureMode ? 'ring-4 ring-indigo-400 cursor-crosshair' : ''}`} style={{ aspectRatio: '16/9' }}
                onMouseDown={(e) => {
                  if (!captureMode || e.button !== 0) return;
                  const r = editorContainerRef.current.getBoundingClientRect();
                  const s = 1000 / r.width;
                  const startX = (e.clientX - r.left) * s;
                  const startY = (e.clientY - r.top) * s;
                  setSelection({ x: startX, y: startY, w: 0, h: 0 });
                  const mv = (m) => setSelection(p => ({ ...p, w: ((m.clientX - r.left) * s) - startX, h: ((m.clientY - r.top) * s) - startY }));
                  const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
                  window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
                }}>
                <div className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${slides[currentSlideIdx]?.baseImage})` }} onClick={() => !captureMode && setSelectedElementId(null)}>
                  {selection && (
                    <div className="absolute border-2 border-indigo-400 bg-indigo-500/10 z-[100] flex items-center justify-center"
                      style={{
                        left: `${(Math.min(selection.x, selection.x + selection.w) / 1000) * 100}%`,
                        top: `${(Math.min(selection.y, selection.y + selection.h) / 562.5) * 100}%`,
                        width: `${(Math.abs(selection.w) / 1000) * 100}%`,
                        height: `${(Math.abs(selection.h) / 562.5) * 100}%`
                      }}>
                      {Math.abs(selection.w) > 20 && (
                        <div className="absolute -bottom-12 flex gap-1 bg-white p-1 rounded-xl shadow-xl border pointer-events-auto">
                          <button onClick={(e) => { e.stopPropagation(); handleCapture(); }} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-black text-[10px] flex items-center gap-1 hover:bg-indigo-700">캡처</button>
                          <button onClick={(e) => { e.stopPropagation(); setSelection(null); }} className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-400"><X size={14}/></button>
                        </div>
                      )}
                    </div>
                  )}

                  {(slides[currentSlideIdx]?.elements || []).map(el => (
                    <div key={el.id} onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
                      style={{
                        position: 'absolute',
                        left: `${(el.x / 1000) * 100}%`, top: `${(el.y / 562.5) * 100}%`, width: `${(el.w / 1000) * 100}%`, height: `${(el.h / 562.5) * 100}%`,
                        border: selectedElementId === el.id ? '2px solid #6366f1' : 'none',
                        backgroundColor: el.bgColor || 'transparent', cursor: 'move', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: selectedElementId === el.id ? 50 : 10
                      }}
                      onMouseDown={(e) => {
                        if (captureMode || e.button !== 0) return;
                        const sx = e.clientX, sy = e.clientY, ox = el.x, oy = el.y;
                        const r = editorContainerRef.current.getBoundingClientRect(), s = 1000 / r.width;
                        const mv = (m) => {
                          const nx = ox + (m.clientX - sx) * s, ny = oy + (m.clientY - sy) * s;
                          updateCurrentSlideElements(slides[currentSlideIdx].elements.map(item => item.id === el.id ? { ...item, x: nx, y: ny } : item));
                        };
                        const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
                        window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
                      }}>
                      {el.type === 'text' && <div style={{ fontSize: `${el.fontSize}px`, fontWeight: el.isBold ? 'bold' : 'normal', color: el.color, textAlign: 'center', width: '100%', wordBreak: 'break-all', padding: '5px', fontFamily: 'Malgun Gothic' }}>{String(el.content || '')}</div>}
                      {el.type === 'image' && <img src={el.src} className="max-w-full max-h-full object-contain pointer-events-none" />}
                      {el.type === 'shape' && <div className="w-full h-full" style={{ backgroundColor: el.bgColor }}></div>}
                      {selectedElementId === el.id && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white cursor-nwse-resize"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const sx = e.clientX, sy = e.clientY, ow = el.w, oh = el.h;
                            const r = editorContainerRef.current.getBoundingClientRect(), s = 1000 / r.width;
                            const mv = (m) => {
                              const nw = Math.max(20, ow + (m.clientX - sx) * s), nh = Math.max(20, oh + (m.clientY - sy) * s);
                              updateCurrentSlideElements(slides[currentSlideIdx].elements.map(item => item.id === el.id ? { ...item, w: nw, h: nh } : item));
                            };
                            const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
                            window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <button disabled={currentSlideIdx === 0} onClick={() => setCurrentSlideIdx(p => p - 1)} className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-20 transition-all"><ChevronLeft/></button>
                <div className="flex items-center gap-4">
                  {lastCaptureRect && <button onClick={patchOriginalArea} className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-1.5 rounded-lg text-[11px] font-black hover:bg-amber-200 transition-all"><Eraser size={14}/> 캡처 자리 지우기</button>}
                  <span className="font-black text-slate-400 text-xs uppercase tracking-widest">Page {currentSlideIdx + 1} / {slides.length}</span>
                </div>
                <button disabled={currentSlideIdx === slides.length - 1} onClick={() => setCurrentSlideIdx(p => p + 1)} className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-20 transition-all"><ChevronRight/></button>
              </div>
            </div>

            {/* Properties Panel */}
            <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden min-h-0">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex-1 overflow-y-auto">
                {selectedElement ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4 text-left">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Properties</span>
                      <button onClick={() => { updateCurrentSlideElements(slides[currentSlideIdx].elements.filter(e => e.id !== selectedElement.id)); setSelectedElementId(null); }} className="text-red-400 p-2 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                    </div>

                    <div className="space-y-4 text-left">
                      <div className="flex items-center justify-between"><label className="text-xs font-black text-slate-600">배경 색상</label><button onClick={async () => { if(window.EyeDropper) { const d = new window.EyeDropper(); const res = await d.open(); updateCurrentSlideElements(slides[currentSlideIdx].elements.map(e => e.id === selectedElementId ? { ...e, bgColor: res.sRGBHex } : e)); } }} className="p-1.5 bg-slate-50 hover:bg-indigo-50 rounded-lg text-slate-400"><Pipette size={14}/></button></div>
                      <div className="flex gap-2">
                        <input type="color" value={selectedElement.bgColor === 'transparent' ? '#ffffff' : selectedElement.bgColor} onChange={(e) => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, bgColor: e.target.value } : it))} className="w-10 h-10 rounded-xl cursor-pointer border-none p-0" />
                        <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, bgColor: 'transparent' } : it))} className={`flex-1 text-[10px] font-black border rounded-xl ${selectedElement.bgColor === 'transparent' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-400 bg-white border-slate-100'}`}>투명</button>
                      </div>
                    </div>

                    {selectedElement.type === 'text' && (
                      <div className="space-y-4 pt-4 border-t border-slate-50 text-left">
                        <label className="text-xs font-black text-slate-600">내용 (한글 지원)</label>
                        <textarea value={String(selectedElement.content || '')} onChange={(e) => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, content: e.target.value } : it))} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm h-32 outline-none focus:ring-2 focus:ring-indigo-500 font-sans shadow-inner" />
                        <div className="flex gap-2">
                          <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, isBold: !it.isBold } : it))} className={`flex-1 p-3 rounded-xl border font-black transition-all ${selectedElement.isBold ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-300'}`}>B</button>
                          <div className="flex-[2] flex items-center justify-between bg-slate-50 rounded-xl border border-slate-100 px-2">
                            <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, fontSize: Math.max(8, (it.fontSize || 24) - 2) } : it))} className="p-1 hover:text-indigo-600 transition-colors"><Minus size={14}/></button>
                            <span className="text-xs font-black text-slate-700">{selectedElement.fontSize}</span>
                            <button onClick={() => updateCurrentSlideElements(slides[currentSlideIdx].elements.map(it => it.id === selectedElementId ? { ...it, fontSize: (it.fontSize || 24) + 2 } : it))} className="p-1 hover:text-indigo-600 transition-colors"><Plus size={14}/></button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-4">
                    <Move size={48} className="text-slate-300"/>
                    <p className="text-sm font-black text-slate-400 leading-relaxed">슬라이드의 요소를<br/>선택하여 편집하세요</p>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-900 rounded-[1.5rem] p-4 text-slate-500 font-mono text-[9px] h-40 overflow-y-auto">
                <p className="text-indigo-400 font-black mb-2 uppercase tracking-widest text-left">Logs</p>
                {logs.map((log, i) => <div key={i} className="mb-1 text-left"><span className="text-slate-600">[{String(log.time)}]</span> {String(log.message)}</div>)}
              </div>
            </div>
          </>
        ) : null}
      </main>

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