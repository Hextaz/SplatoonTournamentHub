"use client";

import React, { useEffect } from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Loader2, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary" | "success";
  isLoading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  variant = "primary",
  isLoading = false,
  icon: CustomIcon,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  let IconComponent: React.ComponentType<{ className?: string }> = CustomIcon || Info;
  let iconBgClass = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
  let confirmBtnClass = "bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500";

  if (variant === "danger") {
    IconComponent = CustomIcon || AlertCircle;
    iconBgClass = "bg-red-500/10 text-red-400 border border-red-500/20";
    confirmBtnClass = "bg-red-600 hover:bg-red-500 text-white focus:ring-red-500";
  } else if (variant === "warning") {
    IconComponent = CustomIcon || AlertTriangle;
    iconBgClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    confirmBtnClass = "bg-amber-600 hover:bg-amber-500 text-white focus:ring-amber-500";
  } else if (variant === "success") {
    IconComponent = CustomIcon || CheckCircle2;
    iconBgClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    confirmBtnClass = "bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500";
  } else {
    IconComponent = CustomIcon || Info;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full relative transform transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${iconBgClass}`}>
            <IconComponent className="w-6 h-6" />
          </div>

          <div className="flex-1 pr-4">
            <h3 className="text-lg font-bold text-white mb-2 leading-tight">
              {title}
            </h3>
            <div className="text-slate-300 text-sm leading-relaxed space-y-2">
              {typeof description === "string" ? <p>{description}</p> : description}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 cursor-pointer ${confirmBtnClass}`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
