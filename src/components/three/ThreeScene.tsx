"use client";

import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Box, Sphere, Cylinder, ContactShadows, Text, Environment } from "@react-three/drei";
import * as THREE from "three";

function AnimatedBuilding({
  position,
  height,
  color,
  delay,
}: {
  position: [number, number, number];
  height: number;
  color: string;
  delay: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.3 + delay) * 0.15;
  });
  return (
    <Float speed={1.5} rotationIntensity={0} floatIntensity={0.2} floatingRange={[-0.3, 0.3]}>
      <group ref={ref} position={position}>
        <Box args={[1.2, height, 1.2]} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
        </Box>
        <Box args={[1.4, 0.1, 1.4]} position={[0, height / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
        </Box>
      </group>
    </Float>
  );
}

function Ground() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });
  return (
    <group>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#e8e4df" roughness={0.9} metalness={0} />
      </mesh>
      <ContactShadows position={[0, -2.48, 0]} scale={30} opacity={0.25} blur={2} color="#3a3028" />
    </group>
  );
}

function DeliveryBike({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const angle = t * 0.3 + position[0] * 0.1;
    ref.current.position.x = Math.cos(angle) * 6;
    ref.current.position.z = Math.sin(angle) * 6;
    ref.current.rotation.y = angle + Math.PI / 2;
  });
  return (
    <Float speed={3} rotationIntensity={0} floatIntensity={0.1}>
      <group ref={ref} position={position}>
        <Cylinder args={[0.35, 0.35, 0.15, 16]} rotation={[Math.PI / 2, 0, 0]} position={[-0.4, 0, 0]}>
          <meshStandardMaterial color="#333" roughness={0.3} metalness={0.7} />
        </Cylinder>
        <Cylinder args={[0.35, 0.35, 0.15, 16]} rotation={[Math.PI / 2, 0, 0]} position={[0.4, 0, 0]}>
          <meshStandardMaterial color="#333" roughness={0.3} metalness={0.7} />
        </Cylinder>
        <Box args={[0.8, 0.5, 1]}>
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
        </Box>
        <Sphere args={[0.18]} position={[0, 0.35, 0]}>
          <meshStandardMaterial color="#f9d76e" roughness={0.2} metalness={0.5} />
        </Sphere>
      </group>
    </Float>
  );
}

function GlowingPackage({
  position,
  color,
  delay,
}: {
  position: [number, number, number];
  color: string;
  delay: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = position[1] + Math.sin(t * 2 + delay) * 0.5;
    ref.current.rotation.y = t + delay;
  });
  return (
    <Float speed={2} rotationIntensity={0} floatIntensity={0.3}>
      <group ref={ref} position={position}>
        <Sphere args={[0.2]} castShadow>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.2} metalness={0.8} />
        </Sphere>
        <Sphere args={[0.4]} position={[0, 0.4, 0]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.4} metalness={0.6} transparent opacity={0.7} />
        </Sphere>
      </group>
    </Float>
  );
}

function LocalWalaText({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={1.5} floatIntensity={0.3} rotationIntensity={0}>
      <group position={position}>
        <Text
          font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff"
          fontSize={0.6}
          color="#FF6B00"
          position={[0, 0.5, 0]}
          anchorX="center"
          anchorY="middle"
        >
          LocalWala
        </Text>
        <Text
          font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff"
          fontSize={0.3}
          color="#666"
          position={[0, 0.1, 0]}
          anchorX="center"
          anchorY="middle"
        >
          FOOD
        </Text>
      </group>
    </Float>
  );
}

function CameraController({ enabled }: { enabled?: boolean }) {
  return (
    <OrbitControls
      enableZoom={enabled}
      enablePan={false}
      enableRotate={enabled}
      minDistance={6}
      maxDistance={18}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 2.2}
      autoRotate
      autoRotateSpeed={0.3}
      enableDamping
      dampingFactor={0.05}
      target={[0, -0.5, 0]}
    />
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[8, 12, 5]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-4, 4, -2]} intensity={0.4} color="#ffaa55" />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#FF6B00" distance={12} decay={2} />
      <spotLight position={[0, 8, 0]} angle={0.4} penumbra={0.5} intensity={0.8} color="#ffffff" castShadow />
    </>
  );
}

const buildingConfigs = [
  { position: [-4.5, 0, -5] as [number, number, number], height: 2.5, color: "#d4ccc4", delay: 0 },
  { position: [-2.8, 0, -5.5] as [number, number, number], height: 3.8, color: "#c8bf b6", delay: 0.3 },
  { position: [-1, 0, -4.8] as [number, number, number], height: 2.2, color: "#ddd5cd", delay: 0.6 },
  { position: [1.2, 0, -6] as [number, number, number], height: 4.5, color: "#c2b9b0", delay: 0.9 },
  { position: [3.5, 0, -5.2] as [number, number, number], height: 3, color: "#d8d0c7", delay: 1.2 },
  { position: [5.2, 0, -4.5] as [number, number, number], height: 2.8, color: "#cec6bd", delay: 1.5 },
  { position: [-5, 0, -2.5] as [number, number, number], height: 3.2, color: "#d0c8bf", delay: 0.1 },
  { position: [-3.2, 0, -3] as [number, number, number], height: 4.8, color: "#bfb6ad", delay: 0.4 },
  { position: [-1, 0, -2.2] as [number, number, number], height: 2.6, color: "#ddd5cc", delay: 0.7 },
  { position: [1.2, 0, -2.8] as [number, number, number], height: 3.5, color: "#cbc3ba", delay: 1 },
  { position: [3.5, 0, -2.4] as [number, number, number], height: 5.2, color: "#c0b8af", delay: 1.3 },
  { position: [5, 0, -3] as [number, number, number], height: 2.4, color: "#d5cdc4", delay: 1.6 },
  { position: [-5.5, 0, 0.5] as [number, number, number], height: 3.8, color: "#c4bcb3", delay: 0.2 },
  { position: [-3.2, 0, -0.3] as [number, number, number], height: 4.2, color: "#c9c1b8", delay: 0.5 },
  { position: [-1, 0, 0.2] as [number, number, number], height: 2.9, color: "#ddd5cc", delay: 0.8 },
  { position: [1.2, 0, 0] as [number, number, number], height: 3.6, color: "#c6beb5", delay: 1.1 },
  { position: [3.5, 0, 0.3] as [number, number, number], height: 4.1, color: "#c3bbb2", delay: 1.4 },
  { position: [5.2, 0, -0.5] as [number, number, number], height: 3, color: "#d2cac1", delay: 1.7 },
  { position: [-4.5, 0, 3] as [number, number, number], height: 2.7, color: "#d0c8bf", delay: 0.15 },
  { position: [-2.5, 0, 2.8] as [number, number, number], height: 4, color: "#c7bfb6", delay: 0.45 },
  { position: [-0.5, 0, 3] as [number, number, number], height: 3.3, color: "#cbc3ba", delay: 0.75 },
  { position: [2, 0, 2.6] as [number, number, number], height: 4.7, color: "#c0b8af", delay: 1.05 },
  { position: [4.2, 0, 3] as [number, number, number], height: 2.5, color: "#d6cec5", delay: 1.35 },
  { position: [-5.2, 0, 5.5] as [number, number, number], height: 3.5, color: "#c4bcb3", delay: 0.35 },
  { position: [-2.8, 0, 5.5] as [number, number, number], height: 4.4, color: "#bfb7ae", delay: 0.65 },
  { position: [-0.5, 0, 5.5] as [number, number, number], height: 3.9, color: "#c8c0b7", delay: 0.95 },
  { position: [2.2, 0, 5.5] as [number, number, number], height: 5, color: "#bbb3aa", delay: 1.25 },
  { position: [4.5, 0, 5.5] as [number, number, number], height: 3.1, color: "#d3cbc2", delay: 1.55 },
  { position: [-5.5, 0, 1] as [number, number, number], height: 2.3, color: "#ded6cd", delay: 0.05 },
  { position: [5.5, 0, 1] as [number, number, number], height: 3.7, color: "#c5bdb4", delay: 0.25 },
];

const packageColors = ["#FF6B00", "#FFB347", "#FF8C42", "#FFD700"];
const bikeColors = ["#ffffff", "#ff4444", "#444444", "#2563eb"];

function FilteredScene() {
  return (
    <>
      <Lights />
      <Ground />
      <LocalWalaText position={[0, 3.5, 0]} />
      <Float speed={1.2} floatIntensity={0.3} rotationIntensity={0.1}>
        <group position={[0, -1, 0]}>
          {buildingConfigs.map((cfg, i) => (
            <AnimatedBuilding key={i} {...cfg} />
          ))}
          <AnimatedBuilding position={[-6.5, 0, 0]} height={2.1} color="#c0b8af" delay={1.8} />
          <AnimatedBuilding position={[6.8, 0, 0]} height={3.9} color="#cbc3ba" delay={2.1} />
          <AnimatedBuilding position={[0, 0, -8]} height={4.6} color="#b8b0a7" delay={0.5} />
        </group>
      </Float>
      {[0, 1.2, 2.4, 3.6].map((phase, i) => (
        <DeliveryBike key={i} position={[0, -1.5, 0]} color={bikeColors[i % bikeColors.length]} />
      ))}
      {packageColors.map((color, i) => (
        <GlowingPackage key={i} position={[i * 1.5 - 2.25, -1, 0]} color={color} delay={i * 1.5} />
      ))}
      <CameraController />
      <Environment preset="city" />
    </>
  );
}

export default function ThreeScene() {
  return (
    <div className="absolute inset-0 h-full w-full">
      <Canvas
        shadows
        camera={{ position: [9, 7, 9], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <FilteredScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
