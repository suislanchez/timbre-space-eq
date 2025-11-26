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
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: false,
    })

    waterInstance.rotation.x = -Math.PI / 2
    waterInstance.position.y = 0

    return waterInstance
  }, [waterGeometry])

  useFrame((state) => {
    if (!waterRef.current) return

    try {
      // Update water time for continuous animation
      const material = waterRef.current.material as THREE.ShaderMaterial
      if (!material || !material.uniforms) return
      
      material.uniforms['time'].value += 1.0 / 60.0

      // React to frequency data
      if (frequencyData && isPlaying && frequencyData.length > 0) {
      // Calculate average energy from low frequencies (bass)
      const bassEnergy = frequencyData.slice(0, 10).reduce((sum, val) => sum + val, 0) / 10 / 255
      
      // Calculate average energy from mid frequencies
      const midEnergy = frequencyData.slice(10, 50).reduce((sum, val) => sum + val, 0) / 40 / 255
      
      // Calculate average energy from high frequencies
      const highEnergy = frequencyData.slice(50, 100).reduce((sum, val) => sum + val, 0) / 50 / 255

      // Map bass energy to distortion scale (larger waves)
      const targetDistortion = 2.0 + bassEnergy * 8.0
      
      // Smooth transition
      const currentDistortion = material.uniforms['distortionScale'].value
      material.uniforms['distortionScale'].value = THREE.MathUtils.lerp(
        currentDistortion,
        targetDistortion,
        0.1
      )

      // Optionally modulate water color based on mid/high frequencies
      const waterColor = new THREE.Color(0x001e0f)
      waterColor.r += midEnergy * 0.1
      waterColor.g += midEnergy * 0.15
      waterColor.b += highEnergy * 0.2
      
      material.uniforms['waterColor'].value = waterColor
      } else {
        // Gentle waves when not playing
        const currentDistortion = material.uniforms['distortionScale'].value
        material.uniforms['distortionScale'].value = THREE.MathUtils.lerp(
          currentDistortion,
          3.0,
          0.05
        )
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

