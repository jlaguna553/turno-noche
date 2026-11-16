import * as THREE from 'three';
import type { MaterialSet } from '../render/materials';

/**
 * Modelo en primera persona: linterna y mano. Vive como hijo de la camara y se
 * anima con balanceo, carrera, agacharse, interaccion y lanzamiento. Es pura
 * presentacion: la luz real sigue siendo el SpotLight del mundo.
 */
export interface Viewmodel {
  group: THREE.Group;
  triggerInteract(): void;
  triggerThrow(): void;
  update(
    dt: number,
    elapsed: number,
    state: {
      on: boolean;
      charge: number;
      speed: number;
      sprinting: boolean;
      crouched: boolean;
      hidden: boolean;
      dead: boolean;
    },
  ): void;
}

export function createViewmodel(materials: MaterialSet): Viewmodel {
  const group = new THREE.Group();
  group.position.set(0.3, -0.34, -0.62);
  group.rotation.set(0.02, -0.08, -0.06);
  group.scale.setScalar(0.62);

  const metal = new THREE.MeshStandardMaterial({ color: 0x2b2f2d, roughness: 0.45, metalness: 0.7 });
  const grip = new THREE.MeshStandardMaterial({ color: 0x1b1d1b, roughness: 0.85, metalness: 0.15 });
  const lensMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1710,
    emissive: 0xffb45a,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  const skin = materials.materials.bone.clone();
  skin.color.setHex(0xa79a82);
  const sleeve = materials.materials.fabric.clone();
  sleeve.color.setHex(0x333b36);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 0.3, 12), metal);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.08;
  group.add(body);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.05, 0.12, 12), metal);
  head.rotation.x = Math.PI / 2;
  head.position.z = -0.27;
  group.add(head);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.042, 16), lensMaterial);
  lens.position.z = -0.335;
  group.add(lens);
  const core = new THREE.Mesh(
    new THREE.CircleGeometry(0.016, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff1cf }),
  );
  core.position.z = -0.337;
  group.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.008, 6, 16), metal);
  ring.position.z = -0.33;
  group.add(ring);
  const switchButton = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.04), grip);
  switchButton.position.set(0.03, 0.05, -0.02);
  group.add(switchButton);

  // Mano y antebrazo.
  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.36, 3, 7), sleeve);
  forearm.rotation.z = -0.5;
  forearm.rotation.x = 0.35;
  forearm.position.set(0.11, -0.18, 0.12);
  group.add(forearm);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.062, 9, 7), skin);
  hand.scale.set(1, 0.8, 1.15);
  hand.position.set(0.02, -0.035, 0.02);
  group.add(hand);
  const fingers: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i += 1) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.09, 2, 5), skin);
    finger.position.set(0.02, 0.01 - i * 0.006, -0.04 - i * 0.018);
    finger.rotation.x = 0.9;
    group.add(finger);
    fingers.push(finger);
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.07, 2, 5), skin);
  thumb.position.set(-0.04, 0.02, -0.02);
  thumb.rotation.z = 0.8;
  group.add(thumb);

  // Luz de relleno para que el modelo no desaparezca en pasillos oscuros.
  const fill = new THREE.PointLight(0xffe2c0, 0.55, 1.8, 2);
  fill.position.set(0.16, -0.08, -0.18);
  group.add(fill);

  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.renderOrder = 999;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      material.depthTest = false;
      material.depthWrite = false;
      material.needsUpdate = true;
    }
  });

  let bobPhase = 0;
  let interact = 0;
  let throwPulse = 0;
  let flicker = 0;

  return {
    group,
    triggerInteract(): void {
      interact = 1;
    },
    triggerThrow(): void {
      throwPulse = 1;
    },
    update(dt, elapsed, state): void {
      group.visible = !state.hidden && !state.dead;
      if (!group.visible) return;
      const speed = state.speed;
      bobPhase += dt * (2.2 + speed * 1.7);
      interact = Math.max(0, interact - dt * 3.2);
      throwPulse = Math.max(0, throwPulse - dt * 2.6);

      const bob = Math.min(1, speed / 3.2);
      const baseX = 0.3 + Math.cos(bobPhase) * 0.008 * bob;
      const baseY = -0.34 + Math.sin(bobPhase * 2) * 0.012 * bob - (state.crouched ? 0.035 : 0);
      const sprintTilt = state.sprinting ? -0.14 : 0;
      const interactX = interact * 0.05;
      const interactZ = -interact * 0.11;
      const throwZ = -throwPulse * 0.18;
      const throwY = throwPulse * 0.12;
      group.position.x += (baseX + interactX - group.position.x) * Math.min(1, dt * 9);
      group.position.y += (baseY + throwY - group.position.y) * Math.min(1, dt * 9);
      group.position.z += (-0.62 + interactZ + throwZ - group.position.z) * Math.min(1, dt * 9);
      group.rotation.x += (0.02 - interact * 0.25 + throwPulse * 0.5 - group.rotation.x) * Math.min(1, dt * 9);
      group.rotation.z += (-0.06 + sprintTilt + Math.sin(bobPhase) * 0.02 * bob - group.rotation.z) * Math.min(1, dt * 8);
      group.rotation.y += (-0.08 + Math.sin(elapsed * 0.7) * 0.012 - group.rotation.y) * Math.min(1, dt * 5);

      for (let i = 0; i < fingers.length; i += 1) {
        const target = interact > 0.2 ? 1.5 : 0.9 + Math.sin(elapsed * 1.4 + i) * 0.04;
        fingers[i]!.rotation.x += (target - fingers[i]!.rotation.x) * Math.min(1, dt * 8);
      }

      flicker += dt * (state.charge < 15 ? 17 : 3);
      const low = state.charge < 15 ? (Math.sin(flicker * 1.7) > 0.2 ? 1 : 0.15) : 1;
      lensMaterial.emissiveIntensity = state.on ? 0.55 * low : 0.02;
      switchButton.position.y = state.on ? 0.05 : 0.045;
    },
  };
}
