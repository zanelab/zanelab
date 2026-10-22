import { useEffect, useRef, useCallback } from 'react';

interface DragOptions {
  min: number;
  max: number;
}

interface DragElements {
  target: HTMLElement | null;
  dragBar: HTMLElement | null;
}

type DragCallback = (newWidth: number) => void;

export function useSidebarDrag() {
  const isDragging = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const dragOverlayRef = useRef<HTMLElement | null>(null);

  const endDrag = useCallback(() => {
    cleanupRef.current?.();
  }, []);

  const startDrag = useCallback(
    (
      e: MouseEvent,
      options: DragOptions,
      elements: DragElements,
      onDrag: DragCallback,
    ) => {
      const { min, max } = options;
      const { dragBar, target } = elements;

      if (isDragging.current || !dragBar || !target) return;

      e.preventDefault();
      e.stopPropagation();

      isDragging.current = true;

      const startX = e.clientX;
      const startWidth = target.getBoundingClientRect().width;
      const startLeft = dragBar.offsetLeft;

      dragBar.classList.add('bg-primary');
      dragBar.classList.remove('bg-primary/30');

      const dragBarTransition = dragBar.style.transition;
      const targetTransition = target.style.transition;

      dragBar.style.transition = 'none';
      target.style.transition = 'none';

      const dragOverlay = document.createElement('div');
      dragOverlay.style.position = 'fixed';
      dragOverlay.style.inset = '0';
      dragOverlay.style.zIndex = '9999';
      dragOverlay.style.cursor = 'col-resize';
      dragOverlay.style.userSelect = 'none';
      dragOverlay.style.outline = 'none';
      dragOverlay.tabIndex = -1;
      dragOverlay.style.background = 'rgba(0,0,0,0)';
      document.body.append(dragOverlay);
      dragOverlayRef.current = dragOverlay;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current || !dragBar || !target) {
          endDrag();
          return;
        }

        const deltaX = moveEvent.clientX - startX;
        let currentWidth = startWidth + deltaX;

        const isOutOfMin = currentWidth < min;
        const isOutOfMax = currentWidth > max;
        const isOutOfBounds = isOutOfMin || isOutOfMax;

        if (isOutOfMin) currentWidth = min;
        if (isOutOfMax) currentWidth = max;

        const newLeft = startLeft + (currentWidth - startWidth);

        if (dragOverlayRef.current) {
          dragOverlayRef.current.style.cursor = isOutOfBounds
            ? 'not-allowed'
            : 'col-resize';
        }

        dragBar.style.left = `${newLeft}px`;

        if (isOutOfBounds) {
          dragBar.classList.add('bg-primary/30');
          dragBar.classList.remove('bg-primary');
        } else {
          dragBar.classList.add('bg-primary');
          dragBar.classList.remove('bg-primary/30');
        }
      };

      const onMouseUp = (upEvent: MouseEvent) => {
        if (!isDragging.current || !dragBar || !target) {
          endDrag();
          return;
        }

        const deltaX = upEvent.clientX - startX;
        let newWidth = startWidth + deltaX;

        newWidth = Math.min(max, Math.max(min, newWidth));

        dragBar.classList.remove('bg-primary', 'bg-primary/30');

        try {
          onDrag?.(Math.round(newWidth));
        } finally {
          endDrag();
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      const cleanup = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        dragBar.style.transition = dragBarTransition;
        dragBar.style.left = '';
        dragBar.classList.remove('bg-primary', 'bg-primary/30');

        target.style.transition = targetTransition;

        dragOverlay.remove();
        dragOverlayRef.current = null;

        isDragging.current = false;
        cleanupRef.current = null;
      };
      cleanupRef.current = cleanup;
    },
    [endDrag],
  );

  useEffect(() => {
    return () => endDrag();
  }, [endDrag]);

  return { startDrag, endDrag };
}
