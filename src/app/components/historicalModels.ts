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
    tagline: 'Quantized circular orbits organized by K, L, M, N, O, P, Q shells (2n² rule)',
    concept: 'Electrons revolve in discrete, stable concentric orbits with quantized angular momentum.',
    description: 'Electrons occupy strict energy levels designated as K (n=1, max 2), L (n=2, max 8), M (n=3, max 18), N (n=4, max 32), etc., jumping between levels upon photon emission or absorption.',
    features: [
      'Concentrated dense central nucleus (protons + neutrons)',
      'Planar concentric 2D/3D circular orbits',
      'K, L, M, N energy shells populated following Pauli / 2n² rules',
      'Exact shell counters and labels displayed'
    ]
  },
  schrodinger: {
    id: 'schrodinger',
    name: 'Quantum Mechanical Cloud',
    scientist: 'Erwin Schrödinger',
    year: '1926',
    tagline: '3D Probability clouds & orbital shapes: 1s, 2s, 2p, 3s, 3p, 3d, 4f (Aufbau & Hund\'s Rule)',
    concept: 'Electrons behave as wavefunctions (ψ); probability clouds |ψ|² replace deterministic orbits.',
    description: 'Electrons occupy complex 3D quantum subshells (spherical s, dumbbell-shaped p (px, py, pz), clover-leaf d, and complex f lobes) calculated using quantum angular harmonics.',
    features: [
      'Central nucleus enveloped in quantum electron cloud',
      'Exact subshell orbital geometries (s spheres, p lobes, d cloverleaves)',
      'Dynamic wave-like orbital particles with probabilistic cloud glow',
      'Spectroscopic notation (e.g., 1s² 2s² 2p⁶ 3s² 3p⁶...)'
    ]
  },
  rutherford: {
    id: 'rutherford',
    name: 'Rutherford Nuclear Model',
    scientist: 'Ernest Rutherford',
    year: '1911',
    tagline: 'Gold Foil Experiment — Dense central nucleus with random orbital planes',
    concept: 'Discovered the dense central nucleus; demonstrated that the atom is mostly empty space.',
    description: 'Gold Foil alpha particle scattering proved mass is concentrated in a tiny central positive nucleus, with electrons moving freely in all 3D orientations around it.',
    features: [
      'Compact positive central nucleus',
      'Mostly empty space with widely spaced electron paths',
      'Electrons moving in random 3D orbital inclination angles',
      'Classic elliptical cross-plane gyroscopic motion'
    ]
  },
  thomson: {
    id: 'thomson',
    name: 'Plum Pudding Model',
    scientist: 'J.J. Thomson',
    year: '1904',
    tagline: 'Continuous positive sphere with embedded negative electrons (\'raisins in pudding\')',
    concept: 'Atoms are uniform spheres of positive charge with electrons studded throughout.',
    description: 'Cathode ray discovery of electrons led to the model of a uniform positively charged jelly/soup with corpuscles (electrons) statically embedded or gently oscillating inside.',
    features: [
      'No nucleus — large translucent positively charged sphere',
      'Electrons embedded directly inside the positive sphere',
      'Electrons vibrating/oscillating around equilibrium positions',
      'Neutral overall balance of charge'
    ]
  },
  dalton: {
    id: 'dalton',
    name: 'Solid Sphere Model',
    scientist: 'John Dalton',
    year: '1803',
    tagline: 'Billiard ball model — hard, solid, indivisible mass scaled by atomic weight',
    concept: 'Matter is made of hard, indestructible spherical atoms with no subatomic particles.',
    description: 'Based on the Law of Multiple Proportions, all atoms of a given element are identical solid spheres characterized by their atomic weight and mass.',
    features: [
      'Solid, featureless billiard-ball sphere with metallic/elemental sheen',
      'Radius & color reflect element identity and atomic mass (protons + neutrons)',
      'No internal subatomic division or charges',
      'Representation of pure Daltonian chemical stoichiometry'
    ]
  },
  democritus: {
    id: 'democritus',
    name: 'Ancient Atomos',
    scientist: 'Democritus',
    year: '400 BC',
    tagline: 'Philosophical indivisible geometric unit (\'atomos\') with hook-and-facet textures',
    concept: 'The foundational philosophical concept of uncuttable, indivisible particles in the void.',
    description: 'Ancient Greek atomism posited that matter is made of indestructible units with distinct geometric shapes, hooks, or facets that determine their physical sensations and properties.',
    features: [
      'Faceted/hooked geometric atomos crystal/polyhedron',
      'Floating in empty philosophical void',
      'Pure metaphysical foundation of atomic theory',
      'Ancient Greek geometric styling'
    ]
  }
};

export const BOHR_SHELL_CAPACITIES = [2, 8, 18, 32, 50, 72, 98];
export const BOHR_SHELL_NAMES = ['K (n=1)', 'L (n=2)', 'M (n=3)', 'N (n=4)', 'O (n=5)', 'P (n=6)', 'Q (n=7)'];

export function getBohrShellDistribution(totalElectrons: number): { shellIndex: number; name: string; count: number; max: number; radius: number }[] {
  let rem = totalElectrons;
  const result = [];
  for (let i = 0; i < BOHR_SHELL_CAPACITIES.length; i++) {
    const max = BOHR_SHELL_CAPACITIES[i];
    const count = Math.min(rem, max);
    result.push({
      shellIndex: i,
      name: BOHR_SHELL_NAMES[i],
      count,
      max,
      radius: 1.4 + i * 0.75
    });
    rem -= count;
    if (rem <= 0 && i >= 3) break;
  }
  return result;
}

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
  { n: 7, l: 1, type: 'p', label: '7p', cap: 6 }
];

export function getFullElectronConfiguration(electrons: number) {
  let rem = electrons;
  const list: { label: string; count: number; cap: number; type: 's'|'p'|'d'|'f'; n: number }[] = [];
  for (const orb of AUFBAU_ORDER) {
    if (rem <= 0) break;
    const count = Math.min(rem, orb.cap);
    list.push({ label: orb.label, count, cap: orb.cap, type: orb.type, n: orb.n });
    rem -= count;
  }
  return list;
}

export function sampleOrbitalPosition(
  type: 's' | 'p' | 'd' | 'f',
  n: number,
  mIndex: number,
  scale: number = 1.0
): [number, number, number] {
  const rBase = (0.7 + n * 0.55) * scale;
  
  if (type === 's') {
    const u = Math.random(), v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = (rBase * (0.6 + Math.random() * 0.8));
    return [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    ];
  } else if (type === 'p') {
    const sign = Math.random() > 0.5 ? 1 : -1;
    const lobeDist = rBase * (0.8 + Math.random() * 0.7);
    const spread = 0.35 * (1 - (lobeDist / (rBase * 2)));
    const lateral1 = (Math.random() - 0.5) * spread * rBase;
    const lateral2 = (Math.random() - 0.5) * spread * rBase;
    const main = sign * lobeDist;

    if (mIndex % 3 === 0) {
      return [main, lateral1, lateral2];
    } else if (mIndex % 3 === 1) {
      return [lateral1, main, lateral2];
    } else {
      return [lateral1, lateral2, main];
    }
  } else if (type === 'd') {
    const lobe = Math.floor(Math.random() * 4);
    const angle = (lobe * Math.PI / 2) + ((Math.random() - 0.5) * 0.4);
    const r = rBase * (0.8 + Math.random() * 0.8);
    const zSpread = (Math.random() - 0.5) * 0.4 * rBase;

    if (mIndex % 5 === 0) {
      return [r * Math.cos(angle), r * Math.sin(angle), zSpread];
    } else if (mIndex % 5 === 1) {
      return [r * Math.cos(angle), zSpread, r * Math.sin(angle)];
    } else if (mIndex % 5 === 2) {
      return [zSpread, r * Math.cos(angle), r * Math.sin(angle)];
    } else if (mIndex % 5 === 3) {
      const axAngle = (lobe * Math.PI / 2 + Math.PI / 4) + ((Math.random() - 0.5) * 0.4);
      return [r * Math.cos(axAngle), r * Math.sin(axAngle), zSpread];
    } else {
      if (Math.random() > 0.4) {
        const sign = Math.random() > 0.5 ? 1 : -1;
        return [(Math.random() - 0.5) * 0.3 * rBase, (Math.random() - 0.5) * 0.3 * rBase, sign * r];
      } else {
        const theta = Math.random() * 2 * Math.PI;
        const ringR = rBase * 0.6;
        return [ringR * Math.cos(theta), ringR * Math.sin(theta), (Math.random() - 0.5) * 0.2];
      }
    }
  } else {
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
