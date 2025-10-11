import {
  getChartColorPalette,
  getPerformanceColor,
  getAllocationColor
} from './chart-theme';
import { ColorScheme } from './types';

/**
 * Standardized Chart Configuration for Ghostfolio
 *
 * Provides consistent styling, layout, and behavior across all chart types
 */

export interface ChartConfigOptions {
  colorScheme?: ColorScheme;
  currency?: string;
  locale?: string;
  unit?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  aspectRatio?: number;
  responsive?: boolean;
  maintainAspectRatio?: boolean;
}

export interface ChartLayoutConfig {
  padding?: number;
  spacing?: number;
  borderRadius?: number;
  borderWidth?: number;
}

/**
 * Get standardized chart options with consistent styling
 */
export function getStandardChartOptions(
  options: ChartConfigOptions = {},
  layoutConfig: ChartLayoutConfig = {}
): any {
  const {
    colorScheme = 'LIGHT',
    showLegend = false,
    showGrid = true,
    aspectRatio = 16 / 9,
    responsive = true,
    maintainAspectRatio = true
  } = options;

  const {
    padding = 0,
    spacing = 2,
    borderRadius = 4,
    borderWidth = 1
  } = layoutConfig;

  const palette = getChartColorPalette(colorScheme);

  return {
    responsive,
    maintainAspectRatio,
    aspectRatio,
    layout: {
      padding: padding
    },
    plugins: {
      legend: {
        display: showLegend,
        position: 'bottom',
        align: 'start',
        labels: {
          usePointStyle: true,
          padding: spacing * 4,
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          },
          color: palette.text.secondary
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: palette.background,
        titleColor: palette.text.primary,
        bodyColor: palette.text.primary,
        borderColor: palette.border,
        borderWidth: 1,
        cornerRadius: borderRadius,
        displayColors: true,
        usePointStyle: true,
        padding: spacing * 3,
        font: {
          size: 12,
          family: 'Inter, sans-serif'
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: showGrid,
          color: palette.grid,
          tickLength: spacing * 2
        },
        border: {
          display: true,
          color: palette.border,
          width: borderWidth
        },
        ticks: {
          display: true,
          color: palette.text.secondary,
          padding: spacing * 2,
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          }
        }
      },
      y: {
        display: true,
        position: 'right',
        grid: {
          display: showGrid,
          color: palette.grid,
          tickLength: spacing * 2
        },
        ticks: {
          display: true,
          color: palette.text.secondary,
          padding: spacing * 2,
          mirror: true,
          z: 1,
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          }
        }
      }
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: spacing * 2,
        borderWidth: 0
      },
      line: {
        borderWidth: borderWidth * 2,
        tension: 0,
        fill: false
      },
      bar: {
        borderWidth: 0,
        borderRadius: borderRadius
      },
      arc: {
        borderWidth: 0,
        borderRadius: borderRadius
      }
    },
    animation: false,
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };
}

/**
 * Get standardized colors for chart datasets
 */
export function getStandardDatasetColors(
  index: number,
  type: 'line' | 'bar' | 'doughnut' | 'treemap',
  colorScheme: ColorScheme = 'LIGHT',
  value?: number
): {
  backgroundColor: string | string[];
  borderColor: string | string[];
  hoverBackgroundColor?: string | string[];
  hoverBorderColor?: string | string[];
} {
  const palette = getChartColorPalette(colorScheme);

  switch (type) {
    case 'line':
      return {
        backgroundColor: 'transparent',
        borderColor: index === 0 ? palette.primary : palette.secondary,
        hoverBackgroundColor: palette.hover
      };

    case 'bar':
      return {
        backgroundColor: getAllocationColor(index, colorScheme),
        borderColor: 'transparent',
        hoverBackgroundColor: palette.hover
      };

    case 'doughnut':
      return {
        backgroundColor: getAllocationColor(index, colorScheme),
        borderColor: 'transparent',
        hoverBackgroundColor: palette.hover
      };

    case 'treemap':
      if (value !== undefined) {
        return {
          backgroundColor: getPerformanceColor(value, colorScheme),
          borderColor: 'transparent'
        };
      }
      return {
        backgroundColor: getAllocationColor(index, colorScheme),
        borderColor: 'transparent'
      };

    default:
      return {
        backgroundColor: palette.primary,
        borderColor: palette.primary
      };
  }
}

/**
 * Get responsive breakpoints for charts
 */
export function getChartBreakpoints() {
  return {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    large: 1440
  };
}

/**
 * Get responsive chart configuration
 */
export function getResponsiveChartConfig(
  colorScheme: ColorScheme = 'LIGHT',
  deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
): Partial<ChartConfigOptions> {
  const baseConfig: ChartConfigOptions = {
    colorScheme,
    showLegend: deviceType !== 'mobile',
    aspectRatio: deviceType === 'mobile' ? 1 : 16 / 9,
    maintainAspectRatio: deviceType !== 'mobile'
  };

  switch (deviceType) {
    case 'mobile':
      return {
        ...baseConfig,
        aspectRatio: 1,
        maintainAspectRatio: false,
        showLegend: false,
        showGrid: false
      };

    case 'tablet':
      return {
        ...baseConfig,
        aspectRatio: 4 / 3,
        showLegend: true
      };

    default:
      return baseConfig;
  }
}
