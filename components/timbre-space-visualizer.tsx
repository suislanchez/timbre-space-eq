"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, Grid } from "@react-three/drei"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import ParticleField from "./particle-field"
import AxisLabels from "./axis-labels"
import SpectralOverlay from "./spectral-overlay"
import { useAudioStore } from "@/lib/audio-store"
import { useRef, useState, useEffect } from "react"

export default function TimbreSpaceVisualizer() {
  const showSpectralOverlay = useAudioStore((state) => state.showSpectralOverlay)
  const controlsRef = useRef<any>()
  const [controlsEnabled, setControlsEnabled] = useState(true)
  const [webglContextLost, setWebglContextLost] = useState(false)
  const [canvasKey, setCanvasKey] = useState(0)

  const handleContextLost = (event: Event) => {
    event.preventDefault()
    console.warn("[v0] WebGL context lost - attempting recovery...")
    setWebglContextLost(true)
  }

  const handleContextRestored = () => {
    console.log("[v0] WebGL context restored")
    setWebglContextLost(false)
    // Force re-render by updating key
    setCanvasKey((prev) => prev + 1)
  }

  useEffect(() => {
    return () => {
      // Cleanup if needed
    }
  }, [])

  return (
    <div className="w-full h-full absolute inset-0">
      {webglContextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-50">
          <div className="text-center p-4">
            <p className="text-foreground mb-2">WebGL context lost</p>
            <p className="text-muted-foreground text-sm">The 3D visualization will resume automatically...</p>
          </div>
        </div>
      )}
      <Canvas
        key={canvasKey}
        camera={{ position: [8, 6, 8], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          canvas.addEventListener("webglcontextlost", handleContextLost)
          canvas.addEventListener("webglcontextrestored", handleContextRestored)
          
          // Also handle WebGL2 context events
          canvas.addEventListener("contextlost", handleContextLost)
          canvas.addEventListener("contextrestored", handleContextRestored)
        }}
        onPointerMissed={() => {
          setControlsEnabled(true)
        }}
        style={{ width: "100%", height: "100%" }}
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
    </div>
  )
}
