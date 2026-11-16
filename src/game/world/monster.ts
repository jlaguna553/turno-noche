import * as THREE from 'three';
import type { MaterialSet } from '../render/materials';
import type { HunterState } from '../logic/hunter';

/**
 * La criatura. Geometria low-poly y animacion procedural: no hay esqueleto ni
 * assets externos. Se mueve por el mundo con un collider cinematico del motor.
 *
 * Silueta: torso alargado y palido, brazos demasiado largos, cuello vencido y
 * ojos que solo reflejan la linterna. Nada de sangre gratuita: el miedo esta
 * en la postura y en como gira la cabeza antes de correr.
 */

export interface MonsterActor {
  group: THREE.Group;
  setState(state: HunterState): void;
  setVisible(visible: boolean): void;
  update(dt: number, elapsed: number, state: HunterState, speed: number, camera: THREE.Vector3): void;
  /** Altura de los ojos para raycasts de vision. */
  eyePosition(target: THREE.Vector3): THREE.Vector3;
}

export function createMonster(materials: MaterialSet): MonsterActor {
  const group = new THREE.Group();

  const skin = materials.materials.bone;
  const darkSkin = new THREE.MeshStandardMaterial({
    color: 0x2e2a24,
    roughness: 0.9,
    metalness: 0.02,
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x100b08,
    emissive: 0xb05a24,
    emissiveIntensity: 0.4,
    roughness: 0.25,
  });
  const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x070606 });

  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 1.02;
  torsoPivot.rotation.x = 0.22;
  group.add(torsoPivot);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, 0.28), darkSkin);
  hips.position.y = -0.02;
  torsoPivot.add(hips);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.62, 4, 8), skin);
  torso.scale.set(1.25, 1, 0.85);
  torso.position.y = 0.36;
  torsoPivot.add(torso);

  // Costillas y columna marcadas.
  for (let i = 0; i < 5; i += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.5 - i * 0.03, 0.022, 0.06), darkSkin);
    rib.position.set(0, 0.55 - i * 0.1, 0.17);
    torsoPivot.add(rib);
  }
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.05), darkSkin);
  spine.position.set(0, 0.4, -0.19);
  torsoPivot.add(spine);

  // Bata de hospital rasgada: le quita el aire de maniqui y lo vuelve paciente.
  const gownMaterial = materials.materials.fabric.clone();
  gownMaterial.color.setHex(0x8d9184);
  gownMaterial.side = THREE.DoubleSide;
  const gown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.78, 9, 1, true), gownMaterial);
  gown.position.y = 0.06;
  gown.rotation.y = 0.4;
  torsoPivot.add(gown);
  const gownRng = (() => {
    let seed = 771;
    return () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
  })();
  for (let i = 0; i < 9; i += 1) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.18 + gownRng() * 0.32, 0.012),
      gownMaterial,
    );
    const angle = (i / 9) * Math.PI * 2;
    strip.position.set(Math.sin(angle) * 0.33, -0.42 - gownRng() * 0.12, Math.cos(angle) * 0.3);
    strip.rotation.y = angle;
    strip.rotation.z = (gownRng() - 0.5) * 0.25;
    torsoPivot.add(strip);
  }

  // Cuello vencido y cabeza.
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 0.72, 0.02);
  neckPivot.rotation.x = 0.42;
  torsoPivot.add(neckPivot);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.32, 7), skin);
  neck.position.y = 0.12;
  neckPivot.add(neck);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.26, 0.04);
  headPivot.rotation.x = -0.3;
  neckPivot.add(headPivot);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), skin);
  skull.scale.set(0.9, 1.15, 1.02);
  headPivot.add(skull);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.17, 0.24), skin);
  jaw.position.set(0, -0.17, 0.08);
  jaw.rotation.x = 0.34;
  headPivot.add(jaw);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.06), mouthMaterial);
  mouth.position.set(0, -0.11, 0.19);
  headPivot.add(mouth);
  for (let i = 0; i < 4; i += 1) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.045, 0.02), skin);
    tooth.position.set(-0.06 + i * 0.04, -0.095, 0.215);
    headPivot.add(tooth);
  }
  const socketL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), mouthMaterial);
  socketL.scale.set(1, 1.25, 0.5);
  socketL.position.set(-0.085, 0.02, 0.17);
  headPivot.add(socketL);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), eyeMaterial);
  eyeL.position.set(-0.085, 0.025, 0.205);
  headPivot.add(eyeL);
  const socketR = socketL.clone();
  socketR.position.x = 0.085;
  headPivot.add(socketR);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.085;
  headPivot.add(eyeR);

  // Brazos largos con dos segmentos y dedos.
  interface Arm {
    shoulder: THREE.Group;
    elbow: THREE.Group;
    base: number;
  }
  const arms: Arm[] = [];
  for (const side of [-1, 1] as const) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.32, 0.62, 0);
    shoulder.rotation.z = side * 0.18;
    torsoPivot.add(shoulder);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.62, 3, 6), skin);
    upper.position.y = -0.36;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.72;
    shoulder.add(elbow);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.62, 3, 6), skin);
    fore.position.y = -0.34;
    elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.07), skin);
    hand.position.y = -0.72;
    elbow.add(hand);
    for (let i = 0; i < 3; i += 1) {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.22, 0.018), skin);
      finger.position.set(-0.035 + i * 0.035, -0.88, 0.01);
      finger.rotation.x = 0.18 + i * 0.05;
      elbow.add(finger);
    }
    arms.push({ shoulder, elbow, base: side });
  }

  // Piernas digitigradas.
  interface Leg {
    hip: THREE.Group;
    knee: THREE.Group;
    base: number;
  }
  const legs: Leg[] = [];
  for (const side of [-1, 1] as const) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.16, 1.0, 0);
    group.add(hip);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.48, 3, 6), darkSkin);
    thigh.position.y = -0.3;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.5;
    hip.add(knee);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.46, 3, 6), skin);
    shin.position.y = -0.26;
    knee.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.34), darkSkin);
    foot.position.set(0, -0.48, 0.1);
    knee.add(foot);
    legs.push({ hip, knee, base: side });
  }

  group.scale.setScalar(1.0);
  group.visible = false;

  let phase = 0;
  let twitch = 0;
  let targetState: HunterState = 'roam';

  return {
    group,
    setState(state: HunterState): void {
      targetState = state;
    },
    setVisible(value: boolean): void {
      group.visible = value;
    },
    eyePosition(target: THREE.Vector3): THREE.Vector3 {
      return target.set(group.position.x, group.position.y + 1.95, group.position.z);
    },
    update(dt: number, elapsed: number, state: HunterState, speed: number, camera: THREE.Vector3): void {
      targetState = state;
      const hunting = targetState === 'hunt';
      const moving = speed > 0.05;
      phase += dt * (hunting ? 7.4 : 3.1) * Math.max(0.35, Math.min(1.6, speed / 1.4));
      twitch += dt * 7.7;

      // Balanceo del torso y respiracion.
      const breathe = Math.sin(elapsed * (hunting ? 3.4 : 1.5)) * 0.02;
      torsoPivot.position.y = 1.02 + breathe + (hunting ? 0.06 : 0);
      torsoPivot.rotation.x = hunting ? 0.5 : 0.16;
      torsoPivot.rotation.z = Math.sin(phase) * (moving ? 0.05 : 0.018);

      // Cabeza: giro brusco hacia la camara, con tics.
      const driftYaw = Math.sin(elapsed * 0.6) * 0.12;
      const jerk = Math.sin(twitch * 1.7) > 0.93 ? Math.sin(twitch * 11) * 0.22 : 0;
      headPivot.rotation.y = driftYaw + jerk;
      headPivot.rotation.x = hunting ? -0.42 : -0.18 + Math.sin(elapsed * 1.1) * 0.08;
      headPivot.rotation.z = Math.sin(elapsed * 0.43) * 0.16 + jerk * 0.5;
      jaw.rotation.x = 0.28 + (hunting ? 0.3 + Math.sin(elapsed * 9) * 0.08 : Math.sin(elapsed * 1.4) * 0.06);

      // Ojos: se encienden al cazar.
      eyeMaterial.emissiveIntensity = hunting ? 2.2 : 0.32 + Math.abs(Math.sin(elapsed * 1.7)) * 0.12;

      // Brazos colgando o abiertos al correr.
      for (const arm of arms) {
        const swing = Math.sin(phase + (arm.base > 0 ? Math.PI : 0)) * (moving ? 0.42 : 0.07);
        arm.shoulder.rotation.x = swing + (hunting ? -0.35 : 0.02);
        arm.shoulder.rotation.z = arm.base * (hunting ? 0.62 : 0.18) + Math.sin(elapsed * 0.9 + arm.base) * 0.04;
        arm.elbow.rotation.x = hunting ? -0.95 - Math.abs(swing) * 0.4 : -0.18 + Math.sin(elapsed * 1.3) * 0.05;
      }

      // Piernas.
      for (const leg of legs) {
        const swing = Math.sin(phase + (leg.base > 0 ? Math.PI : 0)) * (moving ? 0.55 : 0.02);
        leg.hip.rotation.x = swing;
        leg.knee.rotation.x = Math.max(0, -swing) * 0.9 + (moving ? 0.2 : 0.04);
        leg.hip.rotation.z = leg.base * 0.04;
      }

      // Micro-desplazamiento de la cabeza hacia el jugador si esta cerca.
      const dx = camera.x - group.position.x;
      const dz = camera.z - group.position.z;
      if (Math.hypot(dx, dz) < 9) {
        const targetYaw = Math.atan2(dx, dz);
        torsoPivot.rotation.y += (targetYaw * 0.35 - torsoPivot.rotation.y) * Math.min(1, dt * 2.2);
      }
    },
  };
}
