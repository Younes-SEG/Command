'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useWorkspace } from './workspace-provider';
import { BuddyCharacter, buddyCharacters } from './buddy-character';
import {
  buddyBounds,
  cursorEdge,
  edgeDelta,
  edgeLength,
  edgePoint,
  wrapEdge,
} from '@/lib/buddy-path';

export function StudyBuddy() {
  const { data } = useWorkspace();
  const character = data.settings.studyBuddy;
  const motion = data.settings.buddyMotion;
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const root = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const travel = useRef<(() => void) | null>(null);

  useEffect(() => {
    const buddy = root.current;
    const artwork = art.current;
    if (!buddy || !artwork || character === 'NONE') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(pointer: fine)');
    let size = buddy.offsetWidth;
    let bounds = buddyBounds(window.innerWidth, window.innerHeight, size);
    let position = bounds.width;
    let target = position;
    let frame = 0;
    let lastFrame = 0;
    let restingUntil = performance.now() + 9000;
    let travellingUntil = 0;
    let pointerAt = -Infinity;
    let pointer = { x: window.innerWidth, y: window.innerHeight };
    let routeAnimation: Animation | undefined;
    const canMove = () => motion && !reduced.matches;

    function paint() {
      const point = edgePoint(position, bounds);
      buddy!.style.transform = `translate3d(${point.x - size / 2}px, ${point.y - size / 2}px, 0)`;
      if (canMove() && finePointer.matches) {
        const lookX = Math.max(-1.8, Math.min(1.8, (pointer.x - point.x) / 180));
        const lookY = Math.max(-1.2, Math.min(1.2, (pointer.y - point.y) / 180));
        buddy!.style.setProperty('--buddy-look-x', `${lookX}px`);
        buddy!.style.setProperty('--buddy-look-y', `${lookY}px`);
      }
    }

    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      if (now - lastFrame < 1000 / 30) return;
      const dt = Math.min((now - (lastFrame || now)) / 1000, 0.06);
      lastFrame = now;
      const length = edgeLength(bounds);
      const travelling = now < travellingUntil;
      const following = finePointer.matches && now - pointerAt < 4500;
      if (!travelling && following) {
        // Stay a little behind the cursor instead of sitting directly on its target.
        target = wrapEdge(cursorEdge(pointer.x, pointer.y, bounds) - 42, length);
        restingUntil = now + 10000;
      } else if (!travelling && !following && now > restingUntil) {
        target = wrapEdge(position + 100, length);
        restingUntil = now + 18000;
      }
      const distance = edgeDelta(position, target, length);
      const moving = Math.abs(distance) > 1;
      if (moving) {
        const speed = travelling ? 76 : finePointer.matches ? 24 : 16;
        position = wrapEdge(
          position + Math.sign(distance) * Math.min(Math.abs(distance), speed * dt),
          length,
        );
      }
      buddy!.dataset.walking = String(moving);
      buddy!.dataset.travelling = String(travelling);
      paint();
    }

    function syncMotion() {
      cancelAnimationFrame(frame);
      routeAnimation?.cancel();
      buddy!.dataset.quiet = String(!canMove());
      buddy!.dataset.paused = String(document.hidden);
      buddy!.dataset.walking = 'false';
      buddy!.dataset.travelling = 'false';
      buddy!.style.setProperty('--buddy-look-x', '0px');
      buddy!.style.setProperty('--buddy-look-y', '0px');
      lastFrame = 0;
      if (canMove() && !document.hidden) frame = requestAnimationFrame(tick);
    }

    function onPointer(event: PointerEvent) {
      if (event.pointerType === 'touch' || !canMove()) return;
      pointer = { x: event.clientX, y: event.clientY };
      pointerAt = performance.now();
    }

    function onResize() {
      const progress = position / edgeLength(bounds);
      size = buddy!.offsetWidth;
      bounds = buddyBounds(window.innerWidth, window.innerHeight, size);
      position = progress * edgeLength(bounds);
      target = position;
      paint();
    }

    travel.current = () => {
      if (!canMove() || document.hidden) return;
      travellingUntil = performance.now() + 1500;
      restingUntil = travellingUntil + 10000;
      target = wrapEdge(position + 110, edgeLength(bounds));
      buddy.dataset.travelling = 'true';
      routeAnimation?.cancel();
      routeAnimation = artwork.animate(
        [
          { transform: 'translateY(0) scale(1)', opacity: 1 },
          { transform: 'translateY(5px) scale(0.92)', opacity: 0.45, offset: 0.35 },
          { transform: 'translateY(-4px) scale(1.02)', opacity: 1, offset: 0.7 },
          { transform: 'translateY(0) scale(1)', opacity: 1 },
        ],
        { duration: 700, easing: 'ease-in-out' },
      );
    };

    paint();
    syncMotion();
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', syncMotion);
    reduced.addEventListener('change', syncMotion);
    return () => {
      cancelAnimationFrame(frame);
      routeAnimation?.cancel();
      travel.current = null;
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', syncMotion);
      reduced.removeEventListener('change', syncMotion);
    };
  }, [character, motion]);

  useEffect(() => {
    if (previousPath.current !== pathname) travel.current?.();
    previousPath.current = pathname;
  }, [pathname]);

  if (character === 'NONE') return null;
  const name = buddyCharacters.find((option) => option.value === character)?.name || 'Your';
  return (
    <div
      ref={root}
      className="study-buddy"
      role="img"
      aria-label={`${name} study buddy`}
      data-quiet={!motion}
    >
      <div ref={art} className="study-buddy-art">
        <BuddyCharacter character={character} />
      </div>
    </div>
  );
}
