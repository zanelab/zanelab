import { useEffect, useRef } from 'react';
import type { TabsProps } from './types';

function findParentElement(element: HTMLElement): HTMLElement | null {
  const parentCls = 'group';
  if (element.classList.contains(parentCls)) return element;
  return element.closest(`.${parentCls}`) as HTMLElement | null;
}

export function useTabsDrag(
  props: TabsProps,
  emit: { onSortTabs?: (oldIndex: number, newIndex: number) => void },
) {
  const sortableInstanceRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    const el = document.querySelector(
      `.${props.contentClass || 'admin-tabs-content'}`,
    ) as HTMLElement;
    if (!el) return;

    const resetElState = () => {
      el.style.cursor = 'default';
      el.querySelector('.draggable')?.classList.remove('dragging');
    };

    let dragState: { oldIndex: number; newIndex: number } | null = null;
    let draggingEl: HTMLElement | null = null;

    const onDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      const parent = findParentElement(target);
      if (!parent?.classList.contains('draggable') || !props.draggable) {
        e.preventDefault();
        return;
      }
      draggingEl = parent;
      const items = Array.from(el.querySelectorAll('[data-tab-item="true"]'));
      dragState = {
        oldIndex: items.indexOf(parent),
        newIndex: items.indexOf(parent),
      };
      el.style.cursor = 'grabbing';
      parent.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
      }
    };

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!draggingEl || !dragState) return;
      const target = e.target as HTMLElement;
      const related = findParentElement(target);
      if (!related || !related.classList.contains('draggable')) return;
      const isCurrentAffix = draggingEl.classList.contains('affix-tab');
      const isRelatedAffix = related.classList.contains('affix-tab');
      if (isCurrentAffix !== isRelatedAffix) return;
      const items = Array.from(el.querySelectorAll('[data-tab-item="true"]'));
      const newIndex = items.indexOf(related);
      if (newIndex !== dragState.newIndex) {
        dragState.newIndex = newIndex;
      }
    };

    const onDragEnd = () => {
      if (dragState && dragState.oldIndex !== dragState.newIndex) {
        emit.onSortTabs?.(dragState.oldIndex, dragState.newIndex);
      }
      dragState = null;
      draggingEl = null;
      resetElState();
    };

    const items = el.querySelectorAll('[data-tab-item="true"]');
    items.forEach((item) => {
      const htmlItem = item as HTMLElement;
      htmlItem.draggable = true;
      htmlItem.addEventListener('dragstart', onDragStart as EventListener);
      htmlItem.addEventListener('dragover', onDragOver as EventListener);
      htmlItem.addEventListener('dragend', onDragEnd);
    });

    sortableInstanceRef.current = {
      destroy: () => {
        items.forEach((item) => {
          const htmlItem = item as HTMLElement;
          htmlItem.draggable = false;
          htmlItem.removeEventListener(
            'dragstart',
            onDragStart as EventListener,
          );
          htmlItem.removeEventListener('dragover', onDragOver as EventListener);
          htmlItem.removeEventListener('dragend', onDragEnd);
        });
      },
    };

    return () => {
      sortableInstanceRef.current?.destroy();
    };
  }, [props.contentClass, props.draggable, props.styleType, emit]);
}
