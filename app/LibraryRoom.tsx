"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Float, RoundedBox, Sparkles, useGLTF, useTexture } from "@react-three/drei";
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
const rows = [-0.42, 1.08, 2.58, 4.08];

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

function CameraRig({ selectedId, focus }: { selectedId: number | null; focus: "shelves" | "corner" }) {
  const { camera, pointer, size } = useThree();
  useFrame((_, dt) => {
    const index = selectedId ? selectedId - 1 : -1;
    const p = index >= 0 ? positionFor(index) : null;
    const mobile = size.width < 700;
    const mobileX = focus === "corner" ? 4.45 : -3.55;
    const target = p ? new THREE.Vector3(p.x * .42, Math.max(2.05, p.y), 9.35) : new THREE.Vector3((mobile ? mobileX : 1.8) + pointer.x * .34, 2.95 + pointer.y * .12, mobile ? 14.7 : 14.15);
    camera.position.lerp(target, 1 - Math.exp(-dt * 2.6));
    const look = p ? new THREE.Vector3(p.x, p.y, .4) : new THREE.Vector3(mobile ? (focus === "corner" ? 4.35 : -3.55) : -.45, 2.3, .2);
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
    gl.toneMappingExposure = dark ? 1.32 : 1.08;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [dark, gl]);
  return null;
}

function ShelfBay({ x }: { x: number }) {
  const wood = usePBRSet("dark-wood", [1.1, 2.5]);
  const baySeed = Math.round((x + 6) * 10);
  const palette = ["#6e2f2b", "#344d4c", "#9b7040", "#253847", "#765447", "#4c3a55", "#b69a6a", "#863e32"];
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
      if ((slot * 7 + row * 11 + baySeed) % 17 === 0 || (slot === 9 && (row + baySeed) % 3 === 0)) return null;
      const height = .78 + ((slot * 7 + row * 3) % 5) * .075;
      const width = .18 + ((slot * 5 + row) % 3) * .035;
      const lean = (slot + row + baySeed) % 9 === 0 ? -.075 : (slot * 2 + row + baySeed) % 13 === 0 ? .06 : 0;
      return <group key={`${row}-${slot}`} position={[-1.22 + slot * .245, y + height / 2, .94 + ((slot+baySeed)%4)*.008]} rotation={[0, ((slot+row)%5-2)*.006, lean]}>
        <RoundedBox args={[width, height, .42]} radius={.015} smoothness={2} castShadow><meshStandardMaterial color={palette[(slot + row * 2) % palette.length]} roughness={.6} /></RoundedBox>
        <mesh position={[width*.51,0,0]}><boxGeometry args={[.012,height*.88,.36]} /><meshStandardMaterial color="#d4c5aa" roughness={.96} /></mesh>
        {Array.from({length:4},(_,page)=><mesh key={page} position={[width*.519,-height*.3+page*height*.19,.015]}><boxGeometry args={[.004,.006,.33]} /><meshBasicMaterial color="#8f8068" transparent opacity={.45} /></mesh>)}
        {(slot + row) % 3 === 0 && <mesh position={[0, height * .22, .216]}><boxGeometry args={[width * .72, .018, .008]} /><meshBasicMaterial color="#c7a56c" /></mesh>}
        {(slot + row) % 4 === 0 && <mesh position={[0, -height * .2, .216]}><boxGeometry args={[width * .72, .012, .008]} /><meshBasicMaterial color="#d0b986" /></mesh>}
      </group>;
    }))}
    {rows.map((y,row)=>(row+baySeed)%3===0 && <group key={`stack-${row}`} position={[.76,y+.055,1.02]} rotation={[0,.025,0]}>
      {[0,.085,.165].map((sy,i)=><RoundedBox key={sy} args={[.72-i*.08,.07,.46]} radius={.012} smoothness={2} position={[0,sy,0]} rotation={[0,(i-1)*.035,(i-1)*.018]} castShadow>
        <meshStandardMaterial color={palette[(row*3+i+baySeed)%palette.length]} roughness={.68} />
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

function RoomBook({ book, index, selected, match, profile, onSelect }: { book: Book; index: number; selected: boolean; match: boolean; profile: Profile; onSelect: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const spine = useSpineTexture(book);
  const p = positionFor(index);
  const height = .92 + (index % 5) * .07;
  const width = .34 + (index % 3) * .07;
  const restingTilt = index % 11 === 0 ? -.055 : index % 13 === 0 ? .045 : 0;
  useFrame((_, dt) => {
    if (!ref.current) return;
    const tz = selected ? 1.45 : match ? 1.12 : .96;
    ref.current.position.z = THREE.MathUtils.damp(ref.current.position.z, tz, 6, dt);
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, selected ? -.11 : 0, 7, dt);
    ref.current.rotation.z = THREE.MathUtils.damp(ref.current.rotation.z, selected ? 0 : restingTilt, 8, dt);
  });
  return <group ref={ref} position={[p.x, p.y + height / 2, .96]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
    <RoundedBox args={[width, height, .55]} radius={.022} smoothness={3} castShadow>
      <meshStandardMaterial color={book.color} roughness={.62} metalness={.025} emissive={match || selected ? book.accent : "#000000"} emissiveIntensity={match ? .28 : selected ? .14 : 0} />
    </RoundedBox>
    {[-1,1].map(side=><RoundedBox key={side} args={[width, .045, .58]} radius={.012} smoothness={2} position={[0,side*height*.48,0]} castShadow>
      <meshStandardMaterial color={book.color} roughness={.62} metalness={.02} emissive={match || selected ? book.accent : "#000000"} emissiveIntensity={match ? .28 : selected ? .14 : 0} />
    </RoundedBox>)}
    <mesh position={[width * .46,0,.015]}><boxGeometry args={[.018,height*.84,.43]} /><meshStandardMaterial color="#d8cdb6" roughness={.96} /></mesh>
    {Array.from({length:7},(_,page)=><mesh key={page} position={[width*.472,-height*.35+page*height*.115,.01]}><boxGeometry args={[.006,.004,.4]} /><meshBasicMaterial color="#8f8068" transparent opacity={.42} /></mesh>)}
    <RoundedBox args={[width*.92,height*.9,.018]} radius={.015} smoothness={2} position={[0,0,.286]}><meshStandardMaterial map={spine || undefined} color={spine ? "#ffffff" : book.color} roughness={.58} /></RoundedBox>
    <mesh position={[0,height*.31,.288]}><boxGeometry args={[width*.82,.018,.012]} /><meshBasicMaterial color={book.accent} /></mesh>
    <mesh position={[0,-height*.31,.288]}><boxGeometry args={[width*.82,.018,.012]} /><meshBasicMaterial color={book.accent} /></mesh>
    {[-.23,0,.23].map(rib=><mesh key={rib} position={[-width*.405,height*rib,.301]}><boxGeometry args={[width*.18,.035,.025]} /><meshStandardMaterial color={book.accent} metalness={.28} roughness={.38} /></mesh>)}
    {[-.465,.465].map(edge=><mesh key={edge} position={[0,height*edge,.302]}><boxGeometry args={[width*.86,.015,.012]} /><meshStandardMaterial color="#b59056" metalness={.12} roughness={.55} /></mesh>)}
    {book.states[profile].status === "Reading" && <mesh position={[width * .28, height * .47, .33]}>
      <boxGeometry args={[.06, .2, .03]} /><meshBasicMaterial color={profile === "Dan" ? "#a96b4c" : "#c59a62"} />
    </mesh>}
  </group>;
}

function Ladder({ selectedId }: { selectedId: number | null }) {
  const ref = useRef<THREE.Group>(null);
  const wood = usePBRSet("dark-wood", [1.1, 2.5]);
  const targetX = selectedId ? positionFor(selectedId - 1).x : -3.2;
  useFrame((_, dt) => {
    if (ref.current) ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, targetX, 3.8, dt);
  });
  return <group ref={ref} position={[-3.2, 0, 2.05]} rotation={[0, 0, -.105]}>
    {[-.5,.5].map(side=><group key={side} position={[side,2.05,0]}>
      <RoundedBox args={[.145,4.3,.18]} radius={.035} smoothness={4} castShadow><meshStandardMaterial {...wood} color="#8d5833" roughness={.48} normalScale={new THREE.Vector2(.32,.32)} /></RoundedBox>
      <mesh position={[0,2.15,0]}><sphereGeometry args={[.095,20,14]} /><meshStandardMaterial {...wood} color="#9d6841" roughness={.45} /></mesh>
      {[-1.87,-.85,.18,1.21].map(y=><mesh key={y} position={[side*.04,y,.105]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.018,.018,.035,12]} /><meshStandardMaterial color="#b68a4c" metalness={.78} roughness={.22} /></mesh>)}
    </group>)}
    {Array.from({ length: 10 }, (_, i) => <group key={i} position={[0, .25 + i * .4, .02]}>
      <RoundedBox args={[1.08,.095,.22]} radius={.018} smoothness={3} castShadow><meshStandardMaterial {...wood} color="#9c6339" roughness={.52} /></RoundedBox>
      <mesh position={[0,.052,.02]}><boxGeometry args={[.94,.012,.18]} /><meshStandardMaterial color="#bb8150" roughness={.5} /></mesh>
      {[-.42,.42].map(bolt=><mesh key={bolt} position={[bolt,0,.122]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.018,.018,.018,10]} /><meshStandardMaterial color="#b0874f" metalness={.72} roughness={.25} /></mesh>)}
    </group>)}
    <mesh position={[0, 4.22, -.05]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.105, .105, 1.22, 24]} /><meshStandardMaterial color="#a47a43" metalness={.72} roughness={.2} /></mesh>
    <mesh position={[0,4.22,-.05]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[.112,.016,8,30]} /><meshStandardMaterial color="#d0a767" metalness={.78} roughness={.18} /></mesh>
    {[-.48, .48].map(x => <group key={x} position={[x, -.04, .03]}>
      <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.145, .038, 12, 28]} /><meshStandardMaterial color="#241c18" metalness={.45} roughness={.38} /></mesh>
      <mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.04, .04, .2, 16]} /><meshStandardMaterial color="#b28a50" metalness={.7} /></mesh>
      <mesh position={[0,.16,-.02]}><boxGeometry args={[.16,.28,.09]} /><meshStandardMaterial color="#8d6c42" metalness={.68} roughness={.28} /></mesh>
    </group>)}
    {[-.46, .46].map(x => <group key={x} position={[x, 4.28, -.18]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.17, .035, 10, 28, Math.PI * 1.25]} /><meshStandardMaterial color="#b38a52" metalness={.72} roughness={.2} /></mesh>
      <mesh position={[0,-.03,.14]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.055,.055,.12,16]} /><meshStandardMaterial color="#d1ae6c" metalness={.8} roughness={.16} /></mesh>
    </group>)}
    <group position={[0,2.15,-.12]}>
      {[-.56,.56].map(x=><mesh key={x} position={[x,0,0]} rotation={[0,0,x>0?-.1:.1]}><boxGeometry args={[.07,3.65,.045]} /><meshStandardMaterial color="#9b7246" metalness={.5} roughness={.3} /></mesh>)}
      {[.45,1.55,2.65,3.7].map(y=><mesh key={y} position={[0,y-2.15,0]}><boxGeometry args={[1.14,.035,.05]} /><meshStandardMaterial color="#aa7e4c" metalness={.5} roughness={.28} /></mesh>)}
    </group>
  </group>;
}

function FireSheet() {
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
  useFrame(({ clock }) => { material.uniforms.uTime.value = clock.elapsedTime; });
  return <mesh position={[0,.63,.59]} material={material}><planeGeometry args={[1.2,1.15]} /></mesh>;
}

function Fireplace({ dark }: { dark: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  const flames = useRef<THREE.Group>(null);
  const stone = usePBRSet("stone", [2.2, 2]);
  const wood = usePBRSet("dark-wood", [1.1, 2.5]);
  useFrame(({ clock }) => {
    if (light.current) light.current.intensity = (dark ? 4.8 : 1.5) + Math.sin(clock.elapsedTime * 9) * .28 + Math.sin(clock.elapsedTime * 4.3) * .18;
    if (flames.current) {
      flames.current.scale.y = 1 + Math.sin(clock.elapsedTime * 8.7) * .08;
      flames.current.rotation.y = Math.sin(clock.elapsedTime * 4.1) * .035;
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
    <FireSheet />
    <group position={[0,.33,.62]}>
      <mesh position={[0,-.05,-.04]} rotation={[-Math.PI/2,0,0]}><cylinderGeometry args={[.46,.52,.06,24]} /><meshStandardMaterial color="#201713" roughness={1} /></mesh>
      {Array.from({length:13},(_,i)=>{const a=i*2.399;const radius=.08+.032*i;return <mesh key={i} position={[Math.cos(a)*radius,.02+(i%3)*.025,Math.sin(a)*radius]}><dodecahedronGeometry args={[.045+(i%3)*.012,0]} /><meshStandardMaterial color={i%3===0?"#d75b28":"#6d2618"} emissive={i%3===0?"#e45b22":"#2e0c07"} emissiveIntensity={dark?2.8:.8} roughness={.9} /></mesh>})}
    </group>
    <group ref={flames} scale={[.65,.55,.65]}>
      {[[-.28, .49], [0, .46], [.28, .51]].map(([x, y], i) => <Float key={i} speed={2 + i} floatIntensity={.055}>
        <mesh position={[x, y, .54]} rotation={[0, 0, i === 1 ? 0 : .13 * (i ? -1 : 1)]}><coneGeometry args={[.17 + i * .018, .5 + i * .07, 18]} /><meshBasicMaterial color={i === 1 ? "#ffd989" : "#e86d33"} transparent opacity={.82} blending={THREE.AdditiveBlending} /></mesh>
      </Float>)}
    </group>
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

function FloatingCandles({ dark }: { dark: boolean }) {
  const positions: Array<[number, number, number, number]> = [
    [-4.2,4.35,3.5,.08],[-2.6,5.05,4.1,-.05],[2.8,4.55,3.8,.04],[4.25,5.15,4.5,-.06],[.95,5.3,5.0,.03],
  ];
  return <group>
    {positions.map(([x,y,z,tilt],i)=><Float key={i} speed={.45+i*.07} floatIntensity={.07} rotationIntensity={.03}>
      <group position={[x,y,z]} rotation={[0,0,tilt]}>
        <mesh castShadow><cylinderGeometry args={[.055,.07,.5,16]} /><meshStandardMaterial color="#dfd1ae" roughness={.82} /></mesh>
        <mesh position={[0,.285,0]}><coneGeometry args={[.052,.17,14]} /><meshBasicMaterial color="#ffbf5b" transparent opacity={.9} blending={THREE.AdditiveBlending} /></mesh>
        <mesh position={[0,.3,0]}><sphereGeometry args={[.035,10,8]} /><meshBasicMaterial color="#fff0ae" /></mesh>
        {(i===0 || i===3) && <pointLight position={[0,.28,.1]} intensity={dark ? .42 : .04} distance={2.8} decay={2} color="#ffca74" />}
      </group>
    </Float>)}
  </group>;
}

function Scene({ books, theme, selectedId, search, profile, onSelect, focus }: Props & { focus: "shelves" | "corner" }) {
  const dark = theme === "dark";
  const floor = usePBRSet("floor", [5, 4]);
  const q = search.trim().toLowerCase();
  const matches = useMemo(() => new Set(books.filter(b => q && `${b.title} ${b.author}`.toLowerCase().includes(q)).map(b => b.id)), [books, q]);
  return <>
    <color attach="background" args={[dark ? "#120e0c" : "#b8aa91"]} />
    <fog attach="fog" args={[dark ? "#120e0c" : "#b8aa91", 9, 23]} />
    <ambientLight intensity={dark ? .68 : .85} color={dark ? "#aa8068" : "#ffe9c9"} />
    <hemisphereLight intensity={dark ? .5 : .75} color={dark ? "#647694" : "#d9edf1"} groundColor={dark ? "#6a3723" : "#8d5c3c"} />
    <directionalLight position={[7, 8, 7]} intensity={dark ? .9 : 2.25} color={dark ? "#8f9db8" : "#fff0cf"} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-.0005} />
    <spotLight position={[0, 7, 4]} angle={.62} penumbra={.85} intensity={q ? 1.5 : .55} color="#e9bd79" castShadow={false} />
    <pointLight position={[0,5.4,2.5]} intensity={dark ? .65 : .3} color="#e3bd7b" distance={9} decay={2} />
    <rectAreaLight position={[0,3.8,5.2]} rotation={[0,Math.PI,0]} width={14} height={4.5} intensity={dark ? .62 : .82} color={dark ? "#d3a078" : "#ffe4bd"} />
    <CameraRig selectedId={selectedId} focus={focus} />
    <FilmicTone dark={dark} />
    <mesh position={[0, -.61, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[19, 16]} /><meshStandardMaterial {...floor} color={dark ? "#5a3827" : "#8a6145"} roughness={.78} normalScale={new THREE.Vector2(.32,.32)} />
    </mesh>
    {Array.from({length:22},(_,i)=><RoundedBox key={`floor-plank-${i}`} args={[.84,.055,15.9]} radius={.012} smoothness={2} position={[-8.82+i*.84,-.575,1]} receiveShadow>
      <meshStandardMaterial {...floor} color={dark ? (i%4===0?"#543222":"#62402d") : (i%4===0?"#80563e":"#95694b")} roughness={.72+(i%3)*.025} normalScale={new THREE.Vector2(.34,.34)} />
    </RoundedBox>)}
    <Architecture dark={dark} />
    <Rug />
    <FloatingCandles dark={dark} />
    {bays.map(x => <ShelfBay key={x} x={x} />)}
    {bays.map(x => <pointLight key={`shelf-light-${x}`} position={[x,5.45,2.15]} intensity={dark ? .48 : .08} color="#efb96f" distance={4.4} decay={2} />)}
    {books.map((book, index) => <RoomBook key={book.id} book={book} index={index} selected={selectedId === book.id} match={matches.has(book.id)} profile={profile} onSelect={() => onSelect(book.id)} />)}
    <mesh position={[0, 5.65, 1.45]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.055, .055, 14.4, 16]} /><meshStandardMaterial color="#a9804b" metalness={.65} roughness={.25} /></mesh>
    <Ladder selectedId={selectedId} />
    <Fireplace dark={dark} />
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
    <ContactShadows position={[0,-.555,2.2]} scale={17} opacity={dark ? .48 : .36} blur={2.4} far={5.5} color="#140b07" frames={1} />
    {!q && <Sparkles count={dark ? 22 : 12} scale={[13, 5, 5]} size={.7} speed={.12} opacity={.18} color="#f6ddb2" />}
  </>;
}

export default function LibraryRoom(props: Props) {
  const [focus, setFocus] = useState<"shelves" | "corner">("shelves");
  return <div className="room-canvas" aria-label="Interactive three-dimensional library room">
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [1.8, 2.95, 14.15], fov: 42 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <Scene {...props} focus={focus} />
    </Canvas>
    <div className="room-plaque">D &amp; L <span>OUR LIBRARY</span></div>
    <div className="room-mobile-focus" aria-label="Room viewpoint">
      <button className={focus === "shelves" ? "active" : ""} onClick={() => setFocus("shelves")}>Fire &amp; ladder</button>
      <button className={focus === "corner" ? "active" : ""} onClick={() => setFocus("corner")}>Reading corner</button>
    </div>
  </div>;
}

useGLTF.preload("/models/ArmChair_01/model.gltf");
useGLTF.preload("/models/gothic_coffee_table/model.gltf");
useGLTF.preload("/models/vintage_oil_lamp/model.gltf");
useGLTF.preload("/models/potted_plant_04/model.gltf");
useGLTF.preload("/models/vintage_grandfather_clock_01/model.gltf");
