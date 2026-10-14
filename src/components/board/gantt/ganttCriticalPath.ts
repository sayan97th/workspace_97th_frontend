/** One dated item, as far as the critical path cares. */
export type GanttPathNode = {
  id: string;
  /** Local midnight end date, inclusive. */
  end: Date;
  /** Ids of the items this one depends on (Finish to Start). */
  predecessor_ids: string[];
};

/**
 * The critical path, monday.com style: the chain of dependent items that
 * sets the project's end date. Starts from every item finishing on the
 * latest end date and walks back through its "driving" predecessors, the
 * ones that finish last, since any delay in those pushes the end date out.
 * Items without dates are ignored, so a chain stops where dates stop.
 *
 * Returns the critical item ids and the critical `predecessor->successor`
 * links, the arrows drawn in the critical color.
 */
export const computeCriticalPath = (nodes: GanttPathNode[]): { item_ids: Set<string>; link_keys: Set<string> } => {
  const item_ids = new Set<string>();
  const link_keys = new Set<string>();
  if (nodes.length === 0) return { item_ids, link_keys };

  const nodes_by_id = new Map(nodes.map((node) => [node.id, node]));
  const latest_end = Math.max(...nodes.map((node) => node.end.getTime()));
  const queue = nodes.filter((node) => node.end.getTime() === latest_end).map((node) => node.id);

  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (item_ids.has(id)) continue;
    item_ids.add(id);
    const node = nodes_by_id.get(id);
    if (!node) continue;

    const predecessors = node.predecessor_ids
      .map((predecessor_id) => nodes_by_id.get(predecessor_id))
      .filter((predecessor): predecessor is GanttPathNode => predecessor !== undefined);
    if (predecessors.length === 0) continue;

    const driving_end = Math.max(...predecessors.map((predecessor) => predecessor.end.getTime()));
    for (const predecessor of predecessors) {
      if (predecessor.end.getTime() !== driving_end) continue;
      link_keys.add(`${predecessor.id}->${id}`);
      queue.push(predecessor.id);
    }
  }

  return { item_ids, link_keys };
};
