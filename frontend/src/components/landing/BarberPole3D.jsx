/**
 * Modelo 3D interactivo — Poste de barbería clásico
 * Usa React Three Fiber para renderizado WebGL
 */

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Textura de franjas clásicas (blanco, rojo, azul)
function createStripeTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const stripeHeight = 16;
  const colors = ['#ffffff', '#b91c1c', '#1e40af'];
  for (let y = 0; y < canvas.height; y += stripeHeight) {
    const i = Math.floor(y / stripeHeight) % 3;
    ctx.fillStyle = colors[i];
    ctx.fillRect(0, y, canvas.width, stripeHeight);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 8);
  return texture;
}

function BarberPole() {
  const poleRef = useRef();
  const stripeTexture = useMemo(() => createStripeTexture(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (poleRef.current) {
      poleRef.current.rotation.y = t * 0.5;
    }
    if (stripeTexture?.offset) {
      stripeTexture.offset.y = t * 0.15;
    }
  });

  return (
    <group>
      {/* Base */}
      <mesh position={[0, -1.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.45, 0.15, 16]} />
        <meshStandardMaterial color="#1c1917" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Poste con franjas (barber pole clásico) */}
      <mesh ref={poleRef} position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 2.1, 32]} />
        <meshStandardMaterial
          map={stripeTexture}
          color={stripeTexture ? undefined : '#c9a962'}
          metalness={0.1}
          roughness={0.7}
        />
      </mesh>

      {/* Top cap (dorado) */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#c9a962" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 4, 2]} intensity={0.4} />
      <pointLight position={[0, 2, 3]} intensity={0.5} color="#c9a962" />
      <BarberPole />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
        autoRotate
        autoRotateSpeed={0.8}
      />
    </>
  );
}

function Loader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-stone-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  );
}

export default function BarberPole3D() {
  return (
    <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden border border-stone-200/80 shadow-card bg-stone-950">
      <Suspense fallback={<Loader />}>
        <Canvas
          camera={{ position: [0, 0, 3.5], fov: 45 }}
          gl={{ antialias: true, alpha: false }}
          className="w-full h-full"
        >
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  );
}
