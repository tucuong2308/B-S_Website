import { BACKEND_CONFIG } from '../config/backend.config';
import { API_ENDPOINTS } from '../config/endpoints';
import { ChatMessage } from '../types';

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

const buildUrl = (path: string): string => {
  const base = BACKEND_CONFIG.BASE_URL.replace(/\/$/, '');
  return `${base}${path}`;
};

export const chatWithAgent = async (
  message: string,
  history: ChatMessage[] = []
): Promise<string> => {
  const url = buildUrl(API_ENDPOINTS.CHAT.MESSAGE);

  const historyPayload: ChatHistoryItem[] = history.map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...BACKEND_CONFIG.DEFAULT_HEADERS,
    },
    body: JSON.stringify({ message, history: historyPayload }),
    signal: AbortSignal.timeout(BACKEND_CONFIG.TIMEOUT),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Lỗi từ server (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.response as string;
};
