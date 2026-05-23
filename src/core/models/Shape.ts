import type { IShape, ResizeEdge } from '../types';

export abstract class Shape implements IShape {
  public id: string;
  public type: 'rect' | 'ellipse';
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public fillColor: string;
  public strokeColor: string;

  constructor(id: string, type: 'rect' | 'ellipse', x: number, y: number, w: number, h: number, fill: string, stroke: string) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.fillColor = fill;
    this.strokeColor = stroke;
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  resize(edge: ResizeEdge, startX: number, startY: number, currentX: number, currentY: number, canvasWidth: number, canvasHeight: number): void {
    let newX = this.x;
    let newY = this.y;
    let newW = this.width;
    let newH = this.height;
    const dx = currentX - startX;
    const dy = currentY - startY;

    switch (edge) {
      case 'nw':
        newW = Math.max(20, this.width - dx);
        newH = Math.max(20, this.height - dy);
        newX = this.x + dx;
        newY = this.y + dy;
        break;
      case 'n':
        newH = Math.max(20, this.height - dy);
        newY = this.y + dy;
        break;
      case 'ne':
        newW = Math.max(20, this.width + dx);
        newH = Math.max(20, this.height - dy);
        newY = this.y + dy;
        break;
      case 'e':
        newW = Math.max(20, this.width + dx);
        break;
      case 'se':
        newW = Math.max(20, this.width + dx);
        newH = Math.max(20, this.height + dy);
        break;
      case 's':
        newH = Math.max(20, this.height + dy);
        break;
      case 'sw':
        newW = Math.max(20, this.width - dx);
        newH = Math.max(20, this.height + dy);
        newX = this.x + dx;
        break;
      case 'w':
        newW = Math.max(20, this.width - dx);
        newX = this.x + dx;
        break;
      default: return;
    }

    newX = Math.min(Math.max(0, newX), canvasWidth - newW);
    newY = Math.min(Math.max(0, newY), canvasHeight - newH);
    if (newX + newW > canvasWidth) newW = canvasWidth - newX;
    if (newY + newH > canvasHeight) newH = canvasHeight - newY;

    this.x = newX;
    this.y = newY;
    this.width = newW;
    this.height = newH;
  }

  protected drawBoundingBox(ctx: CanvasRenderingContext2D, isSelected: boolean, isHovered: boolean, showKnobs: boolean, knobSize: number = 8): void {
    if (isSelected || isHovered) {
      ctx.save();
      ctx.strokeStyle = '#0080ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      ctx.restore();
    }
    if (isSelected && showKnobs) {
      const corners = [
        { x: this.x, y: this.y },
        { x: this.x + this.width, y: this.y },
        { x: this.x, y: this.y + this.height },
        { x: this.x + this.width, y: this.y + this.height }
      ];
      ctx.fillStyle = 'white';
      ctx.strokeStyle = '#2c3e66';
      ctx.lineWidth = 1.5;
      for (const knob of corners) {
        ctx.fillRect(knob.x - knobSize / 2, knob.y - knobSize / 2, knobSize, knobSize);
        ctx.strokeRect(knob.x - knobSize / 2, knob.y - knobSize / 2, knobSize, knobSize);
      }
    }
  }

  abstract draw(ctx: CanvasRenderingContext2D, isSelected: boolean, isHovered: boolean, showKnobs: boolean): void;
  abstract isPointInside(px: number, py: number): boolean;
}