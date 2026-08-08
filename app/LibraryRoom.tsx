"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Float, RoundedBox, Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
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

function CameraRig({ selectedId, focus }: { selectedId: number | null; focus: "shelves" | "corner" }) {
  const { camera, pointer, size } = useThree();
  useFrame((_, dt) => {
    const index = selectedId ? selectedId - 1 : -1;
    const p = index >= 0 ? positionFor(index) : null;
    const mobile = size.width < 700;
    const mobileX = focus === "corner" ? 4.45 : -3.55;
    const target = p ? new THREE.Vector3(p.x * .42, Math.max(2.05, p.y), 9.35) : new THREE.Vector3((mobile ? mobileX : .72) + pointer.x * .34, 2.95 + pointer.y * .12, mobile ? 14.7 : 14.15);
    camera.position.lerp(target, 1 - Math.exp(-dt * 2.6));
    const look = p ? new THREE.Vector3(p.x, p.y, .4) : new THREE.Vector3(mobile ? (focus === "corner" ? 4.35 : -3.55) : -.1, 2.3, .2);
    const current = new THREE.Vector3();
    camera.getWorldDirection(current);
    const aim = look.clone().sub(camera.position).normalize();
    current.lerp(aim, 1 - Math.exp(-dt * 2.9));
    camera.lookAt(camera.position.clone().add(current));
  });
  return null;
}

function FilmicTone({ dark }: { dark: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = dark ? 1.16 : 1.08;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [dark, gl]);
  return null;
}

function ShelfBay({ x }: { x: number }) {
  const palette = ["#6e2f2b", "#344d4c", "#9b7040", "#253847", "#765447", "#4c3a55", "#b69a6a", "#863e32"];
  return <group position={[x, 0, 0]}>
    <RoundedBox args={[3.2, 6.4, .62]} radius={.08} smoothness={3} position={[0, 2.4, .25]} castShadow receiveShadow>
      <meshStandardMaterial color="#3a2117" roughness={.62} />
    </RoundedBox>
    <mesh position={[0, 2.45, .62]}>
      <boxGeometry args={[2.82, 5.92, .12]} />
      <meshStandardMaterial color="#2d1b14" roughness={.76} />
    </mesh>
    {[-.5, 1, 2.5, 4, 5.5].map((y) => <mesh key={y} position={[0, y, .86]} castShadow>
      <boxGeometry args={[3.06, .13, .82]} />
      <meshStandardMaterial color="#5a3424" roughness={.62} />
    </mesh>)}
    <mesh position={[-1.46, 2.45, .82]}><boxGeometry args={[.13, 6.05, .72]} /><meshStandardMaterial color="#68402b" /></mesh>
    <mesh position={[1.46, 2.45, .82]}><boxGeometry args={[.13, 6.05, .72]} /><meshStandardMaterial color="#68402b" /></mesh>
    {rows.map((y, row) => Array.from({ length: 11 }, (_, slot) => {
      const height = .78 + ((slot * 7 + row * 3) % 5) * .075;
      const width = .18 + ((slot * 5 + row) % 3) * .035;
      return <group key={`${row}-${slot}`} position={[-1.22 + slot * .245, y + height / 2, .94]} rotation={[0, 0, ((slot + row) % 7 === 0 ? -.035 : 0)]}>
        <mesh castShadow><boxGeometry args={[width, height, .42]} /><meshStandardMaterial color={palette[(slot + row * 2) % palette.length]} roughness={.6} /></mesh>
        {(slot + row) % 3 === 0 && <mesh position={[0, height * .22, .216]}><boxGeometry args={[width * .72, .018, .008]} /><meshBasicMaterial color="#c7a56c" /></mesh>}
        {(slot + row) % 4 === 0 && <mesh position={[0, -height * .2, .216]}><boxGeometry args={[width * .72, .012, .008]} /><meshBasicMaterial color="#d0b986" /></mesh>}
      </group>;
    }))}
    <mesh position={[0, 5.62, .83]} castShadow><boxGeometry args={[3.35, .22, .86]} /><meshStandardMaterial color="#815033" roughness={.5} /></mesh>
    {[-1.3, 1.3].map(side => <group key={side} position={[side, -.45, .8]}>
      <mesh rotation={[0, 0, side > 0 ? -.38 : .38]}><boxGeometry args={[.22, .62, .75]} /><meshStandardMaterial color="#6f4128" roughness={.62} /></mesh>
      <mesh position={[0, -.25, .03]}><sphereGeometry args={[.16, 12, 8]} /><meshStandardMaterial color="#5a321f" /></mesh>
    </group>)}
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
    <mesh position={[0, 4.22, -.05]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.11, .11, 1.2, 12]} /><meshStandardMaterial color="#a47a43" metalness={.65} roughness={.22} /></mesh>
    {[-.48, .48].map(x => <group key={x} position={[x, -.04, .03]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.14, .035, 8, 18]} /><meshStandardMaterial color="#2b211b" metalness={.5} roughness={.35} /></mesh>
      <mesh><cylinderGeometry args={[.035, .035, .18, 10]} /><meshStandardMaterial color="#a47a43" metalness={.65} /></mesh>
    </group>)}
    {[-.46, .46].map(x => <mesh key={x} position={[x, 4.28, -.18]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[.17, .035, 8, 18, Math.PI * 1.25]} /><meshStandardMaterial color="#b38a52" metalness={.72} roughness={.2} />
    </mesh>)}
  </group>;
}

function Fireplace({ dark }: { dark: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  const flames = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (light.current) light.current.intensity = (dark ? 4.8 : 1.5) + Math.sin(clock.elapsedTime * 9) * .28 + Math.sin(clock.elapsedTime * 4.3) * .18;
    if (flames.current) {
      flames.current.scale.y = 1 + Math.sin(clock.elapsedTime * 8.7) * .08;
      flames.current.rotation.y = Math.sin(clock.elapsedTime * 4.1) * .035;
    }
  });
  return <group position={[-4.9, -.2, 1.55]}>
    <mesh position={[0, .9, 0]} castShadow><boxGeometry args={[2.25, 2.12, .72]} /><meshStandardMaterial color="#8b7967" roughness={.92} /></mesh>
    <mesh position={[0, .72, .4]}><boxGeometry args={[1.48, 1.25, .18]} /><meshStandardMaterial color="#170b07" roughness={1} /></mesh>
    {[-.56,-.28,0,.28,.56].map((x,i) => <mesh key={x} position={[x,.28 + (i%2)*.12,.505]}><boxGeometry args={[.245,.1,.04]} /><meshStandardMaterial color="#593022" roughness={.9} /></mesh>)}
    {[-.92,.92].map(x => <mesh key={x} position={[x, .86, .44]} castShadow><boxGeometry args={[.24, 1.85, .38]} /><meshStandardMaterial color="#726151" roughness={.86} /></mesh>)}
    <mesh position={[0, 1.98, .03]} castShadow><boxGeometry args={[2.65, .24, .96]} /><meshStandardMaterial color="#635043" roughness={.76} /></mesh>
    <mesh position={[0, -.03, .3]} castShadow><boxGeometry args={[2.65, .18, 1.18]} /><meshStandardMaterial color="#655044" roughness={.9} /></mesh>
    <group ref={flames}>
      {[[-.28, .49], [0, .46], [.28, .51]].map(([x, y], i) => <Float key={i} speed={2 + i} floatIntensity={.055}>
        <mesh position={[x, y, .54]} rotation={[0, 0, i === 1 ? 0 : .13 * (i ? -1 : 1)]}><coneGeometry args={[.17 + i * .018, .5 + i * .07, 18]} /><meshBasicMaterial color={i === 1 ? "#ffd989" : "#e86d33"} transparent opacity={.82} blending={THREE.AdditiveBlending} /></mesh>
      </Float>)}
    </group>
    {[-.28,.26].map((x,i)=><mesh key={x} position={[x,.27,.57]} rotation={[Math.PI/2,0,i ? -.28 : .3]}><cylinderGeometry args={[.075,.1,.72,9]} /><meshStandardMaterial color="#3b1c12" roughness={1} /></mesh>)}
    <pointLight ref={light} position={[0, .9, 1.3]} color="#ff8b45" distance={8.5} decay={2} castShadow={false} />
  </group>;
}

function ReadingCorner({ dark }: { dark: boolean }) {
  return <group position={[4.7, 0, 2.2]}>
    <RoundedBox args={[1.65, 1.25, 1.45]} radius={.26} smoothness={4} position={[0, .72, 0]} castShadow><meshStandardMaterial color="#61332f" roughness={.88} /></RoundedBox>
    <RoundedBox args={[1.4, 1.55, .38]} radius={.25} smoothness={4} position={[0, 1.55, -.45]} rotation={[-.16, 0, 0]} castShadow><meshStandardMaterial color="#78433d" roughness={.9} /></RoundedBox>
    <RoundedBox args={[1.18, .26, 1.12]} radius={.12} smoothness={3} position={[0, 1.02, .14]} castShadow><meshStandardMaterial color="#87504a" roughness={.92} /></RoundedBox>
    <RoundedBox args={[.62, .55, .16]} radius={.12} smoothness={3} position={[.1, 1.55, -.22]} rotation={[-.15,0,.04]}><meshStandardMaterial color="#9a6656" roughness={.95} /></RoundedBox>
    {[-.66, .66].map((x) => <RoundedBox key={x} args={[.34, .68, 1.25]} radius={.16} smoothness={3} position={[x, 1.08, .03]} castShadow><meshStandardMaterial color="#60332f" /></RoundedBox>)}
    {[-.52,.52].map(x => <mesh key={x} position={[x,.04,-.34]}><cylinderGeometry args={[.045,.06,.54,10]} /><meshStandardMaterial color="#47291f" roughness={.7} /></mesh>)}
    <mesh position={[1.55, .58, .1]} castShadow><cylinderGeometry args={[.58, .52, .1, 24]} /><meshStandardMaterial color="#4a2a1c" /></mesh>
    <mesh position={[1.55, .95, .1]}><cylinderGeometry args={[.06, .06, .8, 12]} /><meshStandardMaterial color="#8f7046" metalness={.55} roughness={.3} /></mesh>
    <group position={[1.55, 1.36, .1]} rotation={[0, 0, -.12]}>
      <mesh castShadow><boxGeometry args={[.72, .04, .48]} /><meshStandardMaterial color="#d8c79e" /></mesh>
      <mesh position={[0,.026,.02]}><boxGeometry args={[.64,.008,.42]} /><meshStandardMaterial color="#e9dfc7" /></mesh>
      <mesh position={[0,.032,.02]} rotation={[0,.08,0]}><boxGeometry args={[.012,.012,.4]} /><meshBasicMaterial color="#9c7651" /></mesh>
    </group>
    <group position={[-1.35, 0, -.1]}>
      <mesh position={[0, 1.45, 0]}><cylinderGeometry args={[.07, .08, 2.9, 12]} /><meshStandardMaterial color="#81683f" metalness={.55} /></mesh>
      <mesh position={[.19, 2.7, 0]} rotation={[0, 0, -.24]}><coneGeometry args={[.43, .58, 32, 1, true]} /><meshStandardMaterial color="#c9a86e" side={THREE.DoubleSide} roughness={.55} emissive="#7b572c" emissiveIntensity={dark ? .35 : .08} /></mesh>
      <mesh position={[-.03,.12,0]}><cylinderGeometry args={[.32,.42,.11,24]} /><meshStandardMaterial color="#80653d" metalness={.5} roughness={.35} /></mesh>
      <pointLight position={[.25, 2.38, .55]} color="#ffd994" intensity={dark ? 6.2 : 1.2} distance={6.5} decay={2} />
    </group>
    <group position={[2.5, 0, -.6]}>
      <mesh position={[0, .62, 0]}><cylinderGeometry args={[.28, .38, .9, 8]} /><meshStandardMaterial color="#8b694c" /></mesh>
      {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[(i - 2) * .13, 1.15 + (i % 2) * .16, 0]} rotation={[0, 0, (i - 2) * .18]}><sphereGeometry args={[.42, 10, 8]} /><meshStandardMaterial color="#3f6748" roughness={.9} /></mesh>)}
    </group>
  </group>;
}

function Rug() {
  return <group position={[.45, -.545, 3.65]} rotation={[-Math.PI / 2, 0, 0]}>
    <RoundedBox args={[7.6, 4.5, .035]} radius={.12} smoothness={2} receiveShadow><meshStandardMaterial color="#6f312d" roughness={1} /></RoundedBox>
    <mesh position={[0,0,.022]}><planeGeometry args={[7.08,4.0]} /><meshStandardMaterial color="#a46c4a" roughness={1} /></mesh>
    <mesh position={[0,0,.028]}><ringGeometry args={[1.25,1.32,8]} /><meshStandardMaterial color="#d0ad75" roughness={1} /></mesh>
    <mesh position={[0,0,.03]} rotation={[0,0,Math.PI/4]}><ringGeometry args={[.56,.62,4]} /><meshStandardMaterial color="#452c2a" roughness={1} /></mesh>
    {[-3.12,3.12].map(x => <mesh key={x} position={[x,0,.03]}><planeGeometry args={[.08,3.65]} /><meshBasicMaterial color="#d2b27b" /></mesh>)}
    {[-1.7,1.7].map(y => <mesh key={y} position={[0,y,.03]}><planeGeometry args={[6.35,.08]} /><meshBasicMaterial color="#d2b27b" /></mesh>)}
  </group>;
}

function SideWindow({ dark }: { dark: boolean }) {
  return <group position={[8.34, 2.85, 3.05]} rotation={[0, -Math.PI / 2, 0]}>
    <mesh><planeGeometry args={[3.25,4.1]} /><meshStandardMaterial color={dark ? "#101827" : "#9fc1cf"} emissive={dark ? "#17233c" : "#b7d7df"} emissiveIntensity={dark ? .5 : .65} roughness={.3} /></mesh>
    <mesh position={[0,0,.035]}><boxGeometry args={[.1,3.9,.09]} /><meshStandardMaterial color="#67432d" /></mesh>
    <mesh position={[0,0,.04]}><boxGeometry args={[3.05,.1,.09]} /><meshStandardMaterial color="#67432d" /></mesh>
    {[-1.62,1.62].map(x => <mesh key={x} position={[x,0,.09]}><boxGeometry args={[.22,4.35,.2]} /><meshStandardMaterial color="#805438" roughness={.62} /></mesh>)}
    {[-2.05,2.05].map(y => <mesh key={y} position={[0,y,.09]}><boxGeometry args={[3.5,.22,.2]} /><meshStandardMaterial color="#805438" roughness={.62} /></mesh>)}
    <mesh position={[0,-2.15,.16]}><boxGeometry args={[3.75,.28,.5]} /><meshStandardMaterial color="#6e4831" /></mesh>
    {dark && <group position={[.82,1.06,.06]}><mesh><sphereGeometry args={[.35,18,14]} /><meshBasicMaterial color="#e9dfbd" /></mesh><pointLight color="#aeb7df" intensity={.7} distance={5} /></group>}
    {!dark && <mesh position={[-.9,1.15,.06]}><circleGeometry args={[.32,18]} /><meshBasicMaterial color="#fff0bb" /></mesh>}
    {[-1.72,1.72].map((x,i) => <group key={x} position={[x,0,.24]}>
      <mesh position={[i ? -.4 : .4,0,0]} rotation={[0,0,i ? .08 : -.08]}><planeGeometry args={[.9,4.35]} /><meshStandardMaterial color="#755246" roughness={.92} side={THREE.DoubleSide} /></mesh>
      {[-1.45,-.7,0,.7,1.45].map(y => <mesh key={y} position={[i ? -.4 : .4,y,.02]}><boxGeometry args={[.92,.035,.035]} /><meshStandardMaterial color="#9e7664" /></mesh>)}
    </group>)}
  </group>;
}

function Architecture({ dark }: { dark: boolean }) {
  return <>
    <mesh position={[0, 3, -1.42]} receiveShadow><planeGeometry args={[19,8]} /><meshStandardMaterial color={dark ? "#2a211d" : "#8e7d69"} roughness={.95} /></mesh>
    <mesh position={[-8.48,2.8,3]} rotation={[0,Math.PI/2,0]} receiveShadow><planeGeometry args={[9,7.3]} /><meshStandardMaterial color={dark ? "#211916" : "#796957"} roughness={.96} side={THREE.DoubleSide} /></mesh>
    <mesh position={[8.48,2.8,3]} rotation={[0,-Math.PI/2,0]} receiveShadow><planeGeometry args={[9,7.3]} /><meshStandardMaterial color={dark ? "#211916" : "#796957"} roughness={.96} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0,6.45,3]} rotation={[Math.PI/2,0,0]} receiveShadow><planeGeometry args={[17,9]} /><meshStandardMaterial color={dark ? "#211a17" : "#9b8c78"} roughness={.9} side={THREE.DoubleSide} /></mesh>
    {[-7.8,-3.9,0,3.9,7.8].map(x => <mesh key={x} position={[x,6.28,3]}><boxGeometry args={[.22,.28,9]} /><meshStandardMaterial color="#4d2d20" roughness={.7} /></mesh>)}
    {[-.8,2.1,5].map(z => <mesh key={z} position={[0,6.26,z]}><boxGeometry args={[17,.25,.18]} /><meshStandardMaterial color="#5b3725" roughness={.68} /></mesh>)}
    <mesh position={[0,5.95,-.72]}><boxGeometry args={[17,.22,.36]} /><meshStandardMaterial color="#6b412a" roughness={.6} /></mesh>
    <mesh position={[0,-.12,-.55]}><boxGeometry args={[17,.4,.28]} /><meshStandardMaterial color="#5c3827" roughness={.65} /></mesh>
    {[-7.9,7.9].map(x => <mesh key={x} position={[x,2.8,-.72]}><boxGeometry args={[.34,6.2,.36]} /><meshStandardMaterial color="#69412b" roughness={.62} /></mesh>)}
    <SideWindow dark={dark} />
  </>;
}

function Scene({ books, theme, selectedId, search, profile, onSelect, focus }: Props & { focus: "shelves" | "corner" }) {
  const dark = theme === "dark";
  const q = search.trim().toLowerCase();
  const matches = useMemo(() => new Set(books.filter(b => q && `${b.title} ${b.author}`.toLowerCase().includes(q)).map(b => b.id)), [books, q]);
  return <>
    <color attach="background" args={[dark ? "#120e0c" : "#b8aa91"]} />
    <fog attach="fog" args={[dark ? "#120e0c" : "#b8aa91", 9, 23]} />
    <ambientLight intensity={dark ? .5 : .85} color={dark ? "#a57d63" : "#ffe9c9"} />
    <hemisphereLight intensity={dark ? .38 : .75} color={dark ? "#60718f" : "#d9edf1"} groundColor={dark ? "#5a3020" : "#8d5c3c"} />
    <directionalLight position={[7, 8, 7]} intensity={dark ? .72 : 2.25} color={dark ? "#8290ab" : "#fff0cf"} castShadow shadow-mapSize={[1536, 1536]} shadow-bias={-.0005} />
    <spotLight position={[0, 7, 4]} angle={.62} penumbra={.85} intensity={q ? 1.5 : .55} color="#e9bd79" castShadow={false} />
    <pointLight position={[0,5.4,2.5]} intensity={dark ? .65 : .3} color="#e3bd7b" distance={9} decay={2} />
    <CameraRig selectedId={selectedId} focus={focus} />
    <FilmicTone dark={dark} />
    <mesh position={[0, -.57, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[19, 16]} /><meshStandardMaterial color={dark ? "#362117" : "#73513a"} roughness={.72} />
    </mesh>
    {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[-8.5 + i * 1.55, -.55, 1]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[.025, 15]} /><meshBasicMaterial color={dark ? "#1d100b" : "#4d2f20"} transparent opacity={.55} />
    </mesh>)}
    <Architecture dark={dark} />
    <Rug />
    {bays.map(x => <ShelfBay key={x} x={x} />)}
    {bays.map(x => <pointLight key={`shelf-light-${x}`} position={[x,5.45,2.15]} intensity={dark ? .32 : .08} color="#efb96f" distance={4.1} decay={2} />)}
    {books.map((book, index) => <RoomBook key={book.id} book={book} index={index} selected={selectedId === book.id} match={matches.has(book.id)} profile={profile} onSelect={() => onSelect(book.id)} />)}
    <mesh position={[0, 5.65, 1.45]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.055, .055, 14.4, 16]} /><meshStandardMaterial color="#a9804b" metalness={.65} roughness={.25} /></mesh>
    <Ladder selectedId={selectedId} />
    <Fireplace dark={dark} />
    <ReadingCorner dark={dark} />
    <group position={[0,5.9,3.8]}>
      <mesh><cylinderGeometry args={[.035,.035,.8,12]} /><meshStandardMaterial color="#8f6d42" metalness={.65} roughness={.25} /></mesh>
      <mesh position={[0,-.46,0]}><torusGeometry args={[.46,.025,8,30]} /><meshStandardMaterial color="#9c7547" metalness={.7} roughness={.22} /></mesh>
      {Array.from({length:6},(_,i)=>{const a=i/6*Math.PI*2;return <group key={i} position={[Math.cos(a)*.45,-.45,Math.sin(a)*.45]}>
        <mesh><sphereGeometry args={[.065,12,8]} /><meshStandardMaterial color="#d2b275" emissive="#c18a45" emissiveIntensity={dark ? .8 : .15} /></mesh>
        <pointLight intensity={dark ? .22 : .08} distance={2.4} color="#ffd99a" />
      </group>})}
    </group>
    <ContactShadows position={[0,-.555,2.2]} scale={17} opacity={dark ? .48 : .36} blur={2.4} far={5.5} color="#140b07" frames={1} />
    {!q && <Sparkles count={dark ? 22 : 12} scale={[13, 5, 5]} size={.7} speed={.12} opacity={.18} color="#f6ddb2" />}
  </>;
}

export default function LibraryRoom(props: Props) {
  const [focus, setFocus] = useState<"shelves" | "corner">("shelves");
  return <div className="room-canvas" aria-label="Interactive three-dimensional library room">
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [.72, 2.95, 14.15], fov: 42 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <Scene {...props} focus={focus} />
    </Canvas>
    <div className="room-plaque">D &amp; L <span>OUR LIBRARY</span></div>
    <div className="room-mobile-focus" aria-label="Room viewpoint">
      <button className={focus === "shelves" ? "active" : ""} onClick={() => setFocus("shelves")}>Fire &amp; ladder</button>
      <button className={focus === "corner" ? "active" : ""} onClick={() => setFocus("corner")}>Reading corner</button>
    </div>
  </div>;
}
