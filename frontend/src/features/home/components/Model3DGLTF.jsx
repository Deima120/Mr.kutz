/**
 * Visor de modelo 3D en formato GLTF/GLB
 * Carga modelos desde public/modelos/
 */

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';

function Model({ url, scale = 1 }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={scale} />;
}

function Scene({ modelUrl, scale, autoRotate }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 4, 2]} intensity={0.4} />
      <pointLight position={[0, 2, 3]} intensity={0.5} color="#c9a962" />
      <Model url={modelUrl} scale={scale} />
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2}
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
      />
    </>
  );
}

function Loader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  );
}

export default function Model3DGLTF({ url, scale = 1, autoRotate = true }) {
  return (
    <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden border border-stone-200/80 shadow-card bg-white">
      <Suspense fallback={<Loader />}>
        <Canvas
          camera={{ position: [0, 0, 3], fov: 45 }}
          gl={{ antialias: true, alpha: false }}
          className="w-full h-full"
        >
          <color attach="background" args={['#ffffff']} />
          <Scene modelUrl={url} scale={scale} autoRotate={autoRotate} />
        </Canvas>
      </Suspense>
    </div>
  );
}
