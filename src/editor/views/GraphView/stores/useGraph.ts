import create from "zustand";
import type { NodeData } from "../../../../types/graph";

type GraphState = {
  nodes: Record<string, NodeData>;
  selectedNode?: NodeData | null;
  // new actions:
  setNodeText: (nodeId: string, text: NodeData["text"]) => void;
  updateNode: (nodeId: string, patch: Partial<NodeData>) => void;
};

export const useGraph = create<GraphState>((set, get) => ({
  nodes: {},
  selectedNode: null,
  // Persist text for a node and keep selectedNode in sync
  setNodeText: (nodeId, text) => {
    set(state => {
      const node = state.nodes?.[nodeId];
      if (!node) return {};
      const updated: NodeData = { ...node, text };
      return {
        nodes: { ...state.nodes, [nodeId]: updated },
        selectedNode: state.selectedNode?.id === nodeId ? updated : state.selectedNode,
      };
    });
  },

  // Generic node updater
  updateNode: (nodeId, patch) => {
    set(state => {
      const node = state.nodes?.[nodeId];
      if (!node) return {};
      const updated: NodeData = { ...node, ...patch };
      return {
        nodes: { ...state.nodes, [nodeId]: updated },
        selectedNode: state.selectedNode?.id === nodeId ? updated : state.selectedNode,
      };
    });
  },
  // ...existing actions implementation...
}));