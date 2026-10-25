import { useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { getProps } from './main';
import { LoginPage } from './pages/LoginPage';

function SystemPage({ title }: { title: string }) {
  const props = getProps();
  const location = useLocation();
  return (
    <div className="p-6">
      <div className="card bg-base-100 w-[28rem] shadow-xl">
        <div className="card-body gap-3">
          <h2 className="card-title">
            {title}{' '}
            <span className="badge badge-secondary badge-outline">
              来自 iam
            </span>
          </h2>
          <div className="text-sm opacity-70">
            当前路由：{location.pathname}
          </div>
          <div className="text-xs opacity-50">
            token: {props.token ? '已注入' : '未注入'} · permissions:{' '}
            {Array.isArray(props.permissions) ? props.permissions.length : 0} 项
          </div>
        </div>
      </div>
    </div>
  );
}

interface Msg {
  role: 'user' | 'bot';
  text: string;
}

function ChatPage() {
  const props = getProps();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');

    setTimeout(
      () => setMessages((m) => [...m, { role: 'bot', text: `收到：${text}` }]),
      200,
    );
  };

  return (
    <div className="p-6">
      <div className="rounded-box bg-base-100 flex h-[32rem] w-[40rem] flex-col shadow-xl">
        <div className="border-base-300 flex items-center gap-2 border-b px-4 py-2">
          <h2 className="card-title">聊天</h2>
          <span className="badge badge-secondary badge-outline">来自 iam</span>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="text-sm opacity-50">说点什么吧…</div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'}`}
              >
                <div className="chat-bubble">{m.text}</div>
              </div>
            ))
          )}
        </div>
        <div className="border-base-300 flex gap-2 border-t p-3">
          <input
            className="input input-bordered input-sm flex-1"
            value={input}
            placeholder="输入消息，回车发送"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
          />
          <button className="btn btn-sm btn-primary" onClick={send}>
            发送
          </button>
        </div>
        <div className="px-4 pb-2 text-xs opacity-50">
          token: {props.token ? '已注入' : '未注入'}
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route index element={<SystemPage title="用户管理" />} />
      <Route path="users" element={<SystemPage title="用户管理" />} />
      <Route path="roles" element={<SystemPage title="角色管理" />} />
      <Route path="chat" element={<ChatPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="*" element={<SystemPage title="系统管理" />} />
    </Routes>
  );
}
