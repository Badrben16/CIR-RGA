import { RuleResult, ElementEvidence } from '../../types/audit.js';

export function evaluateContrast(pageData: any): RuleResult[] {
  const results: RuleResult[] = [];
  const textContrastItems: any[] = pageData.textContrastItems || [];
  const colorOnlyItems: any[] = pageData.colorOnlyItems || [];
  const inlineLinks: any[] = pageData.inlineLinks || [];

  // --- 1. RGAA 3.2 : Contraste du texte et des images de texte ---
  const definiteFails: ElementEvidence[] = [];
  const uncertainBackgrounds: ElementEvidence[] = [];
  let evaluatedCount = textContrastItems.length;

  for (const item of textContrastItems) {
    const evidence: ElementEvidence = {
      selector: item.selector,
      tagName: item.tagName,
      htmlSnippet: item.htmlSnippet,
      rect: item.rect,
      signals: {
        textColor: item.color,
        bgColor: item.bgColor,
        ratio: item.ratio,
        requiredRatio: item.requiredRatio,
        fontSize: item.fontSize,
        fontWeight: item.fontWeight,
        isLargeText: item.isLargeText,
        hasBackgroundImage: item.hasBackgroundImage,
        hasGradient: item.hasGradient
      },
      issueDescription: ''
    };

    if (item.hasBackgroundImage || item.hasGradient || item.isBgIndeterminate) {
      evidence.issueDescription = `Arrière-plan complexe (image de fond ou dégradé) : contraste théorique calculé à ${item.ratio?.toFixed(2)}:1, mais impossible à valider de façon fiable par calcul statique.`;
      uncertainBackgrounds.push(evidence);
    } else if (item.ratio < item.requiredRatio) {
      evidence.issueDescription = `Texte "${(item.text || '').slice(0, 50)}" : Ratio mesuré de ${item.ratio?.toFixed(2)}:1 inférieur au minimum requis de ${item.requiredRatio}:1 (Couleur texte: ${item.color}, Fond calculé: ${item.bgColor}, Taille: ${item.fontSize}px).`;
      definiteFails.push(evidence);
    }
  }

  if (definiteFails.length > 0) {
    results.push({
      id: 'RGAA-3.2',
      rgaaCriterion: 'Critère 3.2',
      category: '3. Couleurs & Contrastes',
      title: 'Contraste suffisant entre le texte et son arrière-plan',
      description: 'Le texte normal présente-t-il un ratio d\'au moins 4.5:1 et le grand texte d\'au moins 3:1 ?',
      observation: `${definiteFails.length} élément(s) de texte présentent un contraste manifestement insuffisant par rapport à leur arrière-plan calculé.`,
      analysis: 'Les personnes malvoyantes, presbytes ou consultant la page dans des conditions lumineuses difficiles ne pourront pas distinguer ces textes.',
      decision: 'Non-conformité avérée aux critères WCAG 2.1 AA / RGAA 3.2.',
      justification: 'Le calcul de luminance relative selon la formule officielle sRGB produit un ratio inférieur aux seuils normatifs requis.',
      status: 'KO',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Augmenter le contraste en fonçant le texte ou en éclaircissant le fond pour atteindre au minimum 4.5:1 (ou 3:1 si police ≥ 24px ou ≥ 18.5px gras).',
      evidence: definiteFails.slice(0, 15),
      signalsUsed: ['relative luminance formula', 'getComputedStyle color/backgroundColor', 'fontSize/fontWeight thresholding']
    });
  } else if (uncertainBackgrounds.length > 0) {
    results.push({
      id: 'RGAA-3.2',
      rgaaCriterion: 'Critère 3.2',
      category: '3. Couleurs & Contrastes',
      title: 'Contraste suffisant entre le texte et son arrière-plan',
      description: 'Le texte normal présente-t-il un ratio d\'au moins 4.5:1 et le grand texte d\'au moins 3:1 ?',
      observation: `Aucun échec sur fond uni mesurable, mais ${uncertainBackgrounds.length} texte(s) reposent sur des arrière-plans avec dégradé ou image de fond CSS.`,
      analysis: 'Un arrière-plan texturé ou en dégradé peut créer des zones de contraste variable non perceptibles par une moyenne de couleur.',
      decision: 'À vérifier manuellement avec un outil de pipette (ex: Colour Contrast Analyser).',
      justification: 'Incertitude méthodologique : l\'algorithme ne peut garantir la lisibilité sur l\'ensemble de la zone sous-jacente.',
      status: 'A_VERIFIER',
      confidence: 'MOYENNE',
      humanValidationRequired: true,
      recommendation: 'Vérifier au point le plus défavorable du dégradé ou de l\'image que le ratio 4.5:1 reste assuré partout.',
      evidence: uncertainBackgrounds.slice(0, 10),
      signalsUsed: ['background-image detection', 'linear/radial-gradient detection']
    });
  } else {
    results.push({
      id: 'RGAA-3.2',
      rgaaCriterion: 'Critère 3.2',
      category: '3. Couleurs & Contrastes',
      title: 'Contraste suffisant entre le texte et son arrière-plan',
      description: 'Le texte normal présente-t-il un ratio d\'au moins 4.5:1 et le grand texte d\'au moins 3:1 ?',
      observation: `Tous les éléments de texte analysés (${evaluatedCount}) respectent les seuils minimaux de contraste (≥4.5:1 texte normal, ≥3:1 grand texte).`,
      analysis: 'Les couleurs de premier et d\'arrière-plan fournissent une différence de luminance conforme.',
      decision: 'Conformité automatisée favorable.',
      justification: 'L\'ensemble des couples (texte, fond) calculés valide l\'exigence mathématique du RGAA.',
      status: 'OK',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Maintenir cette charte graphique contrastée.',
      evidence: [],
      signalsUsed: ['sRGB luminance contrast verification across all visible texts']
    });
  }

  // --- 2. RGAA 3.1 : Information non véhiculée uniquement par la couleur ---
  if (colorOnlyItems.length > 0) {
    const unreinforcedItems = colorOnlyItems.filter((item: any) => !item.hasIcon && !item.hasExplicitTextPattern);
    if (unreinforcedItems.length > 0) {
      results.push({
        id: 'RGAA-3.1',
        rgaaCriterion: 'Critère 3.1',
        category: '3. Couleurs & Contrastes',
        title: 'Information véhiculée par la couleur complétée par un autre moyen',
        description: 'L\'information transmise par la couleur (état, pastille, validation) est-elle doublée par une forme, une icône ou un texte explicite ?',
        observation: `${unreinforcedItems.length} élément(s) de statut (classes error, success, badge, tag) semblent s'appuyer uniquement sur la couleur sans pictogramme ou mention textuelle descriptive.`,
        analysis: 'Les personnes daltoniennes, monochromates ou utilisant un affichage contrasté ne peuvent pas déduire l\'état si seule la teinte change.',
        decision: 'À vérifier impérativement par l\'auditeur.',
        justification: 'Présence d\'éléments de signalisation visuelle sans indice morphologique redondant automatique détecté.',
        status: 'A_VERIFIER',
        confidence: 'MOYENNE',
        humanValidationRequired: true,
        recommendation: 'Accompagner systématiquement la pastille de couleur d\'une icône distincte (coche, croix, point d\'exclamation) ou d\'un texte explicite.',
        evidence: unreinforcedItems.slice(0, 10).map((item: any) => ({
          selector: item.selector,
          tagName: item.tagName,
          htmlSnippet: item.htmlSnippet,
          signals: { className: item.className, text: item.text },
          issueDescription: 'Élément de statut coloré nécessitant une double signalisation visuelle.'
        })),
        signalsUsed: ['status class regex', 'child icon SVG/CSS content verification']
      });
    } else {
      results.push({
        id: 'RGAA-3.1',
        rgaaCriterion: 'Critère 3.1',
        category: '3. Couleurs & Contrastes',
        title: 'Information véhiculée par la couleur complétée par un autre moyen',
        description: 'L\'information transmise par la couleur est-elle complétée par une forme, icône ou texte explicite ?',
        observation: `${colorOnlyItems.length} élément(s) de statut détecté(s), tous accompagnés d'un pictogramme ou d'un texte descriptif.`,
        analysis: 'Un double codage visuel (couleur + forme/texte) semble présent.',
        decision: 'Conformité sous réserve de validation contextuelle.',
        justification: 'Des composants graphiques complémentaires ont été recensés sur chaque signalement.',
        status: 'OK',
        confidence: 'MOYENNE',
        humanValidationRequired: true,
        recommendation: 'S\'assurer lors des tests avec simulateur daltonien que l\'information reste parfaitement compréhensible.',
        evidence: [],
        signalsUsed: ['icon detection inside status badges']
      });
    }
  }

  // --- 3. RGAA 3.3 : Liens dans le texte distinguables autrement que par la couleur ---
  if (inlineLinks.length > 0) {
    const ununderlinedLinks = inlineLinks.filter((l: any) => !l.isUnderlined && !l.hasBorderBottom);
    if (ununderlinedLinks.length > 0) {
      results.push({
        id: 'RGAA-3.3',
        rgaaCriterion: 'Critère 3.3',
        category: '3. Couleurs & Contrastes',
        title: 'Distinction des liens dans le texte courant',
        description: 'Les liens présents dans un bloc de texte sont-ils soulignés ou distinguables du texte environnant par un moyen autre que la seule couleur ?',
        observation: `${ununderlinedLinks.length} lien(s) inséré(s) dans du texte (<p>, <li>) ne sont pas soulignés (text-decoration: none).`,
        analysis: 'Pour un utilisateur ne percevant pas les couleurs, un lien non souligné au sein d\'un paragraphe est indiscernable du texte ordinaire sauf si un contraste de 3:1 avec le texte environnant et un indicateur au survol/focus sont présents.',
        decision: 'Non-conformité potentielle ou à vérifier selon les conditions spécifiques du RGAA.',
        justification: 'L\'absence de soulignement impose une règle stricte de triple contraste (3:1 avec le texte, 4.5:1 avec le fond, et changement d\'aspect au survol/focus).',
        status: 'A_VERIFIER',
        confidence: 'MOYENNE',
        humanValidationRequired: true,
        recommendation: 'Rétablir le soulignement natif des liens textuels (text-decoration: underline), ou fournir un contour / bordure visible.',
        evidence: ununderlinedLinks.slice(0, 10).map((l: any) => ({
          selector: l.selector,
          tagName: 'a',
          htmlSnippet: l.htmlSnippet,
          signals: { textDecoration: l.textDecoration, color: l.color, parentText: l.parentText },
          issueDescription: `Lien textuel non souligné "${(l.text || '').slice(0, 40)}" dans un bloc de texte.`
        })),
        signalsUsed: ['textDecorationLine computed style', 'ancestor text container evaluation']
      });
    } else {
      results.push({
        id: 'RGAA-3.3',
        rgaaCriterion: 'Critère 3.3',
        category: '3. Couleurs & Contrastes',
        title: 'Distinction des liens dans le texte courant',
        description: 'Les liens présents dans un bloc de texte sont-ils soulignés ou distinguables ?',
        observation: `Tous les liens textuels identifiés (${inlineLinks.length}) sont explicitement soulignés.`,
        analysis: 'Le soulignement assure une distinction immédiate indépendante de la perception des couleurs.',
        decision: 'Conformité validée.',
        justification: 'Le moyen de distinction visuelle le plus robuste et universel est présent.',
        status: 'OK',
        confidence: 'FORTE',
        humanValidationRequired: false,
        recommendation: 'Conserver le soulignement des liens dans le corps éditorial.',
        evidence: [],
        signalsUsed: ['underline presence check on all inline anchor elements']
      });
    }
  }

  return results;
}
