import { useRef, useState, type ReactNode } from 'react';
import { AppIcon } from '../icon/app-icon';

/**
 * UploadDropzone — 文件上传区（drop + 点击 choose；任务 11-25-skills-form-upload）。
 *
 * 受控组件：已上传文件列表由调用方持有（value/onChange）；**上传函数注入**
 * （upload prop）——组件零耦合红线（不 import 任何 app api 层），portal/iam
 * 可复用。单文件模式（multiple=false）新上传**替换**旧文件；多文件模式追加。
 *
 * 形态：虚线 drop 区（dragover 高亮）+ 文件列表（图标/名称/大小/移除）；
 * 上传中 spinner、失败文案 + 重试。样式走语义 token；圆角
 * rounded-(--page-radius)（内联 22px 兜底，子应用根上的变量自然覆盖）。
 *
 * kind 推断：按 mime（image/* / video/*），其余归 file。
 */

export interface UploadedFile {
  name: string;
  size: number;
  url: string;
  kind: 'image' | 'video' | 'file';
}

export interface UploadDropzoneProps {
  /** 多文件模式（追加）；缺省单文件（替换） */
  multiple?: boolean;
  /** input accept 透传（如 'image/*,video/*' 或 '.zip'） */
  accept?: string;
  /** 大小上限 MB（前端预检；服务端仍有最终校验）。缺省 50 */
  maxSizeMB?: number;
  /** 上传函数（调用方注入——返回含 url 的结果；抛错 = 失败展示 + 重试） */
  upload: (file: File) => Promise<{ url: string; name: string; size: number }>;
  /** 已上传文件列表（受控） */
  value?: UploadedFile[];
  onChange?: (files: UploadedFile[]) => void;
  /** drop 区主文案（如「拖拽文件到此处，或点击选择」） */
  label?: ReactNode;
  /** 附加说明（如格式/大小限制） */
  hint?: ReactNode;
  /** 上传失败兜底文案前缀（具体错误取 upload 抛出的 message） */
  errorText?: ReactNode;
}

function kindOf(file: File): UploadedFile['kind'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'file';
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function UploadDropzone({
  multiple = false,
  accept,
  maxSizeMB = 50,
  upload,
  value = [],
  onChange,
  label,
  hint,
  errorText,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastRejected = useRef<File | null>(null); // 失败重试目标

  const emit = (files: UploadedFile[]) => {
    onChange?.(multiple ? [...value, ...files] : files.slice(-1));
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    // 逐个上传（顺序保证多文件 order 语义）；单文件模式取最后一个
    const queue = multiple ? list : list.slice(-1);
    for (const file of queue) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`${file.name} > ${maxSizeMB}MB`);
        continue;
      }
      setUploadingName(file.name);
      lastRejected.current = file;
      try {
        const result = await upload(file);
        emit([
          {
            name: result.name,
            size: result.size,
            url: result.url,
            kind: kindOf(file),
          },
        ]);
        lastRejected.current = null;
      } catch (e) {
        setError((e as Error).message || String(errorText ?? ''));
      } finally {
        setUploadingName(null);
      }
    }
  };

  const remove = (url: string) => {
    onChange?.(value.filter((f) => f.url !== url));
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-label={typeof label === 'string' ? label : undefined}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        style={{ '--page-radius': '22px' } as React.CSSProperties}
        className={`border-base-300 bg-base-200 hover:border-primary/60 flex cursor-pointer flex-col items-center gap-2 rounded-(--page-radius) border border-dashed px-4 py-6 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : ''
        }`}
      >
        <span className="bg-base-100 text-base-content/60 grid size-11 place-items-center rounded-full shadow-sm">
          <AppIcon name="upload" className="size-5" />
        </span>
        <span className="text-base-content text-[13px] font-medium">
          {label}
        </span>
        {hint ? (
          <span className="text-base-content/50 text-[12px]">{hint}</span>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple={multiple}
          accept={accept}
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = ''; // 允许重复选择同一文件
          }}
        />
      </div>

      {uploadingName ? (
        <div className="border-base-300 bg-base-100 flex items-center gap-3 rounded-(--page-radius) border px-3 py-2.5 text-[13px]">
          <span className="loading loading-spinner loading-xs" />
          <span className="text-base-content/70 min-w-0 flex-1 truncate">
            {uploadingName}
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between gap-2 text-[12.5px]">
          <span className="text-error min-w-0 flex-1 truncate">{error}</span>
          {lastRejected.current ? (
            <button
              type="button"
              className="text-error shrink-0 underline"
              onClick={() => {
                const f = lastRejected.current;
                if (f) void handleFiles([f] as unknown as FileList);
              }}
            >
              <AppIcon name="rotate-cw" className="mr-0.5 inline size-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      {value.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {value.map((file) => (
            <li
              key={file.url}
              className="border-base-300 bg-base-100 flex items-center gap-3 rounded-(--page-radius) border px-3 py-2.5"
            >
              <span className="bg-base-200 text-base-content/60 grid size-8 shrink-0 place-items-center rounded-[10px]">
                <AppIcon
                  name={
                    file.kind === 'video'
                      ? 'video'
                      : file.kind === 'image'
                        ? 'photo'
                        : 'download'
                  }
                  className="size-4"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-base-content block truncate text-[13px] font-medium">
                  {file.name}
                </span>
                <span className="text-base-content/50 block text-[11.5px]">
                  {formatSize(file.size)}
                </span>
              </span>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => remove(file.url)}
                className="text-base-content/40 hover:bg-base-content/5 hover:text-base-content grid size-7 shrink-0 place-items-center rounded-full transition-colors"
              >
                <AppIcon name="close" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
