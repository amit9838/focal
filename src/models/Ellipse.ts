import { Shape } from "./Shape";

export class Ellipse extends Shape {
  constructor(
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    fill = "rgba(150, 100, 220, 0.6)",
    stroke = "#4a2c66",
  ) {
    super(id, "ellipse", x, y, w, h, fill, stroke);
  }

  isPointInside(px: number, py: number): boolean {
    const rx = this.width / 2;
    const ry = this.height / 2;
    const cx = this.x + rx;
    const cy = this.y + ry;
    const dx = (px - cx) / rx;
    const dy = (py - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    isSelected: boolean,
    isHovered: boolean,
    showKnobs: boolean,
  ): void {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const rx = this.width / 2;
    const ry = this.height / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.fillColor;
    ctx.fill();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    this.drawBoundingBox(ctx, isSelected, isHovered, showKnobs);
  }
}
