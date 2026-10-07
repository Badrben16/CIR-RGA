import { RuleResult, ElementEvidence } from '../../types/audit.js';

export function evaluateAria(pageData: any): RuleResult[] {
  const results: RuleResult[] = [];
  const ariaElements: any[] = pageData.ariaElements || [];
  const brokenAriaReferences: any[] = pageData.brokenAriaReferences || [];
  const ariaHiddenOnFocusables: any[] = pageData.ariaHiddenOnFocusables || [];
  const invalidAriaRoles: any[] = pageData.invalidAriaRoles || [];

  const ariaAnomalies: ElementEvidence[] = [];

  for (const item of brokenAriaReferences) {
    ariaAnomalies.push({
      selector: item.selector,
      tagName: item.tagName,
      htmlSnippet: item.htmlSnippet,
      signals: { attribute: item.attribute, missingId: item.missingId },
      issueDescription: `Référence ARIA brisée : l'attribut ${item.attribute}="${item.missingId}" pointe vers un identifiant inexistant dans le DOM.`
    });
  }

  for (const item of ariaHiddenOnFocusables) {
    ariaAnomalies.push({
      selector: item.selector,
      tagName: item.tagName,
      htmlSnippet: item.htmlSnippet,
      signals: { hasAriaHidden: true, isFocusable: true },
      issueDescription: `Conflit critique : élément interactif focusable ou contenant des éléments focusables balisé avec aria-hidden="true" (le focus clavier s'y arrête mais le lecteur d'écran reste muet).`
    });
  }

  for (const item of invalidAriaRoles) {
    ariaAnomalies.push({
      selector: item.selector,
      tagName: item.tagName,
      htmlSnippet: item.htmlSnippet,
      signals: { invalidRole: item.role },
      issueDescription: `Rôle ARIA invalide ou inexistant selon la spécification WAI-ARIA : role="${item.role}".`
    });
  }

  if (ariaAnomalies.length > 0) {
    results.push({
      id: 'RGAA-7.1',
      rgaaCriterion: 'Critère 7.1',
      category: '7. Scripts & ARIA',
      title: 'Validité et cohérence de l\'implémentation ARIA',
      description: 'Chaque composant ARIA utilise-t-il des rôles, états et références d\'identifiants valides ?',
      observation: `${ariaAnomalies.length} anomalie(s) ARIA détectée(s) : ${brokenAriaReferences.length} références d'ID brisées, ${ariaHiddenOnFocusables.length} éléments focusables avec aria-hidden="true", ${invalidAriaRoles.length} rôles non conformes.`,
      analysis: 'Une implémentation ARIA défectueuse est souvent pire que pas d\'ARIA du tout, car elle perturbe l\'arbre d\'accessibilité exposé aux lecteurs d\'écran.',
      decision: 'Non-conformité technique avérée.',
      justification: 'Violation des règles syntaxiques et relationnelles de la spécification W3C WAI-ARIA 1.2.',
      status: 'KO',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Supprimer aria-hidden="true" des conteneurs interactifs et corriger les identifiants ciblés par aria-labelledby ou aria-describedby.',
      evidence: ariaAnomalies,
      signalsUsed: ['aria-labelledby/describedby target ID validation', 'aria-hidden on activeElement/focusable check', 'WAI-ARIA role whitelist match']
    });
  } else if (ariaElements.length > 0) {
    results.push({
      id: 'RGAA-7.1',
      rgaaCriterion: 'Critère 7.1',
      category: '7. Scripts & ARIA',
      title: 'Validité et cohérence de l\'implémentation ARIA',
      description: 'Chaque composant ARIA utilise-t-il des rôles, états et références d\'identifiants valides ?',
      observation: `${ariaElements.length} élément(s) utilisant des attributs ARIA analysés, aucune syntaxe invalide ni référence rompue détectée.`,
      analysis: 'Les attributs ARIA respectent le schéma normatif.',
      decision: 'Conformité technique structurelle validée.',
      justification: 'Les liaisons relationnelles et définitions de rôles sont exemptes d\'erreurs techniques.',
      status: 'OK',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Continuer de tester manuellement la restitution lors des changements d\'états dynamiques (aria-expanded, aria-selected).',
      evidence: [],
      signalsUsed: ['WAI-ARIA spec compliance verification']
    });
  } else {
    results.push({
      id: 'RGAA-7.1',
      rgaaCriterion: 'Critère 7.1',
      category: '7. Scripts & ARIA',
      title: 'Validité et cohérence de l\'implémentation ARIA',
      description: 'Chaque composant ARIA utilise-t-il des rôles, états et références d\'identifiants valides ?',
      observation: 'Aucun attribut ARIA spécifique détecté dans la page (HTML sémantique natif employé).',
      analysis: 'L\'utilisation exclusive d\'HTML sémantique natif est la meilleure pratique d\'accessibilité (First Rule of ARIA).',
      decision: 'Non applicable ou conforme par sémantique native.',
      justification: 'Pas d\'attributs ARIA superflus introduits.',
      status: 'NON_APPLICABLE',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Privilégier le balisage natif pour tous les développements.',
      evidence: [],
      signalsUsed: ['aria attributes query count: 0']
    });
  }

  return results;
}
