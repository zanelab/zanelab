import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { syncNavigate } from './sync-navigate';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

afterEach(cleanup);

function PlainButton() {
  const navigate = useNavigate();

  return (
    <button onClick={() => Promise.resolve().then(() => navigate('/app'))} />
  );
}

function SyncButton() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() =>
        Promise.resolve().then(() => syncNavigate(navigate, '/app'))
      }
    />
  );
}

async function drainMicrotasks() {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

describe('syncNavigate（auth↔layout 跨树导航同步提交）', () => {
  it('对照组（复现竞态）：BrowserRouter 默认 transition + 直接 navigate → 微任务时机目标树未提交', async () => {
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PlainButton />} />
          <Route path="/app" element={<div id="target" />} />
        </Routes>
      </BrowserRouter>,
    );
    fireEvent.click(screen.getByRole('button'));
    await drainMicrotasks();

    expect(document.getElementById('target')).toBeNull();
  });

  it('修复不变量：useTransitions={false} + syncNavigate → 微任务排空时目标树已在 DOM', async () => {
    render(
      <BrowserRouter useTransitions={false}>
        <Routes>
          <Route path="/" element={<SyncButton />} />
          <Route path="/app" element={<div id="target" />} />
        </Routes>
      </BrowserRouter>,
    );
    fireEvent.click(screen.getByRole('button'));
    await drainMicrotasks();
    expect(document.getElementById('target')).not.toBeNull();
  });
});
