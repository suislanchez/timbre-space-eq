"use client"

import { Text } from "@react-three/drei"

export default function AxisLabels() {
  return (
    <group>
      {/* X-axis: Brightness */}
      <Text position={[5, 0, 0]} fontSize={0.4} color="#06b6d4" anchorX="center" anchorY="middle">
        {"Brightness →"}
      </Text>

      {/* Y-axis: Warmth */}
      <Text position={[0, 5, 0]} fontSize={0.4} color="#f59e0b" anchorX="center" anchorY="middle">
        {"↑ Warmth"}
      </Text>

      {/* Z-axis: Depth */}
      <Text
        position={[0, 0, 5]}
        fontSize={0.4}
        color="#8b5cf6"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI / 2, 0]}
      >
        {"Depth →"}
      </Text>
    </group>
  )
}
