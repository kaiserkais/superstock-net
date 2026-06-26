import React from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { C } from "../pos/posTheme"; // Adjust this path to target your posTheme relative position

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  // Hide pagination bar safely if everything fits into a single index plane
  if (totalPages <= 1) return null;

  const pageNumbers = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 3) {
    endPage = Math.min(totalPages, maxVisiblePages);
  }
  if (currentPage > totalPages - 3) {
    startPage = Math.max(1, totalPages - (maxVisiblePages - 1));
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  // --- Theme Styles Mapping ---
  const btnStyle = {
    height: 32,
    minWidth: 32,
    padding: "0 8px",
    borderRadius: 6,
    border: `1px solid ${C.border}`,
    background: C.surface,
    color: C.text2,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    transition: "all 0.15s ease",
    outline: "none"
  };

  const activeBtnStyle = {
    ...btnStyle,
    background: C.accent || "#1A73E8",
    borderColor: C.accent || "#1A73E8",
    color: "#FFFFFF",
  };

  const disabledBtnStyle = {
    ...btnStyle,
    opacity: 0.4,
    cursor: "not-allowed",
  };

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between", 
      padding: "12px 16px", 
      borderTop: `1px solid ${C.border}`, 
      background: C.surface,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12
    }}>
      {/* Contextual position indicator string */}
      <span style={{ fontSize: 12, color: C.text3 }}>
        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={currentPage === 1 ? disabledBtnStyle : btnStyle}
        >
          <IconChevronLeft size={16} stroke={2} />
        </button>

        {/* First Page option slide with tailing ellipsis */}
        {startPage > 1 && (
          <>
            <button onClick={() => onPageChange(1)} style={btnStyle}>1</button>
            {startPage > 2 && <span style={{ color: C.text3, fontSize: 12, padding: "0 2px" }}>...</span>}
          </>
        )}

        {/* Visible Window Blocks */}
        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={currentPage === page ? activeBtnStyle : btnStyle}
          >
            {page}
          </button>
        ))}

        {/* Last Page option slide with leading ellipsis */}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span style={{ color: C.text3, fontSize: 12, padding: "0 2px" }}>...</span>}
            <button onClick={() => onPageChange(totalPages)} style={btnStyle}>{totalPages}</button>
          </>
        )}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={currentPage === totalPages ? disabledBtnStyle : btnStyle}
        >
          <IconChevronRight size={16} stroke={2} />
        </button>
      </div>
    </div>
  );
}