import type { IShape } from "../types";
import { CanvasBackground } from "./CanvasBackground";

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private background: CanvasBackground;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = canvas.getContext("2d")!;
    this.background = new CanvasBackground(width, height);
  }

  public render(
    shapes: IShape[],
    selectedIds: string[],
    hoveredId: string | null,
    tempShape: IShape | null,
    marqueeRect: { x: number; y: number; w: number; h: number } | null,
    groupBounds: { x: number; y: number; w: number; h: number } | null,
  ): void {
    this.drawBackground();
    this.drawShapes(shapes, selectedIds, hoveredId);
    if (tempShape) tempShape.draw(this.ctx, false, false, false);
    if (marqueeRect && marqueeRect.w > 0 && marqueeRect.h > 0) {
      this.drawMarquee(marqueeRect);
    }
    if (groupBounds && selectedIds.length > 1) {
      this.drawGroupBoxWithKnobs(groupBounds);
    }
  }

  private drawBackground(): void {
    const bgImage = this.background.getImage();
    if (bgImage) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(bgImage, 0, 0);
    }
  }

  private drawShapes(
    shapes: IShape[],
    selectedIds: string[],
    hoveredId: string | null,
  ): void {
    const isGroupSelected = selectedIds.length > 1;
    for (const shape of shapes) {
      const isSelected = selectedIds.includes(shape.id);
      const isHovered = shape.id === hoveredId;
      const showKnobs = isSelected && !isGroupSelected;
      shape.draw(this.ctx, isSelected, isHovered, showKnobs);
    }
  }

  private drawMarquee(rect: {
    x: number;
    y: number;
    w: number;
    h: number;
  }): void {
    this.ctx.save();
    this.ctx.setLineDash([6, 8]);
    this.ctx.strokeStyle = "#0080ff";
    this.ctx.lineWidth = 1.5;
    this.ctx.fillStyle = "rgba(0, 128, 255, 0.1)";
    this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    this.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    this.ctx.restore();
  }

  private drawGroupBoxWithKnobs(bounds: {
    x: number;
    y: number;
    w: number;
    h: number;
  }): void {
    const knobSize = 8;
    this.ctx.save();
    this.ctx.strokeStyle = "#0080ff";
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([]);
    this.ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.w, y: bounds.y },
      { x: bounds.x, y: bounds.y + bounds.h },
      { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
    ];
    this.ctx.fillStyle = "white";
    this.ctx.strokeStyle = "#2c3e66";
    for (const knob of corners) {
      this.ctx.fillRect(
        knob.x - knobSize / 2,
        knob.y - knobSize / 2,
        knobSize,
        knobSize,
      );
      this.ctx.strokeRect(
        knob.x - knobSize / 2,
        knob.y - knobSize / 2,
        knobSize,
        knobSize,
      );
    }
    this.ctx.restore();
  }
}
