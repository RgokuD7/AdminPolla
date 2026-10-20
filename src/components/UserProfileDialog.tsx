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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  CircularProgress
} from "@mui/material";
import {
  AccountBalance as BankIcon,
  CheckCircle as CheckCircleIcon
} from "@mui/icons-material";
import { User } from "@/firebase";
import { UserService } from "@/services/firestore";
import { UserProfile } from "@/types";

interface UserProfileDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

const CHILEAN_BANKS = [
  "BancoEstado / CuentaRUT",
  "Banco de Chile / Edwards",
  "Banco Santander",
  "BCI (Banco de Crédito e Inversiones)",
  "Scotiabank",
  "Banco Falabella",
  "Banco Itaú",
  "Banco BICE",
  "Banco Security",
  "Banco Consorcio",
  "Tenpo",
  "Mach (BCI)",
  "Mercado Pago",
  "Coopeuch",
  "Otro"
];

const ACCOUNT_TYPES = [
  "Cuenta RUT / Vista",
  "Cuenta Corriente",
  "Cuenta de Ahorro"
];

export const UserProfileDialog: React.FC<UserProfileDialogProps> = ({
  open,
  onClose,
  user
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bank, setBank] = useState("");
  const [customBank, setCustomBank] = useState("");
  const [accountType, setAccountType] = useState("Cuenta RUT / Vista");
  const [accountNumber, setAccountNumber] = useState("");
  const [rut, setRut] = useState("");
  const [snackbar, setSnackbar] = useState(false);

  useEffect(() => {
    if (!open || !user) return;

    setLoading(true);
    UserService.getUserProfile(user.uid)
      .then((profile) => {
        if (profile) {
          setName(profile.displayName || user.displayName || "");
          setPhone(profile.phone || "");
          
          // Parsear datos bancarios existentes si tienen formato estructurado
          if (profile.bankDetails) {
            const raw = profile.bankDetails;
            const parts = raw.split(" • ");
            if (parts.length >= 3) {
              const bankFound = CHILEAN_BANKS.find(b => parts[0].includes(b));
              if (bankFound) {
                setBank(bankFound);
              } else {
                setBank("Otro");
                setCustomBank(parts[0]);
              }
              const typeFound = ACCOUNT_TYPES.find(t => parts[1].includes(t));
              if (typeFound) setAccountType(typeFound);
              setAccountNumber(parts[2]?.replace("N° ", "") || "");
              if (parts[3]) setRut(parts[3]?.replace("RUT: ", "") || "");
            } else {
              setAccountNumber(raw);
            }
          }
        } else {
          setName(user.displayName || "");
        }
      })
      .catch((err) => console.error("Error cargando perfil:", err))
      .finally(() => setLoading(false));
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const selectedBankName = bank === "Otro" ? customBank : bank;
    const formattedBankDetails = [
      selectedBankName,
      accountType,
      accountNumber ? `N° ${accountNumber}` : "",
      rut ? `RUT: ${rut}` : "",
      name ? `Titular: ${name}` : ""
    ].filter(Boolean).join(" • ");

    try {
      await UserService.saveUserProfile({
        uid: user.uid,
        displayName: name || user.displayName || "Usuario",
        email: user.email || "",
        phone: phone.trim(),
        bankDetails: formattedBankDetails
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, fontSize: "0.85rem" }}>
            Configura tus datos para que cuando te toque recibir dinero en una polla, tus compañeros puedan copiar tu cuenta en 1 toque.
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={32} color="secondary" />
            </Box>
          ) : (
            <Stack spacing={2}>
              <TextField
                label="Nombre completo del titular"
                fullWidth
                size="small"
                value={name}
                onChange={(e) => setName(e.target.value)}
                inputProps={{ style: { fontSize: "16px" } }}
              />

              <TextField
                label="RUT del titular"
                fullWidth
                size="small"
                placeholder="Ej: 12.345.678-9"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                inputProps={{ style: { fontSize: "16px" } }}
              />

              <FormControl fullWidth size="small">
                <InputLabel>Banco o Institución</InputLabel>
                <Select
                  label="Banco o Institución"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  sx={{ fontSize: "16px" }}
                >
                  {CHILEAN_BANKS.map((b) => (
                    <MenuItem key={b} value={b}>
                      {b}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {bank === "Otro" && (
                <TextField
                  label="Nombre de tu banco"
                  fullWidth
                  size="small"
                  value={customBank}
                  onChange={(e) => setCustomBank(e.target.value)}
                  inputProps={{ style: { fontSize: "16px" } }}
                />
              )}

              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Cuenta</InputLabel>
                <Select
                  label="Tipo de Cuenta"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  sx={{ fontSize: "16px" }}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Número de Cuenta"
                fullWidth
                size="small"
                placeholder="Ej: 12345678"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
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
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700, minHeight: 44 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleSave}
            disabled={saving || loading}
            sx={{
              fontWeight: 800,
              minHeight: 44,
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
