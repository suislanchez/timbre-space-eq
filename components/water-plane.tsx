"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { Water } from "three/examples/jsm/objects/Water.js"
import { useAudioStore } from "@/lib/audio-store"

export default function WaterPlane() {
  const waterRef = useRef<Water | null>(null)
  const frequencyData = useAudioStore((state) => state.frequencyData)
  const isPlaying = useAudioStore((state) => state.isPlaying)

  const waterGeometry = useMemo(() => new THREE.PlaneGeometry(20, 20, 64, 64), [])

  const water = useMemo(() => {
    const waterNormals = new THREE.TextureLoader().load(
      'https://threejs.org/examples/textures/waternormals.jpg',
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      }
    )

    const waterInstance = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormals,
      sunDirection: new THREE.Vector3(1, 1, 0.5),
      sunColor: 0xffffff,
      waterColor: 0x0066cc, // Blue color
      distortionScale: 0, // Start with no distortion (still water)
      fog: false,
    })

    waterInstance.rotation.x = -Math.PI / 2
    waterInstance.position.y = 0

    // Enable transparency
    const material = waterInstance.material as THREE.ShaderMaterial
    material.transparent = true
    material.opacity = 0.6 // Semi-transparent blue

    return waterInstance
  }, [waterGeometry])

  useFrame((state) => {
    if (!waterRef.current) return

    try {
      const material = waterRef.current.material as THREE.ShaderMaterial
      if (!material || !material.uniforms) return
      
      // Only animate when music is playing
      if (isPlaying && frequencyData && frequencyData.length > 0) {
        // Update water time for continuous animation
        material.uniforms['time'].value += 1.0 / 60.0

        // Calculate average energy from low frequencies (bass)
        const bassEnergy = frequencyData.slice(0, 10).reduce((sum, val) => sum + val, 0) / 10 / 255
        
        // Calculate average energy from mid frequencies
        const midEnergy = frequencyData.slice(10, 50).reduce((sum, val) => sum + val, 0) / 40 / 255
        
        // Calculate average energy from high frequencies
        const highEnergy = frequencyData.slice(50, 100).reduce((sum, val) => sum + val, 0) / 50 / 255

        // Map bass energy to distortion scale (larger waves)
        const targetDistortion = 1.5 + bassEnergy * 6.0
        
        // Smooth transition
        const currentDistortion = material.uniforms['distortionScale'].value
        material.uniforms['distortionScale'].value = THREE.MathUtils.lerp(
          currentDistortion,
          targetDistortion,
          0.1
        )

        // Slightly modulate blue color based on frequencies (keep it blue)
        const waterColor = new THREE.Color(0x0066cc) // Base blue
        waterColor.r = Math.min(0.2 + midEnergy * 0.1, 0.4) // Slight red tint
        waterColor.g = Math.min(0.4 + midEnergy * 0.2, 0.6) // Slight green tint
        waterColor.b = Math.min(0.8 + highEnergy * 0.2, 1.0) // Brighten blue
        
        material.uniforms['waterColor'].value = waterColor
      } else {
        // Completely still when not playing - no time increment, no distortion
        material.uniforms['distortionScale'].value = THREE.MathUtils.lerp(
          material.uniforms['distortionScale'].value,
          0,
          0.1
        )
        
        // Reset to base blue color
        material.uniforms['waterColor'].value = new THREE.Color(0x0066cc)
      }
    } catch (error) {
      console.error("[v0] Error updating water plane:", error)
    }
  })

  useEffect(() => {
    return () => {
      waterGeometry.dispose()
      if (water.material) {
        (water.material as THREE.Material).dispose()
      }
    }
  }, [waterGeometry, water])

  return <primitive ref={waterRef} object={water} />
}

