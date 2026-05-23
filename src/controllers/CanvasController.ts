import { ShapeManager } from "../managers/ShapeManager";
import { CanvasRenderer } from "../renderers/CanvasRenderer";
import { InteractionHandler } from "../handlers/InteractionHandler";

export class CanvasController {
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
    this.interaction.onCursorChange = (cursor) => {
      canvas.style.cursor = cursor;
    };
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
      this.interaction.getGroupBounds(),
    );
  }

  public onDrawingModeChange?: (isDrawing: boolean) => void;

  public startDraw(shapeType: "rect" | "ellipse"): void {
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
