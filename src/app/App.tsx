import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import elementData from "../imports/elements.json";

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

// ─── 3D COMPONENTS ────────────────────────────────────────────────────────────

function Nucleus({ protons, neutrons }: { protons: number, neutrons: number }) {
  const particles = useMemo(() => {
    const arr: { type: 'p'|'n', pos: [number,number,number] }[] = [];
    const radius = Math.max(0.3, Math.cbrt(protons + neutrons) * 0.15);
    for(let i=0; i<protons; i++) {
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1);
      const r = Math.random() * radius;
      arr.push({ type: 'p', pos: [r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi)] });
    }
    for(let i=0; i<neutrons; i++) {
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1);
      const r = Math.random() * radius;
      arr.push({ type: 'n', pos: [r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi)] });
    }
    return arr;
  }, [protons, neutrons]);

  return (
    <group>
      {particles.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={p.type === 'p' ? '#ff3333' : '#ffcc00'} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Electron({ radius, speed, axis, angleOffset, highQuality }: { radius: number, speed: number, axis: [number,number,number], angleOffset: number, highQuality: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + angleOffset;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.y = Math.sin(t) * radius;
  });
  
  // Adjust detail based on highQuality mode (added later via props/context)
  const segments = highQuality ? 32 : 16;
  const ringSeg = highQuality ? 128 : 64;
  
  return (
    <group rotation={axis as unknown as THREE.Euler}>
      {/* Orbit ring (always keep these as requested) */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[radius - 0.01, radius + 0.01, ringSeg]} />
        <meshBasicMaterial color="#44aaff" side={THREE.DoubleSide} transparent opacity={0.15} />
      </mesh>
      {/* Electron particle */}
      <mesh ref={ref}>
        <sphereGeometry args={[0.07, segments, segments]} />
        <meshStandardMaterial color="#44aaff" emissive="#44aaff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function Atom3D({ protons, neutrons, electrons, isBlackHole, highQuality }: { protons: number, neutrons: number, electrons: number, isBlackHole: boolean, highQuality: boolean }) {
  const electronData = useMemo(() => {
    const arr = [];
    const baseRadius = Math.max(1.5, Math.cbrt(protons + neutrons) * 0.2 + 1.0);
    for(let i=0; i<electrons; i++) {
      const shell = Math.floor(i / 8); 
      const radius = baseRadius + (shell * 0.8) + (Math.random() * 0.2);
      const speed = 2.0 - (shell * 0.3) + (Math.random() * 0.5);
      const axis: [number,number,number] = [Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI];
      arr.push({ radius, speed, axis, offset: Math.random()*Math.PI*2 });
    }
    return arr;
  }, [electrons, protons, neutrons]);

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

  return (
    <group>
      <Nucleus protons={protons} neutrons={neutrons} />
      {electronData.map((e, i) => (
        <Electron key={i} radius={e.radius} speed={e.speed} axis={e.axis} angleOffset={e.offset} highQuality={highQuality} />
      ))}
    </group>
  );
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
function OrbitalBadges({ electrons }: { electrons: number }) {
  const shells = [{ label:"1s", cap:1, cls:"bg-blue-700" }, { label:"2p", cap:5, cls:"bg-indigo-700" }, { label:"3d", cap:10, cls:"bg-violet-700" }, { label:"4f", cap:14, cls:"bg-purple-800" }];
  let rem = electrons;
  return (
    <div className="flex flex-wrap gap-1">
      {shells.map(s => {
        if (rem <= 0) return null;
        const n = Math.min(rem, s.cap); rem -= n;
        return <span key={s.label} className={`px-1.5 py-0.5 rounded text-white ${s.cls}`}>{s.label}({n})</span>;
      })}
      {rem > 0 && <span className="px-1.5 py-0.5 rounded text-white bg-pink-700">+{rem}</span>}
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────

export default function App() {
  const [protons, setProtons] = useState(0);
  const [neutrons, setNeutrons] = useState(0);
  const [electrons, setElectrons] = useState(0);
  
  const [dark, setDark] = useState(true);
  const [highQuality, setHighQuality] = useState(false); // toggle for visual fidelity
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

    const diff = neutrons - protons;
    const eEx = electrons - protons;
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

  const bg = dark ? "bg-[#080c12]" : "bg-slate-100";
  const panelBg = dark ? "bg-[#0e1520] border-slate-800" : "bg-white border-slate-200";
  const textMain = dark ? "text-slate-100" : "text-slate-800";
  const textMuted = dark ? "text-slate-400" : "text-slate-500";
  const divider = dark ? "border-slate-800" : "border-slate-200";
  const stabColor = isBlackHole ? "text-purple-400" : isStable ? "text-emerald-400" : "text-amber-400";

  return (
    <div className={`w-full h-full flex flex-col overflow-hidden ${bg} transition-colors duration-300`}>
      <div className={`flex items-center px-3 py-2 border-b ${divider} ${dark ? "bg-[#0a1018]" : "bg-white"} gap-2 shrink-0 z-10 relative`}>
        <button onClick={() => setSideOpen(v => !v)} className={`p-1.5 rounded text-base ${dark ? "hover:bg-slate-800" : "hover:bg-slate-100"} ${textMain}`}>☰</button>
        <div className="flex-1 flex items-center justify-center gap-3">
          {elem && <span className={`text-2xl font-black ${dark ? "text-slate-500" : "text-slate-300"}`}>{elem.symbol}</span>}
          <span className={`font-bold tracking-wide ${textMain} ${isBlackHole ? "text-purple-400 animate-pulse" : ""}`}>{atomName}</span>
          {protons > 0 && <span className={`text-xs font-semibold ${stabColor}`}>● {isStable ? "Stable" : "Unstable"}</span>}
          <button onClick={() => setHighQuality(v => !v)} className={`ml-2 p-1.5 rounded text-sm ${dark ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-300 hover:bg-slate-200"} ${textMain}`} title="Toggle high‑quality rendering">
            {highQuality ? "HQ" : "LQ"}
          </button>
        </div>
        <button onClick={() => setInfoOpen(v => !v)} className={`p-1.5 rounded text-base ${dark ? "hover:bg-slate-800" : "hover:bg-slate-100"} ${textMain}`}>ℹ</button>
        <button onClick={() => setDark(v => !v)} className={`p-1.5 rounded text-base ${dark ? "hover:bg-slate-800" : "hover:bg-slate-100"} ${textMain}`}>{dark ? "☀" : "☾"}</button>
      </div>

      <AnimatePresence>
        {decayMsg && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="shrink-0 overflow-hidden z-10 relative">
            <div className={`text-xs text-center py-1.5 font-medium transition-colors ${
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

      <div className="flex flex-1 overflow-hidden relative">
        <AnimatePresence initial={false}>
          {sideOpen && (
            <motion.aside initial={{width:0,opacity:0}} animate={{width:210,opacity:1}} exit={{width:0,opacity:0}} transition={{duration:0.22,ease:"easeInOut"}} className={`overflow-hidden shrink-0 border-r ${panelBg} flex flex-col z-10 relative`}>
              <div className="p-3 space-y-4 overflow-y-auto flex-1">
                <p className={`text-xs uppercase tracking-widest font-bold ${textMuted}`}>Controls</p>
                <ParticleRow label="Protons" color="#ff3333" dark={dark} onAdd={n => setProtons(p => !isBlackHole ? p + n : p)} onRemove={n => setProtons(p => Math.max(0, p - n))} />
                <ParticleRow label="Electrons" color="#44aaff" dark={dark} onAdd={n => setElectrons(e => !isBlackHole ? e + n : e)} onRemove={n => setElectrons(e => Math.max(0, e - n))} />
                <ParticleRow label="Neutrons" color="#ffcc00" dark={dark} onAdd={n => setNeutrons(nn => !isBlackHole ? nn + n : nn)} onRemove={n => setNeutrons(nn => Math.max(0, nn - n))} />
                <div className={`pt-2 border-t ${divider} text-xs space-y-0.5 ${textMuted}`}>
                  <div>Protons: <span className="text-red-400 font-bold">{protons}</span></div>
                  <div>Neutrons: <span className="text-yellow-400 font-bold">{neutrons}</span></div>
                  <div>Electrons: <span className="text-blue-400 font-bold">{electrons}</span></div>
                  {(protons + neutrons) > 0 && <div>Mass #: <span className={`font-bold ${textMain}`}>{protons + neutrons}</span></div>}
                </div>
                <button onClick={handleReset} className="w-full py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-widest transition-colors">Reset</button>
                <div className={`pt-2 border-t ${divider} text-xs ${textMuted} space-y-0.5`}>
                  <div className="font-semibold mb-1">Stability rules</div>
                  <div>|p − n| ≤ 2 → nuclear</div>
                  <div>|p − e| ≤ 5 → charge</div>
                  <div className="text-purple-400">|n − p| ≥ 150 → Black Hole</div>
                </div>
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
            <Atom3D protons={protons} neutrons={neutrons} electrons={Math.min(electrons, 200)} isBlackHole={isBlackHole} highQuality={highQuality} />
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
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-slate-500 pointer-events-none select-none z-10 bg-black/40 px-2 py-1 rounded">drag to rotate · scroll to zoom</div>
        </div>

        <AnimatePresence initial={false}>
          {infoOpen && (
            <motion.aside initial={{width:0,opacity:0}} animate={{width:264,opacity:1}} exit={{width:0,opacity:0}} transition={{duration:0.22,ease:"easeInOut"}} className={`overflow-hidden shrink-0 border-l ${panelBg} flex flex-col z-10 relative`}>
              <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
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
                    <Section title="Electron Config" divider={divider} textMain={textMain} textMuted={textMuted}><OrbitalBadges electrons={electrons} /></Section>
                  </>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
