/**
 * 슬라이드 배열을 세로로 이어 붙인 하나의 긴 이미지로 내보내기
 * - baseImage + 사용자 요소(텍스트·도형·이미지) 합성
 */
import { canvasSetLineDash } from './shapeLineStyle';

const VERTICAL_WIDTH = 1080;
const MAX_CANVAS_HEIGHT = 16000;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src?.startsWith('data:')) {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = src;
    } else {
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = src || '';
    }
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function scaledHeightForSlide(slide, img) {
  const sw = img.naturalWidth || slide?.width || 1000;
  const sh = img.naturalHeight || slide?.height || 562.5;
  const dw = VERTICAL_WIDTH;
  const dh = Math.round((sh / sw) * dw);
  return { sw, sh, dw, dh };
}

function buildHeightChunks(slides, heights) {
  const chunks = [];
  let start = 0;
  let sum = 0;
  for (let i = 0; i < slides.length; i++) {
    const h = heights[i];
    if (sum + h > MAX_CANVAS_HEIGHT && sum > 0) {
      chunks.push({ start, end: i });
      start = i;
      sum = h;
    } else {
      sum += h;
    }
  }
  if (start < slides.length) {
    chunks.push({ start, end: slides.length });
  }
  return chunks;
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return [0, 0, 0];
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

/** 텍스트 줄바꿈 (공백·개행) */
function wrapLines(ctx, text, maxW) {
  const paragraphs = String(text || '').split(/\n/);
  const lines = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width <= maxW || !line) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
    if (words.length === 0) lines.push('');
  }
  return lines;
}

/**
 * 한 슬라이드의 요소들을 캔버스에 그림 (슬라이드 좌표 → 목적지 사각형 dx,dy,dw,dh)
 */
async function drawSlideElements(ctx, slide, dx, dy, dw, dh) {
  const slideW = slide?.width || 1000;
  const slideH = slide?.height || 562.5;
  const scaleX = dw / slideW;
  const scaleY = dh / slideH;
  const elements = slide?.elements || [];

  for (const el of elements) {
    const left = dx + el.x * scaleX;
    const top = dy + el.y * scaleY;
    const ew = el.w * scaleX;
    const eh = el.h * scaleY;
    const cx = left + ew / 2;
    const cy = top + eh / 2;
    const op = Math.min(1, Math.max(0, Number(el.opacity ?? 1)));
    const rot = ((Number(el.rotation) || 0) * Math.PI) / 180;

    ctx.save();
    ctx.globalAlpha = op;
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.translate(-cx, -cy);

    try {
      if (el.type === 'text') {
        const padX = 4 * scaleX;
        const padY = 2 * scaleY;
        const fontSize = (el.fontSize || 24) * scaleX;
        const fontFamily = el.fontFamily || 'Malgun Gothic';
        const weight = el.isBold ? 'bold' : 'normal';
        const style = el.isItalic ? 'italic' : 'normal';
        ctx.font = `${style} ${weight} ${fontSize}px ${fontFamily}`;
        const [r, g, b] = hexToRgb(el.color || '#000000');
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        const maxW = Math.max(8, ew - padX * 2);
        const lines = wrapLines(ctx, String(el.content || ''), maxW);
        const lineH = fontSize * 1.35;
        let ty = top + padY + fontSize;
        for (const line of lines) {
          if (ty > top + eh - padY) break;
          ctx.fillText(line, left + padX, ty);
          ty += lineH;
        }
      } else if (el.type === 'image' && el.src) {
        try {
          const img = await loadImage(el.src);
          const iw = img.naturalWidth;
          const ih = img.naturalHeight;
          const r = Math.min(ew / iw, eh / ih);
          const iw2 = iw * r;
          const ih2 = ih * r;
          const ix = left + (ew - iw2) / 2;
          const iy = top + (eh - ih2) / 2;
          ctx.drawImage(img, ix, iy, iw2, ih2);
        } catch {
          /* skip broken image */
        }
      } else if (el.type === 'shape' && el.shapeType === 'arrowLine') {
        const span = Math.min(96, Math.max(16, Number(el.arrowLineSpan) || 66));
        const swSvg = Math.min(
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
        const lineCol = el.arrowLineColor?.startsWith('#') ? el.arrowLineColor : el.borderColor || '#000000';
        const headCol = el.arrowHeadColor?.startsWith('#') ? el.arrowHeadColor : lineCol;
        const [lr, lg, lb] = hexToRgb(lineCol);
        const [hr, hg, hb] = hexToRgb(headCol);

        ctx.save();
        ctx.translate(cx, cy);
        const dir = el.arrowDirection || 'right';
        if (dir === 'up') ctx.rotate(-Math.PI / 2);
        else if (dir === 'down') ctx.rotate(Math.PI / 2);
        else if (dir === 'left') ctx.rotate(Math.PI);
        ctx.translate(-cx, -cy);

        const mapX = (x) => left + (x / 100) * ew;
        const mapY = (y) => top + (y / 100) * eh;
        const strokeW = (swSvg / 100) * Math.min(ew, eh);
        const xA = mapX(x1);
        const xB = mapX(x2);
        const yM = mapY(50);

        ctx.strokeStyle = `rgb(${lr},${lg},${lb})`;
        ctx.lineWidth = Math.max(1, strokeW);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(xA, yM);
        ctx.lineTo(xB, yM);
        canvasSetLineDash(ctx, el.borderLineStyle || 'solid', (scaleX + scaleY) / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        const tipX = xB;
        const tipY = yM;
        ctx.fillStyle = `rgb(${hr},${hg},${hb})`;
        const headLen = (hs / 100) * ew;
        const headH = (hs / 100) * eh;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - headLen, tipY - headH / 2);
        ctx.lineTo(tipX - headLen, tipY + headH / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      } else if (el.type === 'shape' && el.shapeType === 'triangle') {
        const [br, bg, bb] = hexToRgb(el.bgColor === 'transparent' ? '#ffffff' : el.bgColor || '#ffffff');
        const [sr, sg, sb] = hexToRgb(el.borderColor || '#000000');
        const bw = Math.max(1, (el.borderWidth || 2) * 2 * scaleX);
        const p1x = left + (50 / 100) * ew;
        const p1y = top + (10 / 100) * eh;
        const p2x = left + (90 / 100) * ew;
        const p2y = top + (88 / 100) * eh;
        const p3x = left + (10 / 100) * ew;
        const p3y = top + (88 / 100) * eh;
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p3x, p3y);
        ctx.closePath();
        if (el.bgColor !== 'transparent') {
          ctx.fillStyle = `rgb(${br},${bg},${bb})`;
          ctx.fill();
        }
        ctx.strokeStyle = `rgb(${sr},${sg},${sb})`;
        ctx.lineWidth = bw;
        canvasSetLineDash(ctx, el.borderLineStyle || 'solid', (scaleX + scaleY) / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (el.type === 'shape') {
        const [br, bg, bb] = hexToRgb(el.bgColor === 'transparent' ? '#ffffff' : el.bgColor || '#ffffff');
        const [sr, sg, sb] = hexToRgb(el.borderColor || '#000000');
        const bw = Math.max(0, (el.borderWidth || 2) * scaleX);
        const st = el.shapeType;
        ctx.strokeStyle = `rgb(${sr},${sg},${sb})`;
        ctx.lineWidth = bw;
        const dashScale = (scaleX + scaleY) / 2;
        if (st === 'circle') {
          ctx.beginPath();
          ctx.ellipse(cx, cy, ew / 2, eh / 2, 0, 0, Math.PI * 2);
          if (el.bgColor !== 'transparent') {
            ctx.fillStyle = `rgb(${br},${bg},${bb})`;
            ctx.fill();
          }
          if (bw > 0) {
            canvasSetLineDash(ctx, el.borderLineStyle || 'solid', dashScale);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        } else if (st === 'roundedRect') {
          const rr = Math.min(ew, eh) * 0.12;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(left, top, ew, eh, rr);
          } else {
            const r = rr;
            ctx.moveTo(left + r, top);
            ctx.lineTo(left + ew - r, top);
            ctx.quadraticCurveTo(left + ew, top, left + ew, top + r);
            ctx.lineTo(left + ew, top + eh - r);
            ctx.quadraticCurveTo(left + ew, top + eh, left + ew - r, top + eh);
            ctx.lineTo(left + r, top + eh);
            ctx.quadraticCurveTo(left, top + eh, left, top + eh - r);
            ctx.lineTo(left, top + r);
            ctx.quadraticCurveTo(left, top, left + r, top);
          }
          if (el.bgColor !== 'transparent') {
            ctx.fillStyle = `rgb(${br},${bg},${bb})`;
            ctx.fill();
          }
          if (bw > 0) {
            canvasSetLineDash(ctx, el.borderLineStyle || 'solid', dashScale);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        } else {
          if (el.bgColor !== 'transparent') {
            ctx.fillStyle = `rgb(${br},${bg},${bb})`;
            ctx.fillRect(left, top, ew, eh);
          }
          if (bw > 0) {
            canvasSetLineDash(ctx, el.borderLineStyle || 'solid', dashScale);
            ctx.strokeRect(left, top, ew, eh);
            ctx.setLineDash([]);
          }
        }
      }
    } finally {
      ctx.restore();
    }
  }
}

export async function exportSlidesToVerticalImage(slides, baseFileName = `Vertical_Image_${Date.now()}`) {
  if (!slides?.length) throw new Error('저장할 슬라이드가 없습니다.');

  const baseName = baseFileName.replace(/\.png$/i, '');

  const heights = [];
  const images = [];
  for (const slide of slides) {
    if (!slide?.baseImage) {
      heights.push(0);
      images.push(null);
      continue;
    }
    const img = await loadImage(slide.baseImage);
    const { sw, sh, dw, dh } = scaledHeightForSlide(slide, img);
    heights.push(dh);
    images.push({ img, sw, sh, dw, dh, slide });
  }

  const chunkRanges = buildHeightChunks(slides, heights);
  const totalChunks = chunkRanges.length;

  for (let c = 0; c < chunkRanges.length; c++) {
    const { start, end } = chunkRanges[c];
    let chunkHeight = 0;
    for (let i = start; i < end; i++) chunkHeight += heights[i];

    const canvas = document.createElement('canvas');
    canvas.width = VERTICAL_WIDTH;
    canvas.height = Math.max(1, chunkHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('캔버스를 사용할 수 없습니다.');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, VERTICAL_WIDTH, chunkHeight);

    let y = 0;
    for (let i = start; i < end; i++) {
      const entry = images[i];
      if (!entry) continue;
      const { img, sw, sh, dw, dh, slide } = entry;
      const dx = 0;
      const dy = y;
      ctx.drawImage(img, 0, 0, sw, sh, dx, dy, dw, dh);
      await drawSlideElements(ctx, slide, dx, dy, dw, dh);
      y += dh;
    }

    await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('이미지 생성 실패'));
            return;
          }
          const pageStart = start + 1;
          const pageEnd = end;
          const fileName =
            totalChunks > 1 ? `${baseName}_${pageStart}-${pageEnd}.png` : `${baseName}.png`;
          downloadBlob(blob, fileName);
          resolve();
        },
        'image/png',
        0.92
      );
    });

    if (c < chunkRanges.length - 1) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
}
