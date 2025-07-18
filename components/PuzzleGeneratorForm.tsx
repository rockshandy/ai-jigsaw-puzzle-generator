
import React, { useState } from 'react';
import Spinner from './Spinner';

interface PuzzleGeneratorFormProps {
  isGenerating: boolean;
  onSubmit: (prompt: string, pieceCount: number) => void;
}

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

const PuzzleGeneratorForm: React.FC<PuzzleGeneratorFormProps> = ({ isGenerating, onSubmit }) => {
  const [prompt, setPrompt] = useState<string>('A photorealistic image of a futuristic city at night, with flying cars and neon lights');
  const [pieceCount, setPieceCount] = useState<number>(16);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onSubmit(prompt, pieceCount);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-indigo-300 mb-2">
            Image Prompt
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 text-gray-200 placeholder-gray-500"
            placeholder="e.g., A majestic lion in the savanna at sunset"
            required
            disabled={isGenerating}
          />
        </div>

        <div>
          <label htmlFor="pieceCount" className="block text-sm font-medium text-indigo-300 mb-2">
            Puzzle Size
          </label>
          <select
            id="pieceCount"
            value={pieceCount}
            onChange={(e) => setPieceCount(Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 text-gray-200"
            disabled={isGenerating}
          >
            {pieceOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isGenerating}
          className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
        >
          {isGenerating ? <Spinner /> : null}
          {isGenerating ? 'Generating Puzzle...' : 'Create Puzzle'}
        </button>
      </form>
    </div>
  );
};

export default PuzzleGeneratorForm;
