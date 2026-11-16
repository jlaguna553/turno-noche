import * as THREE from 'three';
import type { MaterialSet } from '../render/materials';
import type { CrawlerState } from '../logic/crawler';

/**
 * Cria de la cisterna. Seis patas, cuerpo palido y una boca que no deberia
 * abrirse tanto. La animacion es un tripode procedural: nunca se queda quieta.
 */
export interface CrawlerActor {
  group: THREE.Group;
  id: string;
  setVisible(visible: boolean): void;
  update(dt: number, elapsed: number, state: CrawlerState, speed: number): void;
}

interface Leg {
  hip: THREE.Group;
  knee: THREE.Group;
  phase: number;
  side: number;
}

export function createCrawler(materials: MaterialSet, id: string): CrawlerActor {
  const group = new THREE.Group();
  const skin = materials.materials.bone.clone();
  skin.color.setHex(0xc6bea7);
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c2822, roughness: 0.9 });
  const mouth = new THREE.MeshBasicMaterial({ color: 0x090706 });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x120a07,
    emissive: 0xa84418,
    emissiveIntensity: 1.2,
    roughness: 0.3,
  });

  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), skin);
  abdomen.scale.set(1, 0.62, 1.35);
  abdomen.position.set(0, 0.2, -0.04);
  group.add(abdomen);
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.12, 9, 7), dark);
  thorax.scale.set(1.1, 0.8, 1);
  thorax.position.set(0, 0.18, 0.17);
  group.add(thorax);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 9, 7), skin);
  head.scale.set(1, 0.85, 1.15);
  head.position.set(0, 0.17, 0.32);
  group.add(head);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.14), mouth);
  jaw.position.set(0, 0.1, 0.4);
  group.add(jaw);
  for (let i = 0; i < 4; i += 1) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 5), skin);
    tooth.position.set(-0.045 + i * 0.03, 0.13, 0.43);
    tooth.rotation.x = Math.PI;
    group.add(tooth);
  }
  for (const side of [-1, 1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), eyeMaterial);
    eye.position.set(side * 0.055, 0.2, 0.42);
    group.add(eye);
  }
  for (let i = 0; i < 5; i += 1) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.1), dark);
    ridge.position.set(0, 0.28 - i * 0.01, 0.02 - i * 0.12);
    group.add(ridge);
  }

  const legs: Leg[] = [];
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 3; i += 1) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.13, 0.2, 0.2 - i * 0.16);
      group.add(hip);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.16, 2, 5), skin);
      upper.rotation.z = side * Math.PI / 2.4;
      upper.position.set(side * 0.09, 0.02, 0);
      hip.add(upper);
      const knee = new THREE.Group();
      knee.position.set(side * 0.18, -0.04, 0);
      hip.add(knee);
      const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.18, 2, 5), dark);
      lower.rotation.z = -side * 0.35;
      lower.position.set(side * 0.06, -0.09, 0);
      knee.add(lower);
      legs.push({ hip, knee, phase: (i + (side > 0 ? 1.5 : 0)) * 1.05, side });
    }
  }

  let phase = 0;
  let screech = 0;

  return {
    group,
    id,
    setVisible(value: boolean): void {
      group.visible = value;
    },
    update(dt: number, elapsed: number, state: CrawlerState, speed: number): void {
      const moving = speed > 0.1;
      phase += dt * (moving ? 8 + speed * 1.8 : 2.2);
      const agitated = state === 'chase' || state === 'alert' || state === 'latch';
      screech += dt * (agitated ? 12 : 3.4);

      group.position.y = Math.sin(phase * 2) * (moving ? 0.015 : 0.004);
      abdomen.rotation.x = Math.sin(phase) * 0.08;
      head.rotation.y = Math.sin(elapsed * 2.3) * 0.18 + (Math.sin(screech * 3) > 0.92 ? 0.3 : 0);
      head.rotation.z = Math.sin(elapsed * 1.7) * 0.1;
      jaw.rotation.x = 0.1 + (agitated ? 0.5 + Math.sin(screech) * 0.1 : 0.02);
      jaw.position.y = 0.1 - (agitated ? 0.02 : 0);
      eyeMaterial.emissiveIntensity = agitated ? 2.4 : 0.9;

      for (const leg of legs) {
        const swing = Math.sin(phase + leg.phase) * (moving ? 0.6 : 0.1);
        leg.hip.rotation.z = leg.side * 0.25 + swing * leg.side * 0.45;
        leg.hip.rotation.x = Math.sin(phase + leg.phase + 0.5) * 0.25;
        leg.knee.rotation.z = -leg.side * 0.3 - Math.max(0, swing) * 0.4 * leg.side;
        leg.knee.rotation.x = Math.max(0, -swing) * 0.5;
      }

      if (state === 'latch') {
        group.rotation.z = Math.sin(elapsed * 14) * 0.25;
        group.rotation.x = Math.sin(elapsed * 11) * 0.2;
      } else {
        group.rotation.z = 0;
        group.rotation.x = 0;
      }
    },
  };
}
