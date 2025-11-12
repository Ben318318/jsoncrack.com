import React, { useState, useEffect } from "react";
import styled from "styled-components";
import type { CustomNodeProps } from ".";
import useConfig from "../../../../../store/useConfig";
import { isContentImage } from "../lib/utils/calculateNodeSize";
import { TextRenderer } from "./TextRenderer";
import * as Styled from "./styles";

const StyledTextNodeWrapper = styled.span<{ $isParent: boolean }>`
  display: flex;
  justify-content: ${({ $isParent }) => ($isParent ? "center" : "flex-start")};
  align-items: center;
  height: 100%;
  width: 100%;
  overflow: hidden;
  padding: 0 10px;
  position: relative; /* needed for editor/button overlay */
`;

const StyledImageWrapper = styled.div`
  padding: 5px;
  position: relative;
`;

const StyledImage = styled.img`
  border-radius: 2px;
  object-fit: contain;
  background: ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
`;

const EditButton = styled.button`
  position: absolute;
  top: 4px;
  right: 6px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  padding: 4px 6px;
  font-size: 11px;
  border-radius: 3px;
  cursor: pointer;
  z-index: 5;
`;

const EditorOverlay = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  right: 6px;
  bottom: 6px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;

const EditorInput = styled.textarea`
  width: 100%;
  height: 100%;
  min-height: 44px;
  resize: vertical;
  font-family: inherit;
  font-size: 13px;
  padding: 6px;
`;

const EditorActions = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
`;

const SmallButton = styled.button`
  padding: 6px 8px;
  font-size: 13px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #fff;
  cursor: pointer;
`;

const Node = ({ node, x, y }: CustomNodeProps) => {
  const { text, width, height } = node;
  const imagePreviewEnabled = useConfig((state) => state.imagePreviewEnabled);
  const isImage = imagePreviewEnabled && isContentImage(JSON.stringify(text[0].value));
  const value = text[0].value;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(
    () => (typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value ?? ""))
  );

  useEffect(() => {
    setDraft(typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value ?? ""));
  }, [value]);

  function openEditor(e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditing(true);
  }

  function closeEditor() {
    setEditing(false);
    setDraft(typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value ?? ""));
  }

  function parseDraft(input: string) {
    const trimmed = input.trim();
    // try JSON for objects/arrays or quoted strings
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // fall through to primitive
      }
    }
    if (trimmed === "null") return null;
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    const num = Number(trimmed);
    if (!Number.isNaN(num) && trimmed !== "") return num;
    return input;
  }

  function saveEditor(e?: React.MouseEvent) {
    e?.stopPropagation();
    let parsed = parseDraft(draft);
    // Emit a CustomEvent so parent / graph can listen and update store/state
    const evt = new CustomEvent("nodeValueEdit", { detail: { id: node.id, value: parsed } });
    window.dispatchEvent(evt);
    setEditing(false);
  }

  return (
    <Styled.StyledForeignObject
      data-id={`node-${node.id}`}
      width={width}
      height={height}
      x={0}
      y={0}
    >
      {isImage ? (
        <StyledImageWrapper>
          <StyledImage src={JSON.stringify(text[0].value)} width="70" height="70" loading="lazy" />
          <EditButton title="Edit node" onClick={openEditor}>
            Edit
          </EditButton>
          {editing && (
            <EditorOverlay onClick={(e) => e.stopPropagation()}>
              <EditorInput value={draft} onChange={(e) => setDraft(e.target.value)} />
              <EditorActions>
                <SmallButton onClick={saveEditor}>Save</SmallButton>
                <SmallButton onClick={closeEditor}>Cancel</SmallButton>
              </EditorActions>
            </EditorOverlay>
          )}
        </StyledImageWrapper>
      ) : (
        <StyledTextNodeWrapper data-x={x} data-y={y} data-key={JSON.stringify(text)} $isParent={false}>
          <Styled.StyledKey $value={value} $type={typeof text[0].value}>
            <TextRenderer>{value}</TextRenderer>
          </Styled.StyledKey>

          <EditButton title="Edit node" onClick={openEditor}>
            Edit
          </EditButton>

          {editing && (
            <EditorOverlay onClick={(e) => e.stopPropagation()}>
              <EditorInput value={draft} onChange={(e) => setDraft(e.target.value)} />
              <EditorActions>
                <SmallButton onClick={saveEditor}>Save</SmallButton>
                <SmallButton onClick={closeEditor}>Cancel</SmallButton>
              </EditorActions>
            </EditorOverlay>
          )}
        </StyledTextNodeWrapper>
      )}
    </Styled.StyledForeignObject>
  );
};

function propsAreEqual(prev: CustomNodeProps, next: CustomNodeProps) {
  return prev.node.text === next.node.text && prev.node.width === next.node.width;
}

export const TextNode = React.memo(Node, propsAreEqual);
