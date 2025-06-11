// src/renderer/components/LogContent.tsx
import React, { useEffect, useRef } from 'react';

interface LogMessage {
  id: string; // Або timestamp, якщо він унікальний
  text: string;
  time: string;
}

interface LogContentProps {
  messages: LogMessage[];
}

function LogContent({ messages }: LogContentProps) {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Автоматично прокручувати до останнього повідомлення
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); // Прокручувати при зміні повідомлень

  if (!messages || messages.length === 0) {
    return <div className="p-4 text-gray-500">Лог порожній.</div>;
  }

  return (
    <div className="p-4 overflow-y-auto h-full flex flex-col"> {/* flex-col для правильного росту */}
      {messages.map((msg) => (
        <div key={msg.id} className="mb-2">
          <span className="text-xs text-gray-500 mr-2">{msg.time}</span>
          <span className="whitespace-pre-wrap">{msg.text}</span>
        </div>
      ))}
      <div ref={endOfMessagesRef} /> {/* Елемент для прокрутки */}
    </div>
  );
}

export default LogContent;
export type { LogMessage }; // Експортуємо тип повідомлення