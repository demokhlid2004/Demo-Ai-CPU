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
            <div className="bg-[#18181b] p-6 rounded-2xl border border-zinc-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-500" />
                <span>API Documentation & Integration</span>
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                دليل استدعاء الواجهات البرمجية (cURL Requests) لجميع النماذج المتاحة في النظام.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {models.map((model) => (
                  <div key={model.id} className="bg-[#09090b] p-6 rounded-2xl border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{model.name}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                            {model.id}
                          </span>
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1">{model.description}</p>
                      </div>
                      <button
                        onClick={() => {
                          let bodyContent = `{\n    "model": "${model.id}",\n    "message": "Hello!"\n  }`;
                          if (model.id === "demo-ai-video") {
                            bodyContent = `{\n    "model": "${model.id}",\n    "image": "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png",\n    "prompt": "Animate image using Wan 2.2 14B I2V",\n    "duration_seconds": 3.5,\n    "frame_multiplier": 32,\n    "steps": 5\n  }`;
                          } else if (model.id === "demo-ai-pro") {
                            bodyContent = `{\n    "model": "${model.id}",\n    "audio": "<BASE64_AUDIO_DATA>",\n    "voice_choice": "Tina / 中文-甜甜"\n  }`;
                          } else if (model.id === "demo-ai-image") {
                            bodyContent = `{\n    "model": "${model.id}",\n    "image": "<BASE64_IMAGE_DATA>",\n    "prompt": "Transform into anime style",\n    "lora_adapter": "Photo-to-Anime"\n  }`;
                          }
                          const curlCmd = `curl -X POST https://demo-ai-cpu.onrender.com/api/v1/chat \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${model.apiKey || 'YOUR_MODEL_API_KEY'}" \\\n  -d '${bodyContent}'`;
                          copyToClipboard(curlCmd, model.id);
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-all shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedKeyId === model.id ? "Copied!" : "Copy cURL"}</span>
                      </button>
                    </div>

                    <pre className="p-4 rounded-xl bg-[#121215] border border-zinc-800/80 text-xs text-blue-300 font-mono overflow-x-auto leading-relaxed">
{model.id === "demo-ai-video" ? `curl -X POST https://demo-ai-cpu.onrender.com/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${model.apiKey || 'YOUR_MODEL_API_KEY'}" \\
  -d '{
    "model": "demo-ai-video",
    "image": "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png",
    "prompt": "Animate image using Wan 2.2 14B I2V",
    "duration_seconds": 3.5,
    "frame_multiplier": 32,
    "steps": 5
  }'` : model.id === "demo-ai-pro" ? `curl -X POST https://demo-ai-cpu.onrender.com/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${model.apiKey || 'YOUR_MODEL_API_KEY'}" \\
  -d '{
    "model": "demo-ai-pro",
    "audio": "<BASE64_AUDIO_DATA_OR_URL>",
    "video": "<BASE64_VIDEO_DATA_OR_URL>",
    "voice_choice": "Tina / 中文-甜甜",
    "response_type": "both" // options: "both" | "text" | "audio"
  }'` : model.id === "demo-ai-image" ? `curl -X POST https://demo-ai-cpu.onrender.com/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${model.apiKey || 'YOUR_MODEL_API_KEY'}" \\
  -d '{
    "model": "demo-ai-image",
    "image": "<BASE64_IMAGE_DATA>",
    "prompt": "Change style to Anime",
    "lora_adapter": "Photo-to-Anime"
  }'` : `curl -X POST https://demo-ai-cpu.onrender.com/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${model.apiKey || 'YOUR_MODEL_API_KEY'}" \\
  -d '{
    "model": "${model.id}",
    "message": "Hello!"
  }'`}
                    </pre>

                    {(model.id === "demo-ai-video" || model.id === "demo-ai-1-8B") && (
                      <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-2">
                        <p className="font-semibold text-blue-200 flex items-center gap-1.5">
                          <span>🎬 نموذج Demo-AI video (إنشاء فيديو من صورة):</span>
                        </p>
                        <p className="text-zinc-300 leading-relaxed">
                          نموذج توليد وتصميم مقاطع الفيديو من الصور مدعوم بنموذج <strong>Wan 2.2 14B Image-to-Video</strong> مع تقنية <strong>Lightning LoRA</strong>. يتم إرسال الطلب من جانبنا باستخدام مفتاح API الخاّص بالنموذج، وتقوم المنظومة بمعالجة الطلب داخلياً وإرساله إلى Gradio API عبر مسار <code>/generate_video</code> بنظام الطلب المزدوج (POST ثم GET):
                        </p>
                        <div className="p-2.5 rounded-lg bg-[#09090b] border border-blue-500/20 font-mono text-[11px] text-zinc-400 overflow-x-auto space-y-1 dir-ltr">
                          <p className="text-blue-400 font-semibold">// Internal Gradio Execution Flow (/generate_video):</p>
                          <p>{`curl -X POST https://kulkas2pintu-wan555.hf.space/gradio_api/call/generate_video -s -H "Content-Type: application/json" -d '{"data": [{"path":"..."}, null, "Prompt", 1, "", 0.5, 0, 0, 0, true, 1, "FlowMatchEulerDiscrete", 0.5, "16", true, true]}'`} \</p>
                          <p>{`  | awk -F'"' '{ print $4}' \\`}</p>
                          <p>{`  | read EVENT_ID; curl -N https://kulkas2pintu-wan555.hf.space/gradio_api/call/generate_video/$EVENT_ID`}</p>
                        </div>
                      </div>
                    )}

                    {model.id === "demo-ai-pro" && (
                      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 space-y-3">
                        <div className="font-bold text-purple-300 text-sm flex items-center gap-2">
                          <span>🎙️ Demo-AI Pro (Omni) — دعم مدخلات الوسائط الصوتيّة والمرئية (/media_predict)</span>
                        </div>
                        <p className="text-zinc-300 leading-relaxed">
                          يتيح نموذج Demo-AI Pro معالجة الوسائط المتعددة بدقة عالية عبر مسار <code>/media_predict</code>. تدعم المنظومة الطرق التالية لإرسال البيانات:
                        </p>
                        <ul className="space-y-1.5 text-zinc-300 list-disc list-inside bg-[#09090b]/60 p-3 rounded-lg border border-purple-500/20">
                          <li><strong className="text-purple-300">🎙️ التسجيل الصوتي المباشر:</strong> تسجيل الصوت فورياً وإرساله بصيغة FileData.</li>
                          <li><strong className="text-purple-300">📁 رفع ملف صوتي:</strong> إمكانية رفع مقاطع صوتية من الجهاز (WAV, MP3, WEBM).</li>
                          <li><strong className="text-purple-300">🎥 رفع مقطع فيديو:</strong> إضافة خيار رفع ملف فيديو لمعالجته ضمن النموذج عبر معامل <code>video</code>.</li>
                        </ul>

                        <div className="pt-2 border-t border-purple-500/20 space-y-2">
                          <p className="font-semibold text-purple-300">⚙️ تحديد نوع الرد المطلوب (Response Format Modes):</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="p-2.5 rounded-lg bg-[#09090b] border border-purple-500/20 text-[11px] space-y-1">
                              <span className="text-green-400 font-bold block">1️⃣ نص + مقطع صوتي (both)</span>
                              <p className="text-zinc-400">إرجاع الرد النصي المكتوب ورابط المقطع الصوتي للتشغيل المباشر.</p>
                              <code className="text-purple-300 font-mono block text-[10px]">"response_type": "both"</code>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#09090b] border border-purple-500/20 text-[11px] space-y-1">
                              <span className="text-blue-400 font-bold block">2️⃣ رد نصي فقط (text)</span>
                              <p className="text-zinc-400">إرجاع نص الرد فقط وتصفية المقطع الصوتي.</p>
                              <code className="text-purple-300 font-mono block text-[10px]">"response_type": "text"</code>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#09090b] border border-purple-500/20 text-[11px] space-y-1">
                              <span className="text-amber-400 font-bold block">3️⃣ رد صوتي فقط (audio)</span>
                              <p className="text-zinc-400">إرجاع رابط المقطع الصوتي فقط لتشغيله أو تحميله مباشرة.</p>
                              <code className="text-purple-300 font-mono block text-[10px]">"response_type": "audio"</code>
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#09090b] border border-purple-500/20 font-mono text-[11px] text-zinc-400 overflow-x-auto space-y-1 dir-ltr">
                          <p className="text-purple-400 font-semibold">// Internal Gradio Execution Flow (/media_predict):</p>
                          <p>{`curl -X POST https://qwen-qwen3-5-omni-online-demo.hf.space/gradio_api/call/media_predict -s -H "Content-Type: application/json" -d '{`}</p>
                          <p>{`  "data": [`}</p>
                          <p>{`    {"path":"https://github.com/gradio-app/gradio/raw/main/test/test_files/audio_sample.wav","meta":{"_type":"gradio.FileData"}},`}</p>
                          <p>{`    null,`}</p>
                          <p>{`    [],`}</p>
                          <p>{`    "Tina / 中文-甜甜",`}</p>
                          <p>{`    0.1,`}</p>
                          <p>{`    0.05,`}</p>
                          <p>{`    1`}</p>
                          <p>{`  ]`}</p>
                          <p>{`}' | awk -F'"' '{ print $4}' \\`}</p>
                          <p>{`  | read EVENT_ID; curl -N https://qwen-qwen3-5-omni-online-demo.hf.space/gradio_api/call/media_predict/$EVENT_ID`}</p>
                        </div>
                      </div>
                    )}

                    {model.id === "demo-ai-image" && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                        <p className="font-semibold text-amber-200">🖼️ نموذج demo-ai-image:</p>
                        <p className="text-zinc-400 leading-normal">
                          نموذج متخصص في تحرير وتعديل الصور عبر إرسال الصورة والوصف المطلوب (Prompt).
                        </p>
                      </div>
                    )}
                  </div>
                ))}
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
