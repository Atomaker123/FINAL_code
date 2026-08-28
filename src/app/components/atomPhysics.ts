// Orbital math ported from Python source

export const ELEMENT_NAMES: Record<number, string> = {
  1:"Hydrogen",2:"Helium",3:"Lithium",4:"Beryllium",5:"Boron",6:"Carbon",7:"Nitrogen",8:"Oxygen",
  9:"Fluorine",10:"Neon",11:"Sodium",12:"Magnesium",13:"Aluminum",14:"Silicon",15:"Phosphorus",
  16:"Sulfur",17:"Chlorine",18:"Argon",19:"Potassium",20:"Calcium",21:"Scandium",22:"Titanium",
  23:"Vanadium",24:"Chromium",25:"Manganese",26:"Iron",27:"Cobalt",28:"Nickel",29:"Copper",
  30:"Zinc",31:"Gallium",32:"Germanium",33:"Arsenic",34:"Selenium",35:"Bromine",36:"Krypton",
  37:"Rubidium",38:"Strontium",39:"Yttrium",40:"Zirconium",41:"Niobium",42:"Molybdenum",
  43:"Technetium",44:"Ruthenium",45:"Rhodium",46:"Palladium",47:"Silver",48:"Cadmium",
  49:"Indium",50:"Tin",51:"Antimony",52:"Tellurium",53:"Iodine",54:"Xenon",55:"Cesium",
  56:"Barium",57:"Lanthanum",58:"Cerium",59:"Praseodymium",60:"Neodymium",61:"Promethium",
  62:"Samarium",63:"Europium",64:"Gadolinium",65:"Terbium",66:"Dysprosium",67:"Holmium",
  68:"Erbium",69:"Thulium",70:"Ytterbium",71:"Lutetium",72:"Hafnium",73:"Tantalum",74:"Tungsten",
  75:"Rhenium",76:"Osmium",77:"Iridium",78:"Platinum",79:"Gold",80:"Mercury",81:"Thallium",
  82:"Lead",83:"Bismuth",84:"Polonium",85:"Astatine",86:"Radon",87:"Francium",88:"Radium",
  89:"Actinium",90:"Thorium",91:"Protactinium",92:"Uranium",93:"Neptunium",94:"Plutonium",
  95:"Americium",96:"Curium",97:"Berkelium",98:"Californium",99:"Einsteinium",100:"Fermium",
  101:"Mendelevium",102:"Nobelium",103:"Lawrencium",104:"Rutherfordium",105:"Dubnium",
  106:"Seaborgium",107:"Bohrium",108:"Hassium",109:"Meitnerium",110:"Darmstadtium",
  111:"Roentgenium",112:"Copernicium",113:"Nihonium",114:"Flerovium",115:"Moscovium",
  116:"Livermorium",117:"Tennessine",118:"Oganesson",
};

export type OrbitalType = 's' | 'p' | 'd' | 'f';
export type OrbitalParams = { type: OrbitalType; angle: number; orientation: number[] | string | number };

function randomUnitVector(): [number, number, number] {
  const phi = Math.random() * 2 * Math.PI;
  const costheta = Math.random() * 2 - 1;
  const sintheta = Math.sqrt(1 - costheta * costheta);
  return [sintheta * Math.cos(phi), sintheta * Math.sin(phi), costheta];
}

export function assignElectronOrbital(idx: number): OrbitalParams {
  if (idx === 0) {
    return { type: 's', angle: Math.random() * 2 * Math.PI, orientation: randomUnitVector() };
  } else if (idx < 6) {
    const axes = ['x', 'x', 'y', 'y', 'z'];
    return { type: 'p', angle: Math.random() * 2 * Math.PI, orientation: axes[idx - 1] };
  } else if (idx < 16) {
    const typeId = Math.floor((idx - 6) / 2);
    return { type: 'd', angle: Math.random() * 2 * Math.PI, orientation: typeId };
  } else if (idx < 30) {
    const typeId = (idx - 16) % 2;
    return { type: 'f', angle: Math.random() * 2 * Math.PI, orientation: typeId };
  } else {
    const types: OrbitalType[] = ['p', 'd', 'f'];
    const t = types[Math.floor(Math.random() * 3)];
    const angle = Math.random() * 2 * Math.PI;
    if (t === 'p') return { type: 'p', angle, orientation: ['x','y','z'][Math.floor(Math.random()*3)] };
    if (t === 'd') return { type: 'd', angle, orientation: Math.floor(Math.random() * 5) };
    return { type: 'f', angle, orientation: Math.floor(Math.random() * 2) };
  }
}

export function sOrbital(angle: number, radius: number, normal: number[]): [number, number, number] {
  const n = normalize(normal);
  let v = Math.abs(n[2]) < 0.99 ? cross(n, [0,0,1]) : cross(n, [0,1,0]);
  v = normalize(v);
  const w = cross(n, v);
  return [
    radius * (Math.cos(angle) * v[0] + Math.sin(angle) * w[0]),
    radius * (Math.cos(angle) * v[1] + Math.sin(angle) * w[1]),
    radius * (Math.cos(angle) * v[2] + Math.sin(angle) * w[2]),
  ];
}

export function pOrbital(angle: number, radius: number, axis: string): [number, number, number] {
  const t = angle;
  const a = radius * 0.7;
  const offset = [radius * 0.3, radius * 0.3, radius * 0.3];
  let x: number, y: number, z: number;
  let axisVec: [number,number,number];
  if (axis === 'x') {
    x = radius * Math.cos(t); y = a * Math.sin(t); z = a * Math.sin(2*t);
    axisVec = [1,0,0];
  } else if (axis === 'y') {
    x = a * Math.sin(t); y = radius * Math.cos(t); z = a * Math.sin(2*t);
    axisVec = [0,1,0];
  } else {
    x = a * Math.sin(t); y = a * Math.sin(2*t); z = radius * Math.cos(t);
    axisVec = [0,0,1];
  }
  const offset2 = scale(axisVec, radius * 0.25);
  return [x + offset[0] + offset2[0], y + offset[1] + offset2[1], z + offset[2] + offset2[2]];
}

export function dOrbital(angle: number, radius: number, typeId: number): [number, number, number] {
  const t = angle; const r = radius;
  let x: number, y: number, z: number;
  let axisVec: [number,number,number];
  if (typeId === 0) { x = r*Math.cos(t)*Math.sin(t); y = r*Math.sin(t)*Math.sin(t); z = 0; axisVec=[0,0,1]; }
  else if (typeId === 1) { x = r*(Math.cos(t)**2-Math.sin(t)**2); y = r*2*Math.sin(t)*Math.cos(t); z = 0; axisVec=[0,0,1]; }
  else if (typeId === 2) { x = r*Math.cos(t); y = r*Math.sin(t); z = r*Math.cos(2*t)/2; axisVec=[1,1,1]; }
  else if (typeId === 3) { x = r*Math.cos(t); y = 0; z = r*Math.sin(t); axisVec=[0,1,0]; }
  else { x = 0; y = r*Math.cos(t); z = r*Math.sin(t); axisVec=[1,0,0]; }
  const off = scale(normalize(axisVec), radius * 0.18);
  return [x+off[0], y+off[1], z+off[2]];
}

export function fOrbital(angle: number, radius: number, typeId: number): [number, number, number] {
  const t = angle; const r = radius;
  let x: number, y: number, z: number;
  let axisVec: [number,number,number];
  if (typeId === 0) {
    x = r*Math.sin(3*t)*Math.cos(t); y = r*Math.sin(3*t)*Math.sin(t); z = r*Math.cos(3*t);
    axisVec=[1,1,1];
  } else {
    x = r*Math.cos(3*t)*Math.cos(t); y = r*Math.cos(3*t)*Math.sin(t); z = r*Math.sin(3*t);
    axisVec=[1,0,1];
  }
  const off = scale(normalize(axisVec), radius * 0.12);
  return [x+off[0], y+off[1], z+off[2]];
}

const BASE_RADII: Record<OrbitalType, number> = { s:1.5, p:2.2, d:2.7, f:3.2 };

export function electronPosition(
  params: OrbitalParams,
  nucleusRadius: number,
  center: [number,number,number]
): [number, number, number] {
  const radius = BASE_RADII[params.type] + nucleusRadius + 0.3;
  let pos: [number,number,number];
  if (params.type === 's') pos = sOrbital(params.angle, radius, params.orientation as number[]);
  else if (params.type === 'p') pos = pOrbital(params.angle, radius, params.orientation as string);
  else if (params.type === 'd') pos = dOrbital(params.angle, radius, params.orientation as number);
  else pos = fOrbital(params.angle, radius, params.orientation as number);
  return [pos[0]+center[0], pos[1]+center[1], pos[2]+center[2]];
}

export function buildTrailPoints(
  params: OrbitalParams,
  nucleusRadius: number,
  center: [number,number,number],
  steps = 100
): [number, number, number][] {
  const radius = BASE_RADII[params.type] + nucleusRadius + 0.3;
  const pts: [number,number,number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (2 * Math.PI * i) / steps;
    const p = { ...params, angle: a };
    let pos: [number,number,number];
    if (p.type === 's') pos = sOrbital(a, radius, p.orientation as number[]);
    else if (p.type === 'p') pos = pOrbital(a, radius, p.orientation as string);
    else if (p.type === 'd') pos = dOrbital(a, radius, p.orientation as number);
    else pos = fOrbital(a, radius, p.orientation as number);
    pts.push([pos[0]+center[0], pos[1]+center[1], pos[2]+center[2]]);
  }
  return pts;
}

export function getAtomName(p: number, n: number, e: number, isBlackHole: boolean): string {
  if (isBlackHole) return "BLACK HOLE";
  if (p === 0 && n === 0 && e === 0) return "";
  if (Math.abs(n - p) >= 150) return "BLACK HOLE";
  const base = ELEMENT_NAMES[p] ?? `Element Z=${p}`;
  if (p < 1 || e < 1) return `${base} (Unstable)`;
  if (Math.abs(p - n) > 2 || Math.abs(p - e) > 5) return `${base} (Unstable)`;
  return `${base} (Stable)`;
}

// Vector helpers
function normalize(v: number[]): [number,number,number] {
  const len = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]) || 1;
  return [v[0]/len, v[1]/len, v[2]/len];
}
function cross(a: number[], b: number[]): [number,number,number] {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function scale(v: [number,number,number], s: number): [number,number,number] {
  return [v[0]*s, v[1]*s, v[2]*s];
}
