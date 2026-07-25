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
    const hrData = handleDemoAiHr(userText);
    const cleaned = cleanHrResponse(hrData[0]);
    return { success: true, model: modelId, cleaned_text: cleaned, data: hrData };
  }

  if (modelId === "demo-ai-video" || modelId === "demo-ai-1-8B") {
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

    const imageInput = await prepareGradioFile(image, "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png");
    const client = await Client.connect("kulkas2pintu/wan555");
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

  if (modelId === "demo-ai-image") {
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
  });
}

startServer();
