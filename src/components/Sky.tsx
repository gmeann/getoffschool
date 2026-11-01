import * as THREE from 'three'
import { useEffect, useMemo } from 'react'
import type { Sky as SkyColors } from '../hooks/useTimeOfDay'
import { useDispose } from '../hooks/useDispose'

/** 위 → 가운데 → 아래 3색 그라데이션 하늘 (큰 구 + 간단한 셰이더). 색은 시간대에 따라 바뀜 */
export function Sky({ sky }: { sky: SkyColors }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color() },
          mid: { value: new THREE.Color() },
          bottom: { value: new THREE.Color() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 top;
          uniform vec3 mid;
          uniform vec3 bottom;
          varying vec3 vDir;
          void main() {
            float h = vDir.y;
            vec3 c = mix(bottom, mid, smoothstep(0.0, 0.22, h));
            c = mix(c, top, smoothstep(0.18, 0.62, h));
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )

  useDispose(material)

  useEffect(() => {
    material.uniforms.top.value.copy(sky.skyTop)
    material.uniforms.mid.value.copy(sky.skyMid)
    material.uniforms.bottom.value.copy(sky.skyBottom)
  }, [material, sky])

  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[400, 24, 16]} />
    </mesh>
  )
}
