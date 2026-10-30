import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";
import { Search, X } from "lucide-react";
import elementData from "../imports/elements.json";
import {
  ModelType,
  ATOMIC_MODELS,
  BohrShellDistributionItem,
  getBohrShellDistribution,
  getFullElectronConfiguration,
  sampleOrbitalPosition,
  ORBITAL_COLORS,
  ORBITAL_RGB,
  SubshellConfig
} from "./components/historicalModels";
import { getStandardNeutrons } from "./components/atomPhysics";

type ElementDB = Record<string, {
  name: string; symbol: string; description?: string;
  uses?: string; natural_occurrence?: string; history?: string;
  isotopes?: Record<string, { name?: string; info?: string; uses?: string; natural_occurrence?: string }>;
}>;

const ELEMENTS = elementData as ElementDB;

const ALL_ELEMENTS = Object.keys(ELEMENTS)
  .map(k => Number(k))
  .filter(z => !isNaN(z) && z >= 1 && z <= 118)
  .sort((a, b) => a - b)
  .map(z => ({
    z,
    name: ELEMENTS[String(z)]?.name ?? `Element ${z}`,
    symbol: ELEMENTS[String(z)]?.symbol ?? `E${z}`
  }));

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

// ─── 1. BOHR QUANTIZED PLANETARY MODEL (CONCENTRIC KLMN SHELLS) ─────────────────

function BohrShellElectrons({
  radius,
  count,
  shellIndex,
  color,
  highQuality
}: {
  radius: number;
  count: number;
  shellIndex: number;
  color: string;
  highQuality: boolean;
}) {
  const meshRefs = useRef<THREE.Mesh[]>([]);
  // Quantized orbital speed: inner shells orbit faster than outer shells (ω ∝ 1 / n^0.85)
  const speed = 1.6 / Math.pow(shellIndex + 1, 0.85);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    for (let k = 0; k < count; k++) {
      const m = meshRefs.current[k];
      if (m) {
        const angle = (k / count) * Math.PI * 2 + t;
        m.position.x = Math.cos(angle) * radius;
        m.position.y = Math.sin(angle) * radius;
        m.position.z = 0;
      }
    }
  });

  return (
    <group>
      {Array.from({ length: count }).map((_, k) => (
        <mesh
          key={k}
          ref={(el) => { if (el) meshRefs.current[k] = el; }}
        >
          <sphereGeometry args={[0.08, highQuality ? 24 : 16, highQuality ? 24 : 16]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={color}
            emissiveIntensity={1.3}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function BohrModel3D({
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
  const shells = useMemo(() => getBohrShellDistribution(electrons), [electrons]);

  return (
    <group>
      <Nucleus protons={protons} neutrons={neutrons} />

      {shells.map((shell) => {
        const isOccupied = shell.count > 0;
        return (
          <group key={shell.shellIndex}>
            {/* Concentric circular orbit ring */}
            <mesh>
              <ringGeometry
                args={[
                  shell.radius - 0.018,
                  shell.radius + 0.018,
                  highQuality ? 128 : 64
                ]}
              />
              <meshBasicMaterial
                color={shell.color}
                side={THREE.DoubleSide}
                transparent
                opacity={isOccupied ? 0.52 : 0.16}
              />
            </mesh>

            {/* Subtle glowing halo on orbit line */}
            <mesh>
              <ringGeometry
                args={[
                  shell.radius - 0.05,
                  shell.radius + 0.05,
                  highQuality ? 96 : 48
                ]}
              />
              <meshBasicMaterial
                color={shell.color}
                side={THREE.DoubleSide}
                transparent
                opacity={isOccupied ? 0.14 : 0.03}
              />
            </mesh>

            {/* Floating 3D Shell Label Badge */}
            <Html
              position={[
                shell.radius * 0.707,
                shell.radius * 0.707,
                0
              ]}
              center
              distanceFactor={15}
            >
              <div
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap pointer-events-none select-none transition-all ${
                  isOccupied
                    ? "bg-slate-900/90 border border-cyan-400/60 text-cyan-300 shadow-md shadow-cyan-950/50"
                    : "bg-slate-900/60 border border-slate-700/40 text-slate-500"
                }`}
              >
                {shell.letter} Shell (n={shell.n}) · {shell.count}/{shell.max}
              </div>
            </Html>

            {/* Orbiting electrons on this quantized shell ring */}
            {isOccupied && (
              <BohrShellElectrons
                radius={shell.radius}
                count={shell.count}
                shellIndex={shell.shellIndex}
                color={shell.color}
                highQuality={highQuality}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

// ─── 2. SCHRÖDINGER QUANTUM MECHANICAL MODEL (s, p, d, f SUBSHELLS) ─────────

// s-Orbital: Translucent Spherical Cloud Boundary
function SOrbitalGeometry({ n, count, highQuality }: { n: number; count: number; highQuality: boolean }) {
  const r = 0.95 + (n - 1) * 0.85;
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Gentle breathing wave pulsation
      const s = 1 + Math.sin(clock.getElapsedTime() * 1.5 + n) * 0.02;
      groupRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[r, highQuality ? 48 : 32, highQuality ? 48 : 32]} />
        <meshStandardMaterial
          color="#38bdf8"
          transparent
          opacity={count === 2 ? 0.16 : 0.11}
          roughness={0.2}
          metalness={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Equator guide contour */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - 0.012, r + 0.012, highQuality ? 96 : 48]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// p-Orbital: Dumbbell Lobes along X (px), Y (py), or Z (pz)
function PDumbbellOrbital({
  axis,
  n,
  count,
  highQuality
}: {
  axis: 'x' | 'y' | 'z';
  n: number;
  count: number;
  highQuality: boolean;
}) {
  const dist = 0.85 + (n - 2) * 0.65;
  const rLobe = 0.42 + (n - 2) * 0.12;
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 2.0 + (axis === 'x' ? 0 : axis === 'y' ? 1.5 : 3.0)) * 0.025;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  const rotation: [number, number, number] =
    axis === 'x' ? [0, Math.PI / 2, 0] :
    axis === 'y' ? [Math.PI / 2, 0, 0] :
    [0, 0, 0];

  return (
    <group ref={groupRef} rotation={rotation}>
      {/* Positive Lobe */}
      <mesh position={[0, 0, dist]} scale={[rLobe * 0.85, rLobe * 0.85, rLobe * 1.5]}>
        <sphereGeometry args={[1, highQuality ? 32 : 20, highQuality ? 32 : 20]} />
        <meshStandardMaterial
          color="#818cf8"
          emissive="#4f46e5"
          emissiveIntensity={0.2}
          transparent
          opacity={count === 2 ? 0.25 : 0.18}
          roughness={0.25}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Negative Lobe */}
      <mesh position={[0, 0, -dist]} scale={[rLobe * 0.85, rLobe * 0.85, rLobe * 1.5]}>
        <sphereGeometry args={[1, highQuality ? 32 : 20, highQuality ? 32 : 20]} />
        <meshStandardMaterial
          color="#818cf8"
          emissive="#4f46e5"
          emissiveIntensity={0.2}
          transparent
          opacity={count === 2 ? 0.25 : 0.18}
          roughness={0.25}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// d-Orbital: 4-Leaf Cloverleaf Lobe Cluster
function DCloverOrbital({
  subType,
  n,
  count,
  highQuality
}: {
  subType: number; // 0..4
  n: number;
  count: number;
  highQuality: boolean;
}) {
  const dist = 1.1 + (n - 3) * 0.7;
  const rLobe = 0.38 + (n - 3) * 0.1;
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 2.2 + subType) * 0.025;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  if (subType === 4) {
    // dz²: Dumbbell along Z axis + toroidal ring in XY plane
    return (
      <group ref={groupRef}>
        <mesh position={[0, 0, dist]} scale={[rLobe * 0.8, rLobe * 0.8, rLobe * 1.4]}>
          <sphereGeometry args={[1, highQuality ? 24 : 16, highQuality ? 24 : 16]} />
          <meshStandardMaterial color="#ec4899" emissive="#be185d" emissiveIntensity={0.25} transparent opacity={0.26} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0, -dist]} scale={[rLobe * 0.8, rLobe * 0.8, rLobe * 1.4]}>
          <sphereGeometry args={[1, highQuality ? 24 : 16, highQuality ? 24 : 16]} />
          <meshStandardMaterial color="#ec4899" emissive="#be185d" emissiveIntensity={0.25} transparent opacity={0.26} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {/* Torus ring in XY plane */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[dist * 0.6, rLobe * 0.45, 16, 32]} />
          <meshStandardMaterial color="#ec4899" emissive="#be185d" emissiveIntensity={0.2} transparent opacity={0.24} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  // 4 lobes in a plane
  const angles = subType === 3
    ? [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
    : [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

  return (
    <group ref={groupRef}>
      {angles.map((ang, i) => {
        let pos: [number, number, number] = [dist * Math.cos(ang), dist * Math.sin(ang), 0];
        if (subType === 1) pos = [0, dist * Math.cos(ang), dist * Math.sin(ang)];
        else if (subType === 2) pos = [dist * Math.cos(ang), 0, dist * Math.sin(ang)];

        return (
          <mesh key={i} position={pos} scale={[rLobe, rLobe, rLobe * 1.2]}>
            <sphereGeometry args={[1, highQuality ? 24 : 16, highQuality ? 24 : 16]} />
            <meshStandardMaterial
              color="#ec4899"
              emissive="#be185d"
              emissiveIntensity={0.2}
              transparent
              opacity={count >= 2 ? 0.26 : 0.18}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Quantum Wave Particle Oscillations for each active electron
function QuantumWaveElectron({
  type,
  n,
  mIndex,
  color
}: {
  type: 's' | 'p' | 'd' | 'f';
  n: number;
  mIndex: number;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const speed = 1.4 + (mIndex % 4) * 0.3;
  const phase = (mIndex * 1.3) % (Math.PI * 2);
  const rBase = 0.85 + n * 0.65;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * speed + phase;

    if (type === 's') {
      // Circulates smoothly along spherical shell
      const theta = t * 1.2;
      const phi = Math.sin(t * 0.8) * 1.1 + Math.PI / 2;
      meshRef.current.position.x = rBase * Math.sin(phi) * Math.cos(theta);
      meshRef.current.position.y = rBase * Math.sin(phi) * Math.sin(theta);
      meshRef.current.position.z = rBase * Math.cos(phi);
    } else if (type === 'p') {
      // Oscillates through the two lobes of the dumbbell
      const axisIdx = mIndex % 3;
      const mainDist = Math.sin(t) * rBase * 1.15;
      const lat1 = Math.cos(t * 2) * 0.18 * rBase;
      const lat2 = Math.sin(t * 2) * 0.18 * rBase;

      if (axisIdx === 0) {
        meshRef.current.position.set(mainDist, lat1, lat2);
      } else if (axisIdx === 1) {
        meshRef.current.position.set(lat1, mainDist, lat2);
      } else {
        meshRef.current.position.set(lat1, lat2, mainDist);
      }
    } else if (type === 'd') {
      // Circulates through the 4 cloverleaf lobes
      const cloverAng = t * 1.5;
      const r = rBase * 1.1 * Math.abs(Math.sin(2 * cloverAng));
      meshRef.current.position.x = r * Math.cos(cloverAng);
      meshRef.current.position.y = r * Math.sin(cloverAng);
      meshRef.current.position.z = Math.sin(t * 3) * 0.2;
    } else {
      // f orbital: complex harmonic path
      const ang = t * 1.3;
      meshRef.current.position.x = rBase * 1.2 * Math.cos(ang) * Math.sin(2 * ang);
      meshRef.current.position.y = rBase * 1.2 * Math.sin(ang) * Math.sin(2 * ang);
      meshRef.current.position.z = rBase * 1.2 * Math.cos(2 * ang);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.075, 16, 16]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive={color}
        emissiveIntensity={1.4}
        roughness={0.2}
      />
    </mesh>
  );
}

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

  // Pre-generate 3D quantum probability cloud points with TRUE VERTEX COLORS matching s, p, d, f
  const cloudData = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const ptsPerElectron = highQuality ? 140 : 70;

    for (const conf of configs) {
      const type = conf.type;
      const n = conf.n;
      const count = conf.count;
      const totalPoints = count * ptsPerElectron;
      const rgb = ORBITAL_RGB[type];

      for (let p = 0; p < totalPoints; p++) {
        const mIdx = Math.floor(
          Math.random() * (type === 's' ? 1 : type === 'p' ? 3 : type === 'd' ? 5 : 7)
        );
        const pos = sampleOrbitalPosition(type, n, mIdx, 1.15);
        positions.push(pos[0], pos[1], pos[2]);
        colors.push(rgb[0], rgb[1], rgb[2]);
      }
    }

    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      count: positions.length / 3
    };
  }, [configs, highQuality]);

  const groupRef = useRef<THREE.Group>(null!);
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
      groupRef.current.rotation.x += delta * 0.04;
    }
  });

  // Generate wave electron indices
  const waveElectrons = useMemo(() => {
    return configs.flatMap((conf) => {
      return Array.from({ length: conf.count }).map((_, eIdx) => ({
        type: conf.type,
        n: conf.n,
        mIndex: eIdx,
        color: ORBITAL_COLORS[conf.type]
      }));
    });
  }, [configs]);

  return (
    <group ref={groupRef}>
      <Nucleus protons={protons} neutrons={neutrons} />

      {/* 3D Quantum Probability Cloud Points with True Vertex Colors */}
      {cloudData.count > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={cloudData.count}
              array={cloudData.positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={cloudData.count}
              array={cloudData.colors}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={highQuality ? 0.05 : 0.065}
            vertexColors={true}
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}

      {/* Exact 3D Subshell Orbital Geometries (s Spheres, p Dumbbells, d Cloverleaves) */}
      {configs.map((conf, idx) => {
        if (conf.type === 's') {
          return <SOrbitalGeometry key={`${conf.label}-${idx}`} n={conf.n} count={conf.count} highQuality={highQuality} />;
        } else if (conf.type === 'p') {
          return (
            <group key={`${conf.label}-${idx}`}>
              {conf.count >= 1 && <PDumbbellOrbital axis="x" n={conf.n} count={conf.count >= 4 ? 2 : 1} highQuality={highQuality} />}
              {conf.count >= 2 && <PDumbbellOrbital axis="y" n={conf.n} count={conf.count >= 5 ? 2 : 1} highQuality={highQuality} />}
              {conf.count >= 3 && <PDumbbellOrbital axis="z" n={conf.n} count={conf.count >= 6 ? 2 : 1} highQuality={highQuality} />}
            </group>
          );
        } else if (conf.type === 'd') {
          return (
            <group key={`${conf.label}-${idx}`}>
              {conf.count >= 1 && <DCloverOrbital subType={0} n={conf.n} count={conf.count >= 6 ? 2 : 1} highQuality={highQuality} />}
              {conf.count >= 2 && <DCloverOrbital subType={1} n={conf.n} count={conf.count >= 7 ? 2 : 1} highQuality={highQuality} />}
              {conf.count >= 3 && <DCloverOrbital subType={2} n={conf.n} count={conf.count >= 8 ? 2 : 1} highQuality={highQuality} />}
              {conf.count >= 4 && <DCloverOrbital subType={3} n={conf.n} count={conf.count >= 9 ? 2 : 1} highQuality={highQuality} />}
              {conf.count >= 5 && <DCloverOrbital subType={4} n={conf.n} count={conf.count >= 10 ? 2 : 1} highQuality={highQuality} />}
            </group>
          );
        }
        return null;
      })}

      {/* Dynamic Quantum Wave Packets */}
      {waveElectrons.map((we, i) => (
        <QuantumWaveElectron
          key={i}
          type={we.type}
          n={we.n}
          mIndex={we.mIndex}
          color={we.color}
        />
      ))}
    </group>
  );
}

// ─── 3. RUTHERFORD NUCLEAR MODEL (PROHIBITED NUCLEUS & CROSS-PLANE ORBITS) ────

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
        <ringGeometry args={[radius - 0.012, radius + 0.012, highQuality ? 96 : 48]} />
        <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.2} />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshStandardMaterial color="#67e8f9" emissive="#38bdf8" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

function RutherfordModel3D({ protons, electrons, highQuality }: { protons: number; electrons: number; highQuality: boolean }) {
  const electronData = useMemo(() => {
    const arr = [];
    const baseRadius = Math.max(1.6, Math.cbrt(Math.max(1, protons)) * 0.22 + 1.3);
    for (let i = 0; i < electrons; i++) {
      const radius = baseRadius + (i % 6) * 0.45;
      const speed = 1.6 + (Math.random() * 0.6);
      const euler: [number, number, number] = [
        ((i * 60) * Math.PI) / 180,
        ((i * 45) * Math.PI) / 180,
        ((i * 30) * Math.PI) / 180
      ];
      arr.push({ radius, speed, euler, offset: (i / Math.max(1, electrons)) * Math.PI * 2 });
    }
    return arr;
  }, [electrons, protons]);

  return (
    <group>
      {/* Central positive nucleus: protons only (no neutrons discovered yet in 1911) */}
      <Nucleus protons={protons} neutrons={0} />
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

// ─── 4. THOMSON PLUM PUDDING MODEL (Positive sphere with embedded electrons) ──

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

// ─── 5. DALTON SOLID SPHERE MODEL ─────────────────────────────────────────────

function DaltonModel3D({ protons, neutrons, highQuality }: { protons: number; neutrons: number; highQuality: boolean }) {
  const mass = protons + neutrons;
  const radius = mass === 0 ? 1.0 : Math.max(0.8, Math.cbrt(mass) * 0.45);
  const hue = protons > 0 ? (protons * 37) % 360 : 210;
  const color = protons > 0 ? `hsl(${hue}, 65%, 50%)` : '#64748b';

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
          roughness={0.12}
          metalness={0.8}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 1.04, radius * 1.07, 64]} />
        <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ─── 6. DEMOCRITUS ANCIENT ATOMOS MODEL ───────────────────────────────────────

function DemocritusModel3D({ protons, neutrons, highQuality }: { protons: number; neutrons: number; highQuality: boolean }) {
  const meshRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      meshRef.current.rotation.x += delta * 0.25;
      meshRef.current.rotation.z += delta * 0.15;
    }
  });

  const shapeType = (protons + neutrons) % 4;
  const scale = Math.max(1.1, Math.cbrt(Math.max(1, protons + neutrons)) * 0.38);

  return (
    <group ref={meshRef} scale={[scale, scale, scale]}>
      <mesh>
        {shapeType === 0 && <icosahedronGeometry args={[1.2, highQuality ? 1 : 0]} />}
        {shapeType === 1 && <octahedronGeometry args={[1.3, highQuality ? 1 : 0]} />}
        {shapeType === 2 && <dodecahedronGeometry args={[1.1, highQuality ? 1 : 0]} />}
        {shapeType === 3 && <tetrahedronGeometry args={[1.4, highQuality ? 1 : 0]} />}
        <meshStandardMaterial
          color="#c084fc"
          roughness={0.2}
          metalness={0.4}
          flatShading
        />
      </mesh>
      <mesh>
        {shapeType === 0 && <icosahedronGeometry args={[1.22, 0]} />}
        {shapeType === 1 && <octahedronGeometry args={[1.32, 0]} />}
        {shapeType === 2 && <dodecahedronGeometry args={[1.12, 0]} />}
        {shapeType === 3 && <tetrahedronGeometry args={[1.42, 0]} />}
        <meshBasicMaterial color="#e879f9" wireframe transparent opacity={0.7} />
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
      return <RutherfordModel3D protons={protons} electrons={electrons} highQuality={highQuality} />;
    case 'thomson':
      return <ThomsonModel3D protons={protons} electrons={electrons} highQuality={highQuality} />;
    case 'dalton':
      return <DaltonModel3D protons={protons} neutrons={neutrons} highQuality={highQuality} />;
    case 'democritus':
      return <DemocritusModel3D protons={protons} neutrons={neutrons} highQuality={highQuality} />;
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
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {shells.map((s) => (
          <div
            key={s.shellIndex}
            className={`px-2.5 py-1.5 rounded text-[11px] border flex flex-col justify-between transition-all ${
              s.count > 0
                ? "bg-slate-800/90 border-cyan-500/50 text-white shadow-sm"
                : "bg-slate-900/40 border-slate-800/60 text-slate-500"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-cyan-400">{s.name.split(' ')[0]} Shell:</span>
              <span className="font-mono font-bold text-white">
                {s.count} <span className="text-slate-400 font-normal">/ {s.max}</span>
              </span>
            </div>
            {/* Capacity progress bar */}
            <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (s.count / s.max) * 100)}%`,
                  backgroundColor: s.color
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-400 space-y-0.5">
        <p className="font-semibold text-cyan-300">● 2n² Bohr-Bury quantized capacity rule</p>
        <p className="opacity-80">
          Electrons occupy discrete, concentric circular orbits (K, L, M, N...). Radiation occurs strictly upon transitions between shells.
        </p>
      </div>
    </div>
  );
}

function QuantumOrbitalBadges({ electrons }: { electrons: number }) {
  const configs = getFullElectronConfiguration(electrons);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {configs.map((orb) => {
          let col = "bg-sky-600 border-sky-400";
          if (orb.type === "p") col = "bg-indigo-600 border-indigo-400";
          else if (orb.type === "d") col = "bg-pink-600 border-pink-400";
          else if (orb.type === "f") col = "bg-purple-700 border-purple-400";
          return (
            <span
              key={orb.label}
              className={`px-1.5 py-0.5 rounded text-white text-[11px] font-mono font-bold border ${col} shadow-xs`}
            >
              {orb.label}<sup>{orb.count}</sup>
            </span>
          );
        })}
        {configs.length === 0 && <span className="text-slate-500 text-xs italic">No electrons</span>}
      </div>

      {/* Subshell Legend */}
      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
          <span><b>s</b>: Spherical (l=0)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
          <span><b>p</b>: Dumbbells (px,py,pz)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-400 shrink-0" />
          <span><b>d</b>: Cloverleaf (l=2)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
          <span><b>f</b>: Multi-lobe (l=3)</span>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 italic">
        Aufbau principle & Hund's rule: 1s → 2s → 2p → 3s → 3p → 4s → 3d...
      </div>
    </div>
  );
}

function RutherfordInfoBadges({ protons, electrons }: { protons: number; electrons: number }) {
  return (
    <div className="space-y-1.5 text-[11px] text-slate-300">
      <div className="bg-slate-800/80 border border-slate-700/60 p-2 rounded space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-amber-400 font-bold">Gold Foil Experiment (1911)</span>
          <span className="text-slate-400 font-mono">Ernest Rutherford</span>
        </div>
        <p className="text-[10px] text-slate-300 leading-snug">
          Alpha-particle scattering proved atomic mass & positive charge are concentrated in a tiny central nucleus, leaving 99.999% of the atom as empty space.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="bg-slate-800/50 p-1.5 rounded border border-slate-700/40">
          <span className="text-red-400 font-bold">Protons:</span> {protons} (in nucleus)
        </div>
        <div className="bg-slate-800/50 p-1.5 rounded border border-slate-700/40">
          <span className="text-blue-400 font-bold">Electrons:</span> {electrons} (cross-plane orbits)
        </div>
      </div>
      <div className="text-[10px] text-slate-400 italic">
        Pre-quantization model: electrons orbit in continuous 3D planes without fixed shells.
      </div>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────

export default function App() {
  const getInitialElement = () => {
    try {
      const fullUrl = decodeURIComponent(window.location.pathname + window.location.search + window.location.hash).toLowerCase();
      const parts = fullUrl.split(/[\/\?\#=]/).map(p => p.trim()).filter(Boolean);

      for (const [key, el] of Object.entries(ELEMENTS)) {
        const z = Number(key);
        const name = el.name.toLowerCase();
        const symbol = el.symbol.toLowerCase();
        
        if (parts.includes(name) || parts.includes(symbol) || parts.includes(String(z))) {
          return { protons: z, neutrons: getStandardNeutrons(z), electrons: z };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return { protons: 0, neutrons: 0, electrons: 0 };
  };

  const initialEl = useMemo(() => getInitialElement(), []);

  const [model, setModel] = useState<ModelType>("bohr");
  const [protons, setProtons] = useState(initialEl.protons);
  const [neutrons, setNeutrons] = useState(initialEl.neutrons);
  const [electrons, setElectrons] = useState(initialEl.electrons);
  
  const [dark, setDark] = useState(true);
  const [highQuality, setHighQuality] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);
  const [infoOpen, setInfoOpen] = useState(true);
  const [decayMsg, setDecayMsg] = useState<string|null>(null);
  const [isDecaying, setIsDecaying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const decayTimerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const activeDecayTimerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedSearchIdx, setSelectedSearchIdx] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const filteredElements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ALL_ELEMENTS.slice(0, 25);
    return ALL_ELEMENTS.filter(el => {
      const zStr = String(el.z);
      const name = el.name.toLowerCase();
      const sym = el.symbol.toLowerCase();
      return sym === q || sym.startsWith(q) || name.startsWith(q) || name.includes(q) || zStr === q || zStr.startsWith(q);
    }).sort((a, b) => {
      const aSym = a.symbol.toLowerCase();
      const bSym = b.symbol.toLowerCase();
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      if (aSym === q && bSym !== q) return -1;
      if (bSym === q && aSym !== q) return 1;
      if (aName === q && bName !== q) return -1;
      if (bName === q && aName !== q) return 1;
      if (aSym.startsWith(q) && !bSym.startsWith(q)) return -1;
      if (bSym.startsWith(q) && !aSym.startsWith(q)) return 1;
      if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
      if (bName.startsWith(q) && !aName.startsWith(q)) return 1;
      return a.z - b.z;
    }).slice(0, 15);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectElement = (z: number) => {
    if (decayTimerRef.current) clearInterval(decayTimerRef.current);
    if (activeDecayTimerRef.current) clearInterval(activeDecayTimerRef.current);
    setDecayMsg(null);
    setIsDecaying(false);
    setCountdown(0);
    const stdN = getStandardNeutrons(z);
    setProtons(z);
    setElectrons(z);
    setNeutrons(stdN);
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
      setIsSearchOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSearchIdx(prev => (prev + 1) % Math.max(1, filteredElements.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSearchIdx(prev => (prev - 1 + filteredElements.length) % Math.max(1, filteredElements.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredElements.length > 0) {
        const item = filteredElements[selectedSearchIdx] || filteredElements[0];
        handleSelectElement(item.z);
      }
    } else if (e.key === "Escape") {
      setIsSearchOpen(false);
    }
  };

  const protonsRef = useRef(protons);
  const neutronsRef = useRef(neutrons);
  const electronsRef = useRef(electrons);
  protonsRef.current = protons;
  neutronsRef.current = neutrons;
  electronsRef.current = electrons;

  const isBlackHole = Math.abs(neutrons - protons) >= 150;
  const stdNeutronsForP = getStandardNeutrons(protons);
  const maxDiff = protons <= 20 ? 2 : Math.max(3, Math.round(protons * 0.08));
  const isStable = protons >= 1 && electrons >= 1 && Math.abs(neutrons - stdNeutronsForP) <= maxDiff && Math.abs(protons - electrons) <= 4;
  const atomName = isBlackHole ? "BLACK HOLE" : (ELEMENTS[String(protons)]?.name || (protons > 0 ? `Element Z=${protons}` : "Atom Visualizer"));

  const triggerActiveDecay = (species: "Proton" | "Neutron" | "Electron") => {
    setIsDecaying(true);
    if (activeDecayTimerRef.current) clearInterval(activeDecayTimerRef.current);

    activeDecayTimerRef.current = setInterval(() => {
      const p = protonsRef.current;
      const n = neutronsRef.current;
      const e = electronsRef.current;
      const stdN = getStandardNeutrons(p);

      if (species === "Proton") {
        if (p - stdN <= 2 || p <= 0) {
          clearInterval(activeDecayTimerRef.current!);
          activeDecayTimerRef.current = null;
          setIsDecaying(false);
          setDecayMsg(null);
          return;
        }
        setProtons(curr => Math.max(0, curr - 1));
      } else if (species === "Neutron") {
        if (n - stdN <= 2 || n <= 0) {
          clearInterval(activeDecayTimerRef.current!);
          activeDecayTimerRef.current = null;
          setIsDecaying(false);
          setDecayMsg(null);
          return;
        }
        setNeutrons(curr => Math.max(0, curr - 1));
      } else if (species === "Electron") {
        if (Math.abs(e - p) <= 2 || e <= 0) {
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

    const stdN = getStandardNeutrons(protons);
    const isProtonImbalance = protons > 0 && (protons - stdN) > 12;
    const isNeutronImbalance = protons > 0 && (neutrons - stdN) > 12;
    const isElectronImbalance = protons > 0 && Math.abs(electrons - protons) > 10;

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

  // In-Canvas HUD for Model Context
  const inCanvasHud = (
    <>
      {model === 'bohr' && (
        <div className="absolute top-3 left-3 pointer-events-none select-none z-10 bg-slate-950/85 border border-cyan-500/40 backdrop-blur-xs p-2 rounded-lg text-xs space-y-1 shadow-lg max-w-[280px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Bohr Energy Shells (KLMN):</div>
          <div className="flex flex-wrap gap-1 font-mono text-[10px] font-bold">
            {getBohrShellDistribution(electrons).slice(0, 4).map(s => (
              <span key={s.shellIndex} className={`px-1.5 py-0.5 rounded border ${s.count > 0 ? 'bg-slate-800 text-cyan-300 border-cyan-500/50' : 'bg-slate-900/50 text-slate-500 border-slate-800'}`}>
                {s.letter}: {s.count}/{s.max}
              </span>
            ))}
          </div>
          <div className="text-[9px] text-slate-400">Quantized concentric orbits (2n² rule)</div>
        </div>
      )}

      {model === 'schrodinger' && (
        <div className="absolute top-3 left-3 pointer-events-none select-none z-10 bg-slate-950/85 border border-indigo-500/40 backdrop-blur-xs p-2 rounded-lg text-xs space-y-1 shadow-lg max-w-[300px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Quantum Subshells (Aufbau):</div>
          <div className="flex flex-wrap gap-1 font-mono text-[10px] font-bold max-h-16 overflow-y-auto">
            {getFullElectronConfiguration(electrons).map(c => (
              <span key={c.label} className={`px-1 py-0.5 rounded text-white ${c.type === 's' ? 'bg-sky-600' : c.type === 'p' ? 'bg-indigo-600' : c.type === 'd' ? 'bg-pink-600' : 'bg-purple-700'}`}>
                {c.label}<sup>{c.count}</sup>
              </span>
            ))}
            {electrons === 0 && <span className="text-slate-500 italic text-[10px]">No electrons</span>}
          </div>
          <div className="flex items-center gap-2 text-[9px] text-slate-300 pt-0.5">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />s sphere</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />p dumbbell</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-pink-400" />d clover</span>
          </div>
        </div>
      )}

      {model === 'rutherford' && (
        <div className="absolute top-3 left-3 pointer-events-none select-none z-10 bg-slate-950/85 border border-amber-500/40 backdrop-blur-xs p-2 rounded-lg text-xs space-y-1 shadow-lg">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Rutherford Nuclear Model:</div>
          <div className="text-[10px] text-slate-300">Central positive nucleus · 99.999% empty space</div>
          <div className="text-[9px] text-slate-400 italic">Continuous 3D cross-plane orbital planes</div>
        </div>
      )}
    </>
  );

  // Reusable Controls Content
  const controlsContent = (
    <div className="p-3 space-y-3">
      {modelSelectorBar}

      <p className={`text-xs uppercase tracking-widest font-bold ${textMuted}`}>Particle Controls (Max 300)</p>
      <ParticleRow label="Protons" color="#ff3333" dark={dark} onAdd={n => setProtons(p => !isBlackHole ? Math.min(300, p + n) : p)} onRemove={n => setProtons(p => Math.max(0, p - n))} />
      <ParticleRow label="Electrons" color="#38bdf8" dark={dark} onAdd={n => setElectrons(e => !isBlackHole ? Math.min(300, e + n) : e)} onRemove={n => setElectrons(e => Math.max(0, e - n))} />
      <ParticleRow label="Neutrons" color="#ffcc00" dark={dark} onAdd={n => setNeutrons(nn => !isBlackHole ? Math.min(300, nn + n) : nn)} onRemove={n => setNeutrons(nn => Math.max(0, nn - n))} />
      
      <div className={`pt-2 border-t ${divider} text-xs space-y-0.5 ${textMuted}`}>
        <div className="flex justify-between md:block"><span>Protons:</span> <span className="text-red-400 font-bold">{protons}</span></div>
        <div className="flex justify-between md:block"><span>Neutrons:</span> <span className="text-yellow-400 font-bold">{neutrons}</span></div>
        <div className="flex justify-between md:block"><span>Electrons:</span> <span className="text-blue-400 font-bold">{electrons}</span></div>
        {(protons + neutrons) > 0 && <div className="flex justify-between md:block"><span>Mass #:</span> <span className={`font-bold ${textMain}`}>{protons + neutrons}</span></div>}
      </div>

      {protons > 0 && (
        <a
          href={`https://atom-view.vercel.app/pages/element_${protons}.html`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full"
        >
          <button
            className="w-full py-2 rounded text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5"
            style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
              color: "#fff",
              boxShadow: "0 0 12px 2px rgba(99,102,241,0.35)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 22px 5px rgba(99,102,241,0.55)";
              (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.12)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 12px 2px rgba(99,102,241,0.35)";
              (e.currentTarget as HTMLButtonElement).style.filter = "";
            }}
          >
            <span style={{ fontSize: "0.95em" }}>🔬</span>
            View this atom in a molecule
          </button>
        </a>
      )}

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
            <Section title="Quantum Orbitals (Aufbau & Hund's Rule)" divider={divider} textMain={textMain} textMuted={textMuted}>
              <QuantumOrbitalBadges electrons={electrons} />
            </Section>
          )}

          {model === 'rutherford' && (
            <Section title="Rutherford Nuclear Model" divider={divider} textMain={textMain} textMuted={textMuted}>
              <RutherfordInfoBadges protons={protons} electrons={electrons} />
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
      <div className={`flex items-center px-3 py-2 border-b ${divider} ${dark ? "bg-[#0a1018]" : "bg-white"} gap-2 shrink-0 z-20 sticky top-0 md:relative`}>
        <button onClick={() => setSideOpen(v => !v)} className={`hidden md:block p-1.5 rounded text-base ${dark ? "hover:bg-slate-800" : "hover:bg-slate-100"} ${textMain}`} title="Toggle Controls">☰</button>
        <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 min-w-0">
          {elem && <span className={`text-xl sm:text-2xl font-black ${dark ? "text-slate-500" : "text-slate-300"}`}>{elem.symbol}</span>}
          <span className={`font-bold tracking-wide text-sm sm:text-base truncate ${textMain} ${isBlackHole ? "text-purple-400 animate-pulse" : ""}`}>{atomName}</span>
          
          {/* Element Search Bar */}
          <div ref={searchContainerRef} className="relative shrink min-w-[110px] w-32 sm:w-44 md:w-56">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors border ${
              dark 
                ? "bg-slate-900/90 border-slate-700/80 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/40" 
                : "bg-slate-100 border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-400/40"
            }`}>
              <Search className={`w-3.5 h-3.5 shrink-0 ${dark ? "text-cyan-400" : "text-blue-500"}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                  setSelectedSearchIdx(0);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Find element..."
                className={`w-full bg-transparent border-none outline-none text-xs ${dark ? "text-white placeholder-slate-400" : "text-slate-900 placeholder-slate-400"}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchOpen(false);
                  }}
                  className="p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Dropdown Popover */}
            {isSearchOpen && (
              <div className={`absolute top-full left-0 mt-1.5 w-56 sm:w-64 max-h-72 overflow-y-auto rounded-xl border shadow-2xl backdrop-blur-md z-50 p-1 divide-y ${
                dark 
                  ? "bg-[#0b121e]/95 border-slate-700/80 divide-slate-800" 
                  : "bg-white/95 border-slate-200 divide-slate-100 text-slate-800"
              }`}>
                {filteredElements.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400 text-center">No elements found</div>
                ) : (
                  filteredElements.map((item, idx) => {
                    const isSelected = idx === selectedSearchIdx;
                    return (
                      <button
                        key={item.z}
                        type="button"
                        onClick={() => handleSelectElement(item.z)}
                        onMouseEnter={() => setSelectedSearchIdx(idx)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                          isSelected
                            ? dark 
                              ? "bg-cyan-950/70 text-cyan-200" 
                              : "bg-blue-50 text-blue-900"
                            : dark 
                              ? "hover:bg-slate-800/60 text-slate-200" 
                              : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-7 h-5 flex items-center justify-center font-bold text-[10px] rounded shrink-0 ${
                            dark ? "bg-slate-800 text-cyan-300 border border-slate-700" : "bg-slate-200 text-blue-700"
                          }`}>
                            {item.symbol}
                          </span>
                          <span className="font-medium truncate">{item.name}</span>
                        </div>
                        <span className={`text-[10px] font-mono shrink-0 ml-2 ${dark ? "text-slate-400" : "text-slate-400"}`}>
                          #{item.z}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          
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
          {inCanvasHud}
          <Canvas camera={{ position: [0, 0, 8.5], fov: 55 }} gl={{ antialias: true }} dpr={highQuality ? [1, 2] : [1, 1.5]}>
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
          {inCanvasHud}
          <Canvas camera={{ position: [0, 0, 8.5], fov: 55 }} gl={{ antialias: true }} dpr={highQuality ? [1, 2.5] : [1, 1.5]}>
            <color attach="background" args={[dark ? '#080c12' : '#f8fafc']} />
            {dark && <Stars radius={100} depth={50} count={highQuality ? 1500 : 800} factor={4} saturation={0} fade speed={1} />}
            <ambientLight intensity={Math.PI / 2} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
            <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
            <Atom3DHistorical model={model} protons={protons} neutrons={neutrons} electrons={Math.min(electrons, 300)} isBlackHole={isBlackHole} highQuality={highQuality} />
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
