'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface VideoHoverButtonProps {
  href: string;
  staticImage: string;
  hoverVideo: string;
  title: string;
  description: string;
  bgColorClass: string;
}

export default function VideoHoverButton({
  href,
  staticImage,
  hoverVideo,
  title,
  description,
  bgColorClass
}: VideoHoverButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <Link 
      href={href}
      className={`relative flex flex-col items-center justify-between h-80 ${bgColorClass} rounded-xl transition-all transform hover:scale-105 overflow-hidden group`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background media - positioned in upper portion */}
      <div className="relative w-full h-64">
        <Image
          src={staticImage}
          alt={`${title} background`}
          fill
          className="object-contain"
        />
        <video
          ref={videoRef}
          src={hoverVideo}
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          muted
          loop
          playsInline
        />
      </div>
      
      {/* Content - in the white space below */}
      <div className="w-full p-6 text-center bg-white">
        <h2 className="text-2xl font-bold mb-1 text-black">{title}</h2>
        <p className="text-sm text-black/80">{description}</p>
      </div>
    </Link>
  );
}
