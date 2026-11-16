import * as THREE from 'three';
import type { MaterialSet } from '../render/materials';
import type { HunterState } from '../logic/hunter';

/**
 * La criatura. Geometria low-poly y animacion procedural con una jerarquia de
 * articulaciones real: cadera, rodilla, tobillo, hombro, codo, muneca, cuello y
 * mandibula. No hay esqueleto importado ni assets externos.
 *
 * Poses: idle, walk, run, lunge, attack, emerge y peek. La postura y la cabeza
 * se interpolan; los pies buscan el suelo; la bata tiene movimiento secundario
 * y la boca respira en niebla cuando caza.
 */

export type MonsterPose = 'idle' | 'walk' | 'run' | 'lunge' | 'attack' | 'emerge' | 'peek';

export interface MonsterActor {
  group: THREE.Group;
  setState(state: HunterState): void;
  setPose(pose: MonsterPose): void;
  alert(): void;
  setVisible(visible: boolean): void;
  update(dt: number, elapsed: number, state: HunterState, speed: number, camera: THREE.Vector3): void;
  /** Altura de los ojos para raycasts de vision. */
  eyePosition(target: THREE.Vector3): THREE.Vector3;
}

interface Arm {
  side: number;
  shoulder: THREE.Group;
  elbow: THREE.Group;
  wrist: THREE.Group;
  fingers: THREE.Mesh[];
}

interface Leg {
  side: number;
  hip: THREE.Group;
  knee: THREE.Group;
  ankle: THREE.Group;
  foot: THREE.Group;
}

function fogTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 30);
    gradient.addColorStop(0, 'rgba(220,228,218,0.55)');
    gradient.addColorStop(0.5, 'rgba(200,210,200,0.22)');
    gradient.addColorStop(1, 'rgba(200,210,200,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createMonster(materials: MaterialSet): MonsterActor {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const skin = materials.materials.bone;
  const skinDark = materials.materials.bone.clone();
  skinDark.color.setHex(0xa9a28e);
  const darkSkin = new THREE.MeshStandardMaterial({ color: 0x2e2a24, roughness: 0.9, metalness: 0.02 });
  const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x070606 });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x100b08,
    emissive: 0xc46a28,
    emissiveIntensity: 0.35,
    roughness: 0.22,
  });
  const gownMaterial = materials.materials.fabric.clone();
  gownMaterial.color.setHex(0x8d9184);
  gownMaterial.side = THREE.DoubleSide;
  const braceMaterial = new THREE.MeshStandardMaterial({ color: 0xc9c2a8, roughness: 0.85 });

  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 1.02;
  torsoPivot.rotation.x = 0.22;
  body.add(torsoPivot);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, 0.28), darkSkin);
  hips.position.y = -0.02;
  torsoPivot.add(hips);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.62, 4, 8), skin);
  torso.scale.set(1.22, 1, 0.85);
  torso.position.y = 0.36;
  torsoPivot.add(torso);

  // Costillas, columna y una linea de sutura.
  for (let i = 0; i < 5; i += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.5 - i * 0.035, 0.022, 0.06), darkSkin);
    rib.position.set(0, 0.55 - i * 0.1, 0.17);
    torsoPivot.add(rib);
  }
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.05), darkSkin);
  spine.position.set(0, 0.4, -0.19);
  torsoPivot.add(spine);
  for (let i = 0; i < 4; i += 1) {
    const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.012), darkSkin);
    stitch.position.set(0.09, 0.18 + i * 0.12, 0.19);
    stitch.rotation.z = 0.5;
    torsoPivot.add(stitch);
  }
  for (const side of [-1, 1] as const) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 6), skin);
    spike.position.set(side * 0.27, 0.64, -0.04);
    spike.rotation.z = side * 0.8;
    torsoPivot.add(spike);
  }

  // Bata de hospital rasgada con tiras de movimiento secundario.
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
  const strips: Array<{ mesh: THREE.Mesh; baseX: number; baseZ: number; phase: number }> = [];
  for (let i = 0; i < 9; i += 1) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.18 + gownRng() * 0.32, 0.012), gownMaterial);
    const angle = (i / 9) * Math.PI * 2;
    const baseX = Math.sin(angle) * 0.33;
    const baseZ = Math.cos(angle) * 0.3;
    mesh.position.set(baseX, -0.42 - gownRng() * 0.12, baseZ);
    mesh.rotation.y = angle;
    mesh.rotation.z = (gownRng() - 0.5) * 0.25;
    torsoPivot.add(mesh);
    strips.push({ mesh, baseX, baseZ, phase: gownRng() * Math.PI * 2 });
  }

  // Cuello y cabeza.
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
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.05, 0.1), skinDark);
  brow.position.set(0, 0.09, 0.16);
  brow.rotation.x = -0.15;
  headPivot.add(brow);
  for (const side of [-1, 1] as const) {
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.08), skinDark);
    cheek.position.set(side * 0.13, -0.03, 0.14);
    cheek.rotation.y = side * 0.3;
    headPivot.add(cheek);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.2, 0.05), darkSkin);
    hair.position.set(side * 0.15, 0.04, -0.13);
    hair.rotation.z = side * 0.25;
    headPivot.add(hair);
  }

  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, -0.12, 0.02);
  headPivot.add(jawPivot);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.17, 0.24), skin);
  jaw.position.set(0, -0.05, 0.06);
  jawPivot.add(jaw);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), mouthMaterial);
  mouth.position.set(0, 0.01, 0.18);
  jawPivot.add(mouth);
  for (let i = 0; i < 5; i += 1) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.045, 0.02), skin);
    tooth.position.set(-0.065 + i * 0.032, 0.05, 0.2);
    jawPivot.add(tooth);
  }

  const sockets: THREE.Mesh[] = [];
  for (const side of [-1, 1] as const) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), mouthMaterial);
    socket.scale.set(1, 1.25, 0.5);
    socket.position.set(side * 0.085, 0.02, 0.17);
    headPivot.add(socket);
    sockets.push(socket);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), eyeMaterial);
    eye.position.set(side * 0.085, 0.025, 0.205);
    headPivot.add(eye);
  }

  // Niebla de aliento.
  const fog = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: fogTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  fog.position.set(0, -0.16, 0.3);
  fog.scale.setScalar(0.55);
  headPivot.add(fog);

  // Brazos.
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
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.62, 3, 6), skinDark);
    fore.position.y = -0.34;
    elbow.add(fore);
    const wrist = new THREE.Group();
    wrist.position.y = -0.68;
    elbow.add(wrist);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.07), skin);
    hand.position.y = -0.04;
    wrist.add(hand);
    const fingers: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i += 1) {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.22, 0.018), skin);
      finger.position.set(-0.035 + i * 0.035, -0.17, 0.01);
      finger.rotation.x = 0.18 + i * 0.05;
      wrist.add(finger);
      fingers.push(finger);
    }
    if (side < 0) {
      const bracelet = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 8), braceMaterial);
      bracelet.position.y = -0.62;
      elbow.add(bracelet);
    }
    arms.push({ side, shoulder, elbow, wrist, fingers });
  }

  // Piernas con tobillo y pie.
  const legs: Leg[] = [];
  for (const side of [-1, 1] as const) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.16, 1.0, 0);
    body.add(hip);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.48, 3, 6), darkSkin);
    thigh.position.y = -0.3;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.5;
    hip.add(knee);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.46, 3, 6), skin);
    shin.position.y = -0.26;
    knee.add(shin);
    const ankle = new THREE.Group();
    ankle.position.y = -0.46;
    knee.add(ankle);
    const foot = new THREE.Group();
    ankle.add(foot);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.34), darkSkin);
    sole.position.set(0, -0.03, 0.1);
    foot.add(sole);
    for (let i = 0; i < 3; i += 1) {
      const toe = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.035, 0.1), skin);
      toe.position.set(-0.045 + i * 0.045, -0.035, 0.27);
      foot.add(toe);
    }
    legs.push({ side, hip, knee, ankle, foot });
  }

  group.visible = false;

  let phase = 0;
  let pose: MonsterPose = 'idle';
  let targetState: HunterState = 'roam';
  let alertTimer = 0;
  let emerge = 1;
  let twitch = 0;
  let torsoY = 1.02;
  let torsoPitch = 0.22;
  let neckPitch = 0.42;
  let headYaw = 0;
  let headPitch = 0;
  let jawOpen = 0;
  let fogPulse = 0;

  return {
    group,
    setState(state: HunterState): void {
      targetState = state;
    },
    setPose(next: MonsterPose): void {
      if (next === 'emerge' && pose !== 'emerge') emerge = 0;
      pose = next;
    },
    alert(): void {
      alertTimer = 0.6;
      twitch = 1;
    },
    setVisible(value: boolean): void {
      group.visible = value;
    },
    eyePosition(target: THREE.Vector3): THREE.Vector3 {
      return target.set(group.position.x, group.position.y + 1.95, group.position.z);
    },
    update(dt: number, elapsed: number, state: HunterState, speed: number, camera: THREE.Vector3): void {
      targetState = state;
      if (pose === 'idle' && speed > 0.15) pose = speed > 2.2 ? 'run' : 'walk';
      if (pose !== 'emerge' && pose !== 'lunge' && pose !== 'attack' && pose !== 'peek') {
        pose = speed > 2.2 ? 'run' : speed > 0.15 ? 'walk' : 'idle';
      }
      const hunting = targetState === 'hunt';
      const attacking = pose === 'attack';
      const lunging = pose === 'lunge';
      const emerging = pose === 'emerge';
      const peeking = pose === 'peek';
      const moving = speed > 0.05 && !emerging && !peeking;

      emerge = emerging ? Math.min(1, emerge + dt * 0.9) : Math.min(1, emerge + dt * 2.4);
      alertTimer = Math.max(0, alertTimer - dt);
      twitch += dt * 7.7;
      phase += dt * (hunting ? 7.4 : 3.1) * Math.max(0.35, Math.min(1.7, speed / 1.4));

      const rate = Math.min(1, dt * 7.5);
      const lerp = (current: number, target: number): number => current + (target - current) * rate;

      const targetY = lunging ? 0.76 : attacking ? 0.98 : 1.02;
      torsoY = lerp(torsoY, targetY);
      torsoPitch = lerp(torsoPitch, lunging ? 0.95 : attacking ? 0.42 : hunting ? 0.58 : peeking ? 0.3 : 0.2);
      neckPitch = lerp(neckPitch, attacking ? 0.15 : emerging ? -0.35 : 0.42);
      jawOpen = lerp(jawOpen, attacking || lunging ? 0.55 : hunting ? 0.32 : 0.04);
      torsoPivot.position.y = torsoY + Math.sin(elapsed * (hunting ? 3.4 : 1.5)) * 0.018;
      torsoPivot.rotation.x = torsoPitch;
      torsoPivot.rotation.z = Math.sin(phase) * (moving ? 0.05 : 0.018) + (peeking ? 0.25 : 0);
      torsoPivot.rotation.y = lerp(torsoPivot.rotation.y, peeking ? 0.55 : 0);

      // Cabeza: apunta a la camara con limite, con tics y giro de alerta.
      const dx = camera.x - group.position.x;
      const dz = camera.z - group.position.z;
      const horizontal = Math.hypot(dx, dz);
      let aimYaw = 0;
      let aimPitch = 0;
      if (horizontal < 14 && !emerging && !peeking) {
        const worldYaw = Math.atan2(dx, dz);
        const relative = ((worldYaw - group.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
        aimYaw = Math.max(-0.85, Math.min(0.85, relative));
        aimPitch = Math.max(-0.35, Math.min(0.2, Math.atan2(camera.y - (group.position.y + 1.95), horizontal)));
      }
      const drift = Math.sin(elapsed * 0.6) * 0.12;
      const snap = alertTimer > 0 ? Math.sin((1 - alertTimer / 0.6) * Math.PI) * 0.55 : 0;
      const jerk = Math.sin(twitch * 1.7) > 0.93 ? Math.sin(twitch * 11) * 0.2 : 0;
      headYaw = lerp(headYaw, aimYaw + drift + jerk + snap);
      headPitch = lerp(headPitch, aimPitch - (hunting ? 0.1 : 0));
      neckPivot.rotation.x = neckPitch;
      headPivot.rotation.y = headYaw;
      headPivot.rotation.x = headPitch - 0.22;
      headPivot.rotation.z = Math.sin(elapsed * 0.43) * 0.12 + jerk * 0.5 + (peeking ? -0.28 : 0);
      jawPivot.rotation.x = 0.28 + jawOpen + Math.sin(elapsed * 9) * 0.02;

      eyeMaterial.emissiveIntensity = hunting || attacking ? 2.4 : alertTimer > 0 ? 1.6 : 0.3;
      for (const socket of sockets) socket.scale.z = 0.5 + jawOpen * 0.2;

      // Niebla de boca: mas densa al cazar y de cerca.
      fogPulse += dt * (hunting ? 4.5 : 2.2);
      const fogOpacity = hunting || attacking ? Math.max(0, 1 - horizontal / 9) * 0.55 : 0.04;
      const fogMaterial = fog.material as THREE.SpriteMaterial;
      fogMaterial.opacity = lerp(fogMaterial.opacity, fogOpacity * (0.65 + Math.abs(Math.sin(fogPulse)) * 0.35));
      fog.scale.setScalar(0.35 + Math.abs(Math.sin(fogPulse)) * 0.22 + (attacking ? 0.2 : 0));

      // Brazos.
      for (const arm of arms) {
        const swing = Math.sin(phase + (arm.side > 0 ? Math.PI : 0)) * (moving ? (hunting ? 0.62 : 0.36) : 0.05);
        let shoulderX = swing;
        let shoulderZ = arm.side * (hunting ? 0.5 : 0.16);
        let elbowX = -0.24 - Math.max(0, -swing) * 0.5;
        let wristX = 0;
        if (lunging) {
          shoulderX = -0.9 + arm.side * 0.1;
          shoulderZ = arm.side * 0.85;
          elbowX = -0.35;
          wristX = 0.6;
        } else if (attacking) {
          shoulderX = -1.55;
          shoulderZ = arm.side * 0.35;
          elbowX = -0.85;
          wristX = 0.9;
        } else if (emerging) {
          shoulderX = -0.95 + Math.sin(elapsed * 2 + arm.side) * 0.12;
          shoulderZ = arm.side * 0.55;
          elbowX = -0.55;
        } else if (peeking) {
          shoulderX = arm.side < 0 ? -0.6 : 0.05;
          shoulderZ = arm.side * 0.25;
          elbowX = -0.9;
        }
        arm.shoulder.rotation.x = lerp(arm.shoulder.rotation.x, shoulderX);
        arm.shoulder.rotation.z = lerp(arm.shoulder.rotation.z, shoulderZ);
        arm.elbow.rotation.x = lerp(arm.elbow.rotation.x, elbowX);
        arm.wrist.rotation.x = lerp(arm.wrist.rotation.x, wristX);
        for (let i = 0; i < arm.fingers.length; i += 1) {
          const target = attacking || lunging ? 0.9 : 0.2 + Math.sin(elapsed * 1.3 + i) * 0.04;
          arm.fingers[i]!.rotation.x = lerp(arm.fingers[i]!.rotation.x, target);
        }
      }

      // Piernas: zancada, flexion de rodilla y pie que busca el suelo.
      for (const leg of legs) {
        const swing = Math.sin(phase + (leg.side > 0 ? Math.PI : 0));
        const amplitude = moving ? (hunting ? 0.7 : 0.48) : 0.02;
        let hipX = swing * amplitude;
        let kneeX = Math.max(0, -swing) * (hunting ? 1.25 : 0.9) + (moving ? 0.12 : 0.03);
        let ankleX = -hipX - kneeX * 0.55;
        if (lunging) {
          hipX = leg.side < 0 ? 0.65 : -0.35;
          kneeX = leg.side < 0 ? 0.2 : 0.9;
          ankleX = -0.2;
        } else if (attacking) {
          hipX = 0.1;
          kneeX = 0.35;
          ankleX = -0.2;
        } else if (emerging) {
          hipX = -0.2;
          kneeX = 0.5;
          ankleX = 0.2;
        }
        leg.hip.rotation.x = lerp(leg.hip.rotation.x, hipX);
        leg.knee.rotation.x = lerp(leg.knee.rotation.x, kneeX);
        leg.ankle.rotation.x = lerp(leg.ankle.rotation.x, ankleX);
        leg.hip.rotation.z = lerp(leg.hip.rotation.z, leg.side * 0.04);
        leg.foot.position.y = lerp(leg.foot.position.y, moving ? Math.max(0, swing) * 0.04 : 0);
      }

      // Movimiento secundario de la bata.
      for (const strip of strips) {
        const sway = Math.sin(elapsed * 2.1 + strip.phase) * (0.04 + Math.min(0.2, speed * 0.04));
        strip.mesh.rotation.z = strip.mesh.rotation.z * 0.9 + sway * 0.1;
        strip.mesh.position.x = strip.baseX + Math.sin(phase + strip.phase) * 0.015;
        strip.mesh.position.z = strip.baseZ + Math.cos(phase + strip.phase) * 0.015;
      }

      // El cuerpo emerge del agua: se eleva desde el pozo.
      body.position.y = -1.5 * (1 - emerge);
      body.rotation.z = peeking ? 0.08 : 0;
    },
  };
}
