import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  Box,
  Snackbar,
  Alert,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip
} from "@mui/material";
import {
  AccountBalance as BankIcon,
  ContentPaste as PasteIcon,
  CheckCircle as CheckCircleIcon,
  InfoOutlined as InfoIcon
} from "@mui/icons-material";
import { User } from "@/firebase";
import { UserService } from "@/services/firestore";

interface UserProfileDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export const UserProfileDialog: React.FC<UserProfileDialogProps> = ({
  open,
  onClose,
  user
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  useEffect(() => {
    if (!open || !user) return;

    setLoading(true);
    UserService.getUserProfile(user.uid)
      .then((profile) => {
        if (profile) {
          setName(profile.displayName || user.displayName || "");
          setPhone(profile.phone || "");
          if (profile.bankDetails) {
            // Si venía separado por bullet " • ", lo convertimos a saltos de línea para fácil lectura y edición
            const formatted = profile.bankDetails.includes(" • ")
              ? profile.bankDetails.split(" • ").join("\n")
              : profile.bankDetails;
            setBankDetails(formatted);
          }
        } else {
          setName(user.displayName || "");
        }
      })
      .catch((err) => console.error("Error cargando perfil:", err))
      .finally(() => setLoading(false));
  }, [open, user]);

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setBankDetails(text.trim());
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 2000);
      }
    } catch {
      // Si el navegador bloquea la lectura del portapapeles, el usuario puede pegar directamente en el campo
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await UserService.saveUserProfile({
        uid: user.uid,
        displayName: name.trim() || user.displayName || "Usuario",
        email: user.email || "",
        phone: phone.trim(),
        bankDetails: bankDetails.trim()
      });
      setSnackbar(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error("Error guardando perfil:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
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
        <DialogTitle sx={{ fontWeight: 900, pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <BankIcon sx={{ color: "secondary.main" }} />
          Mis Datos de Transferencia
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: "0.85rem", lineHeight: 1.4 }}>
            Configura tus datos para que cuando te toque tu turno, tus compañeros puedan copiar tu cuenta bancaria en 1 toque.
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={32} color="secondary" />
            </Box>
          ) : (
            <Stack spacing={2.5}>
              {/* Tip directo al usuario */}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: "surface.muted",
                  borderRadius: 2,
                  border: 1,
                  borderColor: "divider",
                  display: "flex",
                  gap: 1.25,
                  alignItems: "flex-start"
                }}
              >
                <InfoIcon sx={{ fontSize: 18, color: "secondary.main", mt: 0.2 }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.78rem", lineHeight: 1.4 }}>
                  Abre la app de tu banco, pulsa en <b>"Compartir datos"</b> o <b>"Copiar cuenta"</b> y pégalo directamente aquí abajo tal como te lo entrega.
                </Typography>
              </Paper>

              {/* Campo de texto simple para pegar los datos */}
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary", fontSize: "0.8rem" }}>
                    Datos de la cuenta bancaria:
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handlePasteFromClipboard}
                    startIcon={pasteSuccess ? <CheckCircleIcon color="success" sx={{ fontSize: "14px !important" }} /> : <PasteIcon sx={{ fontSize: "14px !important" }} />}
                    sx={{
                      minHeight: 34,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      borderRadius: 1.5,
                      borderColor: "divider",
                      color: pasteSuccess ? "success.main" : "text.secondary",
                      py: 0.25,
                      px: 1
                    }}
                  >
                    {pasteSuccess ? "¡Pegado!" : "Pegar portapapeles"}
                  </Button>
                </Box>

                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  maxRows={7}
                  placeholder={`Ejemplo:\nBanco Estado\nCuenta RUT: 12.345.678-9\nNombre: Juan Pérez\nRUT: 12.345.678-9\ncorreo@ejemplo.com`}
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  inputProps={{ style: { fontSize: "16px", lineHeight: 1.4 } }}
                  sx={{
                    bgcolor: "background.paper",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2
                    }
                  }}
                />
              </Box>

              {/* Datos complementarios opcionales */}
              <TextField
                label="Nombre del titular / Alias"
                fullWidth
                size="small"
                value={name}
                onChange={(e) => setName(e.target.value)}
                inputProps={{ style: { fontSize: "16px" } }}
              />

              <TextField
                label="Teléfono WhatsApp (opcional)"
                fullWidth
                size="small"
                placeholder="Ej: +56 9 1234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputProps={{ style: { fontSize: "16px" } }}
              />
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 0.5 }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700, minHeight: 48, px: 2 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleSave}
            disabled={saving || loading}
            sx={{
              fontWeight: 800,
              minHeight: 48,
              px: 3,
              borderRadius: 2
            }}
          >
            {saving ? "Guardando..." : "Guardar Datos"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar}
        autoHideDuration={2000}
        onClose={() => setSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ borderRadius: 2, fontWeight: 700 }}>
          Tus datos bancarios se guardaron correctamente
        </Alert>
      </Snackbar>
    </>
  );
};
