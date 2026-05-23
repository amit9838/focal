import type { IShape } from '../types';
import { ShapeManager } from '../managers/ShapeManager';

export interface IToolContext {
  canvas: HTMLCanvasElement;
  shapeManager: ShapeManager;
  tempShape: IShape | null;
  setTempShape: (shape: IShape | null) => void;
  requestRender: () => void;
  getCanvasCoords: (e: MouseEvent | TouchEvent) => { x: number; y: number };
}

export interface ITool {
  readonly name: string;
  onActivate?(context: IToolContext): void;
  onDeactivate?(context: IToolContext): void;
  onMouseDown?(e: MouseEvent | TouchEvent, context: IToolContext): void;
  onMouseMove?(e: MouseEvent | TouchEvent, context: IToolContext): void;
  onMouseUp?(e: MouseEvent | TouchEvent, context: IToolContext): void;
  onDraw?(ctx: CanvasRenderingContext2D, context: IToolContext): void; // for temporary overlays
}   