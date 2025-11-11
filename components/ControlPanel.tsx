
import React from 'react';
import { type DetectionResult } from '../types';
import { PowerIcon, TrashIcon } from './Icons';

interface ControlPanelProps {
  result: DetectionResult;
  spelledWord: string;
  onClearWord: () => void;
  isWebcamActive: boolean;
  onToggleWebcam: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ result, spelledWord, onClearWord, isWebcamActive, onToggleWebcam }) => {
  const { letter, confidence } = result;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg shadow-xl border border-gray-700 space-y-6">
      
      {/* Prediction Display */}
      <div className="text-center">
        <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-widest mb-2">
          Detected Letter
        </h2>
        <div className="h-40 w-40 mx-auto bg-gray-900 rounded-full flex items-center justify-center border-4 border-gray-700">
          <span className={`font-bold transition-opacity duration-300 ${letter ? (letter.length > 1 ? 'text-5xl' : 'text-7xl') + ' text-white' : 'text-2xl text-gray-500'}`}>
            {letter || 'N/A'}
          </span>
        </div>
        <div className="h-2 w-full bg-gray-700 rounded-full mt-4 overflow-hidden">
          <div 
            className="h-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${Math.round(confidence * 100)}%` }}
          />
        </div>
        <p className="text-gray-400 text-sm mt-2">
          Confidence: {Math.round(confidence * 100)}%
        </p>
      </div>

      {/* Word Speller */}
      <div className="relative">
        <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-widest mb-2">
          Word Speller
        </h2>
        <div className="bg-gray-900 p-4 rounded-md border border-gray-700 min-h-[5rem] text-2xl font-mono break-words flex items-center">
          <span>{spelledWord}</span>
          {!spelledWord && <span className="text-gray-500">...</span>}
          <span className="animate-pulse ml-1 text-cyan-400">|</span>
        </div>
        <button 
          onClick={onClearWord}
          className="absolute top-8 right-2 p-2 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
          disabled={!spelledWord}
          aria-label="Clear word"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Controls */}
      <div>
        <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-widest mb-2">
          Controls
        </h2>
        <button
          onClick={onToggleWebcam}
          className={`w-full flex items-center justify-center px-4 py-3 font-bold rounded-md transition-all duration-300 text-white
            ${isWebcamActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
          <PowerIcon className="w-5 h-5 mr-2" />
          {isWebcamActive ? 'Stop Camera' : 'Start Camera'}
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
