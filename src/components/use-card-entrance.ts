'use client';

import { useLayoutEffect, useRef } from 'react';

/** Replay entrances on navigation, including cards revealed by streamed page content. */
export function useCardEntrance(pathname: string) {
  const container = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const entered = new WeakSet<Element>();
    const animations = new Set<Animation>();

    function reveal() {
      if (reducedMotion.matches || !root) return;
      const cards = [...root.querySelectorAll<HTMLElement>('.card')].filter(
        (card) =>
          !entered.has(card) &&
          card.getClientRects().length > 0 &&
          !card.parentElement?.closest('.card'),
      );
      cards.forEach((card, index) => {
        entered.add(card);
        const animation = card.animate(
          [
            { opacity: 0, transform: 'translateY(22px) scale(0.97)' },
            { opacity: 1, transform: 'translateY(-2px) scale(1.004)', offset: 0.78 },
            { opacity: 1, transform: 'translateY(0) scale(1)' },
          ],
          {
            duration: 480,
            delay: Math.min(index * 45, 225),
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'backwards',
          },
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      });
    }

    function stop() {
      for (const animation of animations) animation.cancel();
      animations.clear();
    }

    reveal();
    const observer = new MutationObserver(reveal);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'style'],
    });
    reducedMotion.addEventListener('change', stop);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener('change', stop);
      stop();
    };
  }, [pathname]);

  return container;
}
