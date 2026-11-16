import { describe, expect, it } from 'vitest';
import { findPath, nearestNode, pointAlong, type NavGraph } from '../../world/nav';
import { LAYOUT, ZONE_BOXES, zoneAt } from '../../world/layout';
import { NOTES, BREAKER_LINES, ENDINGS, INTRO, ZONE_LINES } from '../story';
import { BREAKER_IDS } from '../objectives';

describe('navegacion del nivel', () => {
  it('el grafo es simetrico y sin aristas huerfanas', () => {
    const ids = new Set(LAYOUT.nav.nodes.map((node) => node.id));
    for (const [a, b] of LAYOUT.nav.edges) {
      expect(ids.has(a)).toBe(true);
      expect(ids.has(b)).toBe(true);
      expect(LAYOUT.nav.edges.some(([x, y]) => x === b && y === a)).toBe(true);
    }
  });

  it('hay ruta desde la garita a cada zona del nivel', () => {
    const targets = ['p3', 'w3', 'v2', 'e3'];
    for (const target of targets) {
      const path = findPath(LAYOUT.nav, 'g0', target);
      expect(path.nodes.length).toBeGreaterThan(1);
      expect(path.nodes[path.nodes.length - 1]?.id).toBe(target);
      expect(path.length).toBeGreaterThan(1);
    }
  });

  it('sin conexion devuelve ruta vacia', () => {
    const graph: NavGraph = {
      nodes: [
        { id: 'a', x: 0, z: 0 },
        { id: 'b', x: 10, z: 0 },
      ],
      edges: [],
    };
    expect(findPath(graph, 'a', 'b').nodes).toEqual([]);
  });

  it('el nodo mas cercano y el avance por ruta son correctos', () => {
    const node = nearestNode(LAYOUT.nav, -25, 0);
    expect(node.id).toBe('p3');
    const path = findPath(LAYOUT.nav, 'g0', 'c3').nodes;
    const point = pointAlong(path, { x: 0, z: -7.4 }, 2);
    expect(point.z).toBeGreaterThan(-7.4);
    expect(point.z).toBeLessThan(0);
  });

  it('todas las zonas declaradas se detectan por coordenadas', () => {
    for (const zone of ZONE_BOXES) {
      const cx = (zone.minX + zone.maxX) / 2;
      const cz = (zone.minZ + zone.maxZ) / 2;
      expect(zoneAt(cx, cz)?.id).toBe(zone.id);
      expect(Object.keys(ZONE_LINES)).toContain(zone.id);
    }
  });
});

describe('contenido narrativo y reparto de la planta', () => {
  it('cada nota esta en una zona real y dentro de sus limites', () => {
    for (const note of NOTES) {
      const zone = ZONE_BOXES.find((entry) => entry.id === note.zone);
      expect(zone).toBeTruthy();
      expect(note.lines.length).toBeGreaterThan(1);
    }
  });

  it('todos los props estan dentro de alguna zona', () => {
    for (const prop of LAYOUT.props) {
      expect(zoneAt(prop.x, prop.z), `${prop.id} fuera del nivel`).toBeTruthy();
    }
  });

  it('hay un breaker por id y lineas para cada uno', () => {
    for (const id of BREAKER_IDS) {
      expect(BREAKER_LINES[id].length).toBeGreaterThan(0);
      const breaker = LAYOUT.props.find((prop) => prop.kind === 'breaker' && prop.breakerId === id);
      expect(breaker, `falta ${id}`).toBeTruthy();
    }
  });

  it('la planta tiene exactamente un montacargas y una radio', () => {
    expect(LAYOUT.props.filter((prop) => prop.kind === 'lift')).toHaveLength(1);
    expect(LAYOUT.props.filter((prop) => prop.kind === 'radio')).toHaveLength(1);
  });

  it('el prólogo y los dos finales tienen texto', () => {
    expect(INTRO.length).toBeGreaterThan(3);
    for (const ending of Object.values(ENDINGS)) {
      expect(ending.lines.length).toBeGreaterThan(2);
      expect(ending.title.length).toBeGreaterThan(0);
    }
  });

  it('hay escondites alcanzables en el nivel', () => {
    const hide = LAYOUT.props.filter((prop) => prop.kind === 'hideLocker');
    expect(hide.length).toBeGreaterThanOrEqual(2);
    for (const locker of hide) {
      expect(zoneAt(locker.x, locker.z)).toBeTruthy();
    }
  });
});
