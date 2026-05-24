import { ShapeManager } from "../managers/ShapeManager";
import { CanvasRenderer } from "../renderers/CanvasRenderer";
import { ToolManager } from "../tools/ToolManager";
import { ShapeTool } from "../tools/ShapeTool";
import type { IToolContext } from "../tools/ITool";
import { type IShape } from "../types";
import { CanvasAdapter } from "../adapters/CanvasAdapter";

export class CanvasController {
  private renderer: CanvasRenderer;
  private shapeManager: ShapeManager;
  private toolManager: ToolManager;
  private canvasAdapter: CanvasAdapter;
  private animationFrame: number | null = null;
  private hoveredId: string | null = null;
  private tempShape: IShape | null = null;
  private toolContext: IToolContext;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.shapeManager = new ShapeManager();
    this.toolManager = new ToolManager();
    this.canvasAdapter = new CanvasAdapter(canvas);
    this.renderer = new CanvasRenderer(canvas, width, height);

    // ------------------------------------------------------------------
    // Register all built-in tools here
    // ------------------------------------------------------------------
    const shapeTool = new ShapeTool();
    this.toolManager.register(shapeTool);
    // Future: this.toolManager.register(new DrawTool());
    // Future: this.toolManager.register(new PaintTool());

    // Create tool context (shared across all tools)
    this.toolContext = {
      canvas,
      shapeManager: this.shapeManager,
      tempShape: this.tempShape,
      setTempShape: (shape) => {
        this.tempShape = shape;
        this.render();
      },
      requestRender: () => this.render(),
      getCanvasCoords: (e) => this.canvasAdapter.getCanvasCoords(e),
    };

    // Activate default tool
    this.toolManager.activate("shape", this.toolContext);

    // Wire DOM events
    canvas.addEventListener("mousemove", this.handleMove);
    canvas.addEventListener("mousedown", this.handleDown);
    window.addEventListener("mouseup", this.handleUp);
    canvas.addEventListener("touchmove", this.handleMove);
    canvas.addEventListener("touchstart", this.handleDown);
    window.addEventListener("touchend", this.handleUp);
    canvas.addEventListener("mouseleave", this.handleLeave);

    // Shape manager callbacks
    this.shapeManager.onShapesChange = () => this.render();
    this.shapeManager.onSelectedChange = () => this.render();

    // Start render loop
    const loop = () => {
      this.render();
      this.animationFrame = requestAnimationFrame(loop);
    };
    this.animationFrame = requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------
  // Event handlers
  // ------------------------------------------------------------------
  private handleDown = (e: MouseEvent | TouchEvent) => {
    this.toolManager.handleMouseDown(e, this.toolContext);
  };

  private handleMove = (e: MouseEvent | TouchEvent) => {
    const { x, y } = this.canvasAdapter.getCanvasCoords(e);
    const shape = this.shapeManager.findShapeUnderPoint(x, y);
    const newHoverId = shape?.id || null;
    if (this.hoveredId !== newHoverId) {
      this.hoveredId = newHoverId;
      this.render();
    }
    this.toolManager.handleMouseMove(e, this.toolContext);
  };

  private handleUp = (e: MouseEvent | TouchEvent) => {
    this.toolManager.handleMouseUp(e, this.toolContext);
  };

  private handleLeave = () => {
    this.hoveredId = null;
    this.render();
  };

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------
  private render(): void {
    const shapes = this.shapeManager.getAllShapes();
    const selectedIds = this.shapeManager.getSelectedIds();
    const groupBounds = this.getGroupBounds();
    this.renderer.render(
      shapes,
      selectedIds,
      this.hoveredId,
      this.tempShape,
      null, // marqueeRect is drawn by the tool itself
      groupBounds,
    );
    // Let the active tool draw its own overlays (marquee, etc.)
    const ctx = (this.renderer as any).ctx;
    this.toolManager.drawOverlay(ctx, this.toolContext);
  }

  private getGroupBounds(): {
    x: number;
    y: number;
    w: number;
    h: number;
  } | null {
    const selected = this.shapeManager.getSelectedShapes();
    if (selected.length < 2) return null;
    const left = Math.min(...selected.map((s) => s.x));
    const top = Math.min(...selected.map((s) => s.y));
    const right = Math.max(...selected.map((s) => s.x + s.width));
    const bottom = Math.max(...selected.map((s) => s.y + s.height));
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  // ------------------------------------------------------------------
  // Public API for the UI
  // ------------------------------------------------------------------
  public setDrawingShapeType(type: "rect" | "ellipse"): void {
    const shapeTool = (this.toolManager as any).tools.get("shape") as ShapeTool;
    shapeTool?.setDrawingShapeType(type);
  }

  public startDrawing(): void {
    const shapeTool = (this.toolManager as any).tools.get("shape") as ShapeTool;
    shapeTool?.startDrawing(this.toolContext);
  }

  public cancelDrawing(): void {
    const shapeTool = (this.toolManager as any).tools.get("shape") as ShapeTool;
    shapeTool?.cancelDrawing(this.toolContext);
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

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------
  public destroy(): void {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    const canvas = this.toolContext.canvas;
    canvas.removeEventListener("mousemove", this.handleMove);
    canvas.removeEventListener("mousedown", this.handleDown);
    window.removeEventListener("mouseup", this.handleUp);
    canvas.removeEventListener("touchmove", this.handleMove);
    canvas.removeEventListener("touchstart", this.handleDown);
    window.removeEventListener("touchend", this.handleUp);
    canvas.removeEventListener("mouseleave", this.handleLeave);
  }
}
