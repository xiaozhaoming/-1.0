import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Shuffle,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  List,
  FileText,
} from 'lucide-react';
import {
  COLOR_SCHEMES,
  SCHEME_CATEGORIES,
  BORDER_STYLES,
  SPOKE_STYLES,
  CHINESE_FONTS,
} from '../constants';
import { WheelConfig, BorderStyle, SpokeStyle, SchemeCategory } from '../types';

interface InspectorSidebarProps {
  config: WheelConfig;
  textInput: string;
  isSpinning: boolean;
  onTextChange: (value: string) => void;
  onUpdateConfig: (updates: Partial<WheelConfig>) => void;
  onShuffleItems: () => void;
}

type InspectorTab = 'content' | 'appearance' | 'typography';

export const InspectorSidebar: React.FC<InspectorSidebarProps> = ({
  config,
  textInput,
  isSpinning,
  onTextChange,
  onUpdateConfig,
  onShuffleItems,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('appearance');
  const [editMode, setEditMode] = useState<'list' | 'bulk'>('list');
  const [newItemText, setNewItemText] = useState('');
  const [schemeCategory, setSchemeCategory] = useState<'all' | SchemeCategory>('all');

  const filteredSchemes =
    schemeCategory === 'all'
      ? COLOR_SCHEMES
      : COLOR_SCHEMES.filter((s) => s.category === schemeCategory);

  const commitItems = (nextItems: string[]) => {
    onTextChange(nextItems.join('\n'));
  };

  const handleAddItem = () => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    commitItems([...config.items, trimmed]);
    setNewItemText('');
  };

  const handleUpdateItem = (index: number, val: string) => {
    const next = [...config.items];
    next[index] = val;
    commitItems(next);
  };

  const handleRemoveItem = (index: number) => {
    const next = config.items.filter((_, idx) => idx !== index);
    commitItems(next);
  };

  const handleMoveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= config.items.length) return;
    const next = [...config.items];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    commitItems(next);
  };

  return (
    <aside className="w-full lg:w-[348px] xl:w-[368px] shrink-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border-b lg:border-b-0 lg:border-r border-black/[0.06] dark:border-white/[0.08] flex flex-col max-h-[46vh] lg:max-h-none lg:h-full z-20">
      {/* Segmented Control Tabs */}
      <div className="px-4 pt-4 pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div
          className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/[0.05] dark:bg-white/[0.07]"
          role="tablist"
          aria-label="检视器面板"
        >
          {(
            [
              { id: 'content', label: '内容列表' },
              { id: 'appearance', label: '配色材质' },
              { id: 'typography', label: '排版结构' },
            ] as { id: InspectorTab; label: string }[]
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-zinc-800 text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs'
                    : 'text-[#6E6E73] dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto studio-scroll px-5 py-4 space-y-6">
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-[#6E6E73] dark:text-zinc-400 tabular-nums">
                <span>共 {config.items.length} 个扇区</span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span>每格 {(config.items.length > 0 ? 360 / config.items.length : 0).toFixed(1)}°</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onShuffleItems}
                  disabled={isSpinning || config.items.length < 2}
                  title="随机打乱顺序"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1D1D1F] dark:text-zinc-200 bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  打乱
                </button>
                <div className="flex items-center p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.07]">
                  <button
                    type="button"
                    onClick={() => setEditMode('list')}
                    title="逐条编辑"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      editMode === 'list'
                        ? 'bg-white dark:bg-zinc-800 text-[#1D1D1F] dark:text-white shadow-2xs'
                        : 'text-[#6E6E73] dark:text-zinc-400'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode('bulk')}
                    title="批量文本"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      editMode === 'bulk'
                        ? 'bg-white dark:bg-zinc-800 text-[#1D1D1F] dark:text-white shadow-2xs'
                        : 'text-[#6E6E73] dark:text-zinc-400'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {editMode === 'list' ? (
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                    placeholder="添加新选项，回车确认..."
                    className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-transparent focus:border-[#0071E3] focus:bg-white dark:focus:bg-zinc-900 text-[#1D1D1F] dark:text-zinc-100 placeholder:text-[#86868B] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!newItemText.trim()}
                    className="px-3 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加
                  </button>
                </div>

                {config.items.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-black/10 dark:border-white/10 rounded-xl text-xs text-[#6E6E73] dark:text-zinc-400">
                    当前暂无选项，请在上方添加或使用右上角 AI 灵感生成
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                    {config.items.map((item, idx) => {
                      const dotColor =
                        config.colorScheme.colors[idx % config.colorScheme.colors.length];
                      return (
                        <div
                          key={`${idx}-${config.items.length}`}
                          className="group flex items-center gap-2 py-2"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10 dark:border-white/15"
                            style={{ backgroundColor: dotColor }}
                          />
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => handleUpdateItem(idx, e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1 text-xs rounded-lg bg-transparent hover:bg-black/[0.03] focus:bg-white dark:hover:bg-white/[0.04] dark:focus:bg-zinc-800 text-[#1D1D1F] dark:text-zinc-100 outline-none focus:ring-1 focus:ring-[#0071E3] transition-colors"
                          />
                          <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveItem(idx, -1)}
                              disabled={idx === 0}
                              aria-label="上移"
                              className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.1] disabled:opacity-25 text-[#6E6E73] dark:text-zinc-400 cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveItem(idx, 1)}
                              disabled={idx === config.items.length - 1}
                              aria-label="下移"
                              className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.1] disabled:opacity-25 text-[#6E6E73] dark:text-zinc-400 cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              aria-label="删除选项"
                              className="p-1 rounded hover:bg-red-500/10 hover:text-red-500 text-[#6E6E73] dark:text-zinc-400 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  className="w-full h-64 p-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-transparent focus:border-[#0071E3] focus:bg-white dark:focus:bg-zinc-900 text-xs leading-relaxed text-[#1D1D1F] dark:text-zinc-100 outline-none resize-none transition-all"
                  value={textInput}
                  onChange={(e) => onTextChange(e.target.value)}
                  placeholder="每行输入一个转盘选项..."
                />
                <p className="text-[11px] text-[#6E6E73] dark:text-zinc-400">
                  每行代表一个独立扇区，留空行将自动过滤。
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-6">
            {/* Color Schemes */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-[#1D1D1F] dark:text-zinc-200">
                  色彩与玻璃主题
                </h2>
                <span className="text-[11px] text-[#6E6E73] dark:text-zinc-400 truncate max-w-[140px]">
                  {config.colorScheme.name}
                </span>
              </div>

              {/* Category filter buttons */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 studio-scroll">
                {SCHEME_CATEGORIES.map((cat) => {
                  const active = schemeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSchemeCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#0071E3] text-white'
                          : 'bg-black/[0.04] dark:bg-white/[0.07] text-[#6E6E73] dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-zinc-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Swatch Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {filteredSchemes.map((scheme) => {
                  const selected = config.colorScheme.id === scheme.id;
                  const swatchColors = scheme.gradientStops
                    ? scheme.gradientStops.map((g) => g[0])
                    : scheme.colors;
                  const conicGradient = `conic-gradient(${swatchColors
                    .map((c, idx) => `${c} ${(idx / swatchColors.length) * 360}deg`)
                    .join(', ')}, ${swatchColors[0]} 360deg)`;

                  return (
                    <button
                      key={scheme.id}
                      type="button"
                      onClick={() =>
                        onUpdateConfig({
                          colorScheme: scheme,
                          ...(config.autoTextColor
                            ? {}
                            : { fontColor: scheme.recommendedTextColor }),
                        })
                      }
                      className={`text-left p-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                        selected
                          ? 'border-[#0071E3] bg-[#0071E3]/[0.06] dark:bg-[#0A84FF]/[0.14]'
                          : 'border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.15] dark:hover:border-white/[0.2] bg-white/60 dark:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="w-6 h-6 rounded-full shrink-0 border border-black/10 dark:border-white/20 shadow-2xs"
                          style={{ background: conicGradient }}
                        />
                        <span className="text-xs font-semibold text-[#1D1D1F] dark:text-zinc-100 truncate">
                          {scheme.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6E6E73] dark:text-zinc-400 truncate">
                        {scheme.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="h-px bg-black/[0.06] dark:bg-white/[0.07]" />

            {/* Bezel Material Grid */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-[#1D1D1F] dark:text-zinc-200">
                  外框物理材质
                </h2>
                <span className="text-[11px] text-[#6E6E73] dark:text-zinc-400 tabular-nums">
                  {config.borderWidth} px
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {BORDER_STYLES.map((style) => {
                  const selected = config.borderStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => onUpdateConfig({ borderStyle: style.id as BorderStyle })}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                        selected
                          ? 'border-[#0071E3] bg-[#0071E3]/[0.06] dark:bg-[#0A84FF]/[0.14]'
                          : 'border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.15] dark:hover:border-white/[0.18]'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-black/15 dark:border-white/20"
                        style={{ background: style.preview }}
                      />
                      <span className="text-[11px] font-medium text-[#1D1D1F] dark:text-zinc-200 truncate">
                        {style.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {config.borderStyle === 'solid' && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[#6E6E73] dark:text-zinc-400">实色边框颜色</span>
                  <input
                    type="color"
                    value={config.borderColor}
                    onChange={(e) => onUpdateConfig({ borderColor: e.target.value })}
                    className="w-8 h-6 rounded cursor-pointer border border-black/10 bg-transparent p-0"
                  />
                </div>
              )}

              <div className="pt-1 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6E6E73] dark:text-zinc-400">外框厚度</span>
                  <span className="font-mono text-[11px] text-[#1D1D1F] dark:text-zinc-200 tabular-nums">
                    {config.borderWidth} px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={64}
                  value={config.borderWidth}
                  onChange={(e) => onUpdateConfig({ borderWidth: Number(e.target.value) })}
                  className="w-full studio-slider"
                />
              </div>
            </section>

            <div className="h-px bg-black/[0.06] dark:bg-white/[0.07]" />

            {/* Spokes & Pegs */}
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-[#1D1D1F] dark:text-zinc-200">
                分割线与精密铆钉
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#6E6E73] dark:text-zinc-400 mb-1">
                    分割线材质
                  </label>
                  <select
                    value={config.spokeStyle}
                    onChange={(e) => onUpdateConfig({ spokeStyle: e.target.value as SpokeStyle })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-transparent focus:border-[#0071E3] text-[#1D1D1F] dark:text-zinc-100 outline-none"
                  >
                    {SPOKE_STYLES.map((s) => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-zinc-900">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-[#6E6E73] dark:text-zinc-400 mb-1">
                    <span>线宽</span>
                    <span className="font-mono tabular-nums">{config.spokeWidth} px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={config.spokeWidth}
                    onChange={(e) => onUpdateConfig({ spokeWidth: Number(e.target.value) })}
                    className="w-full studio-slider mt-2"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between py-1 cursor-pointer">
                <span className="text-xs text-[#1D1D1F] dark:text-zinc-200">
                  显示外圈金属铆钉刻度
                </span>
                <input
                  type="checkbox"
                  checked={config.showPegs}
                  onChange={(e) => onUpdateConfig({ showPegs: e.target.checked })}
                  className="w-4 h-4 accent-[#0071E3] rounded cursor-pointer"
                />
              </label>
            </section>
          </div>
        )}

        {activeTab === 'typography' && (
          <div className="space-y-6">
            {/* Font & Text */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-[#1D1D1F] dark:text-zinc-200">
                  扇区文字排版
                </h2>
                <label className="inline-flex items-center gap-1.5 text-xs text-[#6E6E73] dark:text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showText}
                    onChange={(e) => onUpdateConfig({ showText: e.target.checked })}
                    className="w-3.5 h-3.5 accent-[#0071E3] cursor-pointer"
                  />
                  显示文字
                </label>
              </div>

              <div>
                <label className="block text-[11px] text-[#6E6E73] dark:text-zinc-400 mb-1">
                  字体家族
                </label>
                <select
                  value={config.fontFamily}
                  onChange={(e) => onUpdateConfig({ fontFamily: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-transparent focus:border-[#0071E3] text-[#1D1D1F] dark:text-zinc-100 outline-none"
                >
                  {CHINESE_FONTS.map((f) => (
                    <option key={f.value} value={f.value} className="bg-white dark:bg-zinc-900">
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6E6E73] dark:text-zinc-400">字号大小</span>
                  <span className="font-mono text-[11px] text-[#1D1D1F] dark:text-zinc-200 tabular-nums">
                    {config.fontSize} px
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={44}
                  value={config.fontSize}
                  onChange={(e) => onUpdateConfig({ fontSize: Number(e.target.value) })}
                  className="w-full studio-slider"
                />
              </div>

              <label className="flex items-center justify-between py-1 cursor-pointer">
                <div>
                  <span className="block text-xs text-[#1D1D1F] dark:text-zinc-200">
                    智能对比度反色
                  </span>
                  <span className="block text-[11px] text-[#6E6E73] dark:text-zinc-400">
                    根据各扇区明度自动匹配黑白文字
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.autoTextColor}
                  onChange={(e) => onUpdateConfig({ autoTextColor: e.target.checked })}
                  className="w-4 h-4 accent-[#0071E3] cursor-pointer"
                />
              </label>

              {!config.autoTextColor && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[#6E6E73] dark:text-zinc-400">自定义文字颜色</span>
                  <input
                    type="color"
                    value={config.fontColor}
                    onChange={(e) => onUpdateConfig({ fontColor: e.target.value })}
                    className="w-9 h-7 rounded-md border border-black/10 cursor-pointer bg-transparent p-0"
                  />
                </div>
              )}
            </section>

            <div className="h-px bg-black/[0.06] dark:bg-white/[0.07]" />

            {/* Hub & Rotation */}
            <section className="space-y-4">
              <h2 className="text-xs font-semibold text-[#1D1D1F] dark:text-zinc-200">
                中央轴承与预览角度
              </h2>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6E6E73] dark:text-zinc-400">轴承直径</span>
                  <span className="font-mono text-[11px] text-[#1D1D1F] dark:text-zinc-200 tabular-nums">
                    {config.hubRadius} px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={config.hubRadius}
                  onChange={(e) => onUpdateConfig({ hubRadius: Number(e.target.value) })}
                  className="w-full studio-slider"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6E6E73] dark:text-zinc-400">静态预览角度</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#1D1D1F] dark:text-zinc-200 tabular-nums">
                      {Math.round(((config.rotation % 360) + 360) % 360)}°
                    </span>
                    <button
                      type="button"
                      disabled={isSpinning}
                      onClick={() => onUpdateConfig({ rotation: 0 })}
                      className="p-1 rounded-md hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[#6E6E73] dark:text-zinc-400 disabled:opacity-40 cursor-pointer"
                      title="角度归零"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  disabled={isSpinning}
                  value={Math.round(((config.rotation % 360) + 360) % 360)}
                  onChange={(e) => onUpdateConfig({ rotation: Number(e.target.value) })}
                  className="w-full studio-slider"
                />
              </div>
            </section>

            <div className="h-px bg-black/[0.06] dark:bg-white/[0.07]" />

            {/* Export Options */}
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-[#1D1D1F] dark:text-zinc-200">
                高清导出设置
              </h2>
              <label className="flex items-center justify-between py-1 cursor-pointer">
                <div>
                  <span className="block text-xs text-[#1D1D1F] dark:text-zinc-200">
                    导出 PNG 包含顶部指针
                  </span>
                  <span className="block text-[11px] text-[#6E6E73] dark:text-zinc-400">
                    默认仅导出纯净转盘盘面（4000×4000px）
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.includePointerInExport}
                  onChange={(e) =>
                    onUpdateConfig({ includePointerInExport: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#0071E3] cursor-pointer"
                />
              </label>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
};
