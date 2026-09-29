import React, { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatBot({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! Welcome to S Tech Store. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { sender: "user", text: input }]);
    const currentInput = input;
    setInput("");
    
    // Simple mock AI response
    setTimeout(() => {
      let reply = "I'm a simple bot. Contact us on Telegram for real human support!";
      if (currentInput.toLowerCase().includes("price")) reply = "Our prices are listed on the product pages. All prices are in USD.";
      if (currentInput.toLowerCase().includes("delivery")) reply = "We offer fast delivery across Cambodia. $2 for Phnom Penh, $3 for provinces.";
      if (currentInput.toLowerCase().includes("stock")) reply = "If you can add it to cart, it's in stock!";
      
      setMessages(prev => [...prev, { sender: "bot", text: reply }]);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b flex items-center justify-between shadow-sm flex-shrink-0" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-[15px]">S Tech Support</h3>
            <span className="text-[11px] text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span> Online
            </span>
          </div>
        </div>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] p-3 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
              msg.sender === "user" 
                ? "bg-[#8B1A1A] text-white rounded-tr-sm" 
                : "bg-white text-gray-800 rounded-tl-sm border border-gray-100"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t p-3 flex items-center gap-3 flex-shrink-0" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          className="flex-1 bg-gray-100 border-transparent rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 text-[14px]"
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim()}
          className="w-10 h-10 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center disabled:opacity-50 flex-shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
