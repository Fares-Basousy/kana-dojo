'use client';
import { useEffect, useState, useMemo, useCallback, useRef, memo } from 'react';
import themeSets from '@/features/Preferences/data/themes';
import { useClick } from '@/shared/hooks/useAudio';
import clsx from 'clsx';

// Animation keyframes - injected once when needed
const animationKeyframes = `
@keyframes explode {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(2.4);
    opacity: 0.5;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
}

@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes breathe {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}
`;

type DecorationFont = {
  name: string;
  font: {
    className: string;
  };
};

type CharacterStyle = {
  char: string;
  color: string;
  fontClass: string;
};

type AnimState = 'idle' | 'exploding' | 'hidden' | 'fading-in';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Grid configuration - matches Tailwind classes
const GRID_CONFIG = {
  desktop: { cols: 28, cellSize: 36, gap: 2 }, // grid-cols-28, text-4xl ~ 36px
  mobile: { cols: 10, cellSize: 36, gap: 2 } // grid-cols-10
};

// Scatter animation configuration - base layer of random pulsing
const SCATTER_CONFIG = {
  frequency: 5000, // Trigger new scatter burst every 5 seconds
  scatterCount: 90, // Number of random characters to animate (~11% of desktop grid)
  pulseDuration: 3500, // Duration of each pulse animation in ms (faster for more visibility)
  minOpacity: 0.25, // More pronounced pulse (0.25-1.0 instead of 0.5-1.0)
  overlap: true // Allow overlap between bursts for continuous movement
};

// Wave animation configuration - traveling accent layer
const WAVE_CONFIG = {
  frequency: 12000, // Trigger new wave every 12 seconds
  waveWidth: 5, // Number of columns in the wave (4-5 columns wide)
  waveDuration: 3000, // How long the wave takes to travel across grid
  waveInterval: 50, // Update wave position every 50ms for smooth travel
  boostCount: 40 // Additional characters animated in wave columns
};

// Calculate how many characters to render based on viewport
const calculateVisibleCount = (interactive: boolean): number => {
  if (typeof window === 'undefined') {
    // SSR fallback - render enough for large screens
    return 784; // 28 cols × 28 rows
  }

  const config = interactive
    ? window.innerWidth >= 768
      ? GRID_CONFIG.desktop
      : GRID_CONFIG.mobile
    : GRID_CONFIG.desktop;

  const { cols, cellSize, gap } = config;
  const viewHeight = window.innerHeight;

  // Calculate rows that fit in viewport
  const effectiveHeight = viewHeight - 16; // padding
  const rowHeight = cellSize + gap;
  const visibleRows = Math.ceil(effectiveHeight / rowHeight);

  // Add buffer rows for scroll/resize
  const bufferRows = 2;
  const totalRows = visibleRows + bufferRows;

  // Calculate total visible characters
  const effectiveCols =
    interactive && window.innerWidth < 768 ? GRID_CONFIG.mobile.cols : cols;

  return effectiveCols * totalRows;
};

// ============================================================================
// MODULE-LEVEL CACHING - Load once, use forever within session
// ============================================================================

let decorationsCache: string[] | null = null;
let decorationsLoadingPromise: Promise<string[]> | null = null;
let fontsCache: DecorationFont[] | null = null;
let fontsLoadingPromise: Promise<DecorationFont[]> | null = null;
const precomputedStylesCache: Map<number, CharacterStyle[]> = new Map();

// Get all available main colors from themes (computed once at module load)
const allMainColors = (() => {
  const colors = new Set<string>();
  themeSets[2].themes.forEach(theme => {
    colors.add(theme.mainColor);
    if (theme.secondaryColor) colors.add(theme.secondaryColor);
  });
  return Array.from(colors);
})();

// Fisher-Yates shuffle (more efficient and unbiased)
const shuffle = <T,>(arr: T[]): T[] => {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Load decorations JSON (minimal file with just characters)
const loadDecorations = async (): Promise<string[]> => {
  if (decorationsCache) return decorationsCache;
  if (decorationsLoadingPromise) return decorationsLoadingPromise;

  decorationsLoadingPromise = fetch('/kanji/decorations.json')
    .then(res => res.json())
    .then((chars: string[]) => {
      decorationsCache = shuffle(chars);
      decorationsLoadingPromise = null;
      return decorationsCache;
    });

  return decorationsLoadingPromise;
};

// Load decoration fonts (lazy, only in production)
const loadDecorationFonts = async (
  forceLoad = false
): Promise<DecorationFont[]> => {
  if (process.env.NODE_ENV !== 'production' && !forceLoad) {
    return [];
  }

  if (fontsCache) return fontsCache;
  if (fontsLoadingPromise) return fontsLoadingPromise;

  fontsLoadingPromise = import('./decorationFonts').then(module => {
    fontsCache = module.decorationFonts;
    fontsLoadingPromise = null;
    return module.decorationFonts;
  });

  return fontsLoadingPromise;
};

// Pre-compute styles for a specific count of characters
const precomputeStyles = async (
  count: number,
  forceShow = false
): Promise<CharacterStyle[]> => {
  // Check cache for this count
  const cached = precomputedStylesCache.get(count);
  if (cached) return cached;

  const [allChars, fonts] = await Promise.all([
    loadDecorations(),
    loadDecorationFonts(forceShow)
  ]);

  // If we need more chars than available, repeat them
  let chars: string[];
  if (count <= allChars.length) {
    chars = allChars.slice(0, count);
  } else {
    // Repeat characters to fill the needed count
    chars = [];
    while (chars.length < count) {
      chars.push(
        ...allChars.slice(0, Math.min(allChars.length, count - chars.length))
      );
    }
  }

  const styles = chars.map(char => ({
    char,
    color: allMainColors[Math.floor(Math.random() * allMainColors.length)],
    fontClass:
      fonts.length > 0
        ? fonts[Math.floor(Math.random() * fonts.length)].font.className
        : ''
  }));

  precomputedStylesCache.set(count, styles);
  return styles;
};

// ============================================================================
// INTERACTIVE CHARACTER COMPONENT
// Each manages its own animation state - prevents parent re-renders
// ============================================================================

interface InteractiveCharProps {
  style: CharacterStyle;
  onExplode: () => void;
}

const InteractiveChar = memo(({ style, onExplode }: InteractiveCharProps) => {
  const [animState, setAnimState] = useState<AnimState>('idle');
  const isAnimating = useRef(false);

  const handleClick = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    onExplode();

    setAnimState('exploding');

    // Animation state transitions - all self-contained
    setTimeout(() => {
      setAnimState('hidden');
      setTimeout(() => {
        setAnimState('fading-in');
        setTimeout(() => {
          setAnimState('idle');
          isAnimating.current = false;
        }, 500);
      }, 1500);
    }, 300);
  }, [onExplode]);

  const getAnimationStyle = (): React.CSSProperties => {
    switch (animState) {
      case 'exploding':
        return { animation: 'explode 300ms ease-out forwards' };
      case 'hidden':
        return { opacity: 0 };
      case 'fading-in':
        return { animation: 'fadeIn 500ms ease-in forwards' };
      default:
        return {};
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center text-4xl',
        style.fontClass,
        animState === 'idle' && 'cursor-pointer'
      )}
      aria-hidden='true'
      style={{
        color: style.color,
        transformOrigin: 'center center',
        pointerEvents: animState !== 'idle' ? 'none' : undefined,
        contentVisibility: 'auto',
        containIntrinsicSize: '36px',
        ...getAnimationStyle()
      }}
      onClick={animState === 'idle' ? handleClick : undefined}
    >
      {style.char}
    </span>
  );
});

InteractiveChar.displayName = 'InteractiveChar';

// ============================================================================
// STATIC CHARACTER COMPONENT
// Simple span with no state - maximum performance for non-interactive mode
// ============================================================================

interface StaticCharProps {
  style: CharacterStyle;
  isAnimating?: boolean;
}

const StaticChar = memo(({ style, isAnimating = false }: StaticCharProps) => (
  <span
    className={clsx(
      'inline-flex items-center justify-center text-4xl',
      style.fontClass
    )}
    aria-hidden='true'
    style={{
      color: style.color,
      contentVisibility: 'auto',
      containIntrinsicSize: '36px',
      // Smooth transition when animation starts/stops
      transition: 'opacity 0.8s ease-in-out',
      // Custom breathe animation with enhanced visibility
      ...(isAnimating && {
        animation: `breathe ${SCATTER_CONFIG.pulseDuration}ms ease-in-out infinite`
      })
    }}
  >
    {style.char}
  </span>
));

StaticChar.displayName = 'StaticChar';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Decorations = ({
  expandDecorations,
  forceShow = false,
  interactive = false
}: {
  expandDecorations: boolean;
  forceShow?: boolean;
  interactive?: boolean;
}) => {
  const [styles, setStyles] = useState<CharacterStyle[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(() =>
    calculateVisibleCount(interactive)
  );
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(
    new Set()
  );
  const [waveColumn, setWaveColumn] = useState<number>(-1); // Current wave column (-1 = no wave)
  const { playClick } = useClick();

  // Store latest playClick in ref to keep handleExplode stable
  const playClickRef = useRef(playClick);
  useEffect(() => {
    playClickRef.current = playClick;
  }, [playClick]);

  // Stable callback for explosion sound - truly stable, no recreations
  const handleExplode = useCallback(() => {
    playClickRef.current();
  }, []);

  // Handle viewport resize with debounce
  const resizeTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        const newCount = calculateVisibleCount(interactive);
        if (newCount !== visibleCount) {
          setVisibleCount(newCount);
        }
      }, 100); // Debounce 100ms
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, [interactive, visibleCount]);

  // Load styles when visible count changes
  useEffect(() => {
    let isMounted = true;

    precomputeStyles(visibleCount, forceShow).then(computedStyles => {
      if (isMounted) {
        setStyles(computedStyles);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [visibleCount, forceShow]);

  // Inject animation keyframes once when component mounts
  useEffect(() => {
    const styleId = 'decorations-animation-keyframes';
    // Only inject if not already present
    if (document.getElementById(styleId)) return;

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = animationKeyframes;
    document.head.appendChild(styleElement);

    return () => {
      // Cleanup when component unmounts
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Random scatter burst animation - only in static (non-interactive) mode
  useEffect(() => {
    // Only run scatter animation in static mode
    if (interactive || styles.length === 0) return;

    // Helper function to select random unique indices
    const selectRandomIndices = (count: number, max: number): Set<number> => {
      const indices = new Set<number>();
      while (indices.size < Math.min(count, max)) {
        indices.add(Math.floor(Math.random() * max));
      }
      return indices;
    };

    // Trigger initial scatter immediately
    const initialIndices = selectRandomIndices(
      SCATTER_CONFIG.scatterCount,
      styles.length
    );
    setAnimatingIndices(initialIndices);

    // Set up interval for subsequent scatter bursts
    const scatterInterval = setInterval(() => {
      const newIndices = selectRandomIndices(
        SCATTER_CONFIG.scatterCount,
        styles.length
      );
      setAnimatingIndices(newIndices);
    }, SCATTER_CONFIG.frequency);

    return () => {
      clearInterval(scatterInterval);
      setAnimatingIndices(new Set());
    };
  }, [interactive, styles.length]);

  // Traveling wave animation - accent layer that sweeps across grid
  useEffect(() => {
    // Only run wave in static mode
    if (interactive || styles.length === 0) return;

    // Determine columns based on device (28 desktop, 10 mobile)
    const cols = visibleCount > 400 ? GRID_CONFIG.desktop.cols : GRID_CONFIG.mobile.cols;

    // Trigger waves periodically
    const waveTimer = setInterval(() => {
      let currentCol = 0;
      const steps = cols + WAVE_CONFIG.waveWidth;
      const stepDuration = WAVE_CONFIG.waveDuration / steps;

      // Animate wave traveling left to right
      const waveInterval = setInterval(() => {
        setWaveColumn(currentCol);
        currentCol++;

        if (currentCol >= cols + WAVE_CONFIG.waveWidth) {
          clearInterval(waveInterval);
          setWaveColumn(-1); // Reset wave
        }
      }, stepDuration);
    }, WAVE_CONFIG.frequency);

    return () => {
      clearInterval(waveTimer);
      setWaveColumn(-1);
    };
  }, [interactive, styles.length, visibleCount]);

  // Calculate combined animating indices (scatter + wave)
  const combinedAnimatingIndices = useMemo(() => {
    if (interactive || styles.length === 0) return new Set<number>();

    const combined = new Set(animatingIndices);

    // Add wave characters if wave is active
    if (waveColumn >= 0) {
      const cols = visibleCount > 400 ? GRID_CONFIG.desktop.cols : GRID_CONFIG.mobile.cols;
      const rows = Math.ceil(visibleCount / cols);

      // Calculate which columns are in the wave
      for (let col = Math.max(0, waveColumn - WAVE_CONFIG.waveWidth); col <= waveColumn; col++) {
        if (col >= cols) continue;

        // Add random characters from this column
        for (let row = 0; row < rows; row++) {
          const index = row * cols + col;
          if (index < styles.length && Math.random() < 0.7) {
            // 70% chance to animate chars in wave
            combined.add(index);
          }
        }
      }
    }

    return combined;
  }, [animatingIndices, waveColumn, interactive, styles.length, visibleCount]);

  // Memoize grid content - now using separate components for interactive vs static
  const gridContent = useMemo(() => {
    if (styles.length === 0) return null;

    if (interactive) {
      // Interactive mode: each char manages its own animation state
      // Note: Using index as key is acceptable here since styles array is stable after precomputation
      return styles.map((style, index) => (
        <InteractiveChar key={index} style={style} onExplode={handleExplode} />
      ));
    } else {
      // Static mode: random scatter + wave animation - only selected chars animate
      return styles.map((style, index) => (
        <StaticChar
          key={index}
          style={style}
          isAnimating={combinedAnimatingIndices.has(index)}
        />
      ));
    }
  }, [styles, interactive, handleExplode, combinedAnimatingIndices]);

  if (styles.length === 0) return null;

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 overflow-hidden',
          expandDecorations ? 'opacity-100' : 'opacity-30',
          interactive ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        <div
          className={clsx(
            'grid h-full w-full gap-0.5 p-2',
            interactive ? 'grid-cols-10 md:grid-cols-28' : 'grid-cols-28'
          )}
        >
          {gridContent}
        </div>
      </div>
    </>
  );
};

export default Decorations;
