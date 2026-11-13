export type WheelTexture =
  | 'none'
  | 'liquid_glass'
  | 'aurora'
  | 'silk'
  | 'frosted'
  | 'pearl'
  | 'crystal'
  | 'matte';

export type SchemeCategory = 'liquid_glass' | 'aurora' | 'apple_pop' | 'minimal';

export interface ColorScheme {
  id: string;
  name: string;
  subtitle: string;
  category: SchemeCategory;
  colors: string[];
  gradientStops?: [string, string][];
  recommendedTextColor: string;
  texture: WheelTexture;
}

export type BorderStyle =
  | 'liquid_glass_bezel'
  | 'aurora_prism'
  | 'titanium'
  | 'ceramic_white'
  | 'frosted_glass'
  | 'iridescent_pearl'
  | 'polished_gold'
  | 'champagne_satin'
  | 'brushed_aluminum'
  | 'liquid_mercury'
  | 'obsidian_chrome'
  | 'rose_quartz'
  | 'emerald_glass'
  | 'space_black_matte'
  | 'nebula_resin'
  | 'solid';

export type SpokeStyle =
  | 'none'
  | 'glass_seam'
  | 'silver_wire'
  | 'golden_wire'
  | 'etched_groove'
  | 'embossed_ridge'
  | 'dotted_perforation';

export interface WheelConfig {
  items: string[];
  colorScheme: ColorScheme;
  borderWidth: number;
  borderColor: string;
  borderStyle: BorderStyle;
  spokeWidth: number;
  spokeStyle: SpokeStyle;
  hubRadius: number;
  hubColor: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontColor: string;
  autoTextColor: boolean;
  rotation: number;
  showText: boolean;
  showPegs: boolean;
  includePointerInExport: boolean;
}

export interface SpinWinner {
  index: number;
  label: string;
  color: string;
}
