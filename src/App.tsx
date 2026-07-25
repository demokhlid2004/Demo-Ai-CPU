import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, Shield, Key, Terminal, Cpu, Globe, Lock, Send, RefreshCw, 
  Copy, Check, Eye, EyeOff, LogOut, Sparkles, Layers, FileCode, CheckCircle2, AlertCircle, Play,
  Image, Upload, Mic, Square, Paperclip, Music, Volume2, Trash2, X, Film
} from "lucide-react";
import { AIModelInfo } from "./types";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string>(localStorage.getItem("demo_ai_token") || "");
  
  // Login State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [requiresOtp, setRequiresOtp] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Dashboard State
  const [activeTab, setActiveTab] = useState<"models" | "playground" | "keys" | "docs" | "logs">("models");
  const [models, setModels] = useState<AIModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("demo-ai-video");
  const [selectedDocModelId, setSelectedDocModelId] = useState<string>("demo-ai-chat");
  const [activeCodeLang, setActiveCodeLang] = useState<"curl" | "js" | "python">("curl");
  
  // System Logs State
  const [systemLogs, setSystemLogs] = useState<Array<{ id: string; timestamp: string; type: 'info' | 'success' | 'error'; message: string; details?: any }>>([
    { id: '1', timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'System initialized successfully. Web View & HR space connected.' },
    { id: '2', timestamp: new Date().toLocaleTimeString(), type: 'success', message: 'Hugging Face iframe target https://darkc0de-chat.hf.space loaded successfully.' }
  ]);

  const addLog = (message: string, type: 'info' | 'success' | 'error', details?: any) => {
    setSystemLogs(prev => [{
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details
    }, ...prev]);
  };
  
  // Playground State
  const [inputMessage, setInputMessage] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("You are Demo-AI assistant.");
  const [thinkLevel, setThinkLevel] = useState("high");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string; image?: string; audio?: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiOutput, setApiOutput] = useState<any>(null);

  // Video Model Parameters (demo-ai-video)
  const [videoDuration, setVideoDuration] = useState<number>(3.5);
  const [videoFps, setVideoFps] = useState<number>(16);
  const [videoSteps, setVideoSteps] = useState<number>(5);

  // Media Attachment State for Playground
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedAudio, setAttachedAudio] = useState<string | null>(null);
  const [attachedVideo, setAttachedVideo] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>("");
  const [videoName, setVideoName] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Audio recording helpers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachedAudio(reader.result as string);
          setAudioName(`Voice_Record_${new Date().toLocaleTimeString()}.webm`);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone access is not supported or was blocked.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedAudio(reader.result as string);
        setAudioName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedVideo(reader.result as string);
        setVideoName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  // Copied state for keys
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  useEffect(() => {
    if (authToken) {
      fetchModels(authToken);
    }
  }, [authToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.requiresOtp) {
        setRequiresOtp(true);
      } else {
        setErrorMsg(data.message || "Login failed");
      }
    } catch (err) {
      setErrorMsg("Network connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpCode })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("demo_ai_token", data.token);
        setAuthToken(data.token);
        setIsAuthenticated(true);
        fetchModels(data.token);
      } else {
        setErrorMsg(data.message || "Invalid verification code");
      }
    } catch (err) {
      setErrorMsg("Network connection error");
    } finally {
      setLoading(false);
    }
  };

  const renderMessageContent = (content: string) => {
    if (!content) return null;

    // Detect markdown audio link: [Audio Response Available](url)
    const audioMatch = content.match(/\[Audio Response Available\]\((https?:\/\/[^\)]+)\)/i);
    // Detect markdown video link: [Generated Video Available](url)
    const videoMatch = content.match(/\[Generated Video Available\]\((https?:\/\/[^\)]+)\)/i);
    // Detect markdown image link: [Generated Image Available](url)
    const imageMatch = content.match(/\[Generated Image Available\]\((https?:\/\/[^\)]+)\)/i);

    if (audioMatch) {
      const audioUrl = audioMatch[1];
      const textPart = content.replace(/\[Audio Response Available\]\((https?:\/\/[^\)]+)\)/i, "").trim();

      return (
        <div className="space-y-3">
          {textPart && <div className="whitespace-pre-wrap leading-relaxed">{textPart}</div>}
          <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-500/40 max-w-md shadow-lg space-y-2 dir-rtl">
            <div className="text-xs text-purple-200 font-bold flex items-center justify-between font-mono">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
                <span>🎙️ الرد الصوتي للنموذج (Audio Response)</span>
              </span>
              <a
                href={audioUrl}
                target="_blank"
                rel="noreferrer"
                download="audio_response.wav"
                className="text-[10px] text-purple-300 hover:text-purple-100 hover:underline flex items-center gap-1"
              >
                <span>تحميل</span>
              </a>
            </div>
            <audio controls src={audioUrl} className="w-full h-9 rounded-lg" />
          </div>
        </div>
      );
    }

    if (videoMatch) {
      const videoUrl = videoMatch[1];
      const textPart = content.replace(/\[Generated Video Available\]\((https?:\/\/[^\)]+)\)/i, "").trim();

      return (
        <div className="space-y-3">
          {textPart && <div className="whitespace-pre-wrap leading-relaxed">{textPart}</div>}
          <div className="p-3.5 rounded-xl bg-blue-950/60 border border-blue-500/40 max-w-md shadow-lg space-y-2 dir-rtl">
            <div className="text-xs text-blue-200 font-bold flex items-center justify-between font-mono">
              <span className="flex items-center gap-2">
                <Film className="w-4 h-4 text-blue-400 animate-pulse" />
                <span>🎬 فيديو متحرك مولد (Generated Video)</span>
              </span>
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                download="generated_video.mp4"
                className="text-[10px] text-blue-300 hover:text-blue-100 hover:underline flex items-center gap-1"
              >
                <span>تحميل / فتح</span>
              </a>
            </div>
            <video controls src={videoUrl} className="w-full rounded-xl max-h-72 object-cover border border-blue-500/30" />
          </div>
        </div>
      );
    }

    if (imageMatch) {
      const imageUrl = imageMatch[1];
      const textPart = content.replace(/\[Generated Image Available\]\((https?:\/\/[^\)]+)\)/i, "").trim();

      return (
        <div className="space-y-3">
          {textPart && <div className="whitespace-pre-wrap leading-relaxed">{textPart}</div>}
          <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-500/40 max-w-md shadow-lg space-y-2 dir-rtl">
            <div className="text-xs text-purple-200 font-bold flex items-center justify-between font-mono">
              <span className="flex items-center gap-2">
                <Image className="w-4 h-4 text-purple-400" />
                <span>🖼️ صورة معدلة (Generated Image)</span>
              </span>
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                download="generated_image.png"
                className="text-[10px] text-purple-300 hover:text-purple-100 hover:underline flex items-center gap-1"
              >
                <span>تحميل / فتح</span>
              </a>
            </div>
            <img src={imageUrl} alt="Generated result" className="w-full rounded-xl max-h-72 object-cover border border-purple-500/30" />
          </div>
        </div>
      );
    }

    // Fallback: If raw content is a JSON string containing video url or gradio video structure
    if (content.includes('"video"') && content.includes('"url"')) {
      try {
        const parsed = JSON.parse(content);
        let extractedVideoUrl = "";
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item?.video?.url) extractedVideoUrl = item.video.url;
            else if (item?.url && typeof item.url === "string" && item.url.includes(".mp4")) extractedVideoUrl = item.url;
          }
        }
        if (extractedVideoUrl) {
          return (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-blue-950/60 border border-blue-500/40 max-w-md shadow-lg space-y-2 dir-rtl">
                <div className="text-xs text-blue-200 font-bold flex items-center justify-between font-mono">
                  <span className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-blue-400 animate-pulse" />
                    <span>🎬 فيديو متحرك مولد (Generated Video)</span>
                  </span>
                  <a
                    href={extractedVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    download="generated_video.mp4"
                    className="text-[10px] text-blue-300 hover:text-blue-100 hover:underline flex items-center gap-1"
                  >
                    <span>تحميل / فتح</span>
                  </a>
                </div>
                <video controls src={extractedVideoUrl} className="w-full rounded-xl max-h-72 object-cover border border-blue-500/30" />
              </div>
            </div>
          );
        }
      } catch {
        // Continue to standard text
      }
    }

    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
  };

  const fetchModels = async (token: string) => {
    try {
      const res = await fetch("/api/models", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (res.ok && data.models) {
          setModels(data.models);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem("demo_ai_token");
        }
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem("demo_ai_token");
      }
    } catch (err) {
      console.error("Failed to fetch models", err);
    }
  };

  const regenerateKey = async (modelId: string) => {
    try {
      const res = await fetch(`/api/models/${modelId}/regenerate-key`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok && data.apiKey) {
        setModels(models.map(m => m.id === modelId ? { ...m, apiKey: data.apiKey } : m));
      }
    } catch (err) {
      console.error("Failed to regenerate key", err);
    }
  };

  const handleRunPlayground = async () => {
    if (!inputMessage.trim() && !attachedImage && !attachedAudio && !attachedVideo) return;
    setIsGenerating(true);
    setApiOutput(null);

    const userMsg = inputMessage.trim() || (attachedImage ? "[صورة مرفقة / Image Attached]" : attachedVideo ? "[فيديو مرفق / Video Attached]" : "[ملف صوتي مرفق / Audio Attached]");
    const currImage = attachedImage;
    const currAudio = attachedAudio;
    const currVideo = attachedVideo;

    const newHistory = [
      ...chatHistory, 
      { 
        role: "user", 
        content: userMsg,
        image: currImage || undefined,
        audio: currAudio || undefined,
        video: currVideo || undefined
      }
    ];
    setChatHistory(newHistory);
    setInputMessage("");
    setAttachedImage(null);
    setAttachedAudio(null);
    setAttachedVideo(null);
    setAudioName("");
    setVideoName("");

    addLog(`Sending request to model "${selectedModelId}": "${userMsg}"`, 'info', { modelId: selectedModelId, message: userMsg, hasImage: !!currImage, hasAudio: !!currAudio, hasVideo: !!currVideo, systemPrompt });

    try {
      const res = await fetch(`/api/test-model/${selectedModelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          image: currImage,
          audio: currAudio,
          video: currVideo,
          system_prompt: systemPrompt,
          think_level: thinkLevel,
          duration_seconds: videoDuration,
          frame_multiplier: videoFps,
          steps: videoSteps,
          history: newHistory
        })
      });
      const data = await res.json();
      setApiOutput(data);

      if (!res.ok) {
        throw new Error(data.error || `HTTP error ${res.status}`);
      }

      let assistantText = "";
      if (data.cleaned_text) {
        assistantText = data.cleaned_text;
      } else {
        let raw = data.data;
        if (selectedModelId === "demo-ai-hr") {
          let textStr = Array.isArray(raw) ? raw[0] : String(raw || "");
          assistantText = textStr
            .replace(/\[تم الضغط على Acknowledge بنجاح \/ Acknowledge Clicked\]/g, "")
            .replace(/\[System Notice:[^\]]*\]/g, "")
            .replace(/Demo-AI HR Assistant:/g, "")
            .trim();
        } else if (selectedModelId === "demo-ai-chat") {
          const unpack = (item: any): string => {
            if (!item) return "";
            if (typeof item === "string") {
              try {
                const p = JSON.parse(item);
                return unpack(p);
              } catch {
                return item;
              }
            }
            if (Array.isArray(item)) {
              for (const sub of item) {
                const res = unpack(sub);
                if (res && typeof res === "string" && !res.includes("The user has greeted") && !res.includes("reasoning_content") && res.length > 3) {
                  return res;
                }
              }
              const firstStr = item.find(s => typeof s === "string" && s.trim().length > 0);
              if (firstStr) return firstStr;
              if (item.length > 0) return unpack(item[0]);
            }
            if (typeof item === "object" && item !== null) {
              if (item.content) return unpack(item.content);
              if (item.response) return unpack(item.response);
              if (item.data) return unpack(item.data);
            }
            return String(item);
          };
          assistantText = unpack(raw);
        } else if (selectedModelId === "demo-ai-pro") {
          const unpackPro = (item: any): string => {
            if (!item) return "";
            if (typeof item === "string") {
              try {
                const p = JSON.parse(item);
                return unpackPro(p);
              } catch {
                return item;
              }
            }
            if (Array.isArray(item)) {
              for (const sub of item) {
                const res = unpackPro(sub);
                if (res && typeof res === "string" && res.length > 2 && !res.includes("None")) {
                  return res;
                }
              }
              const firstStr = item.find(s => typeof s === "string" && s.trim().length > 0);
              if (firstStr) return firstStr;
              if (item.length > 0) return unpackPro(item[0]);
            }
            if (typeof item === "object" && item !== null) {
              if (item.content) return unpackPro(item.content);
              if (item.response) return unpackPro(item.response);
              if (item.data) return unpackPro(item.data);
            }
            return String(item);
          };
          assistantText = unpackPro(raw);
        } else {
          if (Array.isArray(raw)) {
            assistantText = raw.find((item: any) => typeof item === "string") || JSON.stringify(raw, null, 2);
          } else if (typeof raw === "string") {
            assistantText = raw;
          } else if (data.response) {
            assistantText = data.response;
          } else {
            assistantText = JSON.stringify(data, null, 2);
          }
        }
      }

      addLog(`Received successful response from model "${selectedModelId}"`, 'success', { response: assistantText, raw: data });
      setChatHistory([...newHistory, { role: "assistant", content: assistantText }]);
    } catch (err: any) {
      const msg = err.message || 'Model inference failed';
      let userFriendlyMsg = msg;
      if (msg.includes("ZeroGPU") || msg.includes("quota")) {
        userFriendlyMsg = "⚠️ تم التوصل إلى الحد الأقصى المتاح على Hugging Face ZeroGPU. يرجى الانتظار دقيقة وإعادة المحاولة. (ZeroGPU Quota Limit Reached)";
      }
      addLog(`Error executing model request for "${selectedModelId}": ${msg}`, 'error', err);
      setApiOutput({ error: msg });
      setChatHistory([...newHistory, { role: "assistant", content: `Error: ${userFriendlyMsg}` }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem("demo_ai_token");
    setAuthToken("");
    setIsAuthenticated(false);
    setRequiresOtp(false);
  };

  // If not authenticated, render Login / OTP Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 text-zinc-100 font-sans">
        <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 mb-4 border border-blue-500/30">
              <Bot className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">DEMO-AI Gateway</h1>
            <p className="text-sm text-zinc-400 mt-1">Secure Multi-Model API & Admin Dashboard</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!requiresOtp ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Username</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#09090b] border border-zinc-800 text-zinc-100 focus:outline-none focus:border-blue-500 transition-all text-sm"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-[#09090b] border border-zinc-800 text-zinc-100 focus:outline-none focus:border-blue-500 transition-all text-sm pr-10"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>Login & Send Telegram OTP</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs leading-relaxed">
                A 6-digit verification code has been securely sent to your Telegram chat (<span className="font-mono font-semibold">8054055399</span>). Please enter it below to complete authentication.
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 text-center">Telegram Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  placeholder="------"
                  className="w-full px-4 py-4 rounded-xl bg-[#09090b] border border-blue-500/50 text-zinc-100 text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-blue-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                <span>Verify & Enter Dashboard</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setRequiresOtp(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 underline"
                >
                  Back to login
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-zinc-800 text-center text-xs text-zinc-500">
            DEMO-AI System • Encrypted Telegram Gateway
          </div>
        </div>
      </div>
    );
  }

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="h-16 border-b border-zinc-800 bg-[#09090b] px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white">DEMO-AI</span>
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-bold uppercase">LIVE</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-[#18181b] p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab("models")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === "models" ? "bg-blue-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Web View & HR</span>
          </button>
          <button
            onClick={() => setActiveTab("playground")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === "playground" ? "bg-blue-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Playground</span>
          </button>
          <button
            onClick={() => setActiveTab("keys")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === "keys" ? "bg-blue-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Key className="w-4 h-4" />
            <span>API Keys Manager</span>
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === "docs" ? "bg-blue-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>API Docs</span>
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === "logs" ? "bg-blue-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>سجلات النظام</span>
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-400 px-3 py-1.5 rounded-lg bg-[#18181b] border border-zinc-800">
            <Shield className="w-3.5 h-3.5 text-green-400" />
            <span>gsaen (Telegram Verified)</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-[#18181b] hover:bg-rose-500/10 hover:text-rose-400 text-zinc-400 border border-zinc-800 transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Subheader Nav */}
      <div className="md:hidden flex overflow-x-auto bg-[#0c0c0e] border-b border-zinc-800 p-2 gap-2">
        <button
          onClick={() => setActiveTab("models")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
            activeTab === "models" ? "bg-blue-600 text-white" : "text-zinc-400"
          }`}
        >
          Web View
        </button>
        <button
          onClick={() => setActiveTab("playground")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
            activeTab === "playground" ? "bg-blue-600 text-white" : "text-zinc-400"
          }`}
        >
          Playground
        </button>
        <button
          onClick={() => setActiveTab("keys")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
            activeTab === "keys" ? "bg-blue-600 text-white" : "text-zinc-400"
          }`}
        >
          API Keys
        </button>
        <button
          onClick={() => setActiveTab("docs")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
            activeTab === "docs" ? "bg-blue-600 text-white" : "text-zinc-400"
          }`}
        >
          Docs
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
            activeTab === "logs" ? "bg-blue-600 text-white" : "text-zinc-400"
          }`}
        >
          السجلات
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {activeTab === "models" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#18181b] p-6 rounded-2xl border border-zinc-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <span>demo-ai-hr (Web View Space)</span>
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Embedded Hugging Face Space running live at <span className="text-blue-400 font-mono">https://darkc0de-chat.hf.space</span>
                </p>
              </div>
              <a
                href="https://darkc0de-chat.hf.space"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center gap-2 w-fit transition-all shadow"
              >
                <span>Open in New Tab</span>
                <Globe className="w-4 h-4" />
              </a>
            </div>

            <div className="w-full h-[750px] bg-[#18181b] rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl relative">
              <iframe
                src="https://darkc0de-chat.hf.space"
                title="demo-ai-hr webview"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; camera; microphone; encrypted-media; geolocation"
              />
            </div>
          </div>
        )}

        {activeTab === "playground" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Model Selector Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-[#18181b] p-5 rounded-2xl border border-zinc-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Select Model</h3>
                <div className="space-y-2">
                  {models.map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModelId(m.id);
                        setChatHistory([]);
                        setApiOutput(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        selectedModelId === m.id
                          ? "bg-blue-600/10 border-blue-500/50 text-blue-400"
                          : "bg-[#09090b] border-zinc-800 text-zinc-300 hover:bg-zinc-800/40"
                      }`}
                    >
                      <div>
                        <div className="font-medium text-sm">{m.name}</div>
                        <div className="text-xs text-zinc-500 truncate max-w-[180px] mt-0.5">{m.description}</div>
                      </div>
                      {selectedModelId === m.id && <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#18181b] p-5 rounded-2xl border border-zinc-800 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Model Parameters</h3>
                
                {selectedModelId === "demo-ai-chat" && (
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Think Level</label>
                    <select
                      value={thinkLevel}
                      onChange={(e) => setThinkLevel(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#09090b] border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">System Prompt</label>
                  <textarea
                    rows={3}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#09090b] border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Specialized Model Input Helpers */}
                {selectedModelId === "demo-ai-video" && (
                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-3">
                    <div className="font-semibold text-blue-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Film className="w-4 h-4 text-blue-400" />
                        <span>إعدادات نموذج الفيديو (Wan 2.2 I2V):</span>
                      </span>
                    </div>

                    {/* Video Duration */}
                    <div className="space-y-1.5 pt-1 border-t border-blue-500/20">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">⏱️ مدة الفيديو (Duration):</span>
                        <span className="font-mono text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-500/30">{videoDuration}s</span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={10.0}
                        step={0.5}
                        value={videoDuration}
                        onChange={(e) => setVideoDuration(parseFloat(e.target.value))}
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                      <div className="flex gap-1 justify-between text-[10px]">
                        {[1, 2, 3.5, 5, 7, 10].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setVideoDuration(sec)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                              videoDuration === sec ? "bg-blue-600 text-white font-bold" : "bg-[#09090b] text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Video Fluidity / FPS */}
                    <div className="space-y-1.5 pt-2 border-t border-blue-500/20">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">🎞️ معدل الفريمات (FPS / Fluidity):</span>
                        <span className="font-mono text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-500/30">{videoFps} FPS</span>
                      </div>
                      <select
                        value={videoFps}
                        onChange={(e) => setVideoFps(parseInt(e.target.value, 10))}
                        className="w-full p-2 rounded-lg bg-[#09090b] border border-blue-500/30 text-xs text-zinc-200 font-mono focus:outline-none focus:border-blue-500"
                      >
                        <option value={16}>16 FPS (افتراضي - Standard)</option>
                        <option value={32}>32 FPS (سلس - Smooth)</option>
                        <option value={64}>64 FPS (فائق السلاسة - Ultra)</option>
                        <option value={128}>128 FPS (أعلى دقة حركية - Max Fluidity)</option>
                      </select>
                    </div>

                    {/* Inference Steps */}
                    <div className="space-y-1.5 pt-2 border-t border-blue-500/20">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">⚙️ خطوات التوليد (Steps):</span>
                        <span className="font-mono text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-500/30">{videoSteps}</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={30}
                        step={1}
                        value={videoSteps}
                        onChange={(e) => setVideoSteps(parseInt(e.target.value, 10))}
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Image Upload */}
                    <div className="pt-2 border-t border-blue-500/20 space-y-1.5">
                      <p className="text-zinc-400 leading-relaxed text-[11px]">
                        ارفع صورة تحريك للبدء في توليد مقطع الفيديو حركياً بواسطة Wan 2.2 14B I2V.
                      </p>
                      <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer transition-all shadow text-xs">
                        <Upload className="w-4 h-4" />
                        <span>اختيار صورة من الجهاز</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      </label>
                    </div>
                  </div>
                )}

                {selectedModelId === "demo-ai-image" && (
                  <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-2.5">
                    <div className="font-semibold text-purple-300 flex items-center gap-1.5">
                      <Image className="w-4 h-4 text-purple-400" />
                      <span>إرسال صورة للتعديل والتصميم:</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">
                      ارفع صورة لتطبيق تعديلات الذكاء الاصطناعي وتحويل الأنماط (Style Transfer / LoRAs).
                    </p>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium cursor-pointer transition-all shadow text-xs">
                      <Upload className="w-4 h-4" />
                      <span>اختيار صورة من الجهاز</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    </label>
                  </div>
                )}

                {selectedModelId === "demo-ai-pro" && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2.5">
                    <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-emerald-400" />
                      <span>التفاعل الصوتي والمرئي (Omni):</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">
                      سجّل مقطعاً صوتياً مباشراً، ارفع ملف صوتي، أو ارفع مقطع فيديو لمعالجته عبر مسار <code>/media_predict</code>.
                    </p>
                    <div className="flex flex-col gap-2 pt-1">
                      {isRecording ? (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition-all animate-pulse text-xs"
                        >
                          <Square className="w-4 h-4" />
                          <span>إيقاف التسجيل ({recordingTime}s)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all text-xs"
                        >
                          <Mic className="w-4 h-4" />
                          <span>تسجيل صوتي مباشر</span>
                        </button>
                      )}
                      <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 font-medium cursor-pointer transition-all text-xs">
                        <Music className="w-4 h-4 text-purple-400" />
                        <span>رفع ملف صوتي</span>
                        <input type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
                      </label>
                      <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 font-medium cursor-pointer transition-all text-xs">
                        <Film className="w-4 h-4 text-blue-400" />
                        <span>رفع مقطع فيديو</span>
                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat & Playground Main Area */}
            <div className="lg:col-span-3 flex flex-col bg-[#18181b] rounded-2xl border border-zinc-800 overflow-hidden h-[750px]">
              <div className="p-4 border-b border-zinc-800 bg-[#0c0c0e] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-500" />
                    <span>{selectedModel?.name}</span>
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">Space: {selectedModel?.space}</p>
                </div>
                <button
                  onClick={() => setChatHistory([])}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-all"
                >
                  Clear History
                </button>
              </div>

              {/* Chat Stream */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-3">
                    <Bot className="w-12 h-12 text-zinc-700" />
                    <p className="text-sm">Start conversation with {selectedModel?.name}</p>
                    <p className="text-xs max-w-sm">Powered by Gradio Client API integration with Hugging Face spaces.</p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <div className="text-[10px] text-zinc-500 mb-1 uppercase tracking-wider font-semibold">
                        {msg.role === "user" ? "You" : selectedModel?.name}
                      </div>
                      <div
                        className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white rounded-br-sm shadow"
                            : "bg-[#09090b] border border-zinc-800 text-zinc-200 rounded-bl-sm"
                        }`}
                      >
                        {msg.image && (
                          <div className="mb-2.5">
                            <img src={msg.image} alt="Attachment" className="max-w-xs max-h-48 rounded-xl border border-white/20 object-cover shadow-lg" />
                          </div>
                        )}
                        {msg.audio && (
                          <div className="mb-2.5 p-2 rounded-xl bg-black/30 border border-white/20 max-w-xs">
                            <div className="text-[11px] text-purple-200 flex items-center gap-1.5 mb-1 font-mono">
                              <Volume2 className="w-3.5 h-3.5 text-purple-300" />
                              <span>المقطع الصوتي المرفق</span>
                            </div>
                            <audio controls src={msg.audio} className="w-full h-8" />
                          </div>
                        )}
                        {msg.video && (
                          <div className="mb-2.5 p-2 rounded-xl bg-black/30 border border-white/20 max-w-xs">
                            <div className="text-[11px] text-blue-200 flex items-center gap-1.5 mb-1 font-mono">
                              <Film className="w-3.5 h-3.5 text-blue-300" />
                              <span>مقطع الفيديو المرفق</span>
                            </div>
                            <video controls src={msg.video} className="w-full max-h-48 rounded-lg" />
                          </div>
                        )}
                        {renderMessageContent(msg.content)}
                      </div>
                    </div>
                  ))
                )}
                {isGenerating && (
                  <div className="flex items-center gap-2 text-zinc-400 text-sm p-4">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                    <span>Generating model response...</span>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <div className="p-4 border-t border-zinc-800 bg-[#0c0c0e]">
                {/* Media Attachment Preview Bar */}
                {(attachedImage || attachedAudio || attachedVideo) && (
                  <div className="mb-3 p-3 rounded-xl bg-[#18181b] border border-blue-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {attachedImage && (
                        <div className="flex items-center gap-2.5">
                          <img src={attachedImage} alt="Attachment preview" className="w-12 h-12 rounded-lg object-cover border border-zinc-700 shrink-0" />
                          <span className="text-xs text-zinc-300 font-medium">صورة جاهزة للإرسال</span>
                        </div>
                      )}
                      {attachedAudio && (
                        <div className="flex items-center gap-3">
                          <Music className="w-5 h-5 text-purple-400 shrink-0" />
                          <div className="space-y-1">
                            <span className="block text-xs font-medium text-zinc-200 truncate max-w-[200px]">{audioName || "تسجيل صوتي"}</span>
                            <audio controls src={attachedAudio} className="h-6 w-48" />
                          </div>
                        </div>
                      )}
                      {attachedVideo && (
                        <div className="flex items-center gap-3">
                          <Film className="w-5 h-5 text-blue-400 shrink-0" />
                          <div className="space-y-1">
                            <span className="block text-xs font-medium text-zinc-200 truncate max-w-[200px]">{videoName || "فيديو مرفق"}</span>
                            <video src={attachedVideo} className="h-10 w-16 object-cover rounded border border-zinc-700" />
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedImage(null);
                        setAttachedAudio(null);
                        setAttachedVideo(null);
                        setAudioName("");
                        setVideoName("");
                      }}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all shrink-0"
                      title="إزالة المرفق"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRunPlayground();
                  }}
                  className="flex items-center gap-2 sm:gap-3"
                >
                  {/* Action Attachments based on Model */}
                  {(selectedModelId === "demo-ai-video" || selectedModelId === "demo-ai-image") && (
                    <label
                      className="p-3 rounded-xl bg-[#09090b] hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
                      title="رفع صورة / Select Image"
                    >
                      <Image className="w-5 h-5 text-blue-400" />
                      <span className="hidden sm:inline text-xs text-zinc-300 font-medium">إضافة صورة</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    </label>
                  )}

                  {selectedModelId === "demo-ai-pro" && (
                    <div className="flex items-center gap-2 shrink-0">
                      {isRecording ? (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-3 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-medium flex items-center gap-1.5 animate-pulse"
                        >
                          <Square className="w-4 h-4" />
                          <span>إيقاف ({recordingTime}s)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="p-3 rounded-xl bg-[#09090b] hover:bg-zinc-800 border border-zinc-800 text-purple-400 transition-all flex items-center gap-1.5"
                          title="تسجيل صوتي / Voice Recording"
                        >
                          <Mic className="w-5 h-5" />
                          <span className="hidden sm:inline text-xs text-zinc-300 font-medium">تسجيل</span>
                        </button>
                      )}
                      <label
                        className="p-3 rounded-xl bg-[#09090b] hover:bg-zinc-800 border border-zinc-800 text-purple-400 cursor-pointer transition-all flex items-center gap-1.5"
                        title="إضافة ملف صوتي / Upload Audio File"
                      >
                        <Music className="w-5 h-5" />
                        <span className="hidden sm:inline text-xs text-zinc-300 font-medium">صوت</span>
                        <input type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
                      </label>
                      <label
                        className="p-3 rounded-xl bg-[#09090b] hover:bg-zinc-800 border border-zinc-800 text-blue-400 cursor-pointer transition-all flex items-center gap-1.5"
                        title="إضافة مقطع فيديو / Upload Video File"
                      >
                        <Film className="w-5 h-5" />
                        <span className="hidden sm:inline text-xs text-zinc-300 font-medium">فيديو</span>
                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
                      </label>
                    </div>
                  )}

                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={`Message ${selectedModel?.name}...`}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#09090b] border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || (!inputMessage.trim() && !attachedImage && !attachedAudio && !attachedVideo)}
                    className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center gap-2 transition-all shadow disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === "keys" && (
          <div className="space-y-6">
            <div className="bg-[#18181b] p-6 rounded-2xl border border-zinc-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-500" />
                <span>Per-Model API Keys Management</span>
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Customize and generate unique API keys for each model independently. Use these keys in your external client applications to access the `/api/v1/chat` endpoint.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {models.map((model) => (
                <div key={model.id} className="bg-[#18181b] p-6 rounded-2xl border border-zinc-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">
                        {model.id}
                      </span>
                      <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">{model.type}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{model.name}</h3>
                    <p className="text-xs text-zinc-400">{model.description}</p>
                    <p className="text-xs text-zinc-500 font-mono truncate">Space: {model.space}</p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-zinc-800">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">API Key</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        readOnly
                        value={model.apiKey}
                        className="w-full px-3 py-2 rounded-xl bg-[#09090b] border border-zinc-800 text-zinc-300 font-mono text-xs"
                      />
                      <button
                        onClick={() => copyToClipboard(model.apiKey, model.id)}
                        className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all shrink-0"
                        title="Copy Key"
                      >
                        {copiedKeyId === model.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => regenerateKey(model.id)}
                        className="p-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-all shrink-0"
                        title="Regenerate Key"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "docs" && (
          <div className="space-y-6">
            <div className="bg-[#18181b] p-6 rounded-2xl border border-zinc-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div className="text-right">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2 justify-end">
                    <span>API Documentation & Integration (دليل مطوري النظام والـ APIs)</span>
                    <FileCode className="w-5 h-5 text-blue-500" />
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    شرح تفصيلي شامل لكيفية إرسال الطلبات لكل نموذج عبر الـ API وكيفية معالجة الردود البرمجية.
                  </p>
                </div>
                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-2 self-start md:self-auto">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-semibold text-zinc-300">جميع نقاط النهاية نشطة (All Endpoints Active)</span>
                </div>
              </div>

              {/* General API Info & Gateway */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#09090b] p-5 rounded-xl border border-zinc-800 space-y-3 text-right">
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">🔒 بوابات الاستدعاء والمفاتيح (Authentication & Gateway)</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    يدعم النظام نوعين من مفاتيح الوصول لضمان حماية واستقرار العمليات البرمجية:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs space-y-1.5 text-right">
                      <span className="font-bold text-zinc-100 flex items-center gap-1.5 justify-end">
                        <span>مفاتيح النماذج المخصصة (Per-Model Keys)</span>
                        <Key className="w-3.5 h-3.5 text-blue-500" />
                      </span>
                      <p className="text-zinc-400 text-[11px] leading-normal">
                        مفتاح مخصص لكل نموذج على حدة. يتيح الاستعلام فقط للنموذج المربوط به، ويرفض الوصول للنماذج الأخرى لتفادي التداخل في الصلاحيات.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs space-y-1.5 text-right">
                      <span className="font-bold text-zinc-100 flex items-center gap-1.5 justify-end">
                        <span>المفتاح الشامل أو المشرف (Master / Admin Key)</span>
                        <Shield className="w-3.5 h-3.5 text-amber-500" />
                      </span>
                      <p className="text-zinc-400 text-[11px] leading-normal">
                        مفتاح <code>da_key_master</code> أو رمز المشرف المخصص. يسمح بالوصول الكامل لجميع النماذج دون قيود، وهو مثالي لبناء لوحات التحكم العامة.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#09090b] p-5 rounded-xl border border-zinc-800 space-y-3 flex flex-col justify-between text-right">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">📡 أساسيات الطلب (Request Headers)</h3>
                    <p className="text-xs text-zinc-400">
                      يجب تضمين المفتاح في ترويسة الطلب بأحد الأشكال التالية:
                    </p>
                  </div>
                  <div className="space-y-2 font-mono text-[11px] text-zinc-300 bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-left">
                    <p className="text-blue-400">// Option A: Bearer Authorization</p>
                    <p className="overflow-x-auto whitespace-nowrap">Authorization: Bearer &lt;API_KEY&gt;</p>
                    <p className="text-blue-400 pt-1">// Option B: Custom Header</p>
                    <p className="overflow-x-auto whitespace-nowrap">X-API-Key: &lt;API_KEY&gt;</p>
                  </div>
                </div>
              </div>

              {/* Interactive Docs Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-4">
                {/* Left: Model Selector List */}
                <div className="lg:col-span-1 space-y-2">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1 block text-right">اختر النموذج لتفاصيل الـ API</span>
                  <div className="space-y-1.5">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedDocModelId(m.id)}
                        className={`w-full text-right p-3 rounded-xl border flex items-center justify-between transition-all ${
                          selectedDocModelId === m.id
                            ? 'bg-blue-600/10 border-blue-500/50 text-white font-semibold'
                            : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="text-right">
                          <p className="text-xs font-bold">{m.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{m.id}</p>
                        </div>
                        <span className={`w-2 h-2 rounded-full shrink-0 ml-2 ${
                          m.id === "demo-ai-hr" ? "bg-emerald-500" :
                          m.id === "demo-ai-video" ? "bg-blue-500" :
                          m.id === "demo-ai-chat" ? "bg-purple-500" :
                          m.id === "demo-ai-pro" ? "bg-indigo-500" : "bg-amber-500"
                        }`}></span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Detailed Model Documentation */}
                <div className="lg:col-span-3 bg-[#09090b] p-6 rounded-xl border border-zinc-800 space-y-6">
                  {(() => {
                    const activeModel = models.find(m => m.id === selectedDocModelId) || models[0];
                    if (!activeModel) return <div className="text-zinc-500 text-xs text-right">جاري تحميل البيانات...</div>;

                    // Compute specific documentation variables
                    let pathInfo = "/api/v1/chat";
                    let modelKey = activeModel.apiKey || "da_key_xxxxxxxx";
                    let reqParameters = [
                      { name: "model", type: "String", req: "مستحسن (Optional)", desc: `معرّف النموذج المراد استدعاؤه وهو (<code>${activeModel.id}</code>). إذا لم يتم إرساله، سيتحدد تلقائياً بناءً على مفتاح الـ API المستخدم.` }
                    ];

                    let respFields = [
                      { name: "success", type: "Boolean", desc: "حالة الطلب البرمجي وتكون <code>true</code> في حال النجاح." },
                      { name: "model", type: "String", desc: `معرّف النموذج الذي قام بالمعالجة وهو <code>${activeModel.id}</code>.` },
                      { name: "cleaned_text", type: "String", desc: "النص النهائي المصفى من الرد والجاهز للعرض المباشر في واجهتك." },
                      { name: "data", type: "Array / Object", desc: "الرد الخام الكامل المستلم من بيئة المعالجة (Gradio Output Data) للتحكم الدقيق." }
                    ];

                    let curlPayload = "";
                    let jsCode = "";
                    let pythonCode = "";

                    if (activeModel.id === "demo-ai-chat") {
                      pathInfo = "/api/v1/chat";
                      reqParameters.push(
                        { name: "message", type: "String", req: "مطلوب (Required)", desc: "النص أو السؤال المرسل من قبل المستخدم للدردشة والمحاورة." },
                        { name: "system_prompt", type: "String", req: "اختياري (Optional)", desc: "التعليمات البرمجية أو الخلفية المعرفية والتوجيهات المخصصة للذكاء الاصطناعي." },
                        { name: "think_level", type: "String", req: "اختياري (Optional)", desc: "مستوى التفكير والتحليل المنطقي والـ Reasoning المطلوبة: <code>'high'</code> | <code>'medium'</code> | <code>'low'</code>." },
                        { name: "history", type: "Array", req: "اختياري (Optional)", desc: "سجل الرسائل السابقة للحفاظ على سياق المحادثة وصيغتها: <code>[{role: 'user', content: '...'}, ...]</code>." }
                      );
                      curlPayload = `{\n  "model": "demo-ai-chat",\n  "message": "كيف يمكنني دمج الـ API في برنامجي؟",\n  "system_prompt": "أنت مساعد برمجيات خبير ومختصر وجوابك بالعربية.",\n  "think_level": "high"\n}`;
                    } else if (activeModel.id === "demo-ai-video") {
                      pathInfo = "/api/v1/predict";
                      reqParameters.push(
                        { name: "image", type: "String (Base64 / URL)", req: "مطلوب (Required)", desc: "الصورة المطلوب تحريكها إما كرابط URL مباشر أو بصيغة Base64 كاملة." },
                        { name: "prompt", type: "String", req: "اختياري (Optional)", desc: "الوصف النصي للحركة المطلوبة في الفيديو (مثال: 'Animate rain falling softly')." },
                        { name: "duration_seconds", type: "Number", req: "اختياري (Optional)", desc: "مدة مقطع الفيديو المراد توليده بالثواني (الافتراضي <code>3.5</code> ثانية)." },
                        { name: "frame_multiplier", type: "Number", req: "اختياري (Optional)", desc: "عدد الإطارات في الثانية (FPS)، الخيارات المتاحة: <code>16</code> | <code>32</code> | <code>64</code> | <code>128</code>." },
                        { name: "steps", type: "Number", req: "اختياري (Optional)", desc: "عدد خطوات تكرار تنقية جودة الفيديو (Inference steps) من 1 إلى 30." }
                      );
                      curlPayload = `{\n  "model": "demo-ai-video",\n  "image": "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png",\n  "prompt": "تحريك الحافلة لتبدو وكأنها تسير في الشارع بسرعة",\n  "duration_seconds": 3.5,\n  "frame_multiplier": 32,\n  "steps": 10\n}`;
                    } else if (activeModel.id === "demo-ai-pro") {
                      pathInfo = "/api/v1/predict";
                      reqParameters.push(
                        { name: "audio", type: "String (Base64 / URL)", req: "اختياري (Optional)", desc: "ملف التسجيل الصوتي المباشر أو المرفوع كبيانات Base64 أو رابط مباشر لمعالجته." },
                        { name: "video", type: "String (Base64 / URL)", req: "اختياري (Optional)", desc: "مقطع الفيديو المرفق كـ Base64 أو رابط مباشر لتحليل محتواه وتصويره." },
                        { name: "message", type: "String", req: "اختياري (Optional)", desc: "الاستفسار المكتوب الموجه لنموذج Omni متعدد الوسائط." },
                        { name: "voice_choice", type: "String", req: "اختياري (Optional)", desc: "اسم الصوت المفضل لتوليد الرد الصوتي، الافتراضي: <code>'Tina / 中文-甜甜'</code>." },
                        { name: "response_type", type: "String", req: "اختياري (Optional)", desc: "نوع الاستجابة المطلوبة: <code>'both'</code> (نص + صوت) | <code>'text'</code> (نص فقط) | <code>'audio'</code> (صوت فقط)." }
                      );
                      curlPayload = `{\n  "model": "demo-ai-pro",\n  "audio": "<BASE64_AUDIO_DATA>",\n  "voice_choice": "Tina / 中文-甜甜",\n  "response_type": "both"\n}`;
                    } else if (activeModel.id === "demo-ai-image") {
                      pathInfo = "/api/v1/predict";
                      reqParameters.push(
                        { name: "image", type: "String (Base64 / URL)", req: "مطلوب (Required)", desc: "الصورة الأصلية المراد تحريرها أو تطبيق فلتر الفن أو الأنمي عليها." },
                        { name: "prompt", type: "String", req: "مطلوب (Required)", desc: "النص التفصيلي للتعديلات المطلوبة (مثال: 'convert style into cyberpunk')." },
                        { name: "lora_adapter", type: "String", req: "اختياري (Optional)", desc: "الفلتر المطبق، افتراضياً: <code>'Photo-to-Anime'</code>." }
                      );
                      curlPayload = `{\n  "model": "demo-ai-image",\n  "image": "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png",\n  "prompt": "تحويل هذه الصورة إلى أسلوب الأنمي الياباني القديم",\n  "lora_adapter": "Photo-to-Anime"\n}`;
                    } else if (activeModel.id === "demo-ai-hr") {
                      pathInfo = "/api/v1/chat";
                      reqParameters.push(
                        { name: "message", type: "String", req: "مطلوب (Required)", desc: "الاستفسار الموجه لنظام الموارد البشرية والـ HR والتشغيل الداخلي للبيئة." }
                      );
                      curlPayload = `{\n  "model": "demo-ai-hr",\n  "message": "كيف يمكنني تحديث بيانات الموظفين؟"\n}`;
                    }

                    // Create codes
                    jsCode = `const apiKey = "${modelKey}";\nconst url = "https://demo-ai-cpu.onrender.com${pathInfo}";\n\nconst payload = ${curlPayload};\n\nfetch(url, {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "Authorization": \`Bearer \${apiKey}\`\n  },\n  body: JSON.stringify(payload)\n})\n.then(response => response.json())\n.then(result => {\n  console.log("Success:", result.success);\n  console.log("Text response:", result.cleaned_text);\n  console.log("Raw Response Data:", result.data);\n})\n.catch(error => console.error("Error:", error));`;

                    pythonCode = `import requests\n\napi_key = "${modelKey}"\nurl = "https://demo-ai-cpu.onrender.com${pathInfo}"\n\nheaders = {\n    "Content-Type": "application/json",\n    "Authorization": f"Bearer {api_key}"\n}\n\npayload = ${curlPayload.replace(/true/g, 'True').replace(/false/g, 'False').replace(/null/g, 'None')}\n\ntry:\n    response = requests.post(url, headers=headers, json=payload)\n    data = response.json()\n    if data.get("success"):\n        print("Success!")\n        print("Cleaned Text Output:", data.get("cleaned_text"))\n        print("Raw Gradio Data:", data.get("data"))\n    else:\n        print("Error:", data.get("error"))\nexcept Exception as e:\n    print("Connection failed:", e)`;

                    return (
                      <div className="space-y-6">
                        {/* Header info */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4 text-right">
                          <div className="order-2 md:order-1 text-right w-full md:w-auto">
                            <div className="flex items-center gap-2 flex-row-reverse">
                              <span className="text-[10px] px-2.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono border border-blue-500/20 font-bold uppercase tracking-wider">
                                {activeModel.type} Model
                              </span>
                              <h3 className="text-lg font-bold text-white">{activeModel.name}</h3>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">{activeModel.description}</p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5 dir-ltr">Space: {activeModel.space} | Endpoint: {activeModel.endpoint || "Default"}</p>
                          </div>

                          {/* Fast Action */}
                          <div className="flex items-center gap-2 order-1 md:order-2 self-start md:self-auto">
                            <span className="text-[10px] text-zinc-500 font-mono">مسار الطلب:</span>
                            <span className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-blue-400 font-mono font-bold">
                              POST {pathInfo}
                            </span>
                          </div>
                        </div>

                        {/* API Key Box */}
                        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs space-y-2.5 text-right">
                          <div className="flex items-center justify-between flex-row-reverse">
                            <span className="font-bold text-blue-300 flex items-center gap-1.5 flex-row-reverse">
                              <Key className="w-4 h-4 text-blue-400 font-bold" />
                              <span>مفتاح الوصول البرمجي السريع الخاص بك (Model API Key)</span>
                            </span>
                            <span className="text-[10px] text-zinc-500">مقيّد للوصول لهذا النموذج فقط</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="password"
                              readOnly
                              value={modelKey}
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-zinc-800 text-zinc-300 font-mono text-xs text-left"
                            />
                            <button
                              onClick={() => copyToClipboard(modelKey, activeModel.id)}
                              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all shrink-0 flex items-center justify-center cursor-pointer"
                              title="نسخ المفتاح"
                            >
                              {copiedKeyId === activeModel.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Request parameters Table */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider text-right">📥 معطيات الطلب (Request JSON Body Fields)</h4>
                          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#09090b]">
                            <table className="w-full text-xs text-right border-collapse">
                              <thead>
                                <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400">
                                  <th className="p-3 font-semibold text-left">اسم المتغير (Field)</th>
                                  <th className="p-3 font-semibold">النوع (Type)</th>
                                  <th className="p-3 font-semibold">حالة الحقل</th>
                                  <th className="p-3 font-semibold">الوصف والخيارات (Arabic Description)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                                {reqParameters.map((param, index) => (
                                  <tr key={index} className="hover:bg-zinc-900/40 transition-colors">
                                    <td className="p-3 font-mono text-blue-400 text-left">{param.name}</td>
                                    <td className="p-3 font-mono text-zinc-400">{param.type}</td>
                                    <td className="p-3 font-medium">
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                        param.req.includes("مطلوب") ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                      }`}>
                                        {param.req}
                                      </span>
                                    </td>
                                    <td className="p-3 leading-relaxed text-zinc-300 text-right" dangerouslySetInnerHTML={{ __html: param.desc }}></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Response fields Table */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider text-right">📤 مخرجات الرد (Response JSON Output Structure)</h4>
                          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#09090b]">
                            <table className="w-full text-xs text-right border-collapse">
                              <thead>
                                <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400">
                                  <th className="p-3 font-semibold text-left">اسم الحقل (Property)</th>
                                  <th className="p-3 font-semibold">النوع (Type)</th>
                                  <th className="p-3 font-semibold">شرح التفاصيل البرمجية (Description)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                                {respFields.map((field, index) => (
                                  <tr key={index} className="hover:bg-zinc-900/40 transition-colors">
                                    <td className="p-3 font-mono text-purple-400 text-left">{field.name}</td>
                                    <td className="p-3 font-mono text-zinc-400">{field.type}</td>
                                    <td className="p-3 leading-relaxed text-zinc-300 text-right" dangerouslySetInnerHTML={{ __html: field.desc }}></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Interactive Code Samples Tab */}
                        <div className="space-y-3 text-right">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-2">
                            <button
                              onClick={() => {
                                const codeContent = activeCodeLang === "curl" ? `curl -X POST https://demo-ai-cpu.onrender.com${pathInfo} \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${modelKey}" \\\n  -d '${curlPayload}'` : activeCodeLang === "js" ? jsCode : pythonCode;
                                copyToClipboard(codeContent, "snip");
                              }}
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-all cursor-pointer self-start md:self-auto"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedKeyId === "snip" ? "تم النسخ!" : "نسخ الكود"}</span>
                            </button>
                            
                            <div className="flex items-center gap-2 justify-end self-end md:self-auto">
                              <span className="text-xs text-zinc-500">مثال الكود (Code Snippet):</span>
                              <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                                {(["curl", "js", "python"] as const).map((lang) => (
                                  <button
                                    key={lang}
                                    onClick={() => setActiveCodeLang(lang)}
                                    className={`px-3 py-1 rounded-md text-[11px] font-bold font-mono transition-all uppercase cursor-pointer ${
                                      activeCodeLang === lang
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                                  >
                                    {lang === "js" ? "Node.js (Fetch)" : lang}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono overflow-x-auto leading-relaxed text-left">
                            {activeCodeLang === "curl" ? `curl -X POST https://demo-ai-cpu.onrender.com${pathInfo} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${modelKey}" \\
  -d '${curlPayload}'` : activeCodeLang === "js" ? jsCode : pythonCode}
                          </pre>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Advanced Error Codes Reference & Troubleshooting Panel */}
              <div className="bg-[#09090b] p-6 rounded-xl border border-zinc-800 space-y-4 pt-5">
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider text-right flex items-center gap-2 justify-end">
                  <span>الأخطاء الشائعة وحلولها البرمجية (Troubleshooting & API Status Codes)</span>
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-right">
                    <span className="font-mono text-rose-400 font-extrabold text-sm block">400 Bad Request</span>
                    <h5 className="font-bold text-xs text-white">خطأ في المتغيرات (Param Error)</h5>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      يحدث عند عدم تضمين الحقول المطلوبة (كإرسال طلب توليد فيديو بدون صورة). تأكد من إرسال الحقول المطلوبة بنجاح ومطابقة أسماء المتغيرات.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-right">
                    <span className="font-mono text-rose-400 font-extrabold text-sm block">401 Unauthorized</span>
                    <h5 className="font-bold text-xs text-white">غياب مفتاح الـ API Key</h5>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      لم يتم تمرير أي مفتاح في الترويسة. تأكد من إرسال <code>Authorization: Bearer &lt;key&gt;</code> أو <code>X-API-Key</code> بوضوح.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-right">
                    <span className="font-mono text-rose-400 font-extrabold text-sm block">403 Forbidden / Mismatch</span>
                    <h5 className="font-bold text-xs text-white">عدم مطابقة المفتاح للنموذج</h5>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      لقد استخدمت مفتاح وصول لنموذج مخصص (مثل مفتاح Chat) لطلب نموذج آخر (مثل Video). استخدم مفتاح النموذج المناسب أو المفتاح الشامل <code>da_key_master</code>.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-right">
                    <span className="font-mono text-rose-400 font-extrabold text-sm block">500 Server Error</span>
                    <h5 className="font-bold text-xs text-white">خطأ في بيئة المعالجة (Gradio Error)</h5>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      فشل الاتصال بمزود الذكاء الاصطناعي أو نفاد حصة المعالجة المجانية (ZeroGPU Space quota). يرجى الانتظار بضع ثوانٍ وإعادة إرسال طلبك.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#18181b] p-6 rounded-2xl border border-zinc-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-blue-500" />
                  <span>سجلات النظام والتشخيص (System Logs & Debug Console)</span>
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  مراقبة تفاعلات الذكاء الاصطناعي، الطلبات، الردود، والأخطاء مباشرة.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSystemLogs([])}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all"
                >
                  مسح السجلات (Clear)
                </button>
                <button
                  onClick={() => copyToClipboard(systemLogs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`).join('\n'), "logs")}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ السجلات</span>
                </button>
              </div>
            </div>

            <div className="bg-[#18181b] p-6 rounded-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">سجل الأحداث ({systemLogs.length})</span>
                <span className="text-xs text-green-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  المراقبة نشطة
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs max-h-[600px] overflow-y-auto">
                {systemLogs.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">لا توجد سجلات حالية</div>
                ) : (
                  systemLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-4 rounded-xl border space-y-2 ${
                        log.type === 'error'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : log.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-[#09090b] border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] opacity-75">
                        <span className="font-bold uppercase tracking-wider">{log.type}</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <div className="font-sans font-medium text-sm text-zinc-100">{log.message}</div>
                      {log.details && (
                        <pre className="p-3 rounded-lg bg-black/40 border border-zinc-800 text-[11px] text-zinc-300 overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
