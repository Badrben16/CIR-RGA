import { RuleResult, ElementEvidence } from '../../types/audit.js';

export function evaluateImages(pageData: any): RuleResult[] {
  const images: any[] = pageData.images || [];
  const results: RuleResult[] = [];

  // 1. RGAA 1.1 - Chaque image a-t-elle une alternative textuelle ?
  const missingAltEvidences: ElementEvidence[] = [];
  const suspiciousAltEvidences: ElementEvidence[] = [];
  const decorativeEvidences: ElementEvidence[] = [];
  const informativeEvidences: ElementEvidence[] = [];

  for (const img of images) {
    const hasAltAttr = img.hasAlt;
    const altValue = img.alt;
    const isInteractive = img.isInsideLink || img.isInsideButton;
    const role = (img.role || '').toLowerCase();
    const isExplicitlyDecorative = role === 'presentation' || role === 'none' || (hasAltAttr && altValue === '');
    const filename = (img.src || '').split('/').pop()?.split('?')[0] || '';
    
    // Check if filename looks like generated code or placeholder
    const isGenericFilename = /^(dsc|img|image|photo|sans-titre|untitled|capture)[\-_0-9]*/i.test(filename);
    const isSuspiciousAlt = altValue && (
      altValue.length < 3 ||
      isGenericFilename ||
      /^(image|photo|pic|icone|logo|visuel|screenshot)$/i.test(altValue.trim()) ||
      altValue.endsWith('.jpg') || altValue.endsWith('.png') || altValue.endsWith('.webp') || altValue.endsWith('.svg')
    );

    const evidence: ElementEvidence = {
      selector: img.selector,
      tagName: img.tagName,
      htmlSnippet: img.htmlSnippet,
      role: img.role,
      accessibleName: img.accessibleName || altValue || '',
      rect: img.rect,
      signals: {
        alt: altValue,
        hasAltAttr,
        isInsideLink: img.isInsideLink,
        isInsideButton: img.isInsideButton,
        width: img.rect?.width,
        height: img.rect?.height,
        filename,
        ariaLabel: img.ariaLabel,
        hasFigcaption: img.hasFigcaption
      },
      issueDescription: ''
    };

    if (!hasAltAttr && !img.ariaLabel && !img.ariaLabelledBy && role !== 'presentation' && role !== 'none') {
      evidence.issueDescription = 'Balise image dépourvue de tout attribut alt ou équivalent ARIA.';
      missingAltEvidences.push(evidence);
    } else if (isExplicitlyDecorative) {
      if (isInteractive) {
        evidence.issueDescription = 'Image décorative (alt="") située dans un lien ou bouton interactif sans autre intitulé.';
        missingAltEvidences.push(evidence);
      } else {
        decorativeEvidences.push(evidence);
      }
    } else if (isSuspiciousAlt) {
      evidence.issueDescription = `Alternative textuelle suspecte ou générique : "${altValue}" (nom de fichier ou libellé vague).`;
      suspiciousAltEvidences.push(evidence);
    } else if (altValue) {
      informativeEvidences.push(evidence);
    }
  }

  // Rule: RGAA 1.1 Présence d'alternative textuelle
  if (images.length === 0) {
    results.push({
      id: 'RGAA-1.1',
      rgaaCriterion: 'Critère 1.1',
      category: '1. Images',
      title: 'Présence d\'une alternative textuelle pour chaque image',
      description: 'Chaque image porteuse d\'information a-t-elle une alternative textuelle ?',
      observation: 'Aucun élément image ou équivalent détecté dans la page.',
      analysis: 'La page ne contient pas d\'images <img> ou <svg> porteuses d\'information.',
      decision: 'Règle non applicable par absence d\'objet d\'évaluation.',
      justification: 'Aucun élément graphique nécessitant une alternative n\'a été recensé dans le DOM rendu.',
      status: 'NON_APPLICABLE',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Aucune action requise.',
      evidence: [],
      signalsUsed: ['document.images.length', 'svg elements']
    });
  } else if (missingAltEvidences.length > 0) {
    results.push({
      id: 'RGAA-1.1',
      rgaaCriterion: 'Critère 1.1',
      category: '1. Images',
      title: 'Présence d\'une alternative textuelle pour chaque image',
      description: 'Chaque image porteuse d\'information a-t-elle une alternative textuelle ?',
      observation: `${missingAltEvidences.length} image(s) sur ${images.length} ne possèdent aucun attribut alt ou alternative textuelle valide.`,
      analysis: 'L\'absence d\'attribut alt sur une balise <img> empêche les lecteurs d\'écran d\'annoncer son contenu, provoquant souvent la lecture du nom de fichier technique.',
      decision: 'Non-conformité formelle avérée (défaut technique d\'attribut).',
      justification: 'Le RGAA exige qu\'une image sans rôle de présentation explicite possède un attribut alt, même vide si elle est purement décorative.',
      status: 'KO',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Ajouter l\'attribut alt="" si l\'image est décorative, ou un texte concis et descriptif si elle véhicule une information.',
      evidence: missingAltEvidences,
      signalsUsed: ['hasAttribute("alt")', 'aria-label', 'aria-labelledby', 'role="presentation"']
    });
  } else {
    results.push({
      id: 'RGAA-1.1',
      rgaaCriterion: 'Critère 1.1',
      category: '1. Images',
      title: 'Présence d\'une alternative textuelle pour chaque image',
      description: 'Chaque image porteuse d\'information a-t-elle une alternative textuelle ?',
      observation: `Toutes les ${images.length} images de la page possèdent un attribut alt ou sont explicitement déclarées décoratives.`,
      analysis: 'Sur le plan strictement syntaxique, aucun attribut alt manquant n\'a été relevé.',
      decision: 'Conformité technique de surface validée, sans préjuger de la pertinence sémantique.',
      justification: 'L\'obligation formelle de présence d\'un canal d\'alternative est respectée sur l\'ensemble du corpus analysé.',
      status: 'OK',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Maintenir cette rigueur d\'intégration lors de l\'ajout de nouveaux contenus.',
      evidence: [],
      signalsUsed: ['all images have alt or decorative role']
    });
  }

  // 2. RGAA 1.2 - Pertinence de l'alternative textuelle (À VÉRIFIER)
  if (images.length > 0) {
    const needVerificationCount = suspiciousAltEvidences.length + informativeEvidences.length;
    const hasSuspicious = suspiciousAltEvidences.length > 0;

    results.push({
      id: 'RGAA-1.2',
      rgaaCriterion: 'Critère 1.2',
      category: '1. Images',
      title: 'Pertinence de l\'alternative textuelle',
      description: 'L\'alternative textuelle est-elle pertinente par rapport au contenu et à la fonction de l\'image ?',
      observation: `${informativeEvidences.length} image(s) avec alternative textuelle renseignée, dont ${suspiciousAltEvidences.length} avec libellé suspect/générique.`,
      analysis: 'La pertinence sémantique d\'un texte alternatif dépend du contexte éditorial de la page et ne peut être garantie à 100% par un automate.',
      decision: 'Nécessite impérativement le jugement d\'un auditeur humain.',
      justification: hasSuspicious
        ? 'Des alternatives textuelles de type nom de fichier ou mot-clé générique (« image », « photo ») ont été détectées et doivent être qualifiées.'
        : 'Des alternatives textuelles existent, mais leur exactitude contextuelle doit être validée manuellement conformément à la méthodologie RGAA.',
      status: 'A_VERIFIER',
      confidence: hasSuspicious ? 'MOYENNE' : 'FAIBLE',
      humanValidationRequired: true,
      recommendation: 'Vérifier dans le rapport pour chaque image que le texte décrit la fonction réelle (si interactive) ou l\'information transmise (si informative).',
      evidence: suspiciousAltEvidences.length > 0 ? suspiciousAltEvidences : informativeEvidences.slice(0, 10),
      signalsUsed: ['alt content evaluation', 'generic keywords matching', 'file extension in alt']
    });
  }

  // 3. RGAA 1.3 - Images complexes (schémas, infographies, diagrammes)
  const complexImages = images.filter(img => {
    const isLarge = (img.rect?.width || 0) > 400 && (img.rect?.height || 0) > 250;
    const hasLongdesc = !!img.hasLongdesc;
    const hasAriaDescribedBy = !!img.hasAriaDescribedBy;
    const hasFigcaption = !!img.hasFigcaption;
    return (isLarge && !img.isInsideLink) || hasLongdesc || hasAriaDescribedBy || hasFigcaption;
  });

  if (complexImages.length > 0) {
    results.push({
      id: 'RGAA-1.3',
      rgaaCriterion: 'Critère 1.3',
      category: '1. Images',
      title: 'Description détaillée pour les images complexes',
      description: 'Chaque image complexe porteuse d\'information a-t-elle une description détaillée ?',
      observation: `${complexImages.length} image(s) de grande dimension (>400x250px) ou utilisant des mécanismes de description (figure, aria-describedby, longdesc).`,
      analysis: 'Les schémas, graphiques et infographies nécessitent une description textuelle complète accessible à proximité immédiate ou via un lien dédié.',
      decision: 'Nécessite une vérification éditoriale humaine.',
      justification: 'L\'outil a isolé les représentations graphiques complexes susceptibles d\'exiger une transcription détaillée textuelle intégrale.',
      status: 'A_VERIFIER',
      confidence: 'MOYENNE',
      humanValidationRequired: true,
      recommendation: 'S\'assurer qu\'un texte descriptif complet (tableau de données, transcription) accompagne le visuel ou est accessible via un lien adjacent.',
      evidence: complexImages.map(img => ({
        selector: img.selector,
        tagName: img.tagName,
        htmlSnippet: img.htmlSnippet,
        role: img.role,
        accessibleName: img.alt || '',
        rect: img.rect,
        signals: { width: img.rect?.width, height: img.rect?.height, hasFigcaption: img.hasFigcaption },
        issueDescription: 'Image de grande taille identifiée comme visuel potentiellement complexe.'
      })),
      signalsUsed: ['boundingClientRect > 400x250', 'aria-describedby', 'figcaption parent']
    });
  } else {
    results.push({
      id: 'RGAA-1.3',
      rgaaCriterion: 'Critère 1.3',
      category: '1. Images',
      title: 'Description détaillée pour les images complexes',
      description: 'Chaque image complexe porteuse d\'information a-t-elle une description détaillée ?',
      observation: 'Aucune image de grande dimension ou signal d\'infographie complexe identifié.',
      analysis: 'Le corpus analysé ne contient pas de diagrammes ou illustrations volumineuses évidentes.',
      decision: 'Non applicable sous réserve de confirmation d\'absence d\'infographies masquées.',
      justification: 'Aucun élément correspondant aux heuristiques de visuel complexe n\'a été recensé.',
      status: 'NON_APPLICABLE',
      confidence: 'MOYENNE',
      humanValidationRequired: false,
      recommendation: 'Si une infographie est ajoutée ultérieurement, prévoir sa transcription textuelle intégrale.',
      evidence: [],
      signalsUsed: ['dimensions thresholds', 'figure markup absence']
    });
  }

  return results;
}
