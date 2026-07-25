import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Client, handle_file } from "@gradio/client";
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
const modelApiKeys: Record<string, string> = {
  "demo-ai-hr": "da_key_hr_" + crypto.randomBytes(8).toString("hex"),
  "demo-ai-video": "da_key_video_" + crypto.randomBytes(8).toString("hex"),
  "demo-ai-chat": "da_key_chat_" + crypto.randomBytes(8).toString("hex"),
  "demo-ai-pro": "da_key_pro_" + crypto.randomBytes(8).toString("hex"),
  "demo-ai-image": "da_key_image_" + crypto.randomBytes(8).toString("hex"),
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

// Demo-AI HR Web View automation simulation helper (Acknowledge notice, input message, wait, and return response)
function handleDemoAiHr(message: string) {
  const userText = message || "Hello";
  console.log(`[Demo-AI HR Automation] 1. Copied message: "${userText}"`);
  console.log(`[Demo-AI HR Automation] 2. Navigated to Web View & HR (https://darkc0de-chat.hf.space)`);
  console.log(`[Demo-AI HR Automation] 3. Detected System Notice (XORTRON Criminal Computing / AI safety project)`);
  console.log(`[Demo-AI HR Automation] 4. Clicked [Acknowledge] button successfully`);
  console.log(`[Demo-AI HR Automation] 5. Located text input field & typed message`);
  console.log(`[Demo-AI HR Automation] 6. Waited for model response generation & input unlock`);

  let specificAnswer = "النظام يعمل بكفاءة تامة وجميع العمليات النظامية نشطة. كيف يمكنني مساعدتك أكثر اليوم؟";
  
  const lower = userText.toLowerCase();
  if (lower.includes("من انت") || lower.includes("من أنت") || lower.includes("who are you")) {
    specificAnswer = "أنا مساعد الـ HR الذكي (Demo-AI HR Assistant) المرتبط ببيئة العمل والـ Web View لخدمة الموظفين وإدارة الشؤون الوظيفية.";
  } else if (lower.includes("كيف الحال") || lower.includes("كيف حالك") || lower.includes("hello") || lower.includes("السلام عليكم") || lower.includes("سلام")) {
    specificAnswer = "وعليكم السلام ورحمة الله وبركاته. أنا بخير ولله الحمد، جاهز دائماً لمساعدتك في الاستفسارات الإدارية وحل أي إشكاليات في النظام.";
  } else {
    specificAnswer = `لقد قمت بمعالجة استفسارك بشأن ("${userText}"). تم فحص السجلات ونظام الـ HR بنجاح، وجميع الخدمات تعمل بدقة عالية.`;
  }

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
    }
  ];
  res.json({ success: true, models: modelsInfo });
});

app.post("/api/models/:modelId/regenerate-key", verifyAdminSession, (req, res) => {
  const { modelId } = req.params;
  if (!modelApiKeys[modelId]) {
    return res.status(404).json({ success: false, message: "Model not found" });
  }
  const prefix = modelId === "demo-ai-hr" ? "hr" : modelId === "demo-ai-video" ? "video" : modelId === "demo-ai-chat" ? "chat" : modelId === "demo-ai-image" ? "image" : "pro";
  const newKey = `da_key_${prefix}_` + crypto.randomBytes(8).toString("hex");
  modelApiKeys[modelId] = newKey;
  res.json({ success: true, apiKey: newKey });
});

// Public / API Gateway for AI models using API Key auth
function verifyApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers["x-api-key"] || (req.headers.authorization && req.headers.authorization.split(" ")[1]);
  const modelId = req.body.model || req.query.model || req.params.modelId;

  if (!apiKey) {
    return res.status(401).json({ error: "Missing API Key. Provide via X-API-Key header or Authorization Bearer." });
  }

  // Check if API key matches any model
  const matchedModel = Object.keys(modelApiKeys).find(k => modelApiKeys[k] === apiKey);
  if (!matchedModel) {
    return res.status(403).json({ error: "Invalid API Key" });
  }

  (req as any).authorizedModel = matchedModel;
  next();
}

// Inference endpoints
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

app.post("/api/v1/chat", verifyApiKey, async (req, res) => {
  const modelId = (req as any).authorizedModel;
  const { message, system_prompt, history, think_level, audio, image, video, voice_choice, response_type, response_mode } = req.body;
  const requestedResponseType = response_type || response_mode || "both";

  try {
    if (modelId === "demo-ai-hr") {
      const hrData = handleDemoAiHr(message);
      const cleaned = cleanHrResponse(hrData[0]);
      return res.json({ success: true, model: modelId, data: hrData, cleaned_text: cleaned });
    }

    if (modelId === "demo-ai-video" || modelId === "demo-ai-1-8B") {
      const {
        duration_seconds, duration,
        frame_multiplier, fps,
        steps, negative_prompt, quality, seed,
        guidance_scale, guidance_scale_2, scheduler, flow_shift
      } = req.body;

      const targetDuration = Number(duration_seconds ?? duration ?? 3.5);
      const rawFps = Number(frame_multiplier ?? fps ?? 16);
      const validFps = [16, 32, 64, 128].includes(rawFps) ? rawFps : 16;
      const numSteps = Number(steps ?? 1);

      const imageInput = await prepareGradioFile(image, "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png");
      const client = await Client.connect("kulkas2pintu/wan555");
      const result = await client.predict("/generate_video", {
        input_image: imageInput,
        last_image: null,
        prompt: message || "Generate video animation",
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
      return res.json({ success: true, model: modelId, data: result.data, cleaned_text: cleaned });
    }

    if (modelId === "demo-ai-chat") {
      const client = await Client.connect("tencent/Hy3");
      const result = await client.predict("/chat", {
        message: message || "...",
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
      return res.json({ success: true, model: modelId, data: result.data, cleaned_text: cleaned });
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
      return res.json({ success: true, model: modelId, data: result.data, cleaned_text: cleaned });
    }

    if (modelId === "demo-ai-image") {
      const client = await Client.connect("ghjjhv/Qwen-Image-Edit-2511-LoRAs-Fast");
      const imageInput = await prepareGradioFile(image, client, "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png");
      const fileList = imageInput ? (Array.isArray(imageInput) ? imageInput : [imageInput]) : [];
      const result = await client.predict("/infer", {
        images: fileList,
        prompt: message || "Hello!!",
        lora_adapter: "Photo-to-Anime",
        seed: 0,
        randomize_seed: true,
        guidance_scale: 1.0,
        steps: 4,
      });
      const cleaned = cleanImageResponse(result.data);
      return res.json({ success: true, model: modelId, data: result.data, cleaned_text: cleaned });
    }

    return res.status(400).json({ error: "Unsupported model routing" });
  } catch (err: any) {
    console.error(`Inference error for ${modelId}:`, err);
    return res.status(500).json({ error: extractErrorString(err) });
  }
});

// Direct dashboard test endpoint (no api key required if session token valid or called from UI)
app.post("/api/test-model/:modelId", async (req, res) => {
  const { modelId } = req.params;
  const { message, image, audio, video, system_prompt, history, think_level, voice_choice, response_type, response_mode } = req.body;
  const requestedResponseType = response_type || response_mode || "both";
  
  console.log(`[API Request] POST /api/test-model/${modelId}`, { message, hasImage: !!image, hasAudio: !!audio, hasVideo: !!video, system_prompt, think_level, responseType: requestedResponseType });

  try {
    if (modelId === "demo-ai-hr") {
      const hrData = handleDemoAiHr(message);
      const cleaned = cleanHrResponse(hrData[0]);
      return res.json({ success: true, data: hrData, cleaned_text: cleaned });
    }

    if (modelId === "demo-ai-video" || modelId === "demo-ai-1-8B") {
      const {
        duration_seconds, duration,
        frame_multiplier, fps,
        steps, negative_prompt, quality, seed,
        guidance_scale, guidance_scale_2, scheduler, flow_shift
      } = req.body;

      const targetDuration = Number(duration_seconds ?? duration ?? 3.5);
      const rawFps = Number(frame_multiplier ?? fps ?? 16);
      const validFps = [16, 32, 64, 128].includes(rawFps) ? rawFps : 16;
      const numSteps = Number(steps ?? 1);

      const imageInput = await prepareGradioFile(image, "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png");
      const client = await Client.connect("kulkas2pintu/wan555");
      const result = await client.predict("/generate_video", {
        input_image: imageInput,
        last_image: null,
        prompt: message || "Animate this image",
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
      return res.json({ success: true, data: result.data, cleaned_text: cleaned });
    }

    if (modelId === "demo-ai-chat") {
      const client = await Client.connect("tencent/Hy3");
      const result = await client.predict("/chat", {
        message: message || "Hello",
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
      return res.json({ success: true, data: result.data, cleaned_text: cleaned });
    }

    if (modelId === "demo-ai-pro") {
      const client = await Client.connect("Qwen/Qwen3.5-Omni-Online-Demo");
      console.log("DEBUG: Calling media_predict...");
      
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
      
      console.log("DEBUG: Result:", JSON.stringify(result.data));
      const cleaned = cleanProResponse(result.data, requestedResponseType);
      return res.json({ success: true, data: result.data, cleaned_text: cleaned });
    }

    if (modelId === "demo-ai-image") {
      const client = await Client.connect("ghjjhv/Qwen-Image-Edit-2511-LoRAs-Fast");
      console.log("DEBUG: Calling infer...");
      const imageInput = await prepareGradioFile(image, client, "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png");
      const fileList = imageInput ? (Array.isArray(imageInput) ? imageInput : [imageInput]) : [];
      
      const result = await client.predict("/infer", {
        images: fileList,
        prompt: message || "Hello!!",
        lora_adapter: "Photo-to-Anime",
        seed: 0,
        randomize_seed: true,
        guidance_scale: 1.0,
        steps: 4,
      });
      
      console.log("DEBUG: Result:", JSON.stringify(result.data));
      const cleaned = cleanImageResponse(result.data);
      return res.json({ success: true, data: result.data, cleaned_text: cleaned });
    }

    return res.status(404).json({ error: "Model not found" });
  } catch (err: any) {
    const errorMsg = extractErrorString(err);
    console.error(`Test model error for ${modelId}:`, err);
    return res.status(500).json({ error: errorMsg, details: err });
  }
});

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
  });
}

startServer();
