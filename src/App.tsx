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
  draw(ctx: CanvasRenderingContext2D, isSelected: boolean, isHovered: boolean, showKnobs: boolean): void;
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

  protected drawBoundingBox(ctx: CanvasRenderingContext2D, isSelected: boolean, isHovered: boolean, showKnobs: boolean, knobSize: number = 8): void {
    // Draw bounding box (blue outline) if selected or hovered
    if (isSelected || isHovered) {
      ctx.save();
      ctx.strokeStyle = '#0080ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      ctx.restore();
    }

    // Draw corner knobs only if selected and showKnobs is true
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

// ------------------------------------------------------------
// 2. Concrete shape classes
// ------------------------------------------------------------
class Rectangle extends Shape {
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

  draw(ctx: CanvasRenderingContext2D, isSelected: boolean, isHovered: boolean, showKnobs: boolean): void {
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

// ------------------------------------------------------------
// 3. Background renderer (dark checker + “focal”)
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

    const pattern = this.createCheckerPattern(ctx, 50, 'rgb(17, 17, 17)', '#272727');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#f0e6d2';
      ctx.fillRect(0, 0, width, height);
    }

    const rectW = 200, rectH = 80;
    const rectX = width / 2 + (width - rectW) / 3;
    const rectY = height / 2 + (height - rectH) / 3;
    this.roundedRect(ctx, rectX, rectY, rectW, rectH, 40);
    ctx.fillStyle = 'rgba(22, 22, 22, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#453629';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#a0846e';
    ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('focal', width / 2 + width / 3 + rectW / 6, height / 2 + height / 3 + rectH / 4);

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
// 4. ShapeManager – manages collection and multi‑selection
// ------------------------------------------------------------
class ShapeManager {
  private shapes: Map<string, IShape> = new Map();
  private selectedIds: Set<string> = new Set();

  public onShapesChange?: (shapes: Array<{ id: string, type: string, x: number, y: number, w: number, h: number, fill: string, stroke: string }>) => void;
  public onSelectedChange?: (selectedIds: string[]) => void;

  addShape(shape: IShape): void {
    this.shapes.set(shape.id, shape);
    this.notifyShapesChange();
  }

  deleteShapes(ids: string[]): void {
    let changed = false;
    for (const id of ids) {
      if (this.shapes.delete(id)) {
        this.selectedIds.delete(id);
        changed = true;
      }
    }
    if (changed) {
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

  setSelected(ids: string[], additive: boolean = false): void {
    if (!additive) this.selectedIds.clear();
    for (const id of ids) {
      if (this.shapes.has(id)) this.selectedIds.add(id);
    }
    this.notifySelectedChange();
  }

  clearSelection(): void {
    this.selectedIds.clear();
    this.notifySelectedChange();
  }

  getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }

  getSelectedShapes(): IShape[] {
    return this.getSelectedIds().map(id => this.shapes.get(id)!).filter(s => s !== undefined);
  }

  findShapesIntersectingRect(rect: { x: number, y: number, w: number, h: number }): IShape[] {
    const intersecting: IShape[] = [];
    for (const shape of this.getAllShapes()) {
      const b = shape.getBounds();
      if (rect.x < b.x + b.w && rect.x + rect.w > b.x && rect.y < b.y + b.h && rect.y + rect.h > b.y) {
        intersecting.push(shape);
      }
    }
    return intersecting;
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
    this.onSelectedChange?.(this.getSelectedIds());
  }
}

// ------------------------------------------------------------
// 5. GroupTransform – helper to move/resize multiple shapes together
// ------------------------------------------------------------
class GroupTransform {
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

// ------------------------------------------------------------
// 6. InteractionHandler – handles all input, includes group transform
// ------------------------------------------------------------
type DragMode = 'none' | 'move' | 'resize' | 'marquee' | 'groupMove' | 'groupResize';

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

  // Single shape drawing
  public isDrawingMode: boolean = false;
  public drawingShapeType: 'rect' | 'ellipse' = 'rect';
  public isDrawingActive: boolean = false;
  private drawingStart = { x: 0, y: 0 };
  private drawingEnd = { x: 0, y: 0 };
  public tempShape: IShape | null = null;

  // Marquee selection
  private isMarqueeActive: boolean = false;
  private marqueeStart = { x: 0, y: 0 };
  private marqueeEnd = { x: 0, y: 0 };

  // Group transform
  private groupTransform: GroupTransform | null = null;

  public onDrawComplete?: (shape: IShape) => void;
  public onShapeMoved?: (shape: IShape) => void;
  public onShapeResized?: (shape: IShape) => void;
  public onCursorChange?: (cursor: string) => void;
  public onDrawingStateChange?: (isDrawing: boolean) => void;
  public onSelectionChange?: (ids: string[], additive: boolean) => void;
  public onGroupTransform?: () => void;

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
      default: return 'move';
    }
  }

  // Drawing
  private handleDown = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const { x, y } = this.getCanvasCoords(e);
    this.lastPointer = { x, y };
    this.isPointerDown = true;

    if (this.isDrawingMode) {
      this.isDrawingActive = true;
      this.drawingStart = { x, y };
      this.drawingEnd = { x, y };
      const tempId = `temp_${Date.now()}`;
      if (this.drawingShapeType === 'rect') {
        this.tempShape = new Rectangle(tempId, x, y, 0, 0, 'rgba(100, 150, 220, 0.6)', '#2c3e66');
      } else {
        this.tempShape = new Ellipse(tempId, x, y, 0, 0, 'rgba(150, 100, 220, 0.6)', '#4a2c66');
      }
      this.onDrawingStateChange?.(true);
      return;
    }

    const selectedIds = this.shapeManager.getSelectedIds();
    const groupBounds = this.getGroupBounds();

    // 1) If multiple selected, check group edge/bounds
    if (groupBounds && selectedIds.length > 1) {
      const dummy = {
        x: groupBounds.x, y: groupBounds.y, width: groupBounds.w, height: groupBounds.h,
        id: '', type: 'rect' as const, fillColor: '', strokeColor: '',
        isPointInside: () => false, draw: () => {}, resize: () => {}, getBounds: () => groupBounds
      };
      const edge = this.getEdgeUnderPoint(dummy, x, y);
      if (edge) {
        this.dragMode = 'groupResize';
        this.activeEdge = edge;
        this.dragStart = { x, y };
        this.groupTransform = new GroupTransform(this.shapeManager.getSelectedShapes());
        return;
      }
      if (x >= groupBounds.x && x <= groupBounds.x + groupBounds.w &&
          y >= groupBounds.y && y <= groupBounds.y + groupBounds.h) {
        this.dragMode = 'groupMove';
        this.dragOffset = { x: groupBounds.x - x, y: groupBounds.y - y };
        this.groupTransform = new GroupTransform(this.shapeManager.getSelectedShapes());
        return;
      }
    }

    // 2) Single shape handling
    const selectedShapes = this.shapeManager.getSelectedShapes();
    if (selectedShapes.length === 1) {
      const shape = selectedShapes[0];
      const edge = this.getEdgeUnderPoint(shape, x, y);
      if (edge) {
        this.dragMode = 'resize';
        this.activeEdge = edge;
        this.dragStart = { x, y };
        return;
      }
      if (shape.isPointInside(x, y)) {
        this.dragMode = 'move';
        this.dragOffset = { x: shape.x - x, y: shape.y - y };
        return;
      }
    }

    // 3) Click on any shape (including for selection change)
    const underCursor = this.shapeManager.findShapeUnderPoint(x, y);
    if (underCursor) {
      const additive = e.ctrlKey || e.metaKey;
      if (additive) {
        const current = this.shapeManager.getSelectedIds();
        if (current.includes(underCursor.id)) {
          const newSelected = current.filter(id => id !== underCursor.id);
          this.onSelectionChange?.(newSelected, false);
        } else {
          this.onSelectionChange?.([...current, underCursor.id], false);
        }
      } else {
        this.onSelectionChange?.([underCursor.id], false);
      }
      return;
    }

    // 4) Start marquee selection (clear selection unless additive)
    const additive = e.ctrlKey || e.metaKey;
    if (!additive) {
      this.onSelectionChange?.([], false);
    }
    this.isMarqueeActive = true;
    this.marqueeStart = { x, y };
    this.marqueeEnd = { x, y };
    this.dragMode = 'marquee';
  };

  private handleMove = (e: MouseEvent | TouchEvent) => {
    const { x, y } = this.getCanvasCoords(e);
    this.lastPointer = { x, y };

    if (this.isPointerDown) {
      if (this.isDrawingMode && this.isDrawingActive) {
        this.drawingEnd = { x, y };
        if (this.tempShape) {
          let nx = Math.min(this.drawingStart.x, this.drawingEnd.x);
          let ny = Math.min(this.drawingStart.y, this.drawingEnd.y);
          let nw = Math.abs(this.drawingEnd.x - this.drawingStart.x);
          let nh = Math.abs(this.drawingEnd.y - this.drawingStart.y);
          if (nw > 0 && nh > 0) {
            this.tempShape.x = nx;
            this.tempShape.y = ny;
            this.tempShape.width = nw;
            this.tempShape.height = nh;
          }
        }
        this.onDrawingStateChange?.(true);
        return;
      }

      if (this.dragMode === 'groupMove' && this.groupTransform) {
        const dx = x + this.dragOffset.x - this.groupTransform.getBounds().x;
        const dy = y + this.dragOffset.y - this.groupTransform.getBounds().y;
        this.groupTransform.move(dx, dy, this.canvas.width, this.canvas.height);
        for (const shape of this.shapeManager.getSelectedShapes()) {
          this.shapeManager.updateShape(shape);
        }
        this.onGroupTransform?.();
        this.dragOffset = { x: this.groupTransform.getBounds().x - x, y: this.groupTransform.getBounds().y - y };
        return;
      }

      if (this.dragMode === 'groupResize' && this.groupTransform && this.activeEdge) {
        this.groupTransform.resize(this.activeEdge, this.dragStart.x, this.dragStart.y, x, y, this.canvas.width, this.canvas.height);
        for (const shape of this.shapeManager.getSelectedShapes()) {
          this.shapeManager.updateShape(shape);
        }
        this.dragStart = { x, y };
        this.onGroupTransform?.();
        return;
      }

      if (this.dragMode === 'move') {
        const selected = this.shapeManager.getSelectedShapes();
        if (selected.length === 1) {
          const shape = selected[0];
          let newX = x + this.dragOffset.x;
          let newY = y + this.dragOffset.y;
          newX = Math.min(Math.max(0, newX), this.canvas.width - shape.width);
          newY = Math.min(Math.max(0, newY), this.canvas.height - shape.height);
          if (shape.x !== newX || shape.y !== newY) {
            shape.x = newX;
            shape.y = newY;
            this.shapeManager.updateShape(shape);
            this.onShapeMoved?.(shape);
          }
        }
      } else if (this.dragMode === 'resize' && this.activeEdge) {
        const selected = this.shapeManager.getSelectedShapes();
        if (selected.length === 1) {
          const shape = selected[0];
          shape.resize(this.activeEdge, this.dragStart.x, this.dragStart.y, x, y, this.canvas.width, this.canvas.height);
          this.dragStart = { x, y };
          this.shapeManager.updateShape(shape);
          this.onShapeResized?.(shape);
        }
      } else if (this.dragMode === 'marquee') {
        this.marqueeEnd = { x, y };
      }
    } else {
      // Update hover and cursor
      let hoverShape: IShape | null = null;
      for (const shape of this.shapeManager.getAllShapes().reverse()) {
        if (shape.isPointInside(x, y) || this.getEdgeUnderPoint(shape, x, y)) {
          hoverShape = shape;
          break;
        }
      }
      const newHoverId = hoverShape ? hoverShape.id : null;
      if (this.hoveredId !== newHoverId) this.hoveredId = newHoverId;

      let cursor = 'default';
      const selected = this.shapeManager.getSelectedShapes();
      const groupBounds = this.getGroupBounds();
      if (selected.length > 1 && groupBounds) {
        const dummy = {
          x: groupBounds.x, y: groupBounds.y, width: groupBounds.w, height: groupBounds.h,
          id: '', type: 'rect' as const, fillColor: '', strokeColor: '',
          isPointInside: () => false, draw: () => {}, resize: () => {}, getBounds: () => groupBounds
        };
        const edge = this.getEdgeUnderPoint(dummy, x, y);
        if (edge) cursor = this.getCursorForEdge(edge);
        else if (x >= groupBounds.x && x <= groupBounds.x + groupBounds.w &&
                 y >= groupBounds.y && y <= groupBounds.y + groupBounds.h) cursor = 'move';
      } else if (selected.length === 1) {
        const shape = selected[0];
        const edge = this.getEdgeUnderPoint(shape, x, y);
        if (edge) cursor = this.getCursorForEdge(edge);
        else if (shape.isPointInside(x, y)) cursor = 'move';
      } else if (hoverShape && !selected.includes(hoverShape)) {
        cursor = 'default';
      } else if (this.isDrawingMode) {
        cursor = 'crosshair';
      }
      this.onCursorChange?.(cursor);
    }
  };

  private handleUp = () => {
    if (this.isDrawingMode && this.isDrawingActive) {
      const w = Math.abs(this.drawingEnd.x - this.drawingStart.x);
      const h = Math.abs(this.drawingEnd.y - this.drawingStart.y);
      if (w >= 10 && h >= 10 && this.tempShape) {
        const finalId = `shape_${this.drawingShapeType}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
        let finalShape: IShape;
        if (this.drawingShapeType === 'rect') {
          finalShape = new Rectangle(finalId, this.tempShape.x, this.tempShape.y, this.tempShape.width, this.tempShape.height,
            this.tempShape.fillColor, this.tempShape.strokeColor);
        } else {
          finalShape = new Ellipse(finalId, this.tempShape.x, this.tempShape.y, this.tempShape.width, this.tempShape.height,
            this.tempShape.fillColor, this.tempShape.strokeColor);
        }
        this.onDrawComplete?.(finalShape);
      }
      this.tempShape = null;
      this.isDrawingActive = false;
      this.isDrawingMode = false;
      this.onDrawingStateChange?.(false);
      this.onCursorChange?.('default');
    }

    if (this.dragMode === 'marquee') {
      const rect = {
        x: Math.min(this.marqueeStart.x, this.marqueeEnd.x),
        y: Math.min(this.marqueeStart.y, this.marqueeEnd.y),
        w: Math.abs(this.marqueeEnd.x - this.marqueeStart.x),
        h: Math.abs(this.marqueeEnd.y - this.marqueeStart.y)
      };
      if (rect.w > 5 && rect.h > 5) {
        const intersecting = this.shapeManager.findShapesIntersectingRect(rect);
        const additive = (window.event as MouseEvent)?.ctrlKey || (window.event as MouseEvent)?.metaKey || false;
        const newIds = intersecting.map(s => s.id);
        if (additive) {
          const current = this.shapeManager.getSelectedIds();
          const combined = [...new Set([...current, ...newIds])];
          this.onSelectionChange?.(combined, false);
        } else {
          this.onSelectionChange?.(newIds, false);
        }
      }
      this.isMarqueeActive = false;
    }

    this.dragMode = 'none';
    this.activeEdge = null;
    this.groupTransform = null;
    this.isPointerDown = false;
  };

  private handleLeave = () => {
    this.dragMode = 'none';
    this.activeEdge = null;
    this.groupTransform = null;
    this.isPointerDown = false;
    if (this.isDrawingMode && this.isDrawingActive) {
      this.isDrawingActive = false;
      this.isDrawingMode = false;
      this.tempShape = null;
      this.onDrawingStateChange?.(false);
    }
    this.isMarqueeActive = false;
    this.hoveredId = null;
    this.onCursorChange?.('default');
  };

  public startDraw(shapeType: 'rect' | 'ellipse'): void {
    this.isDrawingMode = true;
    this.drawingShapeType = shapeType;
    this.onCursorChange?.('crosshair');
  }

  public cancelDraw(): void {
    this.isDrawingMode = false;
    this.isDrawingActive = false;
    this.tempShape = null;
    this.onCursorChange?.('default');
  }

  public getHoveredId(): string | null {
    return this.hoveredId;
  }

  public getMarqueeRect(): { x: number, y: number, w: number, h: number } | null {
    if (this.isMarqueeActive) {
      return {
        x: Math.min(this.marqueeStart.x, this.marqueeEnd.x),
        y: Math.min(this.marqueeStart.y, this.marqueeEnd.y),
        w: Math.abs(this.marqueeEnd.x - this.marqueeStart.x),
        h: Math.abs(this.marqueeEnd.y - this.marqueeStart.y)
      };
    }
    return null;
  }

  public getGroupBounds(): { x: number, y: number, w: number, h: number } | null {
    const selected = this.shapeManager.getSelectedShapes();
    if (selected.length < 2) return null;
    const left = Math.min(...selected.map(s => s.x));
    const top = Math.min(...selected.map(s => s.y));
    const right = Math.max(...selected.map(s => s.x + s.width));
    const bottom = Math.max(...selected.map(s => s.y + s.height));
    return { x: left, y: top, w: right - left, h: bottom - top };
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
// 7. CanvasRenderer – draws background, shapes, marquee, group box with knobs
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
    selectedIds: string[],
    hoveredId: string | null,
    tempShape: IShape | null,
    marqueeRect: { x: number, y: number, w: number, h: number } | null,
    groupBounds: { x: number, y: number, w: number, h: number } | null
  ): void {
    this.drawBackground();
    this.drawShapes(shapes, selectedIds, hoveredId);
    if (tempShape) tempShape.draw(this.ctx, false, false, false);
    if (marqueeRect && marqueeRect.w > 0 && marqueeRect.h > 0) {
      this.ctx.save();
      this.ctx.setLineDash([6, 8]);
      this.ctx.strokeStyle = '#0080ff';
      this.ctx.lineWidth = 1.5;
      this.ctx.fillStyle = 'rgba(0, 128, 255, 0.1)';
      this.ctx.fillRect(marqueeRect.x, marqueeRect.y, marqueeRect.w, marqueeRect.h);
      this.ctx.strokeRect(marqueeRect.x, marqueeRect.y, marqueeRect.w, marqueeRect.h);
      this.ctx.restore();
    }
    if (groupBounds && selectedIds.length > 1) {
      // Draw group bounding box with knobs (same style as single selected shape)
      this.drawGroupBoxWithKnobs(groupBounds);
    }
  }

  private drawGroupBoxWithKnobs(groupBounds: { x: number, y: number, w: number, h: number }): void {
    const knobSize = 8;
    this.ctx.save();
    this.ctx.strokeStyle = '#0080ff';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([]);
    this.ctx.strokeRect(groupBounds.x, groupBounds.y, groupBounds.w, groupBounds.h);
    // Draw corner knobs
    const corners = [
      { x: groupBounds.x, y: groupBounds.y },
      { x: groupBounds.x + groupBounds.w, y: groupBounds.y },
      { x: groupBounds.x, y: groupBounds.y + groupBounds.h },
      { x: groupBounds.x + groupBounds.w, y: groupBounds.y + groupBounds.h }
    ];
    this.ctx.fillStyle = 'white';
    this.ctx.strokeStyle = '#2c3e66';
    this.ctx.lineWidth = 1.5;
    for (const knob of corners) {
      this.ctx.fillRect(knob.x - knobSize / 2, knob.y - knobSize / 2, knobSize, knobSize);
      this.ctx.strokeRect(knob.x - knobSize / 2, knob.y - knobSize / 2, knobSize, knobSize);
    }
    this.ctx.restore();
  }

  private drawBackground(): void {
    const bgImage = this.background.getImage();
    if (bgImage) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(bgImage, 0, 0);
    }
  }

  private drawShapes(shapes: IShape[], selectedIds: string[], hoveredId: string | null): void {
    const isGroupSelected = selectedIds.length > 1;
    for (const shape of shapes) {
      const isSelected = selectedIds.includes(shape.id);
      const isHovered = shape.id === hoveredId;
      // For group selection: each selected shape shows blue box but NO knobs (showKnobs = false)
      const showKnobs = isSelected && !isGroupSelected;
      shape.draw(this.ctx, isSelected, isHovered, showKnobs);
    }
  }
}

// ------------------------------------------------------------
// 8. CanvasController – facade that wires everything
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
      this.shapeManager.setSelected([shape.id], false);
      this.interaction.cancelDraw();
      this.onDrawingModeChange?.(false);
      this.render();
    };
    this.interaction.onShapeMoved = () => this.render();
    this.interaction.onShapeResized = () => this.render();
    this.interaction.onCursorChange = (cursor) => { canvas.style.cursor = cursor; };
    this.interaction.onDrawingStateChange = () => this.render();
    this.interaction.onSelectionChange = (ids, additive) => {
      this.shapeManager.setSelected(ids, additive);
      this.render();
    };
    this.interaction.onGroupTransform = () => this.render();

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
    const selectedIds = this.shapeManager.getSelectedIds();
    this.renderer.render(
      shapes,
      selectedIds,
      this.hoveredId,
      this.interaction.tempShape,
      this.interaction.getMarqueeRect(),
      this.interaction.getGroupBounds()
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
    this.shapeManager.deleteShapes(this.shapeManager.getSelectedIds());
  }

  public setSelectedFillColor(color: string): void {
    for (const shape of this.shapeManager.getSelectedShapes()) {
      shape.fillColor = color;
      this.shapeManager.updateShape(shape);
    }
  }

  public setSelectedStrokeColor(color: string): void {
    for (const shape of this.shapeManager.getSelectedShapes()) {
      shape.strokeColor = color;
      this.shapeManager.updateShape(shape);
    }
  }

  public selectShapeById(id: string): void {
    this.shapeManager.setSelected([id], false);
  }

  public destroy(): void {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.interaction.detach();
  }
}

// ------------------------------------------------------------
// 9. React App Component with Tailwind CSS
// ------------------------------------------------------------
const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<CanvasController | null>(null);
  const [shapes, setShapes] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [shapeType, setShapeType] = useState<'rect' | 'ellipse'>('rect');
  const [fillColor, setFillColor] = useState('#6496dc');
  const [fillOpacity, setFillOpacity] = useState(0.6);
  const [strokeColor, setStrokeColor] = useState('#2c3e66');
  const [strokeOpacity, setStrokeOpacity] = useState(1);

  useEffect(() => {
    if (!canvasRef.current) return;
    const width = window.innerWidth - 40;
    const height = window.innerHeight - 280;
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    const controller = new CanvasController(canvasRef.current, width, height);
    const shapeManager = (controller as any).shapeManager;
    shapeManager.onShapesChange = setShapes;
    shapeManager.onSelectedChange = setSelectedIds;
    controller.onDrawingModeChange = setIsDrawingMode;
    controllerRef.current = controller;
    return () => controller.destroy();
  }, []);

  useEffect(() => {
    if (selectedIds.length > 0) {
      const firstShape = shapes.find(s => s.id === selectedIds[0]);
      if (firstShape) {
        const fillMatch = firstShape.fill.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
        if (fillMatch) {
          const r = parseInt(fillMatch[1]);
          const g = parseInt(fillMatch[2]);
          const b = parseInt(fillMatch[3]);
          const a = fillMatch[4] ? parseFloat(fillMatch[4]) : 1;
          setFillColor(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
          setFillOpacity(a);
        } else if (firstShape.fill.startsWith('#')) {
          setFillColor(firstShape.fill);
          setFillOpacity(1);
        }
        const strokeMatch = firstShape.stroke.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
        if (strokeMatch) {
          const r = parseInt(strokeMatch[1]);
          const g = parseInt(strokeMatch[2]);
          const b = parseInt(strokeMatch[3]);
          const a = strokeMatch[4] ? parseFloat(strokeMatch[4]) : 1;
          setStrokeColor(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
          setStrokeOpacity(a);
        } else if (firstShape.stroke.startsWith('#')) {
          setStrokeColor(firstShape.stroke);
          setStrokeOpacity(1);
        }
      }
    }
  }, [selectedIds, shapes]);

  const hexToRgba = (hex: string, opacity: number): string => {
    let r = 0, g = 0, b = 0;
    if (hex.startsWith('#')) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const handleDraw = () => controllerRef.current?.startDraw(shapeType);
  const handleCancelDraw = () => controllerRef.current?.cancelDraw();
  const handleDelete = () => controllerRef.current?.deleteSelected();
  const handleSelectShape = (id: string) => controllerRef.current?.selectShapeById(id);
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

  return (
    <div className="min-h-screen bg-[#f3f1eb] font-sans flex flex-col items-center">
      <div className="mt-4 mb-2 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-2 flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1">
          <span className="text-xs font-medium text-stone-600">Shape</span>
          <select
            value={shapeType}
            onChange={(e) => setShapeType(e.target.value as 'rect' | 'ellipse')}
            className="bg-white border border-gray-200 rounded-md px-2 py-1 text-sm cursor-pointer focus:outline-none"
          >
            <option value="rect">Rectangle</option>
            <option value="ellipse">Ellipse</option>
          </select>
        </div>

        <button
          onClick={handleDraw}
          disabled={isDrawingMode}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
            isDrawingMode ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#1e6f9f] text-white hover:bg-[#1a5a82]'
          }`}
        >
          Draw
        </button>
        {isDrawingMode && (
          <button
            onClick={handleCancelDraw}
            className="px-4 py-1.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}

        <button
          onClick={handleDelete}
          disabled={selectedIds.length === 0}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
            selectedIds.length > 0 ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Delete {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
        </button>

        <div className="w-px h-6 bg-gray-200" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">Fill</span>
          <input
            type="color"
            value={fillColor}
            onChange={handleFillColorChange}
            disabled={selectedIds.length === 0}
            className="w-7 h-7 rounded border border-gray-300 cursor-pointer disabled:opacity-50"
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={fillOpacity}
            onChange={handleFillOpacityChange}
            disabled={selectedIds.length === 0}
            className="w-20 h-1.5 cursor-pointer disabled:opacity-50"
          />
          <span className="text-xs text-gray-500 w-9">{Math.round(fillOpacity * 100)}%</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">Stroke</span>
          <input
            type="color"
            value={strokeColor}
            onChange={handleStrokeColorChange}
            disabled={selectedIds.length === 0}
            className="w-7 h-7 rounded border border-gray-300 cursor-pointer disabled:opacity-50"
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={strokeOpacity}
            onChange={handleStrokeOpacityChange}
            disabled={selectedIds.length === 0}
            className="w-20 h-1.5 cursor-pointer disabled:opacity-50"
          />
          <span className="text-xs text-gray-500 w-9">{Math.round(strokeOpacity * 100)}%</span>
        </div>

        {selectedIds.length > 1 && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            {selectedIds.length} shapes selected
          </span>
        )}
      </div>

      <canvas
        ref={canvasRef}
        className="rounded-xl shadow-md"
        style={{ display: 'block' }}
      />

      <div className="mt-5 bg-white rounded-2xl px-5 py-3 w-[90%] max-w-3xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Shapes ({shapes.length})</h3>
        <div className="flex flex-wrap gap-2">
          {shapes.map(shape => (
            <div
              key={shape.id}
              onClick={() => handleSelectShape(shape.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer transition ${
                selectedIds.includes(shape.id) ? 'bg-blue-50 border border-blue-300' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div
                className="w-4 h-4 rounded-sm"
                style={{ background: shape.fill, border: `1px solid ${shape.stroke}`, borderRadius: shape.type === 'ellipse' ? '50%' : '2px' }}
              />
              <span className="font-mono text-xs text-gray-600">{shape.type === 'rect' ? '□' : '○'} {shape.w}×{shape.h}</span>
            </div>
          ))}
          {shapes.length === 0 && <span className="text-xs text-gray-400">No shapes – click Draw to create one</span>}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center max-w-xl">
        • <strong>Click</strong> a shape → select it.<br/>
        • <strong>Ctrl/Cmd + Click</strong> → add/remove from selection.<br/>
        • <strong>Drag empty area</strong> → marquee selection (add with Ctrl/Cmd).<br/>
        • When 2+ shapes are selected: a <strong>blue group box with corner knobs</strong> appears.<br/>
        &nbsp;&nbsp;&nbsp;– Drag inside the box → move all selected shapes.<br/>
        &nbsp;&nbsp;&nbsp;– Drag edges/corners → resize the whole group.<br/>
        • Color/opacity controls affect all selected shapes.
      </p>
    </div>
  );
};

export default App;