// Generate HTML Canvas with p5.js from art generator

import { ArtConfig } from "./p5-art-generator";

/**
 * Generate HTML string with p5.js canvas that uses tokenId/FID as seed
 * This creates an interactive HTML canvas that can be embedded in NFT metadata
 * 
 * @param config ArtConfig with tokenId
 * @returns HTML string with base64 encoded p5.js sketch
 */
export function generateHTMLCanvas(config: ArtConfig): string {
  const tokenId = config.tokenId || "0";
  const seed = parseInt(tokenId) || 0;

  // Generate HTML with p5.js that creates the same art as p5-art-generator
  // This HTML will be embedded in NFT metadata as data:text/html;base64,...
  const html = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js"></script>
</head>
<body>
  <script>
    const seed = ${seed};
    let seedCounter;
    
    function seededRandom() {
      // Ensure seedCounter is initialized (should be set in setup() first)
      if (seedCounter === undefined) {
        seedCounter = seed;
      }
      seedCounter = (seedCounter * 9301 + 49297) % 233280;
      return seedCounter / 233280;
    }
    
    function seededRandomInt(max) {
      return Math.floor(seededRandom() * max);
    }
    
    function shuffle(array) {
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }
    
    let setupCalled = false;
    function setup() {
      // Prevent setup() from being called multiple times
      if (setupCalled) {
        return;
      }
      setupCalled = true;
      
      // Reset seed counter to ensure deterministic generation on every refresh
      // This MUST be the first line in setup() to ensure consistent art generation
      seedCounter = seed;
      
      createCanvas(600, 600);
      background(227, 227, 227); // #E3E3E3
      
      // Disable stroke (black borders) for all shapes
      noStroke();
      
      // Disable draw loop to prevent regeneration
      noLoop();
      
      const colors = ['#0000FF', '#FF0000', '#ff6392', '#FCBA3A', '#000000', '#f0f0f0'];
      const cellCount = 3;
      const gridArea = Math.min(600, 600) * 0.55;
      const cellSize = gridArea / cellCount;
      
      // Generate numbers array and shuffle (0-8 for 9 forms)
      const numbers = [];
      for (let i = 0; i < cellCount * cellCount; i++) {
        numbers.push(i);
      }
      const shuffledNumbers = shuffle(numbers);
      
      // Draw shapes in 3x3 grid
      let count = 0;
      for (let j = 0; j < cellCount; j++) {
        for (let i = 0; i < cellCount; i++) {
          const x = i * cellSize + (cellSize / 2) + (600 - gridArea) / 2;
          const y = j * cellSize + (cellSize / 2) + (600 - gridArea) / 2;
          const form = shuffledNumbers[count];
          
          drawShape(x, y, cellSize, form, colors);
          count++;
        }
      }
    }
    
    function drawShape(x, y, w, form, colors) {
      push();
      translate(x, y);
      
      // Random rotation and flip (deterministic based on seed)
      const scaleX = seededRandom() < 0.5 ? -1 : 1;
      const angle = seededRandomInt(4) * (Math.PI * 2 / 4);
      scale(scaleX, 1);
      rotate(angle);
      
      const shuffledColors = shuffle([...colors]);
      fill(shuffledColors[0]);
      
      // Draw base square
      rect(-w / 2, -w / 2, w, w);
      
      // Draw form based on form number (0-8)
      if (form === 0) {
        // Leaf + Circle
        fill(shuffledColors[1] || shuffledColors[0]);
        drawLeaf(0, 0, w, 1);
        fill(shuffledColors[2] || shuffledColors[0]);
        circle(0, 0, w * 0.5);
      } else if (form === 1) {
        // Creative explosion
        fill(shuffledColors[0]);
        circle(0, 0, w * 0.4 * 0.8);
        for (let i = 0; i < 5; i++) {
          push();
          rotate((Math.PI * 2 / 5) * i);
          fill(shuffledColors[(i + 1) % shuffledColors.length] || shuffledColors[0]);
          beginShape();
          for (let a = 0; a < Math.PI / 3; a += 0.05) {
            const r = w * 0.4 * 0.8 * 0.4;
            vertex(Math.cos(a) * r, Math.sin(a) * r);
          }
          for (let a = Math.PI / 3; a > 0; a -= 0.05) {
            const r = w * 0.4 * 0.8 * 0.4 * 0.3;
            vertex(Math.cos(a) * r, Math.sin(a) * r);
          }
          endShape(CLOSE);
          pop();
        }
      } else if (form === 2) {
        // Squares + Rounded Rect
        fill(shuffledColors[1] || shuffledColors[0]);
        rect(-w * 0.25 - w * 0.15 / 2, w * 0.25 - w * 0.15 / 2, w * 0.15, w * 0.15);
        rect(-w * 0.25 - w * 0.15 / 2, 0 - w * 0.15 / 2, w * 0.15, w * 0.15);
        rect(-w * 0.25 - w * 0.15 / 2, -w * 0.25 - w * 0.15 / 2, w * 0.15, w * 0.15);
        fill(shuffledColors[2] || shuffledColors[0]);
        ellipse(w * 0.2, 0, w * 0.3, w * 0.7);
      } else if (form === 3) {
        // Grid of Circles
        fill(shuffledColors[0]);
        rect(-w * 0.05 - w * 0.7 / 2, -w * 0.05 - w * 0.7 / 2, w * 0.7, w * 0.7);
        push();
        translate(w * 0.05, w * 0.05);
        scale(0.7);
        fill(shuffledColors[1] || shuffledColors[0]);
        const n = 8;
        const cellSize = w / n;
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const x = (i * cellSize) - (w / 2) + (cellSize / 2);
            const y = (j * cellSize) - (w / 2) + (cellSize / 2);
            circle(x, y, cellSize * 0.5);
          }
        }
        pop();
      } else if (form === 4) {
        // 6 Circles around Center
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          fill(i % 2 === 0 ? (shuffledColors[1] || shuffledColors[0]) : (shuffledColors[2] || shuffledColors[0]));
          circle(w * 0.3 * Math.cos(a), w * 0.3 * Math.sin(a), w * 0.2);
        }
        fill(shuffledColors[3] || shuffledColors[0]);
        circle(0, 0, w * 0.2);
      } else if (form === 5) {
        // Rounded Square + Circle
        fill(shuffledColors[1] || shuffledColors[0]);
        rectMode(CENTER);
        rect(0, 0, w * 0.75, w * 0.75, w * 0.5);
        fill(shuffledColors[2] || shuffledColors[0]);
        circle(w * 0.1, w * 0.1, w * 0.3);
      } else if (form === 6) {
        // 6-Petal Flower
        fill(shuffledColors[1] || shuffledColors[0]);
        for (let i = 0; i < 6; i++) {
          push();
          rotate((Math.PI / 3) * i);
          ellipse(0, -w * 0.15, w * 0.12, w * 0.25);
          pop();
        }
        fill(shuffledColors[2] || shuffledColors[0]);
        circle(0, 0, w * 0.15);
        fill(shuffledColors[0]);
        circle(0, 0, w * 0.05);
      } else if (form === 7) {
        // Sun Pattern
        stroke('#00ff99');
        strokeWeight(3);
        noFill();
        ellipse(0, 0, w * 0.8, w * 0.8 * 0.6);
        stroke('#ff4b4b');
        ellipse(0, 0, w * 0.8 * 0.6, w * 0.8);
        noStroke();
        fill(shuffledColors[1] || shuffledColors[0]);
        circle(0, 0, w * 0.8 * 0.3);
        fill('#ffffff');
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 / 6) * i;
          circle(Math.cos(angle) * w * 0.8 * 0.35, Math.sin(angle) * w * 0.8 * 0.35, w * 0.8 * 0.08);
        }
      } else if (form === 8) {
        // Noggles (Red Frame Glasses)
        scale(-1, 1);
        const s = w * 0.5;
        fill(shuffledColors[1] || shuffledColors[0]);
        rect(-s * 0.3 - s * 0.6 / 2, 0 - s * 0.6 / 2, s * 0.6, s * 0.6);
        rect(s * 0.45 - s * 0.6 / 2, 0 - s * 0.6 / 2, s * 0.6, s * 0.6);
        rect(-s * 0.8 - 4, s * 0.07 - 4, 8, 8);
        rect(-s * 0.7 - s * 0.3 / 2, 0 - s * 0.1 / 2, s * 0.3, s * 0.1);
        rect(0.7 - s * 0.5 / 2, 0 - s * 0.1 / 2, s * 0.5, s * 0.1);
        fill('#111111');
        rect(-s * 0.25 - s * 0.3 / 2, 0.05 - s * 0.3 / 2, s * 0.3, s * 0.3);
        rect(s * 0.5 - s * 0.3 / 2, 0.05 - s * 0.3 / 2, s * 0.3, s * 0.3);
        fill('#ffffff');
        rect(-s * 0.35 - s * 0.2 / 2, 0 - s * 0.3 / 2, s * 0.2, s * 0.3);
        rect(s * 0.4 - s * 0.2 / 2, 0 - s * 0.3 / 2, s * 0.2, s * 0.3);
      }
      
      pop();
    }
    
    function drawLeaf(x, y, w, t) {
      push();
      translate(x, y);
      scale(t, 1);
      beginShape();
      for (let a = 0; a < Math.PI / 2; a += (Math.PI * 2) / 360) {
        const px = -(w / 2) + w * Math.cos(a);
        const py = -(w / 2) + w * Math.sin(a);
        if (a === 0) {
          vertex(px, py);
        } else {
          vertex(px, py);
        }
      }
      for (let a = Math.PI; a < Math.PI + Math.PI / 2; a += (Math.PI * 2) / 360) {
        const px = (w / 2) + w * Math.cos(a);
        const py = (w / 2) + w * Math.sin(a);
        vertex(px, py);
      }
      endShape(CLOSE);
      pop();
    }
  </script>
</body>
</html>`.trim();

  return html;
}

/**
 * Generate base64 encoded HTML string
 * @param config ArtConfig with tokenId
 * @returns Base64 encoded HTML string
 */
export function generateHTMLCanvasBase64(config: ArtConfig): string {
  const html = generateHTMLCanvas(config);
  // Convert HTML to base64
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(html).toString('base64');
  } else {
    // Browser environment
    return btoa(unescape(encodeURIComponent(html)));
  }
}

