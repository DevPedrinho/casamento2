import type { Metadata } from "next";
import { Suspense } from "react";
import { FormEntrar } from "./FormEntrar";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua área de convidado.",
};

export default function Entrar() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <FormEntrar />
    </Suspense>
  );
}
