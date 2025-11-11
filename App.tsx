
import React, { useState, useCallback, useEffect, useRef } from 'react';
import WebcamFeed from './components/WebcamFeed';
import ControlPanel from './components/ControlPanel';
import { type DetectionResult } from './types';
import { GithubIcon } from './components/Icons';

const App: React.FC = () => {
  const [detectionResult, setDetectionResult] = useState<DetectionResult>({
    letter: null,
    confidence: 0,
  });
  const [spelledWord, setSpelledWord] = useState<string>('');
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);

  const previousLetter = useRef<string | null>(null);
  const letterHoldStart = useRef<number | null>(null);

  const handleClearWord = useCallback(() => {
    setSpelledWord('');
  }, []);
  
  const handleToggleWebcam = useCallback(() => {
    setIsWebcamActive(prev => !prev);
  }, []);

  useEffect(() => {
    const currentLetter = detectionResult.letter;
    const now = Date.now();

    if (currentLetter && currentLetter !== previousLetter.current) {
      previousLetter.current = currentLetter;
      letterHoldStart.current = now;
    } else if (currentLetter && letterHoldStart.current) {
      const holdDuration = now - letterHoldStart.current;
      if (holdDuration > 500) { // 500ms hold to confirm letter
        if (!spelledWord.endsWith(currentLetter)) {
            setSpelledWord(prev => prev + currentLetter);
        }
        letterHoldStart.current = null; // Reset to prevent rapid appending
        previousLetter.current = null;
      }
    } else if (!currentLetter) {
        previousLetter.current = null;
        letterHoldStart.current = null;
    }
  }, [detectionResult, spelledWord]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-700 flex justify-between items-center w-full z-10">
        <h1 className="text-xl md:text-2xl font-bold text-cyan-400 tracking-wider">
          ASL Gesture Recognition
        </h1>
        <a href="https://github.com/google/genai-frontend-web" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors">
            <GithubIcon className="w-6 h-6" />
        </a>
      </header>
      
      <main className="flex-grow flex flex-col lg:flex-row items-center justify-center p-4 md:p-8 gap-8">
        <div className="w-full max-w-2xl xl:max-w-3xl aspect-video rounded-lg overflow-hidden shadow-2xl shadow-cyan-500/10 border-2 border-gray-700 bg-black">
          <WebcamFeed 
            onDetectionResult={setDetectionResult} 
            isActive={isWebcamActive} 
            setIsActive={setIsWebcamActive}
          />
        </div>
        <div className="w-full lg:w-80 xl:w-96">
          <ControlPanel
            result={detectionResult}
            spelledWord={spelledWord}
            onClearWord={handleClearWord}
            isWebcamActive={isWebcamActive}
            onToggleWebcam={handleToggleWebcam}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
