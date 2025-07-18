
export interface PuzzlePieceType {
  id: number; // Unique ID for this piece instance (0 to N-1)
  originalIndex: number; // The correct final position in the grid
  imageUrl: string; // base64 data URL for the piece's image
}
