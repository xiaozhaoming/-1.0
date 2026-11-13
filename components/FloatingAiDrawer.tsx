import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Check, RotateCw } from 'lucide-react';
import { COLOR_SCHEMES } from '../constants';
import { ColorScheme } from '../types';

export interface AiChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  items?: string[];
  recommendedScheme?: ColorScheme;
  error?: boolean;
  retryPrompt?: string;
}

interface FloatingAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPlan: (items: string[], scheme?: ColorScheme) => void;
}

const STARTER_PROMPTS = [
  '周末城市微度假灵感 8项',
  '朋友聚会真心话大冒险 6项',
  '周五团队聚餐吃什么 8项',
  '年会幸运大抽奖 6档奖项',
];

export const FloatingAiDrawer: React.FC<FloatingAiDrawerProps> = ({
  isOpen,
  onClose,
  onApplyPlan,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appliedMsgId, setAppliedMsgId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      content:
        '告诉我转盘的使用场景和选项数量，我会为你策划顺口好玩的文案，并匹配适合的液态玻璃或极光配色方案。',
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    const userMsg: AiChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/inspire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      });

      const data = (await res.json()) as {
        reply?: string;
        items?: string[];
        recommendedSchemeId?: string;
        error?: string;
      };

      if (!res.ok || data.error) {
        throw new Error(data.error || '请求失败，请重试');
      }

      const scheme = COLOR_SCHEMES.find((s) => s.id === data.recommendedSchemeId);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'ai',
          content: data.reply || '已为你生成以下选项：',
          items: data.items,
          recommendedScheme: scheme,
        },
      ]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '连接超时，请稍后重试。';
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'ai',
          content: errMsg,
          error: true,
          retryPrompt: trimmed,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (msg: AiChatMessage, withScheme: boolean) => {
    if (!msg.items?.length) return;
    onApplyPlan(msg.items, withScheme ? msg.recommendedScheme : undefined);
    setAppliedMsgId(msg.id);
    setTimeout(() => setAppliedMsgId(null), 1800);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="AI 灵感策划面板"
      className="fixed inset-x-3 bottom-3 top-16 sm:inset-auto sm:top-18 sm:right-5 sm:bottom-5 sm:w-[372px] z-40 rounded-2xl bg-white/85 dark:bg-zinc-900/85 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-[0_24px_60px_rgba(0,0,0,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.55)] flex flex-col overflow-hidden transition-all duration-200"
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
          <h2 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
            AI 灵感策划师
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="收起灵感面板"
          className="p-1.5 rounded-lg hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[#6E6E73] dark:text-zinc-400 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Starter Prompt Chips */}
      <div className="px-4 py-2.5 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center gap-1.5 overflow-x-auto studio-scroll">
        {STARTER_PROMPTS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={isLoading}
            onClick={() => sendPrompt(preset)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-black/[0.04] dark:bg-white/[0.07] hover:bg-[#0071E3]/10 hover:text-[#0071E3] dark:hover:bg-[#0A84FF]/20 dark:hover:text-[#0A84FF] text-[#1D1D1F] dark:text-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Chat History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto studio-scroll p-4 space-y-3.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#0071E3] text-white'
                  : msg.error
                  ? 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20'
                  : 'bg-black/[0.04] dark:bg-white/[0.07] text-[#1D1D1F] dark:text-zinc-200'
              }`}
            >
              <p>{msg.content}</p>

              {msg.error && msg.retryPrompt && (
                <button
                  type="button"
                  onClick={() => sendPrompt(msg.retryPrompt!)}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-medium hover:bg-red-500 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  重新尝试
                </button>
              )}

              {msg.items && msg.items.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-black/[0.08] dark:border-white/[0.1] space-y-2">
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-[#6E6E73] dark:text-zinc-300">
                    {msg.items.map((it, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-zinc-800/90 text-[#1D1D1F] dark:text-zinc-100 border border-black/[0.05] dark:border-white/[0.08]"
                      >
                        {it}
                      </span>
                    ))}
                  </div>

                  {msg.recommendedScheme && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#6E6E73] dark:text-zinc-400">
                      <span>建议配色:</span>
                      <span className="font-medium text-[#1D1D1F] dark:text-zinc-200">
                        {msg.recommendedScheme.name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApply(msg, true)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {appliedMsgId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          已应用
                        </>
                      ) : (
                        <>应用文案与配色 ({msg.items.length})</>
                      )}
                    </button>
                    {msg.recommendedScheme && (
                      <button
                        type="button"
                        onClick={() => handleApply(msg, false)}
                        className="py-1.5 px-2.5 rounded-lg bg-black/[0.06] dark:bg-white/[0.1] hover:bg-black/[0.1] dark:hover:bg-white/[0.16] text-[#1D1D1F] dark:text-zinc-200 text-xs font-medium whitespace-nowrap cursor-pointer"
                      >
                        仅填文案
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start">
            <div className="rounded-2xl px-3.5 py-2.5 bg-black/[0.04] dark:bg-white/[0.07] space-y-1.5 w-48">
              <div className="h-2.5 rounded bg-black/10 dark:bg-white/15 animate-pulse w-3/4" />
              <div className="h-2.5 rounded bg-black/10 dark:bg-white/15 animate-pulse w-1/2" />
            </div>
          </div>
        )}
      </div>

      {/* Input Footer */}
      <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.08] bg-white/50 dark:bg-zinc-950/50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendPrompt(input)}
            placeholder="例如：8个周末宅家放松提案..."
            className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl bg-black/[0.04] dark:bg-white/[0.08] border border-transparent focus:border-[#0071E3] focus:bg-white dark:focus:bg-zinc-900 text-[#1D1D1F] dark:text-zinc-100 placeholder:text-[#86868B] outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => sendPrompt(input)}
            disabled={isLoading || !input.trim()}
            aria-label="发送给 AI 策划师"
            className="p-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-40 text-white transition-colors shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
