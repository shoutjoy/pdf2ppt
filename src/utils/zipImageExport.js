/**
 * 슬라이드 배열을 개별 이미지로 내보내고 ZIP으로 묶기
 */
import JSZip from 'jszip';

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

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('이미지 생성 실패'))),
      'image/png',
      0.92
    );
  });
}

export async function exportSlidesToZipImage(slides, baseFileName = `Images_${Date.now()}`) {
  if (!slides?.length) throw new Error('저장할 슬라이드가 없습니다.');

  const zip = new JSZip();
  const baseName = baseFileName.replace(/\.(zip|png)$/i, '');

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    if (!slide?.baseImage) continue;

    const img = await loadImage(slide.baseImage);
    const sw = Math.max(1, Math.round(img.naturalWidth || slide.width || 1000));
    const sh = Math.max(1, Math.round(img.naturalHeight || slide.height || 562.5));

    // ZIP 이미지는 각 슬라이드를 원본 가로 비율 그대로 저장한다.
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('캔버스를 사용할 수 없습니다.');

    ctx.drawImage(img, 0, 0, sw, sh);

    const blob = await canvasToBlob(canvas);
    const num = String(i + 1).padStart(3, '0');
    zip.file(`${baseName}_${num}.png`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.download = `${baseName}.zip`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
