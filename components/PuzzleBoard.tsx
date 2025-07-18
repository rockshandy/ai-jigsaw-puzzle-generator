
import React, { useState, useEffect, useMemo } from 'react';
import { PuzzlePieceType } from '../types';
import PuzzlePiece from './PuzzlePiece';
import Spinner from './Spinner';

interface PuzzleBoardProps {
  imageBase64: string;
  pieceCount: number;
  prompt: string;
  onReset: () => void;
}

// --- Jigsaw Generation Logic ---

const KNOB_RATIO = 0.2;

enum JigsawSide { KNOB, SOCKET }

interface PieceShape {
  top: JigsawSide | 'FLAT';
  right: JigsawSide | 'FLAT';
  bottom: JigsawSide | 'FLAT';
  left: JigsawSide | 'FLAT';
}

/**
 * Draws the path for a single side of a jigsaw piece using a robust
 * vector-based method to ensure knobs and sockets are drawn correctly
 * regardless of the side's orientation.
 * @param ctx The canvas rendering context.
 * @param startX Starting x-coordinate of the side.
 * @param startY Starting y-coordinate of the side.
 * @param endX Ending x-coordinate of the side.
 * @param endY Ending y-coordinate of the side.
 * @param shape The shape of the side (KNOB, SOCKET, or FLAT).
 */
function drawSide(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, shape: JigsawSide | 'FLAT') {
  if (shape === 'FLAT') {
    ctx.lineTo(endX, endY);
    return;
  }

  const dx = endX - startX;
  const dy = endY - startY;

  // The perpendicular normal vector to the side, pointing "out" of the shape.
  const normX = dy;
  const normY = -dx;
  const normLen = Math.sqrt(normX * normX + normY * normY);
  const unitNormX = normX / normLen;
  const unitNormY = normY / normLen;

  // The distance the knob extends outwards from the edge.
  const knobSize = normLen * KNOB_RATIO;
  const curveOffset = knobSize * (shape === JigsawSide.KNOB ? 1 : -1);

  // Define the start and end points of the knob's base on the piece's edge.
  const knobBaseRatio = 0.6; // The knob's base will be 60% of the side's length.
  const p1Ratio = (1 - knobBaseRatio) / 2;
  const p2Ratio = 1 - p1Ratio;

  const p1x = startX + dx * p1Ratio;
  const p1y = startY + dy * p1Ratio;
  const p2x = startX + dx * p2Ratio;
  const p2y = startY + dy * p2Ratio;

  // Control points for the bezier curve to make a nice arc.
  // These are positioned along the perpendicular vector.
  const cp1x = p1x + unitNormX * curveOffset;
  const cp1y = p1y + unitNormY * curveOffset;
  const cp2x = p2x + unitNormX * curveOffset;
  const cp2y = p2y + unitNormY * curveOffset;

  ctx.lineTo(p1x, p1y);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2x, p2y);
  ctx.lineTo(endX, endY);
}


/**
 * Creates a single jigsaw piece by drawing its path, clipping, adding the image, and adding a stroke.
 * This function uses precise integer coordinates to prevent image bleed from adjacent pieces.
 * @returns A base64 encoded PNG of the final piece.
 */
function createPieceCanvas(
  sourceImage: HTMLImageElement,
  sourceX: number, sourceY: number, // Top-left corner of the piece in the source image
  pieceWidth: number, pieceHeight: number, // Exact dimensions of this piece
  shape: PieceShape
): string {
  const canvas = document.createElement('canvas');
  // The canvas needs extra space to draw the knobs that go outside the piece's boundaries.
  const canvasPaddingX = pieceWidth * KNOB_RATIO;
  const canvasPaddingY = pieceHeight * KNOB_RATIO;
  canvas.width = pieceWidth + 2 * canvasPaddingX;
  canvas.height = pieceHeight + 2 * canvasPaddingY;
  
  const ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error("Could not get canvas context.");

  // Move the drawing origin to allow for padding
  ctx.translate(canvasPaddingX, canvasPaddingY);

  // Draw the jigsaw path. This path will be used twice: once for clipping and once for stroking.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  drawSide(ctx, 0, 0, pieceWidth, 0, shape.top);
  drawSide(ctx, pieceWidth, 0, pieceWidth, pieceHeight, shape.right);
  drawSide(ctx, pieceWidth, pieceHeight, 0, pieceHeight, shape.bottom);
  drawSide(ctx, 0, pieceHeight, 0, 0, shape.left);
  ctx.closePath();
  
  // Use the path to clip the drawing area, then draw the image.
  ctx.save();
  ctx.clip();

  // We must draw a larger portion of the source image to fill the knobs/sockets.
  // The destination rectangle starts at the top-left of the padded area
  // and covers the entire canvas. The clipping path will then cut out the
  // exact piece shape from this larger image draw.
  ctx.drawImage(
    sourceImage,
    sourceX - canvasPaddingX, // sx
    sourceY - canvasPaddingY, // sy
    canvas.width,             // sWidth
    canvas.height,            // sHeight
    -canvasPaddingX,          // dx
    -canvasPaddingY,          // dy
    canvas.width,             // dWidth
    canvas.height             // dHeight
  );
  ctx.restore();

  // After the image is drawn, stroke the original path to create a clean outline.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  return canvas.toDataURL('image/png');
}

/**
 * Generates a full set of jigsaw pieces from a source image.
 * It calculates precise integer dimensions for each piece to prevent rounding errors and image bleed.
 */
const createJigsawPieces = (imageBase64: string, pieceCount: number): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const gridSize = Math.sqrt(pieceCount);
      if (!Number.isInteger(gridSize)) {
        return reject(new Error("Piece count must be a perfect square."));
      }
      
      // Create a puzzle topology: a random layout of knobs and sockets for all internal edges.
      const horizontalJoints = Array.from({ length: gridSize }, () =>
        Array.from({ length: gridSize - 1 }, () => Math.random() > 0.5 ? JigsawSide.KNOB : JigsawSide.SOCKET)
      );
      const verticalJoints = Array.from({ length: gridSize - 1 }, () =>
        Array.from({ length: gridSize }, () => Math.random() > 0.5 ? JigsawSide.KNOB : JigsawSide.SOCKET)
      );
        
      // Calculate precise integer dimensions to avoid artifacts
      const basePieceW = Math.floor(img.width / gridSize);
      const basePieceH = Math.floor(img.height / gridSize);
      const remainderW = img.width % gridSize;
      const remainderH = img.height % gridSize;

      const pieces: string[] = [];
      let currentSourceY = 0;
      for (let y = 0; y < gridSize; y++) {
        const pieceH = basePieceH + (y < remainderH ? 1 : 0);
        let currentSourceX = 0;
        for (let x = 0; x < gridSize; x++) {
          const pieceW = basePieceW + (x < remainderW ? 1 : 0);
          
          // Determine the shape of each of the 4 sides for the current piece.
          // An edge that is a KNOB on one piece must be a SOCKET on its neighbor.
          const shape: PieceShape = {
            top: y === 0 ? 'FLAT' : (verticalJoints[y - 1][x] === JigsawSide.KNOB ? JigsawSide.SOCKET : JigsawSide.KNOB),
            right: x === gridSize - 1 ? 'FLAT' : horizontalJoints[y][x],
            bottom: y === gridSize - 1 ? 'FLAT' : verticalJoints[y][x],
            left: x === 0 ? 'FLAT' : (horizontalJoints[y][x - 1] === JigsawSide.KNOB ? JigsawSide.SOCKET : JigsawSide.KNOB),
          };

          try {
            const pieceImage = createPieceCanvas(img, currentSourceX, currentSourceY, pieceW, pieceH, shape);
            pieces.push(pieceImage);
          } catch(err) {
            return reject(err);
          }
          currentSourceX += pieceW;
        }
        currentSourceY += pieceH;
      }
      resolve(pieces);
    };
    img.onerror = (err) => reject(new Error("Failed to load image for puzzle generation."));
    img.src = `data:image/png;base64,${imageBase64}`;
  });
};

const pieceOptions = [
    { value: 4, label: '2x2 (4 Pieces)' },
    { value: 9, label: '3x3 (9 Pieces)' },
    { value: 16, label: '4x4 (16 Pieces)' },
    { value: 25, label: '5x5 (25 Pieces)' },
    { value: 36, label: '6x6 (36 Pieces)' },
    { value: 49, label: '7x7 (49 Pieces)' },
    { value: 64, label: '8x8 (64 Pieces)' },
    { value: 81, label: '9x9 (81 Pieces)' },
];

const PuzzleBoard: React.FC<PuzzleBoardProps> = ({ imageBase64, pieceCount, prompt, onReset }) => {
  const [currentPieceCount, setCurrentPieceCount] = useState(pieceCount);
  const [pieces, setPieces] = useState<PuzzlePieceType[]>([]);
  const [isSlicing, setIsSlicing] = useState(true);

  const gridSize = useMemo(() => Math.sqrt(currentPieceCount), [currentPieceCount]);

  useEffect(() => {
    setIsSlicing(true);
    createJigsawPieces(imageBase64, currentPieceCount)
      .then(slicedImages => {
        const initialPieces = slicedImages.map((imageUrl, index) => ({
          id: index,
          originalIndex: index,
          imageUrl,
        }));
        setPieces(initialPieces);
      })
      .catch(console.error)
      .finally(() => {
        setIsSlicing(false);
      });
  }, [imageBase64, currentPieceCount]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Cannot open print window. Please check your pop-up blocker settings.');
        return;
    }
    
    // By wrapping each piece in a div, we can more reliably prevent page breaks.
    const piecesHTML = pieces.map(p => 
        `<div class="puzzle-piece-wrapper"><img src="${p.imageUrl}" class="puzzle-piece" alt="Puzzle Piece"/></div>`
    ).join('');

    printWindow.document.write(`
        <html>
            <head>
                <title>Print Puzzle: ${prompt}</title>
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 1cm;
                    }
                    body {
                        font-family: sans-serif;
                        color: black;
                    }
                    h1 {
                        font-size: 14pt;
                        font-weight: bold;
                        margin-bottom: 0.25cm;
                    }
                    p {
                        font-size: 10pt;
                        color: #666;
                        margin-top: 0;
                        margin-bottom: 1cm;
                    }
                    .pieces-container {
                        /* This container just holds the flowing blocks. No flexbox needed. */
                    }
                    .puzzle-piece-wrapper {
                        display: inline-block; /* Let pieces flow like words in a paragraph */
                        vertical-align: top;
                        /* These properties tell the browser not to split this element across a page. */
                        break-inside: avoid;
                        page-break-inside: avoid; /* Legacy property for wider browser support */
                    }
                    .puzzle-piece {
                        display: block; /* Fixes potential whitespace issues inside the wrapper */
                        /* A drop-shadow makes the cut lines even clearer on paper. */
                        filter: drop-shadow(0 0 1px rgba(0,0,0,0.3));
                    }
                </style>
            </head>
            <body>
                <h1>${prompt}</h1>
                <p>${currentPieceCount}-piece puzzle. Instructions: Print and cut along the lines.</p>
                <div class="pieces-container">
                    ${piecesHTML}
                </div>
            </body>
        </html>
    `);

    printWindow.document.close();
    
    // A short delay helps ensure all images and styles are loaded before printing.
    const timer = setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        clearTimeout(timer);
    }, 500);
  };

  if (isSlicing && pieces.length === 0) { // Only show full spinner on initial load
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Spinner className="h-12 w-12 text-indigo-400" />
        <p className="mt-4 text-lg">Cutting your puzzle pieces...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col items-center">
        <div className="w-full mb-8">
            <h2 className="text-center text-3xl font-bold mb-2 text-indigo-300">"{prompt}"</h2>
            <p className="text-center text-gray-400 mb-6">{currentPieceCount} piece puzzle</p>
      
            {/* Solved Puzzle Board */}
            <div className="relative">
                {isSlicing && (
                    <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
                        <Spinner className="h-10 w-10 text-indigo-400" />
                    </div>
                )}
                <div 
                    className="grid gap-0 bg-gray-900/50 rounded-lg shadow-lg overflow-hidden border-4 border-gray-700 puzzle-container aspect-square"
                    style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
                >
                    {pieces.map((piece) => (
                        <PuzzlePiece
                            key={piece.id}
                            piece={piece}
                        />
                    ))}
                </div>
            </div>
        </div>
        
        {/* Controls and Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl border border-gray-700">
             <div className="flex items-center gap-2">
                <label htmlFor="pieceCount-select" className="text-sm font-medium text-indigo-300 whitespace-nowrap">
                    Puzzle Size:
                </label>
                <select
                    id="pieceCount-select"
                    value={currentPieceCount}
                    onChange={(e) => setCurrentPieceCount(Number(e.target.value))}
                    disabled={isSlicing}
                    className="bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 text-gray-200 disabled:opacity-50"
                >
                    {pieceOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={handlePrint}
                    disabled={isSlicing}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-5 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:bg-teal-900/50 disabled:cursor-not-allowed"
                >
                    Print
                </button>
                 <button
                    onClick={onReset}
                    disabled={isSlicing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:bg-indigo-900/50 disabled:cursor-not-allowed"
                >
                    Start Over
                </button>
            </div>
        </div>
    </div>
  );
};

export default PuzzleBoard;
