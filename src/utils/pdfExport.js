/**
 * 올려진 슬라이드 배열을 순서대로 하나의 PDF 파일로 묶어서 내보내기
 * @param {Array} slides - 표시 중인 슬라이드 배열 (에디터 순서 그대로)
 * @param {string} fileName - 저장할 파일명
 */
export async function exportSlidesToPdf(slides, fileName = `Slide_Export_${Date.now()}.pdf`) {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) throw new Error('jsPDF가 로드되지 않았습니다.');
  const first = slides[0];
  const fw = first?.width || 1000;
  const fh = first?.height || 562.5;
  const pdf = new jsPDF({
    orientation: fw > fh ? 'landscape' : 'portrait',
    unit: 'px',
    format: [fw, fh],
  });
  const hexToRgb = (hex) => {
    const h = (hex || '').replace('#', '');
    if (h.length !== 6) return [255, 255, 255];
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  };
  const setFill = (el) => {
    const [r, g, b] = hexToRgb(el.bgColor || '#ffffff');
    pdf.setFillColor(r, g, b);
  };
  const setStroke = (el) => {
    const [r, g, b] = hexToRgb(el.borderColor || '#000000');
    pdf.setDrawColor(r, g, b);
    pdf.setLineWidth(Math.min(5, Math.max(0, Number(el.borderWidth) || 0)));
  };
  for (let i = 0; i < slides.length; i++) {
    if (i > 0) {
      const s = slides[i];
      const sw = s.width || 1000;
      const sh = s.height || 562.5;
      pdf.addPage([sw, sh], sw > sh ? 'landscape' : 'portrait');
    }
    const s = slides[i];
    const sw = s.width || 1000;
    const sh = s.height || 562.5;
    if (!s.baseImage) throw new Error(`슬라이드 ${i + 1}번에 이미지가 없습니다.`);
    pdf.addImage(s.baseImage, 'PNG', 0, 0, sw, sh);
    (s.elements || []).forEach((el) => {
      if (el.type === 'shape') {
        setFill(el);
        setStroke(el);
        const x = el.x;
        const y = el.y;
        const w = el.w;
        const h = el.h;
        if (el.shapeType === 'circle') {
          const r = Math.min(w, h) / 2;
          try {
            pdf.ellipse(x + w / 2, y + h / 2, r, r, 'FD');
          } catch (_) {
            pdf.rect(x, y, w, h, 'FD');
          }
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
        pdf.text(String(el.content || ''), el.x + el.w / 2, el.y + el.h / 2, {
          align: 'center',
          baseline: 'middle',
        });
      }
    });
  }
  pdf.save(fileName);
}
