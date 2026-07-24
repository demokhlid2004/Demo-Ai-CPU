export interface AIModelInfo {
  id: string;
  name: string;
  space: string;
  type: 'iframe' | 'gradio';
  endpoint?: string;
  description: string;
  apiKey: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
