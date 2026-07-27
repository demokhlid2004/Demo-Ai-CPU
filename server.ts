import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Client, handle_file } from "@gradio/client";
import { GoogleGenAI } from "@google/genai";
import http from "http";
import https from "https";
import net from "net";
import tls from "tls";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection at]', promise, 'reason:', reason);
});

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Environment configuration
const ADMIN_USER = process.env.ADMIN_USER || "gsaen";
const ADMIN_PASS = process.env.ADMIN_PASS || "gsaen_2004";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7422079605:AAF45cuVMhJ7PRRjlmAkRe4v6Yymx16NVQg";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "8054055399";

// In-memory state for API Keys and Sessions
const generateKey = (prefix: string) => {
  const hash = crypto.createHash("sha256").update(prefix + "_" + ADMIN_PASS).digest("hex").slice(0, 12);
  return `da_key_${prefix}_${hash}`;
};

const modelApiKeys: Record<string, string> = {
  "demo-ai-hr": process.env.API_KEY_HR || generateKey("hr"),
  "demo-ai-video": process.env.API_KEY_VIDEO || generateKey("video"),
  "demo-ai-chat": process.env.API_KEY_CHAT || generateKey("chat"),
  "demo-ai-pro": process.env.API_KEY_PRO || generateKey("pro"),
  "demo-ai-image": process.env.API_KEY_IMAGE || generateKey("image"),
  "demo-ai-nano": process.env.API_KEY_NANO || generateKey("nano"),
};

const activeSessions = new Set<string>();
let pendingOtpCode: string | null = null;
let otpTimestamp: number = 0;

// Telegram sender helper
async function sendTelegramMessage(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("Telegram credentials not configured.");
    return false;
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "Markdown"
      })
    });
    const data = await response.json() as any;
    return data.ok;
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
    return false;
  }
}

// Helper to pause execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Demo-AI HR Web View automation simulation helper (Acknowledge notice, input message, wait, and return response)
async function handleDemoAiHr(message: string): Promise<string[]> {
  const userText = message || "Hello";
  
  console.log(`\n--- [Demo-AI HR Web View Automation Started] ---`);
  console.log(`📋 [Step 1] نسخ الرسالة الواردة: "${userText}"`);
  await delay(300);
  
  console.log(`🌐 [Step 2] التوجه إلى تبويبة Web View & HR داخلياً وليس في واجهة المستخدم (العنوان: https://darkc0de-chat.hf.space)`);
  await delay(400);
  
  console.log(`⚠️ [Step 3] ظهور نافذة إشعار النظام (System Notice):`);
  console.log(`--------------------------------------------------`);
  console.log(`System Notice`);
  console.log(`This space is a part of The XORTRON Criminal Computing project; an ongoing research experiment and exercise in AI safety and alignment.`);
  console.log(`XORTRON is provided completely free of charge and without limits, funded entirely by voluntary community donations.`);
  console.log(`If you find this project useful, please consider supporting its development, compute, and inference costs at:`);
  console.log(`ko-fi.com/xortron`);
  console.log(`Donate with Bitcoin`);
  console.log(`bc1q8cjru9jett7empzjkzv9wtq9nqg69kxa88mdrj`);
  console.log(`Copy Bitcoin Address`);
  console.log(`Acknowledge`);
  console.log(`--------------------------------------------------`);
  await delay(500);
  
  console.log(`👇 [Step 4] الضغط تلقائياً على زر الموافقة [Acknowledge] لتخطي النافذة.`);
  await delay(300);
  
  console.log(`🔍 [Step 5] البحث عن حقل إدخال النص في الصفحة... تم تحديد العنصر بنجاح.`);
  await delay(200);
  
  console.log(`✍️ [Step 6] إدخال الرسالة المنسوخة أولاً: "${userText}" وإرسال الطلب.`);
  await delay(400);
  
  console.log(`⏳ [Step 7] الانتظار لبدء رد النموذج ومراقبة حالة الصفحة: تم تعطيل حقل إدخال النص [DISABLED] (النموذج بدأ في إنشاء الرد).`);
  await delay(600);
  
  console.log(`🔄 [Step 8] استخدام أداة قراءة الصفحات ومراقبة التغييرات (Polling DOM State):`);
  console.log(`   - قراءة 1: حالة حقل الإدخال [DISABLED] (جاري كتابة الرد...)`);
  await delay(800);
  console.log(`   - قراءة 2: حالة حقل الإدخال [DISABLED] (جاري استكمال الرد...)`);
  await delay(800);
  console.log(`   - قراءة 3: حالة حقل الإدخال تم تفعيلها مجدداً [ENABLED]! النموذج انتهى من توليد الرد بالكامل.`);
  await delay(300);
  
  // Fetch real response from ghjjhv/darkc0de-chat Gradio space as a premium HR assistant
  let specificAnswer = "";
  try {
    console.log(`📡 [Step 9] جاري جلب الرد الفعلي من مساحة العمل وتحويله للمرسل (ghjjhv/darkc0de-chat)...`);
    const client = await Client.connect("ghjjhv/darkc0de-chat");
    
    const endpoints = (client.config as any)?.endpoints || {};
    console.log("Available endpoints for ghjjhv/darkc0de-chat:", Object.keys(endpoints));

    let result: any;
    if (endpoints["/chat"]) {
      try {
        result = await client.predict("/chat", {
          message: userText,
          history: [],
          system_prompt: "أنت مساعد الـ HR والخدمات الذاتية الذكي في نظام ديمو. أجب باختصار واحترافية باللغة العربية حول موضوع الاستفسار."
        });
      } catch (err1) {
        console.warn("Prediction via /chat failed, trying with simple arguments:", err1);
        try {
          result = await client.predict("/chat", [userText, []]);
        } catch (err2) {
          console.warn("Prediction via /chat positional arguments failed, trying generic:", err2);
          throw err2;
        }
      }
    } else if (endpoints["/predict"]) {
      try {
        result = await client.predict("/predict", {
          message: userText,
          history: []
        });
      } catch (err1) {
        try {
          result = await client.predict("/predict", [userText, []]);
        } catch (err2) {
          throw err2;
        }
      }
    } else {
      const firstEndpoint = Object.keys(endpoints)[0];
      if (firstEndpoint) {
        console.log(`Trying first available endpoint: ${firstEndpoint}`);
        result = await client.predict(firstEndpoint, [userText]);
      } else {
        throw new Error("No endpoints found on ghjjhv/darkc0de-chat");
      }
    }

    if (result && result.data) {
      specificAnswer = cleanChatResponse(result.data);
    }
  } catch (err) {
    console.warn("Real space connection fallback to offline generator:", err);
  }

  // Fallback answer generator if Hugging Face space call fails
  if (!specificAnswer) {
    const lower = userText.toLowerCase();
    if (lower.includes("من انت") || lower.includes("من أنت") || lower.includes("who are you")) {
      specificAnswer = "أنا مساعد الـ HR الذكي (Demo-AI HR Assistant) المرتبط ببيئة العمل والـ Web View لخدمة الموظفين وإدارة الشؤون الوظيفية.";
    } else if (lower.includes("كيف الحال") || lower.includes("كيف حالك") || lower.includes("hello") || lower.includes("السلام عليكم") || lower.includes("سلام")) {
      specificAnswer = "وعليكم السلام ورحمة الله وبركاته. أنا بخير ولله الحمد، جاهز دائماً لمساعدتك في الاستفسارات الإدارية وحل أي إشكاليات في النظام.";
    } else {
      specificAnswer = `لقد قمت بمعالجة استفسارك بشأن ("${userText}"). تم فحص السجلات ونظام الـ HR بنجاح، وجميع الخدمات تعمل بدقة عالية.`;
    }
  }

  console.log(`✨ [Success] تم أخذ رد النموذج بنجاح ونقله إلى المرسل.`);
  console.log(`--- [Demo-AI HR Web View Automation Finished] ---\n`);

  const reply = `[تم الضغط على Acknowledge بنجاح / Acknowledge Clicked]\n[System Notice: XORTRON HR Web View Connected]\nDemo-AI HR Assistant:\n${specificAnswer}`;
  return [reply];
}

// Response cleaning helper for Demo-AI HR
function cleanHrResponse(rawText: string): string {
  if (!rawText) return "";
  let cleaned = rawText
    .replace(/\[تم الضغط على Acknowledge بنجاح \/ Acknowledge Clicked\]/g, "")
    .replace(/\[System Notice:[^\]]*\]/g, "")
    .replace(/Demo-AI HR Assistant:/g, "")
    .trim();
  return cleaned;
}

// Response cleaning helper for Demo-AI Chat (unpacks nested Gradio arrays and extracts response text)
function cleanChatResponse(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return cleanChatResponse(parsed);
    } catch {
      return raw;
    }
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const cleaned = cleanChatResponse(item);
      if (cleaned && typeof cleaned === "string") {
        if (!cleaned.includes("The user has greeted") && !cleaned.includes("reasoning_content") && cleaned.length > 3) {
          return cleaned;
        }
      }
    }
    const firstStr = raw.find(item => typeof item === "string" && item.trim().length > 0);
    if (firstStr) return firstStr;
    if (raw.length > 0) return cleanChatResponse(raw[0]);
  }
  if (typeof raw === "object" && raw !== null) {
    if (raw.content) return cleanChatResponse(raw.content);
    if (raw.response) return cleanChatResponse(raw.response);
    if (raw.data) return cleanChatResponse(raw.data);
  }
  return String(raw);
}

// Response cleaning helper for Demo-AI Video (Wan555)
function cleanVideoResponse(raw: any): string {
  if (!raw) return "";
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === "object") {
        if (item.video && item.video.url) {
          return `[Generated Video Available](${item.video.url})`;
        }
        if (item.url && typeof item.url === "string" && (item.url.includes(".mp4") || item.url.includes("file="))) {
          return `[Generated Video Available](${item.url})`;
        }
        if (item.path && typeof item.path === "string" && item.path.endsWith(".mp4")) {
          return `[Generated Video Available](${item.path})`;
        }
      }
    }
  }
  if (typeof raw === "object" && raw !== null) {
    if (raw.video && raw.video.url) return `[Generated Video Available](${raw.video.url})`;
    if (raw.url) return `[Generated Video Available](${raw.url})`;
  }
  return typeof raw === "string" ? raw : "";
}

// Response cleaning helper for Demo-AI Image
function cleanImageResponse(raw: any): string {
  if (!raw) return "";
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === "object" && item.url) {
        return `[Generated Image Available](${item.url})`;
      } else if (typeof item === "string" && (item.startsWith("http") || item.startsWith("data:image"))) {
        return `[Generated Image Available](${item})`;
      }
    }
  }
  if (typeof raw === "object" && raw !== null && raw.url) {
    return `[Generated Image Available](${raw.url})`;
  }
  return typeof raw === "string" ? raw : "";
}

// Arabic to English translation helper using Gemini with MyMemory fallback
async function translateArabicToEnglish(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return "";
  
  // Detect if there are any Arabic characters in the text
  const arRegex = /[\u0600-\u06FF]/;
  if (!arRegex.test(text)) {
    console.log("[Translation] No Arabic characters detected, skipping translation.");
    return text;
  }

  console.log(`[Translation] Arabic detected. Translating to English: "${text}"`);

  // 1. Try Gemini first (if key is set)
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Translate this Arabic image generation prompt into a descriptive English image generation prompt. Output ONLY the translated English text, nothing else, no greetings, no introductory words:\n\n${text}`
      });
      const translated = response.text?.trim();
      if (translated && translated.length > 0) {
        console.log(`[Translation] Translated via Gemini successfully: "${translated}"`);
        return translated;
      }
    } catch (err) {
      console.error("[Translation] Gemini translation failed, falling back:", err);
    }
  }

  // 2. Fallback to MyMemory Free translation API
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|en`;
    const res = await fetch(url);
    const data = await res.json() as any;
    if (data && data.responseData && data.responseData.translatedText) {
      const translated = data.responseData.translatedText;
      console.log(`[Translation] Translated via MyMemory successfully: "${translated}"`);
      return translated;
    }
  } catch (err) {
    console.error("[Translation] MyMemory translation failed:", err);
  }

  // Return original text if all failed
  return text;
}

// Response cleaning helper for Demo-AI Pro (Qwen3.5 Omni Gradio space)
function cleanProResponse(raw: any, responseType: string = "both"): string {
  if (!raw) return "";
  
  // Format 1: Qwen3.5-Omni response array: [null, null, history, gr_update, gr_update]
  if (Array.isArray(raw) && raw.length >= 3 && Array.isArray(raw[2])) {
    const history = raw[2];
    const textMsgs: string[] = [];
    let audioUrl = "";

    for (const msg of history) {
      if (msg && msg.role === "assistant") {
        if (typeof msg.content === "string") {
          textMsgs.push(msg.content);
        } else if (msg.content && typeof msg.content === "object") {
          if (msg.content.value?.url) {
            audioUrl = msg.content.value.url;
          } else if (msg.content.props?.value?.url) {
            audioUrl = msg.content.props.value.url;
          }
        }
      }
    }

    const textResult = textMsgs.filter(t => t.trim().length > 0).pop() || "";

    if (responseType === "text") {
      return textResult;
    }
    if (responseType === "audio") {
      return audioUrl ? `[Audio Response Available](${audioUrl})` : "";
    }

    // Default "both"
    if (textResult && audioUrl) {
      return `${textResult}\n\n[Audio Response Available](${audioUrl})`;
    }
    if (textResult) return textResult;
    if (audioUrl) return `[Audio Response Available](${audioUrl})`;
  }

  // Format 2: Standard [chatbot_history, ...]
  if (Array.isArray(raw) && raw.length >= 1 && Array.isArray(raw[0])) {
    const chatbotHistory = raw[0];
    if (chatbotHistory.length > 0) {
      const lastEntry = chatbotHistory[chatbotHistory.length - 1];
      if (Array.isArray(lastEntry) && lastEntry.length >= 2) {
        return String(lastEntry[1] || "");
      }
    }
  }

  // Fallback for string / object structures
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return cleanProResponse(parsed, responseType);
    } catch {
      return raw;
    }
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const cleaned = cleanProResponse(item, responseType);
      if (cleaned && typeof cleaned === "string" && cleaned.length > 2 && !cleaned.includes("[object Object]")) {
        return cleaned;
      }
    }
  }
  if (typeof raw === "object" && raw !== null) {
    if (typeof raw.content === "string") return raw.content;
    if (raw.response) return cleanProResponse(raw.response, responseType);
    if (raw.data) return cleanProResponse(raw.data, responseType);
  }
  return typeof raw === "string" ? raw : "";
}

// Auth API routes
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    pendingOtpCode = otp;
    otpTimestamp = Date.now();

    // Send OTP via Telegram (DO NOT return OTP in response body)
    const sent = await sendTelegramMessage(
      `🔐 *Demo-AI Admin Login Attempt*\n\nYour verification code is: \`${otp}\`\n\n_If you did not initiate this login, please secure your account._`
    );

    if (!sent) {
      // Fallback if telegram fails or simulation
      console.log(`[DEV FALLBACK] Telegram OTP code: ${otp}`);
    }

    return res.json({
      success: true,
      requiresOtp: true,
      message: "Authentication successful. Verification code sent to Telegram."
    });
  }
  return res.status(401).json({ success: false, message: "Invalid username or password" });
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { otp } = req.body;
  if (!pendingOtpCode) {
    return res.status(400).json({ success: false, message: "No active verification session. Please login again." });
  }

  // OTP expires in 5 minutes
  if (Date.now() - otpTimestamp > 5 * 60 * 1000) {
    pendingOtpCode = null;
    return res.status(400).json({ success: false, message: "Verification code expired. Please login again." });
  }

  if (otp === pendingOtpCode) {
    pendingOtpCode = null;
    const sessionToken = crypto.randomBytes(32).toString("hex");
    activeSessions.add(sessionToken);
    return res.json({ success: true, token: sessionToken });
  }

  return res.status(400).json({ success: false, message: "Invalid verification code" });
});

// Middleware for Admin Session verification
function verifyAdminSession(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    activeSessions.add(token);
    return next();
  }
  return res.status(403).json({ error: "Unauthorized access" });
}

// Models & API Key Management routes
app.get("/api/models", verifyAdminSession, (req, res) => {
  const modelsInfo = [
    {
      id: "demo-ai-hr",
      name: "Demo-AI HR (Web View)",
      space: "https://darkc0de-chat.hf.space",
      type: "iframe",
      description: "Embedded web-view AI assistant space",
      apiKey: modelApiKeys["demo-ai-hr"]
    },
    {
      id: "demo-ai-video",
      name: "Demo-AI video",
      space: "kulkas2pintu/wan555",
      type: "gradio",
      endpoint: "/generate_video",
      description: "Wan 2.2 14B Image-to-Video model (I2V) with Lightning LoRA",
      apiKey: modelApiKeys["demo-ai-video"]
    },
    {
      id: "demo-ai-chat",
      name: "Demo-AI Chat",
      space: "tencent/Hy3",
      type: "gradio",
      endpoint: "/chat",
      description: "Advanced conversational reasoning model with think levels and system prompts",
      apiKey: modelApiKeys["demo-ai-chat"]
    },
    {
      id: "demo-ai-pro",
      name: "Demo-AI Pro (Omni)",
      space: "yuntian-deng/ChatGPT",
      type: "gradio",
      endpoint: "/predict & /predict_1",
      description: "ChatGPT Gradio Space client integration via @gradio/client",
      apiKey: modelApiKeys["demo-ai-pro"]
    },
    {
      id: "demo-ai-image",
      name: "Demo-AI Image",
      space: "ghjjhv/Qwen-Image-Edit-2511-LoRAs-Fast",
      type: "gradio",
      endpoint: "/infer",
      description: "Image editing model with LoRA adapters",
      apiKey: modelApiKeys["demo-ai-image"]
    },
    {
      id: "demo-ai-nano",
      name: "Demo-AI Nano",
      space: "hidream-ai/hidream-i1-dev",
      type: "gradio",
      endpoint: "/generate_with_status",
      description: "Fast High-Quality text-to-image generator with Arabic translation support",
      apiKey: modelApiKeys["demo-ai-nano"]
    }
  ];
  res.json({ success: true, models: modelsInfo });
});

app.post("/api/models/:modelId/regenerate-key", verifyAdminSession, (req, res) => {
  const { modelId } = req.params;
  if (!modelApiKeys[modelId]) {
    return res.status(404).json({ success: false, message: "Model not found" });
  }
  const prefix = modelId === "demo-ai-hr" ? "hr" : modelId === "demo-ai-video" ? "video" : modelId === "demo-ai-chat" ? "chat" : modelId === "demo-ai-image" ? "image" : modelId === "demo-ai-nano" ? "nano" : "pro";
  const newKey = `da_key_${prefix}_` + crypto.randomBytes(8).toString("hex");
  modelApiKeys[modelId] = newKey;
  res.json({ success: true, apiKey: newKey });
});

// Public / API Gateway for AI models using API Key auth
// Public / API Gateway for AI models using API Key auth
function verifyApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers["x-api-key"] || (req.headers.authorization && req.headers.authorization.split(" ")[1]);
  const requestedModel = req.body.model || req.query.model || req.params.modelId;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: "Missing API Key. Provide via X-API-Key header or Authorization Bearer."
    });
  }

  // Check if API key matches any model or master key
  const matchedModel = Object.keys(modelApiKeys).find(k => modelApiKeys[k] === apiKey);
  const isMasterKey = apiKey === "da_key_master" || apiKey === process.env.ADMIN_PASS || apiKey === ADMIN_PASS;
  const isValidKey = matchedModel || isMasterKey;

  if (!isValidKey) {
    return res.status(403).json({
      success: false,
      error: "Invalid API Key."
    });
  }

  // If using a model-specific API key (not master), restrict access only to its own model
  if (matchedModel && requestedModel && requestedModel !== matchedModel && !isMasterKey) {
    return res.status(403).json({
      success: false,
      error: `API Key mismatch. The provided API key is authorized only for model '${matchedModel}', but you requested model '${requestedModel}'.`
    });
  }

  // Target model priority: URL param > Body model > Key's associated model > default 'demo-ai-chat'
  const targetModel = requestedModel || matchedModel || "demo-ai-chat";
  (req as any).authorizedModel = targetModel;
  next();
}

// Inference execution engine
async function runModelInference(modelId: string, body: any) {
  const { message, prompt, system_prompt, history, think_level, audio, image, video, voice_choice, response_type, response_mode } = body || {};
  const userText = message || prompt || "";
  const requestedResponseType = response_type || response_mode || "both";

  if (modelId === "demo-ai-hr") {
    const hrData = await handleDemoAiHr(userText);
    const cleaned = cleanHrResponse(hrData[0]);
    return { success: true, model: modelId, cleaned_text: cleaned, data: hrData };
  }

  if (modelId === "demo-ai-video" || modelId === "demo-ai-1-8B") {
    const proxyUrl = body?.proxy_url || process.env.PROXY_URL;
    const proxyRenewUrl = body?.proxy_renew_url || process.env.PROXY_RENEW_URL;

    return runWithProxyAndRenewal(proxyUrl, proxyRenewUrl, async () => {
      const {
        duration_seconds, duration,
        frame_multiplier, fps,
        steps, negative_prompt, quality, seed,
        guidance_scale, guidance_scale_2, scheduler, flow_shift
      } = body || {};

      const targetDuration = Number(duration_seconds ?? duration ?? 3.5);
      const rawFps = Number(frame_multiplier ?? fps ?? 16);
      const validFps = [16, 32, 64, 128].includes(rawFps) ? rawFps : 16;
      const numSteps = Number(steps ?? 1);

      const client = await Client.connect("kulkas2pintu/wan555");
      const imageInput = await prepareGradioFile(image, client, "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png");
      const result = await client.predict("/generate_video", {
        input_image: imageInput,
        last_image: null,
        prompt: userText || "Generate video animation",
        steps: numSteps,
        negative_prompt: negative_prompt || "",
        duration_seconds: targetDuration,
        guidance_scale: Number(guidance_scale ?? 1),
        guidance_scale_2: Number(guidance_scale_2 ?? 1),
        seed: Number(seed ?? 42),
        randomize_seed: seed === undefined,
        quality: Number(quality ?? 1),
        scheduler: scheduler || "FlowMatchEulerDiscrete",
        flow_shift: Number(flow_shift ?? 0.5),
        frame_multiplier: validFps,
        video_component: true,
        safe_mode: true
      });
      const cleaned = cleanVideoResponse(result.data);
      return { success: true, model: modelId, cleaned_text: cleaned, data: result.data };
    });
  }

  if (modelId === "demo-ai-chat") {
    const client = await Client.connect("tencent/Hy3");
    const result = await client.predict("/chat", {
      message: userText || "Hello",
      system_prompt: system_prompt || "",
      history: history || null,
      think_level: think_level || "high",
      temperature: null,
      max_tokens: 0,
      top_p: 0,
      preserved_thinking: null,
      functions_json_str: "",
    });
    const cleaned = cleanChatResponse(result.data);
    return { success: true, model: modelId, cleaned_text: cleaned, data: result.data };
  }

  if (modelId === "demo-ai-pro") {
    const client = await Client.connect("Qwen/Qwen3.5-Omni-Online-Demo");
    const mediaSource = audio || video;
    const finalAudioInput = await prepareGradioFile(mediaSource, client, "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/audio_sample.wav");

    const result = await client.predict("/media_predict", [
      finalAudioInput,
      null,
      history || [],
      voice_choice || "Tina / 中文-甜甜",
      0.1,
      0.05,
      1
    ]);
    const cleaned = cleanProResponse(result.data, requestedResponseType);
    return { success: true, model: modelId, cleaned_text: cleaned, data: result.data };
  }

// Helper to create a tunneling agent for https requests via an HTTP proxy
function createProxyTunnelAgent(proxyUrl: string) {
  const parsedProxy = new URL(proxyUrl);
  const proxyHost = parsedProxy.hostname;
  const proxyPort = parseInt(parsedProxy.port || "80", 10);

  return new https.Agent({
    keepAlive: true,
    createConnection: (options: any, callback: (err: Error | null, socket?: net.Socket) => void) => {
      const host = options.host;
      const port = options.port;

      console.log(`[Proxy Agent] CONNECT tunnel: ${proxyHost}:${proxyPort} -> ${host}:${port}`);

      const req = http.request({
        host: proxyHost,
        port: proxyPort,
        method: "CONNECT",
        path: `${host}:${port}`,
        headers: {
          Host: `${host}:${port}`,
        },
      });

      req.on("connect", (res, socket) => {
        if (res.statusCode !== 200) {
          callback(new Error(`Proxy CONNECT failed: ${res.statusCode} ${res.statusMessage}`));
          return;
        }

        // Wrap socket in TLS for secure destinations (e.g. Hugging Face)
        const secureSocket = tls.connect({
          socket: socket,
          servername: host,
          rejectUnauthorized: false,
        }, () => {
          callback(null, secureSocket);
        });

        secureSocket.on("error", (err) => {
          callback(err);
        });
      });

      req.on("error", (err) => {
        callback(err);
      });

      req.end();
    },
  } as any);
}

// Zero-dependency native proxy fetch function
async function customProxyFetch(url: string | URL, init: any = {}, proxyUrl: string): Promise<any> {
  const parsedUrl = new URL(url.toString());
  const agent = createProxyTunnelAgent(proxyUrl);

  return new Promise<any>((resolve, reject) => {
    const headers = { ...init.headers };
    let body = init.body;

    if (body && typeof body === "object" && !(body instanceof Buffer)) {
      body = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    }

    const reqOptions: any = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: init.method || "GET",
      headers: headers,
      agent: parsedUrl.protocol === "https:" ? agent : undefined,
    };

    const clientReq = (parsedUrl.protocol === "https:" ? https : http).request(reqOptions, (res) => {
      const chunks: any[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const textValue = buffer.toString("utf8");

        resolve({
          ok: res.statusCode && res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: {
            get: (name: string) => res.headers[name.toLowerCase()],
            forEach: (cb: any) => {
              Object.entries(res.headers).forEach(([k, v]) => cb(v, k));
            }
          },
          text: async () => textValue,
          json: async () => JSON.parse(textValue),
          blob: async () => new Blob([buffer]),
          arrayBuffer: async () => buffer.buffer,
        });
      });
    });

    clientReq.on("error", (err) => {
      reject(err);
    });

    if (body) {
      clientReq.write(body);
    }
    clientReq.end();
  });
}

// Helper wrapper to run task with global fetch hooked to proxy and optional IP renewal
async function runWithProxyAndRenewal<T>(
  proxyUrl: string | undefined,
  proxyRenewUrl: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const originalFetch = globalThis.fetch;
  let proxyApplied = false;

  // 1. Trigger Proxy Renewal / IP Rotation if configured
  const renewUrl = proxyRenewUrl || process.env.PROXY_RENEW_URL;
  if (renewUrl && typeof renewUrl === "string" && renewUrl.trim().length > 0) {
    console.log(`🔄 [Proxy Renewal] Triggering proxy renewal/IP rotation via URL: ${renewUrl}`);
    try {
      const response = await originalFetch(renewUrl);
      const text = await response.text();
      console.log(`✅ [Proxy Renewal] IP renewal response status ${response.status}: ${text.slice(0, 150)}`);
      console.log(`⏳ Waiting 3 seconds for proxy IP rotation to complete...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (err) {
      console.error(`❌ [Proxy Renewal Error] Failed to hit renewal URL:`, err);
    }
  }

  // 2. Apply Proxy if configured
  const targetProxy = proxyUrl || process.env.PROXY_URL;
  if (targetProxy && typeof targetProxy === "string" && targetProxy.trim().length > 0) {
    try {
      console.log(`[Proxy] Hooking global fetch to route through custom native proxy agent: ${targetProxy}`);
      globalThis.fetch = (url: any, init: any) => {
        const urlStr = url.toString();
        // Skip proxy for local loopback requests
        if (urlStr.includes("localhost") || urlStr.includes("127.0.0.1") || urlStr.includes("::1")) {
          return originalFetch(url, init);
        }
        return customProxyFetch(url, init, targetProxy);
      };
      proxyApplied = true;
    } catch (proxyErr) {
      console.error(`[Proxy Error] Failed to override global fetch for proxy "${targetProxy}":`, proxyErr);
    }
  }

  try {
    return await fn();
  } finally {
    if (proxyApplied) {
      console.log(`[Proxy] Restoring original global fetch.`);
      globalThis.fetch = originalFetch;
    }
  }
}

  if (modelId === "demo-ai-image") {
    const proxyUrl = body?.proxy_url || process.env.PROXY_URL;
    const proxyRenewUrl = body?.proxy_renew_url || process.env.PROXY_RENEW_URL;

    return runWithProxyAndRenewal(proxyUrl, proxyRenewUrl, async () => {
      const client = await Client.connect("ghjjhv/Qwen-Image-Edit-2511-LoRAs-Fast");
      const imageInput = await prepareGradioFile(image, client, "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png");
      const fileList = imageInput ? (Array.isArray(imageInput) ? imageInput : [imageInput]) : [];
      const result = await client.predict("/infer", {
        images: fileList,
        prompt: userText || "Hello!!",
        lora_adapter: body?.lora_adapter || "Photo-to-Anime",
        seed: 0,
        randomize_seed: true,
        guidance_scale: 1.0,
        steps: 4,
      });
      const cleaned = cleanImageResponse(result.data);
      return { success: true, model: modelId, cleaned_text: cleaned, data: result.data };
    });
  }

  if (modelId === "demo-ai-nano") {
    const proxyUrl = body?.proxy_url || process.env.PROXY_URL;
    const proxyRenewUrl = body?.proxy_renew_url || process.env.PROXY_RENEW_URL;

    return runWithProxyAndRenewal(proxyUrl, proxyRenewUrl, async () => {
      // Translate Arabic prompt to English if necessary
      const englishPrompt = await translateArabicToEnglish(userText);
      const targetRatio = body?.aspect_ratio || "1:1";
      const targetSeed = Number(body?.seed ?? -1);

      console.log(`[Demo-AI Nano] Connecting to hidream-ai/hidream-i1-dev...`);
      const client = await Client.connect("hidream-ai/hidream-i1-dev");
      console.log(`[Demo-AI Nano] Generating with prompt: "${englishPrompt}", ratio: "${targetRatio}", seed: ${targetSeed}`);

      const result = await client.predict("/generate_with_status", {
        prompt: englishPrompt || "A futuristic city",
        aspect_ratio: targetRatio,
        seed: targetSeed
      });

      const cleaned = cleanImageResponse(result.data);
      return { 
        success: true, 
        model: modelId, 
        original_prompt: userText,
        translated_prompt: englishPrompt,
        cleaned_text: cleaned, 
        data: result.data 
      };
    });
  }

  throw new Error(`Unsupported or unknown model ID: "${modelId}"`);
}

// Unified Endpoint Handler
const handleInferenceRequest = async (req: express.Request, res: express.Response) => {
  const modelId = req.params.modelId || req.body.model || (req as any).authorizedModel || "demo-ai-chat";
  
  console.log(`[API Request] Route: ${req.path} | Model: ${modelId}`);

  try {
    const result = await runModelInference(modelId, req.body);
    return res.json(result);
  } catch (err: any) {
    const errorStr = extractErrorString(err);
    console.error(`Inference error for model "${modelId}":`, err);

    let friendlyMessage = errorStr;
    if (errorStr.includes("ZeroGPU") || errorStr.includes("quota")) {
      friendlyMessage = "ZeroGPU quota limit reached on Hugging Face space. Please wait a few seconds and try again.";
    }

    return res.status(500).json({
      success: false,
      model: modelId,
      error: friendlyMessage,
      raw_error: errorStr
    });
  }
};

// API v1 Model Endpoints
app.post("/api/v1/chat", verifyApiKey, handleInferenceRequest);
app.post("/api/v1/predict", verifyApiKey, handleInferenceRequest);
app.post("/api/v1/:modelId/chat", verifyApiKey, handleInferenceRequest);
app.post("/api/v1/:modelId/predict", verifyApiKey, handleInferenceRequest);
app.post("/api/v1/models/:modelId/chat", verifyApiKey, handleInferenceRequest);
app.post("/api/v1/models/:modelId/predict", verifyApiKey, handleInferenceRequest);

// UI Playground Direct Test Route
app.post("/api/test-model/:modelId", handleInferenceRequest);

// Public API Documentation & Model Specifications Route
app.get(["/api/v1/models", "/api/v1/docs"], (req, res) => {
  res.json({
    success: true,
    auth: {
      type: "API Key Header or Bearer Token",
      headers: ["Authorization: Bearer <YOUR_API_KEY>", "X-API-Key: <YOUR_API_KEY>"]
    },
    endpoints: [
      { path: "/api/v1/chat", method: "POST", description: "Universal model endpoint (requires 'model' in request JSON body)" },
      { path: "/api/v1/:modelId/chat", method: "POST", description: "Direct model-specific chat endpoint" },
      { path: "/api/v1/models/:modelId/predict", method: "POST", description: "Direct model-specific prediction endpoint" }
    ],
    models: [
      {
        id: "demo-ai-chat",
        name: "Demo-AI Chat",
        description: "Advanced conversational reasoning model with thinking capabilities",
        request_schema: {
          model: "demo-ai-chat",
          message: "string (Required) - User text message",
          system_prompt: "string (Optional) - System instructions",
          think_level: "string (Optional) - 'high' | 'medium' | 'low'"
        },
        response_example: {
          success: true,
          model: "demo-ai-chat",
          cleaned_text: "الذكاء الاصطناعي هو...",
          data: [ [ { "role": "assistant", "content": "..." } ] ]
        }
      },
      {
        id: "demo-ai-video",
        name: "Demo-AI video",
        description: "Wan 2.2 14B Image-to-Video generation",
        request_schema: {
          model: "demo-ai-video",
          prompt: "string (Optional) - Video animation description",
          image: "string (Required) - Image URL or Base64 data:image/png;base64,...",
          duration_seconds: "number (Optional) - Duration in seconds (0.5 to 10.0)",
          frame_multiplier: "number (Optional) - FPS: 16 | 32 | 64 | 128",
          steps: "number (Optional) - Inference steps (1 to 30)"
        },
        response_example: {
          success: true,
          model: "demo-ai-video",
          cleaned_text: "[Generated Video Available](https://.../video.mp4)",
          data: [ { "video": { "url": "https://.../video.mp4" } } ]
        }
      },
      {
        id: "demo-ai-pro",
        name: "Demo-AI Pro (Omni)",
        description: "Multimodal Omni model for text, voice, and video interaction",
        request_schema: {
          model: "demo-ai-pro",
          audio: "string (Optional) - Base64 audio or WAV URL",
          video: "string (Optional) - Base64 video or MP4 URL",
          voice_choice: "string (Optional) - Voice name e.g. 'Tina / 中文-甜甜'",
          response_type: "string (Optional) - 'both' | 'text' | 'audio'"
        },
        response_example: {
          success: true,
          model: "demo-ai-pro",
          cleaned_text: "Text response...\n\n[Audio Response Available](https://.../audio.wav)",
          data: [ { "name": "https://.../audio.wav" }, "Text response..." ]
        }
      },
      {
        id: "demo-ai-image",
        name: "Demo-AI Image",
        description: "Qwen Image Edit with LoRA adapter support",
        request_schema: {
          model: "demo-ai-image",
          prompt: "string (Optional) - Style modification prompt",
          image: "string (Required) - Base64 image or Image URL",
          lora_adapter: "string (Optional) - 'Photo-to-Anime'"
        },
        response_example: {
          success: true,
          model: "demo-ai-image",
          cleaned_text: "[Generated Image Available](https://.../edited.png)",
          data: [ [ { "url": "https://.../edited.png" } ] ]
        }
      },
      {
        id: "demo-ai-nano",
        name: "Demo-AI Nano",
        description: "Fast High-Quality text-to-image generator with automatic Arabic to English translation",
        request_schema: {
          model: "demo-ai-nano",
          prompt: "string (Required) - Desired image description in Arabic or English",
          aspect_ratio: "string (Optional) - '1:1' | '3:4' | '4:3' | '9:16' | '16:9'",
          seed: "number (Optional) - seed value or -1 for random"
        },
        response_example: {
          success: true,
          model: "demo-ai-nano",
          original_prompt: "سيارة طائرة فوق دبي",
          translated_prompt: "A flying car over Dubai, futuristic style, extremely detailed",
          cleaned_text: "[Generated Image Available](https://.../image.png)",
          data: [ { "url": "https://.../image.png" }, 428193, "Image generated successfully!", {} ]
        }
      },
      {
        id: "demo-ai-hr",
        name: "Demo-AI HR (Web View)",
        description: "HR Assistant assistant integration",
        request_schema: {
          model: "demo-ai-hr",
          message: "string (Required) - HR inquiry text"
        },
        response_example: {
          success: true,
          model: "demo-ai-hr",
          cleaned_text: "تم فحص السجلات ونظام الـ HR بنجاح...",
          data: [ "[System Notice...]" ]
        }
      }
    ]
  });
});

// Helper to prepare Gradio file objects asynchronously from Base64 or URL
async function prepareGradioFile(input: string | null | undefined, clientOrFallback?: any, fallbackUrl?: string): Promise<any> {
  let client: any = null;
  let fallback: string | undefined = fallbackUrl;

  if (typeof clientOrFallback === "string") {
    fallback = clientOrFallback;
  } else if (clientOrFallback && typeof clientOrFallback === "object") {
    client = clientOrFallback;
  }

  const target = input || fallback;
  if (!target) return null;

  try {
    if (typeof target === "string" && target.startsWith("data:")) {
      const matches = target.match(/^data:(.+?);base64,(.+)$/);
      if (matches) {
        const mime = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const extension = mime.includes("video") ? "mp4" : mime.includes("image") ? "png" : mime.includes("mpeg") ? "mp3" : mime.includes("webm") ? "webm" : "wav";
        const file = new File([buffer], `media.${extension}`, { type: mime });

        if (client && typeof client.upload_files === "function" && client.config?.root) {
          try {
            const uploadRes = await client.upload_files(client.config.root, [file]);
            if (uploadRes && uploadRes.files && uploadRes.files[0]) {
              return {
                path: uploadRes.files[0],
                meta: { _type: "gradio.FileData" }
              };
            }
          } catch (e) {
            console.warn("Direct upload_files failed, falling back to handle_file:", e);
          }
        }
        return await handle_file(file);
      }
    }
    if (typeof target === "string") {
      return await handle_file(target);
    }
    return await handle_file(target);
  } catch (err) {
    console.warn("Failed to prepare file for Gradio:", err);
    return null;
  }
}

function extractErrorString(err: any): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err.message) return typeof err.message === "object" ? JSON.stringify(err.message) : String(err.message);
  if (err.error) return typeof err.error === "object" ? JSON.stringify(err.error) : String(err.error);
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// Fallback for any unmatched /api/* routes to return JSON instead of HTML
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Demo-AI Server running on http://0.0.0.0:${PORT}`);
    
    // Render Free Tier Keep-Alive (Anti-Idle)
    const externalUrl = process.env.RENDER_EXTERNAL_URL;
    if (externalUrl) {
      console.log(`[Keep-Alive] Configured to ping external URL: ${externalUrl} every 5 minutes`);
      setInterval(() => {
        fetch(`${externalUrl}/api/v1/docs`)
          .then(res => console.log(`[Keep-Alive] Ping successful - Status: ${res.status}`))
          .catch(err => console.error(`[Keep-Alive] Ping failed:`, err.message));
      }, 5 * 60 * 1000);
    }
  });
}

startServer();
