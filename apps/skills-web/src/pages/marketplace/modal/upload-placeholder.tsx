import type { MouseEvent, RefObject } from 'react';

/**
 * 上传占位对话框（R8/D10：后端尚未提供上传接口，按钮只做入口占位）。
 *
 * daisyUI modal 的首选形态：HTML `<dialog class="modal">` + `showModal()`
 * （components/modal.md「If possible, use the HTML `dialog` element」）——焦点陷阱、
 * Esc 关闭、`method="dialog"` 提交关闭都由浏览器负责，无需自己实现。
 *
 * jsdom（单测环境）未实现 HTMLDialogElement（`showModal`/`close` 都不存在），
 * 故 open/close 各留一条兜底：直接切 `open` 属性——daisyUI 的 `.modal[open]`
 * 规则同样命中，样式与真实浏览器一致（少掉焦点陷阱与 ::backdrop，够单测断言）。
 */

export function openDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

export function closeDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) return;
  // 真实浏览器：close() 对未打开的 dialog 是 no-op（幂等）；showModal 反向亦然
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

interface UploadPlaceholderProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
}

export function UploadPlaceholder({ dialogRef }: UploadPlaceholderProps) {
  const close = () => closeDialog(dialogRef.current);
  /**
   * 关闭按钮：`method="dialog"` 的提交由浏览器负责关闭本对话框（modal 指南的
   * 首选做法）；这里显式关闭 + preventDefault 是给**无 `<dialog>` 实现的环境**
   * （jsdom 单测：没有 showModal/close，且 requestSubmit 未实现会往 stderr 打
   * not-implemented）兜底——两种环境下最终都是「对话框关闭」，行为一致。
   */
  const closeByButton = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    close();
  };
  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="upload-placeholder-title"
      // 原生 modal 的 Esc 由浏览器处理；这条是给无 <dialog> 实现的环境兜底
      // （jsdom 单测），真实浏览器上重复关闭幂等
      onKeyDown={(event) => {
        if (event.key === 'Escape') close();
      }}
    >
      <div className="modal-box">
        <h3
          id="upload-placeholder-title"
          className="text-base-content text-lg font-semibold"
        >
          上传 skills
        </h3>
        <p className="text-base-content/60 mt-3 text-sm">
          上传功能待接入：后端上传接口尚未提供，这里只是一个占位入口。
          接入后可在此选择 skill 包、填写名称与简介，再提交审核。
        </p>
        <div className="modal-action">
          <form method="dialog">
            <button
              type="submit"
              className="btn btn-sm"
              onClick={closeByButton}
            >
              知道了
            </button>
          </form>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={closeByButton}>关闭</button>
      </form>
    </dialog>
  );
}
