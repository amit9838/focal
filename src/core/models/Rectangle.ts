import { Shape } from './Shape';

export class Rectangle extends Shape {
  constructor(id: string, x: number, y: number, w: number, h: number, fill = 'rgba(100, 150, 220, 0.6)', stroke = '#2c3e66') {
    super(id, 'rect', x, y, w, h, fill, stroke);
  }

  isPointInside(px: number, py: number): boolean {
    return px >= this.x && px <= this.x + this.width && py >= this.y && py <= this.y + this.height;
  }

  draw(ctx: CanvasRenderingContext2D, isSelected: boolean, isHovered: boolean, showKnobs: boolean): void {
    ctx.fillStyle = this.fillColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    this.drawBoundingBox(ctx, isSelected, isHovered, showKnobs);
  }
}