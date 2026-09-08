import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { CASAMENTO } from "@/lib/config";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { SomenteNoSite } from "@/components/CasulaSite";
import "./globals.css";

// Serifada de traço fino e elegante, no espírito do monograma da IDV.
const fonteTitulo = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--fonte-titulo",
  display: "swap",
});

// Sem serifa, geométrica e discreta, para textos corridos e formulários.
const fonteCorpo = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--fonte-corpo",
  display: "swap",
});

const titulo = `${CASAMENTO.noiva} & ${CASAMENTO.noivo} — ${CASAMENTO.dataCurta}`;
const descricao = CASAMENTO.frase;

// Base para resolver /img/og.jpg em URL absoluta. Na Vercel a variável
// VERCEL_URL já vem preenchida; localmente cai no localhost.
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : new URL("http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: baseUrl,
  title: { default: titulo, template: `%s · ${CASAMENTO.noiva} & ${CASAMENTO.noivo}` },
  description: descricao,
  openGraph: {
    title: titulo,
    description: descricao,
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/img/og.jpg", width: 1200, height: 1200, alt: titulo }],
  },
  twitter: { card: "summary_large_image", title: titulo, description: descricao },
};

export const viewport: Viewport = {
  themeColor: "#f0e7da",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fonteTitulo.variable} ${fonteCorpo.variable}`}>
      <head>
        {/* Marca que o JS está ativo antes da primeira pintura. Só então as
            seções começam escondidas para a animação de entrada. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("js-ativo")`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <Cabecalho />
        <main className="flex-1">{children}</main>
        <SomenteNoSite>
          <Rodape />
        </SomenteNoSite>
      </body>
    </html>
  );
}
