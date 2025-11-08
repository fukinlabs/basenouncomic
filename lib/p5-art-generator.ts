// P5.js Art Generator - Converted to Canvas API for server-side rendering

export interface ArtConfig {
  tokenId: string;
  seed?: number;
}

// Seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  randomInt(max: number): number {
    return Math.floor(this.random() * max);
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// Shape class equivalent
class Shape {
  x: number;
  y: number;
  w: number;
  clrs: string[];
  scaleX: number;
  angle: number;
  form: number;
  rng: SeededRandom;

  constructor(x: number, y: number, w: number, f: number, colors: string[], rng: SeededRandom) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.clrs = [...colors];
    this.rng = rng;
    this.scaleX = rng.random() < 0.5 ? -1 : 1;
    this.angle = rng.randomInt(4) * (Math.PI * 2 / 4);
    this.clrs = rng.shuffle(this.clrs);
    this.form = f;
  }

  drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(t, 1);
    ctx.beginPath();
    for (let a = 0; a < Math.PI / 2; a += (Math.PI * 2) / 360) {
      const px = -(w / 2) + w * Math.cos(a);
      const py = -(w / 2) + w * Math.sin(a);
      if (a === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    for (let a = Math.PI; a < Math.PI + Math.PI / 2; a += (Math.PI * 2) / 360) {
      const px = (w / 2) + w * Math.cos(a);
      const py = (w / 2) + w * Math.sin(a);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  show(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleX, 1);
    ctx.rotate(this.angle);

    ctx.lineWidth = 0;
    ctx.fillStyle = this.clrs[0];
    const remainingColors = this.clrs.slice(1);

    // Draw base square
    ctx.fillRect(-this.w / 2, -this.w / 2, this.w, this.w);

    if (this.form === 0) {
      ctx.fillStyle = remainingColors[0] || this.clrs[1] || '#000000';
      this.drawLeaf(ctx, 0, 0, this.w, 1);
      ctx.fillStyle = remainingColors[1] || this.clrs[2] || '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, this.w * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.form === 1) {
      ctx.fillStyle = remainingColors[0] || this.clrs[0] || '#000000';
      ctx.fillRect(this.w * 0.125 - this.w / 2, this.w / 4 - this.w / 2, this.w * 0.75, this.w / 2);
      ctx.fillRect(this.w * 0.375 - this.w / 2, 0 - this.w / 2, this.w / 4, this.w);
      ctx.fillStyle = remainingColors[1] || this.clrs[1] || '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.form === 2) {
      ctx.fillStyle = remainingColors[0] || this.clrs[1] || '#000000';
      ctx.fillRect(-this.w * 0.25 - this.w * 0.15 / 2, this.w * 0.25 - this.w * 0.15 / 2, this.w * 0.15, this.w * 0.15);
      ctx.fillRect(-this.w * 0.25 - this.w * 0.15 / 2, 0 - this.w * 0.15 / 2, this.w * 0.15, this.w * 0.15);
      ctx.fillRect(-this.w * 0.25 - this.w * 0.15 / 2, -this.w * 0.25 - this.w * 0.15 / 2, this.w * 0.15, this.w * 0.15);
      ctx.fillStyle = remainingColors[1] || this.clrs[2] || '#000000';
      ctx.beginPath();
      const rx = this.w * 0.3 / 2;
      const ry = this.w * 0.7 / 2;
      ctx.ellipse(this.w * 0.2, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.form === 3) {
      ctx.fillStyle = remainingColors[0] || this.clrs[0] || '#000000';
      ctx.fillRect(-this.w * 0.05 - this.w * 0.7 / 2, -this.w * 0.05 - this.w * 0.7 / 2, this.w * 0.7, this.w * 0.7);
      ctx.save();
      ctx.translate(this.w * 0.05, this.w * 0.05);
      ctx.scale(0.7, 0.7);
      ctx.fillStyle = remainingColors[1] || this.clrs[1] || '#000000';
      const n = 8;
      const cellSize = this.w / n;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const x = (i * cellSize) - (this.w / 2) + (cellSize / 2);
          const y = (j * cellSize) - (this.w / 2) + (cellSize / 2);
          ctx.beginPath();
          ctx.arc(x, y, cellSize * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    } else if (this.form === 4) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.fillStyle = i % 2 === 0 
          ? (remainingColors[0] || this.clrs[1] || '#000000')
          : (remainingColors[1] || this.clrs[2] || '#000000');
        ctx.beginPath();
        ctx.arc(this.w * 0.3 * Math.cos(a), this.w * 0.3 * Math.sin(a), this.w * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = remainingColors[2] || this.clrs[3] || this.clrs[0] || '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, this.w * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.form === 5) {
      ctx.fillStyle = remainingColors[0] || this.clrs[1] || '#000000';
      // Rounded rectangle - manual drawing
      const cornerRadius = this.w * 0.5;
      const x = -this.w * 0.75 / 2;
      const y = -this.w * 0.75 / 2;
      const w = this.w * 0.75;
      const h = this.w * 0.75;
      ctx.beginPath();
      ctx.moveTo(x + cornerRadius, y);
      ctx.lineTo(x + w - cornerRadius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + cornerRadius);
      ctx.lineTo(x + w, y + h - cornerRadius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - cornerRadius, y + h);
      ctx.lineTo(x + cornerRadius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - cornerRadius);
      ctx.lineTo(x, y + cornerRadius);
      ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = remainingColors[1] || this.clrs[2] || '#000000';
      ctx.beginPath();
      ctx.arc(this.w * 0.1, this.w * 0.1, this.w * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.form === 6) {
      // 6-petal flower
      ctx.fillStyle = remainingColors[0] || this.clrs[1] || '#000000';
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((Math.PI / 3) * i);
        ctx.beginPath();
        ctx.ellipse(0, -this.w * 0.15, this.w * 0.12, this.w * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = remainingColors[1] || this.clrs[2] || '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, this.w * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.clrs[0];
      ctx.beginPath();
      ctx.arc(0, 0, this.w * 0.05, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.form === 7) {
      // Sun pattern
      ctx.fillStyle = remainingColors[1] || this.clrs[2] || '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, this.w, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = remainingColors[0] || this.clrs[1] || '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, this.w * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.clrs[0];
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((Math.PI / 4) * i);
        ctx.beginPath();
        ctx.moveTo(0, -this.w * 0.5);
        ctx.lineTo(this.w * 0.1, -this.w * 0.35);
        ctx.lineTo(-this.w * 0.1, -this.w * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = remainingColors[2] || this.clrs[3] || this.clrs[0] || '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, this.w * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.form === 8) {
      // Noggles
      ctx.save();
      ctx.rotate(Math.PI / 2);
      const s = this.w * 0.5;
      
      // Red frames
      ctx.fillStyle = this.clrs[0];
      ctx.fillRect(-s * 0.3 - s * 0.6 / 2, 0 - s * 0.6 / 2, s * 0.6, s * 0.6);
      ctx.fillRect(s * 0.45 - s * 0.6 / 2, 0 - s * 0.6 / 2, s * 0.6, s * 0.6);
      
      // Bridge
      ctx.fillRect(-s * 0.8 - 4, s * 0.07 - 4, 8, 8);
      ctx.fillRect(-s * 0.7 - s * 0.3 / 2, 0 - s * 0.1 / 2, s * 0.3, s * 0.1);
      ctx.fillRect(0.7 - s * 0.5 / 2, 0 - s * 0.1 / 2, s * 0.5, s * 0.1);
      
      // Lenses
      ctx.fillStyle = '#111111';
      ctx.fillRect(-s * 0.25 - s * 0.3 / 2, 0.05 - s * 0.3 / 2, s * 0.3, s * 0.3);
      ctx.fillRect(s * 0.5 - s * 0.3 / 2, 0.05 - s * 0.3 / 2, s * 0.3, s * 0.3);
      
      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-s * 0.35 - s * 0.2 / 2, 0 - s * 0.3 / 2, s * 0.2, s * 0.3);
      ctx.fillRect(s * 0.4 - s * 0.2 / 2, 0 - s * 0.3 / 2, s * 0.2, s * 0.3);
      ctx.restore();
    }

    ctx.restore();
  }
}

export function generateArt(canvas: HTMLCanvasElement, config: ArtConfig): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 600;
  const height = 600;
  canvas.width = width;
  canvas.height = height;

  const colors = ['#0000FF', '#FF0000', '#ff6392', '#FCBA3A', '#000000', '#f0f0f0'];
  
  // Use tokenId as seed for deterministic generation
  const seed = parseInt(config.tokenId) || 0;
  const rng = new SeededRandom(seed);

  const gridArea = width * 0.75;
  const cellCount = 3; // 3x3 grid
  const cellSize = gridArea / cellCount;
  const w = cellSize;

  // Use form 0-7 (8 forms) within gridArea
  const formCount = 8; // form 0 to 7
  const numbers: number[] = [];
  for (let i = 0; i < formCount; i++) {
    numbers.push(i);
  }
  const shuffledNumbers = rng.shuffle(numbers);

  const shapes: Shape[] = [];
  let count = 0;
  for (let j = 0; j < cellCount; j++) {
    for (let i = 0; i < cellCount; i++) {
      // Only create shapes for form 0-7 (8 shapes)
      if (count < formCount) {
        const x = i * cellSize + (cellSize / 2) + (width - gridArea) / 2;
        const y = j * cellSize + (cellSize / 2) + (height - gridArea) / 2;
        shapes.push(new Shape(x, y, w, shuffledNumbers[count], colors, rng));
        count++;
      }
    }
  }

  // Draw background
  ctx.fillStyle = '#E3E3E3';
  ctx.fillRect(0, 0, width, height);

  // Draw shapes
  for (const shape of shapes) {
    shape.show(ctx);
  }
}

