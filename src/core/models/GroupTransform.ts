import type { IShape, ResizeEdge } from '../types';

export class GroupTransform {
  private shapes: IShape[];
  private initialBounds: { x: number, y: number, w: number, h: number };

  constructor(shapes: IShape[]) {
    this.shapes = shapes;
    const left = Math.min(...shapes.map(s => s.x));
    const top = Math.min(...shapes.map(s => s.y));
    const right = Math.max(...shapes.map(s => s.x + s.width));
    const bottom = Math.max(...shapes.map(s => s.y + s.height));
    this.initialBounds = { x: left, y: top, w: right - left, h: bottom - top };
  }

  getBounds(): { x: number, y: number, w: number, h: number } {
    return { ...this.initialBounds };
  }

  move(dx: number, dy: number, canvasWidth: number, canvasHeight: number): void {
    let newLeft = this.initialBounds.x + dx;
    let newTop = this.initialBounds.y + dy;
    newLeft = Math.min(Math.max(0, newLeft), canvasWidth - this.initialBounds.w);
    newTop = Math.min(Math.max(0, newTop), canvasHeight - this.initialBounds.h);
    const actualDx = newLeft - this.initialBounds.x;
    const actualDy = newTop - this.initialBounds.y;
    for (const shape of this.shapes) {
      shape.x += actualDx;
      shape.y += actualDy;
    }
    this.initialBounds.x = newLeft;
    this.initialBounds.y = newTop;
  }

  resize(edge: ResizeEdge, startX: number, startY: number, currentX: number, currentY: number, canvasWidth: number, canvasHeight: number): void {
    let newBounds = { ...this.initialBounds };
    const dx = currentX - startX;
    const dy = currentY - startY;

    switch (edge) {
      case 'nw':
        newBounds.w = Math.max(20, this.initialBounds.w - dx);
        newBounds.h = Math.max(20, this.initialBounds.h - dy);
        newBounds.x = this.initialBounds.x + dx;
        newBounds.y = this.initialBounds.y + dy;
        break;
      case 'n':
        newBounds.h = Math.max(20, this.initialBounds.h - dy);
        newBounds.y = this.initialBounds.y + dy;
        break;
      case 'ne':
        newBounds.w = Math.max(20, this.initialBounds.w + dx);
        newBounds.h = Math.max(20, this.initialBounds.h - dy);
        newBounds.y = this.initialBounds.y + dy;
        break;
      case 'e':
        newBounds.w = Math.max(20, this.initialBounds.w + dx);
        break;
      case 'se':
        newBounds.w = Math.max(20, this.initialBounds.w + dx);
        newBounds.h = Math.max(20, this.initialBounds.h + dy);
        break;
      case 's':
        newBounds.h = Math.max(20, this.initialBounds.h + dy);
        break;
      case 'sw':
        newBounds.w = Math.max(20, this.initialBounds.w - dx);
        newBounds.h = Math.max(20, this.initialBounds.h + dy);
        newBounds.x = this.initialBounds.x + dx;
        break;
      case 'w':
        newBounds.w = Math.max(20, this.initialBounds.w - dx);
        newBounds.x = this.initialBounds.x + dx;
        break;
      default: return;
    }

    newBounds.x = Math.min(Math.max(0, newBounds.x), canvasWidth - newBounds.w);
    newBounds.y = Math.min(Math.max(0, newBounds.y), canvasHeight - newBounds.h);
    if (newBounds.x + newBounds.w > canvasWidth) newBounds.w = canvasWidth - newBounds.x;
    if (newBounds.y + newBounds.h > canvasHeight) newBounds.h = canvasHeight - newBounds.y;

    const scaleX = newBounds.w / this.initialBounds.w;
    const scaleY = newBounds.h / this.initialBounds.h;
    for (const shape of this.shapes) {
      const origX = shape.x - this.initialBounds.x;
      const origY = shape.y - this.initialBounds.y;
      shape.x = newBounds.x + origX * scaleX;
      shape.y = newBounds.y + origY * scaleY;
      shape.width = Math.max(20, shape.width * scaleX);
      shape.height = Math.max(20, shape.height * scaleY);
    }
    this.initialBounds = newBounds;
  }
}