import React, { useRef, useEffect, useState } from 'react';

// ------------------------------------------------------------
// 1. Abstractions: IShape and Shape
// ------------------------------------------------------------
export interface IShape {
  id: string;
  type: 'rect' | 'ellipse';
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  isPointInside(px: number, py: number): boolean;
  draw(ctx: CanvasRenderingContext2D, isSelected: boolean, isHovered: boolean, handleSize: number): void;
  resize(edge: ResizeEdge, startX: number, startY: number, currentX: number, currentY: number, canvasWidth: number, canvasHeight: number): void;
  getBounds(): { x: number; y: number; w: number; h: number };
}

export type ResizeEdge = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

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

  protected drawBoundingBox(ctx: CanvasRenderingContext2D, isSelected: boolean, isHovered: boolean, knobSize: number = 8): void {
    if (isSelected || isHovered) {
      ctx.save();
      ctx.strokeStyle = '#3399ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      ctx.restore();
    }

    if (isSelected) {
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

  abstract draw(ctx: CanvasRenderingContext2D, isSelected: boolean, isHovered: boolean, handleSize: number): void;
  abstract isPointInside(px: number, py: number): boolean;
}

class Rectangle extends Shape {
  constructor(id: string, x: number, y: number, w: number, h: number, fill = 'rgba(100, 150, 220, 0.6)', stroke = '#2c3e66') {
    super(id, 'rect', x, y, w, h, fill, stroke);
  }

  isPointInside(px: number, py: number): boolean {
    return px >= this.x && px <= this.x + this.width && py >= this.y && py <= this.y + this.height;
  }

  draw(ctx: CanvasRenderingContext2D, isSelected: boolean, isHovered: boolean, handleSize: number): void {
    ctx.fillStyle = this.fillColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    this.drawBoundingBox(ctx, isSelected, isHovered);
  }
}

class Ellipse extends Shape {
  constructor(id: string, x: number, y: number, w: number, h: number, fill = 'rgba(150, 100, 220, 0.6)', stroke = '#4a2c66') {
    super(id, 'ellipse', x, y, w, h, fill, stroke);
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

  draw(ctx: CanvasRenderingContext2D, isSelected: boolean, isHovered: boolean, handleSize: number): void {
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

    this.drawBoundingBox(ctx, isSelected, isHovered);
  }
}

// ------------------------------------------------------------
// 3. Background renderer (unchanged)
// ------------------------------------------------------------
class CanvasBackground {
  private canvas: HTMLCanvasElement | null = null;

  constructor(width: number, height: number) {
    this.initBackground(width, height);
  }

  private initBackground(width: number, height: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pattern = this.createCheckerPattern(ctx, 50, '#f5efe7', '#d9c6ae');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#f0e6d2';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.strokeStyle = '#b8a78d';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    const rectW = 320, rectH = 120;
    const rectX = (width - rectW) / 2;
    const rectY = (height - rectH) / 2;
    this.roundedRect(ctx, rectX, rectY, rectW, rectH, 40);
    ctx.fillStyle = 'rgba(250, 245, 235, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#9b7e64';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#4a3728';
    ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('focal', width / 2, height / 2);

    this.canvas = canvas;
  }

  private createCheckerPattern(ctx: CanvasRenderingContext2D, cellSize: number, color1: string, color2: string): CanvasPattern | null {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = cellSize * 2;
    patternCanvas.height = cellSize * 2;
    const patternCtx = patternCanvas.getContext('2d');
    if (!patternCtx) return null;
    patternCtx.fillStyle = color1;
    patternCtx.fillRect(0, 0, cellSize, cellSize);
    patternCtx.fillRect(cellSize, cellSize, cellSize, cellSize);
    patternCtx.fillStyle = color2;
    patternCtx.fillRect(cellSize, 0, cellSize, cellSize);
    patternCtx.fillRect(0, cellSize, cellSize, cellSize);
    return ctx.createPattern(patternCanvas, 'repeat');
  }

  private roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  public getImage(): HTMLCanvasElement | null {
    return this.canvas;
  }
}

// ------------------------------------------------------------
// 4. ShapeManager (unchanged)
// ------------------------------------------------------------
class ShapeManager {
  private shapes: Map<string, IShape> = new Map();
  private selectedId: string | null = null;

  public onShapesChange?: (shapes: Array<{ id: string, type: string, x: number, y: number, w: number, h: number, fill: string, stroke: string }>) => void;
  public onSelectedChange?: (id: string | null) => void;

  addShape(shape: IShape): void {
    this.shapes.set(shape.id, shape);
    this.notifyShapesChange();
  }

  deleteShape(id: string): void {
    if (this.shapes.delete(id)) {
      if (this.selectedId === id) this.selectedId = null;
      this.notifyShapesChange();
      this.notifySelectedChange();
    }
  }

  getShape(id: string): IShape | undefined {
    return this.shapes.get(id);
  }

  getAllShapes(): IShape[] {
    return Array.from(this.shapes.values());
  }

  selectShape(id: string | null): void {
    if (id !== null && !this.shapes.has(id)) return;
    this.selectedId = id;
    this.notifySelectedChange();
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  getSelectedShape(): IShape | null {
    return this.selectedId ? this.shapes.get(this.selectedId) || null : null;
  }

  findShapeUnderPoint(px: number, py: number): IShape | null {
    for (const shape of this.getAllShapes().reverse()) {
      if (shape.isPointInside(px, py)) return shape;
    }
    return null;
  }

  updateShape(shape: IShape): void {
    this.shapes.set(shape.id, shape);
    this.notifyShapesChange();
  }

  private notifyShapesChange(): void {
    const data = this.getAllShapes().map(s => ({
      id: s.id,
      type: s.type,
      x: s.x,
      y: s.y,
      w: s.width,
      h: s.height,
      fill: s.fillColor,
      stroke: s.strokeColor
    }));
    this.onShapesChange?.(data);
  }

  private notifySelectedChange(): void {
    this.onSelectedChange?.(this.selectedId);
  }
}

// ------------------------------------------------------------
// 5. InteractionHandler – resizing only on selected shape
// ------------------------------------------------------------
type DragMode = 'none' | 'move' | 'resize';

class InteractionHandler {
  private canvas: HTMLCanvasElement;
  private shapeManager: ShapeManager;
  private edgeTolerance: number = 8;

  private dragMode: DragMode = 'none';
  private activeEdge: ResizeEdge = null;
  private dragOffset = { x: 0, y: 0 };
  private dragStart = { x: 0, y: 0 };
  private lastPointer = { x: 0, y: 0 };
  private isPointerDown = false;
  private hoveredId: string | null = null;

  public isDrawingMode: boolean = false;
  public drawingShapeType: 'rect' | 'ellipse' = 'rect';
  public isDrawingActive: boolean = false;
  public drawingStart = { x: 0, y: 0 };
  public drawingEnd = { x: 0, y: 0 };

  public onDrawComplete?: (shape: IShape) => void;
  public onShapeMoved?: (shape: IShape) => void;
  public onShapeResized?: (shape: IShape) => void;
  public onCursorChange?: (cursor: string) => void;
  public onDrawingStateChange?: (isDrawing: boolean) => void;

  constructor(canvas: HTMLCanvasElement, shapeManager: ShapeManager) {
    this.canvas = canvas;
    this.shapeManager = shapeManager;
    this.attachEvents();
  }

  private attachEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMove);
    this.canvas.addEventListener('mousedown', this.handleDown);
    window.addEventListener('mouseup', this.handleUp);
    this.canvas.addEventListener('touchmove', this.handleMove);
    this.canvas.addEventListener('touchstart', this.handleDown);
    window.addEventListener('touchend', this.handleUp);
    this.canvas.addEventListener('mouseleave', this.handleLeave);
  }

  private getCanvasCoords(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    let x = (clientX - rect.left) * scaleX;
    let y = (clientY - rect.top) * scaleY;
    x = Math.min(Math.max(0, x), this.canvas.width);
    y = Math.min(Math.max(0, y), this.canvas.height);
    return { x, y };
  }

  private getEdgeUnderPoint(shape: IShape, px: number, py: number): ResizeEdge {
    const tol = this.edgeTolerance;
    const left = shape.x;
    const right = shape.x + shape.width;
    const top = shape.y;
    const bottom = shape.y + shape.height;

    if (Math.hypot(px - left, py - top) <= tol) return 'nw';
    if (Math.hypot(px - right, py - top) <= tol) return 'ne';
    if (Math.hypot(px - left, py - bottom) <= tol) return 'sw';
    if (Math.hypot(px - right, py - bottom) <= tol) return 'se';
    if (Math.abs(py - top) <= tol && px >= left && px <= right) return 'n';
    if (Math.abs(px - right) <= tol && py >= top && py <= bottom) return 'e';
    if (Math.abs(py - bottom) <= tol && px >= left && px <= right) return 's';
    if (Math.abs(px - left) <= tol && py >= top && py <= bottom) return 'w';
    return null;
  }

  private getCursorForEdge(edge: ResizeEdge): string {
    switch (edge) {
      case 'nw': return 'nw-resize';
      case 'n': return 'ns-resize';
      case 'ne': return 'ne-resize';
      case 'e': return 'ew-resize';
      case 'se': return 'se-resize';
      case 's': return 'ns-resize';
      case 'sw': return 'sw-resize';
      case 'w': return 'ew-resize';
      default: return 'grab';
    }
  }

  private handleDown = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const { x, y } = this.getCanvasCoords(e);
    this.lastPointer = { x, y };
    this.isPointerDown = true;

    if (this.isDrawingMode) {
      this.isDrawingActive = true;
      this.drawingStart = { x, y };
      this.drawingEnd = { x, y };
      this.onDrawingStateChange?.(true);
      return;
    }

    const selectedShape = this.shapeManager.getSelectedShape();

    // 1) If a shape is selected, check if we hit its edge -> resize (keep selection)
    if (selectedShape) {
      const edge = this.getEdgeUnderPoint(selectedShape, x, y);
      if (edge) {
        this.dragMode = 'resize';
        this.activeEdge = edge;
        this.dragStart = { x, y };
        return;
      }
      // If inside selected shape's body -> move
      if (selectedShape.isPointInside(x, y)) {
        this.dragMode = 'move';
        this.dragOffset = { x: selectedShape.x - x, y: selectedShape.y - y };
        return;
      }
    }

    // 2) No hit on selected shape -> look for any other shape (for selection)
    let targetShape: IShape | null = null;
    let edge: ResizeEdge = null;
    for (const shape of this.shapeManager.getAllShapes().reverse()) {
      const e = this.getEdgeUnderPoint(shape, x, y);
      if (e) {
        targetShape = shape;
        edge = e;
        break;
      }
    }
    if (!targetShape) {
      targetShape = this.shapeManager.findShapeUnderPoint(x, y);
    }

    if (targetShape) {
      this.shapeManager.selectShape(targetShape.id);
      if (edge) {
        this.dragMode = 'resize';
        this.activeEdge = edge;
        this.dragStart = { x, y };
      } else {
        this.dragMode = 'move';
        this.dragOffset = { x: targetShape.x - x, y: targetShape.y - y };
      }
    } else {
      this.shapeManager.selectShape(null);
    }
  };

  private handleMove = (e: MouseEvent | TouchEvent) => {
    const { x, y } = this.getCanvasCoords(e);
    this.lastPointer = { x, y };

    if (this.isPointerDown) {
      if (this.isDrawingMode && this.isDrawingActive) {
        this.drawingEnd = { x, y };
        this.onDrawingStateChange?.(true);
        return;
      }

      if (this.dragMode !== 'none') {
        const selected = this.shapeManager.getSelectedShape();
        if (selected) {
          if (this.dragMode === 'move') {
            let newX = x + this.dragOffset.x;
            let newY = y + this.dragOffset.y;
            newX = Math.min(Math.max(0, newX), this.canvas.width - selected.width);
            newY = Math.min(Math.max(0, newY), this.canvas.height - selected.height);
            if (selected.x !== newX || selected.y !== newY) {
              selected.x = newX;
              selected.y = newY;
              this.shapeManager.updateShape(selected);
              this.onShapeMoved?.(selected);
            }
          } else if (this.dragMode === 'resize' && this.activeEdge) {
            selected.resize(this.activeEdge, this.dragStart.x, this.dragStart.y, x, y, this.canvas.width, this.canvas.height);
            this.dragStart = { x, y };
            this.shapeManager.updateShape(selected);
            this.onShapeResized?.(selected);
          }
        }
      }
    } else {
      // Update hover state (only visual bounding box, no resize cursor unless shape selected)
      let hoverShape: IShape | null = null;
      for (const shape of this.shapeManager.getAllShapes().reverse()) {
        if (shape.isPointInside(x, y) || this.getEdgeUnderPoint(shape, x, y)) {
          hoverShape = shape;
          break;
        }
      }
      const newHoverId = hoverShape ? hoverShape.id : null;
      if (this.hoveredId !== newHoverId) this.hoveredId = newHoverId;

      // Determine cursor: resize cursor only if selected shape AND edge is under cursor
      let cursor = 'default';
      const selected = this.shapeManager.getSelectedShape();
      if (selected && this.getEdgeUnderPoint(selected, x, y)) {
        cursor = this.getCursorForEdge(this.getEdgeUnderPoint(selected, x, y));
      } else if (hoverShape && !selected) {
        cursor = 'grab'; // hover over unselected shape shows grab
      } else if (selected && selected.isPointInside(x, y)) {
        cursor = 'grab'; // over selected body
      } else if (this.isDrawingMode) {
        cursor = 'crosshair';
      }
      this.onCursorChange?.(cursor);
    }
  };

  private handleUp = () => {
    if (this.isDrawingMode && this.isDrawingActive) {
      let x = Math.min(this.drawingStart.x, this.drawingEnd.x);
      let y = Math.min(this.drawingStart.y, this.drawingEnd.y);
      let w = Math.abs(this.drawingEnd.x - this.drawingStart.x);
      let h = Math.abs(this.drawingEnd.y - this.drawingStart.y);
      if (w >= 10 && h >= 10) {
        const id = `shape_${Date.now()}_${Math.random()}`;
        let newShape: IShape;
        if (this.drawingShapeType === 'rect') {
          newShape = new Rectangle(id, x, y, w, h);
        } else {
          newShape = new Ellipse(id, x, y, w, h);
        }
        this.onDrawComplete?.(newShape);
      }
      this.isDrawingActive = false;
      this.isDrawingMode = false;
      this.onDrawingStateChange?.(false);
      this.onCursorChange?.('default');
    }
    this.dragMode = 'none';
    this.activeEdge = null;
    this.isPointerDown = false;
  };

  private handleLeave = () => {
    this.dragMode = 'none';
    this.activeEdge = null;
    this.isPointerDown = false;
    if (this.isDrawingMode && this.isDrawingActive) {
      this.isDrawingActive = false;
      this.isDrawingMode = false;
      this.onDrawingStateChange?.(false);
    }
    this.hoveredId = null;
    this.onCursorChange?.('default');
  };

  public startDraw(shapeType: 'rect' | 'ellipse'): void {
    this.isDrawingMode = true;
    this.drawingShapeType = shapeType;
    this.onCursorChange?.('crosshair');
    this.onDrawingStateChange?.(false);
  }

  public cancelDraw(): void {
    this.isDrawingMode = false;
    this.isDrawingActive = false;
    this.onDrawingStateChange?.(false);
    this.onCursorChange?.('default');
  }

  public getHoveredId(): string | null {
    return this.hoveredId;
  }

  public detach(): void {
    this.canvas.removeEventListener('mousemove', this.handleMove);
    this.canvas.removeEventListener('mousedown', this.handleDown);
    window.removeEventListener('mouseup', this.handleUp);
    this.canvas.removeEventListener('touchmove', this.handleMove);
    this.canvas.removeEventListener('touchstart', this.handleDown);
    window.removeEventListener('touchend', this.handleUp);
    this.canvas.removeEventListener('mouseleave', this.handleLeave);
  }
}

// ------------------------------------------------------------
// 6. CanvasRenderer (unchanged)
// ------------------------------------------------------------
class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private background: CanvasBackground;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = canvas.getContext('2d')!;
    this.background = new CanvasBackground(width, height);
  }

  public render(
    shapes: IShape[],
    selectedId: string | null,
    hoveredId: string | null,
    isDrawingMode: boolean,
    isDrawingActive: boolean,
    drawingShapeType: 'rect' | 'ellipse',
    drawingStart: { x: number; y: number },
    drawingEnd: { x: number; y: number }
  ): void {
    const bgImage = this.background.getImage();
    if (bgImage) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(bgImage, 0, 0);
    }
    for (const shape of shapes) {
      const isSelected = shape.id === selectedId;
      const isHovered = shape.id === hoveredId;
      shape.draw(this.ctx, isSelected, isHovered, 0);
    }

    if (isDrawingMode && isDrawingActive) {
      const x = Math.min(drawingStart.x, drawingEnd.x);
      const y = Math.min(drawingStart.y, drawingEnd.y);
      const w = Math.abs(drawingEnd.x - drawingStart.x);
      const h = Math.abs(drawingEnd.y - drawingStart.y);
      if (w > 0 && h > 0) {
        this.ctx.save();
        this.ctx.setLineDash([6, 8]);
        this.ctx.strokeStyle = '#2c3e66';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = 'rgba(100, 150, 220, 0.2)';
        if (drawingShapeType === 'rect') {
          this.ctx.fillRect(x, y, w, h);
          this.ctx.strokeRect(x, y, w, h);
        } else {
          const cx = x + w / 2;
          const cy = y + h / 2;
          const rx = w / 2;
          const ry = h / 2;
          this.ctx.beginPath();
          this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
        }
        this.ctx.restore();
      }
    }
  }
}

// ------------------------------------------------------------
// 7. CanvasController (unchanged)
// ------------------------------------------------------------
class CanvasController {
  private renderer: CanvasRenderer;
  private shapeManager: ShapeManager;
  private interaction: InteractionHandler;
  private animationFrame: number | null = null;
  private hoveredId: string | null = null;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.renderer = new CanvasRenderer(canvas, width, height);
    this.shapeManager = new ShapeManager();
    this.interaction = new InteractionHandler(canvas, this.shapeManager);

    this.shapeManager.onShapesChange = () => this.render();
    this.shapeManager.onSelectedChange = () => this.render();
    this.interaction.onDrawComplete = (shape) => {
      this.shapeManager.addShape(shape);
      this.shapeManager.selectShape(shape.id);
      this.interaction.cancelDraw();
      this.onDrawingModeChange?.(false);
      this.render();
    };
    this.interaction.onShapeMoved = () => this.render();
    this.interaction.onShapeResized = () => this.render();
    this.interaction.onCursorChange = (cursor) => { canvas.style.cursor = cursor; };
    this.interaction.onDrawingStateChange = () => this.render();

    const loop = () => {
      const hovered = this.interaction.getHoveredId();
      if (this.hoveredId !== hovered) {
        this.hoveredId = hovered;
        this.render();
      } else {
        this.render();
      }
      this.animationFrame = requestAnimationFrame(loop);
    };
    this.animationFrame = requestAnimationFrame(loop);
  }

  private render(): void {
    const shapes = this.shapeManager.getAllShapes();
    const selectedId = this.shapeManager.getSelectedId();
    this.renderer.render(
      shapes,
      selectedId,
      this.hoveredId,
      this.interaction.isDrawingMode,
      this.interaction.isDrawingActive,
      this.interaction.drawingShapeType,
      this.interaction.drawingStart,
      this.interaction.drawingEnd
    );
  }

  public onDrawingModeChange?: (isDrawing: boolean) => void;

  public startDraw(shapeType: 'rect' | 'ellipse'): void {
    this.interaction.startDraw(shapeType);
    this.onDrawingModeChange?.(true);
  }

  public cancelDraw(): void {
    this.interaction.cancelDraw();
    this.onDrawingModeChange?.(false);
  }

  public deleteSelected(): void {
    const selected = this.shapeManager.getSelectedId();
    if (selected) this.shapeManager.deleteShape(selected);
  }

  public setSelectedFillColor(color: string): void {
    const shape = this.shapeManager.getSelectedShape();
    if (shape) {
      shape.fillColor = color;
      this.shapeManager.updateShape(shape);
    }
  }

  public setSelectedStrokeColor(color: string): void {
    const shape = this.shapeManager.getSelectedShape();
    if (shape) {
      shape.strokeColor = color;
      this.shapeManager.updateShape(shape);
    }
  }

  public selectShapeById(id: string): void {
    this.shapeManager.selectShape(id);
  }

  public destroy(): void {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.interaction.detach();
  }
}

// ------------------------------------------------------------
// 8. React App (unchanged)
// ------------------------------------------------------------
const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<CanvasController | null>(null);
  const [shapes, setShapes] = useState<Array<any>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [shapeType, setShapeType] = useState<'rect' | 'ellipse'>('rect');

  const [fillColor, setFillColor] = useState('#6496dc');
  const [fillOpacity, setFillOpacity] = useState(0.6);
  const [strokeColor, setStrokeColor] = useState('#2c3e66');
  const [strokeOpacity, setStrokeOpacity] = useState(1);

  useEffect(() => {
    if (!canvasRef.current) return;
    const width = window.innerWidth - 40;
    const height = window.innerHeight - 300;
    canvasRef.current.width = width;
    canvasRef.current.height = height;

    const controller = new CanvasController(canvasRef.current, width, height);
    const shapeManager = (controller as any).shapeManager;
    shapeManager.onShapesChange = (data) => setShapes(data);
    shapeManager.onSelectedChange = (id) => setSelectedId(id);
    controller.onDrawingModeChange = (drawing) => setIsDrawingMode(drawing);
    controllerRef.current = controller;

    return () => controller.destroy();
  }, []);

  useEffect(() => {
    if (selectedId) {
      const shape = shapes.find(s => s.id === selectedId);
      if (shape) {
        const fillMatch = shape.fill.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
        if (fillMatch) {
          const r = parseInt(fillMatch[1]);
          const g = parseInt(fillMatch[2]);
          const b = parseInt(fillMatch[3]);
          const alpha = fillMatch[4] ? parseFloat(fillMatch[4]) : 1;
          setFillColor(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
          setFillOpacity(alpha);
        } else if (shape.fill.startsWith('#')) {
          setFillColor(shape.fill);
          setFillOpacity(1);
        }
        const strokeMatch = shape.stroke.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
        if (strokeMatch) {
          const r = parseInt(strokeMatch[1]);
          const g = parseInt(strokeMatch[2]);
          const b = parseInt(strokeMatch[3]);
          const alpha = strokeMatch[4] ? parseFloat(strokeMatch[4]) : 1;
          setStrokeColor(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
          setStrokeOpacity(alpha);
        } else if (shape.stroke.startsWith('#')) {
          setStrokeColor(shape.stroke);
          setStrokeOpacity(1);
        }
      }
    }
  }, [selectedId, shapes]);

  const hexToRgba = (hex: string, opacity: number): string => {
    let r = 0, g = 0, b = 0;
    if (hex.startsWith('#')) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const handleFillColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setFillColor(newColor);
    const rgba = hexToRgba(newColor, fillOpacity);
    controllerRef.current?.setSelectedFillColor(rgba);
  };

  const handleFillOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value);
    setFillOpacity(newOpacity);
    const rgba = hexToRgba(fillColor, newOpacity);
    controllerRef.current?.setSelectedFillColor(rgba);
  };

  const handleStrokeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setStrokeColor(newColor);
    const rgba = hexToRgba(newColor, strokeOpacity);
    controllerRef.current?.setSelectedStrokeColor(rgba);
  };

  const handleStrokeOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value);
    setStrokeOpacity(newOpacity);
    const rgba = hexToRgba(strokeColor, newOpacity);
    controllerRef.current?.setSelectedStrokeColor(rgba);
  };

  const handleDrawNew = () => controllerRef.current?.startDraw(shapeType);
  const handleCancelDraw = () => controllerRef.current?.cancelDraw();
  const handleDeleteSelected = () => controllerRef.current?.deleteSelected();
  const handleSelectShape = (id: string) => controllerRef.current?.selectShapeById(id);

  return (
    <div style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#e2dccd', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ margin: '12px', background: '#fff8ef', padding: '12px 24px', borderRadius: '60px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        <select value={shapeType} onChange={(e) => setShapeType(e.target.value as 'rect' | 'ellipse')} style={{ padding: '8px 16px', borderRadius: 40, border: '1px solid #ccc', background: 'white' }}>
          <option value="rect">Rectangle</option>
          <option value="ellipse">Ellipse</option>
        </select>
        <button onClick={handleDrawNew} disabled={isDrawingMode} style={{ background: isDrawingMode ? '#ccc' : '#4c8baf', border: 'none', padding: '8px 20px', borderRadius: 40, color: 'white', fontWeight: 'bold', cursor: isDrawingMode ? 'not-allowed' : 'pointer' }}>
          ✏️ Draw {shapeType === 'rect' ? 'Rectangle' : 'Ellipse'}
        </button>
        {isDrawingMode && (
          <button onClick={handleCancelDraw} style={{ background: '#e07a5f', border: 'none', padding: '8px 20px', borderRadius: 40, color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            ❌ Cancel Drawing
          </button>
        )}
        <button onClick={handleDeleteSelected} disabled={!selectedId} style={{ background: selectedId ? '#b8a78d' : '#ccc', border: 'none', padding: '8px 20px', borderRadius: 40, color: 'white', fontWeight: 'bold', cursor: selectedId ? 'pointer' : 'not-allowed' }}>
          🗑️ Delete Selected
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5efe7', padding: '4px 12px', borderRadius: 40 }}>
          <span>🎨 Fill:</span>
          <input type="color" value={fillColor} onChange={handleFillColorChange} disabled={!selectedId} style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #ccc' }} />
          <input type="range" min="0" max="1" step="0.01" value={fillOpacity} onChange={handleFillOpacityChange} disabled={!selectedId} style={{ width: 80 }} />
          <span style={{ fontSize: '12px', width: '40px' }}>{Math.round(fillOpacity * 100)}%</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5efe7', padding: '4px 12px', borderRadius: 40 }}>
          <span>✏️ Stroke:</span>
          <input type="color" value={strokeColor} onChange={handleStrokeColorChange} disabled={!selectedId} style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #ccc' }} />
          <input type="range" min="0" max="1" step="0.01" value={strokeOpacity} onChange={handleStrokeOpacityChange} disabled={!selectedId} style={{ width: 80 }} />
          <span style={{ fontSize: '12px', width: '40px' }}>{Math.round(strokeOpacity * 100)}%</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        style={{ display: 'block', boxShadow: '0 12px 28px rgba(0,0,0,0.2)', borderRadius: 16 }}
      />

      <div style={{ marginTop: 20, background: '#fff8ef', borderRadius: 24, padding: '12px 20px', width: '90%', maxWidth: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>📦 Shapes ({shapes.length})</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {shapes.map(shape => (
            <div
              key={shape.id}
              onClick={() => handleSelectShape(shape.id)}
              style={{
                background: selectedId === shape.id ? '#e0d6c0' : '#f5f0e6',
                padding: '6px 12px',
                borderRadius: 40,
                cursor: 'pointer',
                border: selectedId === shape.id ? '2px solid #2c3e66' : '1px solid #ccc',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <div style={{ width: 20, height: 20, background: shape.fill, border: `2px solid ${shape.stroke}`, borderRadius: shape.type === 'ellipse' ? '50%' : 4 }} />
              <span style={{ fontFamily: 'monospace' }}>{shape.type === 'rect' ? '□' : '○'} {shape.w}×{shape.h}</span>
            </div>
          ))}
          {shapes.length === 0 && <span style={{ color: '#8b6b4d' }}>No shapes – select a shape and click "Draw"</span>}
        </div>
      </div>

      <p style={{ fontFamily: 'monospace', marginTop: 12, color: '#5e4b34', textAlign: 'center' }}>
        🖱️ <strong>Hover</strong> → blue bounding box. <strong>Click</strong> → select (4 corner knobs).<br/>
        🎨 <strong>Choose shape type</strong> then click "Draw" and drag on canvas.<br/>
        ✋ Drag selected shape to move, drag <strong>any edge or corner of the selected shape</strong> to resize.<br/>
        🎚️ Opacity sliders and color pickers affect the selected shape.
      </p>
    </div>
  );
};

export default App;