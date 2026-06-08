import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function FloatingFood3D({ position, color, scale = 1, floatSpeed = 1, rotSpeed = 1 }: { position: [number, number, number]; color: string; scale?: number; floatSpeed?: number; rotSpeed?: number }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.position.y = position[1] + Math.sin(t * floatSpeed) * 0.3;
    meshRef.current.rotation.y = t * rotSpeed;
  });

  return (
    <group ref={meshRef} position={position} scale={scale}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>
    </group>
  );
}
