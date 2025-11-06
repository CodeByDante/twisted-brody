import React, { useState, useRef, useEffect } from 'react';

interface ExpandableTextProps {
  text: string;
  maxLines?: number;
}

export default function ExpandableText({ text, maxLines = 4 }: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkHeight = () => {
      if (textRef.current) {
        const lineHeight = parseInt(getComputedStyle(textRef.current).lineHeight);
        const maxHeight = lineHeight * maxLines;
        const actualHeight = textRef.current.scrollHeight;
        setNeedsExpansion(actualHeight > maxHeight);
      }
    };

    checkHeight();
    window.addEventListener('resize', checkHeight);
    return () => window.removeEventListener('resize', checkHeight);
  }, [text, maxLines]);

  const formatText = (text: string) => {
    return text.split('\n').map((line, index) => (
      <p key={index} className={`${line.startsWith('• ') ? 'pl-4' : ''} leading-tight`}>
        {line}
      </p>
    ));
  };

  return (
    <div className="space-y-1">
      <div
        ref={textRef}
        className={`text-gray-300 whitespace-pre-wrap leading-tight transition-all duration-300 ${
          !isExpanded && needsExpansion
            ? 'max-h-[6em] overflow-hidden'
            : 'max-h-[1000px]'
        }`}
      >
        {formatText(text)}
      </div>
      
      {needsExpansion && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary hover:text-primary/80 text-sm mt-1 flex items-center gap-1"
        >
          {isExpanded ? 'Ver menos ↑' : 'Ver más ↓'}
        </button>
      )}
    </div>
  );
}