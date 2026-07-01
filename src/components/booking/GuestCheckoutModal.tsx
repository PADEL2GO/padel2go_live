import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NavLink } from "react-router-dom";
import { Loader2, User, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface GuestCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, email: string, phone: string) => Promise<void>;
  isSubmitting: boolean;
  locationSlug: string;
}

export function GuestCheckoutModal({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  locationSlug,
}: GuestCheckoutModalProps) {
  const { t } = useTranslation("booking");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agbAccepted, setAgbAccepted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t("guestModal.errors.name"));
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error(t("guestModal.errors.email"));
      return;
    }
    if (!agbAccepted) {
      toast.error(t("guestModal.errors.agb"));
      return;
    }
    await onConfirm(name.trim(), email.trim(), phone.trim());
  };

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("guestModal.title")}</DialogTitle>
          <DialogDescription>
            {t("guestModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="guest-name">
              {t("guestModal.nameLabel")} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="guest-name"
                placeholder={t("guestModal.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="guest-email">
              {t("guestModal.emailLabel")} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="guest-email"
                type="email"
                placeholder={t("guestModal.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                disabled={isSubmitting}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="guest-phone">{t("guestModal.phoneLabel")}</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="guest-phone"
                type="tel"
                placeholder={t("guestModal.phonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* AGB */}
          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="guest-agb"
              checked={agbAccepted}
              onCheckedChange={(checked) => setAgbAccepted(!!checked)}
              disabled={isSubmitting}
            />
            <Label
              htmlFor="guest-agb"
              className="text-sm leading-relaxed cursor-pointer text-muted-foreground"
            >
              {t("guestModal.agbIntro")}
              <NavLink
                to="/agb"
                target="_blank"
                className="text-primary underline hover:no-underline"
              >
                {t("guestModal.agbLink")}
              </NavLink>
              {t("guestModal.agbAnd")}
              <NavLink
                to="/datenschutz"
                target="_blank"
                className="text-primary underline hover:no-underline"
              >
                {t("guestModal.privacyLink")}
              </NavLink>
              {t("guestModal.agbOutro")}
            </Label>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant="lime"
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("guestModal.submitting")}
              </>
            ) : (
              t("guestModal.submit")
            )}
          </Button>

          {/* Login link */}
          <p className="text-center text-sm text-muted-foreground">
            {t("guestModal.hasAccount")}{" "}
            <NavLink
              to={`/auth?redirect=/booking/locations/${locationSlug}`}
              className="text-primary hover:underline font-medium"
            >
              {t("guestModal.login")}
            </NavLink>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
