import type { Zone } from "@anyang/core";

// Pointer-based drag and drop, so mouse, pen and touch share one code path
// (HTML5 drag and drop does not work on mobile). Drop targets are any element
// with data-zone="left|right|top|bottom|center".
//
// Mouse and pen drags start on movement. Touch drags start after a short
// press so the palette can still be scrolled with a swipe.

export const drag = $state<{ id: string | null; zone: Zone | null; x: number; y: number }>({
  id: null,
  zone: null,
  x: 0,
  y: 0,
});

interface DraggableOptions {
  id: string;
  onDrop: (id: string, zone: Zone) => void;
  onTap: (id: string) => void;
}

const MOVE_THRESHOLD = 6;
const TOUCH_HOLD_MS = 180;

export function draggable(node: HTMLElement, initial: DraggableOptions) {
  let options = initial;
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let active = false;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;

  const zoneAt = (x: number, y: number): Zone | null => {
    const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-zone]");
    return (target?.dataset.zone as Zone | undefined) ?? null;
  };

  const begin = (x: number, y: number) => {
    active = true;
    drag.id = options.id;
    drag.x = x;
    drag.y = y;
    drag.zone = zoneAt(x, y);
  };

  const reset = () => {
    clearTimeout(holdTimer);
    pointerId = null;
    active = false;
    drag.id = null;
    drag.zone = null;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || pointerId !== null) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    // Capture up front: a fast drag leaves the tile before the threshold is met.
    node.setPointerCapture(event.pointerId);
    if (event.pointerType === "touch") {
      holdTimer = setTimeout(() => begin(startX, startY), TOUCH_HOLD_MS);
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    if (!active) {
      const moved = Math.hypot(event.clientX - startX, event.clientY - startY) > MOVE_THRESHOLD;
      if (!moved) return;
      if (event.pointerType === "touch") {
        // Moved before the hold finished: this is a scroll, not a drag.
        clearTimeout(holdTimer);
        return;
      }
      begin(event.clientX, event.clientY);
    }
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.zone = zoneAt(event.clientX, event.clientY);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    const wasActive = active;
    const zone = active ? zoneAt(event.clientX, event.clientY) : null;
    const moved = Math.hypot(event.clientX - startX, event.clientY - startY) > MOVE_THRESHOLD;
    reset();
    if (wasActive && zone) options.onDrop(options.id, zone);
    else if (!wasActive && !moved) options.onTap(options.id);
  };

  // Once a touch drag is active, cancel the browser's own panning.
  const onTouchMove = (event: TouchEvent) => {
    if (active) event.preventDefault();
  };
  const onContextMenu = (event: Event) => event.preventDefault();

  node.addEventListener("pointerdown", onPointerDown);
  node.addEventListener("pointermove", onPointerMove);
  node.addEventListener("pointerup", onPointerUp);
  node.addEventListener("pointercancel", reset);
  node.addEventListener("touchmove", onTouchMove, { passive: false });
  node.addEventListener("contextmenu", onContextMenu);

  return {
    update(next: DraggableOptions) {
      options = next;
    },
    destroy() {
      reset();
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", onPointerUp);
      node.removeEventListener("pointercancel", reset);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("contextmenu", onContextMenu);
    },
  };
}
