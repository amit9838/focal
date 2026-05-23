import type { ITool, IToolContext } from "./ITool";
import type { IShape, ResizeEdge } from "../types";
import { Rectangle } from "../models/Rectangle";
import { Ellipse } from "../models/Ellipse";
import { GroupTransform } from "../models/GroupTransform";

type DragMode = "none" | "move" | "resize" | "marquee" | "groupMove" | "groupResize";

export class ShapeTool implements ITool {
  public readonly name = "shape";

  private dragMode: DragMode = "none";
  private activeEdge: ResizeEdge = null;
  private dragOffset = { x: 0, y: 0 };
  private dragStart = { x: 0, y: 0 };
  private isPointerDown = false;
  private drawingStart = { x: 0, y: 0 };
  private drawingEnd = { x: 0, y: 0 };
  private isDrawingActive = false;
  private marqueeStart = { x: 0, y: 0 };
  private marqueeEnd = { x: 0, y: 0 };
  private groupTransform: GroupTransform | null = null;

  private drawingShapeType: "rect" | "ellipse" = "rect";
  private edgeTolerance = 8;

  // Store temporary shape locally – avoids relying solely on context.tempShape
  private localTempShape: IShape | null = null;

  // ------------------------------------------------------------------
  // ITool lifecycle
  // ------------------------------------------------------------------
  onActivate(context: IToolContext): void {
    console.log("Shape tool activated....");
    this.cancelDrawing(context);
  }

  onDeactivate(context: IToolContext): void {
    console.log("Shape tool deactivated");
    this.cancelDrawing(context);
  }

  // ------------------------------------------------------------------
  // Helper methods
  // ------------------------------------------------------------------
  private getEdgeUnderPoint(shape: IShape, px: number, py: number): ResizeEdge {
    const tol = this.edgeTolerance;
    const left = shape.x;
    const right = shape.x + shape.width;
    const top = shape.y;
    const bottom = shape.y + shape.height;

    if (Math.hypot(px - left, py - top) <= tol) return "nw";
    if (Math.hypot(px - right, py - top) <= tol) return "ne";
    if (Math.hypot(px - left, py - bottom) <= tol) return "sw";
    if (Math.hypot(px - right, py - bottom) <= tol) return "se";
    if (Math.abs(py - top) <= tol && px >= left && px <= right) return "n";
    if (Math.abs(px - right) <= tol && py >= top && py <= bottom) return "e";
    if (Math.abs(py - bottom) <= tol && px >= left && px <= right) return "s";
    if (Math.abs(px - left) <= tol && py >= top && py <= bottom) return "w";
    return null;
  }

  public getCursorForEdge(edge: ResizeEdge): string {
    switch (edge) {
      case "nw": return "nw-resize";
      case "n": return "ns-resize";
      case "ne": return "ne-resize";
      case "e": return "ew-resize";
      case "se": return "se-resize";
      case "s": return "ns-resize";
      case "sw": return "sw-resize";
      case "w": return "ew-resize";
      default: return "move";
    }
  }

  private getGroupBounds(shapeManager: any): { x: number; y: number; w: number; h: number } | null {
    const selected = shapeManager.getSelectedShapes();
    if (selected.length < 2) return null;
    const left = Math.min(...selected.map((s: IShape) => s.x));
    const top = Math.min(...selected.map((s: IShape) => s.y));
    const right = Math.max(...selected.map((s: IShape) => s.x + s.width));
    const bottom = Math.max(...selected.map((s: IShape) => s.y + s.height));
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  // ------------------------------------------------------------------
  // Event handlers
  // ------------------------------------------------------------------
  onMouseDown(e: MouseEvent | TouchEvent, context: IToolContext): void {
    e.preventDefault();

    const { x, y } = context.getCanvasCoords(e);
    this.isPointerDown = true;

    // DRAWING MODE (activated via UI button)
    if (this.isDrawingActive && this.localTempShape) {
      this.drawingStart = { x, y };
      this.drawingEnd = { x, y };
      // Ensure the temporary shape is in the context for rendering
      context.setTempShape(this.localTempShape);
      return;
    }

    const shapeManager = (context as any).shapeManager;
    const selectedIds = shapeManager.getSelectedIds();
    const groupBounds = this.getGroupBounds(shapeManager);

    // 1) Group selection (multiple shapes)
    if (groupBounds && selectedIds.length > 1) {
      const dummy = {
        x: groupBounds.x, y: groupBounds.y,
        width: groupBounds.w, height: groupBounds.h,
        id: "", type: "rect" as const, fillColor: "", strokeColor: "",
        isPointInside: () => false, draw: () => {}, resize: () => {}, getBounds: () => groupBounds
      };
      const edge = this.getEdgeUnderPoint(dummy, x, y);
      if (edge) {
        this.dragMode = "groupResize";
        this.activeEdge = edge;
        this.dragStart = { x, y };
        this.groupTransform = new GroupTransform(shapeManager.getSelectedShapes());
        return;
      }
      if (x >= groupBounds.x && x <= groupBounds.x + groupBounds.w &&
          y >= groupBounds.y && y <= groupBounds.y + groupBounds.h) {
        this.dragMode = "groupMove";
        this.dragOffset = { x: groupBounds.x - x, y: groupBounds.y - y };
        this.groupTransform = new GroupTransform(shapeManager.getSelectedShapes());
        return;
      }
    }

    // 2) Single shape handling
    const selectedShapes = shapeManager.getSelectedShapes();
    if (selectedShapes.length === 1) {
      const shape = selectedShapes[0];
      const edge = this.getEdgeUnderPoint(shape, x, y);
      if (edge) {
        this.dragMode = "resize";
        this.activeEdge = edge;
        this.dragStart = { x, y };
        return;
      }
      if (shape.isPointInside(x, y)) {
        this.dragMode = "move";
        this.dragOffset = { x: shape.x - x, y: shape.y - y };
        return;
      }
    }

    // 3) Click on any shape (selection change)
    const underCursor = shapeManager.findShapeUnderPoint(x, y);
    if (underCursor) {
      const additive = e.ctrlKey || e.metaKey;
      if (additive) {
        const current = shapeManager.getSelectedIds();
        if (current.includes(underCursor.id)) {
          shapeManager.setSelected(current.filter((id: string) => id !== underCursor.id), false);
        } else {
          shapeManager.setSelected([...current, underCursor.id], false);
        }
      } else {
        shapeManager.setSelected([underCursor.id], false);
      }
      return;
    }

    // 4) Start marquee selection
    const additive = e.ctrlKey || e.metaKey;
    if (!additive) shapeManager.setSelected([], false);
    this.dragMode = "marquee";
    this.marqueeStart = { x, y };
    this.marqueeEnd = { x, y };
  }

  onMouseMove(e: MouseEvent | TouchEvent, context: IToolContext): void {
    const { x, y } = context.getCanvasCoords(e);
    const shapeManager = (context as any).shapeManager;

    if (this.isPointerDown) {
      // ----- Drawing preview update -----
      if (this.isDrawingActive && this.localTempShape) {
        this.drawingEnd = { x, y };
        let nx = Math.min(this.drawingStart.x, this.drawingEnd.x);
        let ny = Math.min(this.drawingStart.y, this.drawingEnd.y);
        let nw = Math.abs(this.drawingEnd.x - this.drawingStart.x);
        let nh = Math.abs(this.drawingEnd.y - this.drawingStart.y);
        if (nw > 0 && nh > 0) {
          this.localTempShape.x = nx;
          this.localTempShape.y = ny;
          this.localTempShape.width = nw;
          this.localTempShape.height = nh;
          // Push to context so renderer can draw it
          context.setTempShape(this.localTempShape);
          context.requestRender();
        }
        return;
      }

      // ----- Group move -----
      if (this.dragMode === "groupMove" && this.groupTransform) {
        const dx = x + this.dragOffset.x - this.groupTransform.getBounds().x;
        const dy = y + this.dragOffset.y - this.groupTransform.getBounds().y;
        this.groupTransform.move(dx, dy, context.canvas.width, context.canvas.height);
        for (const shape of shapeManager.getSelectedShapes()) shapeManager.updateShape(shape);
        this.dragOffset = { x: this.groupTransform.getBounds().x - x, y: this.groupTransform.getBounds().y - y };
        context.requestRender();
        return;
      }

      // ----- Group resize -----
      if (this.dragMode === "groupResize" && this.groupTransform && this.activeEdge) {
        this.groupTransform.resize(this.activeEdge, this.dragStart.x, this.dragStart.y, x, y,
                                   context.canvas.width, context.canvas.height);
        for (const shape of shapeManager.getSelectedShapes()) shapeManager.updateShape(shape);
        this.dragStart = { x, y };
        context.requestRender();
        return;
      }

      // ----- Single shape move -----
      if (this.dragMode === "move") {
        const selected = shapeManager.getSelectedShapes();
        if (selected.length === 1) {
          const shape = selected[0];
          let newX = x + this.dragOffset.x;
          let newY = y + this.dragOffset.y;
          newX = Math.min(Math.max(0, newX), context.canvas.width - shape.width);
          newY = Math.min(Math.max(0, newY), context.canvas.height - shape.height);
          if (shape.x !== newX || shape.y !== newY) {
            shape.x = newX;
            shape.y = newY;
            shapeManager.updateShape(shape);
            context.requestRender();
          }
        }
      }
      // ----- Single shape resize -----
      else if (this.dragMode === "resize" && this.activeEdge) {
        const selected = shapeManager.getSelectedShapes();
        if (selected.length === 1) {
          const shape = selected[0];
          shape.resize(this.activeEdge, this.dragStart.x, this.dragStart.y, x, y,
                       context.canvas.width, context.canvas.height);
          this.dragStart = { x, y };
          shapeManager.updateShape(shape);
          context.requestRender();
        }
      }
      // ----- Marquee selection -----
      else if (this.dragMode === "marquee") {
        this.marqueeEnd = { x, y };
        context.requestRender();
      }
    }
  }

  onMouseUp(e: MouseEvent | TouchEvent, context: IToolContext): void {
    const shapeManager = (context as any).shapeManager;

    // ----- Finish drawing a new shape -----
    if (this.isDrawingActive && this.localTempShape) {
      const w = Math.abs(this.drawingEnd.x - this.drawingStart.x);
      const h = Math.abs(this.drawingEnd.y - this.drawingStart.y);
      if (w >= 10 && h >= 10) {
        const finalId = `shape_${this.drawingShapeType}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
        let finalShape: IShape;
        if (this.drawingShapeType === "rect") {
          finalShape = new Rectangle(finalId, this.localTempShape.x, this.localTempShape.y,
                                     this.localTempShape.width, this.localTempShape.height,
                                     this.localTempShape.fillColor, this.localTempShape.strokeColor);
        } else {
          finalShape = new Ellipse(finalId, this.localTempShape.x, this.localTempShape.y,
                                   this.localTempShape.width, this.localTempShape.height,
                                   this.localTempShape.fillColor, this.localTempShape.strokeColor);
        }
        shapeManager.addShape(finalShape);
        shapeManager.setSelected([finalShape.id], false);
      }
      // Clean up temporary shape
      this.localTempShape = null;
      context.setTempShape(null);
      this.isDrawingActive = false;
      context.requestRender();
    }

    // ----- Finish marquee selection -----
    if (this.dragMode === "marquee") {
      const rect = {
        x: Math.min(this.marqueeStart.x, this.marqueeEnd.x),
        y: Math.min(this.marqueeStart.y, this.marqueeEnd.y),
        w: Math.abs(this.marqueeEnd.x - this.marqueeStart.x),
        h: Math.abs(this.marqueeEnd.y - this.marqueeStart.y),
      };
      if (rect.w > 5 && rect.h > 5) {
        const intersecting = shapeManager.findShapesIntersectingRect(rect);
        const additive = (e as any).ctrlKey || (e as any).metaKey || false;
        const newIds = intersecting.map((s: IShape) => s.id);
        if (additive) {
          const current = shapeManager.getSelectedIds();
          const combined = [...new Set([...current, ...newIds])];
          shapeManager.setSelected(combined, false);
        } else {
          shapeManager.setSelected(newIds, false);
        }
      }
      this.dragMode = "none";
      context.requestRender();
    }

    // Reset all drag/resize modes
    this.dragMode = "none";
    this.activeEdge = null;
    this.groupTransform = null;
    this.isPointerDown = false;
  }

  onDraw(ctx: CanvasRenderingContext2D, context: IToolContext): void {
    // Draw marquee rectangle if active
    if (this.dragMode === "marquee") {
      const x = Math.min(this.marqueeStart.x, this.marqueeEnd.x);
      const y = Math.min(this.marqueeStart.y, this.marqueeEnd.y);
      const w = Math.abs(this.marqueeEnd.x - this.marqueeStart.x);
      const h = Math.abs(this.marqueeEnd.y - this.marqueeStart.y);
      if (w > 0 && h > 0) {
        ctx.save();
        ctx.setLineDash([6, 8]);
        ctx.strokeStyle = "#0080ff";
        ctx.lineWidth = 1.5;
        ctx.fillStyle = "rgba(0, 128, 255, 0.1)";
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
      }
    }
  }

  // ------------------------------------------------------------------
  // Public API for drawing mode
  // ------------------------------------------------------------------
  public setDrawingShapeType(type: "rect" | "ellipse"): void {
    this.drawingShapeType = type;
  }

  public startDrawing(context: IToolContext): void {
    if (this.localTempShape) return; // already drawing
    const tempId = `temp_${Date.now()}`;
    const temp = this.drawingShapeType === "rect"
      ? new Rectangle(tempId, 0, 0, 0, 0, "rgba(100, 150, 220, 0.6)", "#2c3e66")
      : new Ellipse(tempId, 0, 0, 0, 0, "rgba(150, 100, 220, 0.6)", "#4a2c66");
    this.localTempShape = temp;
    context.setTempShape(temp);
    this.isDrawingActive = true;
  }

  public cancelDrawing(context: IToolContext): void {
    this.localTempShape = null;
    this.isDrawingActive = false;
    context.setTempShape(null);
    this.dragMode = "none";
  }
}