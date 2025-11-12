import React, { useEffect, useState } from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  ScrollArea,
  Flex,
  CloseButton,
  Button,
  TextInput,
  Group,
  Badge,
  Space,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj: Record<string, any> = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const setNodeText = useGraph(state => state.setNodeText);
  const updateNode = useGraph(state => state.updateNode);

  // local edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedRows, setEditedRows] = useState<NodeData["text"]>(nodeData?.text ?? []);
  const [savedRows, setSavedRows] = useState<NodeData["text"] | null>(null);

  // sync when selected node changes (unless currently editing)
  useEffect(() => {
    if (!isEditing) {
      setEditedRows(nodeData?.text ?? []);
      setSavedRows(null);
    }
  }, [nodeData, isEditing]);

  const displayRows = savedRows ?? nodeData?.text ?? [];

  const updateRow = (index: number, patch: Partial<NodeData["text"][0]>) => {
    setEditedRows(prev => {
      const next = [...prev];
      next[index] = { ...(next[index] || { key: "", value: "", type: "string" }), ...patch } as any;
      return next;
    });
  };

  const removeRow = (index: number) => {
    setEditedRows(prev => prev.filter((_, i) => i !== index));
  };

  const addField = () => {
    setEditedRows(prev => [...prev, { key: "", value: "", type: "string" } as any]);
  };

  const handleSave = async () => {
    if (!nodeData?.id) return;

    try {
      // prefer updateNode (patch) so we don't need a separate setNodeText API
      if (typeof updateNode === "function") {
        updateNode(nodeData.id, { text: editedRows });
      } else if (typeof setNodeText === "function") {
        // fallback if your store only provides setNodeText
        setNodeText(nodeData.id, editedRows);
      } else {
        console.warn("No graph store action available to save node text. Implement setNodeText or updateNode in useGraph.");
        return;
      }

      // stop editing and clear savedRows so UI reads from store's selectedNode
      setIsEditing(false);
      setSavedRows(null);
    } catch (err) {
      console.error("Failed to save node", err);
    }
  };
  const handleCancel = () => {
    setIsEditing(false);
    // revert edits
    setEditedRows(nodeData?.text ?? []);
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            {/* right side: Edit button + Close */}
            <Flex gap="xs" align="center">
              {!isEditing ? (
                <Button
                  size="xs"
                  color="green"
                  variant="light"
                  onClick={() => {
                    setIsEditing(true);
                  }}
                >
                  Edit
                </Button>
              ) : (
                <Group spacing="xs">
                  <Button size="xs" color="green" onClick={handleSave}>
                    Save
                  </Button>
                  <Button size="xs" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </Group>
              )}
              <CloseButton onClick={onClose} />
            </Flex>
          </Flex>

          {isEditing ? (
            <>
              <Stack spacing="xs">
                {editedRows.length === 0 && (
                  <Text fz="xs" color="dimmed">
                    No editable fields. You can add a new field.
                  </Text>
                )}

                {editedRows.map((row, i) => (
                  <Group key={i} align="flex-start" spacing="xs">
                    {row.type === "object" || row.type === "array" ? (
                      <Badge variant="outline" color="gray">
                        {row.type}
                      </Badge>
                    ) : null}
                    <TextInput
                      value={(row as any).key ?? ""}
                      onChange={e => updateRow(i, { key: e.currentTarget.value })}
                      placeholder="key"
                      size="xs"
                      sx={{ width: 180 }}
                    />
                    <TextInput
                      value={(row as any).value ?? ""}
                      onChange={e => updateRow(i, { value: e.currentTarget.value })}
                      placeholder="value"
                      size="xs"
                      sx={{ flex: 1 }}
                    />
                    <Button size="xs" color="red" variant="subtle" onClick={() => removeRow(i)}>
                      Remove
                    </Button>
                  </Group>
                ))}

                <Group>
                  <Button size="xs" variant="subtle" onClick={addField}>
                    Add field
                  </Button>
                </Group>
              </Stack>

              <Space h="sm" />
              <Text fz="xs" fw={500}>
                Preview
              </Text>
              <ScrollArea.Autosize mah={250} maw={600}>
                <CodeHighlight
                  code={normalizeNodeData(editedRows)}
                  miw={350}
                  maw={600}
                  language="json"
                  withCopyButton
                />
              </ScrollArea.Autosize>
            </>
          ) : (
            <ScrollArea.Autosize mah={250} maw={600}>
              <CodeHighlight
                code={normalizeNodeData(displayRows)}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            </ScrollArea.Autosize>
          )}
        </Stack>

        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
