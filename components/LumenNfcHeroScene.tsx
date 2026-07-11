"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function createRoundedRectShape(width: number, height: number, radius: number) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function createCardTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 960;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = "#101112";
  ctx.fillRect(0, 0, width, height);

  const grain = ctx.createImageData(width, height);
  for (let i = 0; i < grain.data.length; i += 4) {
    const value = 14 + Math.random() * 26;
    grain.data[i] = value;
    grain.data[i + 1] = value;
    grain.data[i + 2] = value;
    grain.data[i + 3] = 22;
  }
  ctx.putImageData(grain, 0, 0);

  const vignette = ctx.createRadialGradient(width * 0.58, height * 0.46, 80, width * 0.58, height * 0.46, width * 0.75);
  vignette.addColorStop(0, "rgba(255,255,255,0.055)");
  vignette.addColorStop(0.48, "rgba(255,255,255,0.015)");
  vignette.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  const drawRibbon = (offset: number, lineWidth: number, color: string, glow: number) => {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.beginPath();
    ctx.moveTo(-90 + offset, height * 0.86);
    ctx.bezierCurveTo(165 + offset, height * 0.52, 360 + offset, height * 0.60, 435 + offset, height * 0.24);
    ctx.bezierCurveTo(485 + offset, 20, 485 + offset, -70, 475 + offset, -150);
    ctx.stroke();
    ctx.restore();
  };

  drawRibbon(-44, 20, "rgba(0,89,255,0.48)", 38);
  drawRibbon(-14, 13, "rgba(3,169,244,0.90)", 44);
  drawRibbon(34, 8, "rgba(0,109,255,0.64)", 28);
  drawRibbon(72, 4, "rgba(0,187,255,0.48)", 18);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const cyanBeam = ctx.createLinearGradient(120, 120, 530, 820);
  cyanBeam.addColorStop(0, "rgba(3,169,244,0)");
  cyanBeam.addColorStop(0.45, "rgba(3,169,244,0.22)");
  cyanBeam.addColorStop(0.75, "rgba(3,169,244,0)");
  ctx.fillStyle = cyanBeam;
  ctx.fillRect(0, 0, 620, height);
  ctx.restore();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 105px Inter, Arial, sans-serif";
  ctx.fillText("Link", 166, height - 116);
  const textGradient = ctx.createLinearGradient(430, 0, 640, 0);
  textGradient.addColorStop(0, "#0284ff");
  textGradient.addColorStop(1, "#20cfff");
  ctx.fillStyle = textGradient;
  ctx.shadowColor = "rgba(3,169,244,0.55)";
  ctx.shadowBlur = 18;
  ctx.fillText("Up", 430, height - 116);
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.translate(width - 188, 150);
  ctx.strokeStyle = "#28caff";
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(3,169,244,0.65)";
  ctx.shadowBlur = 16;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(0, 0, 42 + i * 38, -0.62, 0.62);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 3;
  ctx.strokeRect(5, 5, width - 10, height - 10);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function LinkUpCard({ reflected = false }: { reflected?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const faceTexture = useMemo(createCardTexture, []);
  const cardShape = useMemo(() => createRoundedRectShape(4.7, 2.94, 0.22), []);

  useFrame(({ clock, pointer }) => {
    if (!group.current || reflected) return;
    const t = clock.elapsedTime;
    group.current.rotation.x = -0.05 + Math.sin(t * 0.7) * 0.018 - pointer.y * 0.035;
    group.current.rotation.y = -0.13 + Math.sin(t * 0.45) * 0.035 + pointer.x * 0.07;
    group.current.position.y = 0.2 + Math.sin(t * 0.85) * 0.045;
  });

  return (
    <group
      ref={group}
      position={reflected ? [0, -1.2, 0.15] : [0, 0.58, 0.9]}
      rotation={reflected ? [Math.PI + 0.16, -0.13, 0] : [-0.05, -0.13, 0]}
      scale={reflected ? [1, 0.82, 1] : [1, 1, 1]}
    >
      <mesh position={[0, 0, -0.035]} castShadow={!reflected}>
        <extrudeGeometry args={[cardShape, { depth: 0.075, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.025, bevelSegments: 8 }]} />
        <meshPhysicalMaterial
          color={reflected ? "#02111a" : "#0d0f10"}
          metalness={0.28}
          roughness={0.34}
          clearcoat={0.85}
          clearcoatRoughness={0.2}
          transparent={reflected}
          opacity={reflected ? 0.16 : 1}
        />
      </mesh>
      <mesh position={[0, 0, 0.052]}>
        <shapeGeometry args={[cardShape]} />
        <meshBasicMaterial map={faceTexture} transparent={reflected} opacity={reflected ? 0.22 : 1} toneMapped={false} />
      </mesh>
      {!reflected && (
        <>
          <mesh position={[2.36, 0, 0.07]}>
            <boxGeometry args={[0.025, 2.65, 0.012]} />
            <meshBasicMaterial color="#03a9f4" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, 0.09]}>
            <shapeGeometry args={[createRoundedRectShape(4.76, 3, 0.24)]} />
            <meshBasicMaterial color="#03a9f4" transparent opacity={0.08} side={THREE.BackSide} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  );
}

function WaterSurface() {
  const material = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (material.current) {
      material.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.08, 0.8]} receiveShadow>
      <planeGeometry args={[14, 9, 180, 120]} />
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uDeep: { value: new THREE.Color("#020813") },
          uBlue: { value: new THREE.Color("#045b92") },
          uGlow: { value: new THREE.Color("#03a9f4") },
        }}
        vertexShader={`
          uniform float uTime;
          varying vec2 vUv;
          varying float vWave;

          void main() {
            vUv = uv;
            vec3 p = position;
            float wave =
              sin((p.x * 2.4 + uTime * 0.95)) * 0.035 +
              sin((p.y * 5.7 - uTime * 1.65)) * 0.018 +
              sin((p.x + p.y) * 7.0 + uTime * 1.2) * 0.012;
            p.z += wave;
            vWave = wave;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uDeep;
          uniform vec3 uBlue;
          uniform vec3 uGlow;
          uniform float uTime;
          varying vec2 vUv;
          varying float vWave;

          void main() {
            float horizon = smoothstep(0.0, 0.82, vUv.y);
            float center = 1.0 - smoothstep(0.08, 0.48, abs(vUv.x - 0.5));
            float ripples = sin(vUv.y * 88.0 - uTime * 2.4 + sin(vUv.x * 16.0) * 1.2);
            float fine = sin((vUv.x + vUv.y) * 180.0 + uTime * 3.0);
            float sparkle = smoothstep(0.82, 1.0, ripples * 0.5 + 0.5) * center * (1.0 - horizon);
            float scan = smoothstep(0.42, 0.0, abs(vUv.y - 0.43)) * center;
            vec3 color = mix(uDeep, uBlue, horizon * 0.55 + vWave * 2.2);
            color += uGlow * sparkle * 0.46;
            color += uGlow * scan * 0.16;
            color += vec3(0.8, 0.95, 1.0) * smoothstep(0.96, 1.0, fine * 0.5 + 0.5) * center * 0.035;
            float alpha = 0.58 - horizon * 0.18;
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  );
}

function LightArc() {
  return (
    <group position={[0, 0.12, 0.22]} rotation={[0, 0, 0]}>
      <mesh>
        <torusGeometry args={[2.68, 0.012, 18, 160, Math.PI]} />
        <meshBasicMaterial color="#68dbff" transparent opacity={0.62} toneMapped={false} />
      </mesh>
      <mesh scale={[1.01, 1.01, 1.01]}>
        <torusGeometry args={[2.68, 0.05, 18, 160, Math.PI]} />
        <meshBasicMaterial color="#03a9f4" transparent opacity={0.09} toneMapped={false} />
      </mesh>
    </group>
  );
}

function StarField() {
  const points = useMemo(() => {
    const positions = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = Math.random() * 4.6 - 0.2;
      positions[i * 3 + 2] = -2.4 - Math.random() * 3.8;
    }
    return positions;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#a8ecff" size={0.012} transparent opacity={0.62} sizeAttenuation />
    </points>
  );
}

function SceneContent() {
  return (
    <>
      <color attach="background" args={["#010409"]} />
      <fog attach="fog" args={["#06111e", 4.5, 11]} />
      <ambientLight intensity={0.38} color="#7ccfff" />
      <directionalLight position={[-2.4, 4.2, 4]} intensity={3.4} color="#66d9ff" />
      <pointLight position={[0, 0.65, 0.15]} intensity={24} distance={7.5} color="#03a9f4" />
      <pointLight position={[2.7, 1.7, 2.2]} intensity={6.5} distance={5.5} color="#7be4ff" />
      <spotLight position={[0, 2.9, 4]} angle={0.55} penumbra={0.75} intensity={5.2} color="#ffffff" />
      <StarField />
      <LightArc />
      <WaterSurface />
      <LinkUpCard reflected />
      <LinkUpCard />
    </>
  );
}

export default function LumenNfcHeroScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0.32, 6.3], fov: 34, near: 0.1, far: 30 }}
        dpr={[1, 1.7]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        shadows
      >
        <SceneContent />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
        <div className="relative mt-[8svh] h-[min(36vw,350px)] w-[min(58vw,650px)] max-w-[78vw] translate-x-[clamp(70px,12vw,180px)] animate-[heroCardFloat_7s_ease-in-out_infinite] rounded-[28px] border border-white/12 bg-[#101213] shadow-[0_34px_120px_rgba(3,169,244,0.28),0_0_0_1px_rgba(3,169,244,0.16)_inset] [transform:perspective(1000px)_rotateX(2deg)_rotateY(-7deg)] max-md:h-[42vw] max-md:w-[82vw] max-md:translate-x-[12vw]">
          <div className="absolute inset-0 overflow-hidden rounded-[28px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_42%,rgba(255,255,255,0.09),transparent_30%),linear-gradient(135deg,#141617_0%,#0c0d0e_52%,#040506_100%)]" />
            <div className="absolute inset-0 opacity-[0.22] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.45)_1px,transparent_0)] [background-size:10px_10px]" />
            <div className="absolute -left-[8%] -top-[18%] h-[116%] w-[44%] rotate-[16deg] rounded-[50%] border-r-[10px] border-[#03A9F4] opacity-90 blur-[0.2px] shadow-[0_0_34px_rgba(3,169,244,0.95)]" />
            <div className="absolute -left-[3%] -top-[22%] h-[120%] w-[41%] rotate-[16deg] rounded-[50%] border-r-[5px] border-[#0084ff] opacity-70 shadow-[0_0_26px_rgba(0,132,255,0.72)]" />
            <div className="absolute left-[6%] top-[-20%] h-[112%] w-[34%] rotate-[16deg] rounded-[50%] border-r border-[#2fd9ff]/60" />
            <div className="absolute right-0 top-0 h-full w-px bg-[#03A9F4] shadow-[0_0_18px_#03A9F4]" />
            <div className="absolute bottom-[9%] left-[10%] text-[clamp(42px,6.2vw,82px)] font-bold tracking-[-0.045em] text-white">
              Link<span className="bg-gradient-to-r from-[#038bff] to-[#2bd6ff] bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(3,169,244,0.55)]">Up</span>
            </div>
            <div className="absolute right-[8%] top-[16%] flex h-20 w-20 items-center justify-center">
              <span className="absolute h-12 w-12 rounded-full border-r-[6px] border-[#2bd6ff] shadow-[0_0_16px_rgba(43,214,255,0.72)]" />
              <span className="absolute h-20 w-20 rounded-full border-r-[6px] border-[#2bd6ff] shadow-[0_0_18px_rgba(43,214,255,0.5)]" />
              <span className="absolute h-28 w-28 rounded-full border-r-[6px] border-[#2bd6ff] shadow-[0_0_20px_rgba(43,214,255,0.38)]" />
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[34svh] overflow-hidden">
        <div className="absolute inset-x-[-10%] bottom-[-26%] h-[125%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(3,169,244,0.34),transparent_28%),linear-gradient(180deg,rgba(3,169,244,0.12),rgba(2,9,18,0.86)_58%,#020409)] opacity-90" />
        <div className="absolute inset-x-[-20%] top-[8%] h-[44%] rotate-[-2deg] opacity-75 blur-[0.2px] [background:repeating-radial-gradient(ellipse_at_50%_0%,rgba(195,244,255,0.38)_0_1px,rgba(3,169,244,0.13)_2px_4px,transparent_8px_18px)] animate-[waterDrift_8s_linear_infinite]" />
        <div className="absolute left-1/2 top-[4%] h-[20%] w-[46%] -translate-x-1/2 rounded-[50%] bg-[#bdf3ff]/18 blur-xl" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(3,169,244,0.12),transparent_30%),radial-gradient(circle_at_50%_74%,rgba(3,169,244,0.16),transparent_24%),linear-gradient(180deg,rgba(2,6,12,0.06)_0%,rgba(3,8,15,0.02)_45%,#0b0a0a_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0b0a0a] to-transparent" />
    </div>
  );
}
