import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { changePasswordMock, notifySuccessMock } = vi.hoisted(() => ({
  changePasswordMock: vi.fn(),
  notifySuccessMock: vi.fn(),
}));

vi.mock('../../../../api/auth', () => ({
  authApi: { changePassword: changePasswordMock },
}));
vi.mock('@zanelab/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@zanelab/utils')>();
  return {
    ...actual,
    notify: {
      success: notifySuccessMock,
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

import { ChangePasswordModal } from './change-password-modal';

afterEach(cleanup);
beforeEach(() => {
  changePasswordMock.mockReset();
  changePasswordMock.mockResolvedValue(undefined);
  notifySuccessMock.mockReset();
});

const passwordInputs = () =>
  Array.from(
    document.querySelectorAll('.modal-box input'),
  ) as HTMLInputElement[];

const errorMessages = () =>
  Array.from(document.querySelectorAll('.modal-box p.text-destructive'));

function fill(values: [string, string, string]) {
  const inputs = passwordInputs();
  values.forEach((value, index) => {
    fireEvent.change(inputs[index], { target: { value } });
  });
}

function submit() {
  fireEvent.click(document.querySelector('.modal-box button.btn-primary')!);
}

describe('ChangePasswordModal', () => {
  it('open=false 时不渲染 modal', () => {
    const { container } = render(
      <ChangePasswordModal open={false} onOpenChange={vi.fn()} />,
    );
    expect(container.querySelector('.modal')).toBeNull();
  });

  it('portal 到 body 且层级高于 AnchoredPortal 面板（z-1000）', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    try {
      render(<ChangePasswordModal open onOpenChange={vi.fn()} />, {
        container: host,
      });
      const modal = document.querySelector<HTMLElement>('.modal')!;
      expect(modal.parentElement).toBe(document.body);
      expect(host.contains(modal)).toBe(false);

      expect(modal.style.zIndex).toBe('1100');
    } finally {
      document.body.removeChild(host);
    }
  });

  it('三个字段都为空 → 三条必填错误，且不发请求', () => {
    render(<ChangePasswordModal open onOpenChange={vi.fn()} />);
    submit();
    expect(errorMessages()).toHaveLength(3);
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('新密码短于 8 位 → 仅新密码报长度错误', () => {
    render(<ChangePasswordModal open onOpenChange={vi.fn()} />);
    fill(['Oldpwd123', 'Abc1', 'Abc1']);
    submit();
    expect(errorMessages()).toHaveLength(1);
    expect(passwordInputs()[1].getAttribute('aria-invalid')).toBe('true');
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('新密码长于 32 位 → 仅新密码报长度错误', () => {
    render(<ChangePasswordModal open onOpenChange={vi.fn()} />);
    const tooLong = `Aa1!${'a'.repeat(29)}`;
    fill(['Oldpwd123', tooLong, tooLong]);
    submit();
    expect(errorMessages()).toHaveLength(1);
    expect(passwordInputs()[1].getAttribute('aria-invalid')).toBe('true');
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('新密码只覆盖 2 类字符 → 仅新密码报字符类错误', () => {
    render(<ChangePasswordModal open onOpenChange={vi.fn()} />);
    fill(['Oldpwd123', 'abcdefg1', 'abcdefg1']);
    submit();
    expect(errorMessages()).toHaveLength(1);
    expect(passwordInputs()[1].getAttribute('aria-invalid')).toBe('true');
    expect(passwordInputs()[0].getAttribute('aria-invalid')).toBe('false');
    expect(passwordInputs()[2].getAttribute('aria-invalid')).toBe('false');
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('新密码与原密码相同 → 仅新密码报错（已过策略校验）', () => {
    render(<ChangePasswordModal open onOpenChange={vi.fn()} />);
    fill(['Abc12345', 'Abc12345', 'Abc12345']);
    submit();
    expect(errorMessages()).toHaveLength(1);
    expect(passwordInputs()[1].getAttribute('aria-invalid')).toBe('true');
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('确认密码与新密码不一致 → 仅确认密码报错', () => {
    render(<ChangePasswordModal open onOpenChange={vi.fn()} />);
    fill(['Oldpwd123', 'Newpwd123', 'Otherpwd123']);
    submit();
    expect(errorMessages()).toHaveLength(1);
    expect(passwordInputs()[2].getAttribute('aria-invalid')).toBe('true');
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('字符类实时反馈：4 个类别标记 + 已覆盖数随输入更新', () => {
    render(<ChangePasswordModal open onOpenChange={vi.fn()} />);
    expect(document.querySelectorAll('.modal-box .badge')).toHaveLength(4);

    fill(['', 'abcdefgh', '']);

    expect(document.querySelector('.modal-box')!.textContent).toContain('1/3');

    fill(['', 'Abcdefg1', '']);

    expect(document.querySelector('.modal-box')!.textContent).toContain('3/3');
  });

  it('显隐按钮：点击后仅该字段由密文切为明文，可再次切回', () => {
    render(<ChangePasswordModal open onOpenChange={vi.fn()} />);
    expect(passwordInputs()[0].type).toBe('password');
    const firstToggle = document
      .querySelectorAll('.modal-box label.input')[0]
      .querySelector('button')!;

    fireEvent.click(firstToggle);
    expect(passwordInputs()[0].type).toBe('text');
    expect(passwordInputs()[1].type).toBe('password');

    fireEvent.click(firstToggle);
    expect(passwordInputs()[0].type).toBe('password');
  });

  it('校验通过 → 提交 base64 后的三个密码，成功后关闭并提示', async () => {
    const onOpenChange = vi.fn();
    render(<ChangePasswordModal open onOpenChange={onOpenChange} />);
    fill([' Oldpwd123 ', ' Newpwd123 ', ' Newpwd123 ']);
    submit();

    await waitFor(() => expect(changePasswordMock).toHaveBeenCalledTimes(1));
    expect(changePasswordMock).toHaveBeenCalledWith({
      oldPassword: btoa('Oldpwd123'),
      newPassword: btoa('Newpwd123'),
      confirmPassword: btoa('Newpwd123'),
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(notifySuccessMock).toHaveBeenCalledTimes(1);
  });

  it('接口失败 → 不关闭弹窗（错误提示由 http 拦截器统一给出）', async () => {
    changePasswordMock.mockRejectedValue(new Error('boom'));
    const onOpenChange = vi.fn();
    render(<ChangePasswordModal open onOpenChange={onOpenChange} />);
    fill(['Oldpwd123', 'Newpwd123', 'Newpwd123']);
    submit();

    await waitFor(() => expect(changePasswordMock).toHaveBeenCalledTimes(1));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(notifySuccessMock).not.toHaveBeenCalled();
  });
});
