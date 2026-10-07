# Assistant de Pré-Audit RGAA 4.1.2 & WCAG 2.1 AA (v2.0 Pro)

Un outil d'assistance et de pré-audit automatisé d'accessibilité numérique, robuste, traçable et modulaire, conçu pour épauler les auditeurs et équipes de développement sans jamais prétendre remplacer le jugement humain.

---

## 🎯 Philosophie & Principes Directeurs

1. **Fiabilité > Quantité de contrôles** : Un contrôle automatisé ne doit jamais émettre de faux avis péremptoire.
2. **Gestion rigoureuse de l'incertitude** : Ne jamais transformer une incertitude en faux *OK*. Chaque contrôle aboutit à l'un des 4 statuts officiels :
   - `OK` : Conformité technique avérée et objectivable.
   - `KO` : Non-conformité formelle ou comportementale indiscutable.
   - `A_VERIFIER` : Présence d'éléments nécessitant impérativement l'analyse qualitative d'un auditeur humain.
   - `NON_APPLICABLE` : Absence d'objets soumis au critère dans la page.
3. **Chaîne de Traçabilité Déductive** :
   Chaque résultat expose explicitement les 4 étapes de raisonnement :
   - **OBSERVATION** : Faits bruts extraits du DOM et des styles calculés.
   - **ANALYSE** : Interprétation technique et croisement des signaux.
   - **DÉCISION** : Verdict opérationnel (OK, KO, À vérifier, NA).
   - **JUSTIFICATION** : Référence explicite aux exigences et à la logique du RGAA.
4. **Preuves concrètes pour chaque anomalie** :
   Sélecteur CSS précis (`main > div:nth-of-type(2) > img`), balise HTML, extrait du code source, mesures de styles (`computedStyle`, luminance, outline, dimensions).

---

## 🏛️ Architecture du Projet

```text
├── server.ts                       # Serveur Express (Orchestration des audits, exports, API)
├── src/
│   ├── types/
│   │   └── audit.ts                # Typage TypeScript strict (RuleResult, ElementEvidence, AuditJob, etc.)
│   ├── engine/
│   │   ├── browserRunner.ts        # Pilotage Playwright Chromium, simulations dynamiques (Tab, submit, reflow)
│   │   └── rules/                  # Moteur modulaire de règles RGAA (stateless)
│   │       ├── images.ts           # RGAA 1.1, 1.2, 1.3 (alt informatif, décoratif, texte, noms de fichiers)
│   │       ├── keyboard.ts         # RGAA 10.7, 12.8, 12.9 (Focus visible, outline/shadow, pièges clavier, tabindex)
│   │       ├── forms.ts            # RGAA 11.1, 11.2, 11.9, 11.10, 11.11 (Labels, placeholder, fieldset, autocomplete)
│   │       ├── contrast.ts         # RGAA 3.1, 3.2, 3.3 (Luminance sRGB 4.5:1/3:1, statuts couleur, liens texte)
│   │       ├── structure.ts        # RGAA 8.5, 8.6, 9.1, 9.2 (<title>, <html lang>, hiérarchie H1-H6, landmarks)
│   │       ├── links.ts            # RGAA 6.1, 6.2 (Liens et boutons vides, intitulés vagues hors contexte)
│   │       ├── aria.ts             # RGAA 7.1 (Références ID brisées, aria-hidden sur focusables, rôles invalides)
│   │       ├── animations.ts       # RGAA 13.8 (Carrousels, vidéos autoplay, prefers-reduced-motion, bouton pause)
│   │       └── zoom.ts             # RGAA 10.4, 10.11 (Hauteurs fixes + overflow:hidden, reflow à 320 CSS px)
│   ├── reporting/
│   │   └── exportService.ts        # Génération Excel (.xlsx stylisé avec ExcelJS), HTML et JSON
│   ├── server/
│   │   └── testPages.ts            # Laboratoire intégré de pages étalons (bon/mauvais alt, pièges, contrastes)
│   ├── components/                 # Interface Utilisateur React
│   │   ├── Header.tsx              # Bandeau institutionnel et rappel RGAA
│   │   ├── AuditLauncher.tsx       # Saisie multi-URLs, sélecteur de cas de test du lab, options avancées
│   │   ├── KpiSummary.tsx          # Compteurs de synthèse cliquables pour filtrage rapide
│   │   ├── RuleCard.tsx            # Carte détaillée avec chaîne déductive et accordéon de preuves
│   │   ├── KeyboardTrailViewer.tsx # Visualisateur séquentiel du parcours Tab avec statut du focus
│   │   ├── ExportToolbar.tsx       # Téléchargement 1-clic Excel, HTML, JSON
│   │   └── FilterBar.tsx           # Filtres par statut, catégorie RGAA, recherche et contrôles humains
│   └── App.tsx                     # Tableau de bord principal avec polling en temps réel
```

---

## 🧪 Laboratoire de Test Intégré

L'application intègre des pages étalons locales prêtes à être testées en 1 clic :
- `/test-pages/good-vs-bad-images` : Cas d'images conformes (alt descriptif, alt vide) vs non conformes (alt manquant, lien sans alt) vs à vérifier (nom de fichier technique, infographie figure/figcaption).
- `/test-pages/keyboard-trap-and-focus` : Focus visible conforme (`outline: 3px solid`) vs focus délibérément supprimé (`outline: none`), bouton natif avec `tabindex="-1"`, faux bouton `div` inaccessible.
- `/test-pages/forms-and-errors` : Labels liés via `label[for]`, champ avec `placeholder` seul (KO), boutons radio sans `fieldset/legend`, absence d'`autocomplete` sur champ email.
- `/test-pages/contrast-and-colors` : Textes à faible contraste (KO 2.4:1), textes grand format (OK 4.6:1), dégradé CSS d'arrière-plan (À vérifier), liens non soulignés dans du texte.

---

## 📊 Formats d'Export

1. **Excel (.xlsx)** :
   - Onglet de synthèse globale avec KPIs et ratios d'investigation humaine.
   - Onglets par page avec coloration conditionnelle conforme aux conventions RGAA (Vert `#92D050`, Rouge `#FF6B6B`, Jaune `#FFD966`, Gris `#E2E8F0`).
   - Colonnes : Thématique, Critère, Titre, Statut, Confiance, Validation humaine, Observation, Décision, Justification, Recommandation, Preuves avec sélecteurs CSS précis.
2. **HTML Autonome** : Rapport web responsive auto-hébergeable, imprimable et prêt pour transmission au client ou aux équipes d'audit.
3. **JSON Structuré** : Restitution intégrale des signaux et métriques pour l'automatisation dans les pipelines CI/CD.

---

## 🚀 Démarrage Rapide

```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement
npm run dev

# Construction pour production
npm run build

# Démarrage en production
npm start
```
