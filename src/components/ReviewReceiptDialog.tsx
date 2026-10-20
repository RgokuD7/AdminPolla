import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Box,
  IconButton,
  Chip,
  CircularProgress,
  TextField,
  Divider,
  Alert
} from "@mui/material";
import {
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Cancel as RejectIcon,
  OpenInNew as OpenInNewIcon,
  Receipt as ReceiptIcon
} from "@mui/icons-material";
import { PaymentReceipt } from "@/types";
import { formatCurrency } from "@/utils/helpers";

interface ReviewReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  receipt: PaymentReceipt | null;
  participantName: string;
  turnNumber: number;
  quotaAmount: number;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

const COMMON_REJECTION_REASONS = [
  "Monto incompleto",
  "Transferencia no reflejada en cuenta",
  "Comprobante no legible o cortado",
  "Datos de cuenta no coinciden"
];

export const ReviewReceiptDialog: React.FC<ReviewReceiptDialogProps> = ({
  open,
  onClose,
  receipt,
  participantName,
  turnNumber,
  quotaAmount,
  onApprove,
  onReject
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRejectingMode, setIsRejectingMode] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState("");

  if (!receipt) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    setError("");
    try {
      await onApprove();
      handleClose();
    } catch (err: any) {
      console.error("Error aprobando pago:", err);
      setError("No se pudo aprobar el pago. Intenta nuevamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    const finalReason = customReason.trim() || selectedReason;
    if (!finalReason) {
      setError("Indica el motivo del rechazo para que el participante pueda corregirlo.");
      return;
    }

    setIsProcessing(true);
    setError("");
    try {
      await onReject(finalReason);
      handleClose();
    } catch (err: any) {
      console.error("Error rechazando pago:", err);
      setError("No se pudo rechazar el comprobante. Intenta nuevamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsRejectingMode(false);
    setSelectedReason("");
    setCustomReason("");
    setError("");
    onClose();
  };

  const formattedDate = receipt.submittedAt
    ? new Date(receipt.submittedAt).toLocaleString("es-CL", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Reciente";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          bgcolor: "background.paper",
          p: 1
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 900, pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ReceiptIcon sx={{ color: "secondary.main" }} />
          <Typography variant="h6" sx={{ fontWeight: 900, fontSize: "1.05rem" }}>
            Revisar Comprobante
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} disabled={isProcessing}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          {/* Ficha Resumen */}
          <Box sx={{ p: 1.5, bgcolor: "surface.muted", borderRadius: 2, border: 1, borderColor: "divider" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: "0.68rem" }}>
                  PARTICIPANTE
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {participantName}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: "0.68rem" }}>
                  CUOTA TURNO #{turnNumber}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "secondary.main" }}>
                  {formatCurrency(quotaAmount)}
                </Typography>
              </Box>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, fontSize: "0.72rem" }}>
              Enviado: {formattedDate}
            </Typography>
          </Box>

          {/* Imagen del Comprobante */}
          {receipt.receiptUrl ? (
            <Box sx={{ position: "relative", textAlign: "center" }}>
              <Box
                component="img"
                src={receipt.receiptUrl}
                alt="Comprobante de transferencia"
                sx={{
                  width: "100%",
                  maxHeight: 320,
                  objectFit: "contain",
                  borderRadius: 2,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "surface.muted"
                }}
              />
              <Button
                size="small"
                variant="text"
                endIcon={<OpenInNewIcon sx={{ fontSize: "14px !important" }} />}
                onClick={() => window.open(receipt.receiptUrl, "_blank")}
                sx={{ mt: 0.5, fontWeight: 700, fontSize: "0.75rem", color: "secondary.main" }}
              >
                Abrir imagen completa
              </Button>
            </Box>
          ) : (
            <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
              No se encontró la imagen del comprobante.
            </Alert>
          )}

          {/* Modo Rechazo con Motivos Rápidos */}
          {isRejectingMode && (
            <Box sx={{ p: 1.5, bgcolor: "surface.overdue", borderRadius: 2, border: 1, borderColor: "error.main" }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "error.main", display: "block", mb: 1 }}>
                SELECCIONA EL MOTIVO DEL RECHAZO:
              </Typography>

              <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ gap: 0.75, mb: 1.5 }}>
                {COMMON_REJECTION_REASONS.map((r) => (
                  <Chip
                    key={r}
                    label={r}
                    size="small"
                    onClick={() => {
                      setSelectedReason(r);
                      setCustomReason("");
                    }}
                    color={selectedReason === r ? "error" : "default"}
                    variant={selectedReason === r ? "filled" : "outlined"}
                    sx={{ fontWeight: 700, fontSize: "0.72rem", borderRadius: 1.5 }}
                  />
                ))}
              </Stack>

              <TextField
                placeholder="O escribe otro motivo específico..."
                fullWidth
                size="small"
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  setSelectedReason("");
                }}
                inputProps={{ style: { fontSize: "16px" } }}
                sx={{ bgcolor: "background.paper", borderRadius: 1.5 }}
              />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ borderRadius: 1.5, fontSize: "0.8rem", fontWeight: 600 }}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0.5, flexDirection: "column", gap: 1 }}>
        {!isRejectingMode ? (
          <>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              onClick={handleApprove}
              disabled={isProcessing}
              startIcon={isProcessing ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
              sx={{ fontWeight: 800, minHeight: 46, borderRadius: 2 }}
            >
              {isProcessing ? "Aprobando..." : "✅ Aprobar y Confirmar Pago"}
            </Button>

            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={() => setIsRejectingMode(true)}
              disabled={isProcessing}
              startIcon={<RejectIcon />}
              sx={{ fontWeight: 700, minHeight: 42, borderRadius: 2, borderColor: "divider" }}
            >
              Rechazar Comprobante
            </Button>
          </>
        ) : (
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            <Button
              fullWidth
              color="inherit"
              onClick={() => setIsRejectingMode(false)}
              disabled={isProcessing}
              sx={{ fontWeight: 700, minHeight: 44 }}
            >
              Volver
            </Button>
            <Button
              variant="contained"
              color="error"
              fullWidth
              onClick={handleConfirmReject}
              disabled={isProcessing || (!selectedReason && !customReason.trim())}
              sx={{ fontWeight: 800, minHeight: 44, borderRadius: 2 }}
            >
              {isProcessing ? "Rechazando..." : "Confirmar Rechazo"}
            </Button>
          </Stack>
        )}
      </DialogActions>
    </Dialog>
  );
};
