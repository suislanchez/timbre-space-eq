"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useAudioStore } from "@/lib/audio-store"

export default function SpectralOverlay() {
  const planeRef = useRef<THREE.Mesh>(null)
  const textureRef = useRef<THREE.DataTexture | null>(null)
  const { frequencyData, isPlaying } = useAudioStore()

  // Initialize texture
  if (!textureRef.current) {
    const width = 128
    const height = 64
    const size = width * height
    const data = new Uint8Array(4 * size)

    textureRef.current = new THREE.DataTexture(data, width, height)
    textureRef.current.needsUpdate = true
  }

  useFrame(() => {
    if (!frequencyData || !isPlaying || !textureRef.current) return

    const texture = textureRef.current
    const data = texture.image.data

    // Shift data left (scroll effect)
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 127; x++) {
        const destIdx = (y * 128 + x) * 4
        const srcIdx = (y * 128 + x + 1) * 4
        data[destIdx] = data[srcIdx]
        data[destIdx + 1] = data[srcIdx + 1]
        data[destIdx + 2] = data[srcIdx + 2]
        data[destIdx + 3] = data[srcIdx + 3]
      }
    }

    // Add new column from frequency data
    for (let y = 0; y < 64; y++) {
      const freqIdx = Math.floor((y / 64) * frequencyData.length)
      const value = frequencyData[freqIdx]
      const idx = (y * 128 + 127) * 4

      // Color mapping: blue (low) -> green -> yellow -> red (high)
      if (value < 64) {
        data[idx] = 0
        data[idx + 1] = value * 2
        data[idx + 2] = 255
      } else if (value < 128) {
        data[idx] = 0
        data[idx + 1] = 255
        data[idx + 2] = 255 - (value - 64) * 4
      } else if (value < 192) {
        data[idx] = (value - 128) * 4
        data[idx + 1] = 255
        data[idx + 2] = 0
      } else {
        data[idx] = 255
        data[idx + 1] = 255 - (value - 192) * 4
        data[idx + 2] = 0
      }
      data[idx + 3] = 200 // Alpha
    }

    texture.needsUpdate = true
  })

  return (
    <mesh ref={planeRef} position={[0, -3, -5]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10, 5]} />
      <meshBasicMaterial map={textureRef.current} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  )
}
