"use client";

import React, { useState } from "react";

export interface AccordionItemData {
  id: string;
  badge?: string;
  number?: string;
  title: string;
  summary?: string;
  content: React.ReactNode;
  tagColor?: "navy" | "approve" | "block" | "amber" | "ink";
}

interface AccordionProps {
  items: AccordionItemData[];
  defaultOpenId?: string | null;
  allowMultiple?: boolean;
  className?: string;
}

export function Accordion({
  items,
  defaultOpenId = null,
  allowMultiple = false,
  className = "",
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (defaultOpenId) s.add(defaultOpenId);
    return s;
  });

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenIds(new Set(items.map((it) => it.id)));
  };

  const collapseAll = () => {
    setOpenIds(new Set());
  };

  const getTagColor = (color?: string) => {
    switch (color) {
      case "approve":
        return { color: "var(--approve)", bg: "var(--approve-bg)", border: "var(--approve)" };
      case "block":
        return { color: "var(--block)", bg: "var(--block-bg)", border: "var(--block)" };
      case "amber":
        return { color: "var(--amber)", bg: "var(--amber-bg)", border: "var(--amber)" };
      case "navy":
        return { color: "var(--navy)", bg: "var(--navy-tint)", border: "var(--navy)" };
      default:
        return { color: "var(--ink-2)", bg: "var(--paper-sunken)", border: "var(--rule)" };
    }
  };

  return (
    <div className={`accordion-container ${className}`} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Utility Actions: Expand / Collapse All */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "12px",
          marginBottom: "6px",
        }}
      >
        <button
          type="button"
          onClick={expandAll}
          className="btn-link font-mono"
          style={{
            fontSize: "11px",
            color: "var(--navy)",
            background: "none",
            border: "none",
            padding: "2px 6px",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Expand All
        </button>
        <span style={{ color: "var(--rule)", fontSize: "12px" }}>·</span>
        <button
          type="button"
          onClick={collapseAll}
          className="btn-link font-mono"
          style={{
            fontSize: "11px",
            color: "var(--ink-3)",
            background: "none",
            border: "none",
            padding: "2px 6px",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Collapse All
        </button>
      </div>

      {/* Accordion Items */}
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        const tagStyles = getTagColor(item.tagColor);

        return (
          <div
            key={item.id}
            style={{
              backgroundColor: "var(--paper-raised)",
              border: `1px solid ${isOpen ? "var(--rule-strong)" : "var(--rule)"}`,
              borderRadius: "var(--radius-md)",
              transition: "border-color 0.15s ease, background-color 0.15s ease",
              overflow: "hidden",
            }}
          >
            {/* Header Button */}
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-expanded={isOpen}
              aria-controls={`accordion-body-${item.id}`}
              id={`accordion-btn-${item.id}`}
              style={{
                width: "100%",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                color: "var(--ink)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                {item.number && (
                  <span
                    className="font-pixel"
                    style={{
                      fontSize: "11px",
                      color: isOpen ? "var(--navy)" : "var(--ink-3)",
                      letterSpacing: "0.04em",
                      flexShrink: 0,
                    }}
                  >
                    {item.number}
                  </span>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: isOpen ? "var(--ink)" : "var(--ink)",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {item.title}
                    </span>
                    {item.badge && (
                      <span
                        className="font-pixel"
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          color: tagStyles.color,
                          backgroundColor: tagStyles.bg,
                          border: `1px solid ${tagStyles.border}`,
                          letterSpacing: "0.04em",
                          flexShrink: 0,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.summary && !isOpen && (
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: "var(--ink-3)",
                        lineHeight: 1.4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.summary}
                    </span>
                  )}
                </div>
              </div>

              {/* Chevron Icon */}
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: isOpen ? "var(--paper-sunken)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "transform 0.2s ease, background-color 0.2s ease",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  color: isOpen ? "var(--navy)" : "var(--ink-3)",
                  fontSize: "11px",
                  lineHeight: 1,
                }}
                aria-hidden="true"
              >
                ▼
              </div>
            </button>

            {/* Accordion Body */}
            {isOpen && (
              <div
                id={`accordion-body-${item.id}`}
                role="region"
                aria-labelledby={`accordion-btn-${item.id}`}
                style={{
                  padding: "0 20px 20px 20px",
                  borderTop: "1px dashed var(--rule)",
                  paddingTop: "16px",
                  fontSize: "13.5px",
                  lineHeight: 1.65,
                  color: "var(--ink-2)",
                }}
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
