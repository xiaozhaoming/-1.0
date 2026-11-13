import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sun,
  Moon,
  Sparkles,
  Download,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Grid,
  X,
  Check,
  Trash2,
} from 'lucide-react';
import {
  WheelCanvas,
  WheelCanvasHandle,
  getSliceIndexAtTopPointer,
} from './components/WheelCanvas';
import { InspectorSidebar } from './components/InspectorSidebar';
import { FloatingAiDrawer } from './components/FloatingAiDrawer';
import { DEFAULT_CONFIG, BORDER_STYLES } from './constants';
import { WheelConfig, ColorScheme, SpinWinner } from './types';
import { playTickSound, playWinChime } from './utils/sound';

const App: React.FC = () => {
  const [config, setConfig] = useState<WheelConfig>(DEFAULT_CONFIG);
  const [textInput, setTextInput] = useState(DEFAULT_CONFIG.items.join('\n'));
  const wheelCanvasRef = useRef<WheelCanvasHandle | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const [stageBackdrop, setStageBackdrop] = useState<'studio' | 'checkerboard'>('studio');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  const [isSpinning, setIsSpinning] = useState(false);
  const [pointerAngle, setPointerAngle] = useState(0);
  const [winner, setWinner] = useState<SpinWinner | null>(null);
  const [exportNotice, setExportNotice] = useState(false);

  const spinRafRef = useRef<number | null>(null);
  const pointerTimeoutRef = useRef<number | null>(null);
  const rotationRef = useRef(config.rotation);

  useEffect(() => {
    rotationRef.current = config.rotation;
  }, [config.rotation]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('wheel-studio-theme', theme);
    } catch {
      // Ignore storage failures
    }
  }, [theme]);

  useEffect(() => {
    return () => {
      if (spinRafRef.current !== null) cancelAnimationFrame(spinRafRef.current);
      if (pointerTimeoutRef.current !== null) window.clearTimeout(pointerTimeoutRef.current);
    };
  }, []);

  const handleTextChange = useCallback((value: string) => {
    setTextInput(value);
    const items = value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');
    setConfig((prev) => ({ ...prev, items }));
    setWinner(null);
  }, []);

  const updateConfig = useCallback((updates: Partial<WheelConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleShuffleItems = useCallback(() => {
    if (isSpinning || config.items.length < 2) return;
    const shuffled = [...config.items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    setTextInput(shuffled.join('\n'));
    setConfig((prev) => ({ ...prev, items: shuffled }));
    setWinner(null);
  }, [config.items, isSpinning]);

  const handleApplyAiPlan = useCallback(
    (items: string[], scheme?: ColorScheme) => {
      setTextInput(items.join('\n'));
      setConfig((prev) => ({
        ...prev,
        items,
        ...(scheme ? { colorScheme: scheme } : {}),
      }));
      setWinner(null);
    },
    []
  );

  const handleExportPng = () => {
    if (!wheelCanvasRef.current || config.items.length === 0) return;
    const dataUrl = wheelCanvasRef.current.exportPngDataUrl(4);
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `wheel-studio-4k-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    setExportNotice(true);
    window.setTimeout(() => setExportNotice(false), 2000);
  };

  const triggerPointerBounce = useCallback((velocityNorm: number) => {
    const kick = -(10 + velocityNorm * 14);
    setPointerAngle(kick);
    if (pointerTimeoutRef.current !== null) {
      window.clearTimeout(pointerTimeoutRef.current);
    }
    pointerTimeoutRef.current = window.setTimeout(() => {
      setPointerAngle(0);
    }, 65);
  }, []);

  const handleSpin = useCallback(() => {
    if (isSpinning || config.items.length === 0) return;

    if (spinRafRef.current !== null) {
      cancelAnimationFrame(spinRafRef.current);
    }

    setWinner(null);
    setIsSpinning(true);

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const startRotation = rotationRef.current;
    const extraTurns = reducedMotion ? 1 : 5 + Math.floor(Math.random() * 4);
    const randomOffset = Math.random() * 360;
    const totalDelta = extraTurns * 360 + randomOffset;
    const duration = reducedMotion ? 850 : 4400 + Math.random() * 900;
    const startTime = performance.now();

    let lastSliceIdx = getSliceIndexAtTopPointer(config.items.length, startRotation);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth quartic ease-out for natural mechanical friction deceleration
      const eased = 1 - Math.pow(1 - progress, 4);
      const currentRot = startRotation + totalDelta * eased;

      rotationRef.current = currentRot;
      setConfig((prev) => ({ ...prev, rotation: currentRot }));

      const currentSliceIdx = getSliceIndexAtTopPointer(config.items.length, currentRot);
      if (currentSliceIdx !== lastSliceIdx) {
        lastSliceIdx = currentSliceIdx;
        const velocityNorm = Math.pow(1 - progress, 2);
        triggerPointerBounce(velocityNorm);
        if (isSoundEnabled) {
          playTickSound(velocityNorm);
        }
      }

      if (progress < 1) {
        spinRafRef.current = requestAnimationFrame(animate);
      } else {
        spinRafRef.current = null;
        setIsSpinning(false);
        setPointerAngle(0);

        const winIdx = getSliceIndexAtTopPointer(config.items.length, currentRot);
        if (winIdx >= 0 && winIdx < config.items.length) {
          const winColor =
            config.colorScheme.colors[winIdx % config.colorScheme.colors.length];
          setWinner({
            index: winIdx,
            label: config.items[winIdx],
            color: winColor,
          });
          if (isSoundEnabled) {
            playWinChime();
          }
        }
      }
    };

    spinRafRef.current = requestAnimationFrame(animate);
  }, [isSpinning, config.items, config.colorScheme.colors, isSoundEnabled, triggerPointerBounce]);

  const handleRemoveWinnerAndContinue = () => {
    if (!winner) return;
    const nextItems = config.items.filter((_, idx) => idx !== winner.index);
    setTextInput(nextItems.join('\n'));
    setConfig((prev) => ({ ...prev, items: nextItems }));
    setWinner(null);
  };

  const currentBorderName =
    BORDER_STYLES.find((b) => b.id === config.borderStyle)?.name ?? config.borderStyle;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#F5F5F7] dark:bg-[#0B0B0F] text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="h-14 shrink-0 px-4 sm:px-6 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-4 z-30">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center shrink-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap shrink-0">
            转盘工作室
          </h1>
        </div>

        {/* Zone 2: Workspace Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto studio-scroll">
          <button
            type="button"
            onClick={() =>
              setStageBackdrop((prev) => (prev === 'studio' ? 'checkerboard' : 'studio'))
            }
            title="切换透明底棋盘格预览"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              stageBackdrop === 'checkerboard'
                ? 'bg-[#0071E3]/12 text-[#0071E3] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF]'
                : 'text-[#6E6E73] dark:text-zinc-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden md:inline">透明预览</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSoundEnabled((prev) => !prev)}
            title={isSoundEnabled ? '关闭拨片音效' : '开启拨片音效'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSoundEnabled
                ? 'text-[#1D1D1F] dark:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                : 'text-[#86868B] dark:text-zinc-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
            }`}
          >
            {isSoundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">{isSoundEnabled ? '音效开' : '静音'}</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            title={theme === 'light' ? '切换深色模式' : '切换明亮模式'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1D1D1F] dark:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {theme === 'light' ? (
              <Moon className="w-3.5 h-3.5" />
            ) : (
              <Sun className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">{theme === 'light' ? '深色' : '浅色'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAiDrawerOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isAiDrawerOpen
                ? 'bg-[#0071E3] text-white'
                : 'bg-black/[0.05] dark:bg-white/[0.09] text-[#1D1D1F] dark:text-zinc-100 hover:bg-black/[0.09] dark:hover:bg-white/[0.15]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 灵感</span>
          </button>
        </div>

        {/* Zone 3: Primary Export Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleExportPng}
            disabled={config.items.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] hover:opacity-90 disabled:opacity-40 text-xs font-semibold transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {exportNotice ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>已导出 4K PNG</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>导出高清 PNG</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Two-Column Studio Workspace */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative">
        <InspectorSidebar
          config={config}
          textInput={textInput}
          isSpinning={isSpinning}
          onTextChange={handleTextChange}
          onUpdateConfig={updateConfig}
          onShuffleItems={handleShuffleItems}
        />

        {/* Expansive Studio Stage Viewport */}
        <main
          className={`flex-1 min-h-0 relative flex flex-col items-center justify-between overflow-hidden ${
            stageBackdrop === 'checkerboard'
              ? 'bg-checkerboard'
              : 'bg-[#F5F5F7] dark:bg-[#0B0B0F]'
          }`}
        >
          {/* Ambient Subtle Apple Mesh Halo in Studio Mode */}
          {stageBackdrop === 'studio' && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-50"
              style={{
                background:
                  theme === 'light'
                    ? 'radial-gradient(circle at 50% 45%, rgba(255,255,255,0.92) 0%, rgba(224,242,254,0.38) 42%, rgba(245,245,247,0) 75%)'
                    : 'radial-gradient(circle at 50% 45%, rgba(56,189,248,0.09) 0%, rgba(168,85,247,0.06) 35%, rgba(11,11,15,0) 70%)',
              }}
            />
          )}

          {/* Subtle Unboxed Metadata Strip */}
          <div className="relative z-10 pt-3 sm:pt-4 px-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-[#6E6E73] dark:text-zinc-400 tabular-nums select-none">
            <span>{config.items.length} 槽位</span>
            <span aria-hidden="true">·</span>
            <span>{config.colorScheme.name}</span>
            <span aria-hidden="true">·</span>
            <span>{currentBorderName}</span>
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
            <span className="hidden sm:inline">4000×4000 透明输出</span>
          </div>

          {/* Center Wheel Assembly */}
          <div className="relative z-10 flex-1 w-full min-h-0 flex items-center justify-center p-4 sm:p-8">
            {config.items.length === 0 ? (
              <div className="max-w-xs w-full p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] text-center space-y-3 shadow-lg">
                <p className="text-sm font-semibold text-[#1D1D1F] dark:text-zinc-100">
                  转盘暂无选项
                </p>
                <p className="text-xs text-[#6E6E73] dark:text-zinc-400 leading-relaxed">
                  请在左侧「内容列表」添加选项，或使用右上角「AI 灵感」一键生成。
                </p>
                <button
                  type="button"
                  onClick={() => handleTextChange(DEFAULT_CONFIG.items.join('\n'))}
                  className="px-4 py-2 rounded-xl bg-[#0071E3] text-white text-xs font-semibold hover:bg-[#0077ED] transition-colors cursor-pointer"
                >
                  恢复默认示例
                </button>
              </div>
            ) : (
              <div className="relative w-full h-full max-w-[540px] max-h-[540px] aspect-square flex items-center justify-center">
                {/* Tactile Top Pointer Needle (12 o'clock) */}
                <div
                  aria-hidden="true"
                  style={{
                    transform: `rotate(${pointerAngle}deg)`,
                    transformOrigin: '50% 24%',
                    transition: 'transform 65ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  className="absolute -top-2 sm:-top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.22)]"
                >
                  <svg width="34" height="44" viewBox="0 0 34 44" fill="none">
                    <defs>
                      <linearGradient id="pointerGlassGrad" x1="0" y1="0" x2="34" y2="44" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="100%" stopColor="#D4D4D8" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M17 42C17 42 4 21.5 4 13C4 5.8203 9.8203 0 17 0C24.1797 0 30 5.8203 30 13C30 21.5 17 42 17 42Z"
                      fill="url(#pointerGlassGrad)"
                      stroke="rgba(0,0,0,0.14)"
                      strokeWidth="1.2"
                    />
                    <circle cx="17" cy="13" r="4.5" fill="#0071E3" />
                  </svg>
                </div>

                <WheelCanvas
                  ref={wheelCanvasRef}
                  config={config}
                  isSpinning={isSpinning}
                  onHubClick={handleSpin}
                />
              </div>
            )}
          </div>

          {/* Primary Stage Action Dock */}
          <div className="relative z-10 pb-5 sm:pb-7 px-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleSpin}
              disabled={isSpinning || config.items.length === 0}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-7 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-50 text-white text-sm font-semibold shadow-[0_10px_28px_rgba(0,113,227,0.32)] transition-all duration-150 active:scale-[0.97] whitespace-nowrap cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isSpinning ? '旋转抽奖中...' : '开始旋转'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isSpinning) return;
                updateConfig({ rotation: 0 });
                setWinner(null);
              }}
              disabled={isSpinning}
              title="重置转盘角度"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.1] hover:bg-white dark:hover:bg-zinc-800 text-xs font-medium text-[#1D1D1F] dark:text-zinc-200 disabled:opacity-40 transition-all whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>归零</span>
            </button>
          </div>

          {/* Winner Reveal Floating Card */}
          {winner && !isSpinning && (
            <div
              role="status"
              aria-live="polite"
              className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-sm p-5 rounded-2xl bg-white/88 dark:bg-zinc-900/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-[0_24px_60px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)] transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 dark:border-white/20"
                    style={{ backgroundColor: winner.color }}
                  />
                  <span className="text-xs font-medium text-[#6E6E73] dark:text-zinc-400">
                    本次抽中
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setWinner(null)}
                  aria-label="关闭结果提示"
                  className="p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#6E6E73] dark:text-zinc-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="mt-2 text-2xl font-bold tracking-tight text-[#1D1D1F] dark:text-white break-words">
                {winner.label}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSpin}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  再抽一次
                </button>
                {config.items.length > 1 && (
                  <button
                    type="button"
                    onClick={handleRemoveWinnerAndContinue}
                    className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-black/[0.05] dark:bg-white/[0.09] hover:bg-black/[0.09] dark:hover:bg-white/[0.15] text-xs font-medium text-[#1D1D1F] dark:text-zinc-200 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    移除并继续
                  </button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Collapsible Floating AI Inspiration Panel */}
        <FloatingAiDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          onApplyPlan={handleApplyAiPlan}
        />
      </div>
    </div>
  );
};

export default App;
