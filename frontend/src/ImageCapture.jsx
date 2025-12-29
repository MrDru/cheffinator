import React, { useState, useRef, useCallback, useEffect } from 'react';
import gifshot from 'gifshot';

// Detect if device is mobile/tablet (touch device with camera)
const isMobileOrTablet = () => {
  if (typeof window === 'undefined') return false;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 1024;
  return hasTouch && isSmallScreen;
};

// Check if device has camera
const hasCamera = () => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

const ImageCapture = ({ onCapture, onClose, currentImage }) => {
  const [mode, setMode] = useState('select'); // 'select', 'camera', 'video', 'preview'
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);
  const framesRef = useRef([]);
  const frameIntervalRef = useRef(null);

  const MAX_RECORDING_TIME = 5; // 5 seconds max
  const GIF_WIDTH = 480;
  const GIF_FPS = 10;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, []);

  const startCamera = async (forVideo = false) => {
    try {
      setError(null);
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: forVideo ? GIF_WIDTH : 1280 },
          height: { ideal: forVideo ? 360 : 720 }
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      
      setMode(forVideo ? 'video' : 'camera');
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedMedia(dataUrl);
    stopCamera();
    setMode('preview');
  };

  const startRecording = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    framesRef.current = [];
    recordedChunksRef.current = [];
    setIsRecording(true);
    setRecordingTime(0);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size for GIF
    const aspectRatio = video.videoHeight / video.videoWidth;
    canvas.width = GIF_WIDTH;
    canvas.height = Math.round(GIF_WIDTH * aspectRatio);
    
    // Capture frames at specified FPS
    frameIntervalRef.current = setInterval(() => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameData = canvas.toDataURL('image/jpeg', 0.6);
      framesRef.current.push(frameData);
    }, 1000 / GIF_FPS);
    
    // Timer for recording duration
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= MAX_RECORDING_TIME - 1) {
          stopRecording();
          return MAX_RECORDING_TIME;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    stopCamera();
    
    // Convert frames to GIF
    if (framesRef.current.length > 0) {
      setIsProcessing(true);
      convertToGif(framesRef.current);
    }
  }, []);

  const convertToGif = (frames) => {
    gifshot.createGIF({
      images: frames,
      gifWidth: GIF_WIDTH,
      gifHeight: Math.round(GIF_WIDTH * 0.75), // Approximate, will be adjusted
      interval: 1 / GIF_FPS,
      numFrames: frames.length,
      frameDuration: 1,
      sampleInterval: 10,
      numWorkers: 2
    }, (result) => {
      setIsProcessing(false);
      if (!result.error) {
        setCapturedMedia(result.image);
        setMode('preview');
      } else {
        setError('Failed to create GIF. Please try again.');
        setMode('select');
      }
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedMedia(event.target.result);
      setMode('preview');
    };
    reader.readAsDataURL(file);
  };

  const confirmCapture = () => {
    if (capturedMedia) {
      onCapture(capturedMedia);
    }
  };

  const retake = () => {
    setCapturedMedia(null);
    setMode('select');
    setRecordingTime(0);
    framesRef.current = [];
  };

  const showMobileOptions = isMobileOrTablet() && hasCamera();

  // Styles
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.95)',
    zIndex: 2000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  };

  const modalStyle = {
    background: 'var(--bg-secondary)',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto'
  };

  const buttonStyle = {
    width: '100%',
    padding: '16px 20px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    color: 'var(--text-primary)',
    fontSize: 16,
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    transition: 'all 0.2s ease'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, var(--accent-green-dark), var(--accent-green))',
    border: 'none',
    color: 'var(--bg-primary)',
    fontWeight: 600,
    justifyContent: 'center'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: 'transparent',
    justifyContent: 'center',
    marginBottom: 0
  };

  // SELECT MODE - Choose capture method
  if (mode === 'select') {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 600 }}>Add Image</h3>
          
          {error && (
            <div style={{ 
              padding: 12, 
              background: 'rgba(239,68,68,0.1)', 
              border: '1px solid var(--accent-red)',
              borderRadius: 8,
              color: 'var(--accent-red)',
              fontSize: 14,
              marginBottom: 16
            }}>
              {error}
            </div>
          )}
          
          {/* Upload from gallery */}
          <label style={buttonStyle}>
            <span style={{ fontSize: 24 }}>📁</span>
            <div>
              <div style={{ fontWeight: 500 }}>Upload from Gallery</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Choose an existing image</div>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          
          {/* Camera options - only on mobile/tablet */}
          {showMobileOptions && (
            <>
              <button 
                style={buttonStyle} 
                onClick={() => startCamera(false)}
              >
                <span style={{ fontSize: 24 }}>📷</span>
                <div>
                  <div style={{ fontWeight: 500 }}>Take Photo</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Use camera to snap a picture</div>
                </div>
              </button>
              
              <button 
                style={buttonStyle} 
                onClick={() => startCamera(true)}
              >
                <span style={{ fontSize: 24 }}>🎬</span>
                <div>
                  <div style={{ fontWeight: 500 }}>Record GIF</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>5 sec video → animated GIF</div>
                </div>
              </button>
            </>
          )}
          
          <button style={secondaryButtonStyle} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // CAMERA/VIDEO MODE - Live viewfinder
  if (mode === 'camera' || mode === 'video') {
    return (
      <div style={overlayStyle}>
        <div style={{ 
          width: '100%', 
          maxWidth: 500, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20
        }}>
          {/* Video preview */}
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            borderRadius: 16, 
            overflow: 'hidden',
            background: '#000'
          }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              style={{ width: '100%', display: 'block' }}
            />
            
            {/* Recording indicator */}
            {isRecording && (
              <div style={{
                position: 'absolute',
                top: 16,
                left: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: 'rgba(239,68,68,0.9)',
                borderRadius: 20,
                color: 'white',
                fontSize: 14,
                fontWeight: 600
              }}>
                <span style={{ 
                  width: 10, 
                  height: 10, 
                  borderRadius: '50%', 
                  background: 'white',
                  animation: 'pulse 1s infinite'
                }} />
                {recordingTime}s / {MAX_RECORDING_TIME}s
              </div>
            )}
          </div>
          
          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          {/* Controls */}
          <div style={{ display: 'flex', gap: 16, width: '100%', justifyContent: 'center' }}>
            <button 
              style={{ ...secondaryButtonStyle, width: 'auto', padding: '12px 24px' }}
              onClick={() => { stopCamera(); setMode('select'); }}
            >
              Cancel
            </button>
            
            {mode === 'camera' ? (
              <button style={{ ...primaryButtonStyle, width: 'auto', padding: '12px 32px' }} onClick={capturePhoto}>
                📷 Capture
              </button>
            ) : (
              <button 
                style={{ 
                  ...primaryButtonStyle, 
                  width: 'auto', 
                  padding: '12px 32px',
                  background: isRecording 
                    ? 'linear-gradient(135deg, #DC2626, #EF4444)' 
                    : 'linear-gradient(135deg, var(--accent-green-dark), var(--accent-green))'
                }} 
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? '⏹ Stop' : '🔴 Record'}
              </button>
            )}
          </div>
        </div>
        
        {/* CSS for pulse animation */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  // PROCESSING MODE
  if (isProcessing) {
    return (
      <div style={overlayStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 60, 
            height: 60, 
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--accent-green)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Creating GIF...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // PREVIEW MODE - Show captured image/gif
  if (mode === 'preview' && capturedMedia) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={{ ...modalStyle, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 600 }}>Preview</h3>
          
          <div style={{ 
            borderRadius: 12, 
            overflow: 'hidden', 
            marginBottom: 20,
            background: '#000'
          }}>
            <img 
              src={capturedMedia} 
              alt="Preview" 
              style={{ width: '100%', display: 'block' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ ...secondaryButtonStyle, flex: 1 }} onClick={retake}>
              Retake
            </button>
            <button style={{ ...primaryButtonStyle, flex: 1, marginBottom: 0 }} onClick={confirmCapture}>
              Use This
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ImageCapture;

