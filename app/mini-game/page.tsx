'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';

// --- 상수 ---
const W = 800, H = 340, GY = 260, GRAVITY = 0.6, JUMP = -13;
const INIT_SPD = 5, MAX_SPD = 13, SPD_INC = 0.003;
const ANT = 84, ANT_X = 60;
const SPRITES = ['/sprite/logo.webp', '/sprite/1.webp', '/sprite/2.webp', '/sprite/3.webp', '/sprite/4.webp'];

// --- 타입 ---
type ObsType = 'red_candle' | 'green_candle' | 'bear' | 'chart_down' | 'bomb';
type ItemType = 'coin' | 'double' | 'half' | 'reverse' | 'jackpot' | 'crash';

interface Obs { x: number; w: number; h: number; type: ObsType; }
interface Item { x: number; y: number; type: ItemType; label: string; size: number; collected: boolean; }
interface FText { x: number; y: number; text: string; color: string; life: number; maxLife: number; }
interface Cloud { x: number; y: number; text: string; speed: number; }
interface Bld { x: number; w: number; h: number; layer: number; hasAntenna: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }

// 아이템 풀
const ITEMS: { type: ItemType; label: string; wt: number }[] = [
  { type: 'coin', label: '+50%', wt: 30 }, { type: 'coin', label: '+100%', wt: 20 },
  { type: 'coin', label: '+200%', wt: 10 }, { type: 'double', label: 'x2', wt: 10 },
  { type: 'half', label: '/2', wt: 10 }, { type: 'reverse', label: 'x(-1)', wt: 5 },
  { type: 'jackpot', label: '+1000%', wt: 3 },
  { type: 'crash', label: '-50%', wt: 8 }, { type: 'crash', label: '-90%', wt: 4 },
];

function pickItem() {
  const total = ITEMS.reduce((s, d) => s + d.wt, 0);
  let r = Math.random() * total;
  for (const d of ITEMS) { r -= d.wt; if (r <= 0) return d; }
  return ITEMS[0];
}

function applyItem(score: number, type: ItemType, label: string) {
  let n = score;
  switch (type) {
    case 'coin': case 'crash': n = score + parseInt(label); break;
    case 'double': n = score * 2; break;
    case 'half': n = Math.round(score / 2); break;
    case 'reverse': n = score * -1; break;
    case 'jackpot': n = score + 1000; break;
  }
  const prefix = n >= 0 ? '+' : '';
  let txt = label;
  if (type === 'double' || type === 'half' || type === 'reverse') txt = `${label} = ${prefix}${n}%`;
  return { newScore: n, text: txt };
}

const MSGS = [
  '금리 인상!', '실적 쇼크', '공매도', '-5.2%', '하한가', '반대매매',
  '패닉셀', '인플레이션', '경기침체', '마진콜!', '버블 경고', 'SELL',
];
const CHEERS = [
  '개미는 뚠뚠', '존버는 승리한다', '개미 파이팅!',
  '떨어질 때 사야지', '멘탈 관리!', '다이아몬드 핸드',
];

// --- 아이템 색상 ---
function itemColor(type: ItemType): { bg: string; glow: string; ring: string } {
  switch (type) {
    case 'coin': return { bg: '#F59E0B', glow: 'rgba(245,158,11,0.6)', ring: '#FCD34D' };
    case 'double': return { bg: '#DC2626', glow: 'rgba(220,38,38,0.6)', ring: '#FCA5A5' };
    case 'jackpot': return { bg: '#F59E0B', glow: 'rgba(245,158,11,0.8)', ring: '#FDE68A' };
    case 'half': return { bg: '#3B82F6', glow: 'rgba(59,130,246,0.6)', ring: '#93C5FD' };
    case 'crash': return { bg: '#3B82F6', glow: 'rgba(59,130,246,0.6)', ring: '#93C5FD' };
    case 'reverse': return { bg: '#7C3AED', glow: 'rgba(124,58,237,0.6)', ring: '#C4B5FD' };
  }
}

// --- 장애물 그리기 ---
function drawRedCandle(ctx: CanvasRenderingContext2D, x: number, gy: number, w: number, h: number) {
  const bw = w * 0.6, bx = x + (w - bw) / 2, wx = x + w / 2 - 1.5;
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(bx + 3, gy - 2, bw, 4);
  // 위 꼬리
  ctx.fillStyle = '#DC2626'; ctx.fillRect(wx, gy - h, 3, h * 0.3);
  // 몸통
  const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  grad.addColorStop(0, '#EF4444'); grad.addColorStop(0.6, '#DC2626'); grad.addColorStop(1, '#991B1B');
  ctx.fillStyle = grad; ctx.fillRect(bx, gy - h * 0.7, bw, h * 0.5);
  // 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bx + 1, gy - h * 0.7, 2, h * 0.5);
  // 아래 꼬리
  ctx.fillStyle = '#DC2626'; ctx.fillRect(wx, gy - h * 0.2, 3, h * 0.2);
}

function drawGreenCandle(ctx: CanvasRenderingContext2D, x: number, gy: number, w: number, h: number) {
  const bw = w * 0.6, bx = x + (w - bw) / 2, wx = x + w / 2 - 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(bx + 3, gy - 2, bw, 4);
  ctx.fillStyle = '#16A34A'; ctx.fillRect(wx, gy - h, 3, h * 0.3);
  const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  grad.addColorStop(0, '#22C55E'); grad.addColorStop(0.6, '#16A34A'); grad.addColorStop(1, '#15803D');
  ctx.fillStyle = grad; ctx.fillRect(bx, gy - h * 0.7, bw, h * 0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bx + 1, gy - h * 0.7, 2, h * 0.5);
  ctx.fillStyle = '#16A34A'; ctx.fillRect(wx, gy - h * 0.2, 3, h * 0.2);
}

function drawBear(ctx: CanvasRenderingContext2D, x: number, gy: number, w: number, h: number) {
  const cx = x + w / 2;
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(cx + 2, gy - 1, w * 0.3, 4, 0, 0, Math.PI * 2); ctx.fill();
  // 몸
  const bodyGrad = ctx.createRadialGradient(cx - 4, gy - h * 0.4, 2, cx, gy - h * 0.35, w * 0.42);
  bodyGrad.addColorStop(0, '#8B5CF6'); bodyGrad.addColorStop(1, '#6D28D9');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.ellipse(cx, gy - h * 0.35, w * 0.4, h * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  // 머리
  const headGrad = ctx.createRadialGradient(cx - 3, gy - h * 0.78, 2, cx, gy - h * 0.75, w * 0.3);
  headGrad.addColorStop(0, '#8B5CF6'); headGrad.addColorStop(1, '#6D28D9');
  ctx.fillStyle = headGrad;
  ctx.beginPath(); ctx.ellipse(cx, gy - h * 0.75, w * 0.28, h * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  // 귀
  ctx.fillStyle = '#7C3AED';
  ctx.beginPath(); ctx.arc(cx - w * 0.2, gy - h * 0.92, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + w * 0.2, gy - h * 0.92, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#C4B5FD';
  ctx.beginPath(); ctx.arc(cx - w * 0.2, gy - h * 0.92, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + w * 0.2, gy - h * 0.92, 3, 0, Math.PI * 2); ctx.fill();
  // 눈
  ctx.fillStyle = '#FFF';
  ctx.beginPath(); ctx.arc(cx - 6, gy - h * 0.78, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 6, gy - h * 0.78, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1F2937';
  ctx.beginPath(); ctx.arc(cx - 5, gy - h * 0.77, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 7, gy - h * 0.77, 2, 0, Math.PI * 2); ctx.fill();
  // 코
  ctx.fillStyle = '#1F2937';
  ctx.beginPath(); ctx.ellipse(cx, gy - h * 0.68, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  // 하락 화살표
  ctx.fillStyle = '#DC2626'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('\u25BC', cx, gy - h - 4); ctx.textAlign = 'left';
}

function drawChartDown(ctx: CanvasRenderingContext2D, x: number, gy: number, w: number, h: number) {
  // 영역
  ctx.fillStyle = 'rgba(220,38,38,0.12)';
  ctx.beginPath(); ctx.moveTo(x, gy - h); ctx.lineTo(x + w * 0.3, gy - h * 0.7); ctx.lineTo(x + w * 0.5, gy - h * 0.8);
  ctx.lineTo(x + w * 0.7, gy - h * 0.3); ctx.lineTo(x + w, gy); ctx.lineTo(x, gy); ctx.closePath(); ctx.fill();
  // 선
  ctx.strokeStyle = '#DC2626'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x, gy - h); ctx.lineTo(x + w * 0.3, gy - h * 0.7); ctx.lineTo(x + w * 0.5, gy - h * 0.8);
  ctx.lineTo(x + w * 0.7, gy - h * 0.3); ctx.lineTo(x + w, gy); ctx.stroke();
  ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  // 점
  [[0, 1], [0.3, 0.7], [0.5, 0.8], [0.7, 0.3], [1, 0]].forEach(([px, py]) => {
    ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(x + w * px, gy - h * py, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#DC2626'; ctx.beginPath(); ctx.arc(x + w * px, gy - h * py, 1.5, 0, Math.PI * 2); ctx.fill();
  });
}

function drawBomb(ctx: CanvasRenderingContext2D, x: number, gy: number, w: number, h: number) {
  const cx = x + w / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(cx + 2, gy - 1, w * 0.25, 3, 0, 0, Math.PI * 2); ctx.fill();
  // 몸체
  const grad = ctx.createRadialGradient(cx - 3, gy - h * 0.45, 2, cx, gy - h * 0.4, w * 0.38);
  grad.addColorStop(0, '#4B5563'); grad.addColorStop(1, '#1F2937');
  ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, gy - h * 0.4, w * 0.35, 0, Math.PI * 2); ctx.fill();
  // 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.arc(cx - w * 0.12, gy - h * 0.52, w * 0.1, 0, Math.PI * 2); ctx.fill();
  // 심지
  ctx.strokeStyle = '#92400E'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx, gy - h * 0.7); ctx.quadraticCurveTo(cx + 10, gy - h * 0.95, cx + 5, gy - h); ctx.stroke();
  // 불꽃
  ctx.fillStyle = '#FBBF24'; ctx.beginPath(); ctx.arc(cx + 5, gy - h, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#F97316'; ctx.beginPath(); ctx.arc(cx + 5, gy - h - 2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(cx + 5, gy - h - 1, 1.5, 0, Math.PI * 2); ctx.fill();
  // 라벨
  ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SELL', cx, gy - h * 0.36); ctx.textAlign = 'left';
}

// --- 아이템 그리기 (강화) ---
function drawItem(ctx: CanvasRenderingContext2D, item: Item, t: number) {
  if (item.collected) return;
  const bobY = item.y + Math.sin(t * 0.004 + item.x * 0.01) * 5;
  const s = item.size;
  const cx = item.x + s / 2, cy = bobY + s / 2;
  const { bg, glow, ring } = itemColor(item.type);
  const pulse = 1 + Math.sin(t * 0.006) * 0.08;

  ctx.save();
  // 외부 글로우
  ctx.shadowColor = glow; ctx.shadowBlur = 18;
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, s / 2 * pulse + 4, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // 외부 링
  ctx.strokeStyle = ring; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, s / 2 * pulse + 2, 0, Math.PI * 2); ctx.stroke();

  // 메인 원
  const grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, s / 2);
  grad.addColorStop(0, ring); grad.addColorStop(0.4, bg); grad.addColorStop(1, bg);
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, s / 2 * pulse, 0, Math.PI * 2); ctx.fill();

  // 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(cx - 3, cy - 5, s * 0.22, s * 0.14, -0.3, 0, Math.PI * 2); ctx.fill();

  // 라벨 (배경 포함)
  ctx.font = `bold ${s > 32 ? 12 : 10}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const m = ctx.measureText(item.label);
  // 라벨 배경
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  const pw = m.width + 6, ph = 14;
  ctx.beginPath();
  ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, 3);
  ctx.fill();
  // 라벨 텍스트
  ctx.fillStyle = '#FFF';
  ctx.fillText(item.label, cx, cy + 0.5);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

  ctx.restore();
}

// 빌딩 생성
function genBuildings(): Bld[] {
  const b: Bld[] = [];
  let x = 0;
  while (x < W + 250) {
    b.push({ x, w: 30 + Math.random() * 55, h: 50 + Math.random() * 80, layer: 0, hasAntenna: Math.random() > 0.6 });
    x += 35 + Math.random() * 20;
  }
  x = 0;
  while (x < W + 250) {
    b.push({ x, w: 25 + Math.random() * 45, h: 30 + Math.random() * 55, layer: 1, hasAntenna: Math.random() > 0.7 });
    x += 35 + Math.random() * 30;
  }
  return b;
}

// 테마
const TH = {
  light: {
    sky1: '#dce5f0', sky2: '#c7d4e3', ground: '#b8bcc8', groundLine: '#8888a0',
    gTick: '#a0a0b8', grid: 'rgba(0,0,0,0.035)', news: 'rgba(200,40,40,0.2)',
    bFar: '#bcc4d4', bNear: '#a4acc0', bWin: 'rgba(255,255,255,0.5)', bEdge: 'rgba(0,0,0,0.06)',
    dash: 'rgba(0,0,0,0.1)', antenna: '#8890a0',
    hudBg: 'rgba(255,255,255,0.7)', hudBorder: 'rgba(0,0,0,0.1)',
  },
  dark: {
    sky1: '#12122a', sky2: '#1a1a36', ground: '#282844', groundLine: '#44447a',
    gTick: '#363660', grid: 'rgba(255,255,255,0.03)', news: 'rgba(220,40,40,0.25)',
    bFar: '#1e1e38', bNear: '#26264a', bWin: 'rgba(255,210,80,0.25)', bEdge: 'rgba(0,0,0,0.3)',
    dash: 'rgba(255,255,255,0.08)', antenna: '#44447a',
    hudBg: 'rgba(0,0,0,0.5)', hudBorder: 'rgba(255,255,255,0.1)',
  },
};

// --- 빌딩 그리기 ---
function drawBuilding(ctx: CanvasRenderingContext2D, b: Bld, c: typeof TH.dark) {
  const clr = b.layer === 0 ? c.bFar : c.bNear;
  // 빌딩 본체
  ctx.fillStyle = clr;
  ctx.fillRect(b.x, GY - b.h, b.w, b.h);
  // 오른쪽 엣지 (입체감)
  ctx.fillStyle = c.bEdge;
  ctx.fillRect(b.x + b.w - 3, GY - b.h, 3, b.h);
  // 지붕 라인
  ctx.fillStyle = c.bEdge;
  ctx.fillRect(b.x, GY - b.h, b.w, 2);
  // 안테나
  if (b.hasAntenna) {
    ctx.strokeStyle = c.antenna; ctx.lineWidth = 1.5;
    const ax = b.x + b.w * 0.3 + Math.random() * b.w * 0.4;
    ctx.beginPath(); ctx.moveTo(ax, GY - b.h); ctx.lineTo(ax, GY - b.h - 12); ctx.stroke();
    ctx.fillStyle = '#DC2626'; ctx.beginPath(); ctx.arc(ax, GY - b.h - 12, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  // 창문
  ctx.fillStyle = c.bWin;
  const gap = b.layer === 0 ? 14 : 11;
  const wGap = b.layer === 0 ? 10 : 8;
  const ww = b.layer === 0 ? 4 : 3;
  const wh = b.layer === 0 ? 6 : 5;
  for (let wy = GY - b.h + 8; wy < GY - 6; wy += gap)
    for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += wGap)
      ctx.fillRect(wx, wy, ww, wh);
}

// === 컴포넌트 ===
export default function MiniGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  const [displayScore, setDisplayScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [cheerMsg, setCheerMsg] = useState('');
  const isDarkRef = useRef(theme === 'dark');
  useEffect(() => { isDarkRef.current = theme === 'dark'; }, [theme]);

  const g = useRef({
    antY: GY - ANT, vel: 0, jumping: false,
    speed: INIT_SPD, obs: [] as Obs[], items: [] as Item[],
    texts: [] as FText[], clouds: [] as Cloud[], blds: genBuildings(),
    particles: [] as Particle[],
    fi: 0, ft: 0, score: 0, base: 0, gOff: 0,
    running: false, last: 0, spawnT: 0, itemT: 0, cloudT: 0,
  });
  const sprites = useRef<HTMLImageElement[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    SPRITES.forEach((s, i) => { const img = new window.Image(); img.src = s; sprites.current[i] = img; });
    const s = localStorage.getItem('antrunner_highscore');
    if (s) setHighScore(parseInt(s, 10));
  }, []);

  const spawnObs = useCallback(() => {
    const types: ObsType[] = ['red_candle', 'green_candle', 'bear', 'chart_down', 'bomb'];
    const t = types[Math.floor(Math.random() * types.length)];
    let w = 30, h = 50;
    switch (t) {
      case 'red_candle': w = 26 + Math.random() * 14; h = 55 + Math.random() * 45; break;
      case 'green_candle': w = 26 + Math.random() * 14; h = 45 + Math.random() * 35; break;
      case 'bear': w = 48; h = 58; break;
      case 'chart_down': w = 55 + Math.random() * 20; h = 45 + Math.random() * 35; break;
      case 'bomb': w = 38; h = 48; break;
    }
    g.current.obs.push({ x: W + 20, w, h, type: t });
  }, []);

  const spawnItem = useCallback(() => {
    const d = pickItem();
    const isAir = Math.random() > 0.35;
    const size = 36;
    const y = isAir ? GY - ANT - 15 - Math.random() * 55 : GY - size - 4;
    g.current.items.push({ x: W + 20, y, type: d.type, label: d.label, size, collected: false });
  }, []);

  const spawnCloud = useCallback(() => {
    g.current.clouds.push({
      x: W + 50, y: 15 + Math.random() * 90,
      text: MSGS[Math.floor(Math.random() * MSGS.length)],
      speed: 0.8 + Math.random() * 1.2,
    });
  }, []);

  // 파티클 이펙트
  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      g.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.8) * 3,
        life: 400 + Math.random() * 400,
        color, size: 2 + Math.random() * 3,
      });
    }
  }, []);

  const loop = useCallback((ts: number) => {
    const s = g.current;
    if (!s.running) return;
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const dt = ts - s.last; s.last = ts;
    const c = isDarkRef.current ? TH.dark : TH.light;

    // === UPDATE ===
    s.speed = Math.min(MAX_SPD, s.speed + SPD_INC * (dt / 16));
    s.ft += dt;
    if (s.ft >= 120) { s.ft = 0; s.fi = (s.fi + 1) % SPRITES.length; }

    if (s.jumping) {
      s.vel += GRAVITY; s.antY += s.vel;
      if (s.antY >= GY - ANT) { s.antY = GY - ANT; s.jumping = false; s.vel = 0; }
    }

    s.spawnT += dt;
    if (s.spawnT > Math.max(600, 1800 - s.speed * 80) + Math.random() * 800) { s.spawnT = 0; spawnObs(); }
    s.itemT += dt;
    if (s.itemT > 1800 + Math.random() * 2500) { s.itemT = 0; spawnItem(); }
    s.cloudT += dt;
    if (s.cloudT > 2000 + Math.random() * 2000) { s.cloudT = 0; spawnCloud(); }

    s.obs.forEach(o => { o.x -= s.speed; });
    s.obs = s.obs.filter(o => o.x + o.w > -50);
    s.items.forEach(it => { it.x -= s.speed; });
    s.items = s.items.filter(it => !it.collected && it.x + it.size > -50);
    s.clouds.forEach(cl => { cl.x -= cl.speed; });
    s.clouds = s.clouds.filter(cl => cl.x > -200);
    s.gOff = (s.gOff + s.speed) % 40;

    s.base += s.speed * 0.08;
    s.score = Math.round(s.base);

    s.texts.forEach(t => { t.y -= 0.8; t.life -= dt; });
    s.texts = s.texts.filter(t => t.life > 0);

    s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= dt; });
    s.particles = s.particles.filter(p => p.life > 0);

    // 충돌: 장애물
    const aL = ANT_X + 14, aR = ANT_X + ANT - 14, aT = s.antY + 12, aB = s.antY + ANT;
    for (const o of s.obs) {
      if (aR > o.x + 5 && aL < o.x + o.w - 5 && aB > GY - o.h + 5 && aT < GY) {
        s.running = false; setGameState('over');
        setDisplayScore(s.score);
        spawnParticles(ANT_X + ANT / 2, s.antY + ANT / 2, '#DC2626', 20);
        const saved = parseInt(localStorage.getItem('antrunner_highscore') || '0', 10);
        if (s.score > saved) { setHighScore(s.score); localStorage.setItem('antrunner_highscore', String(s.score)); }
        // 마지막 프레임 렌더링을 위해 아래로 계속
        break;
      }
    }

    // 충돌: 아이템
    for (const it of s.items) {
      if (it.collected) continue;
      const dx = (it.x + it.size / 2) - (ANT_X + ANT / 2);
      const dy = (it.y + it.size / 2) - (s.antY + ANT / 2);
      if (Math.sqrt(dx * dx + dy * dy) < (ANT / 2 + it.size / 2) * 0.65) {
        it.collected = true;
        const r = applyItem(Math.round(s.base), it.type, it.label);
        s.base = r.newScore; s.score = Math.round(s.base);
        const color = s.score >= 0 ? '#DC2626' : '#3B82F6';
        s.texts.push({ x: it.x, y: it.y - 10, text: r.text, color, life: 1800, maxLife: 1800 });
        spawnParticles(it.x + it.size / 2, it.y + it.size / 2, itemColor(it.type).bg, 12);
      }
    }
    setDisplayScore(s.score);

    // === RENDER ===
    // 하늘
    const sky = ctx.createLinearGradient(0, 0, 0, GY);
    sky.addColorStop(0, c.sky1); sky.addColorStop(1, c.sky2);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GY);

    // 그리드
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 60) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, GY); ctx.stroke(); }
    for (let j = 0; j < GY; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke(); }

    // 빌딩
    s.blds.filter(b => b.layer === 0).forEach(b => {
      b.x -= s.speed * 0.15;
      if (b.x + b.w < 0) { b.x = W + Math.random() * 120; b.h = 50 + Math.random() * 80; b.w = 30 + Math.random() * 55; }
      drawBuilding(ctx, b, c);
    });
    s.blds.filter(b => b.layer === 1).forEach(b => {
      b.x -= s.speed * 0.4;
      if (b.x + b.w < 0) { b.x = W + Math.random() * 160; b.h = 30 + Math.random() * 55; b.w = 25 + Math.random() * 45; }
      drawBuilding(ctx, b, c);
    });

    // 뉴스
    ctx.font = '11px sans-serif';
    s.clouds.forEach(cl => { ctx.fillStyle = c.news; ctx.fillText(cl.text, cl.x, cl.y); });

    // 바닥
    ctx.fillStyle = c.ground; ctx.fillRect(0, GY, W, H - GY);
    // 스피드 라인
    ctx.strokeStyle = c.dash; ctx.lineWidth = 2; ctx.setLineDash([10, 20]);
    ctx.beginPath(); ctx.moveTo(-s.gOff, GY + 20); ctx.lineTo(W, GY + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s.gOff * 1.5, GY + 45); ctx.lineTo(W, GY + 45); ctx.stroke();
    ctx.setLineDash([]);
    // 틱
    ctx.strokeStyle = c.gTick; ctx.lineWidth = 1;
    for (let i = -s.gOff; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, GY); ctx.lineTo(i, GY + 10); ctx.stroke(); }
    // 바닥선
    ctx.strokeStyle = c.groundLine; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(W, GY); ctx.stroke();

    // 장애물
    s.obs.forEach(o => {
      switch (o.type) {
        case 'red_candle': drawRedCandle(ctx, o.x, GY, o.w, o.h); break;
        case 'green_candle': drawGreenCandle(ctx, o.x, GY, o.w, o.h); break;
        case 'bear': drawBear(ctx, o.x, GY, o.w, o.h); break;
        case 'chart_down': drawChartDown(ctx, o.x, GY, o.w, o.h); break;
        case 'bomb': drawBomb(ctx, o.x, GY, o.w, o.h); break;
      }
    });

    // 아이템
    s.items.forEach(it => drawItem(ctx, it, ts));

    // 파티클
    s.particles.forEach(p => {
      ctx.globalAlpha = Math.min(1, p.life / 300);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // 개미
    const sp = sprites.current[s.fi];
    if (sp?.complete) { ctx.imageSmoothingEnabled = false; ctx.drawImage(sp, ANT_X, s.antY, ANT, ANT); }

    // 플로팅 텍스트
    s.texts.forEach(ft => {
      const a = Math.min(1, ft.life / 600);
      const scale = ft.life > ft.maxLife * 0.7 ? 1 + (ft.life / ft.maxLife - 0.7) * 1.5 : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `bold ${Math.round(16 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      // 텍스트 외곽
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x + 18, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x + 18, ft.y);
      ctx.restore();
    });

    // HUD
    ctx.save();
    // HUD 배경
    ctx.fillStyle = c.hudBg;
    ctx.beginPath(); ctx.roundRect(W - 170, 8, 158, 36, 6); ctx.fill();
    ctx.strokeStyle = c.hudBorder; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(W - 170, 8, 158, 36, 6); ctx.stroke();

    const sc = s.score >= 0 ? `+${s.score}%` : `${s.score}%`;
    ctx.fillStyle = s.score >= 0 ? '#DC2626' : '#3B82F6';
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(sc, W - 22, 32);

    const hi = parseInt(localStorage.getItem('antrunner_highscore') || '0', 10);
    if (hi > 0) {
      ctx.fillStyle = '#888'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`BEST +${hi}%`, W - 164, 30);
    }

    // SPD 배경
    ctx.fillStyle = c.hudBg;
    ctx.beginPath(); ctx.roundRect(10, 8, 80, 24, 4); ctx.fill();
    ctx.strokeStyle = c.hudBorder; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(10, 8, 80, 24, 4); ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = isDarkRef.current ? '#10B981' : '#047857';
    ctx.font = '11px sans-serif';
    ctx.fillText(`SPD ${s.speed.toFixed(1)}x`, 20, 25);
    ctx.restore();

    if (s.running) raf.current = requestAnimationFrame(loop);
  }, [spawnObs, spawnItem, spawnCloud, spawnParticles]);

  const start = useCallback(() => {
    const s = g.current;
    s.antY = GY - ANT; s.vel = 0; s.jumping = false; s.speed = INIT_SPD;
    s.obs = []; s.items = []; s.texts = []; s.clouds = []; s.particles = [];
    s.blds = genBuildings();
    s.fi = 0; s.ft = 0; s.score = 0; s.base = 0; s.gOff = 0;
    s.running = true; s.last = performance.now();
    s.spawnT = 0; s.itemT = 0; s.cloudT = 0;
    setDisplayScore(0); setGameState('playing');
    setCheerMsg(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(loop);
  }, [loop]);

  const jump = useCallback(() => {
    const s = g.current;
    if (!s.jumping) { s.jumping = true; s.vel = JUMP; }
  }, []);

  const act = useCallback(() => {
    if (gameState === 'idle' || gameState === 'over') start();
    else if (gameState === 'playing') jump();
  }, [gameState, start, jump]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); act(); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [act]);

  useEffect(() => () => { cancelAnimationFrame(raf.current); g.current.running = false; }, []);

  useEffect(() => {
    const cv = canvasRef.current, ct = containerRef.current;
    if (!cv || !ct) return;
    const r = () => { const sc = Math.min(1, ct.clientWidth / W); cv.style.width = `${W * sc}px`; cv.style.height = `${H * sc}px`; };
    r(); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r);
  }, []);

  // idle
  useEffect(() => {
    if (gameState !== 'idle') return;
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const c = isDarkRef.current ? TH.dark : TH.light;

    const sky = ctx.createLinearGradient(0, 0, 0, GY);
    sky.addColorStop(0, c.sky1); sky.addColorStop(1, c.sky2);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GY);

    ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 60) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, GY); ctx.stroke(); }
    for (let j = 0; j < GY; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke(); }

    g.current.blds.filter(b => b.layer === 0).forEach(b => drawBuilding(ctx, b, c));
    g.current.blds.filter(b => b.layer === 1).forEach(b => drawBuilding(ctx, b, c));

    ctx.fillStyle = c.ground; ctx.fillRect(0, GY, W, H - GY);
    ctx.strokeStyle = c.groundLine; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(W, GY); ctx.stroke();
    ctx.strokeStyle = c.dash; ctx.lineWidth = 2; ctx.setLineDash([10, 20]);
    ctx.beginPath(); ctx.moveTo(0, GY + 20); ctx.lineTo(W, GY + 20); ctx.stroke();
    ctx.setLineDash([]);

    const sp = sprites.current[0];
    const draw = () => { if (sp?.complete) { ctx.imageSmoothingEnabled = false; ctx.drawImage(sp, ANT_X, GY - ANT, ANT, ANT); } };
    if (sp?.complete) draw(); else if (sp) sp.onload = draw;
  }, [gameState, theme]);

  const scoreStr = displayScore >= 0 ? `+${displayScore}%` : `${displayScore}%`;
  const scoreColor = displayScore >= 0 ? 'text-red-500' : 'text-blue-500';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Image src="/logo.webp" alt="AntStreet" width={48} height={48} style={{ imageRendering: 'pixelated' }} />
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">개미의 월스트리트 생존기</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          하락장의 장애물을 피하고, 아이템을 먹어 수익률을 올려보세요!
        </p>
      </div>

      <div ref={containerRef} className="relative w-full max-w-[800px] mx-auto cursor-pointer select-none"
        onClick={act} onTouchStart={(e) => { e.preventDefault(); act(); }}>
        <canvas ref={canvasRef} width={W} height={H}
          className="border-[3px] border-[var(--pixel-border-muted)] rounded-lg block mx-auto"
          style={{ imageRendering: 'pixelated' }} />

        {gameState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-lg backdrop-blur-[2px]">
            <Image src="/logo.webp" alt="ant" width={80} height={80} style={{ imageRendering: 'pixelated' }} className="mb-4 animate-bounce" />
            <p className="text-white text-lg font-bold mb-1">SPACE / 탭 / 클릭으로 시작</p>
            <p className="text-gray-300 text-xs">점프로 장애물을 피하고 아이템을 모으세요!</p>
          </div>
        )}

        {gameState === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg backdrop-blur-[2px]">
            <p className="text-[var(--pixel-accent)] text-2xl font-bold mb-2">GAME OVER</p>
            <p className="text-xs text-gray-300 mb-1">최종 수익률</p>
            <p className={`text-4xl font-bold mb-1 ${scoreColor}`}>{scoreStr}</p>
            {displayScore >= highScore && displayScore > 0 && (
              <p className="text-green-400 text-sm mb-2 animate-pulse">NEW HIGH SCORE!</p>
            )}
            <p className="text-gray-300 text-sm mb-3">{cheerMsg}</p>
            <p className="text-gray-400 text-xs">다시 하려면 SPACE / 탭 / 클릭</p>
          </div>
        )}
      </div>

      {/* 수익률 카드 */}
      <div className="mt-4 border-[3px] border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] rounded-lg px-5 py-3 max-w-[420px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">내 수익률</p>
            <p className={`text-2xl font-bold leading-none ${scoreColor}`}>{scoreStr}</p>
          </div>
          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
          <div className="text-right">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">최고 기록</p>
            <p className="text-lg font-bold leading-none text-red-500">+{highScore}%</p>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[600px] mx-auto">
        <div className="border-[3px] border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] rounded-lg p-3">
          <h2 className="text-xs font-bold text-[var(--foreground)] mb-2">장애물</h2>
          <div className="grid grid-cols-5 gap-2 text-center text-[10px] text-gray-500 dark:text-gray-400">
            <div><div className="w-5 h-9 bg-red-500 mx-auto mb-0.5 rounded-sm" /><span>하락봉</span></div>
            <div><div className="w-5 h-7 bg-green-500 mx-auto mb-0.5 rounded-sm" /><span>상승봉</span></div>
            <div><div className="w-7 h-7 bg-purple-500 mx-auto mb-0.5 rounded-full" /><span>Bear</span></div>
            <div><div className="w-9 h-5 border-2 border-red-400 mx-auto mb-0.5 rounded-sm" /><span>폭락</span></div>
            <div><div className="w-6 h-6 bg-gray-700 dark:bg-gray-500 mx-auto mb-0.5 rounded-full" /><span>매도</span></div>
          </div>
        </div>
        <div className="border-[3px] border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] rounded-lg p-3">
          <h2 className="text-xs font-bold text-[var(--foreground)] mb-2">아이템</h2>
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] text-gray-500 dark:text-gray-400">
            <div><div className="w-7 h-7 bg-yellow-500 mx-auto mb-0.5 rounded-full flex items-center justify-center text-white text-[8px] font-bold">+%</div><span>수익률 UP</span></div>
            <div><div className="w-7 h-7 bg-red-500 mx-auto mb-0.5 rounded-full flex items-center justify-center text-white text-[8px] font-bold">x2</div><span>2배</span></div>
            <div><div className="w-7 h-7 bg-blue-500 mx-auto mb-0.5 rounded-full flex items-center justify-center text-white text-[8px] font-bold">/2</div><span>반토막</span></div>
            <div><div className="w-7 h-7 bg-purple-500 mx-auto mb-0.5 rounded-full flex items-center justify-center text-white text-[8px] font-bold">-1</div><span>반전</span></div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[var(--pixel-accent)] transition-colors">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
