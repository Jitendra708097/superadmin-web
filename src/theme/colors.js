/**
 * @module colors
 * @description Brand color constants for AttendEase Super Admin.
 *              Import these in JS files; use Tailwind classes in JSX.
 * 
 * Updated 2026-04-14: Already aligned with unified design tokens!
 * - Primary: #00d4ff (cyan - modern, command-forward)
 * - Semantic: #00ff88 (success), #ffaa00 (warning), #ff3366 (danger), #a855f7 (purple)
 * 
 * NOTE: SuperAdmin was the reference for unified semantic colors due to
 * modern aesthetics and advanced animation support. Mobile and Admin now
 * adopt these same semantic colors for cross-platform consistency.
 */

export const COLORS = {
  // ─── Dark Backgrounds (SuperAdmin Signature) ────────────────────────────────
  bgBase:     '#080810',      // darkest background
  bgSurface:  '#0f0f1a',      // card/surface background
  bgElevated: '#161625',      // elevated elements (modals, popovers)
  bgBorder:   '#1e1e35',      // border/divider color

  // ─── Brand & Semantic Accents (Unified) ──────────────────────────────────────
  primary: '#00d4ff',         // cyan - primary action (superadmin signature)
  cyan:    '#00d4ff',         // alias for readability
  success: '#00ff88',         // bright green (unified)
  green:   '#00ff88',         // alias
  warning: '#ffaa00',         // amber (unified)
  amber:   '#ffaa00',         // alias
  danger:  '#ff3366',         // red (unified)
  error:   '#ff3366',         // alias
  red:     '#ff3366',         // alias
  info:    '#00d4ff',         // cyan for informational (unified)
  purple:  '#a855f7',         // extended palette for special states

  // ─── Text (Dark Theme) ──────────────────────────────────────────────────────
  textPrimary:   '#e8e8f0',   // primary text
  textSecondary: '#6b6b8a',   // secondary text
  textMuted:     '#4a4a66',   // muted text

  // ─── Chart colors (Recharts) ────────────────────────────────────────────────
  chart: {
    cyan:   '#00d4ff',
    green:  '#00ff88',
    red:    '#ff3366',
    amber:  '#ffaa00',
    purple: '#a855f7',
    grid:   '#1e1e35',
    text:   '#6b6b8a',
  },

  // ─── Light Theme Support (Future Enhancement) ──────────────────────────────
  // To be implemented if light variant needed for SuperAdmin
  // light: {
  //   bgPrimary: '#ffffff',
  //   bgSecondary: '#f8f9fa',
  //   textPrimary: '#111827',
  //   textSecondary: '#6b7280',
  // },
};

export const CHART_TOOLTIP_STYLE = {
  background:   '#161625',
  border:       '1px solid #1e1e35',
  borderRadius: '6px',
  color:        '#e8e8f0',
  fontFamily:   'JetBrains Mono',
  fontSize:     '12px',
};
