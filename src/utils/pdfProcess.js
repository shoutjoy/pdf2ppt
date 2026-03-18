/**
 * 단일 PDF 파일을 슬라이드 배열로 변환
 * @param {File} file
 * @param {Object} maskSettings
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<Array<{ baseImage: string, width: number, height: number, elements: Array, sourceFileId?: string }>>}
 */
export async function pdfToSlides(file, maskSettings = {}, onProgress = () => {}) {
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  if (!pdfjsLib) throw new Error('PDF.js가 로드되지 않았습니다.');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const slides = [];
  const w = (maskSettings.widthRatio ?? 9.2) / 100;
  const h = (maskSettings.heightRatio ?? 3.1) / 100;
  const xRatio = (maskSettings.xRatio ?? 96.9) / 100;
  const yRatio = (maskSettings.yRatio ?? 98.4) / 100;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;

    const m = maskSettings;
    const maskW = (canvas.width * (m.widthRatio ?? 9.2)) / 100;
    const maskH = (canvas.height * (m.heightRatio ?? 3.1)) / 100;
    const maskX = (canvas.width * (m.xRatio ?? 96.9)) / 100 - maskW / 2;
    const maskY = (canvas.height * (m.yRatio ?? 98.4)) / 100 - maskH / 2;
    const pixelData = context.getImageData(
      Math.max(0, Math.floor(maskX - 2)),
      Math.max(0, Math.floor(maskY - 2)),
      1,
      1
    ).data;
    context.fillStyle = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;
    context.fillRect(maskX, maskY, maskW, maskH);

    slides.push({
      baseImage: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
      elements: [],
    });
    onProgress(Math.round((i / numPages) * 100));
  }
  return slides;
}
