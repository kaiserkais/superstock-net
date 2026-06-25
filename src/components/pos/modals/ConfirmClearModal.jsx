import React from "react";
import { IconTrash } from "@tabler/icons-react";
import usePosStore from "../../../store/usePosStore";
import { C } from "../posTheme";
import Modal from "../../pos/ui/Modal";
import Btn from "../ui/Btn";

export default function ConfirmClearModal() {
  const { confirmClearModal, closeConfirmClearModal, clearCart } = usePosStore();
  return (
    <Modal open={confirmClearModal} onClose={closeConfirmClearModal} title="Clear cart?" width={360}>
      <div style={{ padding: "20px" }}>
        <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>
          All items in the current cart will be removed. This cannot be undone.
          Consider parking the cart instead.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <Btn onClick={closeConfirmClearModal} variant="outline" style={{ flex: 1 }}>Cancel</Btn>
          <Btn onClick={() => { clearCart(); closeConfirmClearModal(); }} variant="danger" style={{ flex: 2 }}>
            <IconTrash size={15} stroke={2.5} /> Clear cart
          </Btn>
        </div>
      </div>
    </Modal>
  );
}