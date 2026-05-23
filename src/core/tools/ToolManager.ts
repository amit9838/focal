import type { ITool, IToolContext } from "./ITool";

export class ToolManager {
  private tools: Map<string, ITool> = new Map();
  private activeTool: ITool | null = null;

  register(tool: ITool): void {
    this.tools.set(tool.name, tool);
  }

  activate(toolName: string, context: IToolContext): void {
    if (this.activeTool === this.tools.get(toolName)) return;
    if (this.activeTool) {
      this.activeTool.onDeactivate?.(context);
    }
    this.activeTool = this.tools.get(toolName) || null;
    if (this.activeTool) {
      this.activeTool.onActivate?.(context);
    }
  }

  handleMouseDown(e: MouseEvent | TouchEvent, context: IToolContext): void {
    this.activeTool?.onMouseDown?.(e, context);
  }

  handleMouseMove(e: MouseEvent | TouchEvent, context: IToolContext): void {
    this.activeTool?.onMouseMove?.(e, context);
  }

  handleMouseUp(e: MouseEvent | TouchEvent, context: IToolContext): void {
    this.activeTool?.onMouseUp?.(e, context);
  }

  drawOverlay(ctx: CanvasRenderingContext2D, context: IToolContext): void {
    this.activeTool?.onDraw?.(ctx, context);
  }

  getActiveToolName(): string | null {
    return this.activeTool?.name || null;
  }
}
