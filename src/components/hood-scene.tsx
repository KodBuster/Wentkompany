'use client';

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
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

    /* Тёплый «цех» под палитру сайта — металл читается бронзово, не холодно-серо */
    const sky = ctx.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#f3ebe3');
    sky.addColorStop(0.42, '#c4a890');
    sky.addColorStop(0.52, '#3d322c');
    sky.addColorStop(1, '#1a1612');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 256);

    // световые панели цеха — дают металлу продольные блики
    ctx.fillStyle = '#fff6ea';
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
      color: material === '304' ? '#B9AFA3' : '#A89888',
      metalness: 0.86,
      roughness: material === '304' ? 0.22 : 0.32,
      side: THREE.DoubleSide,
      transparent: xray,
      opacity: xray ? 0.18 : 1,
      depthWrite: !xray,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: '#3A322C',
      metalness: 0.7,
      roughness: 0.5,
      transparent: xray,
      opacity: xray ? 0.25 : 1,
      depthWrite: !xray,
    });
    const filter = new THREE.MeshStandardMaterial({
      color: '#A89A8C',
      metalness: 0.78,
      roughness: 0.48,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
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
      color: material === '304' ? '#B9AFA3' : '#A89888',
      metalness: 0.86,
      roughness: material === '304' ? 0.22 : 0.32,
      side: THREE.DoubleSide,
      transparent: ghost,
      opacity: xray ? 0.16 : ghost ? 0.32 : 1,
      depthWrite: !ghost,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    return { steel, dark, filter, water, lamp, corpus };
  }, [mode, material]);
}

/* ------------------------------------------------------------------ */
/* Узлы изделия                                                        */
/* ------------------------------------------------------------------ */

/** Корпус: усечённая пирамида. Нижняя кромка — над жёлобом, без пересечения mesh. */
function Corpus({ layout, mat }: { layout: Layout; mat: THREE.Material }) {
  const { dims, top, gutterHeight } = layout;

  // масштаб: верх уже низа, поэтому конусность задаём через два масштаба
  const scaleTop = top.w / dims.w;
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(Math.SQRT1_2 * scaleTop, Math.SQRT1_2, 1, 4, 1, true);
    g.rotateY(Math.PI / 4);
    return g;
  }, [scaleTop]);

  useEffect(() => () => { geo.dispose(); }, [geo]);

  const bodyH = Math.max(dims.h - gutterHeight, 40);
  const bodyY = gutterHeight + bodyH / 2;

  return (
    <mesh
      geometry={geo}
      material={mat}
      scale={[dims.w * MM, bodyH * MM, dims.d * MM]}
      position={[0, bodyY * MM, 0]}
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
  /* Чуть внутрь габарита — грани не торчат сквозь обшивку корпуса */
  const inset = 2 * MM;
  const w = dims.w * MM - inset * 2;
  const d = dims.d * MM - inset * 2;
  const h = gutterHeight * MM;
  const t = 36 * MM;
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
      <mesh material={mat} position={[0, -h / 2 + 1 * MM, 0]}>
        <boxGeometry args={[w + lip * 2 * MM, 3 * MM, d + lip * 2 * MM]} />
      </mesh>
    </group>
  );
}

/** Лабиринтные кассеты по открытым сторонам — внутри проёма, без прокола обшивки. */
function Filters({ layout, mat, offset }: { layout: Layout; mat: THREE.Material; offset: number }) {
  const { dims, filters, gutterHeight, top } = layout;
  const maxFh = Math.max(80, dims.h - gutterHeight - 100);
  const fhMm = Math.min(BUILD.filter.h, maxFh);
  const y = (gutterHeight + fhMm / 2 + 24) * MM;
  const fw = BUILD.filter.w * MM;
  const fh = fhMm * MM;
  const ft = BUILD.filter.t * MM;
  /* Учитываем завал стенок на высоте кассет */
  const taperFrac = Math.min(1, (gutterHeight + fhMm / 2) / Math.max(dims.h, 1));
  const wallPull = Math.min(BUILD.taperMax, Math.max(dims.w, dims.d) * BUILD.taper) * taperFrac * 0.55;

  return (
    <group>
      {filters.map((row) =>
        Array.from({ length: row.count }, (_, i) => {
          const along = -row.span / 2 + row.step * (i + 0.5);
          const half = (row.side === 'front' || row.side === 'back' ? dims.d : dims.w) / 2;
          const inset = (half - 130 - wallPull) * MM + offset;
          const key = `${row.side}-${i}`;
          const alongLimit =
            row.side === 'front' || row.side === 'back'
              ? (top.w / 2 - 40) * MM
              : (top.d / 2 - 40) * MM;
          const alongClamped = Math.max(-alongLimit, Math.min(alongLimit, along * MM));
          const scale: [number, number, number] = [Math.min(fw, row.step * MM * 0.88), fh, ft];

          if (row.side === 'front' || row.side === 'back') {
            const dir = row.side === 'front' ? 1 : -1;
            return (
              <mesh
                key={key}
                material={mat}
                position={[alongClamped, y, dir * inset]}
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
              position={[dir * inset, y, alongClamped]}
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
        <cylinderGeometry args={[14 * MM, 14 * MM, dims.w * 0.82 * MM, 12]} />
      </mesh>
      {Array.from({ length: nozzles }, (_, i) => {
        const x = (nozzles === 1 ? 0 : -usable / 2 + (usable * i) / (nozzles - 1)) * MM;
        const curtainH = Math.max(y - gutterHeight * MM - 20 * MM, 40 * MM);
        return (
          <group key={i} position={[x, y, 0]}>
            <mesh material={mat} position={[0, -20 * MM, 0]}>
              <coneGeometry args={[14 * MM, 32 * MM, 10]} />
            </mesh>
            <mesh material={water} position={[0, -curtainH / 2 - 28 * MM, 0]}>
              <coneGeometry args={[dims.d * 0.22 * MM, curtainH, 14, 1, true]} />
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

/** Габарит изделия в мировой СК (низ жёлоба → верх патрубка/подвесов). */
function hoodExtents(dims: Dims, hasHangers: boolean) {
  const topMm = dims.h + Math.max(BUILD.spigot, hasHangers ? BUILD.hanger.len : 0);
  return {
    yMin: -4 * MM,
    yMax: topMm * MM,
    halfW: (dims.w / 2 + BUILD.lip) * MM,
    halfD: (dims.d / 2 + BUILD.lip) * MM,
    span: Math.max(dims.w, dims.d, topMm) * MM,
  };
}

const VIEW_DIR = new THREE.Vector3(0.52, 0.48, 0.72).normalize();

/**
 * Кадр от верхней точки модели: верх детали с зазором от верха viewport,
 * низ не вылезает вниз. После ручного orbit — только масштаб дистанции.
 */
function CameraRig({
  dims,
  hasHangers,
  userMoved,
}: {
  dims: Dims;
  hasHangers: boolean;
  userMoved: MutableRefObject<boolean>;
}) {
  const { camera, controls, size } = useThree();
  const lastSpan = useRef(0);

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    const ext = hoodExtents(dims, hasHangers);
    const orbit = controls as {
      target: THREE.Vector3;
      update: () => void;
      minDistance: number;
      maxDistance: number;
    } | null;

    perspective.aspect = size.width / Math.max(size.height, 1);
    perspective.updateProjectionMatrix();

    const vFov = perspective.fov * DEG;
    const tanV = Math.tan(vFov / 2);
    const hFov = 2 * Math.atan(tanV * perspective.aspect);
    const tanH = Math.tan(hFov / 2);

    /* Доли viewport: отступ сверху от верхней точки, снизу и с боков */
    const topInset = 0.08;
    const bottomInset = 0.1;
    const sideInset = 0.08;

    const boxH = ext.yMax - ext.yMin;
    const boxHoriz = Math.max(ext.halfW, ext.halfD) * 2 * 1.2;

    let dist = boxH / ((1 - topInset - bottomInset) * 2 * tanV);
    dist = Math.max(dist, boxHoriz / ((1 - 2 * sideInset) * 2 * tanH));
    dist *= 1.06;

    const applyTopFit = () => {
      for (let i = 0; i < 4; i++) {
        const halfV = tanV * dist;
        /* yMax → ndcY = 1 − 2·topInset */
        const targetY = ext.yMax - (1 - 2 * topInset) * halfV;
        const ndcBottom = (ext.yMin - targetY) / halfV;
        const minNdc = -1 + 2 * bottomInset;
        if (ndcBottom >= minNdc - 0.02) {
          if (orbit) {
            orbit.target.set(0, targetY, 0);
            perspective.position.copy(orbit.target).addScaledVector(VIEW_DIR, dist);
            orbit.update();
          } else {
            const target = new THREE.Vector3(0, targetY, 0);
            perspective.position.copy(target).addScaledVector(VIEW_DIR, dist);
            perspective.lookAt(target);
          }
          return dist;
        }
        /* Низ вылезает — отодвигаем, сохраняя привязку верха */
        const usable = (1 - 2 * topInset) - minNdc;
        dist = Math.max(dist * 1.04, boxH / (usable * 2 * tanV));
      }
      const halfV = tanV * dist;
      const targetY = ext.yMax - (1 - 2 * topInset) * halfV;
      if (orbit) {
        orbit.target.set(0, targetY, 0);
        perspective.position.copy(orbit.target).addScaledVector(VIEW_DIR, dist);
        orbit.update();
      }
      return dist;
    };

    let usedDist = dist;
    if (!userMoved.current || lastSpan.current === 0) {
      usedDist = applyTopFit();
    } else if (orbit && lastSpan.current > 0) {
      const ratio = ext.span / lastSpan.current;
      if (Number.isFinite(ratio) && Math.abs(ratio - 1) > 0.002) {
        const t = orbit.target;
        const offset = perspective.position.clone().sub(t).multiplyScalar(ratio);
        perspective.position.copy(t.clone().add(offset));
        usedDist = offset.length();
        orbit.update();
      } else {
        usedDist = perspective.position.distanceTo(orbit.target);
      }
    }

    lastSpan.current = ext.span;
    perspective.near = 0.05;
    perspective.far = Math.max(usedDist * 12, ext.span * 20);
    perspective.updateProjectionMatrix();

    if (orbit) {
      orbit.minDistance = ext.span * 0.45 + 0.4;
      orbit.maxDistance = ext.span * 12 + 6;
    }
  }, [camera, controls, size.width, size.height, dims.w, dims.d, dims.h, hasHangers, userMoved]);

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

  /* Пользователь сдвинул/приблизил сцену — не затираем ракурс при смене мм */
  const userMoved = useRef(false);
  const hasHangers = layout.hangers.length > 0;

  const radius = Math.max(dims.w, dims.d) * MM;
  const camera = useMemo(
    () => ({ position: [2.2, 2.0, 2.9] as [number, number, number], fov: 32 }),
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
      <CameraRig dims={dims} hasHangers={hasHangers} userMoved={userMoved} />
      <hemisphereLight args={['#efe6dc', '#1a1612', 0.72]} />
      <directionalLight position={[3, 5, 2]} intensity={1.12} color="#fff4e8" />
      <directionalLight position={[-4, 2, -3]} intensity={0.48} color="#c4a890" />

      {/* Низ модели у y≈0 — вертикаль кадра считает CameraRig от верхней точки */}
      <group position={[0, 0, 0]}>
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
        makeDefault
        enablePan
        screenSpacePanning
        panSpeed={0.85}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2.02}
        minDistance={radius * 0.7 + 0.5}
        maxDistance={radius * 10 + 5}
        enableDamping
        dampingFactor={0.08}
        onStart={() => {
          userMoved.current = true;
        }}
      />
    </Canvas>
  );
}
