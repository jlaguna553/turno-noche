import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Post-proceso de terror: grading frio, vineta agresiva, grano, aberracion
 * cromatica, cuantizacion con tramado ordenado (look PSX), scanlines y bandas
 * VHS. `uFear` (0..1) corrompe la imagen cuando la criatura esta cerca:
 * respiracion del encuadre, rojo en los bordes y mas ruido.
 */

const HorrorShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uFear: { value: 0 },
    uFlash: { value: 0 },
    uVignette: { value: 0.86 },
    uGrain: { value: 0.013 },
    uAberration: { value: 0.0024 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uFear;
    uniform float uFlash;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    // Tramado ordenado 4x4 (aproximacion recursiva, compatible GLSL ES 1.0).
    float bayer2(vec2 a) {
      a = floor(a);
      return fract(a.x / 2.0 + a.y * a.y * 0.75);
    }
    float bayer4(vec2 a) {
      return bayer2(0.5 * a) * 0.25 + bayer2(a);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float radius = length(centered);

      // Distorsion de barril muy leve (tubo CRT).
      vec2 uv = 0.5 + centered * (1.0 + 0.045 * radius * radius);

      // Inestabilidad de cinta VHS: aumenta con el miedo.
      float wobble = sin(uv.y * 220.0 + uTime * 11.0) * 0.00055 * (0.25 + uFear);
      uv.x += wobble;

      // Desgarro horizontal ocasional.
      float tearBand = step(0.995, fract(uv.y * 1.7 + uTime * 0.11));
      uv.x += tearBand * (hash(vec2(floor(uTime * 12.0), 3.7)) - 0.5) * 0.02 * (0.2 + uFear);

      float ab = uAberration * (0.35 + radius * 2.6) * (1.0 + uFear * 2.2);
      vec3 color;
      color.r = texture2D(tDiffuse, uv + centered * ab).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - centered * ab).b;

      // Grading: sombras verdosas, luces calidas, desaturado general.
      float luma = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(luma), color, 0.72);
      color.rgb += vec3(0.012, 0.021, 0.014) * (1.0 - luma);
      color.rgb *= vec3(1.03, 1.0, 0.93);

      // Cuantizacion con tramado (banding de 8/16 bits).
      float dither = bayer4(gl_FragCoord.xy) - 0.5;
      float levels = 34.0;
      color = floor(color * levels + dither) / levels;

      // Scanlines y apertura de rejilla del CRT.
      float scan = step(0.5, fract(gl_FragCoord.y * 0.5));
      color *= 1.0 - 0.055 * scan;
      float aperture = 0.985 + 0.015 * step(0.5, fract(gl_FragCoord.x * 0.5));
      color *= aperture;

      // Grano animado.
      float grain = hash(gl_FragCoord.xy + fract(uTime) * 173.7) - 0.5;
      color += grain * (uGrain + uFear * 0.035);

      // Vineta: se cierra y respira con el miedo.
      float breathe = 0.5 + 0.5 * sin(uTime * 2.4);
      float vignette = smoothstep(0.94, 0.22, radius * (1.02 + uFear * 0.28));
      color *= mix(1.0, vignette, uVignette * (0.85 + uFear * 0.2));

      // Sangrado rojo en los bordes cuando la criatura esta encima.
      float edge = smoothstep(0.32, 0.86, radius);
      color += vec3(0.16, 0.012, 0.008) * edge * uFear * (0.45 + breathe * 0.7);

      // Flash de impacto (muerte o susto): rojo sucio, nunca blanco limpio.
      color = mix(color, vec3(0.34, 0.02, 0.015), clamp(uFlash, 0.0, 1.0) * 0.88);

      // Parpadeo de fluorescente agonizante.
      float flicker = 1.0 - 0.035 * step(0.995, hash(vec2(floor(uTime * 7.0), 1.0)));
      color *= flicker;

      gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
    }
  `,
};

export interface PostFX {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  grade: ShaderPass;
  resize(width: number, height: number): void;
  render(): void;
}

export function createPostFX(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): PostFX {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.22, 0.45, 0.86);
  composer.addPass(bloom);

  const grade = new ShaderPass(HorrorShader);
  composer.addPass(grade);

  composer.addPass(new OutputPass());

  return {
    composer,
    bloom,
    grade,
    resize(width: number, height: number): void {
      composer.setSize(width, height);
      grade.uniforms.uResolution.value = new THREE.Vector2(width, height);
    },
    render(): void {
      composer.render();
    },
  };
}
