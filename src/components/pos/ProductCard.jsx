import React from "react";
import { IconPackage } from "@tabler/icons-react";
import usePosStore from "../../store/usePosStore";
import { C, fmt } from "./posTheme";
import Badge from "../pos/ui/Badge";

export default function ProductCard({ product }) {
  const { addSimpleProduct, openWeightModal, openVariantModal } = usePosStore();

  const handleClick = () => {
    if (product.product_type === "variable") {
      openVariantModal(product);
    } else if (product.measurement_unit !== "pcs") {
      openWeightModal(product);
    } else {
      addSimpleProduct(product);
    }
  };

  const isVariable = product.product_type === "variable";
  const isWeighted = !isVariable && product.measurement_unit !== "pcs";

  return (
    <button
      onClick={handleClick}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "12px 13px",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        transition: "border-color 0.13s, box-shadow 0.13s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.accent;
        e.currentTarget.style.boxShadow = `0 0 0 3px ${C.accent}18`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          width: "100%",
          height: 72,
          borderRadius: 8,
          background: C.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 2,
          overflow: "hidden",
        }}
      >
        {product.image_path ? (
          <img
            src={'http://localhost:8080/images/' + product.image_path}
            alt={product.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <IconPackage
            size={28}
            stroke={1.25}
            style={{ color: C.text3 }}
          />
        )}
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: C.text1,
          lineHeight: 1.3,
          minHeight: 30,
        }}
      >
        {product.name}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {isVariable && <Badge color={C.accent}>Variable</Badge>}
        {isWeighted && <Badge color="#7C5CBF">{product.measurement_unit}</Badge>}
        <Badge color={C.text3} bg={C.tag}>
          {product.category_name?.split(" / ")[0]}
        </Badge>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 2,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>
          {fmt(product.selling_price_1)}
        </span>

        {!isVariable && (
          <span
            style={{
              fontSize: 11,
              color: product.quantity < 5 ? C.danger : C.text3,
            }}
          >
            {product.quantity} {product.measurement_unit}
          </span>
        )}
      </div>
    </button>
  );
}