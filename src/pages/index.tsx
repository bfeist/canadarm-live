import styles from "./index.module.css";

import React, { Suspense, useEffect } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader";
import * as THREE from "three";

const Scene = (): JSX.Element => {
  return (
    <div className={styles.scene}>
      <Canvas>
        <ambientLight intensity={0.25} />
        <directionalLight position={[-1000, 1000, 1000]} intensity={1} />
        <gridHelper args={[50, 10]} />
        <Suspense fallback={null}>
          <Model />
        </Suspense>
        <PerspectiveCamera makeDefault position={[-100, 20, 5]} />
        <OrbitControls
          target={[0, 30, 0]}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
};

function Model() {
  const modelRef = React.useRef<THREE.Object3D>();
  const { scene: daemodel } = useLoader(ColladaLoader, "models/canadarm2Vertical.dae");

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshPhongMaterial({ color: 0xffffff });
        }
      });
    }
  }, []);

  daemodel.position.set(0, 3, 0);
  daemodel.rotation.x = THREE.MathUtils.degToRad(180);

  return <primitive object={daemodel} ref={modelRef} />;
}

export default Scene;
