import type { ReactNode } from "react";
import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Mentions légales | ${config.appName}`,
  canonicalUrlRelative: "/legal",
});

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-10">
    <h2 className="font-heading font-semibold text-xl text-ink mb-4">{title}</h2>
    <div className="space-y-3 text-sm text-ink-2 leading-relaxed">{children}</div>
  </section>
);

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors mb-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Retour
        </Link>

        <div className="mb-10">
          <h1 className="font-heading font-bold text-3xl text-ink mb-2">Mentions légales</h1>
          <p className="text-sm text-ink-3">
            Conformément aux articles 6-III et 19 de la Loi n° 2004-575 du 21 juin 2004 pour la
            Confiance dans l&apos;Économie Numérique (LCEN).
          </p>
        </div>

        {/* French version */}
        <Section title="1. Éditeur du site">
          <p>
            Le site <strong>flowvaulthq.com</strong> est édité par :
          </p>
          <div className="rounded-xl bg-surface border border-border px-5 py-4 space-y-1">
            <p><strong>Clément Seguin</strong></p>
            <p>Auto-entrepreneur</p>
            <p>SIRET : 909 969 685 00025</p>
            <p>9 rue Marie Angèle Cléret</p>
            <p>03130 Montcombroux-les-Mines, France</p>
            <p>
              Email :{" "}
              <a href="mailto:contact@clement-seguin.fr" className="text-accent hover:underline">
                contact@clement-seguin.fr
              </a>
            </p>
          </div>
          <p className="text-xs text-ink-3">
            En tant qu&apos;auto-entrepreneur dont le chiffre d&apos;affaires est en dessous du
            seuil de franchise en base de TVA, Clément Seguin n&apos;est pas assujetti à la TVA
            (article 293 B du CGI).
          </p>
        </Section>

        <Section title="2. Directeur de la publication">
          <p>Clément Seguin — <a href="mailto:contact@clement-seguin.fr" className="text-accent hover:underline">contact@clement-seguin.fr</a></p>
        </Section>

        <Section title="3. Hébergeur">
          <div className="rounded-xl bg-surface border border-border px-5 py-4 space-y-1">
            <p><strong>Vercel Inc.</strong></p>
            <p>340 Pine Street, Suite 701</p>
            <p>San Francisco, CA 94104, États-Unis</p>
            <p>
              Site :{" "}
              <a
                href="https://vercel.com"
                className="text-accent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                vercel.com
              </a>
            </p>
          </div>
        </Section>

        <Section title="4. Propriété intellectuelle">
          <p>
            L&apos;ensemble des éléments constituant le site FlowVault (design, code, logo,
            marque, contenus éditoriaux) est la propriété exclusive de Clément Seguin, protégé
            par les lois françaises et internationales relatives à la propriété intellectuelle.
          </p>
          <p>
            Toute reproduction, représentation, modification, publication ou adaptation de tout ou
            partie de ces éléments, quel que soit le moyen ou le procédé utilisé, est interdite
            sans l&apos;autorisation écrite préalable de Clément Seguin.
          </p>
          <p>
            Les composants Webflow déposés par les utilisateurs restent la propriété de leurs
            auteurs. FlowVault dispose d&apos;une licence d&apos;affichage limitée aux conditions
            décrites dans les{" "}
            <Link href="/tos" className="text-accent hover:underline">
              Conditions Générales d&apos;Utilisation
            </Link>
            .
          </p>
          <p>
            <strong>Webflow</strong> est une marque déposée de Webflow, Inc. FlowVault est un
            outil indépendant et n&apos;est ni affilié, ni endorsé, ni sponsorisé par Webflow,
            Inc.
          </p>
        </Section>

        <Section title="5. Données personnelles et RGPD">
          <p>
            Les informations relatives au traitement des données personnelles sont détaillées dans
            notre{" "}
            <Link href="/privacy-policy" className="text-accent hover:underline">
              Politique de confidentialité
            </Link>
            , conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE
            2016/679).
          </p>
          <p>
            Responsable du traitement : Clément Seguin —{" "}
            <a href="mailto:contact@clement-seguin.fr" className="text-accent hover:underline">
              contact@clement-seguin.fr
            </a>
          </p>
          <p>
            Vous pouvez exercer vos droits (accès, rectification, effacement, portabilité,
            opposition) en contactant :{" "}
            <a href="mailto:contact@clement-seguin.fr" className="text-accent hover:underline">
              contact@clement-seguin.fr
            </a>
            . En cas de litige, vous pouvez déposer une plainte auprès de la{" "}
            <a
              href="https://www.cnil.fr"
              className="text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              CNIL
            </a>
            .
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>
            FlowVault n&apos;utilise pas de cookies publicitaires ou de traçage. Un cookie de
            session strictement nécessaire est déposé par Supabase pour la gestion de
            l&apos;authentification. Aucun consentement préalable n&apos;est requis pour ce
            cookie essentiel.
          </p>
          <p>
            L&apos;outil d&apos;analyse Vercel Analytics est utilisé sans dépôt de cookies et
            sans collecte de données personnelles identifiantes.
          </p>
        </Section>

        <Section title="7. Limitation de responsabilité">
          <p>
            Clément Seguin ne saurait être tenu responsable des dommages directs ou indirects
            résultant de l&apos;utilisation du site, d&apos;une interruption de service, ou du
            contenu publié par les utilisateurs.
          </p>
          <p>
            Les composants Webflow partagés sur FlowVault sont fournis par leurs auteurs sous
            leur seule responsabilité. FlowVault ne procède à aucune vérification systématique du
            contenu des composants.
          </p>
        </Section>

        <Section title="8. Droit applicable">
          <p>
            Les présentes mentions légales sont soumises au droit français. Tout litige relatif à
            l&apos;utilisation du site sera soumis à la compétence exclusive des tribunaux
            français.
          </p>
        </Section>

        {/* Divider */}
        <div className="border-t border-border my-12" />

        {/* English summary */}
        <div className="rounded-xl bg-surface border border-border p-6">
          <h2 className="font-heading font-semibold text-lg text-ink mb-3">
            Legal notices — English summary
          </h2>
          <div className="space-y-2 text-sm text-ink-2">
            <p><strong>Publisher:</strong> Clément Seguin, sole trader (auto-entrepreneur), France</p>
            <p><strong>SIRET:</strong> 909 969 685 00025</p>
            <p><strong>Address:</strong> 9 rue Marie Angèle Cléret, 03130 Montcombroux-les-Mines, France</p>
            <p><strong>Contact:</strong> <a href="mailto:contact@clement-seguin.fr" className="text-accent hover:underline">contact@clement-seguin.fr</a></p>
            <p><strong>Hosting:</strong> Vercel Inc., 340 Pine Street Suite 701, San Francisco, CA 94104, USA</p>
            <p><strong>Governing law:</strong> French law</p>
            <p>
              <strong>Privacy:</strong>{" "}
              <Link href="/privacy-policy" className="text-accent hover:underline">Privacy Policy</Link>
              {" "}·{" "}
              <Link href="/tos" className="text-accent hover:underline">Terms of Service</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
