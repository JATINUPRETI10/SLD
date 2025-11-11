import { useState, useEffect, useRef } from 'react';
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { type DetectionResult } from '../types';
import type React from 'react';

let handLandmarker: HandLandmarker | undefined = undefined;
let drawingUtils: DrawingUtils | undefined = undefined;
let lastVideoTime = -1;

// This new gesture recognition engine uses geometric relationships and is robust to hand rotation.
const recognizeGesture = (landmarks: any[]): DetectionResult => {
    if (!landmarks || landmarks.length === 0) {
        return { letter: null, confidence: 0 };
    }
    const hand = landmarks[0];

    // --- HELPER FUNCTIONS ---

    // Calculates 3D distance between two landmarks
    const getDistance = (p1_idx: number, p2_idx: number) => {
        const p1 = hand[p1_idx];
        const p2 = hand[p2_idx];
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
    };
    
    // A finger is considered "extended" if its tip is farther from the wrist than its middle joint (PIP).
    // This is a robust way to check for finger extension, independent of hand orientation.
    const isFingerExtended = (tip_idx: number, pip_idx: number) => {
        return getDistance(tip_idx, 0) > getDistance(pip_idx, 0);
    };
    
    // --- FINGER STATES ---
    const thumbExtended = isFingerExtended(4, 3);
    const indexExtended = isFingerExtended(8, 6);
    const middleExtended = isFingerExtended(12, 10);
    const ringExtended = isFingerExtended(16, 14);
    const pinkyExtended = isFingerExtended(20, 18);

    const allFingersCurled = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;

    // --- GESTURE RULES (ordered by specificity) ---
    
    // 'Y': Thumb and pinky extended.
    if (thumbExtended && pinkyExtended && !indexExtended && !middleExtended && !ringExtended) {
        return { letter: 'Y', confidence: 0.95 };
    }

    // 'A' and 'S' (Fist gestures)
    if (allFingersCurled) {
        // A is a fist with thumb on the side. S is thumb over the fingers.
        // We check if thumb tip is closer to the index knuckle or the pinky knuckle.
        const distToIndexKnuckle = getDistance(4, 5);
        const distToPinkyKnuckle = getDistance(4, 17);

        if (thumbExtended && distToIndexKnuckle < distToPinkyKnuckle) {
            return { letter: 'A', confidence: 0.95 };
        }
        
        if (!thumbExtended || distToIndexKnuckle > distToPinkyKnuckle) {
            return { letter: 'S', confidence: 0.95 };
        }
    }
    
    // B: All 4 fingers extended, thumb tucked in.
    if (indexExtended && middleExtended && ringExtended && pinkyExtended && !thumbExtended) {
        return { letter: 'B', confidence: 0.96 };
    }

    // H, K, U, V group (Index and Middle are extended)
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
        const handSize = getDistance(0, 9);
        
        // Check for HORIZONTAL 'H' first.
        const indexVecX = hand[8].x - hand[5].x;
        const indexVecY = hand[8].y - hand[5].y;
        const isIndexHorizontal = Math.abs(indexVecX) > Math.abs(indexVecY);

        const middleVecX = hand[12].x - hand[9].x;
        const middleVecY = hand[12].y - hand[9].y;
        const isMiddleHorizontal = Math.abs(middleVecX) > Math.abs(middleVecY);

        const areFingersTogether = getDistance(8, 12) < getDistance(6, 10);

        if (isIndexHorizontal && isMiddleHorizontal && areFingersTogether) {
            return { letter: 'H', confidence: 0.91 };
        }
    
        // If not H, then it must be vertical. Check for K, U, V.
        // K: Thumb tip is near the middle finger's middle joint.
        const thumbTouchesMiddlePip = getDistance(4, 10) / handSize < 0.25; 
        if (thumbExtended && thumbTouchesMiddlePip) {
             return { letter: 'K', confidence: 0.92 };
        }
        
        // U vs V is based on distance between finger tips
        const tipDistance = getDistance(8, 12) / handSize;
        if (tipDistance < 0.3) {
            return { letter: 'U', confidence: 0.93 };
        }
        return { letter: 'V', confidence: 0.95 };
    }

    // L: Index and Thumb extended, forming an 'L'.
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbExtended) {
        const thumbVsIndexDist = getDistance(4, 8);
        const wristVsIndexDist = getDistance(0, 8);
        // Ensure thumb is reasonably far from index to form L shape
        if (thumbVsIndexDist > wristVsIndexDist * 0.7) {
             return { letter: 'L', confidence: 0.94 };
        }
    }
    
    // D and I group (only index finger extended from the four)
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        const handSize = getDistance(0, 9);
        // A true 'D' has the thumb making a circle with the other fingers. This is a more specific sign.
        const thumbTouchesMiddleTip = getDistance(4, 12) / handSize < 0.3;
        if (thumbTouchesMiddleTip) {
            return { letter: 'D', confidence: 0.95 };
        }
        
        // 'I' (as requested by user) is just index finger up, thumb tucked.
        if (!thumbExtended) {
            return { letter: 'I', confidence: 0.95 };
        }
    }

    // W: Index, middle, and ring extended.
    if (indexExtended && middleExtended && ringExtended && !pinkyExtended) {
        return { letter: 'W', confidence: 0.94 };
    }

    // O: Circle shape with thumb and index finger.
    const handSize = getDistance(0, 9);
    const thumbIndexTipDist = getDistance(4, 8) / handSize;
    if (thumbIndexTipDist < 0.25) {
        if(middleExtended && ringExtended && pinkyExtended) {
            return { letter: 'O', confidence: 0.95 };
        }
    }
    
    // C: A wider curved hand shape than 'O'.
    const indexCurved = hand[8].y > hand[6].y;
    const middleCurved = hand[12].y > hand[10].y;
    if (indexCurved && middleCurved && getDistance(4, 8) / handSize > 0.3) {
        return { letter: 'C', confidence: 0.88 };
    }
    
    return { letter: null, confidence: 0 };
};


const useHandTracker = (
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isActive: boolean,
  onDetectionResult: (result: DetectionResult) => void
) => {
  const [isLoading, setIsLoading] = useState(true);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const createHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        const canvasElement = canvasRef.current;
        if (canvasElement) {
             const canvasCtx = canvasElement.getContext("2d");
             if (canvasCtx) {
                drawingUtils = new DrawingUtils(canvasCtx);
             }
        }
        setIsLoading(false);
      } catch (e) {
        console.error("Failed to create hand landmarker:", e);
      }
    };
    createHandLandmarker();
  }, [canvasRef]);

  const predictWebcam = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !handLandmarker || !drawingUtils || video.videoWidth === 0) {
       if (isActive) requestRef.current = requestAnimationFrame(predictWebcam);
       return;
    }

    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const results = handLandmarker.detectForVideo(video, performance.now());
      
      const canvasCtx = canvas.getContext('2d');
      if (canvasCtx) {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.landmarks && results.landmarks.length > 0) {
          for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
              color: "#00FF00",
              lineWidth: 5
            });
            drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 2 });
          }
          const recognitionResult = recognizeGesture(results.landmarks);
          onDetectionResult(recognitionResult);
        } else {
           onDetectionResult({ letter: null, confidence: 0 });
        }
        canvasCtx.restore();
      }
    }
    
    if (isActive) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  };


  useEffect(() => {
    if (isActive && !isLoading) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      onDetectionResult({ letter: null, confidence: 0 });
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isLoading]);


  return { isLoading };
};

export default useHandTracker;