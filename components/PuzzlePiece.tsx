import React from 'react';
import { PuzzlePieceType } from '../types';

// This ratio defines how deep the knobs are as a percentage of the piece's dimension.
// It's crucial that this value matches the one used in PuzzleBoard.tsx for drawing the pieces.
const KNOB_RATIO = 0.2;

const PuzzlePiece: React.FC<{ piece: PuzzlePieceType }> = ({ piece }) => {
  // The container establishes a relative coordinate system that fills its grid cell.
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'visible',
  };

  // The image is made larger than the container to include the area for the knobs.
  // It's then shifted using negative top/left values to align the "core" of the
  // piece with the container, making the knobs appear to overflow.
  const imageStyle: React.CSSProperties = {
    position: 'absolute',
    width: `${(1 + 2 * KNOB_RATIO) * 100}%`,
    height: `${(1 + 2 * KNOB_RATIO) * 100}%`,
    left: `-${KNOB_RATIO * 100}%`,
    top: `-${KNOB_RATIO * 100}%`,
    maxWidth: 'none', // Prevents global image styles from constraining the size.
  };

  return (
    <div style={containerStyle}>
      <img
        src={piece.imageUrl}
        alt={`Puzzle piece ${piece.id}`}
        style={imageStyle}
        className="block" // `block` prevents small gaps under the image.
      />
    </div>
  );
};

export default PuzzlePiece;
