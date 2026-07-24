import React, { useState, useEffect } from "react";
import { 
  Bot, Shield, Key, Terminal, Cpu, Globe, Lock, Send, RefreshCw, 
  Copy, Check, Eye, EyeOff, LogOut, Sparkles, Layers, FileCode, CheckCircle2, AlertCircle, Play
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
  const [activeTab, setActiveTab] = useState<"models" | "playground" | "keys" | "docs">("models");
  const [models, setModels] = useState<AIModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("demo-ai-1-8B");
  
  // Playground State
  const [inputMessage, setInputMessage] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("You are Demo-AI assistant.");
  const [thinkLevel, setThinkLevel] = useState("high");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiOutput, setApiOutput] = useState<any>(null);

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

  const fetchModels = async (token: string) => {
    try {
      const res = await fetch("/api/models", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.models) {
        setModels(data.models);
        setIsAuthenticated(true);
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
    if (!inputMessage.trim()) return;
    setIsGenerating(true);
    setApiOutput(null);

    const newHistory = [...chatHistory, { role: "user", content: inputMessage }];
    setChatHistory(newHistory);
    setInputMessage("");

    try {
      const res = await fetch(`/api/test-model/${selectedModelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: newHistory[newHistory.length - 1].content,
          system_prompt: systemPrompt,
          think_level: thinkLevel,
          history: newHistory
        })
      });
      const data = await res.json();
      setApiOutput(data);

      let assistantText = "";
      if (selectedModelId === "demo-ai-1-8B" || selectedModelId === "demo-ai-chat" || selectedModelId === "demo-ai-pro") {
        if (Array.isArray(data.data)) {
          assistantText = data.data.find((item: any) => typeof item === "string") || JSON.stringify(data.data, null, 2);
        } else {
          assistantText = JSON.stringify(data, null, 2);
        }
      } else {
        assistantText = data.response || JSON.stringify(data);
      }

      setChatHistory([...newHistory, { role: "assistant", content: assistantText }]);
    } catch (err: any) {
      setApiOutput({ error: err.message });
      setChatHistory([...newHistory, { role: "assistant", content: "Error executing model request." }]);
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
                        <div className="whitespace-pre-wrap">{msg.content}</div>
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
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRunPlayground();
                  }}
                  className="flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={`Message ${selectedModel?.name}...`}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#09090b] border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !inputMessage.trim()}
                    className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center gap-2 transition-all shadow disabled:opacity-50"
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
                Send text requests and receive AI responses using your customized per-model API key.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* cURL Example */}
              <div className="bg-[#18181b] p-6 rounded-2xl border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">cURL Request</h3>
                  <button
                    onClick={() => copyToClipboard(`curl -X POST ${window.location.origin}/api/v1/chat \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_MODEL_API_KEY" \\\n  -d '{"model": "demo-ai-1-8B", "message": "Hello World!"}'`, "curl")}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#09090b] border border-zinc-800 text-xs text-blue-300 font-mono overflow-x-auto leading-relaxed">
{`curl -X POST ${window.location.origin}/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_MODEL_API_KEY" \\
  -d '{
    "model": "demo-ai-1-8B",
    "message": "Hello world!"
  }'`}
                </pre>
              </div>

              {/* Node.js / Gradio Client Example */}
              <div className="bg-[#18181b] p-6 rounded-2xl border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">Node.js JavaScript Client</h3>
                  <button
                    onClick={() => copyToClipboard(`import { Client } from "@gradio/client";\n\nconst client = await Client.connect("MegaTronX/Abliterated-NeuralDaredevil-Llama-3_1-8B");\nconst result = await client.predict("/chat", { message: "Hello!" });\nconsole.log(result.data);`, "js")}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#09090b] border border-zinc-800 text-xs text-green-300 font-mono overflow-x-auto leading-relaxed">
{`import { Client } from "@gradio/client";

const client = await Client.connect("MegaTronX/Abliterated-NeuralDaredevil-Llama-3_1-8B");
const result = await client.predict("/chat", { 
  message: "Hello!!" 
});

console.log(result.data);`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
