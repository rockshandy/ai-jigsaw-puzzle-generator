
import React, { useState } from 'react';
import PuzzleGeneratorForm from './components/PuzzleGeneratorForm';
import PuzzleBoard from './components/PuzzleBoard';
import { generateImage } from './services/geminiService';

type GameState = 'setup' | 'generating' | 'playing' | 'error';

interface PuzzleData {
  imageBase64: string;
  pieceCount: number;
  prompt: string;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [error, setError] = useState<string | null>(null);
  const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);

  const handleGenerate = async (prompt: string, pieceCount: number) => {
    setGameState('generating');
    setError(null);
    setPuzzleData(null);
    try {
      const base64Image = await generateImage(prompt);
      setPuzzleData({ imageBase64: base64Image, pieceCount, prompt });
      setGameState('playing');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error(errorMessage);
      setError(errorMessage);
      setGameState('error');
    }
  };

  const handleReset = () => {
    setGameState('setup');
    setPuzzleData(null);
    setError(null);
  };
  
  const renderContent = () => {
    switch (gameState) {
      case 'generating':
      case 'setup':
        return (
          <PuzzleGeneratorForm 
            isGenerating={gameState === 'generating'} 
            onSubmit={handleGenerate} 
          />
        );
      case 'playing':
        if (puzzleData) {
          return (
            <PuzzleBoard 
              imageBase64={puzzleData.imageBase64} 
              pieceCount={puzzleData.pieceCount} 
              prompt={puzzleData.prompt}
              onReset={handleReset}
            />
          );
        }
        // Fallback if data is missing, should not happen in normal flow
        handleReset();
        return null;
      case 'error':
        return (
          <div className="w-full max-w-2xl mx-auto bg-red-900/50 border border-red-700 p-8 rounded-2xl text-center">
            <h2 className="text-2xl font-bold text-red-300 mb-4">An Error Occurred</h2>
            <p className="text-red-200 mb-6">{error}</p>
            <button
              onClick={handleReset}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
            >
              Try Again
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
        <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                AI Jigsaw Puzzle Generator
            </h1>
            <p className="text-lg text-gray-400 mt-2">Turn your ideas into interactive puzzles.</p>
        </div>
        <main className="w-full flex justify-center">
          {renderContent()}
        </main>
    </div>
  );
};

export default App;
