import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  assignElectronOrbital,
  electronPosition,
  buildTrailPoints,
  OrbitalParams,
} from "./atomPhysics";

export interface AtomCanvasHandle {
  addParticle: (type: "proton" | "neutron" | "electron") => void;
  removeParticle: (type: "proton" | "neutron" | "electron") => void;
  reset: () => void;
  explode: () => void;
  setDark: (dark: boolean) => void;
  getCounts: () => { protons: number; neutrons: number; electrons: number };
}

interface Props {
  onCountsChange: (p: number, n: number, e: number) => void;
  onBlackHole: (active: boolean) => void;
  onDecayWarning: (seconds: number, species: string) => void;
}

interface NucleonData {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
}

interface ElectronData {
  mesh: THREE.Mesh;
  trail: THREE.Line;
  params: OrbitalParams;
}

const PROTON_COLOR = 0xff3333;
const NEUTRON_COLOR = 0xffcc00;
const ELECTRON_COLOR = 0x44aaff;
const TRAIL_COLOR = 0x33aaff;

export const AtomCanvas = forwardRef<AtomCanvasHandle, Props>(function AtomCanvas(
  { onCountsChange, onBlackHole, onDecayWarning },
  ref
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const isDarkRef = useRef(false);

  const protonsRef = useRef<NucleonData[]>([]);
  const neutronsRef = useRef<NucleonData[]>([]);
  const electronsRef = useRef<ElectronData[]>([]);
  const isBlackHoleRef = useRef(false);
  const blackHoleRef = useRef<THREE.Mesh | null>(null);

  const notifyRef = useRef(onCountsChange);
  notifyRef.current = onCountsChange;
  const onBHRef = useRef(onBlackHole);
  onBHRef.current = onBlackHole;
  const onDecayRef = useRef(onDecayWarning);
  onDecayRef.current = onDecayWarning;

  function notify() {
    notifyRef.current(
      protonsRef.current.length,
      neutronsRef.current.length,
      electronsRef.current.length
    );
  }

  function nucleusCenter(): THREE.Vector3 {
    const all = [...protonsRef.current, ...neutronsRef.current];
    if (!all.length) return new THREE.Vector3();
    const sum = new THREE.Vector3();
    all.forEach(p => sum.add(p.pos));
    sum.divideScalar(all.length);
    return sum;
  }

  function nucleusRadius(): number {
    const all = [...protonsRef.current, ...neutronsRef.current];
    if (!all.length) return 0.2;
    let max = 0;
    all.forEach(p => { const d = p.pos.length(); if (d > max) max = d; });
    return max + 0.12;
  }

  function randomNucleusPos(): THREE.Vector3 {
    return new THREE.Vector3(
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.4
    );
  }

  function makeSphere(radius: number, color: number): THREE.Mesh {
    const geo = new THREE.SphereGeometry(radius, 24, 24);
    const mat = new THREE.MeshPhongMaterial({ color, shininess: 80 });
    return new THREE.Mesh(geo, mat);
  }

  function makeBlackHole() {
    const scene = sceneRef.current!;
    // Clear all particles
    [...protonsRef.current, ...neutronsRef.current].forEach(d => scene.remove(d.mesh));
    electronsRef.current.forEach(d => { scene.remove(d.mesh); scene.remove(d.trail); });
    protonsRef.current = [];
    neutronsRef.current = [];
    electronsRef.current = [];
    isBlackHoleRef.current = true;

    if (blackHoleRef.current) scene.remove(blackHoleRef.current);
    const bh = makeSphere(0.9, 0x000000);
    (bh.material as THREE.MeshPhongMaterial).emissive = new THREE.Color(0x220044);
    bh.position.set(0, 0, 0);
    scene.add(bh);
    blackHoleRef.current = bh;
    onBHRef.current(true);
    notify();
  }

  function checkBlackHole() {
    const p = protonsRef.current.length;
    const n = neutronsRef.current.length;
    if (Math.abs(n - p) >= 150) {
      makeBlackHole();
      return true;
    }
    return false;
  }

  const addParticle = useCallback((type: "proton" | "neutron" | "electron") => {
    if (isBlackHoleRef.current) return;
    const scene = sceneRef.current!;

    if (type === "proton" || type === "neutron") {
      const color = type === "proton" ? PROTON_COLOR : NEUTRON_COLOR;
      const mesh = makeSphere(0.12, color);
      const pos = randomNucleusPos();
      mesh.position.copy(pos);
      scene.add(mesh);
      const arr = type === "proton" ? protonsRef.current : neutronsRef.current;
      arr.push({ mesh, pos });
    } else {
      const idx = electronsRef.current.length;
      const params = assignElectronOrbital(idx);
      const nr = nucleusRadius();
      const nc = nucleusCenter();
      const center: [number,number,number] = [nc.x, nc.y, nc.z];
      const pos = electronPosition(params, nr, center);

      const mesh = makeSphere(0.07, ELECTRON_COLOR);
      mesh.position.set(...pos);
      scene.add(mesh);

      // Build trail
      const trailPts = buildTrailPoints(params, nr, center, 100);
      const positions = new Float32Array(trailPts.length * 3);
      trailPts.forEach(([x, y, z], i) => { positions[i*3]=x; positions[i*3+1]=y; positions[i*3+2]=z; });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: TRAIL_COLOR, opacity: 0.5, transparent: true });
      const trail = new THREE.Line(geo, mat);
      scene.add(trail);

      electronsRef.current.push({ mesh, trail, params });
    }

    notify();
    if (checkBlackHole()) return;

    // Check for imbalance decay
    const p = protonsRef.current.length;
    const n = neutronsRef.current.length;
    const e = electronsRef.current.length;
    const diff = n - p;
    const eExcess = e - p;
    if (Math.abs(diff) > 10 || eExcess > 10) {
      const species = diff > 10 ? "neutron" : diff < -10 ? "proton" : "electron";
      onDecayRef.current(10, species);
      setTimeout(() => {
        if (species === "neutron") animateDecay("neutron", 3);
        else if (species === "proton") animateDecay("proton", 3);
        else animateDecay("electron", 3);
      }, 10000);
    }
  }, []);

  const removeParticle = useCallback((type: "proton" | "neutron" | "electron") => {
    if (isBlackHoleRef.current) return;
    const scene = sceneRef.current!;
    if (type === "proton" && protonsRef.current.length) {
      const d = protonsRef.current.pop()!;
      scene.remove(d.mesh);
    } else if (type === "neutron" && neutronsRef.current.length) {
      const d = neutronsRef.current.pop()!;
      scene.remove(d.mesh);
    } else if (type === "electron" && electronsRef.current.length) {
      const d = electronsRef.current.pop()!;
      scene.remove(d.mesh);
      scene.remove(d.trail);
    }
    notify();
  }, []);

  function animateDecay(species: "proton" | "neutron" | "electron", targetDiff: number) {
    function decayStep() {
      const p = protonsRef.current.length;
      const n = neutronsRef.current.length;
      const e = electronsRef.current.length;
      if (species === "neutron" && (Math.abs(n - p) <= targetDiff || !n)) { notify(); return; }
      if (species === "proton" && (p - n <= targetDiff || !p)) { notify(); return; }
      if (species === "electron" && (e - p <= targetDiff || !e)) { notify(); return; }

      const scene = sceneRef.current!;
      let target: THREE.Mesh;
      if (species === "neutron") { const d = neutronsRef.current.pop()!; scene.remove(d.mesh); notify(); setTimeout(decayStep, 80); return; }
      if (species === "proton") { const d = protonsRef.current.pop()!; scene.remove(d.mesh); notify(); setTimeout(decayStep, 80); return; }
      // electron - animate outward
      const d = electronsRef.current.pop()!;
      scene.remove(d.trail);
      target = d.mesh;
      const startPos = target.position.clone();
      const dir = startPos.clone().normalize().addScalar(0.01);
      let step = 0; const steps = 30;
      const interval = setInterval(() => {
        step++;
        target.position.copy(startPos).addScaledVector(dir, (step / steps) * 4);
        if (step >= steps) {
          clearInterval(interval);
          scene.remove(target);
          notify();
          setTimeout(decayStep, 80);
        }
      }, 30);
    }
    decayStep();
  }

  const reset = useCallback(() => {
    const scene = sceneRef.current!;
    [...protonsRef.current, ...neutronsRef.current].forEach(d => scene.remove(d.mesh));
    electronsRef.current.forEach(d => { scene.remove(d.mesh); scene.remove(d.trail); });
    protonsRef.current = [];
    neutronsRef.current = [];
    electronsRef.current = [];
    isBlackHoleRef.current = false;
    if (blackHoleRef.current) { scene.remove(blackHoleRef.current); blackHoleRef.current = null; }
    onBHRef.current(false);
    notify();
  }, []);

  const explode = useCallback(() => {
    const scene = sceneRef.current!;
    const all: THREE.Mesh[] = [
      ...protonsRef.current.map(d => d.mesh),
      ...neutronsRef.current.map(d => d.mesh),
      ...electronsRef.current.map(d => d.mesh),
    ];
    electronsRef.current.forEach(d => scene.remove(d.trail));

    const dirs = all.map(() => new THREE.Vector3(
      Math.random()-0.5, Math.random()-0.5, Math.random()-0.5
    ).normalize());
    const starts = all.map(m => m.position.clone());
    const steps = 90;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      all.forEach((m, i) => m.position.copy(starts[i]).addScaledVector(dirs[i], (step/steps)*5));
      if (step >= steps) {
        clearInterval(interval);
        all.forEach(m => scene.remove(m));
        protonsRef.current = [];
        neutronsRef.current = [];
        electronsRef.current = [];
        notify();
      }
    }, 1000/60);
  }, []);

  const setDark = useCallback((dark: boolean) => {
    isDarkRef.current = dark;
    if (rendererRef.current) {
      rendererRef.current.setClearColor(dark ? 0x080c12 : 0xf0f4ff);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    addParticle,
    removeParticle,
    reset,
    explode,
    setDark,
    getCounts: () => ({
      protons: protonsRef.current.length,
      neutrons: neutronsRef.current.length,
      electrons: electronsRef.current.length,
    }),
  }));

  useEffect(() => {
    const mount = mountRef.current!;
    const w = mount.clientWidth, h = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 100);
    camera.position.set(0, 0, 8);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.setClearColor(0xf0f4ff);
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 10, 7);
    scene.add(dir);
    const pt = new THREE.PointLight(0xffffff, 0.5, 20);
    pt.position.set(-3, -5, -3);
    scene.add(pt);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controlsRef.current = controls;

    // Animation loop
    const SPEED = 0.03;
    let lastTime = 0;
    function animate(time: number) {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = time - lastTime;
      lastTime = time;
      if (delta < 200) { // guard against tab-switch jumps
        const nr = nucleusRadius();
        const nc = nucleusCenter();
        const center: [number,number,number] = [nc.x, nc.y, nc.z];
        electronsRef.current.forEach(ed => {
          ed.params.angle += SPEED;
          const p = electronPosition(ed.params, nr, center);
          ed.mesh.position.set(...p);
        });
      }
      controls.update();
      renderer.render(scene, camera);
    }
    animFrameRef.current = requestAnimationFrame(animate);

    // Resize
    const ro = new ResizeObserver(() => {
      const nw = mount.clientWidth, nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
});
