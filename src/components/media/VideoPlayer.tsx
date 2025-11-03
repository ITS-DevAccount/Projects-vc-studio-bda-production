'use client';

import React, { useRef, useState, useEffect } from 'react';
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

  // Construct the full video URL
  const videoUrl = `${cloudinaryUrl}/q_auto,f_auto/${publicId}`;

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

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-section-border shadow-md bg-neutral-900 ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Element */}
      <div className={`w-full ${aspectRatioMap[aspectRatio]}`}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay={autoplay}
          loop={loop}
          muted={muted}
          playsInline
          poster={poster}
          aria-label={title}
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

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
