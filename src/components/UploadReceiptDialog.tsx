import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Alert,
  Paper
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  AccountBalance as BankIcon,
  CheckCircle as CheckCircleIcon,
  PhotoCamera as CameraIcon
} from "@mui/icons-material";
import { StorageService } from "@/services/storage";
import { PollaService } from "@/services/firestore";
import { formatCurrency } from "@/utils/helpers";

interface UploadReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  pollaId: string;
  turnNumber: number;
  participantId: string;
  participantName: string;
  quotaAmount: number;
  recipientName: string;
  recipientBankDetails?: string;
  memberIndex?: number;
  onSuccess?: () => void;
}

export const UploadReceiptDialog: React.FC<UploadReceiptDialogProps> = ({
  open,
  onClose,
  pollaId,
  turnNumber,
  participantId,
  participantName,
  quotaAmount,
  recipientName,
  recipientBankDetails,
  memberIndex,
  onSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Por favor selecciona un archivo de imagen (JPG, PNG, WebP).");
        return;
      }
      setSelectedFile(file);
      setErrorMessage("");
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleCopyBank = () => {
    if (recipientBankDetails) {
      navigator.clipboard.writeText(recipientBankDetails);
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("Debes adjuntar una foto o captura de tu comprobante.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      // 1. Subir a Firebase Storage (se comprime automáticamente en StorageService)
      const downloadUrl = await StorageService.uploadReceipt(
        pollaId,
        turnNumber,
        participantId,
        selectedFile
      );

      // 2. Registrar en Firestore como 'in_review'
      await PollaService.submitReceipt(
        pollaId,
        participantId,
        turnNumber,
        downloadUrl,
        quotaAmount,
        memberIndex
      );

      if (onSuccess) onSuccess();
      handleClose();
    } catch (err: any) {
      console.error("Error al enviar comprobante:", err);
      setErrorMessage("No se pudo subir el comprobante. Verifica tu conexión e intenta nuevamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage("");
    onClose();
  };

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
        <Typography variant="h6" sx={{ fontWeight: 900, fontSize: "1.05rem" }}>
          Adjuntar Comprobante
        </Typography>
        <IconButton size="small" onClick={handleClose} disabled={isUploading}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          {/* Card con Datos del Beneficiario */}
          <Box sx={{ p: 1.5, bgcolor: "surface.muted", borderRadius: 2, border: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, fontSize: "0.65rem", letterSpacing: "0.04em", display: "block" }}>
              TRANSFERIR A BENEFICIARIO (TURNO #{turnNumber}):
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary", mt: 0.25 }}>
              {recipientName}
            </Typography>

            {recipientBankDetails ? (
              <Box sx={{ mt: 1 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    mb: 1,
                    bgcolor: "background.paper",
                    borderRadius: 1.5,
                    border: 1,
                    borderColor: "divider"
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.primary",
                      fontSize: "0.78rem",
                      display: "block",
                      whiteSpace: "pre-line",
                      lineHeight: 1.45,
                      fontFamily: "monospace, sans-serif"
                    }}
                  >
                    {recipientBankDetails}
                  </Typography>
                </Paper>
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  onClick={handleCopyBank}
                  startIcon={copiedBank ? <CheckCircleIcon color="success" sx={{ fontSize: "15px !important" }} /> : <ContentCopyIcon sx={{ fontSize: "14px !important" }} />}
                  sx={{
                    minHeight: 44,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    borderRadius: 1.5,
                    borderColor: "divider",
                    bgcolor: "background.paper"
                  }}
                >
                  {copiedBank ? "¡Datos copiados al portapapeles!" : "Copiar datos bancarios"}
                </Button>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                (El beneficiario no ha configurado sus datos bancarios aún)
              </Typography>
            )}

            <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                Monto de tu cuota:
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "secondary.main" }}>
                {formatCurrency(quotaAmount)}
              </Typography>
            </Box>
          </Box>

          {/* Área de Selección / Vista Previa de Imagen */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {previewUrl ? (
            <Box sx={{ position: "relative", textAlign: "center" }}>
              <Box
                component="img"
                src={previewUrl}
                alt="Vista previa del comprobante"
                sx={{
                  width: "100%",
                  maxHeight: 240,
                  objectFit: "contain",
                  borderRadius: 2,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "surface.muted"
                }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                sx={{ mt: 1, fontWeight: 700, fontSize: "0.75rem", borderRadius: 1.5, borderColor: "divider" }}
              >
                Cambiar foto
              </Button>
            </Box>
          ) : (
            <Paper
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              sx={{
                p: 3,
                textAlign: "center",
                borderStyle: "dashed",
                borderWidth: 2,
                borderColor: "secondary.main",
                borderRadius: 2,
                bgcolor: "surface.paid",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": { bgcolor: "background.paper" }
              }}
            >
              <CameraIcon sx={{ fontSize: 38, color: "secondary.main", mb: 0.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary" }}>
                Tomar foto o subir comprobante
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                Toca aquí para seleccionar desde tu galería o cámara
              </Typography>
            </Paper>
          )}

          {errorMessage && (
            <Alert severity="error" sx={{ borderRadius: 1.5, fontSize: "0.8rem", fontWeight: 600 }}>
              {errorMessage}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0.5 }}>
        <Button onClick={handleClose} color="inherit" disabled={isUploading} sx={{ fontWeight: 700, minHeight: 44 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          startIcon={isUploading ? <CircularProgress size={18} color="inherit" /> : <UploadIcon />}
          sx={{
            fontWeight: 800,
            minHeight: 44,
            px: 2.5,
            borderRadius: 2
          }}
        >
          {isUploading ? "Enviando..." : "Enviar Comprobante"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
