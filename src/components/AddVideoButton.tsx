import React, { useState, useEffect, useRef } from 'react';
import { Plus, Video, Camera } from 'lucide-react';
import VideoForm from './VideoForm';
import BrodyTwisForm from './BrodyTwisForm';
import { useStore } from '../lib/store';

export default function AddVideoButton() {
  const { settings } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [formType, setFormType] = useState<'video' | 'brodyTwis' | null>(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const buttonPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const savedPosition = localStorage.getItem('addButtonPosition');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    }
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!buttonRef.current) return;
    isDragging.current = true;
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
    buttonPos.current = { x: position.x, y: position.y };
    buttonRef.current.style.transition = 'none';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - startPos.current.x;
    const deltaY = touch.clientY - startPos.current.y;

    const newX = Math.min(Math.max(buttonPos.current.x + deltaX, 0), window.innerWidth - 64);
    const newY = Math.min(Math.max(buttonPos.current.y + deltaY, 0), window.innerHeight - 64);

    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    if (!buttonRef.current) return;
    isDragging.current = false;
    buttonRef.current.style.transition = 'transform 0.2s';
    localStorage.setItem('addButtonPosition', JSON.stringify(position));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!buttonRef.current) return;
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    buttonPos.current = { x: position.x, y: position.y };
    buttonRef.current.style.transition = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;

    const newX = Math.min(Math.max(buttonPos.current.x + deltaX, 0), window.innerWidth - 64);
    const newY = Math.min(Math.max(buttonPos.current.y + deltaY, 0), window.innerHeight - 64);

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (!buttonRef.current) return;
    isDragging.current = false;
    buttonRef.current.style.transition = 'transform 0.2s';
    localStorage.setItem('addButtonPosition', JSON.stringify(position));
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [position]);

  const handleClick = () => {
    if (!isDragging.current) {
      setIsOpen(true);
    }
  };

  if (!settings.showAddButton) return null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        className="fixed z-50 rounded-full bg-primary p-4 shadow-lg hover:bg-primary/90 transition-transform active:scale-95 touch-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging.current ? 'grabbing' : 'grab'
        }}
      >
        <Plus className="h-6 w-6" />
      </button>

      {isOpen && !formType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">¿Qué quieres publicar?</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormType('video')}
                className="flex flex-col items-center gap-4 p-6 bg-surface-light hover:bg-surface-light/80 rounded-lg transition-colors"
              >
                <Video className="h-8 w-8 text-primary" />
                <span className="font-medium">Video</span>
              </button>
              <button
                onClick={() => setFormType('brodyTwis')}
                className="flex flex-col items-center gap-4 p-6 bg-surface-light hover:bg-surface-light/80 rounded-lg transition-colors"
              >
                <Camera className="h-8 w-8 text-primary" />
                <span className="font-medium">Brody Twis</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isOpen && formType === 'video' && (
        <VideoForm 
          onClose={() => {
            setIsOpen(false);
            setFormType(null);
          }} 
        />
      )}

      {isOpen && formType === 'brodyTwis' && (
        <BrodyTwisForm 
          onClose={() => {
            setIsOpen(false);
            setFormType(null);
          }} 
        />
      )}
    </>
  );
}