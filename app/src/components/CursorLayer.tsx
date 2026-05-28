import { Cursor, colorToCss } from "../lib/cursor";

export function CursorLayer({
  cursors,
  selfPdaB58,
}: {
  cursors: Map<string, Cursor>;
  selfPdaB58: string | null;
}) {
  return (
    <>
      {Array.from(cursors.entries()).map(([pda, c]) => {
        const isSelf = pda === selfPdaB58;
        return (
          <div
            key={pda}
            style={{
              position: "absolute",
              left: c.x,
              top: c.y,
              transform: "translate(-2px, -2px)",
              pointerEvents: "none",
              transition: "left 80ms linear, top 80ms linear",
              zIndex: isSelf ? 10 : 1,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path
                d="M3 2 L3 18 L7 14 L10 21 L13 20 L10 13 L17 13 Z"
                fill={colorToCss(c.color)}
                stroke="#000"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <div
              style={{
                fontSize: 11,
                background: colorToCss(c.color),
                color: "#000",
                padding: "1px 5px",
                borderRadius: 3,
                marginTop: -2,
                marginLeft: 14,
                display: "inline-block",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {isSelf ? "you" : c.owner.toBase58().slice(0, 4)}
            </div>
          </div>
        );
      })}
    </>
  );
}
