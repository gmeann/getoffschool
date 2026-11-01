import * as THREE from 'three'
import { useMemo } from 'react'

/** 위 보라 → 가운데 분홍 → 아래 주황 그라데이션 하늘 (큰 구 + 간단한 셰이더) */
export function SunsetSky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color('#4b3f7a') },
          mid: { value: new THREE.Color('#d9777f') },
          bottom: { value: new THREE.Color('#f7b777') },
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

  return (
    <mesh material={material} raycast={() => null} renderOrder={-1}>
      <sphereGeometry args={[400, 24, 16]} />
    </mesh>
  )
}
