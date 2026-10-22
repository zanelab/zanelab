import { describe, expect, it } from 'vitest';
import { notify, type NotifyMessage } from './notify';

describe('notify（boot 阶段暂存 + 订阅补发）', () => {
  it('无订阅者时入队，subscribe 时按序补发', () => {
    notify.error('服务器错误，请稍后重试');
    notify.success('登录成功');

    const received: NotifyMessage[] = [];
    const unsubscribe = notify.subscribe((msg) => received.push(msg));

    expect(received.map((msg) => msg.message)).toEqual([
      '服务器错误，请稍后重试',
      '登录成功',
    ]);
    expect(received[0].level).toBe('error');
    expect(received[0].id).toBeLessThan(received[1].id);
    unsubscribe();
  });

  it('有订阅者后实时下发；重新订阅不会重复收到已补发过的消息', () => {
    const received: NotifyMessage[] = [];
    const unsubscribe = notify.subscribe((msg) => received.push(msg));
    notify.info('实时消息');
    expect(received.map((msg) => msg.message)).toEqual(['实时消息']);
    unsubscribe();

    const again: NotifyMessage[] = [];
    const unsubscribe2 = notify.subscribe((msg) => again.push(msg));
    expect(again).toHaveLength(0);
    unsubscribe2();
  });

  it('暂存条数有上限（只保留最近 5 条）', () => {
    for (let i = 1; i <= 7; i += 1) {
      notify.warning(`w${i}`);
    }
    const received: NotifyMessage[] = [];
    const unsubscribe = notify.subscribe((msg) => received.push(msg));
    expect(received.map((msg) => msg.message)).toEqual([
      'w3',
      'w4',
      'w5',
      'w6',
      'w7',
    ]);
    unsubscribe();
  });
});
