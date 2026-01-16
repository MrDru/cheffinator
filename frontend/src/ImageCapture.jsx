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
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);
  const framesRef = useRef([]);
  const frameIntervalRef = useRef(null);

  const MAX_RECORDING_TIME = 3; // 3 seconds max (reduced for smaller file size)
  const GIF_WIDTH = 320; // Reduced from 480 for smaller file size
  const GIF_FPS = 8; // Reduced from 10 for smaller file size

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
      setMode(forVideo ? 'video' : 'camera');
      
      // Small delay to ensure video element is rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera, fall back to any
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      console.log('Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera access granted, tracks:', mediaStream.getVideoTracks().length);
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            resolve();
          };
          videoRef.current.onerror = reject;
          setTimeout(() => resolve(), 3000); // Timeout fallback
        });
        
        await videoRef.current.play();
        console.log('Video playing');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please check permissions. Error: ' + err.message);
      setMode('select');
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
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available');
      setError('Camera not ready. Please try again.');
      return;
    }
    
    const video = videoRef.current;
    
    // Check if video has valid dimensions
    if (!video.videoWidth || !video.videoHeight) {
      console.error('Video dimensions not available:', video.videoWidth, video.videoHeight);
      setError('Camera not ready. Please wait and try again.');
      return;
    }
    
    console.log('Starting recording, video dimensions:', video.videoWidth, 'x', video.videoHeight);
    
    framesRef.current = [];
    recordedChunksRef.current = [];
    setIsRecording(true);
    setRecordingTime(0);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size for GIF
    const aspectRatio = video.videoHeight / video.videoWidth;
    canvas.width = GIF_WIDTH;
    canvas.height = Math.round(GIF_WIDTH * aspectRatio);
    
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
    
    // Capture frames at specified FPS
    frameIntervalRef.current = setInterval(() => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameData = canvas.toDataURL('image/jpeg', 0.6);
        framesRef.current.push(frameData);
      } catch (e) {
        console.error('Error capturing frame:', e);
      }
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
    console.log('Stopping recording, frames captured:', framesRef.current.length);
    setIsRecording(false);
    
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    const framesCaptured = [...framesRef.current]; // Copy frames before stopping camera
    stopCamera();
    
    // Convert frames to GIF
    if (framesCaptured.length > 0) {
      console.log('Converting', framesCaptured.length, 'frames to GIF');
      setIsProcessing(true);
      setProcessingProgress(0);
      convertToGif(framesCaptured);
    } else {
      console.error('No frames captured');
      setError('No frames were captured. Please try again.');
      setMode('select');
    }
  }, []);

  const convertToGif = (frames) => {
    console.log('Creating GIF from', frames.length, 'frames');
    
    // Calculate dimensions from first frame
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.height / img.width;
      const gifHeight = Math.round(GIF_WIDTH * aspectRatio);
      
      console.log('GIF dimensions:', GIF_WIDTH, 'x', gifHeight);
      
      gifshot.createGIF({
        images: frames,
        gifWidth: GIF_WIDTH,
        gifHeight: gifHeight,
        interval: 0.1, // 100ms between frames = 10fps
        numFrames: frames.length,
        frameDuration: 1,
        sampleInterval: 10,
        numWorkers: 2,
        progressCallback: (progress) => {
          console.log('GIF progress:', Math.round(progress * 100) + '%');
          setProcessingProgress(Math.round(progress * 100));
        }
      }, (result) => {
        console.log('GIF result:', result.error ? 'ERROR: ' + result.errorMsg : 'SUCCESS');
        setIsProcessing(false);
        if (!result.error && result.image) {
          setCapturedMedia(result.image);
          setMode('preview');
        } else {
          console.error('GIF creation failed:', result.errorMsg || result.error);
          setError('Failed to create GIF: ' + (result.errorMsg || 'Unknown error'));
          setMode('select');
        }
      });
    };
    
    img.onerror = () => {
      console.error('Failed to load first frame');
      setIsProcessing(false);
      setError('Failed to process frames. Please try again.');
      setMode('select');
    };
    
    img.src = frames[0];
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

  // CAMERA/VIDEO MODE - Live viewfinder (skip if processing GIF)
  if ((mode === 'camera' || mode === 'video') && !isProcessing) {
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

  // PROCESSING MODE - Animated cooking loader
  if (isProcessing) {
    return (
      <div style={overlayStyle}>
        <div style={{ 
          textAlign: 'center',
          background: 'var(--bg-secondary)',
          borderRadius: 24,
          padding: '40px 50px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}>
          {/* Cheffinator sprite animation */}
          <div 
            className="logo-sprite-animation"
            style={{ 
              width: 140,
              aspectRatio: '8 / 7',
              backgroundImage: 'url(/logo_animation_spritesheet.webp)',
              backgroundSize: '2500% 100%',
              backgroundPosition: '0 0',
              imageRendering: 'crisp-edges',
              margin: '0 auto 24px'
            }}
          />
          
          <h3 style={{ 
            margin: '0 0 8px', 
            fontSize: 20, 
            fontWeight: 600,
            color: 'var(--text-primary)'
          }}>
            Cooking your GIF...
          </h3>
          
          <p style={{ 
            color: 'var(--text-muted)', 
            fontSize: 14, 
            margin: '0 0 24px' 
          }}>
            This may take a few seconds
          </p>
          
          {/* Animated progress bar */}
          <div style={{
            width: 220,
            height: 10,
            background: 'var(--bg-tertiary)',
            borderRadius: 5,
            overflow: 'hidden',
            margin: '0 auto',
            position: 'relative'
          }}>
            {/* Animated shimmer effect */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, var(--accent-green-dark) 50%, transparent 100%)',
              animation: 'shimmer 1.5s ease-in-out infinite'
            }} />
            {/* Actual progress if available */}
            {processingProgress > 0 && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${processingProgress}%`,
                background: 'linear-gradient(90deg, var(--accent-green-dark), var(--accent-green))',
                borderRadius: 5,
                transition: 'width 0.3s ease'
              }} />
            )}
          </div>
          
          {/* Animated dots */}
          <div style={{ 
            marginTop: 20,
            display: 'flex',
            justifyContent: 'center',
            gap: 8
          }}>
            {[0, 1, 2].map(i => (
              <div 
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'var(--accent-green)',
                  animation: `dot 1.4s ease-in-out ${i * 0.2}s infinite`
                }}
              />
            ))}
          </div>
        </div>
        
        <style>{`
          .logo-sprite-animation {
            animation: playSprite 2.083s steps(24) infinite;
          }
          @keyframes playSprite {
            to { background-position: -2400% 0; }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes dot {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
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

