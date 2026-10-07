import { RuleResult, ElementEvidence } from '../../types/audit.js';

export function evaluateLinksAndButtons(pageData: any): RuleResult[] {
  const results: RuleResult[] = [];
  const links: any[] = pageData.links || [];
  const buttons: any[] = pageData.buttons || [];

  // --- 1. RGAA 6.1 : Intitulé présent pour chaque lien et bouton ---
  const emptyLinks: ElementEvidence[] = [];
  const genericLinks: ElementEvidence[] = [];
  const emptyButtons: ElementEvidence[] = [];

  const genericPatterns = /^(en savoir plus|lire la suite|cliquez ici|cliquer ici|ici|voir plus|voir|découvrir|télécharger|suite|plus|détails|details|more|read more|click here|download|link)$/i;

  for (const link of links) {
    const accessibleName = (link.accessibleName || '').trim();
    const hasAriaLabel = !!link.ariaLabel;
    const hasTitle = !!link.title;

    const evidence: ElementEvidence = {
      selector: link.selector,
      tagName: 'a',
      htmlSnippet: link.htmlSnippet,
      role: link.role,
      accessibleName,
      rect: link.rect,
      signals: {
        href: link.href,
        hasAriaLabel,
        hasTitle,
        hasImgChild: link.hasImgChild,
        isTargetBlank: link.isTargetBlank
      },
      issueDescription: ''
    };

    if (!accessibleName) {
      evidence.issueDescription = `Lien vide vers "${link.href || 'sans href'}" dépourvu de texte visible, d'aria-label ou d'alternative sur image fille.`;
      emptyLinks.push(evidence);
    } else if (genericPatterns.test(accessibleName) && !hasAriaLabel) {
      evidence.issueDescription = `Intitulé générique non explicite hors contexte : "${accessibleName}" pointant vers "${link.href}".`;
      genericLinks.push(evidence);
    }
  }

  for (const btn of buttons) {
    const accessibleName = (btn.accessibleName || '').trim();
    if (!accessibleName) {
      emptyButtons.push({
        selector: btn.selector,
        tagName: btn.tagName || 'button',
        htmlSnippet: btn.htmlSnippet,
        role: btn.role || 'button',
        accessibleName: '',
        rect: btn.rect,
        signals: { type: btn.type, hasIcon: btn.hasIcon },
        issueDescription: `Bouton d'action ou icône cliquable dépourvu de nom accessible (aria-label manquant).`
      });
    }
  }

  // Évaluation liens et boutons vides
  const totalEmpty = emptyLinks.length + emptyButtons.length;
  if (totalEmpty > 0) {
    results.push({
      id: 'RGAA-6.1',
      rgaaCriterion: 'Critère 6.1',
      category: '6. Liens',
      title: 'Présence d\'un intitulé pour chaque lien et bouton',
      description: 'Chaque lien et chaque bouton possède-t-il un intitulé accessible non vide ?',
      observation: `${totalEmpty} élément(s) interactif(s) muet(s) : ${emptyLinks.length} lien(s) vide(s) et ${emptyButtons.length} bouton(s) sans nom accessible.`,
      analysis: 'Un lien ou bouton vide est restitué par les lecteurs d\'écran comme "Lien", "Bouton" ou énonce une URL brute incompréhensible.',
      decision: 'Non-conformité formelle critique.',
      justification: 'Les éléments d\'action doivent obligatoirement posséder un nom accessible (texte visible ou aria-label).',
      status: 'KO',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Ajouter un texte visible explicite, ou pour les boutons icônes, un attribut aria-label="Action réalisée" (ex: aria-label="Rechercher").',
      evidence: [...emptyLinks, ...emptyButtons],
      signalsUsed: ['accessible name calculation on <a> and <button>']
    });
  } else {
    results.push({
      id: 'RGAA-6.1',
      rgaaCriterion: 'Critère 6.1',
      category: '6. Liens',
      title: 'Présence d\'un intitulé pour chaque lien et bouton',
      description: 'Chaque lien et chaque bouton possède-t-il un intitulé accessible non vide ?',
      observation: `Tous les ${links.length} liens et ${buttons.length} boutons analysés disposent d'un nom accessible.`,
      analysis: 'Aucun composant d\'action sans nom n\'a été détecté.',
      decision: 'Conformité technique de présence validée.',
      justification: 'Chaque élément interactif expose un label calculable pour l\'accessibilité.',
      status: 'OK',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Maintenir cette politique sur les futurs composants à base d\'icônes.',
      evidence: [],
      signalsUsed: ['accessibleName validation across all links and buttons']
    });
  }

  // --- 2. RGAA 6.2 : Intitulés explicites vs génériques ---
  if (genericLinks.length > 0) {
    results.push({
      id: 'RGAA-6.2',
      rgaaCriterion: 'Critère 6.2',
      category: '6. Liens',
      title: 'Pertinence et explicitation des intitulés de liens hors contexte',
      description: 'Chaque intitulé de lien est-il explicite ou compréhensible à partir de son contexte immédiat ?',
      observation: `${genericLinks.length} lien(s) utilisent des termes vagues (« en savoir plus », « cliquez ici », « voir ») sans aria-label enrichi.`,
      analysis: 'Lorsqu\'un utilisateur aveugle extrait la liste des liens de la page, il entend une série de "en savoir plus" sans pouvoir savoir où ils mènent.',
      decision: 'Nécessite une vérification humaine pour juger si le contexte de phrase ou de titre parent compense la généralité.',
      justification: 'Le RGAA tolère un intitulé court si le paragraphe ou le titre englobant fournit le contexte, mais recommande vivement un intitulé autonome.',
      status: 'A_VERIFIER',
      confidence: 'MOYENNE',
      humanValidationRequired: true,
      recommendation: 'Enrichir le texte visible (ex: "En savoir plus sur nos tarifs") ou ajouter aria-label="En savoir plus sur l\'offre X".',
      evidence: genericLinks.slice(0, 10),
      signalsUsed: ['generic wording dictionary match', 'absence of distinguishing aria-label']
    });
  } else {
    results.push({
      id: 'RGAA-6.2',
      rgaaCriterion: 'Critère 6.2',
      category: '6. Liens',
      title: 'Pertinence et explicitation des intitulés de liens hors contexte',
      description: 'Chaque intitulé de lien est-il explicite ou compréhensible à partir de son contexte ?',
      observation: `Aucun libellé générique isolé du type « cliquez ici » ou « en savoir plus » n\'a été détecté sans contexte.`,
      analysis: 'Les intitulés de liens présentent une description spécifique de leur cible.',
      decision: 'Conformité favorable.',
      justification: 'La lisibilité de la navigation par hyperliens est assurée.',
      status: 'OK',
      confidence: 'MOYENNE',
      humanValidationRequired: true,
      recommendation: 'Vérifier manuellement la cohérence de destination pour les liens complexes.',
      evidence: [],
      signalsUsed: ['absence of generic patterns in link texts']
    });
  }

  return results;
}
