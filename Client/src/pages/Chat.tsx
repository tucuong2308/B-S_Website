import { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, Gavel, Map, Landmark, TrendingUp, 
  Send, Mic, Paperclip, Bot, User, 
  Search, Bell, Settings, Building2, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithAI } from '../services/gemini';
import { ChatMessage } from '../types';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'bot',
      content: 'Chào bạn! Tôi là trợ lý ảo chuyên về bất động sản. Tôi có thể giúp bạn kiểm tra thông tin pháp lý, tính toán lãi suất vay, hoặc tra cứu quy hoạch các khu vực. Hôm nay bạn cần hỗ trợ gì không?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      
      const aiResponse = await chatWithAI(input, history);
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: aiResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: 'Xin lỗi, tôi gặp sự cố khi kết nối. Vui lòng thử lại sau.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Chi tiết phí thuế sang tên?",
    "Thời gian xử lý mất bao lâu?",
    "Cần chuẩn bị giấy tờ gì?"
  ];

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg text-white">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Trợ lý Bất động sản AI</h2>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Hệ thống đang sẵn sàng</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-200 dark:border-slate-700">
            <Search className="text-slate-500" size={18} />
            <input className="bg-transparent border-none focus:ring-0 text-sm w-64 placeholder:text-slate-500" placeholder="Tìm kiếm thông tin..." type="text"/>
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
              <Bell size={20} />
            </button>
            <button className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
              <Settings size={20} />
            </button>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center overflow-hidden">
            <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=2080&auto=format&fit=crop" alt="User" />
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col shrink-0">
          <div className="p-4">
            <button 
              onClick={() => setMessages([messages[0]])}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-primary/20"
            >
              <PlusCircle size={20} />
              Hội thoại mới
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-2 space-y-6">
            <div>
              <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Chủ đề tư vấn</p>
              <nav className="space-y-1">
                {[
                  { icon: Gavel, label: 'Pháp lý bất động sản', active: true },
                  { icon: Map, label: 'Quy hoạch đô thị' },
                  { icon: Landmark, label: 'Tư vấn vay vốn' },
                  { icon: TrendingUp, label: 'Phân tích thị trường' }
                ].map((item, i) => (
                  <button 
                    key={i}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${item.active ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <item.icon size={18} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            
            <div>
              <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Gần đây</p>
              <div className="space-y-1">
                {[
                  { title: 'Thủ tục sang tên sổ đỏ 2024', time: '2 giờ trước' },
                  { title: 'Tính lãi suất vay ngân hàng', time: 'Hôm qua' },
                  { title: 'Dự án Vinhomes Grand Park', time: '3 ngày trước' }
                ].map((item, i) => (
                  <div key={i} className="group flex flex-col gap-1 px-3 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-l-2 border-transparent hover:border-primary transition-all">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.title}</span>
                    <span className="text-xs text-slate-500">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-gradient-to-br from-primary to-blue-700 rounded-xl p-4 text-white">
              <h4 className="font-bold text-sm mb-1">Gói Premium</h4>
              <p className="text-xs text-white/80 mb-3">Mở khóa phân tích sâu và dữ liệu quy hoạch chi tiết.</p>
              <button className="w-full py-2 bg-white text-primary text-xs font-bold rounded-lg hover:bg-opacity-90 transition-colors">
                Nâng cấp ngay
              </button>
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <section className="flex-1 flex flex-col bg-background-light dark:bg-background-dark relative">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'bot' && (
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Bot className="text-white" size={20} />
                    </div>
                  )}
                  
                  <div className={`flex flex-col gap-1.5 max-w-[80%] ${msg.role === 'user' ? 'items-end' : ''}`}>
                    <span className="text-xs font-bold text-slate-500 mx-1">
                      {msg.role === 'bot' ? 'Bot Tư vấn' : 'Bạn'}
                    </span>
                    <div className={`p-4 rounded-2xl shadow-sm border ${
                      msg.role === 'bot' 
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-tl-none text-slate-800 dark:text-slate-200' 
                        : 'bg-primary border-primary rounded-tr-none text-white'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-9 h-9 rounded-full bg-slate-300 flex items-center justify-center shrink-0 overflow-hidden">
                      <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=2080&auto=format&fit=crop" alt="User" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Bot className="text-white" size={20} />
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />

            {/* Suggestions */}
            {!isLoading && messages[messages.length-1].role === 'bot' && (
              <div className="flex flex-wrap gap-2 ml-12 pt-2">
                {suggestions.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => { setInput(s); handleSend(); }}
                    className="px-4 py-2 rounded-full border border-primary text-primary bg-white dark:bg-slate-900 hover:bg-primary hover:text-white transition-all text-xs font-semibold"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg">
            <div className="max-w-4xl mx-auto relative">
              <div className="flex items-end gap-3 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <button className="p-2 text-slate-500 hover:text-primary transition-colors">
                  <Paperclip size={20} />
                </button>
                <textarea 
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 resize-none max-h-32 placeholder:text-slate-500" 
                  placeholder="Nhập câu hỏi của bạn tại đây..." 
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button className="p-2 text-slate-500 hover:text-primary transition-colors">
                  <Mic size={20} />
                </button>
                <button 
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="bg-primary text-white p-2.5 rounded-xl shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
              <p className="text-center text-[10px] text-slate-400 mt-3 font-medium uppercase tracking-widest">
                AI có thể nhầm lẫn. Vui lòng kiểm tra lại các thông tin pháp lý quan trọng.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
