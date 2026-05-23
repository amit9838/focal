import type{ IShape, ResizeEdge } from '../types';
import { ShapeManager } from '../managers/ShapeManager';
import { Rectangle } from '../models/Rectangle';
import { Ellipse } from '../models/Ellipse';
import { GroupTransform } from '../models/GroupTransform';

type DragMode = 'none' | 'move' | 'resize' | 'marquee' | 'groupMove' | 'groupResize';

export class InteractionHandler {
  private canvas: HTMLCanvasElement;
  private shapeManager: ShapeManager;
  private edgeTolerance: number = 8;

  private dragMode: DragMode = 'none';
  private activeEdge: ResizeEdge = null;
  private dragOffset = { x: 0, y: 0 };
  private dragStart = { x: 0, y: 0 };
  private isPointerDown = false;
  private hoveredId: string | null = null;
  
  // Single shape drawing
  public lastPointer = { x: 0, y: 0 };
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
        this.tempShape = new Rectangle(tempId, x, y, 0, 0, 'rgba(42, 46, 52, 0.39)', '#2c3e66');
      } else {
        this.tempShape = new Ellipse(tempId, x, y, 0, 0, 'rgba(52, 42, 50, 0.42)', '#4a2c66');
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
