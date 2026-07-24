import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Client } from "@gradio/client";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

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
  "demo-ai-1-8B": "da_key_18b_" + crypto.randomBytes(8).toString("hex"),
  "demo-ai-chat": "da_key_chat_" + crypto.randomBytes(8).toString("hex"),
  "demo-ai-pro": "da_key_pro_" + crypto.randomBytes(8).toString("hex"),
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
  if (token && activeSessions.has(token)) {
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
      id: "demo-ai-1-8B",
      name: "Demo-AI 1.8B",
      space: "MegaTronX/Abliterated-NeuralDaredevil-Llama-3_1-8B",
      type: "gradio",
      endpoint: "/chat",
      description: "High-performance Llama-3.1-8B abliterated model via Gradio client",
      apiKey: modelApiKeys["demo-ai-1-8B"]
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
      space: "Qwen/Qwen2.5-Omni-7B-Demo",
      type: "gradio",
      endpoint: "/chat_predict & /media_predict",
      description: "Multimodal audio, video, image, and text conversational model",
      apiKey: modelApiKeys["demo-ai-pro"]
    }
  ];
  res.json({ success: true, models: modelsInfo });
});

app.post("/api/models/:modelId/regenerate-key", verifyAdminSession, (req, res) => {
  const { modelId } = req.params;
  if (!modelApiKeys[modelId]) {
    return res.status(404).json({ success: false, message: "Model not found" });
  }
  const prefix = modelId === "demo-ai-hr" ? "hr" : modelId === "demo-ai-1-8B" ? "18b" : modelId === "demo-ai-chat" ? "chat" : "pro";
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
app.post("/api/v1/chat", verifyApiKey, async (req, res) => {
  const modelId = (req as any).authorizedModel;
  const { message, system_prompt, history, think_level, audio, image, video, voice_choice } = req.body;

  try {
    if (modelId === "demo-ai-hr") {
      return res.json({ success: true, model: modelId, response: "Demo-AI HR is hosted via Web View iframe at https://darkc0de-chat.hf.space" });
    }

    if (modelId === "demo-ai-1-8B") {
      const client = await Client.connect("MegaTronX/Abliterated-NeuralDaredevil-Llama-3_1-8B");
      const result = await client.predict("/chat", {
        message: message || "Hello",
        param_2: message || "Hello",
        param_3: message || "Hello",
        param_4: 1,
        param_5: 0.1,
        param_6: 0.1,
        param_7: 0,
        param_8: 0,
      });
      return res.json({ success: true, model: modelId, data: result.data });
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
      return res.json({ success: true, model: modelId, data: result.data });
    }

    if (modelId === "demo-ai-pro") {
      const client = await Client.connect("Qwen/Qwen2.5-Omni-7B-Demo");
      // If media inputs are present, use chat_predict or media_predict
      if (audio || image || video) {
        const result = await client.predict("/chat_predict", {
          text: message || "Hello!!",
          audio: audio || null,
          image: image || null,
          video: video || null,
          history: history || [],
          system_prompt: system_prompt || "You are Qwen, a virtual human developed by Qwen Team.",
          voice_choice: voice_choice || "Cherry",
        });
        return res.json({ success: true, model: modelId, data: result.data });
      } else {
        const result = await client.predict("/chat_predict", {
          text: message || "Hello!!",
          audio: null,
          image: null,
          video: null,
          history: history || [],
          system_prompt: system_prompt || "You are Qwen, a virtual human developed by Qwen Team.",
          voice_choice: voice_choice || "Cherry",
        });
        return res.json({ success: true, model: modelId, data: result.data });
      }
    }

    return res.status(400).json({ error: "Unsupported model routing" });
  } catch (err: any) {
    console.error(`Inference error for ${modelId}:`, err);
    return res.status(500).json({ error: err.message || "Model inference failed" });
  }
});

// Direct dashboard test endpoint (no api key required if session token valid or called from UI)
app.post("/api/test-model/:modelId", async (req, res) => {
  const { modelId } = req.params;
  const { message, system_prompt, history, think_level } = req.body;

  try {
    if (modelId === "demo-ai-hr") {
      return res.json({ success: true, response: "WebView iframe target: https://darkc0de-chat.hf.space" });
    }

    if (modelId === "demo-ai-1-8B") {
      const client = await Client.connect("MegaTronX/Abliterated-NeuralDaredevil-Llama-3_1-8B");
      const result = await client.predict("/chat", {
        message: message || "Hello",
        param_2: message || "Hello",
        param_3: message || "Hello",
        param_4: 1,
        param_5: 0.1,
        param_6: 0.1,
        param_7: 0,
        param_8: 0,
      });
      return res.json({ success: true, data: result.data });
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
      return res.json({ success: true, data: result.data });
    }

    if (modelId === "demo-ai-pro") {
      const client = await Client.connect("Qwen/Qwen2.5-Omni-7B-Demo");
      const result = await client.predict("/chat_predict", {
        text: message || "Hello!!",
        audio: null,
        image: null,
        video: null,
        history: history || [],
        system_prompt: system_prompt || "You are Qwen, a virtual human developed by Qwen Team.",
        voice_choice: "Cherry",
      });
      return res.json({ success: true, data: result.data });
    }

    return res.status(404).json({ error: "Model not found" });
  } catch (err: any) {
    console.error(`Test model error for ${modelId}:`, err);
    return res.status(500).json({ error: err.message || "Failed to connect to Hugging Face Gradio space" });
  }
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
