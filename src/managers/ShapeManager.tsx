import type { IShape } from '../types';

export class ShapeManager {
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