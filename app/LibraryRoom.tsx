"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, RoundedBox, Sparkles, useGLTF, useTexture } from "@react-three/drei";
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
  onClear: () => void;
};

type CameraMotion = {
  yaw: number;
  pitch: number;
  dolly: number;
  velocityYaw: number;
  velocityPitch: number;
  dragging: boolean;
  suppressClickUntil: number;
  reduced: boolean;
};

type LadderMotion = { x: number; velocity: number; arrived: boolean; targetX: number };

const bays = [-5.25, -1.75, 1.75, 5.25];
const rows = [-0.42, 1.08, 2.58, 4.08];
const fillerPalette = ["#6e2f2b", "#344d4c", "#9b7040", "#253847", "#765447", "#4c3a55", "#b69a6a", "#863e32"];

type PBRSet = { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture };

function DetailedModel({ src, ...props }: { src: string } & Omit<React.ComponentProps<"group">, "children">) {
  const { scene } = useGLTF(src);
  const model = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    model.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.material.envMapIntensity = .7;
      }
    });
  }, [model]);
  return <group {...props}><primitive object={model} /></group>;
}

function usePBRSet(name: "dark-wood" | "stone" | "floor" | "rug", repeat: [number, number]): PBRSet {
  const textures = useTexture([
    `/textures/${name}-color.jpg`,
    `/textures/${name}-normal.jpg`,
    `/textures/${name}-roughness.jpg`,
  ]);
  return useMemo(() => {
    const [map, normalMap, roughnessMap] = textures;
    map.colorSpace = THREE.SRGBColorSpace;
    for (const texture of textures) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeat[0], repeat[1]);
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
    return { map, normalMap, roughnessMap };
  }, [textures, repeat]);
}

function useLeatherSet() {
  const textures = useTexture(["/textures/leather-normal.jpg", "/textures/leather-roughness.jpg"]);
  return useMemo(() => {
    const [normalMap, roughnessMap] = textures;
    for (const texture of textures) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2.4, 2.4);
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
    return { normalMap, roughnessMap };
  }, [textures]);
}

function positionFor(index: number) {
  const bay = index % 4;
  const row = Math.floor(index / 4) % 4;
  const slot = Math.floor(index / 16) % 3;
  return { x: bays[bay] - .66 + slot * .62, y: rows[row], z: .92, bay, row };
}

function ladderTargetFor(position: ReturnType<typeof positionFor>) {
  return THREE.MathUtils.clamp(position.x - .78, -6.42, 6.42);
}

export function createRoomPlacements(collection: Book[]) {
  const slots = collection.map((_, index) => index);
  const bayPriority = [2, 1, 3, 0];
  const upper = slots.filter(index => positionFor(index).row >= 2).sort((a,b) => {
    const pa = positionFor(a), pb = positionFor(b);
    return pb.row - pa.row || Math.floor(a / 16) - Math.floor(b / 16) || bayPriority.indexOf(pa.bay) - bayPriority.indexOf(pb.bay);
  });
  const lower = slots.filter(index => positionFor(index).row < 2);
  const highBooks = collection.filter(book => book.highShelf);
  const regularBooks = collection.filter(book => !book.highShelf);
  const placements = new Map<number, number>();
  const used = new Set<number>();
  highBooks.forEach(book => {
    const slot = [...upper, ...lower].find(index => !used.has(index));
    if (slot === undefined) return;
    placements.set(book.id, slot); used.add(slot);
  });
  const remaining = [...lower, ...upper].filter(index => !used.has(index));
  regularBooks.forEach((book, index) => { if (remaining[index] !== undefined) placements.set(book.id, remaining[index]); });
  return placements;
}

function useSpineTexture(book: Book) {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = book.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sheen = ctx.createLinearGradient(0,0,128,0);
    sheen.addColorStop(0,"rgba(0,0,0,.28)");
    sheen.addColorStop(.18,"rgba(255,255,255,.08)");
    sheen.addColorStop(.55,"rgba(255,255,255,.03)");
    sheen.addColorStop(1,"rgba(0,0,0,.2)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0,0,128,512);
    ctx.fillStyle = book.accent;
    ctx.fillRect(8, 38, 112, 5);
    ctx.fillRect(8, 468, 112, 5);
    ctx.strokeStyle = book.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 62, 98, 388);
    let seed = book.id * 9301 + 49297;
    const random = () => ((seed = (seed * 233280 + 49297) % 233280) / 233280);
    ctx.globalCompositeOperation = "multiply";
    for (let i = 0; i < 34; i++) {
      ctx.fillStyle = `rgba(44,24,15,${.025 + random() * .07})`;
      const size = 1 + random() * 5;
      ctx.fillRect(random() * 128, random() * 512, size, .5 + random() * 2);
    }
    const edgeWear = ctx.createLinearGradient(0,0,128,0);
    edgeWear.addColorStop(0,"rgba(22,12,8,.42)"); edgeWear.addColorStop(.08,"transparent");
    edgeWear.addColorStop(.92,"transparent"); edgeWear.addColorStop(1,"rgba(22,12,8,.35)");
    ctx.fillStyle = edgeWear; ctx.fillRect(0,0,128,512);
    ctx.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.translate(64, 256);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#ead6a6";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 22px Georgia, serif";
    const title = book.title.length > 24 ? `${book.title.slice(0, 23)}…` : book.title;
    ctx.fillText(title.toUpperCase(), 0, -9, 350);
    ctx.font = "italic 15px Georgia, serif";
    ctx.fillStyle = "rgba(244,225,184,.86)";
    ctx.fillText(book.author, 0, 20, 330);
    ctx.restore();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, [book]);
}

function CameraRig({ selectedIndex, focus, motion, ladder }: { selectedIndex: number | null; focus: "shelves" | "corner"; motion: React.RefObject<CameraMotion>; ladder: React.RefObject<LadderMotion> }) {
  const { camera, pointer, size } = useThree();
  const vectors = useMemo(() => ({ target: new THREE.Vector3(), look: new THREE.Vector3(), current: new THREE.Vector3(), aim: new THREE.Vector3() }), []);
  useFrame((_, dt) => {
    const controls = motion.current;
    if (!controls) return;
    if (!controls.dragging && !controls.reduced) {
      controls.yaw = THREE.MathUtils.clamp(controls.yaw + controls.velocityYaw * dt * 12, -1.2, 1.2);
      controls.pitch = THREE.MathUtils.clamp(controls.pitch + controls.velocityPitch * dt * 12, -.52, .58);
      const friction = Math.exp(-dt * 8.5);
      controls.velocityYaw *= friction;
      controls.velocityPitch *= friction;
    }
    const p = selectedIndex !== null ? positionFor(selectedIndex) : null;
    const waitingForLadder = Boolean(p && p.row >= 2 && (!ladder.current?.arrived || Math.abs((ladder.current?.x ?? -99) - ladderTargetFor(p)) > .08));
    const mobile = size.width < 700;
    const mobileX = focus === "corner" ? 4.45 : -3.55;
    const parallax = controls.dragging || controls.reduced ? 0 : 1;
    const target = p
      ? vectors.target.set(p.x * .42 + controls.yaw * .72, Math.max(2.05, p.y) + controls.pitch * .48, (waitingForLadder ? 11.45 : 9.35) + controls.dolly * .3)
      : vectors.target.set((mobile ? mobileX : 1.8) + controls.yaw * (mobile ? 2.15 : 3.15) + pointer.x * .34 * parallax, 2.95 + controls.pitch * 1.45 + pointer.y * .12 * parallax, (mobile ? 14.7 : 14.15) + controls.dolly);
    camera.position.lerp(target, 1 - Math.exp(-dt * 2.6));
    const look = p
      ? vectors.look.set(p.x + controls.yaw * .28, p.y + controls.pitch * .2, .4)
      : vectors.look.set((mobile ? (focus === "corner" ? 4.35 : -3.55) : -.45) + controls.yaw * .75, 2.3 + controls.pitch * .52, .2);
    const { current, aim } = vectors;
    camera.getWorldDirection(current);
    aim.copy(look).sub(camera.position).normalize();
    current.lerp(aim, 1 - Math.exp(-dt * 2.9));
    look.copy(camera.position).add(current);
    camera.lookAt(look);
  });
  return null;
}

function AtmosphereRig({ dark, searching, compact }: { dark: boolean; searching: boolean; compact: boolean }) {
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemisphere = useRef<THREE.HemisphereLight>(null);
  const directional = useRef<THREE.DirectionalLight>(null);
  const searchLight = useRef<THREE.SpotLight>(null);
  const ceiling = useRef<THREE.PointLight>(null);
  const fill = useRef<THREE.RectAreaLight>(null);
  const searchTarget = useMemo(() => new THREE.Object3D(), []);
  const { gl, scene } = useThree();
  const palette = useMemo(() => ({
    background: new THREE.Color(dark ? "#120e0c" : "#b8aa91"),
    ambient: new THREE.Color(dark ? "#aa8068" : "#ffe9c9"),
    sky: new THREE.Color(dark ? "#647694" : "#d9edf1"),
    ground: new THREE.Color(dark ? "#6a3723" : "#8d5c3c"),
    sun: new THREE.Color(dark ? "#8f9db8" : "#fff0cf"),
    fill: new THREE.Color(dark ? "#d3a078" : "#ffe4bd"),
  }), [dark]);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    if (!(scene.background instanceof THREE.Color)) scene.background = palette.background.clone();
    if (!(scene.fog instanceof THREE.Fog)) scene.fog = new THREE.Fog(palette.background.clone(), 18, 30);
  }, [gl, palette.background, scene]);
  useFrame((_, dt) => {
    const speed = 1 - Math.exp(-dt * 2.8);
    if (scene.background instanceof THREE.Color) scene.background.lerp(palette.background, speed);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.lerp(palette.background, speed);
      scene.fog.near = THREE.MathUtils.damp(scene.fog.near, 18, 3, dt);
      scene.fog.far = THREE.MathUtils.damp(scene.fog.far, 30, 3, dt);
    }
    if (ambient.current) { ambient.current.intensity = THREE.MathUtils.damp(ambient.current.intensity, dark ? .68 : .85, 3, dt); ambient.current.color.lerp(palette.ambient, speed); }
    if (hemisphere.current) { hemisphere.current.intensity = THREE.MathUtils.damp(hemisphere.current.intensity, dark ? .5 : .75, 3, dt); hemisphere.current.color.lerp(palette.sky, speed); hemisphere.current.groundColor.lerp(palette.ground, speed); }
    if (directional.current) { directional.current.intensity = THREE.MathUtils.damp(directional.current.intensity, dark ? .9 : 2.25, 3, dt); directional.current.color.lerp(palette.sun, speed); }
    if (searchLight.current) searchLight.current.intensity = THREE.MathUtils.damp(searchLight.current.intensity, searching ? 1.5 : .55, 4, dt);
    if (ceiling.current) ceiling.current.intensity = THREE.MathUtils.damp(ceiling.current.intensity, dark ? .65 : .3, 3, dt);
    if (fill.current) { fill.current.intensity = THREE.MathUtils.damp(fill.current.intensity, dark ? .62 : .82, 3, dt); fill.current.color.lerp(palette.fill, speed); }
    gl.toneMappingExposure = THREE.MathUtils.damp(gl.toneMappingExposure, dark ? 1.32 : 1.08, 2.7, dt);
  });
  return <>
    <ambientLight ref={ambient} intensity={dark ? .68 : .85} color={palette.ambient} />
    <hemisphereLight ref={hemisphere} intensity={dark ? .5 : .75} color={palette.sky} groundColor={palette.ground} />
    <directionalLight ref={directional} position={[7, 8, 7]} intensity={dark ? .9 : 2.25} color={palette.sun} castShadow shadow-mapSize={[compact ? 1024 : 2048, compact ? 1024 : 2048]} shadow-bias={-.0005} shadow-normalBias={.025} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={9} shadow-camera-bottom={-7} shadow-camera-near={.5} shadow-camera-far={28} />
    <spotLight ref={searchLight} target={searchTarget} position={[0, 7, 4]} angle={.62} penumbra={.85} intensity={searching ? 1.5 : .55} color="#e9bd79" castShadow={false} />
    <primitive object={searchTarget} />
    <pointLight ref={ceiling} position={[0,5.4,2.5]} intensity={dark ? .65 : .3} color="#e3bd7b" distance={9} decay={2} />
    <rectAreaLight ref={fill} position={[0,3.8,5.2]} rotation={[0,Math.PI,0]} width={14} height={4.5} intensity={dark ? .62 : .82} color={palette.fill} />
  </>;
}

function ShelfBay({ x }: { x: number }) {
  const wood = usePBRSet("dark-wood", [1.1, 2.5]);
  const baySeed = Math.round((x + 6) * 10);
  return <group position={[x, 0, 0]}>
    <RoundedBox args={[3.2, 6.4, .62]} radius={.08} smoothness={3} position={[0, 2.4, .25]} castShadow receiveShadow>
      <meshStandardMaterial {...wood} color="#5a3524" roughness={.7} normalScale={new THREE.Vector2(.28,.28)} />
    </RoundedBox>
    <mesh position={[0, 2.45, .62]}>
      <boxGeometry args={[2.82, 5.92, .12]} />
      <meshStandardMaterial {...wood} color="#251712" roughness={.82} normalScale={new THREE.Vector2(.18,.18)} />
    </mesh>
    {[-.5, 1, 2.5, 4, 5.5].map((y) => <mesh key={y} position={[0, y, .86]} castShadow>
      <boxGeometry args={[3.06, .13, .82]} />
      <meshStandardMaterial {...wood} color="#6b422e" roughness={.66} normalScale={new THREE.Vector2(.25,.25)} />
    </mesh>)}
    <mesh position={[-1.46, 2.45, .82]}><boxGeometry args={[.13, 6.05, .72]} /><meshStandardMaterial {...wood} color="#68402b" roughness={.65} /></mesh>
    <mesh position={[1.46, 2.45, .82]}><boxGeometry args={[.13, 6.05, .72]} /><meshStandardMaterial {...wood} color="#68402b" roughness={.65} /></mesh>
    {[-1.49,1.49].map(side => <group key={`pilaster-${side}`} position={[side,2.47,1.18]}>
      <mesh castShadow><cylinderGeometry args={[.12,.15,5.55,20]} /><meshStandardMaterial {...wood} color="#755039" roughness={.54} /></mesh>
      {[-2.63,-2.48,2.48,2.63].map(y => <mesh key={y} position={[0,y,0]}><torusGeometry args={[.145,.025,8,20]} /><meshStandardMaterial color="#a17a4c" metalness={.1} roughness={.46} /></mesh>)}
      <mesh position={[0,-2.86,0]} castShadow><cylinderGeometry args={[.23,.16,.28,6]} /><meshStandardMaterial {...wood} color="#68412b" roughness={.6} /></mesh>
      <mesh position={[0,2.86,0]} rotation={[0,0,Math.PI]} castShadow><cylinderGeometry args={[.23,.16,.28,6]} /><meshStandardMaterial {...wood} color="#68412b" roughness={.6} /></mesh>
    </group>)}
    {rows.map((y, row) => Array.from({ length: 11 }, (_, slot) => {
      const slotX = -1.22 + slot * .245;
      if ([-.66,-.04,.58].some(interactiveX => Math.abs(slotX - interactiveX) < .14)) return null;
      if ((slot * 7 + row * 11 + baySeed) % 17 === 0 || (slot === 9 && (row + baySeed) % 3 === 0)) return null;
      const height = .78 + ((slot * 7 + row * 3) % 5) * .075;
      const width = .18 + ((slot * 5 + row) % 3) * .035;
      const lean = (slot + row + baySeed) % 9 === 0 ? -.075 : (slot * 2 + row + baySeed) % 13 === 0 ? .06 : 0;
      return <group key={`${row}-${slot}`} position={[slotX, y + height / 2, .94 + ((slot+baySeed)%4)*.008]} rotation={[0, ((slot+row)%5-2)*.006, lean]}>
        <RoundedBox args={[width, height, .42]} radius={.015} smoothness={2} castShadow><meshStandardMaterial color={fillerPalette[(slot + row * 2) % fillerPalette.length]} roughness={.6} /></RoundedBox>
        <mesh position={[width*.51,0,0]}><boxGeometry args={[.012,height*.88,.36]} /><meshStandardMaterial color="#d4c5aa" roughness={.96} /></mesh>
        {(slot + row) % 3 === 0 && <mesh position={[0, height * .22, .216]}><boxGeometry args={[width * .72, .018, .008]} /><meshBasicMaterial color="#c7a56c" /></mesh>}
        {(slot + row) % 4 === 0 && <mesh position={[0, -height * .2, .216]}><boxGeometry args={[width * .72, .012, .008]} /><meshBasicMaterial color="#d0b986" /></mesh>}
      </group>;
    }))}
    {rows.map((y,row)=>(row+baySeed)%3===0 && <group key={`stack-${row}`} position={[1.08,y+.055,1.02]} rotation={[0,.025,0]}>
      {[0,.085,.165].map((sy,i)=><RoundedBox key={sy} args={[.5-i*.05,.07,.46]} radius={.012} smoothness={2} position={[0,sy,0]} rotation={[0,(i-1)*.035,(i-1)*.018]} castShadow>
        <meshStandardMaterial color={fillerPalette[(row*3+i+baySeed)%fillerPalette.length]} roughness={.68} />
      </RoundedBox>)}
    </group>)}
    <mesh position={[0, 5.62, .83]} castShadow><boxGeometry args={[3.48, .22, .9]} /><meshStandardMaterial {...wood} color="#815033" roughness={.58} /></mesh>
    <mesh position={[0,5.77,.87]} castShadow><boxGeometry args={[3.68,.11,1.02]} /><meshStandardMaterial {...wood} color="#6a4029" roughness={.56} /></mesh>
    <mesh position={[0,-.28,.92]} castShadow><boxGeometry args={[3.42,.44,.88]} /><meshStandardMaterial {...wood} color="#5c3725" roughness={.62} /></mesh>
    {[-.77,.77].map(cx=><group key={cx} position={[cx,-.27,1.37]}>
      <RoundedBox args={[1.32,.29,.04]} radius={.035} smoothness={3}><meshStandardMaterial color="#42271d" roughness={.72} /></RoundedBox>
      <mesh position={[0,0,.035]}><torusGeometry args={[.055,.012,8,20]} /><meshStandardMaterial color="#a47d45" metalness={.72} roughness={.2} /></mesh>
    </group>)}
    <group position={[0,5.93,.82]}>
      <mesh position={[-.65,0,0]} rotation={[0,0,.42]} castShadow><boxGeometry args={[1.55,.12,.48]} /><meshStandardMaterial {...wood} color="#613a28" roughness={.62} /></mesh>
      <mesh position={[.65,0,0]} rotation={[0,0,-.42]} castShadow><boxGeometry args={[1.55,.12,.48]} /><meshStandardMaterial {...wood} color="#613a28" roughness={.62} /></mesh>
      <mesh position={[0,.34,.03]}><sphereGeometry args={[.12,16,10]} /><meshStandardMaterial color="#aa824b" metalness={.55} roughness={.3} /></mesh>
    </group>
    {[-1.3, 1.3].map(side => <group key={side} position={[side, -.45, .8]}>
      <mesh rotation={[0, 0, side > 0 ? -.38 : .38]}><boxGeometry args={[.22, .62, .75]} /><meshStandardMaterial color="#6f4128" roughness={.62} /></mesh>
      <mesh position={[0, -.25, .03]}><sphereGeometry args={[.16, 12, 8]} /><meshStandardMaterial color="#5a321f" /></mesh>
    </group>)}
    {[-1.23,1.23].map(side=><group key={`corbel-${side}`} position={[side,5.45,1.25]}>
      <mesh rotation={[0,0,side>0 ? -.7 : .7]} castShadow><boxGeometry args={[.12,.58,.3]} /><meshStandardMaterial {...wood} color="#8b5b39" roughness={.5} /></mesh>
      <mesh position={[0,-.18,.04]}><sphereGeometry args={[.11,18,12]} /><meshStandardMaterial color="#9b7148" roughness={.48} /></mesh>
    </group>)}
  </group>;
}

function RoomBook({ book, index, selected, match, profile, ladder, interaction, reduced, onSelect }: { book: Book; index: number; selected: boolean; match: boolean; profile: Profile; ladder: React.RefObject<LadderMotion>; interaction: React.RefObject<CameraMotion>; reduced: boolean; onSelect: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const spine = useSpineTexture(book);
  const p = positionFor(index);
  const height = .92 + (index % 5) * .07;
  const width = .18 + (index % 4) * .025;
  const restingTilt = index % 11 === 0 ? -.055 : index % 13 === 0 ? .045 : 0;
  useFrame((_, dt) => {
    if (!ref.current) return;
    const canRetrieve = p.row < 2 || Boolean(ladder.current?.arrived && Math.abs((ladder.current?.x ?? -99) - ladderTargetFor(p)) < .08);
    const retrieved = selected && canRetrieve;
    const tz = retrieved ? 2.12 : selected || match ? 1.16 : hovered && !reduced ? 1.04 : .96;
    const speed = reduced ? 22 : 6;
    ref.current.position.z = THREE.MathUtils.damp(ref.current.position.z, tz, speed, dt);
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, p.y + height / 2 + (retrieved && !reduced ? .12 : 0), reduced ? 22 : 7, dt);
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, retrieved && !reduced ? -.26 : 0, reduced ? 22 : 7, dt);
    ref.current.rotation.z = THREE.MathUtils.damp(ref.current.rotation.z, retrieved && !reduced ? -.035 : restingTilt, reduced ? 22 : 8, dt);
    const scale = THREE.MathUtils.damp(ref.current.scale.x, retrieved && !reduced ? 1.06 : 1, reduced ? 22 : 7, dt);
    ref.current.scale.setScalar(scale);
  });
  return <group ref={ref} position={[p.x, p.y + height / 2, .96]} onClick={(e) => { e.stopPropagation(); if (Date.now() >= (interaction.current?.suppressClickUntil || 0)) onSelect(); }}>
    <RoundedBox args={[width, height, .55]} radius={.022} smoothness={3} castShadow>
      <meshStandardMaterial color={book.color} roughness={.62} metalness={.025} emissive={match || selected ? book.accent : "#000000"} emissiveIntensity={match ? .28 : selected ? .14 : 0} />
    </RoundedBox>
    {[-1,1].map(side=><RoundedBox key={side} args={[width, .045, .58]} radius={.012} smoothness={2} position={[0,side*height*.48,0]} castShadow>
      <meshStandardMaterial color={book.color} roughness={.62} metalness={.02} emissive={match || selected ? book.accent : "#000000"} emissiveIntensity={match ? .28 : selected ? .14 : 0} />
    </RoundedBox>)}
    <mesh position={[width * .46,0,.015]}><boxGeometry args={[.018,height*.84,.43]} /><meshStandardMaterial color="#d8cdb6" roughness={.96} /></mesh>
    <RoundedBox args={[width*.92,height*.9,.018]} radius={.015} smoothness={2} position={[0,0,.286]}><meshStandardMaterial map={spine || undefined} color={spine ? "#ffffff" : book.color} roughness={.58} /></RoundedBox>
    <mesh position={[0,height*.31,.288]}><boxGeometry args={[width*.82,.018,.012]} /><meshBasicMaterial color={book.accent} /></mesh>
    <mesh position={[0,-height*.31,.288]}><boxGeometry args={[width*.82,.018,.012]} /><meshBasicMaterial color={book.accent} /></mesh>
    {[-.23,0,.23].map(rib=><mesh key={rib} position={[-width*.405,height*rib,.301]}><boxGeometry args={[width*.18,.035,.025]} /><meshStandardMaterial color={book.accent} metalness={.28} roughness={.38} /></mesh>)}
    {[-.465,.465].map(edge=><mesh key={edge} position={[0,height*edge,.302]}><boxGeometry args={[width*.86,.015,.012]} /><meshStandardMaterial color="#b59056" metalness={.12} roughness={.55} /></mesh>)}
    {book.states[profile].status === "Reading" && <mesh position={[width * .28, height * .47, .33]}>
      <boxGeometry args={[.06, .2, .03]} /><meshBasicMaterial color={profile === "Dan" ? "#a96b4c" : "#c59a62"} />
    </mesh>}
    <mesh position={[0,0,.25]} onPointerOver={(event) => { event.stopPropagation(); setHovered(true); }} onPointerOut={() => setHovered(false)}>
      <boxGeometry args={[Math.max(.36, width + .16), height + .14, .82]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>;
}

function Ladder({ selectedIndex, motion, reduced }: { selectedIndex: number | null; motion: React.RefObject<LadderMotion>; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const wheelRefs = useRef<Array<THREE.Group | null>>([]);
  const previousX = useRef(-3.2);
  const wood = usePBRSet("dark-wood", [1.1, 2.5]);
  const selectedPosition = selectedIndex !== null ? positionFor(selectedIndex) : null;
  const targetX = selectedPosition && selectedPosition.row >= 2 ? ladderTargetFor(selectedPosition) : -3.2;
  useFrame((_, dt) => {
    if (!ref.current || !motion.current) return;
    const step = Math.min(dt, .05);
    const previous = ref.current.position.x;
    let velocity = motion.current.velocity;
    let next = targetX;
    if (!reduced) {
      velocity += (targetX - previous) * 34 * step;
      velocity *= Math.exp(-10.5 * step);
      next = previous + velocity * step;
    } else velocity = 0;
    ref.current.position.x = next;
    ref.current.rotation.z = THREE.MathUtils.damp(ref.current.rotation.z, -.035 - velocity * .008, 7, dt);
    const travelled = next - previousX.current;
    wheelRefs.current.forEach(wheel => { if (wheel) wheel.rotation.z -= travelled / .145; });
    previousX.current = next;
    motion.current.x = next;
    motion.current.velocity = velocity;
    motion.current.targetX = targetX;
    motion.current.arrived = Math.abs(next - targetX) < .045 && Math.abs(velocity) < .09;
  });
  return <group ref={ref} position={[-3.2, -.48, 2.43]} rotation={[-.16, 0, -.035]}>
    {[-.5,.5].map(side=><group key={side} position={[side,3.08,0]}>
      <RoundedBox args={[.15,6.16,.2]} radius={.038} smoothness={5} castShadow><meshStandardMaterial {...wood} color="#86502f" roughness={.46} normalScale={new THREE.Vector2(.34,.34)} /></RoundedBox>
      <mesh position={[0,3.08,0]}><sphereGeometry args={[.1,24,16]} /><meshStandardMaterial {...wood} color="#9d6841" roughness={.43} /></mesh>
      {[-2.78,-1.4,0,1.4,2.78].map(y=><mesh key={y} position={[side*.04,y,.112]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.019,.019,.038,14]} /><meshStandardMaterial color="#c09557" metalness={.78} roughness={.2} /></mesh>)}
    </group>)}
    {Array.from({ length: 14 }, (_, i) => <group key={i} position={[0, .26 + i * .425, .02]}>
      <RoundedBox args={[1.1,.1,.235]} radius={.02} smoothness={4} castShadow><meshStandardMaterial {...wood} color="#9b6038" roughness={.5} /></RoundedBox>
      <mesh position={[0,.057,.035]}><boxGeometry args={[.96,.014,.19]} /><meshStandardMaterial color="#c1844d" roughness={.46} /></mesh>
      {[-.42,.42].map(bolt=><mesh key={bolt} position={[bolt,0,.122]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.018,.018,.018,10]} /><meshStandardMaterial color="#b0874f" metalness={.72} roughness={.25} /></mesh>)}
    </group>)}
    <mesh position={[0, 6.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.11, .11, 1.24, 28]} /><meshStandardMaterial color="#a47a43" metalness={.72} roughness={.2} /></mesh>
    {[-.48, .48].map((x,index) => <group key={x} ref={node => { wheelRefs.current[index] = node; }} position={[x, .05, .015]}>
      <mesh><torusGeometry args={[.145, .04, 14, 32]} /><meshStandardMaterial color="#221b17" metalness={.42} roughness={.4} /></mesh>
      <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.042, .042, .2, 18]} /><meshStandardMaterial color="#b28a50" metalness={.72} roughness={.22} /></mesh>
      <mesh position={[0,.17,-.01]}><boxGeometry args={[.17,.29,.1]} /><meshStandardMaterial color="#8d6c42" metalness={.68} roughness={.28} /></mesh>
    </group>)}
    {[-.46, .46].map(x => <group key={x} position={[x, 6.1, -.015]}>
      <mesh rotation={[0,Math.PI/2,0]}><torusGeometry args={[.18, .035, 12, 32, Math.PI * 1.35]} /><meshStandardMaterial color="#b38a52" metalness={.76} roughness={.18} /></mesh>
      <mesh position={[0,.04,.15]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.058,.058,.13,18]} /><meshStandardMaterial color="#d1ae6c" metalness={.82} roughness={.15} /></mesh>
      <mesh position={[0,-.2,.01]}><boxGeometry args={[.16,.3,.08]} /><meshStandardMaterial color="#9c7645" metalness={.68} roughness={.24} /></mesh>
    </group>)}
    <group position={[0,3.08,-.125]}>
      {[-.56,.56].map(x=><mesh key={x} position={[x,0,0]} rotation={[0,0,x>0?-.07:.07]}><boxGeometry args={[.065,5.62,.05]} /><meshStandardMaterial color="#9b7246" metalness={.5} roughness={.3} /></mesh>)}
      {[.7,2.05,3.4,4.75,5.55].map(y=><mesh key={y} position={[0,y-3.08,0]}><boxGeometry args={[1.14,.035,.055]} /><meshStandardMaterial color="#aa7e4c" metalness={.5} roughness={.28} /></mesh>)}
    </group>
    <mesh position={[0,6.12,-.03]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.03,.03,1.05,16]} /><meshStandardMaterial color="#d3af6c" metalness={.82} roughness={.18} /></mesh>
  </group>;
}

function FireSheet({ reduced }: { reduced: boolean }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
      }
      void main(){
        vec2 uv=vUv;
        float n=noise(vec2(uv.x*4.0,uv.y*3.0-uTime*2.2));
        n+=.45*noise(vec2(uv.x*8.0+2.0,uv.y*7.0-uTime*3.7));
        float sway=sin(uv.y*8.0+uTime*3.0)*.055*(uv.y+.15);
        float width=mix(.43,.035,pow(uv.y,.72));
        float body=smoothstep(width,width-.09,abs(uv.x-.5+sway+n*.025));
        body*=smoothstep(.02,.14,uv.y)*smoothstep(1.04,.72,uv.y+n*.10);
        vec3 ember=vec3(1.0,.13,.015), gold=vec3(1.0,.48,.055), core=vec3(1.0,.93,.52);
        vec3 color=mix(core,mix(gold,ember,smoothstep(.25,1.0,uv.y)),smoothstep(.0,.18,abs(uv.x-.5)));
        gl_FragColor=vec4(color,body*(.72+n*.2));
      }
    `,
  }), []);
  useFrame(({ clock }) => { material.uniforms.uTime.value = reduced ? 1.5 : clock.elapsedTime; });
  material.side = THREE.DoubleSide;
  material.toneMapped = false;
  return <group position={[0,.63,.59]}>
    <mesh material={material}><planeGeometry args={[1.2,1.15,1,12]} /></mesh>
    <mesh material={material} position={[-.08,-.05,-.035]} rotation={[0,.42,.03]} scale={[.72,.88,.72]}><planeGeometry args={[1.2,1.15,1,12]} /></mesh>
    <mesh material={material} position={[.1,-.1,-.06]} rotation={[0,-.38,-.04]} scale={[.58,.72,.58]}><planeGeometry args={[1.2,1.15,1,12]} /></mesh>
  </group>;
}

function FireEmbers({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const count = reduced ? 8 : 24;
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      phases[i] = ((i * 37) % count) / count;
      speeds[i] = .18 + (i % 7) * .025;
    }
    return { positions, phases, speeds };
  }, [count]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const rise = (data.phases[i] + t * data.speeds[i]) % 1;
      data.positions[i * 3] = Math.sin(t * 1.7 + i * 2.31) * (.08 + rise * .24);
      data.positions[i * 3 + 1] = .24 + rise * 1.28;
      data.positions[i * 3 + 2] = .61 + Math.cos(t * 1.2 + i) * .045;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return <points ref={ref}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[data.positions,3]} /></bufferGeometry>
    <pointsMaterial color="#ff9b45" size={reduced ? .018 : .028} sizeAttenuation transparent opacity={.82} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </points>;
}

function Fireplace({ dark, reduced }: { dark: boolean; reduced: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  const flames = useRef<THREE.Group>(null);
  const stone = usePBRSet("stone", [2.2, 2]);
  const wood = usePBRSet("dark-wood", [1.1, 2.5]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker = Math.sin(t * 2.17) * .22 + Math.sin(t * 5.43 + 1.2) * .12 + Math.sin(t * 11.7) * .055;
    if (light.current) light.current.intensity = (dark ? 5.25 : 1.7) + flicker * (reduced ? .18 : 1);
    if (flames.current) {
      flames.current.scale.y = 1 + flicker * (reduced ? .018 : .1);
      flames.current.rotation.y = flicker * (reduced ? .006 : .045);
    }
  });
  return <group position={[-4.9, -.2, 1.55]}>
    <mesh position={[0, .9, 0]} castShadow><boxGeometry args={[2.25, 2.12, .72]} /><meshStandardMaterial {...stone} color="#8b8173" roughness={.94} normalScale={new THREE.Vector2(.42,.42)} /></mesh>
    {[-.78,-.26,.26,.78].flatMap((x,col)=>[.18,.57,.96,1.35,1.74].map((y,row)=><mesh key={`${x}-${y}`} position={[x+(row%2? .13:0),y,.375]} castShadow>
      <RoundedBox args={[.48,.34,.055]} radius={.018} smoothness={2}><meshStandardMaterial {...stone} color={col%2 ? "#81786b" : "#94897a"} roughness={.96} normalScale={new THREE.Vector2(.45,.45)} /></RoundedBox>
    </mesh>))}
    <mesh position={[0, .72, .4]}><boxGeometry args={[1.48, 1.25, .18]} /><meshStandardMaterial color="#170b07" roughness={1} /></mesh>
    {[-.56,-.28,0,.28,.56].map((x,i) => <mesh key={x} position={[x,.28 + (i%2)*.12,.505]}><boxGeometry args={[.245,.1,.04]} /><meshStandardMaterial color="#593022" roughness={.9} /></mesh>)}
    {[-.92,.92].map(x => <mesh key={x} position={[x, .86, .44]} castShadow><boxGeometry args={[.24, 1.85, .38]} /><meshStandardMaterial {...stone} color="#756a5c" roughness={.9} normalScale={new THREE.Vector2(.35,.35)} /></mesh>)}
    {Array.from({length:9},(_,i)=>{const a=Math.PI*(i/8);return <mesh key={i} position={[Math.cos(a)*.72,1.2+Math.sin(a)*.55,.5]} rotation={[0,0,a-Math.PI/2]} castShadow><boxGeometry args={[.28,.17,.22]} /><meshStandardMaterial {...stone} color="#8c8070" roughness={.92} /></mesh>})}
    <mesh position={[0, 1.98, .03]} castShadow><boxGeometry args={[2.65, .24, .96]} /><meshStandardMaterial {...wood} color="#5c3928" roughness={.7} /></mesh>
    <mesh position={[0,2.13,.08]} castShadow><boxGeometry args={[2.9,.09,1.02]} /><meshStandardMaterial {...wood} color="#744a31" roughness={.58} /></mesh>
    <mesh position={[0,2.2,.1]} castShadow><boxGeometry args={[2.6,.06,.95]} /><meshStandardMaterial color="#a07b4d" metalness={.06} roughness={.55} /></mesh>
    <mesh position={[0, -.03, .3]} castShadow><boxGeometry args={[2.65, .18, 1.18]} /><meshStandardMaterial {...stone} color="#655d52" roughness={.95} /></mesh>
    {[-.72,.68].map((x,i)=><group key={x} position={[x,2.28,.12]}>
      <mesh><cylinderGeometry args={[.045,.055,.48,14]} /><meshStandardMaterial color="#d7c9aa" roughness={.72} /></mesh>
      <mesh position={[0,.27,0]}><sphereGeometry args={[.055,12,8]} /><meshBasicMaterial color="#ffd88d" /></mesh>
      <pointLight position={[0,.2,.25]} intensity={dark ? .35 : .06} distance={2.2} color="#ffc875" />
      <mesh position={[0,-.28,0]}><cylinderGeometry args={[.12,.18,.08,18]} /><meshStandardMaterial color="#8b6a3e" metalness={.6} roughness={.3} /></mesh>
    </group>)}
    <FireSheet reduced={reduced} />
    <FireEmbers reduced={reduced} />
    <group position={[0,.33,.62]}>
      <mesh position={[0,-.05,-.04]} rotation={[-Math.PI/2,0,0]}><cylinderGeometry args={[.46,.52,.06,24]} /><meshStandardMaterial color="#201713" roughness={1} /></mesh>
      {Array.from({length:13},(_,i)=>{const a=i*2.399;const radius=.08+.032*i;return <mesh key={i} position={[Math.cos(a)*radius,.02+(i%3)*.025,Math.sin(a)*radius]}><dodecahedronGeometry args={[.045+(i%3)*.012,0]} /><meshStandardMaterial color={i%3===0?"#d75b28":"#6d2618"} emissive={i%3===0?"#e45b22":"#2e0c07"} emissiveIntensity={dark?2.8:.8} roughness={.9} /></mesh>})}
    </group>
    <group ref={flames} />
    {[-.28,.26].map((x,i)=><mesh key={x} position={[x,.27,.57]} rotation={[Math.PI/2,0,i ? -.28 : .3]}><cylinderGeometry args={[.075,.1,.72,9]} /><meshStandardMaterial color="#3b1c12" roughness={1} /></mesh>)}
    <group position={[0,.52,.66]}>
      {[-.42,-.14,.14,.42].map(x=><mesh key={x} position={[x,0,0]} rotation={[0,0,.07*x]}><boxGeometry args={[.025,.66,.035]} /><meshStandardMaterial color="#25211f" metalness={.78} roughness={.34} /></mesh>)}
      {[-.25,.25].map(y=><mesh key={y} position={[0,y,0]}><boxGeometry args={[1.05,.025,.035]} /><meshStandardMaterial color="#25211f" metalness={.78} roughness={.34} /></mesh>)}
      <mesh position={[-.56,-.39,0]} rotation={[0,0,.22]}><boxGeometry args={[.05,.25,.05]} /><meshStandardMaterial color="#211d1b" metalness={.75} /></mesh>
      <mesh position={[.56,-.39,0]} rotation={[0,0,-.22]}><boxGeometry args={[.05,.25,.05]} /><meshStandardMaterial color="#211d1b" metalness={.75} /></mesh>
    </group>
    <pointLight ref={light} position={[0, .9, 1.3]} color="#ff8b45" distance={8.5} decay={2} castShadow={false} />
  </group>;
}

function ReadingCorner({ dark }: { dark: boolean }) {
  return <group position={[4.7, 0, 2.2]}>
    <DetailedModel src="/models/ArmChair_01/model.gltf" position={[-.25,-.48,-.15]} rotation={[0,-.18,0]} scale={1.65} />
    <DetailedModel src="/models/gothic_coffee_table/model.gltf" position={[1.45,-.5,.12]} rotation={[0,-.18,0]} scale={.58} />
    <DetailedModel src="/models/vintage_oil_lamp/model.gltf" position={[1.44,.02,.08]} scale={.92} />
    <pointLight position={[1.44,1.03,.5]} color="#ffd18a" intensity={dark ? 7.2 : 1.55} distance={6.8} decay={2} castShadow={false} />
    <mesh position={[1.44,1.02,.08]}><sphereGeometry args={[.055,16,12]} /><meshBasicMaterial color="#fff0bd" /></mesh>
    <group position={[1.18, .38, .06]} rotation={[0, -.2, -.08]}>
      <mesh position={[-.19,0,0]} rotation={[0,.18,.04]} castShadow><boxGeometry args={[.4, .035, .52]} /><meshStandardMaterial color="#e3d5b4" roughness={.92} /></mesh>
      <mesh position={[.19,0,0]} rotation={[0,-.18,-.04]} castShadow><boxGeometry args={[.4, .035, .52]} /><meshStandardMaterial color="#e3d5b4" roughness={.92} /></mesh>
      <mesh position={[0,.025,0]}><boxGeometry args={[.025,.02,.5]} /><meshStandardMaterial color="#8d6040" roughness={.65} /></mesh>
      {[-.13,.13].map(x=>Array.from({length:5},(_,i)=><mesh key={`${x}-${i}`} position={[x,.022,-.16+i*.07]}><boxGeometry args={[.19,.004,.008]} /><meshBasicMaterial color="#8a7660" transparent opacity={.5} /></mesh>))}
    </group>
    <DetailedModel src="/models/potted_plant_04/model.gltf" position={[2.5,-.5,-.6]} rotation={[0,.3,0]} scale={3.25} />
  </group>;
}

function Rug() {
  const textile = usePBRSet("rug", [3.4, 2.1]);
  return <group position={[.45, -.545, 3.65]} rotation={[-Math.PI / 2, 0, 0]}>
    <RoundedBox args={[7.6, 4.5, .055]} radius={.13} smoothness={3} receiveShadow><meshStandardMaterial {...textile} color="#7d3b38" roughness={.96} normalScale={new THREE.Vector2(.62,.62)} /></RoundedBox>
    <mesh position={[0,0,.032]}><planeGeometry args={[7.1,4.02]} /><meshStandardMaterial {...textile} color="#9b5a4b" roughness={.95} normalScale={new THREE.Vector2(.58,.58)} /></mesh>
    <mesh position={[0,0,.039]}><ringGeometry args={[1.25,1.34,8]} /><meshStandardMaterial color="#c29a66" roughness={.88} /></mesh>
    <mesh position={[0,0,.041]} rotation={[0,0,Math.PI/4]}><ringGeometry args={[.56,.64,4]} /><meshStandardMaterial color="#4d2827" roughness={.92} /></mesh>
    {[-3.12,3.12].map(x => <mesh key={x} position={[x,0,.041]}><planeGeometry args={[.075,3.65]} /><meshStandardMaterial color="#c9a06e" roughness={.9} /></mesh>)}
    {[-1.7,1.7].map(y => <mesh key={y} position={[0,y,.041]}><planeGeometry args={[6.35,.075]} /><meshStandardMaterial color="#c9a06e" roughness={.9} /></mesh>)}
    {Array.from({length:34},(_,i)=><mesh key={`fringe-a-${i}`} position={[-3.55+i*.215,-2.3,.01]} rotation={[0,0,(i%3-1)*.08]}><cylinderGeometry args={[.008,.012,.23,6]} /><meshStandardMaterial color="#bca37d" roughness={1} /></mesh>)}
    {Array.from({length:34},(_,i)=><mesh key={`fringe-b-${i}`} position={[-3.55+i*.215,2.3,.01]} rotation={[0,0,(i%3-1)*.08]}><cylinderGeometry args={[.008,.012,.23,6]} /><meshStandardMaterial color="#bca37d" roughness={1} /></mesh>)}
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
  const stone = usePBRSet("stone", [2.2, 2]);
  const wood = usePBRSet("dark-wood", [1.1, 2.5]);
  return <>
    <mesh position={[0, 3, -1.42]} receiveShadow><planeGeometry args={[19,8]} /><meshStandardMaterial {...stone} color={dark ? "#5c5248" : "#9b8c78"} roughness={.96} normalScale={new THREE.Vector2(.4,.4)} /></mesh>
    <mesh position={[-8.48,2.8,3]} rotation={[0,Math.PI/2,0]} receiveShadow><planeGeometry args={[9,7.3]} /><meshStandardMaterial {...stone} color={dark ? "#514840" : "#8a7967"} roughness={.96} normalScale={new THREE.Vector2(.42,.42)} side={THREE.DoubleSide} /></mesh>
    <mesh position={[8.48,2.8,3]} rotation={[0,-Math.PI/2,0]} receiveShadow><planeGeometry args={[9,7.3]} /><meshStandardMaterial {...stone} color={dark ? "#514840" : "#8a7967"} roughness={.96} normalScale={new THREE.Vector2(.42,.42)} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0,6.45,3]} rotation={[Math.PI/2,0,0]} receiveShadow><planeGeometry args={[17,9]} /><meshStandardMaterial color={dark ? "#211a17" : "#9b8c78"} roughness={.9} side={THREE.DoubleSide} /></mesh>
    {[-7.8,-3.9,0,3.9,7.8].map(x => <mesh key={x} position={[x,6.28,3]}><boxGeometry args={[.22,.28,9]} /><meshStandardMaterial {...wood} color="#4d2d20" roughness={.7} /></mesh>)}
    {[-.8,2.1,5].map(z => <mesh key={z} position={[0,6.26,z]}><boxGeometry args={[17,.25,.18]} /><meshStandardMaterial {...wood} color="#5b3725" roughness={.68} /></mesh>)}
    <mesh position={[0,5.95,-.72]}><boxGeometry args={[17,.22,.36]} /><meshStandardMaterial color="#6b412a" roughness={.6} /></mesh>
    <mesh position={[0,-.12,-.55]}><boxGeometry args={[17,.4,.28]} /><meshStandardMaterial color="#5c3827" roughness={.65} /></mesh>
    {[-7.9,7.9].map(x => <mesh key={x} position={[x,2.8,-.72]}><boxGeometry args={[.34,6.2,.36]} /><meshStandardMaterial color="#69412b" roughness={.62} /></mesh>)}
    <SideWindow dark={dark} />
  </>;
}

function FloatingCandles({ dark, reduced }: { dark: boolean; reduced: boolean }) {
  const positions: Array<[number, number, number, number]> = [
    [-4.2,4.35,3.5,.08],[-2.6,5.05,4.1,-.05],[2.8,4.55,3.8,.04],[4.25,5.15,4.5,-.06],[.95,5.3,5.0,.03],
  ];
  return <group>
    {positions.map(([x,y,z,tilt],i)=>{
      const candle = <group position={[x,y,z]} rotation={[0,0,tilt]}>
        <mesh castShadow><cylinderGeometry args={[.055,.07,.5,16]} /><meshStandardMaterial color="#dfd1ae" roughness={.82} /></mesh>
        <mesh position={[0,.255,0]}><cylinderGeometry args={[.008,.008,.08,8]} /><meshStandardMaterial color="#2b211b" roughness={1} /></mesh>
        <mesh position={[.047,.08,.058]} rotation={[0,0,.35]}><sphereGeometry args={[.025,8,6]} /><meshStandardMaterial color="#c8b991" roughness={.9} /></mesh>
        <mesh position={[0,.285,0]}><coneGeometry args={[.052,.17,14]} /><meshBasicMaterial color="#ffbf5b" transparent opacity={.9} blending={THREE.AdditiveBlending} /></mesh>
        <mesh position={[0,.3,0]}><sphereGeometry args={[.035,10,8]} /><meshBasicMaterial color="#fff0ae" /></mesh>
        {(i===0 || i===3) && <pointLight position={[0,.28,.1]} intensity={dark ? .42 : .04} distance={2.8} decay={2} color="#ffca74" />}
      </group>;
      return reduced ? <group key={i}>{candle}</group> : <Float key={i} speed={.45+i*.07} floatIntensity={.07} rotationIntensity={.03}>{candle}</Float>;
    })}
  </group>;
}

function Scene({ books, theme, selectedId, search, profile, onSelect, focus, motion, ladder, reduced, compact }: Props & { focus: "shelves" | "corner"; motion: React.RefObject<CameraMotion>; ladder: React.RefObject<LadderMotion>; reduced: boolean; compact: boolean }) {
  const dark = theme === "dark";
  const floor = usePBRSet("floor", [5, 4]);
  const placements = useMemo(() => createRoomPlacements(books), [books]);
  const selectedIndex = selectedId ? placements.get(selectedId) ?? null : null;
  const q = search.trim().toLowerCase();
  const matches = useMemo(() => new Set(books.filter(b => q && `${b.title} ${b.author} ${b.genre} ${b.series || ""}`.toLowerCase().includes(q)).map(b => b.id)), [books, q]);
  return <>
    <AtmosphereRig dark={dark} searching={Boolean(q)} compact={compact} />
    <Environment resolution={compact ? 64 : 128} frames={1}>
      <Lightformer form="rect" intensity={dark ? 1.1 : 2.2} color={dark ? "#d49b76" : "#fff0d0"} position={[0,7,6]} rotation={[Math.PI/2,0,0]} scale={[12,8,1]} />
      <Lightformer form="rect" intensity={dark ? .7 : 1.35} color={dark ? "#7f91b2" : "#c6e3eb"} position={[8,3,2]} rotation={[0,-Math.PI/2,0]} scale={[5,4,1]} />
      <Lightformer form="ring" intensity={dark ? .55 : .35} color="#e3ad73" position={[-5,2,3]} rotation={[0,Math.PI/2,0]} scale={2.5} />
    </Environment>
    <CameraRig selectedIndex={selectedIndex} focus={focus} motion={motion} ladder={ladder} />
    <mesh position={[0, -.61, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[19, 16]} /><meshStandardMaterial {...floor} color={dark ? "#5a3827" : "#8a6145"} roughness={.78} normalScale={new THREE.Vector2(.32,.32)} />
    </mesh>
    {Array.from({length:22},(_,i)=><RoundedBox key={`floor-plank-${i}`} args={[.84,.055,15.9]} radius={.012} smoothness={2} position={[-8.82+i*.84,-.575,1]} receiveShadow>
      <meshStandardMaterial {...floor} color={dark ? (i%4===0?"#543222":"#62402d") : (i%4===0?"#80563e":"#95694b")} roughness={.72+(i%3)*.025} normalScale={new THREE.Vector2(.34,.34)} />
    </RoundedBox>)}
    <Architecture dark={dark} />
    <Rug />
    <FloatingCandles dark={dark} reduced={reduced} />
    {bays.map(x => <ShelfBay key={x} x={x} />)}
    {bays.map(x => <pointLight key={`shelf-light-${x}`} position={[x,5.45,2.15]} intensity={dark ? .48 : .08} color="#efb96f" distance={4.4} decay={2} />)}
    {books.map((book, index) => <RoomBook key={book.id} book={book} index={placements.get(book.id) ?? index} selected={selectedId === book.id} match={matches.has(book.id)} profile={profile} ladder={ladder} interaction={motion} reduced={reduced} onSelect={() => onSelect(book.id)} />)}
    <mesh position={[0, 5.65, 1.45]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.055, .055, 14.4, 16]} /><meshStandardMaterial color="#a9804b" metalness={.65} roughness={.25} /></mesh>
    <Ladder selectedIndex={selectedIndex} motion={ladder} reduced={reduced} />
    <Fireplace dark={dark} reduced={reduced} />
    <ReadingCorner dark={dark} />
    <DetailedModel src="/models/vintage_grandfather_clock_01/model.gltf" position={[7.18,-.52,.34]} rotation={[0,-.18,0]} scale={1.06} />
    <group position={[0,5.9,3.8]}>
      <mesh><cylinderGeometry args={[.035,.035,.8,12]} /><meshStandardMaterial color="#8f6d42" metalness={.65} roughness={.25} /></mesh>
      <mesh position={[0,-.46,0]}><torusGeometry args={[.46,.025,8,30]} /><meshStandardMaterial color="#9c7547" metalness={.7} roughness={.22} /></mesh>
      {Array.from({length:6},(_,i)=>{const a=i/6*Math.PI*2;return <group key={i} position={[Math.cos(a)*.45,-.45,Math.sin(a)*.45]}>
        <mesh><sphereGeometry args={[.065,12,8]} /><meshStandardMaterial color="#d2b275" emissive="#c18a45" emissiveIntensity={dark ? .8 : .15} /></mesh>
        <pointLight intensity={dark ? .22 : .08} distance={2.4} color="#ffd99a" />
      </group>})}
    </group>
    <ContactShadows position={[0,-.555,2.2]} scale={17} opacity={dark ? .48 : .36} blur={2.4} far={5.5} color="#140b07" frames={selectedId ? (compact ? 14 : 28) : 1} />
    {!q && !reduced && <Sparkles count={compact ? 6 : dark ? 18 : 10} scale={[13, 5, 5]} size={.65} speed={.1} opacity={.15} color="#f6ddb2" />}
  </>;
}

export default function LibraryRoom(props: Props) {
  const [focus, setFocus] = useState<"shelves" | "corner">("shelves");
  const [cameraDirty, setCameraDirty] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [compact, setCompact] = useState(false);
  const motion = useRef<CameraMotion>({ yaw: 0, pitch: 0, dolly: 0, velocityYaw: 0, velocityPitch: 0, dragging: false, suppressClickUntil: 0, reduced: false });
  const ladder = useRef<LadderMotion>({ x: -3.2, velocity: 0, arrived: true, targetX: -3.2 });
  const gesture = useRef({ x: 0, y: 0, moved: false, pinchDistance: 0, pointers: new Map<number, { x: number; y: number }>() });
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactMedia = window.matchMedia("(max-width: 860px)");
    const update = () => { setReduced(media.matches); motion.current.reduced = media.matches; };
    const updateCompact = () => setCompact(compactMedia.matches);
    update(); updateCompact(); media.addEventListener("change", update); compactMedia.addEventListener("change", updateCompact);
    return () => { media.removeEventListener("change", update); compactMedia.removeEventListener("change", updateCompact); };
  }, []);
  const resetCamera = () => {
    Object.assign(motion.current, { yaw: 0, pitch: 0, dolly: 0, velocityYaw: 0, velocityPitch: 0 });
    setCameraDirty(false);
  };
  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture.current.x = event.clientX; gesture.current.y = event.clientY; gesture.current.moved = false;
    motion.current.dragging = true; setDragging(true);
  };
  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!gesture.current.pointers.has(event.pointerId)) return;
    const previous = gesture.current.pointers.get(event.pointerId)!;
    gesture.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gesture.current.pointers.size >= 2) {
      const [a,b] = [...gesture.current.pointers.values()];
      const distance = Math.hypot(a.x-b.x,a.y-b.y);
      if (gesture.current.pinchDistance) motion.current.dolly = THREE.MathUtils.clamp(motion.current.dolly - (distance-gesture.current.pinchDistance)*.012,-2.5,2.8);
      gesture.current.pinchDistance = distance; gesture.current.moved = true; setCameraDirty(true); return;
    }
    const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
    if (Math.abs(dx)+Math.abs(dy) > 1) gesture.current.moved = true;
    const yawDelta = -dx * (event.pointerType === "touch" ? .0042 : .0032);
    const pitchDelta = dy * (event.pointerType === "touch" ? .0036 : .0028);
    motion.current.yaw = THREE.MathUtils.clamp(motion.current.yaw + yawDelta,-1.2,1.2);
    motion.current.pitch = THREE.MathUtils.clamp(motion.current.pitch + pitchDelta,-.52,.58);
    motion.current.velocityYaw = yawDelta; motion.current.velocityPitch = pitchDelta;
    if (gesture.current.moved) setCameraDirty(true);
  };
  const pointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    gesture.current.pointers.delete(event.pointerId);
    if (gesture.current.pointers.size < 2) gesture.current.pinchDistance = 0;
    if (!gesture.current.pointers.size) {
      motion.current.dragging = false; setDragging(false);
      if (gesture.current.moved) motion.current.suppressClickUntil = Date.now()+220;
    }
  };
  const changeFocus = (next: "shelves" | "corner") => { setFocus(next); resetCamera(); props.onClear(); };
  return <div className={`room-canvas ${dragging ? "is-dragging" : ""}`} aria-label="Interactive three-dimensional library room. Drag to look around, pinch or scroll to move closer." tabIndex={0}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}
    onWheel={event => { if ((event.target as HTMLElement).closest("button")) return; motion.current.dolly = THREE.MathUtils.clamp(motion.current.dolly + event.deltaY*.0025,-2.5,2.8); setCameraDirty(true); }}>
    <Canvas shadows dpr={compact ? [1, 1.25] : [1, 1.7]} camera={{ position: [1.8, 2.95, 14.15], fov: 42 }} gl={{ antialias: true, powerPreference: "high-performance" }} onPointerMissed={() => { if (Date.now() >= motion.current.suppressClickUntil) props.onClear(); }}>
      <Scene {...props} focus={focus} motion={motion} ladder={ladder} reduced={reduced} compact={compact} />
    </Canvas>
    <div className="room-plaque">D &amp; L <span>OUR LIBRARY</span></div>
    {cameraDirty && <button className="room-camera-reset" onClick={resetCamera}>Reset view</button>}
    <div className="room-mobile-focus" aria-label="Room viewpoint">
      <button className={focus === "shelves" ? "active" : ""} aria-pressed={focus === "shelves"} onClick={() => changeFocus("shelves")}>Fire &amp; ladder</button>
      <button className={focus === "corner" ? "active" : ""} aria-pressed={focus === "corner"} onClick={() => changeFocus("corner")}>Reading corner</button>
    </div>
  </div>;
}

useGLTF.preload("/models/ArmChair_01/model.gltf");
useGLTF.preload("/models/gothic_coffee_table/model.gltf");
useGLTF.preload("/models/vintage_oil_lamp/model.gltf");
useGLTF.preload("/models/potted_plant_04/model.gltf");
useGLTF.preload("/models/vintage_grandfather_clock_01/model.gltf");
