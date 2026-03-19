/**
 * 슬라이드 배열을 세로로 이어 붙인 하나의 긴 이미지로보내기
 * (고정 슬롯 높이로 인한 검은 간격 없이, 실제 픽셀 높이만큼만 쌓음)
 */
const VERTICAL_WIDTH = 1080;
/** 브라우저/환경별 캔버스 높이 상한 (여유 두고 사용) */
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

/**
 * 각 슬라이드를 동일 폭(VERTICAL_WIDTH)에 맞추고 높이는 비율 유지 → 실제 그리기 높이
 */
function scaledHeightForSlide(slide, img) {
  const sw = img.naturalWidth || slide?.width || 1000;
  const sh = img.naturalHeight || slide?.height || 562.5;
  const dw = VERTICAL_WIDTH;
  const dh = Math.round((sh / sw) * dw);
  return { sw, sh, dw, dh };
}

/**
 * 총 높이가 MAX_CANVAS_HEIGHT를 넘지 않도록 슬라이드 인덱스 구간으로 청크 분할
 */
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
    images.push({ img, sw, sh, dw, dh });
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
      const { img, sw, sh, dw, dh } = entry;
      const dx = 0;
      const dy = y;
      ctx.drawImage(img, 0, 0, sw, sh, dx, dy, dw, dh);
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
