/**
 * 슬라이드 배열을 세로(모바일) 이미지로 내보내기
 * 모든 슬라이드를 세로로 묶어서 하나의 긴 이미지로 저장 (캔버스 제한 시 청크로 분할)
 */
const VERTICAL_WIDTH = 1080;
const VERTICAL_HEIGHT = 1920;
const MAX_CANVAS_HEIGHT = 16384;

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

export async function exportSlidesToVerticalImage(slides, baseFileName = `Vertical_Image_${Date.now()}`) {
  if (!slides?.length) throw new Error('저장할 슬라이드가 없습니다.');

  const baseName = baseFileName.replace(/\.png$/i, '');
  const slidesPerChunk = Math.floor(MAX_CANVAS_HEIGHT / VERTICAL_HEIGHT);
  const totalChunks = Math.ceil(slides.length / slidesPerChunk);

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const start = chunkIdx * slidesPerChunk;
    const end = Math.min(start + slidesPerChunk, slides.length);
    const chunkSlides = slides.slice(start, end);
    const chunkHeight = VERTICAL_HEIGHT * chunkSlides.length;

    const canvas = document.createElement('canvas');
    canvas.width = VERTICAL_WIDTH;
    canvas.height = chunkHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('캔버스를 사용할 수 없습니다.');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, VERTICAL_WIDTH, chunkHeight);

    for (let i = 0; i < chunkSlides.length; i++) {
      const slide = chunkSlides[i];
      if (!slide?.baseImage) continue;
      const img = await loadImage(slide.baseImage);
      const sw = slide.width || 1000;
      const sh = slide.height || 562.5;
      const scale = Math.min(VERTICAL_WIDTH / sw, VERTICAL_HEIGHT / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      const dx = (VERTICAL_WIDTH - dw) / 2;
      const dy = i * VERTICAL_HEIGHT + (VERTICAL_HEIGHT - dh) / 2;
      ctx.drawImage(img, 0, 0, sw, sh, dx, dy, dw, dh);
    }

    await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('이미지 생성 실패'));
            return;
          }
          const fileName = totalChunks > 1 ? `${baseName}_${chunkIdx + 1}.png` : `${baseName}.png`;
          downloadBlob(blob, fileName);
          resolve();
        },
        'image/png',
        0.92
      );
    });

    if (chunkIdx < totalChunks - 1) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
}
