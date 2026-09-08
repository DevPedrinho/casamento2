import type { Metadata } from "next";
import { Suspense } from "react";
import { FormCadastrar } from "./FormCadastrar";

export const metadata: Metadata = {
  title: "Criar cadastro",
  description: "Cadastre-se para confirmar presença e acessar a lista de presentes.",
};

export default function Cadastrar() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <FormCadastrar />
    </Suspense>
  );
}
