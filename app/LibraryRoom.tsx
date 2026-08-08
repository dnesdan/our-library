"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, RoundedBox, Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Book, Profile } from "./data";

type Props = {
  books: Book[];
  theme: "light" | "dark";
  selectedId: number | null;
  search: string;
  profile: Profile;
  onSelect: (id: number) => void;
};

const bays = [-5.25, -1.75, 1.75, 5.25];
const rows = [0.25, 1.75, 3.25, 4.75];

function positionFor(index: number) {
  const bay = index % 4;
  const row = Math.floor(index / 4) % 4;
  const slot = Math.floor(index / 16) % 3;
  return { x: bays[bay] - .66 + slot * .62, y: rows[row], z: .92, bay, row };
}

function CameraRig({ selectedId }: { selectedId: number | null }) {
  const { camera, pointer } = useThree();
  useFrame((_, dt) => {
    const index = selectedId ? selectedId - 1 : -1;
    const p = index >= 0 ? positionFor(index) : null;
    const target = p ? new THREE.Vector3(p.x * .45, Math.max(2.1, p.y), 8.7) : new THREE.Vector3(pointer.x * .22, 2.65 + pointer.y * .08, 11.8);
    camera.position.lerp(target, 1 - Math.exp(-dt * 2.6));
    const look = p ? new THREE.Vector3(p.x, p.y, .4) : new THREE.Vector3(0, 2.25, 0);
    const current = new THREE.Vector3();
    camera.getWorldDirection(current);
    const aim = look.clone().sub(camera.position).normalize();
    current.lerp(aim, 1 - Math.exp(-dt * 2.9));
    camera.lookAt(camera.position.clone().add(current));
  });
  return null;
}

function ShelfBay({ x }: { x: number }) {
  return <group position={[x, 0, 0]}>
    <RoundedBox args={[3.2, 6.4, .62]} radius={.08} smoothness={3} position={[0, 2.4, .25]} castShadow receiveShadow>
      <meshStandardMaterial color="#3b2015" roughness={.58} />
    </RoundedBox>
    <mesh position={[0, 2.45, .62]}>
      <boxGeometry args={[2.82, 5.92, .12]} />
      <meshStandardMaterial color="#20120d" roughness={.72} />
    </mesh>
    {[-.5, 1, 2.5, 4, 5.5].map((y) => <mesh key={y} position={[0, y, .86]} castShadow>
      <boxGeometry args={[3.06, .13, .82]} />
      <meshStandardMaterial color="#6b3d26" roughness={.55} />
    </mesh>)}
    <mesh position={[-1.46, 2.45, .82]}><boxGeometry args={[.13, 6.05, .72]} /><meshStandardMaterial color="#74452c" /></mesh>
    <mesh position={[1.46, 2.45, .82]}><boxGeometry args={[.13, 6.05, .72]} /><meshStandardMaterial color="#74452c" /></mesh>
  </group>;
}

function RoomBook({ book, index, selected, match, profile, onSelect }: { book: Book; index: number; selected: boolean; match: boolean; profile: Profile; onSelect: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const p = positionFor(index);
  const height = .92 + (index % 5) * .07;
  const width = .34 + (index % 3) * .07;
  useFrame((_, dt) => {
    if (!ref.current) return;
    const tz = selected ? 1.45 : match ? 1.12 : .96;
    ref.current.position.z = THREE.MathUtils.damp(ref.current.position.z, tz, 6, dt);
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, selected ? -.11 : 0, 7, dt);
  });
  return <group ref={ref} position={[p.x, p.y + height / 2, .96]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
    <mesh castShadow>
      <boxGeometry args={[width, height, .55]} />
      <meshStandardMaterial color={book.color} roughness={.55} emissive={match || selected ? book.accent : "#000000"} emissiveIntensity={match ? .32 : selected ? .18 : 0} />
    </mesh>
    <mesh position={[0, 0, .286]}>
      <boxGeometry args={[width * .78, .035, .01]} />
      <meshBasicMaterial color={book.accent} />
    </mesh>
    {book.states[profile].status === "Reading" && <mesh position={[width * .28, height * .47, .33]}>
      <boxGeometry args={[.06, .2, .03]} /><meshBasicMaterial color={profile === "Dan" ? "#a96b4c" : "#c59a62"} />
    </mesh>}
  </group>;
}

function Ladder({ selectedId }: { selectedId: number | null }) {
  const ref = useRef<THREE.Group>(null);
  const targetX = selectedId ? positionFor(selectedId - 1).x : -3.2;
  useFrame((_, dt) => {
    if (ref.current) ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, targetX, 3.8, dt);
  });
  return <group ref={ref} position={[-3.2, 0, 2.05]} rotation={[0, 0, -.105]}>
    <mesh position={[-.48, 2.05, 0]} castShadow><boxGeometry args={[.12, 4.25, .14]} /><meshStandardMaterial color="#8d5833" roughness={.42} /></mesh>
    <mesh position={[.48, 2.05, 0]} castShadow><boxGeometry args={[.12, 4.25, .14]} /><meshStandardMaterial color="#8d5833" roughness={.42} /></mesh>
    {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[0, .25 + i * .4, .02]} castShadow>
      <boxGeometry args={[1.04, .085, .16]} /><meshStandardMaterial color="#9c6339" roughness={.46} />
    </mesh>)}
    <mesh position={[0, 4.22, -.05]}><cylinderGeometry args={[.11, .11, 1.2, 12]} /><meshStandardMaterial color="#a47a43" metalness={.5} roughness={.28} /></mesh>
  </group>;
}

function Fireplace({ dark }: { dark: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (light.current) light.current.intensity = (dark ? 3.5 : 1.5) + Math.sin(clock.elapsedTime * 9) * .24 + Math.sin(clock.elapsedTime * 4.3) * .16;
  });
  return <group position={[-4.9, -.2, 1.55]}>
    <mesh position={[0, .9, 0]} castShadow><boxGeometry args={[2.15, 2.05, .65]} /><meshStandardMaterial color="#7a6a5b" roughness={.9} /></mesh>
    <mesh position={[0, .72, .36]}><boxGeometry args={[1.38, 1.18, .16]} /><meshStandardMaterial color="#1a0c08" /></mesh>
    <mesh position={[0, 1.96, 0]} castShadow><boxGeometry args={[2.5, .22, .86]} /><meshStandardMaterial color="#5f493b" roughness={.75} /></mesh>
    {[[-.3, .55], [0, .48], [.3, .57]].map(([x, y], i) => <Float key={i} speed={2 + i} floatIntensity={.08}>
      <mesh position={[x, y, .5]} rotation={[0, 0, i === 1 ? 0 : .15 * (i ? -1 : 1)]}><coneGeometry args={[.2 + i * .03, .65 + i * .08, 10]} /><meshBasicMaterial color={i === 1 ? "#ffd37a" : "#e76a2f"} transparent opacity={.86} /></mesh>
    </Float>)}
    <pointLight ref={light} position={[0, .9, 1.3]} color="#ff8b45" distance={7} decay={2} castShadow={false} />
  </group>;
}

function ReadingCorner({ dark }: { dark: boolean }) {
  return <group position={[4.7, 0, 2.2]}>
    <RoundedBox args={[1.65, 1.25, 1.45]} radius={.26} smoothness={4} position={[0, .72, 0]} castShadow><meshStandardMaterial color="#6b3a35" roughness={.82} /></RoundedBox>
    <RoundedBox args={[1.4, 1.55, .38]} radius={.25} smoothness={4} position={[0, 1.55, -.45]} rotation={[-.16, 0, 0]} castShadow><meshStandardMaterial color="#7c4640" roughness={.86} /></RoundedBox>
    {[-.66, .66].map((x) => <RoundedBox key={x} args={[.34, .68, 1.25]} radius={.16} smoothness={3} position={[x, 1.08, .03]} castShadow><meshStandardMaterial color="#60332f" /></RoundedBox>)}
    <mesh position={[1.55, .58, .1]} castShadow><cylinderGeometry args={[.58, .52, .1, 24]} /><meshStandardMaterial color="#4a2a1c" /></mesh>
    <mesh position={[1.55, .95, .1]}><cylinderGeometry args={[.06, .06, .8, 12]} /><meshStandardMaterial color="#8f7046" metalness={.55} roughness={.3} /></mesh>
    <mesh position={[1.55, 1.36, .1]} rotation={[0, 0, -.12]} castShadow><boxGeometry args={[.72, .04, .48]} /><meshStandardMaterial color="#e3d2a4" /></mesh>
    <group position={[-1.35, 0, -.1]}>
      <mesh position={[0, 1.45, 0]}><cylinderGeometry args={[.07, .08, 2.9, 12]} /><meshStandardMaterial color="#81683f" metalness={.55} /></mesh>
      <mesh position={[.25, 2.75, 0]} rotation={[0, 0, -.28]}><coneGeometry args={[.55, .7, 24, 1, true]} /><meshStandardMaterial color="#c9a86e" side={THREE.DoubleSide} roughness={.55} /></mesh>
      <pointLight position={[.3, 2.4, .2]} color="#ffd994" intensity={dark ? 4.7 : 1.2} distance={5} decay={2} />
    </group>
    <group position={[2.5, 0, -.6]}>
      <mesh position={[0, .62, 0]}><cylinderGeometry args={[.28, .38, .9, 8]} /><meshStandardMaterial color="#8b694c" /></mesh>
      {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[(i - 2) * .13, 1.15 + (i % 2) * .16, 0]} rotation={[0, 0, (i - 2) * .18]}><sphereGeometry args={[.42, 10, 8]} /><meshStandardMaterial color="#3f6748" roughness={.9} /></mesh>)}
    </group>
  </group>;
}

function Scene({ books, theme, selectedId, search, profile, onSelect }: Props) {
  const dark = theme === "dark";
  const q = search.trim().toLowerCase();
  const matches = useMemo(() => new Set(books.filter(b => q && `${b.title} ${b.author}`.toLowerCase().includes(q)).map(b => b.id)), [books, q]);
  return <>
    <color attach="background" args={[dark ? "#120e0c" : "#b8aa91"]} />
    <fog attach="fog" args={[dark ? "#120e0c" : "#b8aa91", 9, 23]} />
    <ambientLight intensity={dark ? .42 : 1.35} color={dark ? "#957661" : "#fff3dc"} />
    <directionalLight position={[4, 8, 7]} intensity={dark ? .45 : 2.6} color={dark ? "#8190a6" : "#fff0cf"} castShadow shadow-mapSize={[1024, 1024]} />
    <spotLight position={[0, 7, 4]} angle={.65} penumbra={.8} intensity={q ? 1.2 : .35} color="#e9bd79" />
    <CameraRig selectedId={selectedId} />
    <mesh position={[0, -.57, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[19, 16]} /><meshStandardMaterial color={dark ? "#362117" : "#73513a"} roughness={.72} />
    </mesh>
    {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[-8.5 + i * 1.55, -.55, 1]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[.025, 15]} /><meshBasicMaterial color={dark ? "#1d100b" : "#4d2f20"} transparent opacity={.55} />
    </mesh>)}
    <mesh position={[0, 3, -.18]} receiveShadow><planeGeometry args={[19, 8]} /><meshStandardMaterial color={dark ? "#201816" : "#8d7c68"} roughness={.88} /></mesh>
    {bays.map(x => <ShelfBay key={x} x={x} />)}
    {books.map((book, index) => <RoomBook key={book.id} book={book} index={index} selected={selectedId === book.id} match={matches.has(book.id)} profile={profile} onSelect={() => onSelect(book.id)} />)}
    <mesh position={[0, 5.65, 1.45]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.055, .055, 14.4, 16]} /><meshStandardMaterial color="#a9804b" metalness={.65} roughness={.25} /></mesh>
    <Ladder selectedId={selectedId} />
    <Fireplace dark={dark} />
    <ReadingCorner dark={dark} />
    {!q && <Sparkles count={dark ? 22 : 12} scale={[13, 5, 5]} size={.7} speed={.12} opacity={.18} color="#f6ddb2" />}
    <Environment preset={dark ? "night" : "apartment"} environmentIntensity={dark ? .12 : .3} />
  </>;
}

export default function LibraryRoom(props: Props) {
  return <div className="room-canvas" aria-label="Interactive three-dimensional library room">
    <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 2.65, 11.8], fov: 43 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <Scene {...props} />
    </Canvas>
    <div className="room-plaque">D &amp; L <span>OUR LIBRARY</span></div>
  </div>;
}
