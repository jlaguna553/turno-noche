/**
 * Grafo de navegacion y A*. Puro: sin three, sin Rapier. La criatura y el
 * waypoint del HUD usan el mismo grafo, asi que el camino que ves es el que
 * recorre.
 */

export interface NavNode {
  id: string;
  x: number;
  z: number;
}

export interface NavGraph {
  nodes: NavNode[];
  edges: Array<[string, string]>;
}

export function nearestNode(graph: NavGraph, x: number, z: number): NavNode {
  let best = graph.nodes[0];
  if (!best) throw new Error('grafo de navegacion vacio');
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const node of graph.nodes) {
    const distance = (node.x - x) ** 2 + (node.z - z) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = node;
    }
  }
  return best;
}

export function graphById(graph: NavGraph): Map<string, NavNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

export interface PathResult {
  nodes: NavNode[];
  /** Longitud total del recorrido en metros. */
  length: number;
}

/**
 * A* con coste euclideo. Devuelve [] si no hay ruta. El grafo es pequeno
 * (<40 nodos), asi que no hace falta indice de prioridad: un barrido basta.
 */
export function findPath(graph: NavGraph, fromId: string, toId: string): PathResult {
  const byId = graphById(graph);
  const start = byId.get(fromId);
  const goal = byId.get(toId);
  if (!start || !goal) return { nodes: [], length: 0 };
  if (start.id === goal.id) return { nodes: [start], length: 0 };

  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) adjacency.set(node.id, []);
  for (const [a, b] of graph.edges) {
    adjacency.get(a)?.push(b);
    adjacency.get(b)?.push(a);
  }

  const gScore = new Map<string, number>([[start.id, 0]]);
  const cameFrom = new Map<string, string>();
  const open = new Set<string>([start.id]);
  const h = (node: NavNode): number => Math.hypot(node.x - goal.x, node.z - goal.z);
  const fScore = new Map<string, number>([[start.id, h(start)]]);

  while (open.size > 0) {
    let currentId = '';
    let currentF = Number.POSITIVE_INFINITY;
    for (const id of open) {
      const score = fScore.get(id) ?? Number.POSITIVE_INFINITY;
      if (score < currentF) {
        currentF = score;
        currentId = id;
      }
    }
    if (!currentId) break;
    if (currentId === goal.id) {
      const nodes: NavNode[] = [];
      let cursor: string | undefined = currentId;
      while (cursor) {
        const node = byId.get(cursor);
        if (node) nodes.unshift(node);
        cursor = cameFrom.get(cursor);
      }
      let length = 0;
      for (let i = 1; i < nodes.length; i += 1) {
        const a = nodes[i - 1] as NavNode;
        const b = nodes[i] as NavNode;
        length += Math.hypot(b.x - a.x, b.z - a.z);
      }
      return { nodes, length };
    }

    open.delete(currentId);
    const current = byId.get(currentId);
    if (!current) continue;
    for (const neighbourId of adjacency.get(currentId) ?? []) {
      const neighbour = byId.get(neighbourId);
      if (!neighbour) continue;
      const step = Math.hypot(neighbour.x - current.x, neighbour.z - current.z);
      const tentative = (gScore.get(currentId) ?? Number.POSITIVE_INFINITY) + step;
      if (tentative < (gScore.get(neighbourId) ?? Number.POSITIVE_INFINITY)) {
        cameFrom.set(neighbourId, currentId);
        gScore.set(neighbourId, tentative);
        fScore.set(neighbourId, tentative + h(neighbour));
        open.add(neighbourId);
      }
    }
  }

  return { nodes: [], length: 0 };
}

/** Punto a `distance` metros del inicio de la ruta, util para avanzar suave. */
export function pointAlong(path: NavNode[], from: { x: number; z: number }, distance: number): { x: number; z: number } {
  let remaining = distance;
  let previous = from;
  for (const node of path) {
    const step = Math.hypot(node.x - previous.x, node.z - previous.z);
    if (step >= remaining) {
      const t = step < 0.0001 ? 0 : remaining / step;
      return { x: previous.x + (node.x - previous.x) * t, z: previous.z + (node.z - previous.z) * t };
    }
    remaining -= step;
    previous = node;
  }
  return { x: previous.x, z: previous.z };
}
