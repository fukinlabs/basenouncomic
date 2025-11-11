// P5.js Art Generator - Converted to Canvas API for server-side rendering

export interface ArtConfig {
  tokenId: string;
  seed?: number;
  maxSupply?: number; // Optional: Maximum supply limit for validation
  currentSupply?: number; // Optional: Current supply for validation
}

export interface SupplyInfo {
  current: number;
  max: number;
  remaining: number;
  canMint: boolean;
}

// Seeded random number generator
// Ensures deterministic but unique art for each tokenId
class SeededRandom {
  private seed: number;
  private callCount: number; // Track number of calls for additional entropy

  constructor(seed: number) {
    this.seed = seed;
    this.callCount = 0;
  }

  random(): number {
    this.callCount++;
    // Use callCount as additional entropy to ensure uniqueness
    this.seed = (this.seed * 9301 + 49297 + this.callCount) % 233280;
    return this.seed / 233280;
  }

  randomInt(max: number): number {
    return Math.floor(this.random() * max);
  }

  randomChoice<T>(array: T[]): T {
    return array[this.randomInt(array.length)];
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
    
    // If form is 8 (Noggles) → no rotation, no flip
    if (f === 8) {
      this.scaleX = -1;   // No flip
      this.angle = 0;    // No rotation
    } else {
      this.scaleX = rng.random() < 0.5 ? -1 : 1;  // Random left or right
      this.angle = rng.randomInt(4) * (Math.PI * 2 / 4);  // Random rotation 0°, 90°, 180°, 270°
    }
    
    // Shuffle colors randomly
    this.clrs = rng.shuffle(this.clrs);
    this.form = f;
  }

  drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(t, 1);
    // Limit leaf size to fit within base square (w x w)
    // Base square is from -w/2 to w/2, so leaf should not exceed this
    const maxRadius = w * 1; // Use 0.45 to ensure it stays within bounds
    ctx.beginPath();
    for (let a = 0; a < Math.PI / 2; a += (Math.PI * 2) / 360) {
      const px = -(w / 2) + maxRadius * Math.cos(a);
      const py = -(w / 2) + maxRadius * Math.sin(a);
      if (a === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    for (let a = Math.PI; a < Math.PI + Math.PI / 2; a += (Math.PI * 2) / 360) {
      const px = (w / 2) + maxRadius * Math.cos(a);
      const py = (w / 2) + maxRadius * Math.sin(a);
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
      // Limit circle radius to stay within base square bounds (-w/2 to w/2)
      ctx.arc(0, 0, this.w * 0.15, 0, Math.PI * 2); // Reduced from 0.45 to 0.35
      ctx.fill();
    } else if (this.form === 1) {
      // New form 1: Creative explosion with layers
      ctx.save();
      ctx.lineWidth = 0;
      const s = this.w * 0.8;
      const layers = 5;
      
      // Center artist power
      ctx.fillStyle = this.clrs[0];
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); // Reduced from 0.4 to 0.3
      ctx.fill();
      
      // Creative explosion (static version, no animation)
      for (let i = 0; i < layers; i++) {
        ctx.save();
        const angle = (Math.PI * 2 / layers) * i;
        ctx.rotate(angle);
        const r = s * 0.4; // Static radius (removed sin animation)
        
        // Inspiration lines
        ctx.fillStyle = this.clrs[(i + 1) % this.clrs.length] || this.clrs[0];
        ctx.beginPath();
        for (let a = 0; a < Math.PI / 3; a += 0.05) {
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (a === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        for (let a = Math.PI / 3; a > 0; a -= 0.05) {
          const x = Math.cos(a) * (r * 0.3);
          const y = Math.sin(a) * (r * 0.3);
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      
      // Spark points (static version)
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 / 8) * i;
        const x = Math.cos(a) * s * 0.45;
        const y = Math.sin(a) * s * 0.45;
        ctx.beginPath();
        ctx.arc(x, y, s * 0.04, 0, Math.PI * 2); // Reduced from 0.05 to 0.04
        ctx.fill();
      }
      
      // Inner balance circle
      ctx.fillStyle = this.clrs[1] || this.clrs[0];
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2); // Reduced from 0.1 to 0.08
      ctx.fill();
      ctx.restore();
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
      const n = 8;
      const cellSize = this.w / n;
      ctx.fillStyle = remainingColors[0] || this.clrs[0] || '#000000';
      ctx.fillRect(-this.w * 0.05 - this.w * 0.7 / 2, -this.w * 0.05 - this.w * 0.7 / 2, this.w * 0.7, this.w * 0.7);
      ctx.save();
      ctx.translate(this.w * 0.05, this.w * 0.05);
      ctx.scale(0.3, 0.3);
      ctx.fillStyle = remainingColors[1] || this.clrs[1] || '#000000';
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const x = (i * cellSize) - (this.w / 4) + (cellSize / 4);
          const y = (j * cellSize) - (this.w / 4) + (cellSize / 4);
          ctx.beginPath();
          ctx.arc(x, y, cellSize * 0.2, 0, Math.PI * 2); // Reduced from 0.5 to 0.4
          ctx.fill();
        }
      }
      ctx.restore();
    } else if (this.form === 4) {
      // Limit circles to stay within base square bounds
      // Base square is from -w/2 to w/2, so max distance from center = w/2
      // Use 0.25 for radius and 0.15 for circle radius to ensure fit
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.fillStyle = i % 2 === 0 
          ? (remainingColors[0] || this.clrs[1] || '#000000')
          : (remainingColors[1] || this.clrs[2] || '#000000');
        ctx.beginPath();
        ctx.arc(this.w * 0.25 * Math.cos(a), this.w * 0.25 * Math.sin(a), this.w * 0.05, 0, Math.PI * 2); // Reduced from 0.15 to 0.12
        ctx.fill();
      }
      ctx.fillStyle = remainingColors[2] || this.clrs[3] || this.clrs[0] || '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, this.w * 0.05, 0, Math.PI * 2); // Reduced from 0.15 to 0.12
      ctx.fill();
    } else if (this.form === 5) {
      ctx.fillStyle = remainingColors[0] || this.clrs[1] || '#000000';
      // Rounded rectangle - manual drawing
      const cornerRadius = this.w * 0.5;
      const x = -this.w * 0.25 / 2;
      const y = -this.w * 0.25 / 2;
      const w = this.w * 0.25;
      const h = this.w * 0.25;
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
      ctx.arc(this.w * 0.1, this.w * 0.1, this.w * 0.15, 0, Math.PI * 2); // Reduced from 0.3 to 0.25
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
      // Center stamen
      ctx.fillStyle = remainingColors[1] || this.clrs[2] || '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, this.w * 0.12, 0, Math.PI * 2); // Reduced from 0.15 to 0.12
      ctx.fill();
      // Center point
      ctx.fillStyle = this.clrs[0];
      ctx.beginPath();
      ctx.arc(0, 0, this.w * 0.04, 0, Math.PI * 2); // Reduced from 0.05 to 0.04
      ctx.fill();
    } else if (this.form === 7) {
      // New form 7: Dynamic balance (static version)
      // Limit size to stay within base square bounds (-w/2 to w/2)
      ctx.save();
      ctx.lineWidth = 3;
      const s = this.w * 0.45; // Reduced from 0.8 to 0.45 to fit within bounds
      const rot = 0; // Static rotation (removed frameCount animation)
      ctx.rotate(rot);
      
      // Buy side power (green)
      ctx.strokeStyle = '#00ff99';
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      
      // Sell side power (red)
      ctx.strokeStyle = '#ff4b4b';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.6, s, 0, 0, Math.PI * 2);
      ctx.stroke();
      
      // Center balance circle
      ctx.lineWidth = 0;
      ctx.fillStyle = this.clrs[1] || this.clrs[0];
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2); // Reduced from 0.3 to 0.25
      ctx.fill();
      
      // Rotating power points (static version)
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        const x = Math.cos(angle) * s * 0.35;
        const y = Math.sin(angle) * s * 0.35;
        ctx.beginPath();
        ctx.arc(x, y, s * 0.06, 0, Math.PI * 2); // Reduced from 0.08 to 0.06
        ctx.fill();
      }
      ctx.restore();
    } else if (this.form === 8) {
      // Noggles – RED FRAME
      ctx.save();
      ctx.scale(-1, 1);
      const s = this.w * 0.5;
      
      ctx.lineWidth = 0;
      
      // Red frames
      ctx.fillStyle = this.clrs[1] || this.clrs[0];
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

  // Use canvas actual size or default to 600x600 for backward compatibility
  // Canvas size should be set by the component using it
  const width = canvas.width || 600;
  const height = canvas.height || 600;
  
  // Ensure canvas has proper dimensions
  if (!canvas.width || !canvas.height) {
    canvas.width = width;
    canvas.height = height;
  }

  const colors = ['#0000FF', '#FF0000', '#ff6392', '#FCBA3A', '#000000', '#f0f0f0'];
  
  // Use tokenId as seed for deterministic generation
  // Each unique tokenId will generate unique art
  // If custom seed is provided, use it; otherwise use tokenId
  const baseSeed = config.seed !== undefined ? config.seed : parseInt(config.tokenId) || 0;
  
  // Add additional entropy to ensure uniqueness
  // Hash tokenId string to get more unique seed
  let seed = baseSeed;
  if (config.tokenId) {
    // Simple hash function to add entropy
    let hash = 0;
    for (let i = 0; i < config.tokenId.length; i++) {
      const char = config.tokenId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Combine base seed with hash for more uniqueness
    seed = (baseSeed * 1000000 + Math.abs(hash)) % 2147483647; // Use large prime for better distribution
  }
  
  const rng = new SeededRandom(seed);

  const cellCount = 3;
  // Use percentage for grid area (75% of canvas size)
  const gridArea = Math.min(width, height) * 0.75;
  const cellSize = gridArea / cellCount;
  const w = cellSize;

  // Generate numbers array and shuffle (0-8 for 9 forms)
  const numbers: number[] = [];
  for (let i = 0; i < cellCount * cellCount; i++) {
    numbers.push(i);
  }
  const shuffledNumbers = rng.shuffle(numbers);

  const shapes: Shape[] = [];
  let count = 0;
  for (let j = 0; j < cellCount; j++) {
    for (let i = 0; i < cellCount; i++) {
      // Center the grid in the canvas
      const x = i * cellSize + (cellSize / 2) + (width - gridArea) / 2;
      const y = j * cellSize + (cellSize / 2) + (height - gridArea) / 2;
      shapes.push(new Shape(x, y, w, shuffledNumbers[count], colors, rng));
      count++;
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

/**
 * Render once (no animation) helper.
 * Ensures canvas size is set, then generates art a single time.
 * Equivalent to p5.js setup()+noLoop() single-frame render.
 */
export function generateArtNoLoop(
  canvas: HTMLCanvasElement,
  config: ArtConfig,
  size: number = 600
): void {
  if (!canvas.width || !canvas.height) {
    canvas.width = size;
    canvas.height = size;
  }
  generateArt(canvas, config);
}

/**
 * Generate WebP image from art configuration
 * @param config Art configuration with tokenId
 * @param size Image size (default: 600)
 * @returns Promise resolving to WebP data URL
 */
export async function generateWebP(config: ArtConfig, size: number = 600): Promise<string> {
  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  
  // Generate art on canvas
  generateArt(canvas, config);
  
  // Convert canvas to WebP
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate WebP blob'));
          return;
        }
        
        // Convert blob to data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      },
      'image/webp',
      0.92 // Quality: 0.92 (92%)
    );
  });
}

/**
 * Generate WebP as base64 string (for browser)
 * @param config Art configuration with tokenId
 * @param size Image size (default: 600)
 * @returns Promise resolving to base64 string (without data URL prefix)
 */
export async function generateWebPBase64(config: ArtConfig, size: number = 600): Promise<string> {
  // For browser environment
  const dataUrl = await generateWebP(config, size);
  
  // Remove data URL prefix: "data:image/webp;base64,"
  const base64 = dataUrl.replace(/^data:image\/webp;base64,/, '');
  return base64;
}

/**
 * Generate WebP for Node.js/server-side (using node-canvas)
 * @param config Art configuration with tokenId
 * @param size Image size (default: 600)
 * @returns Promise resolving to WebP buffer
 */
export async function generateWebPNode(config: ArtConfig, size: number = 600): Promise<Buffer> {
  // Check if we're in Node.js environment
  if (typeof window !== 'undefined') {
    throw new Error('generateWebPNode can only be used in Node.js environment');
  }

  // Dynamic import for node-canvas (only in Node.js)
  const { createCanvas } = await import('canvas');
  
  // Create canvas
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Create a mock HTMLCanvasElement-like object
  const mockCanvas = {
    width: size,
    height: size,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
  
  // Generate art on canvas
  generateArt(mockCanvas, config);
  
  // Convert to WebP buffer
  // Note: node-canvas may not support WebP in all environments
  // Fallback to PNG if WebP is not available
  try {
    // Type assertion needed because node-canvas types may not include WebP
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvasWithWebP = canvas as any;
    return canvasWithWebP.toBuffer('image/webp', { quality: 0.92 });
  } catch {
    // Fallback to PNG if WebP is not supported
    console.warn('WebP not supported, falling back to PNG');
    return canvas.toBuffer('image/png');
  }
}

/**
 * Generate WebP base64 for Node.js/server-side
 * @param config Art configuration with tokenId
 * @param size Image size (default: 600)
 * @returns Promise resolving to base64 string (without data URL prefix)
 */
export async function generateWebPBase64Node(config: ArtConfig, size: number = 600): Promise<string> {
  const buffer = await generateWebPNode(config, size);
  return buffer.toString('base64');
}

/**
 * Validate supply before generating art
 * @param config Art configuration with supply info
 * @returns SupplyInfo with validation result
 */
export function validateSupply(config: ArtConfig): SupplyInfo {
  const maxSupply = config.maxSupply ?? Infinity;
  const currentSupply = config.currentSupply ?? 0;
  const remaining = Math.max(0, maxSupply - currentSupply);
  const canMint = remaining > 0 && currentSupply < maxSupply;

  return {
    current: currentSupply,
    max: maxSupply,
    remaining,
    canMint,
  };
}

/**
 * Generate art with supply validation
 * Throws error if supply limit reached
 * @param canvas HTMLCanvasElement
 * @param config Art configuration with supply info
 * @throws Error if supply limit reached
 */
export function generateArtWithSupplyCheck(canvas: HTMLCanvasElement, config: ArtConfig): void {
  // Validate supply if maxSupply is provided
  if (config.maxSupply !== undefined) {
    const supplyInfo = validateSupply(config);
    if (!supplyInfo.canMint) {
      throw new Error(`Maximum supply reached: ${supplyInfo.current} / ${supplyInfo.max}`);
    }
  }

  // Generate art normally
  generateArt(canvas, config);
}

/**
 * Generate WebP with supply validation
 * @param config Art configuration with supply info
 * @param size Image size (default: 600)
 * @returns Promise resolving to WebP data URL
 * @throws Error if supply limit reached
 */
export async function generateWebPWithSupplyCheck(config: ArtConfig, size: number = 600): Promise<string> {
  // Validate supply if maxSupply is provided
  if (config.maxSupply !== undefined) {
    const supplyInfo = validateSupply(config);
    if (!supplyInfo.canMint) {
      throw new Error(`Maximum supply reached: ${supplyInfo.current} / ${supplyInfo.max}`);
    }
  }

  // Generate WebP normally
  return generateWebP(config, size);
}

/**
 * Generate WebP base64 with supply validation
 * @param config Art configuration with supply info
 * @param size Image size (default: 600)
 * @returns Promise resolving to base64 string (without data URL prefix)
 * @throws Error if supply limit reached
 */
export async function generateWebPBase64WithSupplyCheck(config: ArtConfig, size: number = 600): Promise<string> {
  // Validate supply if maxSupply is provided
  if (config.maxSupply !== undefined) {
    const supplyInfo = validateSupply(config);
    if (!supplyInfo.canMint) {
      throw new Error(`Maximum supply reached: ${supplyInfo.current} / ${supplyInfo.max}`);
    }
  }

  // Generate WebP base64 normally
  return generateWebPBase64(config, size);
}
