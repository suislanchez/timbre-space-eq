"use client"

import { useRef, useMemo, useEffect, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useAudioStore } from "@/lib/audio-store"
import { Html } from "@react-three/drei"

// Instrument definitions with timbre characteristics
const INSTRUMENTS = [
  {
    name: "Kick",
    color: "#8b5cf6",
    position: [0, -2, 0],
    freqRange: [20, 150],
    description: "Sub bass frequencies: Deep, powerful low-end foundation",
  },
  {
    name: "Snare",
    color: "#ec4899",
    position: [2, 0, 2],
    freqRange: [150, 400],
    description: "Low-mid range: Punchy percussion with body and snap",
  },
  {
    name: "Hi-Hat",
    color: "#06b6d4",
    position: [-2, 3, -1],
    freqRange: [3000, 8000],
    description: "High frequencies: Crisp, bright cymbal shimmer",
  },
  {
    name: "Bass",
    color: "#8b5cf6",
    position: [-1, -2, 1],
    freqRange: [40, 250],
    description: "Bass fundamentals: Warm, rich low-end harmonics",
  },
  {
    name: "Synth",
    color: "#10b981",
    position: [1, 1, -2],
    freqRange: [250, 2000],
    description: "Midrange: Melodic content with harmonic richness",
  },
  {
    name: "Vocal",
    color: "#f59e0b",
    position: [0, 2, 0],
    freqRange: [300, 3000],
    description: "Vocal range: Intelligible speech and presence",
  },
  {
    name: "Guitar",
    color: "#ef4444",
    position: [2, 0, -2],
    freqRange: [80, 1200],
    description: "Guitar fundamentals: String resonance and body",
  },
  {
    name: "Piano",
    color: "#14b8a6",
    position: [-2, 1, 2],
    freqRange: [27, 4200],
    description: "Wide spectrum: Full harmonic content from low to high",
  },
]

function ParticleTooltip({ instrument, visible }: { instrument: (typeof INSTRUMENTS)[0]; visible: boolean }) {
  if (!visible) return null

  return (
    <Html center distanceFactor={10}>
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg pointer-events-none w-64">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: instrument.color }} />
          <h4 className="font-semibold text-sm">{instrument.name}</h4>
        </div>
        <p className="text-xs text-muted-foreground">{instrument.description}</p>
        <div className="text-xs text-muted-foreground mt-2">
          Range: {instrument.freqRange[0]} - {instrument.freqRange[1]} Hz
        </div>
      </div>
    </Html>
  )
}

export default function ParticleField() {
  const meshRefs = useRef<THREE.Mesh[]>([])
  const trajectoryRefs = useRef<Array<Array<{ position: THREE.Vector3; visits: number }>>>([])
  const prevPositionsRef = useRef<Array<THREE.Vector3>>([])
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const manualOffsetsRef = useRef<Array<THREE.Vector3>>([])
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
  const dragOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3())
  const heldKeys = useRef<Set<string>>(new Set())

  const {
    frequencyData,
    isPlaying,
    showTrails,
    isolatedInstrument,
    showClusters,
    updateEQ,
    dynamicParticles,
    lyricsData,
    currentTime,
  } = useAudioStore()
  const { camera, raycaster, gl } = useThree()

  useEffect(() => {
    trajectoryRefs.current = INSTRUMENTS.map(() => [])
  }, [])

  const allParticles = useMemo(() => {
    const staticParticles = INSTRUMENTS.map((inst, idx) => ({
      ...inst,
      id: `static-${idx}`,
      isStatic: true,
      geometry: new THREE.SphereGeometry(0.15, 16, 16),
      material: new THREE.MeshStandardMaterial({
        color: inst.color,
        emissive: inst.color,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
      }),
    }))

    const dynamicParticleMeshes = dynamicParticles.map((p) => ({
      ...p,
      isStatic: false,
      description: `Dynamic sound at ${p.name}`,
      geometry: new THREE.SphereGeometry(0.1, 12, 12),
      material: new THREE.MeshStandardMaterial({
        color: p.color,
        emissive: p.color,
        emissiveIntensity: 0.3,
        metalness: 0.6,
        roughness: 0.3,
        transparent: true,
        opacity: 0.8,
      }),
    }))

    return [...staticParticles, ...dynamicParticleMeshes]
  }, [dynamicParticles])

  useEffect(() => {
    const totalCount = allParticles.length

    // Expand arrays if needed
    while (meshRefs.current.length < totalCount) {
      meshRefs.current.push(null as any)
    }
    while (trajectoryRefs.current.length < totalCount) {
      trajectoryRefs.current.push([])
    }
    while (prevPositionsRef.current.length < totalCount) {
      const idx = prevPositionsRef.current.length
      prevPositionsRef.current.push(new THREE.Vector3(...allParticles[idx].position))
    }
    while (manualOffsetsRef.current.length < totalCount) {
      manualOffsetsRef.current.push(new THREE.Vector3(0, 0, 0))
    }
  }, [allParticles.length])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      heldKeys.current.add(event.key)

      if (event.key === "Escape") {
        setSelectedIndex(null)
        heldKeys.current.clear()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      heldKeys.current.delete(event.key)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  const handlePointerMove = (event: PointerEvent) => {
    if (draggedIndex === null) return

    const rect = gl.domElement.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(new THREE.Vector2(x, y), camera)

    const intersection = new THREE.Vector3()
    raycaster.ray.intersectPlane(dragPlaneRef.current, intersection)

    if (intersection) {
      const mesh = meshRefs.current[draggedIndex]
      if (mesh) {
        const basePos = new THREE.Vector3(...(allParticles[draggedIndex].position as [number, number, number]))
        const newOffset = intersection.sub(dragOffsetRef.current).sub(basePos)
        manualOffsetsRef.current[draggedIndex].copy(newOffset)

        const xGain = THREE.MathUtils.clamp(newOffset.x * 1.5, -12, 12)
        const yGain = THREE.MathUtils.clamp(newOffset.y * 1.5, -12, 12)
        const zGain = THREE.MathUtils.clamp(newOffset.z * 1.5, -12, 12)

        const particle = allParticles[draggedIndex]
        const [minFreq, maxFreq] = particle.freqRange

        if (maxFreq > 4000) {
          updateEQ("high", xGain)
        } else if (minFreq < 200) {
          updateEQ("low", zGain)
        } else {
          updateEQ("mid", yGain)
        }
      }
    }
  }

  const handlePointerUp = () => {
    if (draggedIndex !== null) {
      console.log(`[v0] Released ${allParticles[draggedIndex].name}`)
      setDraggedIndex(null)
      document.body.style.cursor = "default"
    }
  }

  useEffect(() => {
    if (draggedIndex !== null) {
      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", handlePointerUp)
      document.body.style.cursor = "grabbing"

      return () => {
        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerup", handlePointerUp)
      }
    }
  }, [draggedIndex])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()

    // Handle continuous keyboard movement
    if (selectedIndex !== null && heldKeys.current.size > 0) {
      const manualOffset = manualOffsetsRef.current[selectedIndex]
      if (manualOffset) {
        const moveSpeed = 0.15 // Increased speed for better feel
        
        if (heldKeys.current.has("ArrowUp")) manualOffset.y += moveSpeed
        if (heldKeys.current.has("ArrowDown")) manualOffset.y -= moveSpeed
        if (heldKeys.current.has("ArrowLeft")) manualOffset.x -= moveSpeed
        if (heldKeys.current.has("ArrowRight")) manualOffset.x += moveSpeed
        if (heldKeys.current.has("PageUp") || heldKeys.current.has("w") || heldKeys.current.has("W")) manualOffset.z += moveSpeed
        if (heldKeys.current.has("PageDown") || heldKeys.current.has("s") || heldKeys.current.has("S")) manualOffset.z -= moveSpeed

        const xGain = THREE.MathUtils.clamp(manualOffset.x * 1.5, -12, 12)
        const yGain = THREE.MathUtils.clamp(manualOffset.y * 1.5, -12, 12)
        const zGain = THREE.MathUtils.clamp(manualOffset.z * 1.5, -12, 12)

        const particle = allParticles[selectedIndex]
        const [minFreq, maxFreq] = particle.freqRange

        if (maxFreq > 4000) {
          updateEQ("high", xGain)
        } else if (minFreq < 200) {
          updateEQ("low", zGain)
        } else {
          updateEQ("mid", yGain)
        }
      }
    }

    allParticles.forEach((particle, idx) => {
      const mesh = meshRefs.current[idx]
      if (!mesh) return

      const isIsolated = isolatedInstrument === null || isolatedInstrument === particle.name
      const isHovered = hoveredIndex === idx
      const isSelected = selectedIndex === idx
      const opacity = isIsolated ? (particle.isStatic ? 1.0 : 0.8) : 0.05 // Reduced opacity for non-isolated

      let intensity = 0
      if (frequencyData && isPlaying) {
        const [minFreq, maxFreq] = particle.freqRange
        const minBin = Math.floor((minFreq / 22050) * frequencyData.length)
        const maxBin = Math.floor((maxFreq / 22050) * frequencyData.length)

        for (let i = minBin; i < maxBin; i++) {
          intensity += frequencyData[i] / 255
        }
        intensity /= maxBin - minBin
      }

      // Vocal Gating Logic - with lookahead to fix 1 second delay
      if (particle.name === "Vocal" && lyricsData.length > 0 && isPlaying) {
        let isSinging = false
        
        // Add small lookahead buffer (0.1s) to account for timing precision
        const lookaheadTime = currentTime + 0.1
        
        // Find the current lyric entry
        const currentLyricIndex = lyricsData.findIndex(l => l.time <= lookaheadTime)
        // If findIndex returns -1, check if we are before the first lyric but within range
        const currentLyric = currentLyricIndex >= 0 ? lyricsData[currentLyricIndex] : (lyricsData[0].time <= lookaheadTime + 0.5 ? lyricsData[0] : null)
        
        const nextLyric = currentLyricIndex >= 0 && currentLyricIndex < lyricsData.length - 1 
          ? lyricsData[currentLyricIndex + 1] 
          : null
        
        if (currentLyric) {
          if (currentLyric.words && currentLyric.words.length > 0) {
            // Precise word-level checking with lookahead
            // Check if currentTime is within any word's [start, end] window
            // Also consider a small pre-roll/post-roll to ensure seamless visuals
            isSinging = currentLyric.words.some(w => 
              w.start <= lookaheadTime + 0.1 && w.end >= currentTime - 0.1
            )
            
            // If no word matches but we're close to a word start, check ahead
            if (!isSinging && nextLyric && nextLyric.words && nextLyric.words.length > 0) {
               // Check first word of next lyric line
               const firstNextWord = nextLyric.words[0];
               if (firstNextWord.start <= lookaheadTime + 0.1) {
                 isSinging = true;
               }
            }
          } else {
            // Line-level fallback - use next lyric's time or estimate duration based on text length
            // Average singing speed: ~3-4 chars per second, min 2s
            const estimatedDuration = Math.max(2, currentLyric.text.length * 0.3);
            const lyricEndTime = nextLyric ? nextLyric.time : (currentLyric.time + estimatedDuration)
            
            // Check if we are within the line's window
            isSinging = lookaheadTime >= currentLyric.time && currentTime < lyricEndTime
          }
        }
        
        if (!isSinging) {
          intensity = 0
        } else {
          // Boost intensity slightly when singing to ensure visibility
          intensity = Math.max(intensity, 0.2)
        }
      }

      const isActive = particle.isStatic ? intensity > 0.1 : (particle as any).isActive && intensity > 0.1
      
      // Exaggerated visual differences
      // Active particles get much bigger
      // Inactive ones get smaller
      const scale = (isActive ? 1 + intensity * 4 : 0.8) * // Increased intensity scale multiplier
                   (isIsolated ? 1 : 0.3) * // Smaller when not isolated
                   (isHovered || isSelected ? 1.3 : 1)

      const baseScale = particle.isStatic ? 1 : 0.6
      mesh.scale.setScalar(scale * baseScale)

      const material = mesh.material as THREE.MeshStandardMaterial
      
      // Exaggerated emissive intensity for active state
      material.emissiveIntensity =
        (isActive ? 2.0 + intensity * 5 : 0.05) * // Much higher glow when active, very dim when not
        opacity * 
        (isHovered || isSelected ? 1.5 : 1)
        
      material.opacity = opacity * (isActive ? 1 : 0.1) // Fade out inactive particles more
      material.transparent = true // Always enable transparency for smoother fades

      const basePos = particle.position
      const manualOffset = manualOffsetsRef.current[idx]
      if (!manualOffset) {
        console.warn(`[v0] No manual offset for particle ${idx}`)
        return
      }

      const isManuallyPositioned = manualOffset.length() > 0.01

      let targetX = basePos[0] + manualOffset.x
      let targetY = basePos[1] + manualOffset.y
      let targetZ = basePos[2] + manualOffset.z

      if (!isManuallyPositioned && isPlaying) {
        const brightnessOffset = (particle.freqRange[0] / 10000 - 0.5) * intensity * 0.8
        const energyOffset = intensity * 1.5
        const warmthOffset = (1 - particle.freqRange[0] / 8000) * intensity * 0.6

        targetX += brightnessOffset + Math.sin(time * 0.3 + idx) * 0.05
        targetY += energyOffset + Math.cos(time * 0.4 + idx) * 0.05
        targetZ += warmthOffset + Math.sin(time * 0.2 + idx) * 0.05
      }

      mesh.position.x += (targetX - mesh.position.x) * 0.1
      mesh.position.y += (targetY - mesh.position.y) * 0.1
      mesh.position.z += (targetZ - mesh.position.z) * 0.1

      if (showTrails && isPlaying && draggedIndex !== idx && selectedIndex !== idx) {
        const currentPos = mesh.position.clone()
        const prevPos = prevPositionsRef.current[idx]

        const distanceMoved = currentPos.distanceTo(prevPos)
        if (distanceMoved > 0.05) {
          const trajectory = trajectoryRefs.current[idx]

          let foundNearby = false
          for (let i = 0; i < trajectory.length; i++) {
            const distance = currentPos.distanceTo(trajectory[i].position)
            if (distance < 0.3) {
              trajectory[i].visits += 1
              foundNearby = true
              break
            }
          }

          if (!foundNearby) {
            trajectory.push({ position: currentPos.clone(), visits: 1 })
          }

          prevPositionsRef.current[idx] = currentPos.clone()

          if (trajectory.length > 200) {
            trajectory.shift()
          }
        }
      }
    })
  })

  return (
    <group>
      {allParticles.map((particle, idx) => (
        <group key={particle.id}>
          <mesh
            ref={(el) => {
              if (el) meshRefs.current[idx] = el
            }}
            geometry={particle.geometry}
            material={particle.material}
            position={particle.position as [number, number, number]}
            onPointerOver={(e) => {
              e.stopPropagation()
              document.body.style.cursor = "grab"
              setHoveredIndex(idx)
            }}
            onPointerOut={() => {
              if (draggedIndex === null) {
                document.body.style.cursor = "default"
              }
              setHoveredIndex(null)
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (selectedIndex === idx) {
                setSelectedIndex(null)
                console.log(`[v0] Deselected ${particle.name}`)
              } else {
                setSelectedIndex(idx)
                console.log(`[v0] Selected ${particle.name} - use arrow keys to move`)
              }
            }}
            onPointerDown={(e) => {
              if (selectedIndex !== idx) {
                e.stopPropagation()
                setDraggedIndex(idx)

                const mesh = meshRefs.current[idx]
                if (mesh) {
                  const intersection = e.point
                  dragOffsetRef.current.copy(intersection).sub(mesh.position)

                  const planeNormal = new THREE.Vector3()
                  camera.getWorldDirection(planeNormal)
                  dragPlaneRef.current.setFromNormalAndCoplanarPoint(planeNormal, mesh.position)
                }

                console.log(`[v0] Started dragging ${particle.name}`)
              }
            }}
          />
          <ParticleTooltip
            instrument={particle}
            visible={(hoveredIndex === idx || selectedIndex === idx) && draggedIndex === null}
          />
        </group>
      ))}

      {showTrails &&
        trajectoryRefs.current.map((trajectory, idx) => {
          if (trajectory.length < 1) return null
          const isIsolated = isolatedInstrument === null || isolatedInstrument === allParticles[idx].name
          if (!isIsolated) return null

          const maxVisits = Math.max(...trajectory.map((t) => t.visits), 1)

          return (
            <group key={`trail-heat-${idx}`}>
              {trajectory.map((point, i) => {
                const heatIntensity = point.visits / maxVisits
                const opacity = 0.1 + heatIntensity * 0.6
                const size = 0.05 + heatIntensity * 0.1

                return (
                  <mesh key={`heat-point-${idx}-${i}`} position={point.position}>
                    <sphereGeometry args={[size, 8, 8]} />
                    <meshBasicMaterial
                      color={allParticles[idx].color}
                      transparent
                      opacity={opacity}
                      depthWrite={false}
                    />
                  </mesh>
                )
              })}
            </group>
          )
        })}

      {!showClusters &&
        allParticles.map((particle, idx) => {
          if (idx === 0) return null
          const points = [
            new THREE.Vector3(...(particle.position as [number, number, number])),
            new THREE.Vector3(0, 0, 0),
          ]
          const geometry = new THREE.BufferGeometry().setFromPoints(points)
          return (
            <line key={`line-${idx}`} geometry={geometry}>
              <lineBasicMaterial color={particle.color} opacity={0.2} transparent />
            </line>
          )
        })}

      {showClusters &&
        allParticles.map((particle, idx) => {
          const similarParticles = allParticles.filter((p, i) => {
            if (i === idx) return false
            const freqDiff = Math.abs(p.freqRange[0] - particle.freqRange[0])
            return freqDiff < 500
          })

          return similarParticles.map((similar, sIdx) => {
            const points = [
              new THREE.Vector3(...(particle.position as [number, number, number])),
              new THREE.Vector3(...(similar.position as [number, number, number])),
            ]
            const geometry = new THREE.BufferGeometry().setFromPoints(points)
            return (
              <line key={`cluster-${idx}-${sIdx}`} geometry={geometry}>
                <lineBasicMaterial color={particle.color} opacity={0.4} transparent linewidth={2} />
              </line>
            )
          })
        })}
    </group>
  )
}
