import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';

interface AnchoredPortalProps {
  open: boolean;

  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;

  offsetY?: number;

  offsetX?: number;
}

export function AnchoredPortal({
  open,
  anchorRef,
  onClose,
  offsetY = 0,
  offsetX = 0,
  children,
}: AnchoredPortalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ right: number; top: number } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({
        top: rect.bottom + offsetY,
        right: window.innerWidth - rect.right + offsetX,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef, offsetY, offsetX]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, onClose, anchorRef]);

  if (!open || !coords) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: coords.top,
        right: coords.right,
        zIndex: 1000,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
