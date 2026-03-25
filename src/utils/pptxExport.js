/**
 * 슬라이드 배열을 PPTX로 내보내기
 */
import { pptxDashType } from './shapeLineStyle';

export async function exportSlidesToPptx(slides, fileName = `Slide_Master_${Date.now()}.pptx`) {
  const PptxGenJS = window.PptxGenJS;
  if (!PptxGenJS) throw new Error('PptxGenJS가 로드되지 않았습니다.');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  const hex = (c) => (c || '').toString().replace('#', '');

  slides.forEach((slideData) => {
    const slide = pptx.addSlide();
    slide.addImage({
      data: slideData.baseImage,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
    });
    const w = slideData.width || 1000;
    const h = slideData.height || 562.5;
    (slideData.elements || []).forEach((el) => {
      const opts = {
        x: `${(el.x / w) * 100}%`,
        y: `${(el.y / h) * 100}%`,
        w: `${(el.w / w) * 100}%`,
        h: `${(el.h / h) * 100}%`,
      };
      if (el.type === 'text') {
        slide.addText(String(el.content || ''), {
          ...opts,
          fontSize: el.fontSize,
          bold: el.isBold,
          italic: el.isItalic,
          underline: el.isUnderline,
          color: hex(el.color || '#000000'),
          fill:
            el.bgColor !== 'transparent'
              ? { color: hex(el.bgColor || '#ffffff') }
              : null,
          fontFace: el.fontFamily || 'Malgun Gothic',
          align: 'center',
          valign: 'middle',
        });
      } else if (el.type === 'image') {
        slide.addImage({ data: el.src, ...opts });
      } else if (el.type === 'shape') {
        const fill = { color: hex(el.bgColor || '#ffffff') };
        const dt = pptxDashType(el.borderLineStyle);
        const line =
          el.borderColor && (el.borderWidth || 0) > 0
            ? {
                color: hex(el.borderColor),
                pt: Math.min(5, el.borderWidth || 2),
                ...(dt ? { dashType: dt } : {}),
              }
            : null;
        let st = pptx.ShapeType.rect;
        if (el.shapeType === 'roundedRect')
          st = pptx.ShapeType.roundRect || pptx.ShapeType.rect;
        else if (el.shapeType === 'circle') st = pptx.ShapeType.ellipse;
        else if (el.shapeType === 'triangle') st = pptx.ShapeType.triangle;
        else if (el.shapeType === 'arrowLine') {
          const dir = el.arrowDirection || 'right';
          st =
            dir === 'up'
              ? pptx.ShapeType.upArrow || pptx.ShapeType.triangle
              : dir === 'down'
                ? pptx.ShapeType.downArrow || pptx.ShapeType.triangle
                : dir === 'left'
                  ? pptx.ShapeType.leftArrow || pptx.ShapeType.triangle
                  : pptx.ShapeType.rightArrow || pptx.ShapeType.triangle;
        }
        try {
          slide.addShape(st, { ...opts, fill, line });
        } catch (_) {
          slide.addShape(pptx.ShapeType.rect, { ...opts, fill, line });
        }
      }
    });
  });
  await pptx.writeFile({ fileName });
}
