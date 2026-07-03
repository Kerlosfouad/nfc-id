"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

const shopSignals = [
  {
    icon: "ri-nfc-line",
    title: "Tap to Launch",
    desc: "A smart medal that opens your profile, socials, and shop links instantly.",
    stat: "0.3s",
    label: "tap response",
    color: "#20E7FF",
  },
  {
    icon: "ri-qr-code-line",
    title: "Always Scannable",
    desc: "Every medal ships with QR fallback for phones that need the camera path.",
    stat: "24/7",
    label: "scan backup",
    color: "#03A9F4",
  },
  {
    icon: "ri-vip-diamond-line",
    title: "Premium Black Medal",
    desc: "Built to feel like an accessory, not a disposable tech tag.",
    stat: "Matte",
    label: "finish",
    color: "#68F0FF",
  },
] as const;

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(180 * 3);

    for (let index = 0; index < 180; index += 1) {
      const radius = 1.8 + Math.random() * 4.6;
      const angle = Math.random() * Math.PI * 2;
      const depth = -1.4 + Math.random() * 2.8;

      values[index * 3] = Math.cos(angle) * radius;
      values[index * 3 + 1] = Math.sin(angle) * radius * 0.55;
      values[index * 3 + 2] = depth;
    }

    return values;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.z = clock.elapsedTime * 0.025;
    pointsRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.08;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#20E7FF" size={0.025} transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function MedalCore({ active }: { active: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock, pointer }, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.28;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, pointer.y * 0.14, 0.05);
    groupRef.current.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.08;

    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.7;
      ringRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.2) * 0.025);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.18, 1.18, 0.18, 96]} />
        <meshStandardMaterial color="#06131B" metalness={0.78} roughness={0.28} emissive={shopSignals[active].color} emissiveIntensity={0.12} />
      </mesh>

      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.28, 0.025, 16, 128]} />
        <meshStandardMaterial color={shopSignals[active].color} emissive={shopSignals[active].color} emissiveIntensity={1.4} />
      </mesh>

      <group position={[0, 0.02, 0.11]}>
        <mesh position={[-0.36, 0, 0]}>
          <boxGeometry args={[0.2, 0.95, 0.07]} />
          <meshStandardMaterial color="#087BFF" emissive="#087BFF" emissiveIntensity={0.55} />
        </mesh>
        <mesh position={[0.38, 0, 0]}>
          <boxGeometry args={[0.2, 0.95, 0.07]} />
          <meshStandardMaterial color="#20E7FF" emissive="#20E7FF" emissiveIntensity={0.55} />
        </mesh>
        {[-0.22, 0, 0.22].map((offset) => (
          <mesh key={offset} position={[0, -0.28 + offset, 0.02]} rotation={[0, 0, -0.58]}>
            <torusGeometry args={[0.48, 0.025, 12, 72, Math.PI]} />
            <meshStandardMaterial color="#20E7FF" emissive="#20E7FF" emissiveIntensity={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function SignalCard3D({
  index,
  active,
  setActive,
}: {
  index: number;
  active: number;
  setActive: (index: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const angle = index * ((Math.PI * 2) / shopSignals.length) - Math.PI / 2;
  const selected = active === index;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const radius = selected ? 2.55 : 2.85;
    groupRef.current.position.x = Math.cos(angle + clock.elapsedTime * 0.18) * radius;
    groupRef.current.position.y = Math.sin(angle + clock.elapsedTime * 0.18) * 1.15;
    groupRef.current.position.z = selected ? 0.55 : -0.12;
    groupRef.current.rotation.z = Math.sin(clock.elapsedTime + index) * 0.05;
    groupRef.current.scale.lerp(new THREE.Vector3(selected ? 1.16 : 1, selected ? 1.16 : 1, selected ? 1.16 : 1), 0.08);
  });

  return (
    <group ref={groupRef} onClick={(event) => { event.stopPropagation(); setActive(index); }}>
      <mesh>
        <boxGeometry args={[0.72, 0.48, 0.08]} />
        <meshStandardMaterial
          color={selected ? "#0A2E42" : "#07141C"}
          metalness={0.35}
          roughness={0.42}
          emissive={shopSignals[index].color}
          emissiveIntensity={selected ? 0.42 : 0.18}
        />
      </mesh>
      <mesh position={[0, 0, 0.065]}>
        <ringGeometry args={[0.12, 0.18, 32]} />
        <meshBasicMaterial color={shopSignals[index].color} transparent opacity={selected ? 1 : 0.72} />
      </mesh>
    </group>
  );
}

function ShopPortal({ active }: { active: number }) {
  const portalRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (!portalRef.current) return;
    portalRef.current.rotation.z += delta * 0.55;
    portalRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.8) * 0.035);
  });

  return (
    <group ref={portalRef} position={[2.9, -0.95, -0.45]} rotation={[0.25, -0.22, 0]}>
      <mesh>
        <torusGeometry args={[0.62, 0.035, 16, 96]} />
        <meshStandardMaterial color={shopSignals[active].color} emissive={shopSignals[active].color} emissiveIntensity={1.8} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.86, 0.012, 12, 96]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.32} />
      </mesh>
      <pointLight color={shopSignals[active].color} intensity={1.2} distance={4} />
    </group>
  );
}

function ProductScene({ active, setActive }: { active: number; setActive: (index: number) => void }) {
  return (
    <>
      <color attach="background" args={["#031016"]} />
      <fog attach="fog" args={["#031016", 4, 9]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.7} />
      <pointLight position={[-2.2, 1.6, 2.8]} color="#20E7FF" intensity={2.4} distance={7} />
      <ParticleField />
      <MedalCore active={active} />
      <ShopPortal active={active} />
      {shopSignals.map((signal, index) => (
        <SignalCard3D key={signal.title} index={index} active={active} setActive={setActive} />
      ))}
      <mesh position={[0, -1.62, -0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.3, 96]} />
        <meshBasicMaterial color="#03A9F4" transparent opacity={0.05} />
      </mesh>
    </>
  );
}

export default function ProductSection() {
  const [activeSignal, setActiveSignal] = useState(0);
  const signal = shopSignals[activeSignal];

  return (
    <section id="PRODUCT" className="relative overflow-hidden px-4 py-16 sm:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/35 to-transparent" />
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-30" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#03A9F4]/10 blur-[120px]" />

      <div className="container relative z-10 mx-auto">
        <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#03A9F4] sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#20E7FF] shadow-[0_0_12px_rgba(32,231,255,0.8)]" />
            LinkUp Shop
          </div>
          <h2 className="text-3xl font-black uppercase leading-none text-white sm:text-6xl">
            Choose Your Smart Medal
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/58 sm:text-base">
            A cinematic 3D preview for the medal before you jump into the shop. Tap the floating signals to change the product layer.
          </p>
        </div>

        <div className="product-r3f-shell relative mx-auto min-h-[560px] max-w-6xl overflow-hidden rounded-[28px] border border-[#03A9F4]/20 bg-[#031016]/80 shadow-[0_40px_120px_rgba(0,0,0,0.38)] sm:min-h-[640px]">
          <Canvas
            className="!absolute !inset-0 !h-full !w-full"
            camera={{ fov: 48, near: 0.1, far: 100, position: [0, 0.35, 6.4] }}
            dpr={[1, 1.7]}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            shadows
          >
            <ProductScene active={activeSignal} setActive={setActiveSignal} />
          </Canvas>

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,transparent_0,transparent_38%,rgba(0,0,0,0.38)_76%)]" />

          <div className="absolute left-4 top-4 z-20 w-[calc(100%-2rem)] rounded-2xl border border-white/10 bg-[#05131B]/80 p-4 text-left backdrop-blur-xl sm:left-6 sm:top-6 sm:w-[310px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#20E7FF]/75">Live product layer</p>
            <h3 className="mt-2 text-xl font-black uppercase leading-tight text-white">{signal.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/58">{signal.desc}</p>
            <div className="mt-4 flex items-center gap-2">
              {shopSignals.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActiveSignal(index)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border text-lg transition-all ${
                    activeSignal === index
                      ? "border-[#20E7FF]/60 bg-[#03A9F4]/20 text-[#20E7FF] shadow-[0_0_22px_rgba(32,231,255,0.24)]"
                      : "border-white/10 bg-white/[0.03] text-white/45 hover:border-[#03A9F4]/40 hover:text-[#20E7FF]"
                  }`}
                  aria-label={item.title}
                  aria-pressed={activeSignal === index}
                >
                  <i className={item.icon} />
                </button>
              ))}
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#05131B]/82 p-4 backdrop-blur-xl sm:bottom-6 sm:left-auto sm:right-6 sm:w-[340px]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/42">Shop signal</p>
                <p className="mt-1 text-2xl font-black uppercase text-[#20E7FF]">{signal.stat}</p>
              </div>
              <span className="rounded-full border border-[#03A9F4]/25 bg-[#03A9F4]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/58">
                {signal.label}
              </span>
            </div>
            <Link href="/shop" className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#03A9F4] px-7 text-sm font-black uppercase tracking-wider text-white transition-all hover:bg-white hover:text-black hover:shadow-[0_0_34px_rgba(32,231,255,0.45)]">
              <i className="ri-shopping-bag-3-line transition-transform group-hover:-translate-y-0.5" />
              Enter the Shop
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
