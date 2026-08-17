import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CHAIN BURST — One Tap Chain Reaction Game" },
      {
        name: "description",
        content:
          "CHAIN BURST is a one-tap chain reaction game. Fire a single burst and chain as many moving balls as you can.",
      },
      { property: "og:title", content: "CHAIN BURST — One Tap Chain Reaction Game" },
      {
        property: "og:description",
        content: "One click, one explosion, endless chains. Beat your best chain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const BALL_COUNT = 30;
const BALL_R = 11;
const MAX_BURST = 78;
const GROW = 1.5;
const HOLD = 26;
const FEVER_AT = 10;
const MAX_PARTICLES = 260;

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  state: "idle" | "burst" | "done";
  r: number;
  life: number;
};

type Burst = { x: number; y: number; r: number; life: number; hue: number; tier: number };

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; hue: number };

const STORE = "chainburst.v1";

// visual-only intensity tier from current chain count
function tierOf(chain: number) {
  if (chain >= FEVER_AT) return 3;
  if (chain >= 6) return 2;
  if (chain >= 3) return 1;
  return 0;
}

function loadStore() {
  const empty = { best: 0, plays: 0, history: [] as number[] };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(STORE);
    if (!raw) return empty;
    const p = JSON.parse(raw);
    // Backward compat: older saves (Round 1/2) only had best + plays.
    // Treat a missing/invalid `history` as an empty array so existing users
    // are not broken — they just start collecting history from this play on.
    const histRaw = Array.isArray(p.history) ? p.history : [];
    const hist = histRaw
      .filter((n: unknown): n is number => typeof n === "number" && Number.isFinite(n))
      .slice(0, 10);
    return {
      best: Number(p.best) || 0,
      plays: Number(p.plays) || 0,
      history: hist,
    };
  } catch {
    return empty;
  }
}

function Index() {
  const [screen, setScreen] = useState<"title" | "game">("title");
  const [best, setBest] = useState(0);
  const [plays, setPlays] = useState(0);

  useEffect(() => {
    const s = loadStore();
    setBest(s.best);
    setPlays(s.plays);
  }, []);

  const persist = useCallback((b: number, p: number) => {
    setBest(b);
    setPlays(p);
    try {
      window.localStorage.setItem(STORE, JSON.stringify({ best: b, plays: p }));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-arena" />
      {screen === "title" ? (
        <Title best={best} plays={plays} onStart={() => setScreen("game")} />
      ) : (
        <Game
          best={best}
          plays={plays}
          persist={persist}
          onTitle={() => setScreen("title")}
        />
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 px-4 py-2 backdrop-blur">
      <div className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-2xl font-bold leading-tight text-foreground">{value}</div>
    </div>
  );
}

function Title({
  best,
  plays,
  onStart,
}: {
  best: number;
  plays: number;
  onStart: () => void;
}) {
  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <div>
        <h1 className="text-glow text-5xl font-black tracking-[0.12em] sm:text-6xl">
          CHAIN&nbsp;BURST
        </h1>
        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          1プレイ1回だけの爆発。動くボールを巻き込んで、連鎖を最大まで伸ばそう。
        </p>
      </div>

      <ol className="w-full space-y-2 rounded-2xl border border-border/60 bg-card/60 p-5 text-left text-sm text-muted-foreground backdrop-blur">
        <li>1. STARTでゲーム開始</li>
        <li>2. 好きな場所を1回だけクリック / タップ</li>
        <li>3. 爆発がボールに触れると連鎖 — 巻き込んだ数がCHAIN</li>
      </ol>

      <button onClick={onStart} className="btn-hero w-full max-w-xs">
        START
      </button>

      <div className="flex gap-3">
        <Stat label="BEST CHAIN" value={best} />
        <Stat label="PLAY COUNT" value={plays} />
      </div>
    </div>
  );
}

function Game({
  best,
  plays,
  persist,
  onTitle,
}: {
  best: number;
  plays: number;
  persist: (b: number, p: number) => void;
  onTitle: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const burstsRef = useRef<Burst[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const firedRef = useRef(false);
  const chainRef = useRef(0);
  const settleRef = useRef(0);
  const shakeRef = useRef(0);
  const flashRef = useRef(0);
  const chainingRef = useRef(false);

  const [chain, setChain] = useState(0);
  const [chaining, setChaining] = useState(false);
  const [fired, setFired] = useState(false);
  const [result, setResult] = useState<null | { chain: number; newBest: boolean }>(null);

  const tier = tierOf(chain);

  const reset = useCallback(() => {
    const { w, h } = sizeRef.current;
    firedRef.current = false;
    chainRef.current = 0;
    settleRef.current = 0;
    shakeRef.current = 0;
    flashRef.current = 0;
    chainingRef.current = false;
    burstsRef.current = [];
    particlesRef.current = [];
    ballsRef.current = Array.from({ length: BALL_COUNT }, () => {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.5 + Math.random() * 1.1;
      return {
        x: BALL_R + Math.random() * Math.max(1, w - BALL_R * 2),
        y: BALL_R + Math.random() * Math.max(1, h - BALL_R * 2),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        hue: 165 + Math.random() * 90,
        state: "idle",
        r: BALL_R,
        life: 0,
      };
    });
    setChain(0);
    setChaining(false);
    setFired(false);
    setResult(null);
  }, []);

  // sizing
  useEffect(() => {
    const el = wrapRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w: r.width, h: r.height };
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (ballsRef.current.length === 0) reset();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [reset]);

  // loop
  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // frame factor: 1 == one 60fps frame. Clamped so tab-switches / stalls
      // never teleport balls through walls.
      const f = Math.min(3, Math.max(0.0001, (now - last) / (1000 / 60)));
      last = now;
      const { w, h } = sizeRef.current;
      const balls = ballsRef.current;
      const bursts = burstsRef.current;
      const parts = particlesRef.current;

      for (const b of balls) {
        if (b.state === "idle") {
          b.x += b.vx * f;
          b.y += b.vy * f;
          if (b.x < BALL_R) (b.x = BALL_R), (b.vx = Math.abs(b.vx));
          if (b.x > w - BALL_R) (b.x = w - BALL_R), (b.vx = -Math.abs(b.vx));
          if (b.y < BALL_R) (b.y = BALL_R), (b.vy = Math.abs(b.vy));
          if (b.y > h - BALL_R) (b.y = h - BALL_R), (b.vy = -Math.abs(b.vy));
        }
      }

      for (let i = bursts.length - 1; i >= 0; i--) {
        const bu = bursts[i]!;
        bu.life += f;
        if (bu.r < MAX_BURST) bu.r = Math.min(MAX_BURST, bu.r + GROW * f);
        for (const b of balls) {
          if (b.state !== "idle") continue;
          const dx = b.x - bu.x;
          const dy = b.y - bu.y;
          if (Math.hypot(dx, dy) < bu.r + b.r) {
            b.state = "burst";
            b.life = 0;
            chainRef.current++;
            setChain(chainRef.current);
            const t = tierOf(chainRef.current);
            bursts.push({ x: b.x, y: b.y, r: 4, life: 0, hue: b.hue, tier: t });
            // visual-only feedback
            shakeRef.current = Math.min(6, shakeRef.current + 1 + t);
            if (chainRef.current === FEVER_AT) flashRef.current = 22;
            // cap total particles so heavy chains never tank the frame rate
            const budget = Math.max(0, MAX_PARTICLES - parts.length);
            const n = Math.min(budget, 5 + t * 4);
            for (let k = 0; k < n; k++) {
              const a = Math.random() * Math.PI * 2;
              const sp = 1 + Math.random() * (1.5 + t);
              parts.push({
                x: b.x,
                y: b.y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: 0,
                max: 24 + t * 8,
                hue: b.hue,
              });
            }
          }
        }
        if (bu.life > MAX_BURST / GROW + HOLD) bursts.splice(i, 1);
      }

      for (const b of balls) {
        if (b.state === "burst") {
          b.life += f;
          if (b.life > 16) b.state = "done";
        }
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]!;
        p.life += f;
        p.x += p.vx * f;
        p.y += p.vy * f;
        const damp = Math.pow(0.95, f);
        p.vx *= damp;
        p.vy *= damp;
        if (p.life > p.max) parts.splice(i, 1);
      }

      shakeRef.current *= Math.pow(0.88, f);
      if (flashRef.current > 0) flashRef.current = Math.max(0, flashRef.current - f);

      const isChaining = firedRef.current && bursts.length > 0;
      if (isChaining !== chainingRef.current) {
        chainingRef.current = isChaining;
        setChaining(isChaining);
      }

      if (firedRef.current && bursts.length === 0 && !result) {
        settleRef.current += f;
        if (settleRef.current > 20) {
          const c = chainRef.current;
          const isBest = c > best;
          persist(isBest ? c : best, plays + 1);
          setResult({ chain: c, newBest: isBest });
        }
      }

      // draw
      const shake = shakeRef.current;
      const ox = shake > 0.2 ? (Math.random() - 0.5) * shake : 0;
      const oy = shake > 0.2 ? (Math.random() - 0.5) * shake : 0;
      ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
      ctx.clearRect(-8, -8, w + 16, h + 16);

      const curTier = tierOf(chainRef.current);

      // fever backdrop (subtle, keeps balls readable)
      if (curTier >= 3) {
        const pulse = 0.05 + 0.03 * Math.sin(Date.now() / 140);
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
        g.addColorStop(0, `hsla(48 100% 60% / ${pulse})`);
        g.addColorStop(1, "hsla(320 100% 60% / 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // particles
      for (const p of parts) {
        const t = 1 - p.life / p.max;
        ctx.fillStyle = `hsla(${p.hue} 100% 78% / ${0.5 * t})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6 * t + 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const b of balls) {
        if (b.state === "done") continue;
        if (b.state === "idle") {
          const g = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, b.r);
          g.addColorStop(0, `hsl(${b.hue} 100% 82%)`);
          g.addColorStop(1, `hsl(${b.hue} 85% 48%)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const t = b.life / 16;
          ctx.strokeStyle = `hsla(${b.hue} 100% 75% / ${1 - t})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r + t * 14, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      for (const bu of bursts) {
        const fade = Math.max(0, 1 - bu.life / (MAX_BURST / GROW + HOLD));
        const t = bu.tier;
        const hue = t >= 3 ? 48 : bu.hue;
        const fill = (0.22 + t * 0.05) * fade;
        const g = ctx.createRadialGradient(bu.x, bu.y, bu.r * 0.3, bu.x, bu.y, bu.r);
        g.addColorStop(0, `hsla(${hue} 100% 70% / ${0.06 * fade})`);
        g.addColorStop(1, `hsla(${hue} 100% 60% / ${fill})`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bu.x, bu.y, bu.r, 0, Math.PI * 2);
        ctx.fill();

        // the hit-radius ring stays the single source of truth, just brighter per tier
        ctx.strokeStyle = `hsla(${hue} 100% ${80 + t * 4}% / ${fade})`;
        ctx.lineWidth = 2 + t * 0.9;
        ctx.stroke();

        // core spark marks the explosion origin clearly
        ctx.fillStyle = `hsla(${hue} 100% 92% / ${0.5 * fade})`;
        ctx.beginPath();
        ctx.arc(bu.x, bu.y, 2 + t, 0, Math.PI * 2);
        ctx.fill();

        // fever: rotating cross flare (thin, does not hide the field)
        if (t >= 3 && fade > 0.2) {
          const a = bu.life * 0.12;
          ctx.strokeStyle = `hsla(48 100% 85% / ${0.35 * fade})`;
          ctx.lineWidth = 1.5;
          for (let k = 0; k < 4; k++) {
            const ang = a + (k * Math.PI) / 2;
            ctx.beginPath();
            ctx.moveTo(bu.x + Math.cos(ang) * bu.r * 0.5, bu.y + Math.sin(ang) * bu.r * 0.5);
            ctx.lineTo(bu.x + Math.cos(ang) * (bu.r + 14), bu.y + Math.sin(ang) * (bu.r + 14));
            ctx.stroke();
          }
        }
      }

      if (flashRef.current > 0) {
        ctx.fillStyle = `hsla(48 100% 70% / ${(flashRef.current / 22) * 0.18})`;
        ctx.fillRect(0, 0, w, h);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [best, plays, persist, result]);

  const onPointer = (e: React.PointerEvent) => {
    if (firedRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    firedRef.current = true;
    setFired(true);
    burstsRef.current.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      r: 6,
      life: 0,
      hue: 190,
      tier: 0,
    });
  };

  const shownBest = result?.newBest ? result.chain : best;

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col gap-3 p-3 sm:p-5">
      <header className="flex items-center justify-between gap-3">
        <button onClick={onTitle} className="btn-ghost">
          ← TITLE
        </button>
        <div className="flex gap-2">
          <Stat label="BEST" value={shownBest} />
          <Stat label="PLAYS" value={plays} />
        </div>
      </header>

      <div
        ref={wrapRef}
        onPointerDown={onPointer}
        data-tier={tier}
        className="field-frame relative flex-1 touch-none select-none overflow-hidden rounded-2xl border border-border/60 bg-field shadow-[0_0_60px_-20px_var(--glow)]"
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {!fired && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="animate-pulse rounded-full border border-border bg-card/80 px-5 py-3 text-sm font-bold tracking-[0.2em] backdrop-blur">
              CLICK / TAP ANYWHERE
            </span>
          </div>
        )}

        {fired && !result && (
          <div
            className="chain-field pointer-events-none absolute left-1/2 top-2 -translate-x-1/2"
            data-tier={tier}
          >
            <div className="chain-field-label">CHAIN</div>
            <div key={chain} className="chain-field-num">
              {chain}
            </div>
          </div>
        )}

        {result && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/75 p-6 backdrop-blur-sm">
            <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
              <div className="text-xs font-semibold tracking-[0.25em] text-muted-foreground">
                RESULT
              </div>
              <div className="mt-2 font-mono text-4xl font-black">
                CHAIN {result.chain}
                <span className="text-muted-foreground"> / {BALL_COUNT}</span>
              </div>
              {result.chain >= FEVER_AT && (
                <div className="mt-1 text-xs font-bold tracking-[0.25em] text-[oklch(0.85_0.17_85)]">
                  FEVER REACHED
                </div>
              )}
              {result.newBest && (
                <div className="text-glow mt-2 text-sm font-black tracking-[0.2em]">
                  NEW BEST!
                </div>
              )}
              <div className="mt-6 space-y-2">
                <button onClick={reset} className="btn-hero w-full">
                  RETRY
                </button>
                <button onClick={onTitle} className="btn-ghost w-full">
                  TITLE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        操作は1プレイにつき1回だけ。連鎖の広がりを見届けよう。
      </p>
    </div>
  );
}
