import React, { useRef, useEffect, useState } from 'react';
import useHandTracker from '../hooks/useHandTracker';
import { type DetectionResult } from '../types';
import { CameraIcon, LoadingIcon } from './Icons';

interface WebcamFeedProps {
  onDetectionResult: (result: DetectionResult) => void;
  isActive: boolean;
  setIsActive: (isActive: boolean) => void;
}

const WebcamFeed: React.FC<WebcamFeedProps> = ({ onDetectionResult, isActive, setIsActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isLoading } = useHandTracker(videoRef, canvasRef, isActive, onDetectionResult);

  const startWebcam = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setIsInitializing(true);
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsActive(true);
      } catch (err) {
        console.error("Error accessing webcam: ", err);
        setError("Could not access webcam. Please grant permission and try again.");
        setIsActive(false);
      } finally {
        setIsInitializing(false);
      }
    } else {
        setError("Your browser does not support webcam access.");
    }
  };
  
  const handleLoadedData = () => {
    if (videoRef.current && canvasRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  };

  useEffect(() => {
    if (isActive) {
      startWebcam();
    } else {
      stopWebcam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);


  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}
        onLoadedData={handleLoadedData}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
      />
      
      {!isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4">
            {isInitializing || isLoading ? (
                <>
                    <LoadingIcon className="w-12 h-12 text-cyan-400 animate-spin" />
                    <p className="mt-4 text-lg">
                      {isLoading ? 'Initializing Hand Tracking...' : 'Starting Webcam...'}
                    </p>
                </>
            ) : (
                <>
                    <CameraIcon className="w-16 h-16 text-gray-400" />
                    <p className="mt-4 text-center text-lg text-gray-300">Webcam is off</p>
                    {error && <p className="mt-2 text-center text-red-400">{error}</p>}
                    <button 
                        onClick={() => setIsActive(true)}
                        className="mt-6 px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-full shadow-lg transition-transform transform hover:scale-105"
                    >
                        Start Camera
                    </button>
                </>
            )}
        </div>
      )}
    </div>
  );
};

export default WebcamFeed;