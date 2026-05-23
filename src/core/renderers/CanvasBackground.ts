export class CanvasBackground {
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