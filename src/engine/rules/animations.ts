import { RuleResult, ElementEvidence } from '../../types/audit.js';

export function evaluateAnimations(pageData: any): RuleResult[] {
  const results: RuleResult[] = [];
  const animatedElements: any[] = pageData.animatedElements || [];
  const autoplayVideos: any[] = pageData.autoplayVideos || [];
  const carousels: any[] = pageData.carousels || [];
  const hasReducedMotionCSS = !!pageData.hasReducedMotionCSS;
  const pauseButtonsFound: any[] = pageData.pauseButtons || [];

  const totalMovingContent = animatedElements.length + autoplayVideos.length + carousels.length;

  if (totalMovingContent === 0) {
    results.push({
      id: 'RGAA-13.8',
      rgaaCriterion: 'Critère 13.8',
      category: '13. Consultation',
      title: 'Contrôle des mouvements et animations',
      description: 'L\'utilisateur peut-il contrôler, mettre en pause ou arrêter tout contenu en mouvement ou clignotant durant plus de 5 secondes ?',
      observation: 'Aucun carrousel automatique, vidéo en lecture automatique ou animation CSS continue détecté.',
      analysis: 'La page ne présente pas d\'animations longues ou perturbatrices susceptibles de déconcentrer l\'utilisateur.',
      decision: 'Règle non applicable par absence de contenus mobiles.',
      justification: 'Aucun objet déclencheur de mouvement autonome n\'a été recensé.',
      status: 'NON_APPLICABLE',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Aucune action requise.',
      evidence: [],
      signalsUsed: ['carousel selector absence', 'video[autoplay] absence', 'infinite animation absence']
    });
    return results;
  }

  const hasControls = pauseButtonsFound.length > 0;

  if (!hasControls && !hasReducedMotionCSS) {
    results.push({
      id: 'RGAA-13.8',
      rgaaCriterion: 'Critère 13.8',
      category: '13. Consultation',
      title: 'Contrôle des mouvements et animations',
      description: 'L\'utilisateur peut-il contrôler, mettre en pause ou arrêter tout contenu en mouvement ou clignotant durant plus de 5 secondes ?',
      observation: `${totalMovingContent} contenu(s) en mouvement identifié(s) (${carousels.length} carrousel(s), ${autoplayVideos.length} vidéo(s) autoplay) SANS bouton pause/stop identifiable ET sans media query prefers-reduced-motion dans les feuilles de style.`,
      analysis: 'Les animations continues et vidéos autoplay sans contrôle peuvent déclencher des crises d\'épilepsie ou empêcher la lecture pour les personnes avec des troubles de l\'attention.',
      decision: 'Non-conformité critique à l\'autonomie de consultation.',
      justification: 'Absence totale de mécanisme de pause ou d\'adaptation aux préférences utilisateur.',
      status: 'KO',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Fournir un bouton explicite "Pause" accessible au clavier en amont de l\'animation, et implémenter @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.001ms !important; } }.',
      evidence: [...carousels, ...autoplayVideos].map((c: any) => ({
        selector: c.selector,
        tagName: c.tagName,
        htmlSnippet: c.htmlSnippet,
        signals: { type: c.type },
        issueDescription: 'Contenu en défilement ou mouvement automatique dépourvu de contrôle utilisateur.'
      })),
      signalsUsed: ['autoplay videos query', 'carousel frameworks detection', 'CSS stylesheet rules inspection']
    });
  } else {
    // There are pause controls or prefers-reduced-motion, but human check is REQUIRED
    results.push({
      id: 'RGAA-13.8',
      rgaaCriterion: 'Critère 13.8',
      category: '13. Consultation',
      title: 'Contrôle des mouvements et animations',
      description: 'L\'utilisateur peut-il contrôler, mettre en pause ou arrêter tout contenu en mouvement ou clignotant durant plus de 5 secondes ?',
      observation: `${totalMovingContent} contenu(s) en mouvement identifié(s). ${hasControls ? `${pauseButtonsFound.length} bouton(s) pause/stop détecté(s). ` : ''}${hasReducedMotionCSS ? 'Prise en compte de prefers-reduced-motion détectée dans les CSS.' : ''}`,
      analysis: 'La présence technique d\'un bouton ou d\'une media query ne garantit pas que toutes les animations s\'arrêtent réellement sans dégradation visuelle.',
      decision: 'Nécessite impérativement le contrôle de l\'auditeur.',
      justification: 'Vérifier in situ que l\'activation du bouton pause gèle effectivement l\'ensemble des défilements.',
      status: 'A_VERIFIER',
      confidence: 'MOYENNE',
      humanValidationRequired: true,
      recommendation: 'Cliquer manuellement sur le bouton pause ou activer l\'option "Réduire les animations" du système et vérifier que tout mouvement s\'interrompt.',
      evidence: pauseButtonsFound.map((p: any) => ({
        selector: p.selector,
        tagName: p.tagName,
        htmlSnippet: p.htmlSnippet,
        accessibleName: p.accessibleName,
        signals: { hasReducedMotionCSS },
        issueDescription: 'Bouton de pause ou contrôle détecté à tester manuellement.'
      })),
      signalsUsed: ['button[aria-label*=pause]', 'prefers-reduced-motion CSS rule query']
    });
  }

  return results;
}
