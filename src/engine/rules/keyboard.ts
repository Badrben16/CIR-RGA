import { RuleResult, ElementEvidence, KeyboardTrailReport } from '../../types/audit.js';

export function evaluateKeyboard(pageData: any, keyboardTrail?: KeyboardTrailReport): RuleResult[] {
  const results: RuleResult[] = [];
  const interactiveElements: any[] = pageData.interactiveElements || [];
  const tabIndexMinus1OnNatives: any[] = pageData.tabIndexMinus1OnNatives || [];
  const nonFocusableClickables: any[] = pageData.nonFocusableClickables || [];

  // --- 1. RGAA 10.7 : Prise de focus visible ---
  if (!keyboardTrail || keyboardTrail.totalSteps === 0) {
    results.push({
      id: 'RGAA-10.7',
      rgaaCriterion: 'Critère 10.7',
      category: '10. Présentation & Zoom',
      title: 'Visibilité de l\'indicateur de prise de focus',
      description: 'Dans le document, chaque élément recevant le focus a-t-il un indicateur de focus visible ?',
      observation: 'Aucune interaction de navigation clavier n\'a pu être réalisée ou aucun élément n\'a reçu le focus.',
      analysis: 'Sans simulation active de la tabulation, l\'indicateur de focus ne peut être mesuré in situ.',
      decision: 'Nécessite impérativement une vérification manuelle approfondie.',
      justification: 'L\'absence de parcours mesurable empêche de conclure sur la perception visuelle du contour de focus.',
      status: 'A_VERIFIER',
      confidence: 'FAIBLE',
      humanValidationRequired: true,
      recommendation: 'Parcourir manuellement l\'ensemble du document avec la touche Tab pour attester de la présence d\'un anneau de focus contrasté.',
      evidence: [],
      signalsUsed: ['activeElement evaluation']
    });
  } else {
    const invisibleSteps = keyboardTrail.steps.filter(s => !s.hasFocusIndicator && !s.isOffScreen);
    if (invisibleSteps.length > 0) {
      const evidences: ElementEvidence[] = invisibleSteps.map(s => ({
        selector: s.selector,
        tagName: s.tagName,
        htmlSnippet: s.htmlSnippet,
        role: s.role,
        accessibleName: s.accessibleName,
        rect: s.rect,
        signals: {
          stepIndex: s.stepIndex,
          outlineWidth: s.computedFocusStyles.outlineWidth,
          outlineStyle: s.computedFocusStyles.outlineStyle,
          boxShadow: s.computedFocusStyles.boxShadow
        },
        issueDescription: `Étape Tab #${s.stepIndex} : Aucun contour visuel détecté (outline: ${s.computedFocusStyles.outlineStyle} ${s.computedFocusStyles.outlineWidth}, boxShadow: ${s.computedFocusStyles.boxShadow || 'aucun'}).`
      }));

      results.push({
        id: 'RGAA-10.7',
        rgaaCriterion: 'Critère 10.7',
        category: '10. Présentation & Zoom',
        title: 'Visibilité de l\'indicateur de prise de focus',
        description: 'Dans le document, chaque élément recevant le focus a-t-il un indicateur de focus visible ?',
        observation: `${invisibleSteps.length} élément(s) interactif(s) sur ${keyboardTrail.steps.length} étapes testées ne présentent aucun indicateur de focus perceptible (outline: none / 0px, pas d'ombrage ni contraste distinctif).`,
        analysis: 'La suppression de la bordure native de focus sans remplacement visuel alternatif rend la navigation clavier quasi-impossible pour les personnes naviguant sans souris.',
        decision: 'Non-conformité confirmée sur les éléments identifiés.',
        justification: 'Les styles calculés en état :focus sur ces éléments ne révèlent aucune modification géométrique ou visuelle suffisante.',
        status: 'KO',
        confidence: 'FORTE',
        humanValidationRequired: false,
        recommendation: 'Ajouter en CSS un style visible au focus (ex: :focus-visible { outline: 2px solid #005A9C; outline-offset: 2px; }). Ne jamais utiliser outline: none sans alternative!',
        evidence: evidences,
        signalsUsed: ['getComputedStyle :focus', 'outlineWidth', 'outlineStyle', 'boxShadow']
      });
    } else {
      results.push({
        id: 'RGAA-10.7',
        rgaaCriterion: 'Critère 10.7',
        category: '10. Présentation & Zoom',
        title: 'Visibilité de l\'indicateur de prise de focus',
        description: 'Dans le document, chaque élément recevant le focus a-t-il un indicateur de focus visible ?',
        observation: `Sur les ${keyboardTrail.steps.length} étapes de tabulation mesurées, un contour de focus (outline ou box-shadow) a été détecté à chaque étape.`,
        analysis: 'Un changement d\'aspect visuel est activé lors de la prise de focus.',
        decision: 'Conformité automatisée favorable, nécessitant de vérifier la distinction de contraste de l\'anneau.',
        justification: 'Les propriétés graphiques indiquent la présence d\'un retour visuel sur l\'élément ciblé.',
        status: 'OK',
        confidence: 'MOYENNE',
        humanValidationRequired: true,
        recommendation: 'Confirmer que la couleur du contour de focus offre un ratio de contraste d\'au moins 3:1 par rapport au fond adjacent.',
        evidence: [],
        signalsUsed: ['simulated tab navigation', 'computed focus style checks']
      });
    }
  }

  // --- 2. RGAA 12.8 : Navigation au clavier de tous les éléments interactifs ---
  const trapDetected = keyboardTrail?.trapDetected;
  const inaccessibleEvidences: ElementEvidence[] = [];

  for (const item of tabIndexMinus1OnNatives) {
    inaccessibleEvidences.push({
      selector: item.selector,
      tagName: item.tagName,
      htmlSnippet: item.htmlSnippet,
      role: item.role,
      accessibleName: item.text || item.accessibleName,
      signals: { tabIndex: -1 },
      issueDescription: `Composant interactif natif (${item.tagName}) exclu du parcours clavier via tabindex="-1".`
    });
  }

  for (const item of nonFocusableClickables) {
    inaccessibleEvidences.push({
      selector: item.selector,
      tagName: item.tagName,
      htmlSnippet: item.htmlSnippet,
      signals: { hasOnClick: true, isFocusable: false },
      issueDescription: `Élément <div> ou <span> pourvu d'un gestionnaire de clic mais dépourvu d'attribut tabindex="0" ou de rôle adéquat.`
    });
  }

  if (inaccessibleEvidences.length > 0) {
    results.push({
      id: 'RGAA-12.8',
      rgaaCriterion: 'Critère 12.8',
      category: '12. Navigation & Clavier',
      title: 'Tous les éléments interactifs sont-ils atteignables au clavier ?',
      description: 'La séquence de tabulation et les composants interactifs permettent-ils d\'accéder à toutes les fonctionnalités au clavier ?',
      observation: `${inaccessibleEvidences.length} anomalie(s) détectée(s) : éléments interactifs exclus du focus (tabindex="-1") ou faux boutons sans focusabilité.`,
      analysis: 'Un élément natif ou un conteneur déclenchant une action interactive doit être atteignable via la touche Tabulation.',
      decision: 'Non-conformité avérée.',
      justification: 'Des composants interactifs sont physiquement inatteignables lors d\'une navigation séquentielle au clavier.',
      status: 'KO',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Utiliser des balises natives <button> ou <a>, ou ajouter tabindex="0" et écouter les événements "keydown" (Entrée et Espace).',
      evidence: inaccessibleEvidences,
      signalsUsed: ['tabindex="-1" query', 'click handlers without tabindex', 'interactive elements count']
    });
  } else {
    results.push({
      id: 'RGAA-12.8',
      rgaaCriterion: 'Critère 12.8',
      category: '12. Navigation & Clavier',
      title: 'Tous les éléments interactifs sont-ils atteignables au clavier ?',
      description: 'La séquence de tabulation et les composants interactifs permettent-ils d\'accéder à toutes les fonctionnalités au clavier ?',
      observation: `Aucun composant interactif exclu ou dégradé détecté parmi les ${interactiveElements.length} éléments recensés.`,
      analysis: 'Les balises interactives natives conservent leur comportement standard.',
      decision: 'Vérification manuelle requise pour les composants riches (modales, sous-menus, accordéons).',
      justification: 'La structure de base respecte l\'accessibilité clavier, mais l\'exhaustivité fonctionnelle nécessite validation humaine.',
      status: 'A_VERIFIER',
      confidence: 'MOYENNE',
      humanValidationRequired: true,
      recommendation: 'Vérifier l\'interaction clavier dans les fenêtres modales et menus déroulants (fermeture Échap, navigation flèches).',
      evidence: [],
      signalsUsed: ['DOM interactive elements audit', 'tabindex checks']
    });
  }

  // --- 3. RGAA 12.9 : Absence de piège au clavier (Keyboard Trap) ---
  if (trapDetected) {
    results.push({
      id: 'RGAA-12.9',
      rgaaCriterion: 'Critère 12.9',
      category: '12. Navigation & Clavier',
      title: 'Absence de piège clavier dans le parcours séquentiel',
      description: 'L\'utilisateur peut-il entrer et sortir de chaque composant ou sous-partie sans rester bloqué ?',
      observation: 'Un piège clavier (boucle fermée ou blocage de document.activeElement) a été mesuré pendant le test de tabulation séquentielle.',
      analysis: 'L\'appui répété sur Tab reste confiné sur le même élément ou oscille en boucle infinie fermée sans possibilité d\'avancer.',
      decision: 'Non-conformité critique au RGAA (Bloquant).',
      justification: 'Le piège clavier constitue une barrière absolue empêchant la poursuite de la navigation pour les utilisateurs de technologies d\'assistance.',
      status: 'KO',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Corriger la gestion du focus dans le composant responsable (ex: libérer le focus lors de la tabulation ou implémenter la fermeture avec la touche Escape).',
      evidence: (keyboardTrail?.steps || []).filter(s => s.isTrap).map(s => ({
        selector: s.selector,
        tagName: s.tagName,
        htmlSnippet: s.htmlSnippet,
        role: s.role,
        signals: { isTrap: true },
        issueDescription: 'Élément sur lequel le focus est resté captif de manière infranchissable.'
      })),
      signalsUsed: ['activeElement repetition loop', 'Tab sequence cycle detector']
    });
  } else {
    results.push({
      id: 'RGAA-12.9',
      rgaaCriterion: 'Critère 12.9',
      category: '12. Navigation & Clavier',
      title: 'Absence de piège clavier dans le parcours séquentiel',
      description: 'L\'utilisateur peut-il entrer et sortir de chaque composant ou sous-partie sans rester bloqué ?',
      observation: 'Aucun blocage ou boucle infinie fermée détectée lors de la simulation séquentielle de tabulation.',
      analysis: 'La touche Tab permet de progresser continuellement à travers les éléments de la page.',
      decision: 'Comportement nominal automatique sous réserve de test des modales interactives.',
      justification: 'Le parcours linéaire a progressé sans interruption non sollicitée.',
      status: 'OK',
      confidence: 'MOYENNE',
      humanValidationRequired: true,
      recommendation: 'Ouvrir les modales et boîtes de dialogue pour vérifier que la touche Échap et le focus trap sont correctement gérés et libérés.',
      evidence: [],
      signalsUsed: ['continuous activeElement traversal without cycle']
    });
  }

  return results;
}
