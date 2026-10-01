import type { Settings } from '@/lib/types';

export const buddyCharacters = [
  { value: 'CAT', name: 'Mochi', description: 'A sleepy little cat' },
  { value: 'SPROUT', name: 'Sprout', description: 'Growing alongside you' },
  { value: 'CLOUD', name: 'Nimbus', description: 'A small cloud of calm' },
  { value: 'NONE', name: 'Off', description: 'Just your workspace' },
] as const;

/** Integer coordinates keep every feature on the same 32 × 32 pixel grid. */
function PixelFace({ y = 17 }: { y?: number }) {
  return (
    <g className="buddy-face">
      <g className="buddy-eyes">
        <path d={`M10 ${y}h3v3h-3Zm9 0h3v3h-3Z`} fill="#665064" />
        <path d={`M10 ${y}h1v1h-1Zm9 0h1v1h-1Z`} fill="#fffaf0" />
      </g>
      <path d={`M7 ${y + 3}h3v2H7Zm15 0h3v2h-3Z`} fill="#efa5ac" />
      <path d={`M8 ${y + 3}h1v1H8Zm15 0h1v1h-1Z`} fill="#ffd0ca" />
      <path d={`M14 ${y + 4}h1v1h2v-1h1v2h-1v1h-2v-1h-1Z`} fill="#9b6a79" />
    </g>
  );
}

export function BuddyCharacter({ character }: { character: Settings['studyBuddy'] }) {
  if (character === 'NONE')
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className="buddy-svg" shapeRendering="crispEdges">
        <path
          d="M11 6h10v2h4v4h2v9h-2v4h-4v2H11v-2H7v-4H5v-9h2V8h4Zm0 2v2H9v3H7v7h2v3h3v2h8v-2h3v-3h2v-7h-2v-3h-3V8Z"
          fill="currentColor"
          opacity=".3"
          fillRule="evenodd"
        />
        <path
          d="M22 8h2v3h-2v2h-2v2h-2v2h-2v2h-2v2h-2v2h-2v2H8v-3h2v-2h2v-2h2v-2h2v-2h2v-2h2v-2h2Z"
          fill="currentColor"
          opacity=".3"
        />
      </svg>
    );

  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="buddy-svg"
      shapeRendering="crispEdges"
      fill="none"
    >
      <path d="M9 29h14v1h3v1H6v-1h3Z" fill="#6f617b" opacity=".1" />
      <g className="buddy-body">
        {character === 'CAT' && (
          <>
            <path d="M24 23h4v-4h-1v-3h3v2h1v6h-2v2h-5Z" fill="#b49588" />
            <path d="M25 23h3v-1h1v-3h-1v-2h1v2h1v4h-2v2h-3Z" fill="#ead0b0" />
            <path d="M6 5h4v2h2v2h8V7h2V5h4v7h1v9h-2v5h-3v2H10v-2H7v-5H5v-9h1Z" fill="#ab8b86" />
            <path d="M7 6h2v2h2v2h10V8h2V6h2v7h1v7h-2v5h-3v2H11v-2H8v-5H6v-7h1Z" fill="#f5dfbd" />
            <path d="M7 8h2v2h1v3H7Zm16 0h1v5h-3v-3h2Z" fill="#edb1ac" />
            <path d="M7 8h1v3H7Zm16 1h1v2h-1Z" fill="#ffd3c1" />
            <path d="M12 11h2v3h-2Zm4-1h2v3h-2Zm4 1h2v3h-2Z" fill="#dcbda1" />
            <path
              d="M8 14h3v1H8Zm-1 2h2v2H7Zm17-2h1v5h-1v4h-2v2h-3v1H12v-1H9v-2H8v-2h2v2h3v1h7v-1h2v-2h2Z"
              fill="#e8c7a6"
            />
            <path d="M13 22h6v1h2v4H11v-4h2Z" fill="#fff1d6" />
            <PixelFace />
            <path d="M8 24h7v1h2v-1h7v6h-7v1h-2v-1H8Z" fill="#81968d" />
            <path d="M9 25h5v1h1v3h-1v-1H9Zm9 0h5v3h-5v1h-1v-3h1Z" fill="#fff1d6" />
            <path d="M10 26h3v1h-3Zm9 0h3v1h-3Z" fill="#d9d2b9" />
            <path d="M16 26h1v4h-1Z" fill="#b6cbbb" />
            <path className="buddy-foot buddy-foot-left" d="M8 23h4v1h1v2H9v-1H8Z" fill="#ffe9c9" />
            <path
              className="buddy-foot buddy-foot-right"
              d="M20 23h4v2h-1v1h-4v-2h1Z"
              fill="#ffe9c9"
            />
          </>
        )}
        {character === 'SPROUT' && (
          <>
            <path d="M7 3h5v1h3v2h1v2h1v4h-4v-1h-3V9H8V7H7Z" fill="#819c7c" />
            <path d="M8 4h4v1h2v2h1v2h1v2h-3v-1h-2V8H9V6H8Z" fill="#c2d69e" />
            <path d="M9 4h3v1h1v1H9Z" fill="#e5eab5" />
            <path d="M16 11V7h2V5h3V3h5v4h-1v2h-2v2h-3v1h-2v3h-2Z" fill="#819c7c" />
            <path d="M18 10V7h2V6h2V4h3v3h-1v1h-2v2Z" fill="#aac590" />
            <path d="M21 5h3v1h-3Z" fill="#dde6ae" />
            <path d="M6 13h20v5h-1v7h-2v3H9v-3H7v-7H6Z" fill="#b08b86" />
            <path d="M7 14h18v3H7Z" fill="#f6cbb3" />
            <path d="M8 14h15v1H8Z" fill="#ffe6c9" />
            <path d="M8 18h16v6h-2v3H10v-3H8Z" fill="#eec2ab" />
            <path d="M22 18h2v6h-2v2H10v-1h11v-2h1Z" fill="#dcaa9a" />
            <path d="M9 18h2v1H9Z" fill="#ffe2c3" />
            <PixelFace y={19} />
            <path className="buddy-foot buddy-foot-left" d="M10 28h4v2H9v-1h1Z" fill="#9aae89" />
            <path className="buddy-foot buddy-foot-right" d="M18 28h4v1h1v1h-5Z" fill="#9aae89" />
          </>
        )}
        {character === 'CLOUD' && (
          <>
            <path
              d="M4 15h2v-3h4V8h2V6h6v1h3v3h4v2h3v3h2v6h-2v3h-3v2h-4v1h-4v-1h-4v1H8v-2H5v-2H3v-5h1Z"
              fill="#a69ab9"
            />
            <path
              d="M5 16h2v-3h4V9h2V7h5v1h2v3h5v2h2v3h2v5h-2v2h-3v2h-3v1h-4v-1h-4v1H9v-2H6v-2H4v-4h1Z"
              fill="#eee5f5"
            />
            <path d="M12 10V9h2V8h3v1h-3v2h-2v2h-1v-3Zm-5 5h2v1H7Z" fill="#fff7fa" />
            <path
              d="M27 18h2v3h-2v2h-3v2h-3v1h-4v-1h-4v1H9v-2H6v-2H5v-2h2v2h4v1h3v-1h3v2h4v-1h3v-2h3Z"
              fill="#d6c9e8"
            />
            <PixelFace y={17} />
            <path d="M24 8h1v2h2v1h-2v2h-1v-2h-2v-1h2Z" fill="#d3b383" />
            <path d="M24 9h1v1h1v1h-1v1h-1v-1h-1v-1h1Z" fill="#ffe6ad" />
            <path className="buddy-foot buddy-foot-left" d="M10 27h4v2H9v-1h1Z" fill="#c6b6db" />
            <path className="buddy-foot buddy-foot-right" d="M19 27h4v1h1v1h-5Z" fill="#c6b6db" />
          </>
        )}
      </g>
    </svg>
  );
}
