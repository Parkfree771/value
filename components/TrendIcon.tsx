// 상승·하락 추세 아이콘 — 색은 글자색을 따른다 (--color-up · --color-down).

const PATHS = {
  up: 'M3.4,18L2,16.6L9.4,9.15l4,4L18.6,8H16V6h6v6H20V9.4L13.4,16l-4-4l-6,6Z',
  down: 'M16,18V16h2.6l-5.2-5.15l-4,4L2,7.4L3.4,6l6,6l4-4L20,14.6V12h2v6H16Z',
};

export default function TrendIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg viewBox="0 0 24 24" width="1.15em" height="1.15em" fill="currentColor" aria-hidden="true" className="inline-block align-[-0.2em]">
      <path d={PATHS[direction]} />
    </svg>
  );
}
