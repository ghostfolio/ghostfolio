import { ColorScheme } from './types';

/**
 * Chart Color Theme System for Ghostfolio
 *
 * Provides consistent color schemes across all chart types with support for:
 * - Light and dark themes
 * - Semantic color meanings (positive, negative, neutral)
 * - Performance-based color coding
 * - Accessibility-compliant contrast ratios
 */

export interface ChartColorPalette {
  // Primary chart colors
  primary: string;
  secondary: string;
  accent: string;

  // Semantic colors
  positive: string;
  negative: string;
  neutral: string;
  warning: string;
  info: string;

  // Performance-based colors (green to red spectrum)
  performance: {
    excellent: string;
    good: string;
    average: string;
    poor: string;
    terrible: string;
  };

  // Allocation colors (diverse palette for categories)
  allocation: string[];

  // Background and text colors
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };

  // Interactive states
  hover: string;
  active: string;
  focus: string;

  // Grid and border colors
  grid: string;
  border: string;
}

export interface ChartTheme {
  light: ChartColorPalette;
  dark: ChartColorPalette;
}

/**
 * Generate color palette based on color scheme
 */
export function getChartColorPalette(
  colorScheme: ColorScheme = 'LIGHT'
): ChartColorPalette {
  const isDark = colorScheme === 'DARK';

  if (isDark) {
    return {
      // Primary chart colors
      primary: '#64b5f6', // Light blue
      secondary: '#81c784', // Light green
      accent: '#ffb74d', // Orange

      // Semantic colors
      positive: '#4caf50', // Green
      negative: '#f44336', // Red
      neutral: '#9e9e9e', // Grey
      warning: '#ff9800', // Orange
      info: '#2196f3', // Blue

      // Performance-based colors
      performance: {
        excellent: '#2e7d32', // Dark green
        good: '#4caf50', // Green
        average: '#8bc34a', // Light green
        poor: '#ff5722', // Deep orange
        terrible: '#d32f2f' // Dark red
      },

      // Allocation colors (diverse palette)
      allocation: [
        '#2196f3', // Blue
        '#4caf50', // Green
        '#ff9800', // Orange
        '#9c27b0', // Purple
        '#f44336', // Red
        '#00bcd4', // Cyan
        '#ffc107', // Amber
        '#795548', // Brown
        '#607d8b', // Blue grey
        '#e91e63', // Pink
        '#3f51b5', // Indigo
        '#009688', // Teal
        '#8bc34a', // Light green
        '#ff5722', // Deep orange
        '#9c27b0' // Purple
      ],

      // Background and text colors
      background: '#121212',
      surface: '#1e1e1e',
      text: {
        primary: '#ffffff',
        secondary: '#b3b3b3',
        disabled: '#666666'
      },

      // Interactive states
      hover: 'rgba(255, 255, 255, 0.08)',
      active: 'rgba(255, 255, 255, 0.16)',
      focus: 'rgba(100, 181, 246, 0.24)',

      // Grid and border colors
      grid: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.12)'
    };
  }

  // Light theme
  return {
    // Primary chart colors
    primary: '#1976d2', // Blue
    secondary: '#388e3c', // Green
    accent: '#f57c00', // Orange

    // Semantic colors
    positive: '#2e7d32', // Green
    negative: '#d32f2f', // Red
    neutral: '#757575', // Grey
    warning: '#f57c00', // Orange
    info: '#1976d2', // Blue

    // Performance-based colors
    performance: {
      excellent: '#1b5e20', // Dark green
      good: '#2e7d32', // Green
      average: '#4caf50', // Light green
      poor: '#f57c00', // Orange
      terrible: '#d32f2f' // Dark red
    },

    // Allocation colors (diverse palette)
    allocation: [
      '#1976d2', // Blue
      '#388e3c', // Green
      '#f57c00', // Orange
      '#7b1fa2', // Purple
      '#d32f2f', // Red
      '#00796b', // Teal
      '#fbc02d', // Yellow
      '#5d4037', // Brown
      '#455a64', // Blue grey
      '#c2185b', // Pink
      '#3f51b5', // Indigo
      '#009688', // Teal
      '#689f38', // Light green
      '#e65100', // Deep orange
      '#7b1fa2' // Purple
    ],

    // Background and text colors
    background: '#ffffff',
    surface: '#f5f5f5',
    text: {
      primary: '#212121',
      secondary: '#757575',
      disabled: '#bdbdbd'
    },

    // Interactive states
    hover: 'rgba(0, 0, 0, 0.04)',
    active: 'rgba(0, 0, 0, 0.08)',
    focus: 'rgba(25, 118, 210, 0.12)',

    // Grid and border colors
    grid: 'rgba(0, 0, 0, 0.08)',
    border: 'rgba(0, 0, 0, 0.12)'
  };
}

/**
 * Get performance color based on percentage value
 */
export function getPerformanceColor(
  percentage: number,
  colorScheme: ColorScheme = 'LIGHT'
): string {
  const palette = getChartColorPalette(colorScheme);

  if (percentage >= 15) return palette.performance.excellent;
  if (percentage >= 5) return palette.performance.good;
  if (percentage >= -5) return palette.performance.average;
  if (percentage >= -15) return palette.performance.poor;
  return palette.performance.terrible;
}

/**
 * Get allocation color for index-based coloring
 */
export function getAllocationColor(
  index: number,
  colorScheme: ColorScheme = 'LIGHT'
): string {
  const palette = getChartColorPalette(colorScheme);
  return palette.allocation[index % palette.allocation.length];
}

/**
 * Get semantic color based on context
 */
export function getSemanticColor(
  type: 'positive' | 'negative' | 'neutral' | 'warning' | 'info',
  colorScheme: ColorScheme = 'LIGHT'
): string {
  const palette = getChartColorPalette(colorScheme);
  return palette[type];
}

/**
 * Calculate relative luminance of a color (0-1 scale)
 * Based on WCAG guidelines for color contrast
 */
function calculateLuminance(color: string): number {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  // Apply gamma correction
  const gammaCorrect = (value: number): number => {
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  };

  const rCorrected = gammaCorrect(r);
  const gCorrected = gammaCorrect(g);
  const bCorrected = gammaCorrect(b);

  // Calculate relative luminance
  return 0.2126 * rCorrected + 0.7152 * gCorrected + 0.0722 * bCorrected;
}
export function getContrastTextColor(
  backgroundColor: string,
  colorScheme: ColorScheme = 'LIGHT'
): string {
  const palette = getChartColorPalette(colorScheme);

  // Calculate relative luminance of the background color
  const luminance = calculateLuminance(backgroundColor);

  // Use dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? palette.text.primary : '#ffffff';
}

/**
 * Generate gradient colors for area charts
 */
export function generateGradientColors(
  baseColor: string,
  colorScheme: ColorScheme = 'LIGHT',
  opacity: number = 0.1
): { start: string; end: string } {
  // Using palette for potential future enhancements
  getChartColorPalette(colorScheme);

  return {
    start: `${baseColor}${Math.round(opacity * 255)
      .toString(16)
      .padStart(2, '0')}`,
    end: baseColor
  };
}
