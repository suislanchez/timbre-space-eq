"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, Grid } from "@react-three/drei"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import ParticleField from "./particle-field"
import AxisLabels from "./axis-labels"
import SpectralOverlay from "./spectral-overlay"
import WaterPlane from "./water-plane"
import { useAudioStore } from "@/lib/audio-store"
import { useRef, useState, useEffect } from "react"

export default function TimbreSpaceVisualizer() {
  const showSpectralOverlay = useAudioStore((state) => state.showSpectralOverlay)
  const showWater = useAudioStore((state) => state.showWater)
  const controlsRef = useRef<any>()
  const [controlsEnabled, setControlsEnabled] = useState(true)
  const [webglContextLost, setWebglContextLost] = useState(false)
  const [contextReady, setContextReady] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const handleContextLost = (event: Event) => {
    const webglEvent = event as WebGLContextEvent
    // Only handle if context is actually lost (not during initialization)
    if (contextReady && webglEvent.preventDefault) {
      webglEvent.preventDefault()
      console.warn("[v0] WebGL context lost - attempting recovery...")
      setWebglContextLost(true)
      setContextReady(false) // Mark context as not ready when lost
    } else {
      // During initialization, don't show the error message
      if (webglEvent.preventDefault) {
        webglEvent.preventDefault()
      }
      // Silently handle - context will be validated in onCreated
    }
  }

  const handleContextRestored = () => {
    console.log("[v0] WebGL context restored")
    setWebglContextLost(false)
    // Re-validate context and mark as ready
    if (canvasRef.current) {
      const context = canvasRef.current.getContext("webgl2") || 
                     canvasRef.current.getContext("webgl") || 
                     canvasRef.current.getContext("experimental-webgl")
      if (context && "getContextAttributes" in context) {
        try {
          const attrs = context.getContextAttributes()
          if (attrs) {
            setContextReady(true)
          }
        } catch (e) {
          console.warn("[v0] Error validating context attributes:", e)
        }
      }
    }
  }

  useEffect(() => {
    return () => {
      // Cleanup event listeners if canvas still exists
      if (canvasRef.current) {
        canvasRef.current.removeEventListener("webglcontextlost", handleContextLost)
        canvasRef.current.removeEventListener("webglcontextrestored", handleContextRestored)
        canvasRef.current.removeEventListener("contextlost", handleContextLost)
        canvasRef.current.removeEventListener("contextrestored", handleContextRestored)
      }
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
        camera={{ position: [8, 6, 8], fov: 60 }}
        gl={{ 
          antialias: true, 
          alpha: false,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={({ gl }) => {
          if (!gl || !gl.domElement) {
            console.warn("[v0] WebGL renderer not properly initialized")
            return
          }
          
          // Use setTimeout to ensure context is fully initialized
          // This prevents EffectComposer from accessing context before it's ready
          setTimeout(() => {
            try {
              const canvas = gl.domElement
              canvasRef.current = canvas
              
              // Try to get context from renderer first (react-three/fiber way)
              let context: WebGLRenderingContext | WebGL2RenderingContext | null = null
              try {
                // react-three/fiber's gl.getContext() method
                context = (gl as any).getContext() || 
                         canvas.getContext("webgl2") || 
                         canvas.getContext("webgl") || 
                         canvas.getContext("experimental-webgl")
              } catch (e) {
                // Fallback to canvas.getContext
                context = canvas.getContext("webgl2") || 
                         canvas.getContext("webgl") || 
                         canvas.getContext("experimental-webgl")
              }
              
              if (context) {
                // Validate that getContextAttributes() works before marking as ready
                // This is what EffectComposer will try to access
                if (typeof context.getContextAttributes === "function") {
                  try {
                    const attrs = context.getContextAttributes()
                    if (attrs && typeof attrs.alpha !== "undefined") {
                      // Context is valid and accessible
                      setContextReady(true)
                      
                      // Add context loss/restore listeners only after validation
                      canvas.addEventListener("webglcontextlost", handleContextLost, { once: false })
                      canvas.addEventListener("webglcontextrestored", handleContextRestored, { once: false })
                      
                      // Also handle WebGL2 context events (these fire for both WebGL1 and WebGL2)
                      canvas.addEventListener("contextlost", handleContextLost, { once: false })
                      canvas.addEventListener("contextrestored", handleContextRestored, { once: false })
                    }
                  } catch (attrError) {
                    console.warn("[v0] Error accessing context attributes:", attrError)
                    // Retry after a short delay
                    setTimeout(() => {
                      try {
                        const attrs = context?.getContextAttributes()
                        if (attrs && typeof attrs.alpha !== "undefined") {
                          setContextReady(true)
                        }
                      } catch (e) {
                        console.warn("[v0] Retry failed:", e)
                      }
                    }, 100)
                  }
                }
              }
            } catch (error) {
              console.warn("[v0] Error accessing WebGL context:", error)
            }
          }, 0)
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

      {/* Grid or Water for spatial reference */}
      {showWater ? (
        <WaterPlane />
      ) : (
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
      )}

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

      {/* Post-processing effects - only render when context is ready */}
      {contextReady && (
        <EffectComposer>
          <Bloom intensity={1.2} luminanceThreshold={0.3} luminanceSmoothing={0.9} />
        </EffectComposer>
      )}
    </Canvas>
    </div>
  )
}
