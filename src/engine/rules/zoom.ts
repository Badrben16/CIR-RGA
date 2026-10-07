import { RuleResult, ElementEvidence } from '../../types/audit.js';

export function evaluateZoomAndReflow(pageData: any, zoomSimulationData?: any): RuleResult[] {
  const results: RuleResult[] = [];
  const fixedHeightClippedContainers: any[] = pageData.fixedHeightClippedContainers || [];
  const reflowIssues: any[] = zoomSimulationData?.reflowIssues || [];
  const hasHorizontalScrollAt320 = !!zoomSimulationData?.hasHorizontalScrollAt320;

  // --- 1. RGAA 10.4 : Zoom 200% sans perte d'information ---
  if (fixedHeightClippedContainers.length > 0) {
    results.push({
      id: 'RGAA-10.4',
      rgaaCriterion: 'Critère 10.4',
      category: '10. Présentation & Zoom',
      title: 'Agrandissement de la taille des textes à 200%',
      description: 'L\'agrandissement du texte jusqu\'à 200% s\'effectue-t-il sans perte de lisibilité, chevauchement ou troncature ?',
      observation: `${fixedHeightClippedContainers.length} conteneur(s) textuel(s) combinant hauteur fixe rigide (px) et overflow:hidden avec contenu tronqué ou masqué.`,
      analysis: 'Lorsque l\'utilisateur double la taille de la police, le texte déborde du conteneur fixe et se retrouve amputé sans ascenseur de lecture.',
      decision: 'Risque de non-conformité élevé / À vérifier avec zoom textuel actif.',
      justification: 'Combinaison de signaux avérés : dimensions rigides en pixels + masque de débordement CSS.',
      status: 'A_VERIFIER',
      confidence: 'MOYENNE',
      humanValidationRequired: true,
      recommendation: 'Éviter les hauteurs fixes explicites (height: Xpx) sur les blocs contenant du texte éditorial ; préférer min-height ou laisser la hauteur automatique.',
      evidence: fixedHeightClippedContainers.slice(0, 10).map((c: any) => ({
        selector: c.selector,
        tagName: c.tagName,
        htmlSnippet: c.htmlSnippet,
        signals: { height: c.height, overflow: c.overflow, scrollHeight: c.scrollHeight, clientHeight: c.clientHeight },
        issueDescription: `Conteneur à hauteur fixe (${c.height}) avec overflow: ${c.overflow} et contenu texte dépassant la boîte.`
      })),
      signalsUsed: ['overflow:hidden + fixed height in px + scrollHeight > clientHeight']
    });
  } else {
    results.push({
      id: 'RGAA-10.4',
      rgaaCriterion: 'Critère 10.4',
      category: '10. Présentation & Zoom',
      title: 'Agrandissement de la taille des textes à 200%',
      description: 'L\'agrandissement du texte jusqu\'à 200% s\'effectue-t-il sans perte de lisibilité ?',
      observation: 'Aucun conteneur rigide avec troncature textuelle par overflow:hidden n\'a été détecté dans les zones de texte.',
      analysis: 'Les conteneurs éditoriaux emploient des hauteurs fluides ou automatiques.',
      decision: 'Conformité automatisée favorable sous réserve de validation visuelle au zoom 200%.',
      justification: 'L\'architecture CSS ne présente pas d\'obstruction géométrique évidente à l\'expansion textuelle.',
      status: 'OK',
      confidence: 'MOYENNE',
      humanValidationRequired: true,
      recommendation: 'Activer le zoom texte seul à 200% (Firefox : Affichage > Zoom > Agrandir le texte seulement) pour confirmer l\'absence de chevauchements.',
      evidence: [],
      signalsUsed: ['CSS container sizing inspection']
    });
  }

  // --- 2. RGAA 10.11 : Reflow (Affichage à 320 CSS px sans défilement horizontal) ---
  if (hasHorizontalScrollAt320 || reflowIssues.length > 0) {
    results.push({
      id: 'RGAA-10.11',
      rgaaCriterion: 'Critère 10.11',
      category: '10. Présentation & Zoom',
      title: 'Reflow des contenus et absence de défilement horizontal à 320px',
      description: 'Le contenu peut-il être présenté sans perte d\'information ni défilement bidimensionnel (horizontal) à une largeur de 320 pixels CSS ?',
      observation: `Défilement horizontal mesuré en largeur 320px (largeur réelle du document: ${zoomSimulationData?.scrollWidthAt320}px pour un viewport de 320px).`,
      analysis: 'Le défilement dans deux dimensions (haut/bas ET gauche/droite) impose un effort cognitif et moteur pénalisant pour les personnes malvoyantes zoomant sur écran étroit.',
      decision: 'Non-conformité au critère de reflow (WCAG 1.4.10 / RGAA 10.11).',
      justification: 'La page génère un ascenseur horizontal persistant sur une largeur équivalente à un zoom 400% sur écran 1280px.',
      status: 'KO',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Utiliser des grilles et conteneurs flexibles (flexbox, CSS grid, max-width: 100%) sans largeurs fixes supérieures à 320px.',
      evidence: reflowIssues.slice(0, 10),
      signalsUsed: ['document.documentElement.scrollWidth > 320px at viewport width 320']
    });
  } else {
    results.push({
      id: 'RGAA-10.11',
      rgaaCriterion: 'Critère 10.11',
      category: '10. Présentation & Zoom',
      title: 'Reflow des contenus et absence de défilement horizontal à 320px',
      description: 'Le contenu peut-il être présenté sans défilement horizontal à 320 CSS pixels ?',
      observation: 'Le document se réorganise harmonieusement sans faire apparaître de barre de défilement horizontale en largeur 320px.',
      analysis: 'Le design adaptatif réorganise les colonnes en flux linéaire vertical.',
      decision: 'Conformité automatisée validée.',
      justification: 'Reflow fluide vérifié par mesure directe de scrollWidth.',
      status: 'OK',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Conserver la fluidité des largeurs lors de l\'intégration de composants tiers.',
      evidence: [],
      signalsUsed: ['viewport 320px reflow measurement']
    });
  }

  return results;
}
