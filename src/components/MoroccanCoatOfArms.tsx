import React from 'react';

/**
 * High-fidelity vector rendering of the Royal Coat of Arms of the Kingdom of Morocco
 * (Armoiries du Royaume du Maroc - شعار المملكة المغربية)
 */
export const MoroccanCoatOfArms: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => {
  return (
    <div className={`flex items-center justify-center shrink-0 ${className}`}>
      <svg 
        viewBox="0 0 200 200" 
        className="w-full h-full object-contain drop-shadow-xs"
        aria-label="Armoiries du Royaume du Maroc"
      >
        {/* Royal Crown (Couronne Royale Chérifienne) */}
        <g id="crown">
          <path 
            d="M 85 45 C 85 42 115 42 115 45 L 120 56 C 110 54 90 54 80 56 Z" 
            fill="#D4AF37" 
            stroke="#996515" 
            strokeWidth="1.5"
          />
          <circle cx="100" cy="38" r="4" fill="#E6C229" stroke="#996515" strokeWidth="1" />
          <path d="M 82 56 L 80 47 L 90 53 L 100 44 L 110 53 L 120 47 L 118 56 Z" fill="#E6C229" stroke="#996515" strokeWidth="1" />
          {/* Jewels */}
          <circle cx="90" cy="50" r="1.5" fill="#C41E3A" />
          <circle cx="100" cy="48" r="1.5" fill="#006233" />
          <circle cx="110" cy="50" r="1.5" fill="#C41E3A" />
        </g>

        {/* Shield (Écu central) */}
        <g id="shield">
          {/* Shield outline */}
          <path 
            d="M 65 65 Q 100 62 135 65 C 135 110 120 135 100 150 C 80 135 65 110 65 65 Z" 
            fill="#C41E3A" 
            stroke="#D4AF37" 
            strokeWidth="3.5"
          />
          {/* Rising Sun and Atlas Mountains (Soleil levant sur les montagnes de l'Atlas) */}
          {/* Sky gradient background */}
          <path 
            d="M 68 68 Q 100 66 132 68 C 132 95 125 110 100 125 C 75 110 68 95 68 68 Z" 
            fill="#87CEEB" 
            opacity="0.3"
          />
          {/* Rising sun rays */}
          <path d="M 100 76 L 100 68 M 92 78 L 86 72 M 108 78 L 114 72 M 87 84 L 79 81 M 113 84 L 121 81" stroke="#FFD700" strokeWidth="1.5" />
          <circle cx="100" cy="85" r="9" fill="#FFD700" />
          {/* Atlas Mountains */}
          <polygon points="68,98 88,86 102,96 118,84 132,98 132,110 100,132 68,110" fill="#2E8B57" />
          <polygon points="80,105 94,95 108,103 120,94 130,105 100,135 70,105" fill="#1E5938" />

          {/* Green Pentagram (Sceau de Salomon / Étoile chérifienne) */}
          <g transform="translate(100, 116) scale(0.75)">
            <polygon 
              points="0,-18 5.3,-3.8 19.8,-3.8 8.1,4.7 12.6,18.7 0,10.2 -12.6,18.7 -8.1,4.7 -19.8,-3.8 -5.3,-3.8" 
              fill="#006233" 
              stroke="#D4AF37" 
              strokeWidth="1.2"
            />
          </g>
        </g>

        {/* Left Atlas Lion (Lion de l'Atlas héraldique) */}
        <g id="left-lion" fill="#D4AF37" stroke="#8B5A2B" strokeWidth="1">
          {/* Mane and Head */}
          <circle cx="50" cy="80" r="12" fill="#E6C229" />
          <path d="M 52 70 Q 56 65 60 72 Q 62 82 54 86 Z" fill="#D4AF37" />
          {/* Eye & mouth */}
          <circle cx="56" cy="78" r="1.2" fill="#000" />
          <path d="M 59 83 L 64 82" stroke="#8B5A2B" strokeWidth="1.5" />
          {/* Body and Foreleg supporting shield */}
          <path d="M 46 88 C 42 100 45 118 52 130 C 58 128 62 118 64 105 L 68 88 Z" fill="#D4AF37" />
          {/* Paws */}
          <circle cx="68" cy="92" r="3.5" fill="#E6C229" />
          <circle cx="66" cy="115" r="3.5" fill="#E6C229" />
          <circle cx="52" cy="132" r="4" fill="#E6C229" />
          {/* Tail */}
          <path d="M 42 120 C 32 125 30 110 32 102 C 34 98 38 96 36 92" fill="none" stroke="#D4AF37" strokeWidth="2.5" />
          <circle cx="36" cy="90" r="3" fill="#E6C229" />
        </g>

        {/* Right Atlas Lion */}
        <g id="right-lion" fill="#D4AF37" stroke="#8B5A2B" strokeWidth="1">
          {/* Mane and Head */}
          <circle cx="150" cy="80" r="12" fill="#E6C229" />
          <path d="M 148 70 Q 144 65 140 72 Q 138 82 146 86 Z" fill="#D4AF37" />
          {/* Eye & mouth */}
          <circle cx="144" cy="78" r="1.2" fill="#000" />
          <path d="M 141 83 L 136 82" stroke="#8B5A2B" strokeWidth="1.5" />
          {/* Body and Foreleg */}
          <path d="M 154 88 C 158 100 155 118 148 130 C 142 128 138 118 136 105 L 132 88 Z" fill="#D4AF37" />
          {/* Paws */}
          <circle cx="132" cy="92" r="3.5" fill="#E6C229" />
          <circle cx="134" cy="115" r="3.5" fill="#E6C229" />
          <circle cx="148" cy="132" r="4" fill="#E6C229" />
          {/* Tail */}
          <path d="M 158 120 C 168 125 170 110 168 102 C 166 98 162 96 164 92" fill="none" stroke="#D4AF37" strokeWidth="2.5" />
          <circle cx="164" cy="90" r="3" fill="#E6C229" />
        </g>

        {/* Motto Ribbon (Banderole avec Devise : إن تنصروا الله ينصركم) */}
        <g id="ribbon">
          <path 
            d="M 40 160 Q 100 152 160 160 L 165 170 Q 100 162 35 170 Z" 
            fill="#E6C229" 
            stroke="#996515" 
            strokeWidth="1.2"
          />
          {/* Ribbon ends */}
          <polygon points="35,170 40,160 28,162 33,166" fill="#D4AF37" stroke="#996515" strokeWidth="1" />
          <polygon points="165,170 160,160 172,162 167,166" fill="#D4AF37" stroke="#996515" strokeWidth="1" />
          {/* Arabic inscription representation */}
          <text 
            x="100" 
            y="166.5" 
            textAnchor="middle" 
            fontSize="7" 
            fontFamily="Arial, sans-serif" 
            fontWeight="bold" 
            fill="#4A3500"
          >
            إن تنصروا الله ينصركم
          </text>
        </g>
      </svg>
    </div>
  );
};
