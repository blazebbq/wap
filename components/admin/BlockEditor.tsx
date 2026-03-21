"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Block } from "@/lib/blocks";

function SortableBlock({
  block,
  onEdit,
  onDelete,
}: {
  block: Block;
  onEdit: (block: Block) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing mt-1 text-xl leading-none"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>

      <div className="flex-1">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {block.type}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(block)}
              className="text-xs text-blue-600 hover:underline"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(block.id)}
              className="text-xs text-red-500 hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-700 mt-1 truncate">
          {block.type === "hero" && block.props.heading}
          {block.type === "services" && block.props.title}
          {block.type === "richText" && "Rich text block"}
          {block.type === "contact" && "Contact block"}
        </p>
      </div>
    </div>
  );
}

type BlockEditorProps = {
  initialBlocks: Block[];
  pageId: string;
  businessId: string;
};

export default function BlockEditor({
  initialBlocks,
  pageId,
  businessId,
}: BlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setBlocks((items) => {
          const oldIndex = items.findIndex((b) => b.id === active.id);
          const newIndex = items.findIndex((b) => b.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    },
    []
  );

  const addBlock = (type: Block["type"]) => {
    const id = `block-${type}-${Date.now()}`;
    let newBlock: Block;
    switch (type) {
      case "hero":
        newBlock = {
          id,
          type: "hero",
          props: { heading: "New Hero", subheading: "", ctaText: "", ctaHref: "" },
        };
        break;
      case "services":
        newBlock = {
          id,
          type: "services",
          props: { title: "Our Services", serviceIds: [], showPrices: true },
        };
        break;
      case "richText":
        newBlock = { id, type: "richText", props: { html: "<p>New text block</p>" } };
        break;
      case "contact":
        newBlock = {
          id,
          type: "contact",
          props: { phone: "", email: "", address: "", mapEnabled: false },
        };
        break;
    }
    setBlocks((prev) => [...prev, newBlock]);
    setEditingBlock(newBlock);
  };

  const saveBlocks = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": businessId,
        },
        body: JSON.stringify({ blocksJson: blocks }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const publishBlocks = async () => {
    await saveBlocks();
    await fetch(`/api/admin/pages/${pageId}/publish`, {
      method: "POST",
      headers: { "x-business-id": businessId },
    });
    setSaved(true);
  };

  const updateEditingBlock = (field: string, value: unknown) => {
    if (!editingBlock) return;
    const updated = {
      ...editingBlock,
      props: { ...editingBlock.props, [field]: value },
    } as Block;
    setEditingBlock(updated);
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Block list */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-slate-700">Blocks</h3>
          <div className="flex gap-2">
            <button
              onClick={saveBlocks}
              disabled={saving}
              className="text-sm px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button
              onClick={publishBlocks}
              disabled={saving}
              className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              Publish
            </button>
          </div>
        </div>

        {saved && (
          <p className="text-green-600 text-sm mb-3">✓ Saved!</p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  onEdit={(b) => setEditingBlock(b)}
                  onDelete={(id) =>
                    setBlocks((prev) => prev.filter((b) => b.id !== id))
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add block buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(["hero", "services", "richText", "contact"] as Block["type"][]).map(
            (type) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="text-xs px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 transition"
              >
                + {type}
              </button>
            )
          )}
        </div>
      </div>

      {/* Properties panel */}
      {editingBlock && (
        <div className="w-80 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-slate-700 capitalize">
              {editingBlock.type} props
            </h4>
            <button
              onClick={() => setEditingBlock(null)}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {editingBlock.type === "hero" && (
            <div className="space-y-3">
              {(
                [
                  { key: "heading", label: "Heading", type: "text" },
                  { key: "subheading", label: "Subheading", type: "text" },
                  { key: "ctaText", label: "CTA Text", type: "text" },
                  { key: "ctaHref", label: "CTA Link", type: "text" },
                ] as const
              ).map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={
                      (editingBlock.props as Record<string, string | boolean | undefined>)[f.key] as string ??
                      ""
                    }
                    onChange={(e) => updateEditingBlock(f.key, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}

          {editingBlock.type === "services" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editingBlock.props.title}
                  onChange={(e) => updateEditingBlock("title", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editingBlock.props.showPrices}
                  onChange={(e) =>
                    updateEditingBlock("showPrices", e.target.checked)
                  }
                />
                Show prices
              </label>
            </div>
          )}

          {editingBlock.type === "richText" && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                HTML Content
              </label>
              <textarea
                value={editingBlock.props.html}
                onChange={(e) => updateEditingBlock("html", e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}

          {editingBlock.type === "contact" && (
            <div className="space-y-3">
              {(
                [
                  { key: "phone", label: "Phone" },
                  { key: "email", label: "Email" },
                  { key: "address", label: "Address" },
                ] as const
              ).map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {f.label}
                  </label>
                  <input
                    type="text"
                    value={
                      (editingBlock.props as Record<string, string | boolean | undefined>)[f.key] as string ??
                      ""
                    }
                    onChange={(e) => updateEditingBlock(f.key, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
