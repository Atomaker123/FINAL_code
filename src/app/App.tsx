import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import elementData from "../imports/elements.json";
import {
  ModelType,
  ATOMIC_MODELS,
  getBohrShellDistribution,
  getFullElectronConfiguration,
  sampleOrbitalPosition
} from "./components/historicalModels";

type ElementDB = Record<string, {
  name: string; symbol: string; description?: string;
  uses?: string; natural_occurrence?: string; history?: string;
  isotopes?: Record<string, { name?: string; info?: string; uses?: string; natural_occurrence?: string }>;
}>;

const ELEMENTS = elementData as ElementDB;

function getLocalInfo(protons: number, neutrons: number) {
  const e = ELEMENTS[String(protons)];
  if (!e) return null;
  const iso = e.isotopes?.[String(protons + neutrons)] ?? e.isotopes?.[String(neutrons)];
  return { elem: e, iso };
}

// ─── 3D HISTORICAL ATOM VIEWS ──────────────────────────────────────────────────

function Nucleus({ protons, neutrons }: { protons: number; neutrons: number }) {
  const particles = useMemo(() => {
    const arr: { type: 'p'|'n'; pos: [number, number, number] }[] = [];
    const radius = Math.max(0.28, Math.cbrt(protons + neutrons) * 0.15);
    for (let i = 0; i < protons; i++) {
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1);
      const r = Math.random() * radius;
      arr.push({
        type: 'p',
        pos: [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)]
      });
    }
    for (let i = 0; i < neutrons; i++) {
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1);
      const r = Math.random() * radius;
      arr.push({
        type: 'n',
        pos: [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)]
      });
    }
    return arr;
  }, [protons, neutrons]);

  return (
    <group>
      {particles.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshStandardMaterial
            color={p.type === 'p' ? '#ff3333' : '#ffcc00'}
            roughness={0.3}
            metalness={0.2}
            emissive={p.type === 'p' ? '#550000' : '#443300'}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

// 1. Bohr Model (Concentric 2D quantized K, L, M, N... shells)
function BohrShell({
  shellIndex,
  radius,
  count,
  highQuality
}: {
  shellIndex: number;
  radius: number;
  count: number;
  highQuality: boolean;
}) {
  const electronRefs = useRef<THREE.Mesh[]>([]);
  const speed = 1.6 / Math.sqrt(radius);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    for (let i = 0; i < count; i++) {
      const mesh = electronRefs.current[i];
      if (mesh) {
        const angle = t + (i / count) * Math.PI * 2;
        mesh.position.x = Math.cos(angle) * radius;
        mesh.position.y = Math.sin(angle) * radius;
        mesh.position.z = 0;
      }
    }
  });

  const shellColors = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#34d399', '#facc15'];
  const col = shellColors[shellIndex % shellColors.length];

  return (
    <group>
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[radius - 0.012, radius + 0.012, highQuality ? 128 : 64]} />
        <meshBasicMaterial color={col} side={THREE.DoubleSide} transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[radius - 0.04, radius + 0.04, highQuality ? 64 : 32]} />
        <meshBasicMaterial color={col} side={THREE.DoubleSide} transparent opacity={0.08} />
      </mesh>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) electronRefs.current[i] = el; }}
        >
          <sphereGeometry args={[0.075, highQuality ? 24 : 16, highQuality ? 24 : 16]} />
          <meshStandardMaterial
            color="#67e8f9"
            emissive={col}
            emissiveIntensity={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function BohrModel3D({ protons, neutrons, electrons, highQuality }: { protons: number; neutrons: number; electrons: number; highQuality: boolean }) {
  const shells = useMemo(() => getBohrShellDistribution(electrons), [electrons]);
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <Nucleus protons={protons} neutrons={neutrons} />
      {shells.map((shell) => (
        <BohrShell
          key={shell.shellIndex}
          shellIndex={shell.shellIndex}
          radius={shell.radius}
          count={shell.count}
          highQuality={highQuality}
        />
      ))}
    </group>
  );
}

// 2. Schrödinger Model (Quantum 3D Wave Probability Cloud & Aufbau Subshells)
function SchrodingerModel3D({
  protons,
  neutrons,
  electrons,
  highQuality
}: {
  protons: number;
  neutrons: number;
  electrons: number;
  highQuality: boolean;
}) {
  const configs = useMemo(() => getFullElectronConfiguration(electrons), [electrons]);
  const cloudPoints = useMemo(() => {
    const pts: { pos: [number, number, number]; color: string; size: number }[] = [];
    for (const conf of configs) {
      const type = conf.type;
      const n = conf.n;
      const count = conf.count;
      const pointsPerElectron = highQuality ? 180 : 90;
      const totalPoints = count * pointsPerElectron;

      let subColor = '#38bdf8';
      if (type === 'p') subColor = '#818cf8';
      else if (type === 'd') subColor = '#ec4899';
      else if (type === 'f') subColor = '#a855f7';

      for (let p = 0; p < totalPoints; p++) {
        const mIdx = Math.floor(Math.random() * (type === 's' ? 1 : type === 'p' ? 3 : type === 'd' ? 5 : 7));
        const pos = sampleOrbitalPosition(type, n, mIdx, 1.15);
        pts.push({
          pos,
          color: subColor,
          size: Math.random() * 0.04 + 0.02
        });
      }
    }
    return pts;
  }, [configs, highQuality]);

  const groupRef = useRef<THREE.Group>(null!);
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
      groupRef.current.rotation.x += delta * 0.06;
    }
  });

  const waveElectrons = useMemo(() => {
    return configs.flatMap((conf) => {
      return Array.from({ length: conf.count }).map((_, eIdx) => ({
        type: conf.type,
        n: conf.n,
        subIdx: eIdx,
        speed: 1.2 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2
      }));
    });
  }, [configs]);

  const waveMeshRefs = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    waveElectrons.forEach((we, i) => {
      const m = waveMeshRefs.current[i];
      if (m) {
        const pos = sampleOrbitalPosition(we.type, we.n, we.subIdx, 1.15);
        const factor = Math.sin(t * we.speed + we.phase);
        m.position.x = pos[0] + Math.sin(t * 2 + i) * 0.08;
        m.position.y = pos[1] + Math.cos(t * 2 + i) * 0.08;
        m.position.z = pos[2] + factor * 0.08;
      }
    });
  });

  return (
    <group ref={groupRef}>
      <Nucleus protons={protons} neutrons={neutrons} />
      {cloudPoints.length > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={cloudPoints.length}
              array={new Float32Array(cloudPoints.flatMap(p => p.pos))}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={highQuality ? 0.05 : 0.065}
            color="#38bdf8"
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
      {waveElectrons.map((we, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) waveMeshRefs.current[i] = el; }}
        >
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={we.type === 's' ? '#38bdf8' : we.type === 'p' ? '#818cf8' : we.type === 'd' ? '#ec4899' : '#a855f7'}
            emissiveIntensity={1.2}
          />
        </mesh>
      ))}
    </group>
  );
}

// 3. Rutherford Nuclear Model (Random 3D orbital planes around small dense center)
function RutherfordElectron({
  radius,
  speed,
  rotation,
  offset,
  highQuality
}: {
  radius: number;
  speed: number;
  rotation: [number, number, number];
  offset: number;
  highQuality: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    if (meshRef.current) {
      meshRef.current.position.x = Math.cos(t) * radius;
      meshRef.current.position.y = Math.sin(t) * radius;
      meshRef.current.position.z = 0;
    }
  });

  return (
    <group rotation={rotation}>
      <mesh>
        <ringGeometry args={[radius - 0.01, radius + 0.01, highQuality ? 96 : 48]} />
        <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.18} />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshStandardMaterial color="#67e8f9" emissive="#38bdf8" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

function RutherfordModel3D({ protons, neutrons, electrons, highQuality }: { protons: number; neutrons: number; electrons: number; highQuality: boolean }) {
  const electronData = useMemo(() => {
    const arr = [];
    const baseRadius = Math.max(1.5, Math.cbrt(protons + neutrons) * 0.18 + 1.2);
    for (let i = 0; i < electrons; i++) {
      const radius = baseRadius + (i % 6) * 0.35 + (Math.random() * 0.3);
      const speed = 1.8 + (Math.random() * 0.8);
      const euler: [number, number, number] = [
        (i * 1.1) % (Math.PI * 2),
        (i * 0.7) % (Math.PI * 2),
        (i * 1.5) % (Math.PI * 2)
      ];
      arr.push({ radius, speed, euler, offset: (i / Math.max(1, electrons)) * Math.PI * 2 });
    }
    return arr;
  }, [electrons, protons, neutrons]);

  return (
    <group>
      <Nucleus protons={protons} neutrons={neutrons} />
      {electronData.map((e, i) => (
        <RutherfordElectron
          key={i}
          radius={e.radius}
          speed={e.speed}
          rotation={e.euler}
          offset={e.offset}
          highQuality={highQuality}
        />
      ))}
    </group>
  );
}

// 4. Thomson Plum Pudding Model (Positive sphere with embedded electrons)
function ThomsonModel3D({ protons, electrons, highQuality }: { protons: number; electrons: number; highQuality: boolean }) {
  const sphereRadius = Math.max(1.8, Math.cbrt(protons + electrons + 1) * 0.65);

  const electronPositions = useMemo(() => {
    const arr: { basePos: [number, number, number]; freq: number; phase: number }[] = [];
    const count = electrons;
    const innerRadius = sphereRadius * 0.82;
    for (let i = 0; i < count; i++) {
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(Math.random()) * innerRadius;
      arr.push({
        basePos: [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)],
        freq: 2.5 + Math.random() * 3.0,
        phase: Math.random() * Math.PI * 2
      });
    }
    return arr;
  }, [electrons, sphereRadius]);

  const electronRefs = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    electronPositions.forEach((e, i) => {
      const m = electronRefs.current[i];
      if (m) {
        const vib = Math.sin(t * e.freq + e.phase) * 0.06;
        m.position.x = e.basePos[0] + vib;
        m.position.y = e.basePos[1] + Math.cos(t * e.freq + e.phase) * 0.06;
        m.position.z = e.basePos[2] + vib * 0.5;
      }
    });
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[sphereRadius, highQuality ? 48 : 32, highQuality ? 48 : 32]} />
        <meshStandardMaterial
          color="#ff4444"
          transparent
          opacity={0.32}
          roughness={0.2}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[sphereRadius * 1.05, 32, 32]} />
        <meshBasicMaterial color="#ff2222" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      {electronPositions.map((e, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) electronRefs.current[i] = el; }}
          position={e.basePos}
        >
          <sphereGeometry args={[0.085, 16, 16]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

// 5. Dalton Solid Sphere Model (Indivisible hard sphere scaled by atomic weight)
function DaltonModel3D({ protons, neutrons, highQuality }: { protons: number; neutrons: number; highQuality: boolean }) {
  const mass = protons + neutrons;
  const radius = Math.max(1.3, Math.cbrt(mass > 0 ? mass : 1) * 0.52);

  const hue = (protons * 22) % 360;
  const color = protons > 0 ? `hsl(${hue}, 70%, 55%)` : '#94a3b8';

  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.x += delta * 0.15;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, highQuality ? 64 : 32, highQuality ? 64 : 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.15}
          metalness={0.7}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 1.05, radius * 1.08, 64]} />
        <meshBasicMaterial color="#cbd5e1" side={THREE.DoubleSide} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

// 6. Democritus Ancient Atomos Model (Geometric faceted polyhedra)
function DemocritusModel3D({ protons, highQuality }: { protons: number; highQuality: boolean }) {
  const meshRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      meshRef.current.rotation.x += delta * 0.25;
      meshRef.current.rotation.z += delta * 0.15;
    }
  });

  const polyType = protons % 4;

  return (
    <group ref={meshRef}>
      <mesh>
        {polyType === 0 && <icosahedronGeometry args={[1.5, highQuality ? 1 : 0]} />}
        {polyType === 1 && <octahedronGeometry args={[1.6, highQuality ? 1 : 0]} />}
        {polyType === 2 && <dodecahedronGeometry args={[1.4, highQuality ? 1 : 0]} />}
        {polyType === 3 && <tetrahedronGeometry args={[1.7, highQuality ? 1 : 0]} />}
        <meshStandardMaterial
          color="#d8b4fe"
          roughness={0.25}
          metalness={0.5}
          wireframe={false}
          flatShading
        />
      </mesh>
      <mesh>
        {polyType === 0 && <icosahedronGeometry args={[1.52, 0]} />}
        {polyType === 1 && <octahedronGeometry args={[1.62, 0]} />}
        {polyType === 2 && <dodecahedronGeometry args={[1.42, 0]} />}
        {polyType === 3 && <tetrahedronGeometry args={[1.72, 0]} />}
        <meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function Atom3DHistorical({
  model,
  protons,
  neutrons,
  electrons,
  isBlackHole,
  highQuality
}: {
  model: ModelType;
  protons: number;
  neutrons: number;
  electrons: number;
  isBlackHole: boolean;
  highQuality: boolean;
}) {
  if (isBlackHole) {
    return (
      <group>
        <mesh>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial color="black" />
        </mesh>
        <mesh>
          <ringGeometry args={[2.2, 3, 64]} />
          <meshBasicMaterial color="#a855f7" side={THREE.DoubleSide} transparent opacity={0.5} />
        </mesh>
      </group>
    );
  }

  switch (model) {
    case 'bohr':
      return <BohrModel3D protons={protons} neutrons={neutrons} electrons={electrons} highQuality={highQuality} />;
    case 'schrodinger':
      return <SchrodingerModel3D protons={protons} neutrons={neutrons} electrons={electrons} highQuality={highQuality} />;
    case 'rutherford':
      return <RutherfordModel3D protons={protons} neutrons={neutrons} electrons={electrons} highQuality={highQuality} />;
    case 'thomson':
      return <ThomsonModel3D protons={protons} electrons={electrons} highQuality={highQuality} />;
    case 'dalton':
      return <DaltonModel3D protons={protons} neutrons={neutrons} highQuality={highQuality} />;
    case 'democritus':
      return <DemocritusModel3D protons={protons} highQuality={highQuality} />;
    default:
      return <BohrModel3D protons={protons} neutrons={neutrons} electrons={electrons} highQuality={highQuality} />;
  }
}

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────

function ParticleRow({ label, color, onAdd, onRemove, dark }: { label: string; color: string; onAdd: (n:number)=>void; onRemove: (n:number)=>void; dark: boolean; }) {
  const addCls = dark ? "bg-blue-900 hover:bg-blue-700 border border-blue-700" : "bg-blue-600 hover:bg-blue-500";
  const remCls = dark ? "bg-red-950 hover:bg-red-800 border border-red-800" : "bg-red-600 hover:bg-red-500";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className={`text-xs tracking-widest uppercase font-semibold ${dark ? "text-slate-300" : "text-slate-600"}`}>{label}</span>
      </div>
      <div className="flex gap-1">
        {[1,10,50].map(n => <button key={n} onClick={() => onAdd(n)} className={`flex-1 text-xs py-1.5 rounded font-bold text-white transition-colors ${addCls}`}>+{n}</button>)}
      </div>
      <div className="flex gap-1">
        {[1,10,50].map(n => <button key={n} onClick={() => onRemove(n)} className={`flex-1 text-xs py-1.5 rounded font-bold text-white transition-colors ${remCls}`}>-{n}</button>)}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <><span className="opacity-60">{label}</span><span className="font-semibold text-right">{value}</span></>;
}

function Section({ title, children, divider, textMain, textMuted }: { title: string; children: React.ReactNode; divider: string; textMain: string; textMuted: string }) {
  return (
    <div className={`border-t ${divider} pt-3 space-y-1`}>
      <p className={`font-bold uppercase tracking-wide opacity-50 ${textMain}`}>{title}</p>
      <div className={textMuted}>{children}</div>
    </div>
  );
}

function BohrShellBadges({ electrons }: { electrons: number }) {
  const shells = getBohrShellDistribution(electrons);
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-1.5">
        {shells.map((s) => (
          <div key={s.shellIndex} className="bg-slate-800/80 border border-slate-700/60 px-2 py-1 rounded text-[11px] flex justify-between items-center">
            <span className="text-cyan-400 font-bold">{s.name.split(' ')[0]} Shell:</span>
            <span className="font-bold text-white">{s.count} <span className="text-slate-400 font-normal">/ {s.max}</span></span>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-400 italic">Follows 2n² Bohr-Bury quantized maximum capacity rule.</div>
    </div>
  );
}

function QuantumOrbitalBadges({ electrons }: { electrons: number }) {
  const configs = getFullElectronConfiguration(electrons);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {configs.map((orb) => {
          let col = "bg-blue-700";
          if (orb.type === "p") col = "bg-indigo-700";
          else if (orb.type === "d") col = "bg-pink-700";
          else if (orb.type === "f") col = "bg-purple-800";
          return (
            <span key={orb.label} className={`px-1.5 py-0.5 rounded text-white text-[11px] font-mono font-bold ${col}`}>
              {orb.label}<sup>{orb.count}</sup>
            </span>
          );
        })}
        {configs.length === 0 && <span className="text-slate-500 text-xs italic">No electrons</span>}
      </div>
      <div className="text-[10px] text-slate-400 italic">Aufbau principle & Hund's rule: 1s → 2s → 2p → 3s → 3p → 4s → 3d...</div>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────

export default function App() {
  const [model, setModel] = useState<ModelType>("bohr");
  const [protons, setProtons] = useState(0);
  const [neutrons, setNeutrons] = useState(0);
  const [electrons, setElectrons] = useState(0);
  
  const [dark, setDark] = useState(true);
  const [highQuality, setHighQuality] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);
  const [infoOpen, setInfoOpen] = useState(true);
  const [decayMsg, setDecayMsg] = useState<string|null>(null);
  const [isDecaying, setIsDecaying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const decayTimerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const activeDecayTimerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const protonsRef = useRef(protons);
  const neutronsRef = useRef(neutrons);
  const electronsRef = useRef(electrons);
  protonsRef.current = protons;
  neutronsRef.current = neutrons;
  electronsRef.current = electrons;

  const isBlackHole = Math.abs(neutrons - protons) >= 150;
  const isStable = protons >= 1 && electrons >= 1 && Math.abs(protons - neutrons) <= 2 && Math.abs(protons - electrons) <= 5;
  const atomName = isBlackHole ? "BLACK HOLE" : (ELEMENTS[String(protons)]?.name || (protons > 0 ? `Element Z=${protons}` : "Atom Visualizer"));

  const triggerActiveDecay = (species: "Proton" | "Neutron" | "Electron") => {
    setIsDecaying(true);
    if (activeDecayTimerRef.current) clearInterval(activeDecayTimerRef.current);

    activeDecayTimerRef.current = setInterval(() => {
      const p = protonsRef.current;
      const n = neutronsRef.current;
      const e = electronsRef.current;

      if (species === "Proton") {
        if (p - n <= 2 || p <= 0) {
          clearInterval(activeDecayTimerRef.current!);
          activeDecayTimerRef.current = null;
          setIsDecaying(false);
          setDecayMsg(null);
          return;
        }
        setProtons(curr => Math.max(0, curr - 1));
      } else if (species === "Neutron") {
        if (n - p <= 2 || n <= 0) {
          clearInterval(activeDecayTimerRef.current!);
          activeDecayTimerRef.current = null;
          setIsDecaying(false);
          setDecayMsg(null);
          return;
        }
        setNeutrons(curr => Math.max(0, curr - 1));
      } else if (species === "Electron") {
        if (e - p <= 2 || e <= 0) {
          clearInterval(activeDecayTimerRef.current!);
          activeDecayTimerRef.current = null;
          setIsDecaying(false);
          setDecayMsg(null);
          return;
        }
        setElectrons(curr => Math.max(0, curr - 1));
      }
    }, 60);
  };

  useEffect(() => {
    if (isBlackHole) {
      if (decayTimerRef.current) clearInterval(decayTimerRef.current);
      if (activeDecayTimerRef.current) clearInterval(activeDecayTimerRef.current);
      setDecayMsg(null);
      setIsDecaying(false);
      return;
    }

    const isProtonImbalance = protons - neutrons > 10;
    const isNeutronImbalance = neutrons - protons > 10;
    const isElectronImbalance = electrons - protons > 10;

    const hasImbalance = isProtonImbalance || isNeutronImbalance || isElectronImbalance;

    if (!hasImbalance) {
      if (!isDecaying) {
        if (decayTimerRef.current) clearInterval(decayTimerRef.current);
        setDecayMsg(null);
      }
      return;
    }

    if (decayMsg || isDecaying) return;

    const species: "Proton" | "Neutron" | "Electron" = isProtonImbalance ? "Proton" : isNeutronImbalance ? "Neutron" : "Electron";
    setDecayMsg(`${species} decay`);
    setCountdown(5);

    if (decayTimerRef.current) clearInterval(decayTimerRef.current);
    decayTimerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(decayTimerRef.current!);
          decayTimerRef.current = null;
          triggerActiveDecay(species);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, [protons, neutrons, electrons, isBlackHole, decayMsg, isDecaying]);

  const handleReset = () => {
    if (decayTimerRef.current) clearInterval(decayTimerRef.current);
    if (activeDecayTimerRef.current) clearInterval(activeDecayTimerRef.current);
    setProtons(0);
    setNeutrons(0);
    setElectrons(0);
    setDecayMsg(null);
    setIsDecaying(false);
    setCountdown(0);
  };

  const localInfo = protons > 0 ? getLocalInfo(protons, neutrons) : null;
  const elem = localInfo?.elem;
  const iso = localInfo?.iso;
  const currentModelInfo = ATOMIC_MODELS[model];

  const bg = dark ? "bg-[#080c12]" : "bg-slate-100";
  const panelBg = dark ? "bg-[#0e1520] border-slate-800" : "bg-white border-slate-200";
  const textMain = dark ? "text-slate-100" : "text-slate-800";
  const textMuted = dark ? "text-slate-400" : "text-slate-500";
  const divider = dark ? "border-slate-800" : "border-slate-200";
  const stabColor = isBlackHole ? "text-purple-400" : isStable ? "text-emerald-400" : "text-amber-400";

  // Reusable Model Selector Pill Bar
  const modelSelectorBar = (
    <div className={`p-2.5 border-b ${divider} bg-slate-900/40`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Historical Model:</span>
        <span className="text-[11px] text-slate-400 font-mono">{currentModelInfo.year}</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {(Object.keys(ATOMIC_MODELS) as ModelType[]).map((mKey) => {
          const m = ATOMIC_MODELS[mKey];
          const active = model === mKey;
          return (
            <button
              key={mKey}
              onClick={() => setModel(mKey)}
              className={`px-1.5 py-1.5 rounded text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center leading-tight ${
                active
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400"
                  : dark
                  ? "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300 hover:text-slate-900"
              }`}
            >
              <span className="capitalize">{m.scientist.split(" ")[m.scientist.split(" ").length - 1]}</span>
              <span className="text-[9px] opacity-70">{m.year}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Reusable Controls Content
  const controlsContent = (
    <div className="p-3 space-y-3">
      {modelSelectorBar}

      <p className={`text-xs uppercase tracking-widest font-bold ${textMuted}`}>Particle Controls</p>
      <ParticleRow label="Protons" color="#ff3333" dark={dark} onAdd={n => setProtons(p => !isBlackHole ? p + n : p)} onRemove={n => setProtons(p => Math.max(0, p - n))} />
      <ParticleRow label="Electrons" color="#38bdf8" dark={dark} onAdd={n => setElectrons(e => !isBlackHole ? e + n : e)} onRemove={n => setElectrons(e => Math.max(0, e - n))} />
      <ParticleRow label="Neutrons" color="#ffcc00" dark={dark} onAdd={n => setNeutrons(nn => !isBlackHole ? nn + n : nn)} onRemove={n => setNeutrons(nn => Math.max(0, nn - n))} />
      
      <div className={`pt-2 border-t ${divider} text-xs space-y-0.5 ${textMuted}`}>
        <div className="flex justify-between md:block"><span>Protons:</span> <span className="text-red-400 font-bold">{protons}</span></div>
        <div className="flex justify-between md:block"><span>Neutrons:</span> <span className="text-yellow-400 font-bold">{neutrons}</span></div>
        <div className="flex justify-between md:block"><span>Electrons:</span> <span className="text-blue-400 font-bold">{electrons}</span></div>
        {(protons + neutrons) > 0 && <div className="flex justify-between md:block"><span>Mass #:</span> <span className={`font-bold ${textMain}`}>{protons + neutrons}</span></div>}
      </div>

      <button onClick={handleReset} className="w-full py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-sm">
        Reset Particles
      </button>

      {/* Model-specific educational guide note */}
      <div className={`pt-2 border-t ${divider} text-[11px] ${textMuted} space-y-1 hidden md:block`}>
        <div className="font-semibold text-cyan-400">{currentModelInfo.name}</div>
        <p className="leading-snug">{currentModelInfo.tagline}</p>
      </div>
    </div>
  );

  // Reusable Info Content
  const infoContent = (
    <div className="p-4 space-y-3 text-xs">
      {/* Model Overview Banner */}
      <div className={`p-2.5 rounded-lg border ${dark ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"} space-y-1`}>
        <div className="flex justify-between items-baseline">
          <span className="font-bold text-cyan-400 text-xs">{currentModelInfo.scientist}</span>
          <span className="text-[10px] text-slate-400 font-mono">({currentModelInfo.year})</span>
        </div>
        <div className={`font-bold ${textMain} text-sm`}>{currentModelInfo.name}</div>
        <p className={`text-[11px] leading-relaxed ${textMuted}`}>{currentModelInfo.description}</p>
      </div>

      <p className={`uppercase tracking-widest font-bold ${textMuted}`}>Element Info</p>
      {!elem ? (
        <p className={textMuted}>Add protons to identify an element.</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-black ${dark ? "text-slate-600" : "text-slate-200"}`}>{elem.symbol}</span>
            <div>
              <div className={`text-lg font-black ${textMain}`}>{elem.name}</div>
              <div className={`${stabColor} font-semibold`}>{isBlackHole ? "Singularity" : isStable ? "● Stable" : "● Unstable"}</div>
            </div>
          </div>
          <div className={`grid grid-cols-2 gap-x-2 gap-y-0.5 ${textMuted} border-t ${divider} pt-3`}>
            <InfoRow label="Atomic #" value={String(protons)} />
            <InfoRow label="Mass #" value={String(protons + neutrons)} />
            <InfoRow label="Protons" value={String(protons)} />
            <InfoRow label="Neutrons" value={String(neutrons)} />
            <InfoRow label="Electrons" value={String(electrons)} />
          </div>

          {/* Model-specific configuration views */}
          {model === 'bohr' && (
            <Section title="Bohr Energy Shells (KLMN)" divider={divider} textMain={textMain} textMuted={textMuted}>
              <BohrShellBadges electrons={electrons} />
            </Section>
          )}

          {model === 'schrodinger' && (
            <Section title="Quantum Orbitals (Aufbau)" divider={divider} textMain={textMain} textMuted={textMuted}>
              <QuantumOrbitalBadges electrons={electrons} />
            </Section>
          )}

          {iso && (
            <Section title="Isotope" divider={divider} textMain={textMain} textMuted={textMuted}>
              <p className="font-semibold">{iso.name}</p>
              {iso.info && <p>{iso.info}</p>}
              {iso.uses && <p><span className="opacity-60">Uses: </span>{iso.uses}</p>}
              {iso.natural_occurrence && <p><span className="opacity-60">Occurrence: </span>{iso.natural_occurrence}</p>}
            </Section>
          )}
          {elem.description && <Section title="Description" divider={divider} textMain={textMain} textMuted={textMuted}><p>{elem.description}</p></Section>}
          {elem.uses && <Section title="Uses" divider={divider} textMain={textMain} textMuted={textMuted}><p>{elem.uses}</p></Section>}
          {elem.natural_occurrence && <Section title="Natural Occurrence" divider={divider} textMain={textMain} textMuted={textMuted}><p>{elem.natural_occurrence}</p></Section>}
          {elem.history && <Section title="History" divider={divider} textMain={textMain} textMuted={textMuted}><p>{elem.history}</p></Section>}
        </>
      )}
    </div>
  );

  return (
    <div className={`w-full h-full flex flex-col ${bg} transition-colors duration-300 md:overflow-hidden overflow-y-auto`}>
      {/* Top Header Bar */}
      <div className={`flex items-center px-3 py-2 border-b ${divider} ${dark ? "bg-[#0a1018]" : "bg-white"} gap-2 shrink-0 z-10 sticky top-0 md:relative`}>
        <button onClick={() => setSideOpen(v => !v)} className={`hidden md:block p-1.5 rounded text-base ${dark ? "hover:bg-slate-800" : "hover:bg-slate-100"} ${textMain}`} title="Toggle Controls">☰</button>
        <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 min-w-0">
          {elem && <span className={`text-xl sm:text-2xl font-black ${dark ? "text-slate-500" : "text-slate-300"}`}>{elem.symbol}</span>}
          <span className={`font-bold tracking-wide text-sm sm:text-base truncate ${textMain} ${isBlackHole ? "text-purple-400 animate-pulse" : ""}`}>{atomName}</span>
          
          <div className="hidden sm:flex items-center gap-1.5 bg-blue-950/60 border border-blue-800/80 px-2 py-0.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[11px] font-semibold text-cyan-300">{currentModelInfo.name}</span>
          </div>

          {protons > 0 && <span className={`text-[11px] sm:text-xs font-semibold shrink-0 ${stabColor}`}>● {isStable ? "Stable" : "Unstable"}</span>}
          <button onClick={() => setHighQuality(v => !v)} className={`ml-1 sm:ml-2 px-2 py-1 rounded text-xs shrink-0 ${dark ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-300 hover:bg-slate-200"} ${textMain}`} title="Toggle high‑quality rendering">
            {highQuality ? "HQ" : "LQ"}
          </button>
        </div>
        <button onClick={() => setInfoOpen(v => !v)} className={`hidden md:block p-1.5 rounded text-base ${dark ? "hover:bg-slate-800" : "hover:bg-slate-100"} ${textMain}`} title="Toggle Element Info">ℹ</button>
        <button onClick={() => setDark(v => !v)} className={`p-1.5 rounded text-base ${dark ? "hover:bg-slate-800" : "hover:bg-slate-100"} ${textMain}`}>{dark ? "☀" : "☾"}</button>
      </div>

      {/* Decay Alert Message */}
      <AnimatePresence>
        {decayMsg && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="shrink-0 overflow-hidden z-10 relative">
            <div className={`text-xs text-center py-1.5 px-2 font-medium transition-colors ${
              isDecaying 
                ? "bg-red-900/90 text-red-100 animate-pulse font-bold" 
                : "bg-amber-900/80 text-amber-200"
            }`}>
              {isDecaying 
                ? `⚡ Actively shedding excess particles (${decayMsg.toLowerCase()})...` 
                : `⚠ ${decayMsg} in ${countdown}s — particle imbalance detected`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MOBILE VERTICAL LAYOUT (md:hidden) ─── */}
      <div className="flex flex-col md:hidden w-full pb-8">
        <div className={`w-full border-b ${divider} ${panelBg}`}>
          {controlsContent}
        </div>

        <div className="w-full h-[360px] relative bg-black shrink-0 border-b border-slate-800">
          <Canvas camera={{ position: [0, 0, 8], fov: 55 }} gl={{ antialias: true }} dpr={highQuality ? [1, 2] : [1, 1.5]}>
            <color attach="background" args={[dark ? '#080c12' : '#f8fafc']} />
            {dark && <Stars radius={100} depth={50} count={highQuality ? 1500 : 800} factor={4} saturation={0} fade speed={1} />}
            <ambientLight intensity={Math.PI / 2} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
            <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
            <Atom3DHistorical model={model} protons={protons} neutrons={neutrons} electrons={Math.min(electrons, 200)} isBlackHole={isBlackHole} highQuality={highQuality} />
            <OrbitControls makeDefault minDistance={2} maxDistance={30} />
          </Canvas>

          {isBlackHole && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center px-4">
                <div className="text-purple-400 text-2xl font-black tracking-widest animate-pulse">BLACK HOLE</div>
                <div className="text-purple-600 text-xs mt-1">Extreme particle imbalance — reset to continue</div>
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 pointer-events-none select-none z-10 bg-black/40 px-2 py-0.5 rounded whitespace-nowrap">drag to rotate · pinch to zoom</div>
        </div>

        <div className={`w-full ${panelBg}`}>
          {infoContent}
        </div>
      </div>

      {/* ─── DESKTOP / LAPTOP LAYOUT (hidden md:flex) ─── */}
      <div className="hidden md:flex flex-1 overflow-hidden relative">
        <AnimatePresence initial={false}>
          {sideOpen && (
            <motion.aside initial={{width:0,opacity:0}} animate={{width:230,opacity:1}} exit={{width:0,opacity:0}} transition={{duration:0.22,ease:"easeInOut"}} className={`overflow-hidden shrink-0 border-r ${panelBg} flex flex-col z-10 relative`}>
              <div className="overflow-y-auto flex-1">
                {controlsContent}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <div className="flex-1 relative overflow-hidden bg-black">
          <Canvas camera={{ position: [0, 0, 8], fov: 55 }} gl={{ antialias: true }} dpr={highQuality ? [1, 2.5] : [1, 1.5]}>
            <color attach="background" args={[dark ? '#080c12' : '#f8fafc']} />
            {dark && <Stars radius={100} depth={50} count={highQuality ? 1500 : 800} factor={4} saturation={0} fade speed={1} />}
            <ambientLight intensity={Math.PI / 2} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
            <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
            <Atom3DHistorical model={model} protons={protons} neutrons={neutrons} electrons={Math.min(electrons, 200)} isBlackHole={isBlackHole} highQuality={highQuality} />
            <OrbitControls makeDefault minDistance={2} maxDistance={30} />
          </Canvas>

          {isBlackHole && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center">
                <div className="text-purple-400 text-3xl font-black tracking-widest animate-pulse">BLACK HOLE</div>
                <div className="text-purple-600 text-xs mt-1">Extreme particle imbalance — reset to continue</div>
              </div>
            </div>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-slate-500 pointer-events-none select-none z-10 bg-black/40 px-2 py-1 rounded flex items-center gap-2">
            <span>drag to rotate · scroll to zoom</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400/80 font-mono font-semibold">{currentModelInfo.name}</span>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {infoOpen && (
            <motion.aside initial={{width:0,opacity:0}} animate={{width:275,opacity:1}} exit={{width:0,opacity:0}} transition={{duration:0.22,ease:"easeInOut"}} className={`overflow-hidden shrink-0 border-l ${panelBg} flex flex-col z-10 relative`}>
              <div className="overflow-y-auto flex-1">
                {infoContent}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

