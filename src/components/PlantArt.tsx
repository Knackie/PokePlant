import type { CatalogPlant } from '../types';

export function PlantArt({ shape = 'split', color = '#55775b', className = '' }: { shape?: CatalogPlant['shape']; color?: string; className?: string }) {
  return (
    <svg className={`plant-art ${className}`} viewBox="0 0 240 240" fill="none" aria-hidden="true">
      <ellipse cx="120" cy="217" rx="48" ry="7" fill="#244d35" opacity=".07" />
      <path d="M102 196h36l-5 19h-26z" fill="#a79478" />
      <path d="M97 193h46v7H97z" fill="#c0ae92" />
      <g stroke="#61745a" strokeWidth="3" strokeLinecap="round">
        <path d="M120 194V92M120 157l-35-35M120 136l33-43M120 174l37-24" />
      </g>
      {shape === 'split' && <g fill={color}>
        <path d="M111 140c-48 9-77-13-73-51 15-30 52-21 65-3l-18 1 18 10-23 4 26 8-18 9 23 7z" />
        <path d="M127 114c-7-49 13-79 51-76 32 14 25 51 9 65l-2-19-9 20-5-23-7 26-10-18-6 23z" />
        <path d="M126 171c11-32 35-46 62-29 15 24-4 47-23 48l7-12-15 8 6-16-16 14 2-17-14 9z" />
      </g>}
      {shape === 'round' && <g fill={color}>
        <circle cx="78" cy="109" r="30" /><circle cx="151" cy="85" r="35" /><circle cx="162" cy="155" r="27" /><circle cx="105" cy="59" r="23" />
        <g fill="#e3e9cf" opacity=".55"><circle cx="78" cy="109" r="4" /><circle cx="151" cy="85" r="4" /><circle cx="162" cy="155" r="4" /></g>
      </g>}
      {shape === 'spike' && <g fill={color} stroke="#f1f3df" strokeWidth="1.5">
        <path d="M120 193Q70 162 56 93q48 29 64 100z" /><path d="M120 193Q85 117 111 39q28 78 9 154z" /><path d="M120 193q5-91 65-130-10 86-65 130z" /><path d="M120 193q-1-58 81-65-24 51-81 65z" /><path d="M120 193q-60-5-78-47 58-8 78 47z" />
      </g>}
      {shape === 'flower' && <>
        <g fill="#74916b"><ellipse cx="99" cy="155" rx="26" ry="10" transform="rotate(35 99 155)" /><ellipse cx="140" cy="132" rx="25" ry="9" transform="rotate(-35 140 132)" /></g>
        <g fill={color}><ellipse cx="120" cy="63" rx="12" ry="25" /><ellipse cx="120" cy="101" rx="12" ry="25" /><ellipse cx="101" cy="82" rx="25" ry="12" /><ellipse cx="139" cy="82" rx="25" ry="12" /><ellipse cx="107" cy="68" rx="12" ry="21" transform="rotate(-45 107 68)" /><ellipse cx="134" cy="95" rx="12" ry="21" transform="rotate(-45 134 95)" /><ellipse cx="107" cy="95" rx="12" ry="21" transform="rotate(45 107 95)" /><ellipse cx="134" cy="68" rx="12" ry="21" transform="rotate(45 134 68)" /></g>
        <circle cx="120" cy="82" r="15" fill="#e9c571" />
      </>}
      {shape === 'fern' && <g fill={color}>
        {[0, 1, 2, 3, 4, 5].map((n) => <g key={n} transform={`translate(0 ${n * 19})`}><ellipse cx={101 - n * 2} cy="64" rx={11 + n * 2} ry="7" transform={`rotate(35 ${101 - n * 2} 64)`} /><ellipse cx={139 + n * 2} cy="64" rx={11 + n * 2} ry="7" transform={`rotate(-35 ${139 + n * 2} 64)`} /></g>)}
        <path d="M120 68q-17-23 0-35 17 12 0 35" />
      </g>}
      <g stroke="#f6f8e9" strokeWidth="1.5" opacity=".45"><path d="M76 99l26 25M150 88l19-32" /></g>
    </svg>
  );
}
