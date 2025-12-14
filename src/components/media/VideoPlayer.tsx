'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface VideoPlayerProps {
  cloudinaryUrl: string;
  publicId: string;
  title?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '21:9';
  poster?: string;
}

/**
 * VideoPlayer Component
 *
 * Reusable component for displaying Cloudinary videos with custom controls
 *
 * @param cloudinaryUrl - Cloudinary base URL (e.g., "https://res.cloudinary.com/your-cloud-name/video/upload")
 * @param publicId - Public ID of the video in Cloudinary
 * @param title - Optional title for accessibility
 * @param autoplay - Whether to autoplay the video (default: false)
 * @param loop - Whether to loop the video (default: false)
 * @param muted - Whether to mute the video (default: false)
 * @param controls - Whether to show custom controls (default: true)
 * @param className - Additional CSS classes
 * @param aspectRatio - Video aspect ratio (default: '16:9')
 * @param poster - Optional poster image URL
 */
export default function VideoPlayer({
  cloudinaryUrl,
  publicId,
  title = 'Video',
  autoplay = false,
  loop = false,
  muted = false,
  controls = true,
  className = '',
  aspectRatio = '16:9',
  poster,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isMuted, setIsMuted] = useState(muted);
  const [showControls, setShowControls] = useState(false);

  // Calculate video URL from props
  const calculateVideoUrl = (url: string, pubId: string): string | null => {
    // Return null if either input is empty/invalid
    if (!url || !pubId || url.trim() === '' || pubId.trim() === '') {
      return null;
    }
    
    // Check for default demo values (shouldn't be used in production)
    if (url.includes('/demo/') || pubId === 'dog') {
      return null;
    }
    
    const isFullVideoUrl = url.match(/\.(mp4|mov|avi|webm|mkv)$/i);
    return isFullVideoUrl ? url : `${url}/q_auto,f_auto/${pubId}`;
  };

  // Initialize with proper URL (may be null if inputs are invalid)
  const [videoUrl, setVideoUrl] = useState<string | null>(() => calculateVideoUrl(cloudinaryUrl, publicId));

  // Update video URL whenever props change
  useEffect(() => {
    const newVideoUrl = calculateVideoUrl(cloudinaryUrl, publicId);

    // Debug logging (only if we have valid inputs)
    if (cloudinaryUrl && publicId) {
      console.log('VideoPlayer - Props changed:', {
        cloudinaryUrl,
        publicId,
        isFullVideoUrl: !!cloudinaryUrl.match(/\.(mp4|mov|avi|webm|mkv)$/i),
        constructedVideoUrl: newVideoUrl,
      });
    }

    if (newVideoUrl !== videoUrl) {
      setVideoUrl(newVideoUrl);

      // Reload video when URL changes (only if URL is valid)
      if (videoRef.current && newVideoUrl) {
        videoRef.current.load();
        if (autoplay) {
          videoRef.current.play().catch(err => console.log('Autoplay prevented:', err));
        }
      }
    }
  }, [cloudinaryUrl, publicId, autoplay, videoUrl]);

  // Aspect ratio map
  const aspectRatioMap = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
    '21:9': 'aspect-[21/9]',
  };

  // Play/Pause toggle
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Mute toggle
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Handle video ended
  const handleVideoEnded = () => {
    if (!loop) {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('ended', handleVideoEnded);
      return () => {
        video.removeEventListener('ended', handleVideoEnded);
      };
    }
  }, [loop]);

  // Check if this is a background video (no controls, full container)
  const isBackgroundVideo = !controls && className.includes('!bg-transparent');
  
  return (
    <div
      className={`relative overflow-hidden ${isBackgroundVideo ? 'absolute inset-0 w-full h-full rounded-none border-0 shadow-none bg-transparent' : 'rounded-xl border border-section-border shadow-md bg-neutral-900'} ${className}`}
      onMouseEnter={isBackgroundVideo ? undefined : () => setShowControls(true)}
      onMouseLeave={isBackgroundVideo ? undefined : () => setShowControls(false)}
    >
      {/* Video Element */}
      {isBackgroundVideo ? (
        // Background video: fill entire container, ensure consistent sizing
        videoUrl ? (
          <video
            key={videoUrl}
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              minWidth: '100%',
              minHeight: '100%',
              width: 'auto',
              height: 'auto',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              filter: 'brightness(0.7)',
              transition: 'none',
            }}
            autoPlay={autoplay}
            loop={loop}
            muted={muted}
            playsInline
            poster={poster}
            aria-label={title}
            onError={(e) => {
              // Only log errors for valid URLs (not empty/invalid ones)
              if (videoUrl) {
                const video = e.currentTarget;
                const error = video.error;
                if (error) {
                  console.error('Video failed to load:', {
                    videoUrl: videoUrl,
                    errorCode: error.code,
                    errorMessage: error.message,
                  });
                } else {
                  console.error('Video failed to load:', videoUrl);
                }
              }
            }}
            onLoadedData={() => {
              console.log('Video loaded successfully:', videoUrl);
            }}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-neutral-800 text-white">
            Loading video...
          </div>
        )
      ) : (
        // Regular video: use aspect ratio
        <div className={`w-full ${aspectRatioMap[aspectRatio]}`}>
          {videoUrl ? (
            <video
              key={videoUrl}
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay={autoplay}
              loop={loop}
              muted={muted}
              playsInline
              poster={poster}
              aria-label={title}
              onError={(e) => {
                // Only log errors for valid URLs (not empty/invalid ones)
                if (videoUrl) {
                  const video = e.currentTarget;
                  const error = video.error;
                  if (error) {
                    console.error('Video failed to load:', {
                      videoUrl: videoUrl,
                      errorCode: error.code,
                      errorMessage: error.message,
                    });
                  } else {
                    console.error('Video failed to load:', videoUrl);
                  }
                }
              }}
              onLoadedData={() => {
                console.log('Video loaded successfully:', videoUrl);
              }}
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-white">
              Loading video...
            </div>
          )}
        </div>
      )}

      {/* Custom Controls Overlay */}
      {controls && (
        <div
          className={`absolute inset-0 bg-gradient-to-t from-neutral-900/70 via-transparent to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Center Play/Pause Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="w-16 h-16 bg-accent-primary/90 hover:bg-accent-primary rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" fill="white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              )}
            </button>
          </div>

          {/* Bottom Controls Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-2 bg-neutral-900/80 hover:bg-neutral-800 rounded-lg transition text-white"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>

              {/* Mute/Unmute */}
              <button
                onClick={toggleMute}
                className="p-2 bg-neutral-900/80 hover:bg-neutral-800 rounded-lg transition text-white"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-neutral-900/80 hover:bg-neutral-800 rounded-lg transition text-white"
              aria-label="Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
