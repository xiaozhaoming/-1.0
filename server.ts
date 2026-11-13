import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { COLOR_SCHEMES } from './constants.ts';

if (!process.env.GEMINI_API_KEY && fs.existsSync('.env.local')) {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // Ignore env load errors if already configured
  }
}

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT) || 3000;

const availableSchemesSummary = COLOR_SCHEMES.map(
  (s) => `${s.id} (${s.name}: ${s.subtitle})`
).join('; ');

app.post('/api/inspire', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt) {
    res.status(400).json({ error: '请输入想要生成的转盘主题或需求。' });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({
      error: '服务端尚未配置 GEMINI_API_KEY，请在 Settings > Secrets 中完成配置后重试。',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `用户转盘策划需求: "${prompt}"\n可选配色方案列表: ${availableSchemesSummary}`,
      config: {
        systemInstruction:
          '你是一位年轻、审美品位出众的转盘创意策划师。请根据用户需求生成有趣、简练、适合放在转盘扇区上的中文短句选项（4到12个，每个不超过12个字，不要带序号），并用轻松自然的语气回复1-2句话，同时从可选配色方案列表中挑选最贴合该主题气质的一个 scheme ID。',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: '给用户的简短创意说明（1-2句中文）。',
            },
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '转盘扇区选项列表（4-12项，简洁无序号）。',
            },
            recommendedSchemeId: {
              type: Type.STRING,
              description: '从可选配色方案列表中选择的最佳匹配配色ID。',
            },
          },
          required: ['reply', 'items', 'recommendedSchemeId'],
        },
      },
    });

    const rawText = response.text?.trim() || '{}';
    const parsed = JSON.parse(rawText) as {
      reply?: string;
      items?: string[];
      recommendedSchemeId?: string;
    };

    const cleanItems = Array.isArray(parsed.items)
      ? parsed.items
          .map((item) => String(item).replace(/^[-*•\d.]+\s*/, '').trim())
          .filter((item) => item.length > 0 && item.length <= 36)
          .slice(0, 16)
      : [];

    if (cleanItems.length === 0) {
      res.status(502).json({ error: '未能解析出有效转盘选项，请换个描述重试。' });
      return;
    }

    const matchedScheme =
      COLOR_SCHEMES.find((s) => s.id === parsed.recommendedSchemeId) ?? COLOR_SCHEMES[0];

    res.json({
      reply: parsed.reply || `已为你策划 ${cleanItems.length} 个选项，并搭配「${matchedScheme.name}」视觉方案。`,
      items: cleanItems,
      recommendedSchemeId: matchedScheme.id,
      recommendedSchemeName: matchedScheme.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 服务连接异常，请稍后重试。';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  const distDir = path.resolve(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distDir, 'index.html'));
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (process.env.npm_lifecycle_event === 'start' && hasDist);

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch {
      app.use(express.static(distDir));
      app.use((_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  } else {
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
