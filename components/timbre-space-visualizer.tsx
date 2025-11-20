"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, Grid } from "@react-three/drei"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import ParticleField from "./particle-field"
import AxisLabels from "./axis-labels"
import SpectralOverlay from "./spectral-overlay"
import { useAudioStore } from "@/lib/audio-store"
import { useRef, useState } from "react"

export default function TimbreSpaceVisualizer() {
  const showSpectralOverlay = useAudioStore((state) => state.showSpectralOverlay)
  const controlsRef = useRef<any>()
  const [controlsEnabled, setControlsEnabled] = useState(true)

  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      onPointerMissed={() => {
        setControlsEnabled(true)
      }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      {/* Environment */}
      <Environment preset="night" />
      <fog attach="fog" args={["#000000", 10, 30]} />

      {/* Grid for spatial reference */}
      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a1a2e"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2a2a4e"
        fadeDistance={25}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={true}
      />

      {/* Axis labels */}
      <AxisLabels />

      {showSpectralOverlay && <SpectralOverlay />}

      {/* Main particle field */}
      <ParticleField />

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enabled={controlsEnabled}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        minDistance={5}
        maxDistance={20}
      />

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom intensity={1.2} luminanceThreshold={0.3} luminanceSmoothing={0.9} />
      </EffectComposer>
    </Canvas>
  )
}
