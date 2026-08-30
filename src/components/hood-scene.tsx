'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Dims, FamilyTraits, DuctPick } from '@/lib/calc';
import { buildLayout, BUILD, type Layout } from '@/lib/geometry';

export type ViewMode = 'solid' | 'xray' | 'explode';

const MM = 0.001;
const DEG = Math.PI / 180;

/* ------------------------------------------------------------------ */
/* Окружение: процедурная карта отражений вместо HDR с внешнего CDN.    */
/* ------------------------------------------------------------------ */

function StudioEnvironment() {
  const { scene } = useThree();

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const sky = ctx.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#e8f0f5');
    sky.addColorStop(0.45, '#8fa3b0');
    sky.addColorStop(0.52, '#2b3a44');
    sky.addColorStop(1, '#0d151a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 256);

    // световые панели цеха — дают металлу продольные блики
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    ctx.fillRect(40, 26, 190, 26);
    ctx.fillRect(300, 40, 150, 18);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(60, 96, 380, 10);
    ctx.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => {
    const previous = scene.environment;
    scene.environment = texture;
    return () => {
      scene.environment = previous;
      texture.dispose();
    };
  }, [scene, texture]);

  return null;
}

/* ------------------------------------------------------------------ */
/* Материалы                                                           */
/* ------------------------------------------------------------------ */

function useMaterials(mode: ViewMode, material: '430' | '304') {
  return useMemo(() => {
    const xray = mode === 'xray';
    const steel = new THREE.MeshStandardMaterial({
      color: material === '304' ? '#9FB0BC' : '#8B9CA8',
      metalness: 0.88,
      roughness: material === '304' ? 0.2 : 0.3,
      side: THREE.DoubleSide,
      transparent: xray,
      opacity: xray ? 0.18 : 1,
      depthWrite: !xray,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: '#33454F',
      metalness: 0.7,
      roughness: 0.5,
      transparent: xray,
      opacity: xray ? 0.25 : 1,
      depthWrite: !xray,
    });
    const filter = new THREE.MeshStandardMaterial({
      color: '#93A5B0',
      metalness: 0.8,
      roughness: 0.45,
      side: THREE.DoubleSide,
    });
    const water = new THREE.MeshStandardMaterial({
      color: '#58B4DC',
      metalness: 0.1,
      roughness: 0.15,
      transparent: true,
      opacity: 0.75,
      emissive: '#1d6a8c',
      emissiveIntensity: 0.35,
    });
    const lamp = new THREE.MeshStandardMaterial({
      color: '#FFF4E2',
      emissive: '#FFD9A8',
      emissiveIntensity: 1.4,
      roughness: 0.4,
    });
    const ghost = mode !== 'solid';
    const corpus = new THREE.MeshStandardMaterial({
      color: material === '304' ? '#9FB0BC' : '#8B9CA8',
      metalness: 0.88,
      roughness: material === '304' ? 0.2 : 0.3,
      side: THREE.DoubleSide,
      transparent: ghost,
      opacity: xray ? 0.16 : ghost ? 0.32 : 1,
      depthWrite: !ghost,
    });
    return { steel, dark, filter, water, lamp, corpus };
  }, [mode, material]);
}

/* ------------------------------------------------------------------ */
/* Узлы изделия                                                        */
/* ------------------------------------------------------------------ */

/** Корпус: усечённая пирамида. CylinderGeometry с 4 сегментами даёт ровно её. */
function Corpus({ layout, mat }: { layout: Layout; mat: THREE.Material }) {
  const { dims, top } = layout;
  const geometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2, 1, 4, 1, true);
    g.rotateY(Math.PI / 4);
    return g;
  }, []);

  // масштаб: верх уже низа, поэтому конусность задаём через два масштаба
  const scaleTop = top.w / dims.w;
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(Math.SQRT1_2 * scaleTop, Math.SQRT1_2, 1, 4, 1, true);
    g.rotateY(Math.PI / 4);
    return g;
  }, [scaleTop]);

  useEffect(() => () => { geometry.dispose(); geo.dispose(); }, [geometry, geo]);

  return (
    <mesh
      geometry={geo}
      material={mat}
      scale={[dims.w * MM, dims.h * MM, dims.d * MM]}
      position={[0, (dims.h / 2) * MM, 0]}
      castShadow
    />
  );
}

/** Крышка с патрубками. */
function TopPlate({ layout, mat, dark }: { layout: Layout; mat: THREE.Material; dark: THREE.Material }) {
  const { top, dims, spigots } = layout;
  return (
    <group position={[0, dims.h * MM, 0]}>
      <mesh material={mat}>
        <boxGeometry args={[(top.w + 40) * MM, 8 * MM, (top.d + 40) * MM]} />
      </mesh>
      {spigots.map((s, i) => (
        <group key={i} position={[s.x * MM, (BUILD.spigot / 2) * MM, 0]}>
          <mesh material={dark}>
            <cylinderGeometry args={[(s.diameter / 2) * MM, (s.diameter / 2) * MM, BUILD.spigot * MM, 28, 1, true]} />
          </mesh>
          <mesh material={mat} position={[0, (BUILD.spigot / 2) * MM, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[(s.diameter / 2) * MM, 8 * MM, 8, 28]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Жиросборный жёлоб и отбортовка по нижней кромке. */
function Gutter({ layout, mat }: { layout: Layout; mat: THREE.Material }) {
  const { dims, gutterHeight, lip } = layout;
  const w = dims.w * MM;
  const d = dims.d * MM;
  const h = gutterHeight * MM;
  const t = 40 * MM;
  return (
    <group position={[0, h / 2, 0]}>
      {[
        { pos: [0, 0, d / 2 - t / 2], size: [w, h, t] },
        { pos: [0, 0, -d / 2 + t / 2], size: [w, h, t] },
        { pos: [w / 2 - t / 2, 0, 0], size: [t, h, d - t * 2] },
        { pos: [-w / 2 + t / 2, 0, 0], size: [t, h, d - t * 2] },
      ].map((p, i) => (
        <mesh key={i} material={mat} position={p.pos as [number, number, number]}>
          <boxGeometry args={p.size as [number, number, number]} />
        </mesh>
      ))}
      <mesh material={mat} position={[0, -h / 2, 0]}>
        <boxGeometry args={[w + lip * 2 * MM, 4 * MM, d + lip * 2 * MM]} />
      </mesh>
    </group>
  );
}

/** Лабиринтные кассеты по открытым сторонам. */
function Filters({ layout, mat, offset }: { layout: Layout; mat: THREE.Material; offset: number }) {
  const { dims, filters, gutterHeight } = layout;
  const y = (gutterHeight + BUILD.filter.h / 2 + 40) * MM;
  const fw = BUILD.filter.w * MM;
  const fh = BUILD.filter.h * MM;
  const ft = BUILD.filter.t * MM;

  return (
    <group>
      {filters.map((row) =>
        Array.from({ length: row.count }, (_, i) => {
          const along = -row.span / 2 + row.step * (i + 0.5);
          const half = (row.side === 'front' || row.side === 'back' ? dims.d : dims.w) / 2;
          const inset = (half - 90) * MM + offset;
          const key = `${row.side}-${i}`;
          const scale: [number, number, number] = [Math.min(fw, row.step * MM * 0.92), fh, ft];

          if (row.side === 'front' || row.side === 'back') {
            const dir = row.side === 'front' ? 1 : -1;
            return (
              <mesh
                key={key}
                material={mat}
                position={[along * MM, y, dir * inset]}
                rotation={[dir * BUILD.filterTilt * DEG, 0, 0]}
                scale={scale}
              >
                <boxGeometry args={[1, 1, 1]} />
              </mesh>
            );
          }
          const dir = row.side === 'right' ? 1 : -1;
          return (
            <mesh
              key={key}
              material={mat}
              position={[dir * inset, y, along * MM]}
              rotation={[0, Math.PI / 2, -dir * BUILD.filterTilt * DEG]}
              scale={scale}
            >
              <boxGeometry args={[1, 1, 1]} />
            </mesh>
          );
        }),
      )}
    </group>
  );
}

/** Гидроконтур: труба с форсунками и водяная завеса. */
function HydroLoop({ layout, mat, water }: { layout: Layout; mat: THREE.Material; water: THREE.Material }) {
  const { dims, nozzles, gutterHeight } = layout;
  if (!nozzles) return null;
  const y = (dims.h * 0.62) * MM;
  const usable = dims.w - 300;
  return (
    <group>
      <mesh material={mat} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[16 * MM, 16 * MM, dims.w * 0.92 * MM, 12]} />
      </mesh>
      {Array.from({ length: nozzles }, (_, i) => {
        const x = (nozzles === 1 ? 0 : -usable / 2 + (usable * i) / (nozzles - 1)) * MM;
        const curtainH = y - gutterHeight * MM;
        return (
          <group key={i} position={[x, y, 0]}>
            <mesh material={mat} position={[0, -24 * MM, 0]}>
              <coneGeometry args={[18 * MM, 40 * MM, 10]} />
            </mesh>
            <mesh material={water} position={[0, -curtainH / 2 - 40 * MM, 0]}>
              <coneGeometry args={[dims.d * 0.3 * MM, curtainH, 14, 1, true]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Hangers({ layout, mat, length }: { layout: Layout; mat: THREE.Material; length: number }) {
  const { dims, hangers } = layout;
  if (!hangers.length) return null;
  const len = length * MM;
  return (
    <group position={[0, dims.h * MM + len / 2, 0]}>
      {hangers.map((h, i) => (
        <mesh key={i} material={mat} position={[h.x * MM, 0, h.z * MM]}>
          <cylinderGeometry args={[(BUILD.hanger.d / 2) * MM, (BUILD.hanger.d / 2) * MM, len, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function Lamps({ layout, mat, body }: { layout: Layout; mat: THREE.Material; body: THREE.Material }) {
  const { lamps, gutterHeight } = layout;
  return (
    <group position={[0, (gutterHeight + 20) * MM, 0]}>
      {lamps.map((l, i) => (
        <group key={i} position={[l.x * MM, 0, l.z * MM]}>
          <mesh material={body}>
            <cylinderGeometry args={[(BUILD.lamp.d / 2) * MM, (BUILD.lamp.d / 2) * MM, BUILD.lamp.h * MM, 16]} />
          </mesh>
          <mesh material={mat} position={[0, -(BUILD.lamp.h / 2) * MM, 0]}>
            <cylinderGeometry args={[(BUILD.lamp.d / 2 - 8) * MM, (BUILD.lamp.d / 2 - 8) * MM, 4 * MM, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Щель приточной раздачи по фронту. */
function SupplySlot({ layout, mat }: { layout: Layout; mat: THREE.Material }) {
  const { dims, supplySlot } = layout;
  if (!supplySlot) return null;
  return (
    <mesh
      material={mat}
      position={[0, (dims.h * 0.28) * MM, (dims.d / 2 + 30) * MM]}
      rotation={[12 * DEG, 0, 0]}
    >
      <boxGeometry args={[supplySlot.width * MM, supplySlot.height * MM, 60 * MM]} />
    </mesh>
  );
}

/** Автоподгонка дистанции камеры под габарит: ракурс сохраняется. */
function CameraRig({ dims }: { dims: Dims }) {
  const { camera } = useThree();
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    const maxDim = Math.max(dims.w, dims.d, dims.h + BUILD.spigot) * MM;
    const dist = (maxDim / 2 / Math.tan((perspective.fov * DEG) / 2)) * 2.1 + 0.6;
    const dir = perspective.position.clone().normalize();
    if (dir.lengthSq() === 0) dir.set(0.62, 0.5, 0.75).normalize();
    perspective.position.copy(dir.multiplyScalar(dist));
    perspective.near = 0.05;
    perspective.far = dist * 8;
    perspective.updateProjectionMatrix();
  }, [camera, dims.w, dims.d, dims.h]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Сборка изделия                                                      */
/* ------------------------------------------------------------------ */

interface HoodProps {
  layout: Layout;
  mode: ViewMode;
  material: '430' | '304';
  showLabels: boolean;
}

function Hood({ layout, mode, material, showLabels }: HoodProps) {
  const mats = useMaterials(mode, material);
  const explodeTarget = mode === 'explode' ? 1 : 0;
  const t = useRef(0);

  const topRef = useRef<THREE.Group>(null);
  const filtersRef = useRef<THREE.Group>(null);
  const hydroRef = useRef<THREE.Group>(null);
  const gutterRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    t.current += (explodeTarget - t.current) * Math.min(1, delta * 5);
    const k = t.current;
    const h = layout.dims.h * MM;
    if (topRef.current) topRef.current.position.y = k * h * 0.9;
    if (hydroRef.current) hydroRef.current.position.y = k * h * 0.45;
    if (gutterRef.current) gutterRef.current.position.y = -k * h * 0.55;
    if (filtersRef.current) filtersRef.current.scale.setScalar(1 + k * 0.0001);
  });

  const filterOffset = mode === 'explode' ? layout.dims.d * 0.22 * MM : 0;

  return (
    <group>
      <Corpus layout={layout} mat={mats.corpus} />

      <group ref={topRef}>
        <TopPlate layout={layout} mat={mats.steel} dark={mats.dark} />
        <Hangers layout={layout} mat={mats.dark} length={BUILD.hanger.len} />
        {showLabels && (
          <Html position={[0, (layout.dims.h + BUILD.spigot + 120) * MM, 0]} center distanceFactor={9}>
            <span className="scene-label">Крышка и патрубки</span>
          </Html>
        )}
      </group>

      <group ref={hydroRef}>
        <HydroLoop layout={layout} mat={mats.dark} water={mats.water} />
        <SupplySlot layout={layout} mat={mats.dark} />
      </group>

      <group ref={filtersRef}>
        <Filters layout={layout} mat={mats.filter} offset={filterOffset} />
        {showLabels && (
          <Html position={[(layout.dims.w / 2 + 260) * MM, layout.dims.h * 0.5 * MM, 0]} center distanceFactor={9}>
            <span className="scene-label">Жироуловители</span>
          </Html>
        )}
      </group>

      <group ref={gutterRef}>
        <Gutter layout={layout} mat={mats.steel} />
        <Lamps layout={layout} mat={mats.lamp} body={mats.dark} />
        {showLabels && (
          <Html position={[0, -60 * MM, (layout.dims.d / 2 + 200) * MM]} center distanceFactor={9}>
            <span className="scene-label">Жёлоб и светильники</span>
          </Html>
        )}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Публичный компонент сцены                                           */
/* ------------------------------------------------------------------ */

export interface HoodSceneProps {
  dims: Dims;
  traits: FamilyTraits;
  ducts: DuctPick;
  mode: ViewMode;
  material: '430' | '304';
  lamps: boolean;
}

export function HoodScene({ dims, traits, ducts, mode, material, lamps }: HoodSceneProps) {
  const layout = useMemo(
    () => buildLayout(dims, traits, ducts, { lamps }),
    [dims, traits, ducts, lamps],
  );

  const radius = Math.max(dims.w, dims.d) * MM;
  const camera = useMemo(
    () => ({ position: [2.2, 1.8, 2.7] as [number, number, number], fov: 34 }),
    [],
  );

  return (
    <Canvas
      camera={camera}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <StudioEnvironment />
      <CameraRig dims={dims} />
      <hemisphereLight args={['#dce6ec', '#0b1116', 0.7]} />
      <directionalLight position={[3, 5, 2]} intensity={1.15} />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#8fb6cc" />

      <group position={[0, -dims.h * MM * 0.5, 0]}>
        <Hood layout={layout} mode={mode} material={material} showLabels={mode === 'explode'} />
        <ContactShadows
          position={[0, -0.02, 0]}
          opacity={0.45}
          scale={radius * 6}
          blur={2.4}
          far={2}
          color="#000000"
        />
      </group>

      <OrbitControls
        enablePan={false}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={radius * 0.9 + 0.4}
        maxDistance={radius * 8 + 4}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
