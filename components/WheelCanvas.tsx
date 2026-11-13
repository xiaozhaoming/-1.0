import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { WheelConfig } from '../types';

export interface WheelCanvasHandle {
  exportPngDataUrl: (scale?: number) => string | null;
}

interface WheelCanvasProps {
  config: WheelConfig;
  isSpinning?: boolean;
  onHubClick?: () => void;
}

// Deterministic PRNG so frosted grain & nebula stars never flicker while spinning
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [29, 29, 31];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastTextColor(hexOrPair: string | [string, string]): string {
  const lum = Array.isArray(hexOrPair)
    ? (getLuminance(hexOrPair[0]) + getLuminance(hexOrPair[1])) / 2
    : getLuminance(hexOrPair);
  return lum > 0.44 ? '#1D1D1F' : '#FFFFFF';
}

export function getSliceIndexAtTopPointer(itemCount: number, rotationDeg: number): number {
  if (itemCount <= 0) return -1;
  const sliceAngle = (2 * Math.PI) / itemCount;
  const rotationRad = (rotationDeg * Math.PI) / 180;
  const pointerAngle = -Math.PI / 2; // 12 o'clock top
  const rel = (((pointerAngle - rotationRad) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(rel / sliceAngle) % itemCount;
}

export function renderWheelToCanvas(
  canvas: HTMLCanvasElement,
  config: WheelConfig,
  scale: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width;
  const center = size / 2;
  const topPointerMargin = config.includePointerInExport ? 28 * scale : 18 * scale;
  const outerRadius = size / 2 - topPointerMargin;
  const radius = Math.max(40 * scale, outerRadius - config.borderWidth * scale);

  const {
    items,
    colorScheme,
    borderWidth,
    borderStyle,
    spokeWidth,
    spokeStyle,
    hubRadius,
    hubColor,
    fontSize,
    fontFamily,
    fontWeight,
    fontColor,
    autoTextColor,
    rotation,
    showText,
    showPegs,
  } = config;

  ctx.clearRect(0, 0, size, size);
  if (items.length === 0) return;

  const sliceAngle = (2 * Math.PI) / items.length;
  const rotationRad = (rotation * Math.PI) / 180;

  // Ambient soft drop shadow beneath wheel assembly (kept subtle for transparent PNGs)
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
  ctx.shadowBlur = 24 * scale;
  ctx.shadowOffsetY = 8 * scale;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
  ctx.fill();
  ctx.restore();

  // 1. Draw Slices
  items.forEach((item, i) => {
    const startAngle = i * sliceAngle + rotationRad;
    const endAngle = startAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;

    const gradPair = colorScheme.gradientStops?.[i % colorScheme.gradientStops.length];
    const baseColor = colorScheme.colors[i % colorScheme.colors.length];

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();

    if (gradPair) {
      const innerX = center + Math.cos(midAngle) * (hubRadius * scale * 0.4);
      const innerY = center + Math.sin(midAngle) * (hubRadius * scale * 0.4);
      const outerX = center + Math.cos(midAngle) * radius;
      const outerY = center + Math.sin(midAngle) * radius;
      const sliceGrad = ctx.createLinearGradient(innerX, innerY, outerX, outerY);
      sliceGrad.addColorStop(0, gradPair[0]);
      sliceGrad.addColorStop(1, gradPair[1]);
      ctx.fillStyle = sliceGrad;
    } else {
      ctx.fillStyle = baseColor;
    }
    ctx.fill();

    // Slice material texture overlays
    if (colorScheme.texture && colorScheme.texture !== 'none') {
      ctx.clip();
      switch (colorScheme.texture) {
        case 'liquid_glass': {
          // Subtle inner luminous refraction arc near outer rim
          const glassGrad = ctx.createRadialGradient(
            center - radius * 0.25,
            center - radius * 0.25,
            radius * 0.1,
            center,
            center,
            radius
          );
          glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.26)');
          glassGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.04)');
          glassGrad.addColorStop(0.88, 'rgba(255, 255, 255, 0.18)');
          glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.34)');
          ctx.fillStyle = glassGrad;
          ctx.fillRect(0, 0, size, size);

          // Crisp inner rim highlight inside each slice
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.arc(center, center, radius - 1.5 * scale, startAngle, endAngle);
          ctx.stroke();
          break;
        }
        case 'aurora': {
          const auroraGrad = ctx.createRadialGradient(
            center + Math.cos(startAngle + sliceAngle * 0.25) * (radius * 0.45),
            center + Math.sin(startAngle + sliceAngle * 0.25) * (radius * 0.45),
            radius * 0.05,
            center,
            center,
            radius
          );
          auroraGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
          auroraGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.03)');
          auroraGrad.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
          ctx.fillStyle = auroraGrad;
          ctx.fillRect(0, 0, size, size);
          break;
        }
        case 'silk': {
          const silkGrad = ctx.createLinearGradient(
            center + Math.cos(startAngle) * radius,
            center + Math.sin(startAngle) * radius,
            center + Math.cos(endAngle) * radius,
            center + Math.sin(endAngle) * radius
          );
          silkGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
          silkGrad.addColorStop(0.5, 'rgba(255,255,255,0.24)');
          silkGrad.addColorStop(1, 'rgba(255,255,255,0.05)');
          ctx.fillStyle = silkGrad;
          ctx.fillRect(0, 0, size, size);
          break;
        }
        case 'frosted': {
          const rand = mulberry32(4201 + i * 97);
          ctx.globalAlpha = 0.1;
          for (let j = 0; j < 260; j++) {
            const rDist = Math.sqrt(rand()) * radius;
            const rAng = startAngle + rand() * sliceAngle;
            const px = center + Math.cos(rAng) * rDist;
            const py = center + Math.sin(rAng) * rDist;
            ctx.fillStyle = rand() > 0.5 ? '#ffffff' : '#000000';
            ctx.fillRect(px, py, 1.4 * scale, 1.4 * scale);
          }
          ctx.globalAlpha = 1;
          break;
        }
        case 'pearl': {
          const pearlGrad = ctx.createRadialGradient(center, center, radius * 0.3, center, center, radius);
          pearlGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
          pearlGrad.addColorStop(0.75, 'rgba(255,255,255,0.02)');
          pearlGrad.addColorStop(1, 'rgba(255,255,255,0.28)');
          ctx.fillStyle = pearlGrad;
          ctx.fillRect(0, 0, size, size);
          break;
        }
        case 'crystal': {
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 1.2 * scale;
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.lineTo(
            center + Math.cos(startAngle + sliceAngle * 0.35) * radius,
            center + Math.sin(startAngle + sliceAngle * 0.35) * radius
          );
          ctx.stroke();
          break;
        }
        case 'matte': {
          const matteGrad = ctx.createRadialGradient(center, center, radius * 0.65, center, center, radius);
          matteGrad.addColorStop(0, 'rgba(255,255,255,0)');
          matteGrad.addColorStop(1, 'rgba(0,0,0,0.06)');
          ctx.fillStyle = matteGrad;
          ctx.fillRect(0, 0, size, size);
          break;
        }
      }
    }
    ctx.restore();
  });

  // Global soft glass dome sheen across the slice disc for Liquid Glass / Aurora themes
  if (colorScheme.texture === 'liquid_glass' || colorScheme.texture === 'aurora') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();

    const dome = ctx.createLinearGradient(
      center - radius * 0.7,
      center - radius * 0.9,
      center + radius * 0.4,
      center + radius * 0.5
    );
    dome.addColorStop(0, 'rgba(255, 255, 255, 0.24)');
    dome.addColorStop(0.35, 'rgba(255, 255, 255, 0.06)');
    dome.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
    dome.addColorStop(1, 'rgba(0, 0, 0, 0.06)');
    ctx.fillStyle = dome;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  }

  // 2. Draw Spokes (Dividers)
  if (spokeStyle !== 'none' && spokeWidth > 0) {
    items.forEach((_, i) => {
      const startAngle = i * sliceAngle + rotationRad;
      const xEnd = center + Math.cos(startAngle) * radius;
      const yEnd = center + Math.sin(startAngle) * radius;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(xEnd, yEnd);
      ctx.lineWidth = spokeWidth * scale;
      ctx.lineCap = 'round';

      switch (spokeStyle) {
        case 'glass_seam': {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
          ctx.shadowBlur = 2 * scale;
          break;
        }
        case 'silver_wire':
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          break;
        case 'golden_wire': {
          const goldGrad = ctx.createLinearGradient(center, center, xEnd, yEnd);
          goldGrad.addColorStop(0, '#8e5d0d');
          goldGrad.addColorStop(0.5, '#fcf6ba');
          goldGrad.addColorStop(1, '#b38728');
          ctx.strokeStyle = goldGrad;
          break;
        }
        case 'etched_groove':
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
          break;
        case 'embossed_ridge':
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          break;
        case 'dotted_perforation':
          ctx.setLineDash([2 * scale, 4 * scale]);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.24)';
          break;
        default:
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      }
      ctx.stroke();
      ctx.restore();
    });
  }

  // 3. Draw Slice Labels
  if (showText) {
    items.forEach((item, i) => {
      const startAngle = i * sliceAngle + rotationRad;
      const midAngle = startAngle + sliceAngle / 2;
      const gradPair = colorScheme.gradientStops?.[i % colorScheme.gradientStops.length];
      const baseColor = colorScheme.colors[i % colorScheme.colors.length];

      const resolvedTextColor = autoTextColor
        ? getContrastTextColor(gradPair ?? baseColor)
        : fontColor;

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(midAngle);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = resolvedTextColor;
      ctx.font = `${fontWeight} ${fontSize * scale}px ${fontFamily}`;
      if (resolvedTextColor === '#FFFFFF') {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
        ctx.shadowBlur = 4 * scale;
        ctx.shadowOffsetY = 1 * scale;
      }
      const textRadius = radius - 26 * scale;
      const maxWidth = Math.max(40 * scale, radius - hubRadius * scale - 42 * scale);
      ctx.fillText(item, textRadius, 0, maxWidth);
      ctx.restore();
    });
  }

  // 4. Physical Bezel / Border
  if (borderWidth > 0) {
    ctx.save();
    const bRadius = radius + (borderWidth * scale) / 2;
    ctx.beginPath();
    ctx.arc(center, center, bRadius, 0, 2 * Math.PI);
    ctx.lineWidth = borderWidth * scale;

    const gradX1 = center - outerRadius;
    const gradY1 = center - outerRadius;
    const gradX2 = center + outerRadius;
    const gradY2 = center + outerRadius;

    switch (borderStyle) {
      case 'liquid_glass_bezel': {
        const g = ctx.createLinearGradient(gradX1, gradY1, gradX2, gradY2);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
        g.addColorStop(0.35, 'rgba(218, 238, 255, 0.68)');
        g.addColorStop(0.65, 'rgba(245, 236, 255, 0.72)');
        g.addColorStop(1, 'rgba(255, 255, 255, 0.88)');
        ctx.strokeStyle = g;
        break;
      }
      case 'aurora_prism': {
        const g = ctx.createConicGradient(rotationRad * 0.5, center, center);
        g.addColorStop(0, '#38bdf8');
        g.addColorStop(0.2, '#818cf8');
        g.addColorStop(0.4, '#e879f9');
        g.addColorStop(0.6, '#fb7185');
        g.addColorStop(0.8, '#34d399');
        g.addColorStop(1, '#38bdf8');
        ctx.strokeStyle = g;
        break;
      }
      case 'titanium': {
        const g = ctx.createConicGradient(rotationRad, center, center);
        g.addColorStop(0, '#4b5563');
        g.addColorStop(0.2, '#9ca3af');
        g.addColorStop(0.25, '#f9fafb');
        g.addColorStop(0.3, '#9ca3af');
        g.addColorStop(0.5, '#4b5563');
        g.addColorStop(0.7, '#9ca3af');
        g.addColorStop(0.75, '#f9fafb');
        g.addColorStop(0.8, '#9ca3af');
        g.addColorStop(1, '#4b5563');
        ctx.strokeStyle = g;
        break;
      }
      case 'polished_gold': {
        const g = ctx.createConicGradient(rotationRad * 0.5, center, center);
        g.addColorStop(0, '#78510d');
        g.addColorStop(0.15, '#fef08a');
        g.addColorStop(0.3, '#ca8a04');
        g.addColorStop(0.55, '#fef9c3');
        g.addColorStop(0.8, '#ca8a04');
        g.addColorStop(0.9, '#fef08a');
        g.addColorStop(1, '#78510d');
        ctx.strokeStyle = g;
        break;
      }
      case 'frosted_glass': {
        const g = ctx.createRadialGradient(center, center, radius, center, center, outerRadius);
        g.addColorStop(0, 'rgba(241, 245, 249, 0.88)');
        g.addColorStop(0.5, 'rgba(255, 255, 255, 0.52)');
        g.addColorStop(1, 'rgba(203, 213, 225, 0.78)');
        ctx.strokeStyle = g;
        break;
      }
      case 'brushed_aluminum': {
        const g = ctx.createLinearGradient(gradX1, gradY1, gradX2, gradY2);
        g.addColorStop(0, '#cbd5e1');
        g.addColorStop(0.5, '#f8fafc');
        g.addColorStop(1, '#94a3b8');
        ctx.strokeStyle = g;
        break;
      }
      case 'liquid_mercury': {
        const g = ctx.createConicGradient(rotationRad * 1.4, center, center);
        g.addColorStop(0, '#18181b');
        g.addColorStop(0.2, '#a1a1aa');
        g.addColorStop(0.25, '#ffffff');
        g.addColorStop(0.3, '#71717a');
        g.addColorStop(0.5, '#18181b');
        g.addColorStop(0.75, '#ffffff');
        g.addColorStop(1, '#18181b');
        ctx.strokeStyle = g;
        break;
      }
      case 'rose_quartz': {
        const g = ctx.createLinearGradient(gradX1, gradY1, gradX2, gradY2);
        g.addColorStop(0, '#fecdd3');
        g.addColorStop(0.5, '#fff1f2');
        g.addColorStop(1, '#fda4af');
        ctx.strokeStyle = g;
        break;
      }
      case 'obsidian_chrome': {
        const g = ctx.createConicGradient(rotationRad, center, center);
        g.addColorStop(0, '#09090b');
        g.addColorStop(0.2, '#27272a');
        g.addColorStop(0.25, '#e4e4e7');
        g.addColorStop(0.3, '#27272a');
        g.addColorStop(0.5, '#09090b');
        g.addColorStop(0.7, '#27272a');
        g.addColorStop(0.75, '#e4e4e7');
        g.addColorStop(0.8, '#27272a');
        g.addColorStop(1, '#09090b');
        ctx.strokeStyle = g;
        break;
      }
      case 'iridescent_pearl': {
        const g = ctx.createConicGradient(rotationRad, center, center);
        g.addColorStop(0, '#eef2f3');
        g.addColorStop(0.2, '#ffe4e6');
        g.addColorStop(0.4, '#dcfce7');
        g.addColorStop(0.6, '#e0e7ff');
        g.addColorStop(0.8, '#fef3c7');
        g.addColorStop(1, '#eef2f3');
        ctx.strokeStyle = g;
        break;
      }
      case 'champagne_satin': {
        const g = ctx.createLinearGradient(gradX1, gradY1, gradX2, gradY2);
        g.addColorStop(0, '#e6cfa3');
        g.addColorStop(0.5, '#fcf5e5');
        g.addColorStop(1, '#d8bc88');
        ctx.strokeStyle = g;
        break;
      }
      case 'ceramic_white': {
        const g = ctx.createRadialGradient(
          center - outerRadius * 0.25,
          center - outerRadius * 0.25,
          0,
          center,
          center,
          outerRadius
        );
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, '#e4e4e7');
        ctx.strokeStyle = g;
        break;
      }
      case 'emerald_glass': {
        const g = ctx.createRadialGradient(center, center, radius, center, center, outerRadius);
        g.addColorStop(0, 'rgba(16, 185, 129, 0.9)');
        g.addColorStop(1, 'rgba(6, 78, 59, 0.96)');
        ctx.strokeStyle = g;
        break;
      }
      case 'space_black_matte': {
        const g = ctx.createRadialGradient(center, center, radius, center, center, outerRadius);
        g.addColorStop(0, '#27272a');
        g.addColorStop(1, '#09090b');
        ctx.strokeStyle = g;
        break;
      }
      case 'nebula_resin': {
        const g = ctx.createConicGradient(rotationRad * 0.3, center, center);
        g.addColorStop(0, '#1e1b4b');
        g.addColorStop(0.5, '#5b21b6');
        g.addColorStop(1, '#1e1b4b');
        ctx.strokeStyle = g;
        break;
      }
      default:
        ctx.strokeStyle = config.borderColor;
    }
    ctx.stroke();

    // Specular rim overlay & crisp chamfer lines
    const rim = ctx.createLinearGradient(gradX1, gradY1, gradX2, gradY2);
    rim.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
    rim.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    rim.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
    ctx.strokeStyle = rim;
    ctx.stroke();

    // Inner & outer micro-hairline bevels
    ctx.lineWidth = 1.25 * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(center, center, outerRadius - 0.6 * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.beginPath();
    ctx.arc(center, center, radius + 0.5 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Deterministic stars for nebula_resin
    if (borderStyle === 'nebula_resin') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
      ctx.arc(center, center, radius, 0, Math.PI * 2, true);
      ctx.clip();
      const starRand = mulberry32(9001);
      for (let i = 0; i < 65; i++) {
        const ang = starRand() * Math.PI * 2 + rotationRad;
        const dist = radius + starRand() * borderWidth * scale;
        const sx = center + Math.cos(ang) * dist;
        const sy = center + Math.sin(ang) * dist;
        ctx.fillStyle = `rgba(255,255,255,${0.4 + starRand() * 0.6})`;
        ctx.beginPath();
        ctx.arc(sx, sy, (0.6 + starRand() * 1.1) * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // 5. Precision Rim Pegs at Slice Boundaries
  if (showPegs) {
    const pegRadius = borderWidth >= 14 ? 3.2 * scale : 2.6 * scale;
    const pegOrbit = borderWidth >= 12 ? radius + Math.min(borderWidth * 0.35, 8) * scale : radius - 7 * scale;

    items.forEach((_, i) => {
      const angle = i * sliceAngle + rotationRad;
      const px = center + Math.cos(angle) * pegOrbit;
      const py = center + Math.sin(angle) * pegOrbit;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
      ctx.shadowBlur = 3 * scale;
      ctx.shadowOffsetY = 1 * scale;

      const pegGrad = ctx.createRadialGradient(
        px - pegRadius * 0.35,
        py - pegRadius * 0.35,
        0,
        px,
        py,
        pegRadius
      );
      pegGrad.addColorStop(0, '#FFFFFF');
      pegGrad.addColorStop(0.55, '#E4E4E7');
      pegGrad.addColorStop(1, '#71717A');

      ctx.beginPath();
      ctx.arc(px, py, pegRadius, 0, Math.PI * 2);
      ctx.fillStyle = pegGrad;
      ctx.fill();
      ctx.restore();
    });
  }

  // 6. Machined Center Hub
  if (hubRadius > 0) {
    const hr = hubRadius * scale;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 14 * scale;
    ctx.shadowOffsetY = 4 * scale;

    ctx.beginPath();
    ctx.arc(center, center, hr, 0, 2 * Math.PI);
    const hubGrad = ctx.createRadialGradient(
      center - hr * 0.3,
      center - hr * 0.3,
      0,
      center,
      center,
      hr
    );
    hubGrad.addColorStop(0, '#FFFFFF');
    hubGrad.addColorStop(0.72, hubColor);
    hubGrad.addColorStop(1, '#D4D4D8');
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.restore();

    // Inner tactile chamfer ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, Math.max(4 * scale, hr * 0.72), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, hr - 1 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
    ctx.restore();
  }

  // 7. Optional Pointer Included in Exported PNG
  if (config.includePointerInExport) {
    ctx.save();
    const tipY = center - radius + 12 * scale;
    const topY = center - outerRadius - 14 * scale;
    const halfW = 14 * scale;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 8 * scale;
    ctx.shadowOffsetY = 3 * scale;

    ctx.beginPath();
    ctx.moveTo(center, tipY);
    ctx.quadraticCurveTo(center - halfW, topY + 12 * scale, center - halfW * 0.65, topY);
    ctx.arc(center, topY + 6 * scale, halfW * 0.65, Math.PI, 0, false);
    ctx.quadraticCurveTo(center + halfW, topY + 12 * scale, center, tipY);
    ctx.closePath();

    const pGrad = ctx.createLinearGradient(center - halfW, topY, center + halfW, tipY);
    pGrad.addColorStop(0, '#FFFFFF');
    pGrad.addColorStop(1, '#E5E7EB');
    ctx.fillStyle = pGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();
    ctx.restore();
  }
}

export const WheelCanvas = forwardRef<WheelCanvasHandle, WheelCanvasProps>(
  ({ config, isSpinning = false, onHubClick }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        exportPngDataUrl: (scale = 4) => {
          const offscreen = document.createElement('canvas');
          offscreen.width = 1000 * scale;
          offscreen.height = 1000 * scale;
          renderWheelToCanvas(offscreen, config, scale);
          return offscreen.toDataURL('image/png', 1.0);
        },
      }),
      [config]
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const liveScale = 1.6; // Crisp 1600x1600 retina canvas for smooth 60fps spin
      if (canvas.width !== 1000 * liveScale) {
        canvas.width = 1000 * liveScale;
        canvas.height = 1000 * liveScale;
      }
      renderWheelToCanvas(canvas, config, liveScale);
    }, [config]);

    const hubDiameterPct = Math.max(8, Math.min(26, (config.hubRadius / 500) * 100));

    return (
      <div className="relative w-full h-full flex items-center justify-center select-none">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain drop-shadow-[0_28px_60px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_28px_60px_rgba(0,0,0,0.48)]"
        />
        {config.items.length > 0 && config.hubRadius >= 16 && onHubClick && (
          <button
            type="button"
            onClick={onHubClick}
            disabled={isSpinning}
            title={isSpinning ? '旋转中' : '点击转盘中心开始旋转'}
            aria-label="点击转盘中心开始旋转"
            style={{
              width: `${hubDiameterPct}%`,
              height: `${hubDiameterPct}%`,
            }}
            className="absolute rounded-full cursor-pointer disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0071E3] transition-transform duration-150 hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            <span className="sr-only">开始旋转</span>
          </button>
        )}
      </div>
    );
  }
);

WheelCanvas.displayName = 'WheelCanvas';
