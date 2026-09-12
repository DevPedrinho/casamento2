import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { carregarCasamento } from "@/lib/configuracoes";
import { urlDoSite } from "@/lib/storage";
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



// Base para resolver /img/og.jpg em URL absoluta. Na Vercel a variável
// VERCEL_URL já vem preenchida; localmente cai no localhost.
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : new URL("http://localhost:3000");

export async function generateMetadata(): Promise<Metadata> {
  const casamento = await carregarCasamento();
  const titulo = `${casamento.noiva} & ${casamento.noivo} — ${casamento.dataCurta}`;
  const descricao = casamento.frase;
  const capa = urlDoSite(casamento.imagens.compartilhamento) ?? "/img/og.jpg";

  return {
    metadataBase: baseUrl,
    title: { default: titulo, template: `%s · ${casamento.noiva} & ${casamento.noivo}` },
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      type: "website",
      locale: "pt_BR",
      images: [{ url: capa, width: 1200, height: 1200, alt: titulo }],
    },
    twitter: { card: "summary_large_image", title: titulo, description: descricao },
  };
}

export const viewport: Viewport = {
  themeColor: "#f0e7da",
  // Deixa a página ocupar a tela inteira do celular; as áreas seguras
  // são devolvidas com env(safe-area-inset-*) onde precisa.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const casamento = await carregarCasamento();

  // A paleta do painel entra como variável CSS: o tema do Tailwind é
  // compilado, mas todas as cores da identidade saem de variáveis, então
  // sobrescrevê-las aqui repinta o site inteiro sem recompilar nada.
  const { oliva, lavanda, terra, creme } = casamento.paleta;
  const paleta = [
    oliva && `--color-oliva:${oliva};`,
    lavanda && `--color-lavanda:${lavanda};`,
    terra && `--color-terra:${terra};`,
    creme && `--color-creme:${creme};`,
  ]
    .filter(Boolean)
    .join("");

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
        {paleta && <style>{`:root{${paleta}}`}</style>}
      </head>
      <body className="flex min-h-screen flex-col">
        <Cabecalho nomes={`${casamento.noiva} & ${casamento.noivo}`} />
        <main className="flex-1">{children}</main>
        <SomenteNoSite>
          <Rodape />
        </SomenteNoSite>
      </body>
    </html>
  );
}
