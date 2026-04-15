/**
 * @hook useReducedMotion
 * @description Detects if user prefers reduced motion via media query.
 *              Returns true if prefers-reduced-motion: reduce matches.
 * 
 * This is critical for SuperAdmin since it has advanced animations
 * (glow-pulse, count-up, slide-in, fade-in, ping-slow).
 * 
 * Usage:
 *   const prefersReducedMotion = useReducedMotion();
 *   
 *   return (
 *     <div className={prefersReducedMotion ? '' : 'animate-glow-pulse'}>
 *       Data Card
 *     </div>
 *   );
 */

import { useEffect, useState } from 'react';

export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (e) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

/**
 * Helper to conditionally apply animation classes
 * @param {string} animationClass - Tailwind animation class (e.g., 'animate-glow-pulse')
 * @param {boolean} prefersReducedMotion - From useReducedMotion hook
 * @returns {string} Animation class or empty string
 */
export const getAnimationClass = (animationClass, prefersReducedMotion) => {
  return prefersReducedMotion ? '' : animationClass;
};

export default useReducedMotion;
