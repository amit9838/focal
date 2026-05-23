export type ResizeEdge = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

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