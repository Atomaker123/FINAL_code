import * as THREE from 'three';

export type ModelType = 'schrodinger' | 'bohr' | 'rutherford' | 'thomson' | 'dalton' | 'democritus';

export interface ModelInfo {
  id: ModelType;
  name: string;
  scientist: string;
  year: string;
  concept: string;
  description: string;
  tagline: string;
  features: string[];
}

export const ATOMIC_MODELS: Record<ModelType, ModelInfo> = {
  bohr: {
    id: 'bohr',
    name: 'Bohr Planetary Model',
    scientist: 'Niels Bohr',
    year: '1913',
    tagline: 'Quantized concentric circular orbits organized into K, L, M, N, O, P, Q shells (2n² rule)',
    concept: 'Electrons revolve in discrete, stable concentric circular orbits with quantized angular momentum L = nℏ.',
    description: 'Niels Bohr resolved the instability of Rutherford\'s atom by proposing that electrons can only occupy discrete, non-radiating energy levels designated as K (n=1, max 2), L (n=2, max 8), M (n=3, max 18), N (n=4, max 32), etc. Radiation is emitted or absorbed only when jumping between shells.',
    features: [
      'Dense positive central nucleus (protons + neutrons)',
      'Concentric planar quantized circular orbits (K, L, M, N...)',
      'Electrons orbit with speeds determined by principal quantum number n',
      'Exact shell capacity (2n²) and current occupancy counters displayed',
      'Discrete photon emission/absorption during quantum leaps'
    ]
  },
  schrodinger: {
    id: 'schrodinger',
    name: 'Quantum Mechanical Model',
    scientist: 'Erwin Schrödinger',
    year: '1926',
    tagline: '3D Probability clouds & exact orbital shapes: s, p, d, f subshells (Aufbau & Hund\'s Rule)',
    concept: 'Electrons behave as mathematical wavefunctions (ψ); 3D probability clouds |ψ|² replace deterministic orbits.',
    description: 'Based on the Schrödinger wave equation, electrons occupy complex 3D quantum subshells: spherical s-orbitals, dumbbell-shaped p-orbitals (px, py, pz), 4-leaf cloverleaf d-orbitals, and multi-lobed f-orbitals following the Aufbau principle and Hund\'s rule of maximum multiplicity.',
    features: [
      'Central nucleus enveloped in 3D quantum probability density clouds |ψ|²',
      'Distinct subshell geometry meshes (s spheres, p dumbbells, d cloverleaves)',
      'Color-coded subshell visualization: s (cyan), p (indigo), d (pink), f (purple)',
      'Full spectroscopic electron configuration (e.g. 1s² 2s² 2p⁶ 3s² 3p⁴)',
      'Dynamic quantum wave packet oscillations showing wave-particle duality'
    ]
  },
  rutherford: {
    id: 'rutherford',
    name: 'Rutherford Nuclear Model',
    scientist: 'Ernest Rutherford',
    year: '1911',
    tagline: 'Gold Foil Experiment — Dense central nucleus with continuous 3D orbital planes',
    concept: 'Discovered the atomic nucleus; demonstrated that the atom is 99.999% empty space.',
    description: 'Gold Foil alpha particle scattering proved that almost all mass and positive charge is concentrated in a tiny central positive nucleus. Electrons orbit in random cross-plane 3D inclinations around it without quantized energy levels.',
    features: [
      'Extremely compact positive central nucleus (protons only; no neutrons)',
      '99.999% empty space with widely separated electron paths',
      'Electrons orbiting in gyroscopic cross-inclination 3D planes',
      'Historical foundation that necessitated Bohr\'s energy quantization'
    ]
  },
  thomson: {
    id: 'thomson',
    name: 'Plum Pudding Model',
    scientist: 'J.J. Thomson',
    year: '1904',
    tagline: 'Continuous positive sphere with embedded negative electrons (\'raisins in pudding\')',
    concept: 'Atoms are uniform spheres of positive charge with electrons studded throughout.',
    description: 'Following the discovery of the electron in cathode rays, Thomson proposed that the atom is a uniform sphere of positive electric charge with negatively charged corpuscles (electrons) embedded inside like raisins in a pudding.',
    features: [
      'No nucleus — diffuse translucent positively charged sphere',
      'Electrons embedded directly inside the positive fluid',
      'Electrons vibrating around their equilibrium positions',
      'Electrostatic neutral balance of positive and negative charge'
    ]
  },
  dalton: {
    id: 'dalton',
    name: 'Solid Sphere Model',
    scientist: 'John Dalton',
    year: '1803',
    tagline: 'Billiard ball model — hard, solid, indivisible mass scaled by atomic weight',
    concept: 'Matter is made of indestructible, indivisible spherical atoms with no subatomic particles.',
    description: 'Based on the Law of Conservation of Mass and Multiple Proportions, all atoms of a given chemical element are identical, indivisible solid spheres whose properties and sizes scale with atomic weight.',
    features: [
      'Solid, featureless billiard-ball sphere with elemental metallic sheen',
      'Radius and mass reflect element identity and atomic weight (protons + neutrons)',
      'No internal subatomic division, electrons, or charge separation',
      'Pure stoichiometric foundation of chemical reactions'
    ]
  },
  democritus: {
    id: 'democritus',
    name: 'Ancient Atomos',
    scientist: 'Democritus',
    year: '400 BC',
    tagline: 'Philosophical indivisible geometric unit (\'atomos\') with hooks and facets in the void',
    concept: 'The philosophical hypothesis of uncuttable, indivisible particles moving through empty space.',
    description: 'Ancient Greek atomism posited that all matter consists of indivisible fundamental particles called \'atomos\' moving through empty void. Different substances possessed distinct geometric shapes, hooks, or facets that produced their tactile sensations and states of matter.',
    features: [
      'Faceted and hooked geometric polyhedron crystal',
      'Floating freely in the infinite philosophical void',
      'Different geometric shapes for different elements',
      'Ancient philosophical origin of atomic theory'
    ]
  }
};

export const BOHR_SHELL_CAPACITIES = [2, 8, 18, 32, 50, 72, 98];
export const BOHR_SHELL_NAMES = ['K (n=1)', 'L (n=2)', 'M (n=3)', 'N (n=4)', 'O (n=5)', 'P (n=6)', 'Q (n=7)'];
export const BOHR_SHELL_LETTERS = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];
export const BOHR_SHELL_COLORS = [
  '#06b6d4', // K - Cyan
  '#3b82f6', // L - Blue
  '#8b5cf6', // M - Indigo / Violet
  '#d946ef', // N - Fuchsia / Pink
  '#f59e0b', // O - Amber
  '#10b981', // P - Emerald
  '#f43f5e'  // Q - Rose
];

export interface BohrShellDistributionItem {
  shellIndex: number; // 0 for K, 1 for L, 2 for M, etc.
  name: string;       // e.g. 'K (n=1)'
  letter: string;     // 'K', 'L', 'M', etc.
  n: number;          // 1, 2, 3, etc.
  count: number;      // current number of electrons in this shell
  max: number;        // max capacity following 2n²
  radius: number;     // 3D radius for the shell ring
  color: string;      // designated color
}

// Complete Aufbau orbital sequence covering elements up to Z=118 and beyond (up to 300 electrons)
export const AUFBAU_ORDER: { n: number; l: number; type: 's'|'p'|'d'|'f'; label: string; cap: number }[] = [
  { n: 1, l: 0, type: 's', label: '1s', cap: 2 },
  { n: 2, l: 0, type: 's', label: '2s', cap: 2 },
  { n: 2, l: 1, type: 'p', label: '2p', cap: 6 },
  { n: 3, l: 0, type: 's', label: '3s', cap: 2 },
  { n: 3, l: 1, type: 'p', label: '3p', cap: 6 },
  { n: 4, l: 0, type: 's', label: '4s', cap: 2 },
  { n: 3, l: 2, type: 'd', label: '3d', cap: 10 },
  { n: 4, l: 1, type: 'p', label: '4p', cap: 6 },
  { n: 5, l: 0, type: 's', label: '5s', cap: 2 },
  { n: 4, l: 2, type: 'd', label: '4d', cap: 10 },
  { n: 5, l: 1, type: 'p', label: '5p', cap: 6 },
  { n: 6, l: 0, type: 's', label: '6s', cap: 2 },
  { n: 4, l: 3, type: 'f', label: '4f', cap: 14 },
  { n: 5, l: 2, type: 'd', label: '5d', cap: 10 },
  { n: 6, l: 1, type: 'p', label: '6p', cap: 6 },
  { n: 7, l: 0, type: 's', label: '7s', cap: 2 },
  { n: 5, l: 3, type: 'f', label: '5f', cap: 14 },
  { n: 6, l: 2, type: 'd', label: '6d', cap: 10 },
  { n: 7, l: 1, type: 'p', label: '7p', cap: 6 },
  // Extended hypothetical subshells for Z > 118 up to 300
  { n: 8, l: 0, type: 's', label: '8s', cap: 2 },
  { n: 5, l: 3, type: 'f', label: '5g', cap: 18 },
  { n: 6, l: 3, type: 'f', label: '6f', cap: 14 },
  { n: 7, l: 2, type: 'd', label: '7d', cap: 10 },
  { n: 8, l: 1, type: 'p', label: '8p', cap: 6 },
  { n: 9, l: 0, type: 's', label: '9s', cap: 2 },
  { n: 6, l: 3, type: 'f', label: '6g', cap: 18 },
  { n: 7, l: 3, type: 'f', label: '7f', cap: 14 },
  { n: 8, l: 2, type: 'd', label: '8d', cap: 10 },
  { n: 9, l: 1, type: 'p', label: '9p', cap: 6 },
  { n: 7, l: 3, type: 'f', label: '7g', cap: 18 },
  { n: 8, l: 3, type: 'f', label: '8f', cap: 14 },
  { n: 9, l: 2, type: 'd', label: '9d', cap: 10 },
  { n: 10, l: 0, type: 's', label: '10s', cap: 2 }
];

export interface SubshellConfig {
  label: string;
  count: number;
  cap: number;
  type: 's' | 'p' | 'd' | 'f';
  n: number;
  l: number;
}

export function getFullElectronConfiguration(electrons: number): SubshellConfig[] {
  let rem = electrons;
  const list: SubshellConfig[] = [];
  for (const orb of AUFBAU_ORDER) {
    if (rem <= 0) break;
    const count = Math.min(rem, orb.cap);
    list.push({
      label: orb.label,
      count,
      cap: orb.cap,
      type: orb.type,
      n: orb.n,
      l: orb.l
    });
    rem -= count;
  }
  // If there are still electrons left (e.g. > 280), assign remainder to highest shell
  if (rem > 0 && list.length > 0) {
    list[list.length - 1].count += rem;
  }
  return list;
}

/**
 * Calculates the exact Bohr KLMN shell distribution using the Aufbau quantum filling sum.
 * For example:
 * Z=19 (K): K=2, L=8, M=8, N=1
 * Z=20 (Ca): K=2, L=8, M=8, N=2
 * Z=26 (Fe): K=2, L=8, M=14, N=2
 * Z=36 (Kr): K=2, L=8, M=18, N=8
 * Always returns at least shells K, L, M, N (indices 0..3) so quantized shells are clearly visible.
 */
export function getBohrShellDistribution(totalElectrons: number): BohrShellDistributionItem[] {
  const shellCounts = [0, 0, 0, 0, 0, 0, 0];
  let rem = totalElectrons;

  for (const orb of AUFBAU_ORDER) {
    if (rem <= 0) break;
    const count = Math.min(rem, orb.cap);
    const sIdx = Math.min(6, orb.n - 1);
    shellCounts[sIdx] += count;
    rem -= count;
  }
  // Assign any overflow
  if (rem > 0) {
    shellCounts[6] += rem;
  }

  // Determine how many shells to display (always show at least K, L, M, N)
  let maxOccupiedIdx = 3; // at least N shell (index 3)
  for (let i = shellCounts.length - 1; i >= 0; i--) {
    if (shellCounts[i] > 0) {
      maxOccupiedIdx = Math.max(maxOccupiedIdx, i);
      break;
    }
  }

  const result: BohrShellDistributionItem[] = [];
  for (let i = 0; i <= maxOccupiedIdx; i++) {
    const max = BOHR_SHELL_CAPACITIES[i] ?? 2 * Math.pow(i + 1, 2);
    result.push({
      shellIndex: i,
      name: BOHR_SHELL_NAMES[i] ?? `Shell ${i+1}`,
      letter: BOHR_SHELL_LETTERS[i] ?? `n=${i+1}`,
      n: i + 1,
      count: shellCounts[i],
      max,
      radius: 1.65 + i * 0.95,
      color: BOHR_SHELL_COLORS[i] ?? '#38bdf8'
    });
  }

  return result;
}

export const ORBITAL_COLORS: Record<'s' | 'p' | 'd' | 'f', string> = {
  s: '#38bdf8', // Cyan / Sky Blue (Spherical)
  p: '#818cf8', // Indigo / Violet (Dumbbells px, py, pz)
  d: '#ec4899', // Pink / Rose (Cloverleaves)
  f: '#a855f7'  // Purple (Complex multi-lobe)
};

export const ORBITAL_RGB: Record<'s' | 'p' | 'd' | 'f', [number, number, number]> = {
  s: [0.22, 0.74, 0.97],
  p: [0.51, 0.55, 0.97],
  d: [0.93, 0.28, 0.60],
  f: [0.66, 0.33, 0.97]
};

/**
 * Samples a 3D position according to the quantum mechanical probability distribution |ψ|²
 * for subshells s, p, d, f.
 */
export function sampleOrbitalPosition(
  type: 's' | 'p' | 'd' | 'f',
  n: number,
  mIndex: number,
  scale: number = 1.0
): [number, number, number] {
  const rBase = (0.75 + n * 0.6) * scale;
  
  if (type === 's') {
    // S Orbital: Spherical symmetry
    const u = Math.random(), v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    // Radial distribution peaking around rBase
    const r = rBase * (0.55 + Math.random() * 0.75);
    return [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    ];
  } else if (type === 'p') {
    // P Orbital: Dumbbell lobes along X (m=0), Y (m=1), Z (m=2)
    const sign = Math.random() > 0.5 ? 1 : -1;
    const lobeDist = rBase * (0.8 + Math.random() * 0.75);
    // Angular spread tapers towards the nucleus
    const spread = 0.32 * Math.sqrt(Math.max(0.05, 1 - (lobeDist / (rBase * 2.2))));
    const lateral1 = (Math.random() - 0.5) * spread * rBase * 1.8;
    const lateral2 = (Math.random() - 0.5) * spread * rBase * 1.8;
    const main = sign * lobeDist;

    if (mIndex % 3 === 0) {
      // px: oriented along X axis
      return [main, lateral1, lateral2];
    } else if (mIndex % 3 === 1) {
      // py: oriented along Y axis
      return [lateral1, main, lateral2];
    } else {
      // pz: oriented along Z axis
      return [lateral1, lateral2, main];
    }
  } else if (type === 'd') {
    // D Orbital: 4-leaf cloverleaf shapes in planes or dz² along Z
    const subType = mIndex % 5;
    const r = rBase * (0.85 + Math.random() * 0.8);
    const zSpread = (Math.random() - 0.5) * 0.35 * rBase;

    if (subType === 0) {
      // dxy: lobes in XY plane between axes (45°, 135°, 225°, 315°)
      const lobe = Math.floor(Math.random() * 4);
      const angle = (lobe * Math.PI / 2 + Math.PI / 4) + ((Math.random() - 0.5) * 0.35);
      return [r * Math.cos(angle), r * Math.sin(angle), zSpread];
    } else if (subType === 1) {
      // dyz: lobes in YZ plane between axes
      const lobe = Math.floor(Math.random() * 4);
      const angle = (lobe * Math.PI / 2 + Math.PI / 4) + ((Math.random() - 0.5) * 0.35);
      return [zSpread, r * Math.cos(angle), r * Math.sin(angle)];
    } else if (subType === 2) {
      // dxz: lobes in XZ plane between axes
      const lobe = Math.floor(Math.random() * 4);
      const angle = (lobe * Math.PI / 2 + Math.PI / 4) + ((Math.random() - 0.5) * 0.35);
      return [r * Math.cos(angle), zSpread, r * Math.sin(angle)];
    } else if (subType === 3) {
      // dx²-y²: lobes in XY plane along axes (0°, 90°, 180°, 270°)
      const lobe = Math.floor(Math.random() * 4);
      const angle = (lobe * Math.PI / 2) + ((Math.random() - 0.5) * 0.35);
      return [r * Math.cos(angle), r * Math.sin(angle), zSpread];
    } else {
      // dz²: dumbbell along Z axis + donut ring in XY plane
      if (Math.random() > 0.4) {
        const sign = Math.random() > 0.5 ? 1 : -1;
        const main = sign * r * 1.1;
        return [(Math.random() - 0.5) * 0.25 * rBase, (Math.random() - 0.5) * 0.25 * rBase, main];
      } else {
        const theta = Math.random() * 2 * Math.PI;
        const ringR = rBase * 0.65 + (Math.random() - 0.5) * 0.2;
        return [ringR * Math.cos(theta), ringR * Math.sin(theta), (Math.random() - 0.5) * 0.15 * rBase];
      }
    }
  } else {
    // F Orbital: 8-lobed complex octants
    const lobe = Math.floor(Math.random() * 8);
    const theta = (lobe * Math.PI / 4) + ((Math.random() - 0.5) * 0.3);
    const phi = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 4 + (Math.random() - 0.5) * 0.3);
    const r = rBase * (0.9 + Math.random() * 0.9);
    return [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    ];
  }
}
