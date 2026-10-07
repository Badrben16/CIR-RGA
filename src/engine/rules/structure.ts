import { RuleResult, ElementEvidence } from '../../types/audit.js';

export function evaluateStructure(pageData: any): RuleResult[] {
  const results: RuleResult[] = [];
  const pageTitle = (pageData.title || '').trim();
  const htmlLang = (pageData.htmlLang || '').trim();
  const headings: any[] = pageData.headings || [];
  const landmarks: any[] = pageData.landmarks || [];

  // --- 1. RGAA 8.5 : Titre de la page (<title>) ---
  if (!pageTitle) {
    results.push({
      id: 'RGAA-8.5',
      rgaaCriterion: 'Critère 8.5',
      category: '8. Éléments obligatoires',
      title: 'Présence d\'un titre de page pertinent (<title>)',
      description: 'Chaque page web a-t-elle un titre de document (<title>) renseigné et informatif ?',
      observation: 'Balise <title> manquante ou strictement vide dans le <head>.',
      analysis: 'Le titre de page est la première information restituée aux utilisateurs de lecteurs d\'écran et permet de situer la page immédiatement.',
      decision: 'Non-conformité formelle avérée.',
      justification: 'L\'absence de balise <title> viole une exigence fondamentale d\'accessibilité et de repérage de navigation.',
      status: 'KO',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Ajouter une balise <title> explicite selon la formule : [Titre du contenu principal] - [Nom du site/service].',
      evidence: [{
        selector: 'head > title',
        tagName: 'title',
        htmlSnippet: '<title></title>',
        issueDescription: 'Titre de page absent ou vide.',
        signals: { titleLength: 0 }
      }],
      signalsUsed: ['document.title presence and trim length']
    });
  } else if (pageTitle.length < 5 || /^(accueil|home|page|untitled|sans titre)$/i.test(pageTitle)) {
    results.push({
      id: 'RGAA-8.5',
      rgaaCriterion: 'Critère 8.5',
      category: '8. Éléments obligatoires',
      title: 'Présence d\'un titre de page pertinent (<title>)',
      description: 'Chaque page web a-t-elle un titre de document (<title>) renseigné et informatif ?',
      observation: `Titre détecté mais potentiellement trop court ou générique : "${pageTitle}".`,
      analysis: 'Un titre trop sommaire ne permet pas de distinguer la page au sein d\'un historique ou de plusieurs onglets.',
      decision: 'Nécessite la validation de l\'auditeur pour juger de sa pertinence.',
      justification: 'Le titre est techniquement présent mais sa qualité informative est douteuse.',
      status: 'A_VERIFIER',
      confidence: 'MOYENNE',
      humanValidationRequired: true,
      recommendation: 'Enrichir le titre en précisant la thématique ou rubrique de la page suivie du nom du site.',
      evidence: [{
        selector: 'head > title',
        tagName: 'title',
        htmlSnippet: `<title>${pageTitle}</title>`,
        issueDescription: `Titre trop court ou générique : "${pageTitle}"`,
        signals: { pageTitle, length: pageTitle.length }
      }],
      signalsUsed: ['document.title regex match against generic tokens']
    });
  } else {
    results.push({
      id: 'RGAA-8.5',
      rgaaCriterion: 'Critère 8.5',
      category: '8. Éléments obligatoires',
      title: 'Présence d\'un titre de page pertinent (<title>)',
      description: 'Chaque page web a-t-elle un titre de document (<title>) renseigné et informatif ?',
      observation: `Titre de document présent : "${pageTitle}".`,
      analysis: 'Le titre est non vide et présente une consistance suffisante.',
      decision: 'Conformité technique favorable. Pertinence éditoriale à confirmer lors de l\'audit.',
      justification: 'L\'élément obligatoire est correctement implémenté dans le document.',
      status: 'OK',
      confidence: 'MOYENNE',
      humanValidationRequired: true,
      recommendation: 'Vérifier qu\'il résume bien le sujet précis de cette page par rapport aux autres pages du domaine.',
      evidence: [],
      signalsUsed: ['document.title inspection']
    });
  }

  // --- 2. RGAA 8.6 : Langue principale du document (<html lang>) ---
  if (!htmlLang) {
    results.push({
      id: 'RGAA-8.6',
      rgaaCriterion: 'Critère 8.6',
      category: '8. Éléments obligatoires',
      title: 'Indication de la langue principale du document',
      description: 'La langue principale du document est-elle indiquée via l\'attribut lang de l\'élément <html> ?',
      observation: 'Attribut lang manquant sur l\'élément racine <html>.',
      analysis: 'Sans déclaration de langue, les synthèses vocales utilisent la prononciation et le synthétiseur par défaut du système, provoquant une élocution inintelligible.',
      decision: 'Non-conformité formelle avérée.',
      justification: 'L\'attribut lang est une exigence obligatoire non négociable du RGAA.',
      status: 'KO',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Ajouter l\'attribut adéquat sur la balise racine, par exemple <html lang="fr"> ou <html lang="fr-FR">.',
      evidence: [{
        selector: 'html',
        tagName: 'html',
        htmlSnippet: '<html>',
        issueDescription: 'Balise <html> dépourvue de l\'attribut lang.',
        signals: { htmlLang: '' }
      }],
      signalsUsed: ['document.documentElement.getAttribute("lang")']
    });
  } else {
    const isIsoLangValid = /^[a-z]{2,3}(-[a-zA-Z0-9]{2,8})?$/i.test(htmlLang);
    if (!isIsoLangValid) {
      results.push({
        id: 'RGAA-8.6',
        rgaaCriterion: 'Critère 8.6',
        category: '8. Éléments obligatoires',
        title: 'Indication de la langue principale du document',
        description: 'La langue principale du document est-elle indiquée via l\'attribut lang de l\'élément <html> ?',
        observation: `Attribut lang présent mais valeur non conforme au format BCP 47 / ISO : "${htmlLang}".`,
        analysis: 'Une valeur de code langue erronée est ignorée par les moteurs de synthèse vocale.',
        decision: 'Non-conformité formelle.',
        justification: 'Le code langue doit respecter la nomenclature internationale normalisée.',
        status: 'KO',
        confidence: 'FORTE',
        humanValidationRequired: false,
        recommendation: 'Corriger la valeur pour utiliser un sous-étiquetage conforme (ex: "fr", "en", "es").',
        evidence: [{
          selector: 'html',
          tagName: 'html',
          htmlSnippet: `<html lang="${htmlLang}">`,
          issueDescription: `Code langue "${htmlLang}" syntaxiquement invalide.`,
          signals: { htmlLang }
        }],
        signalsUsed: ['BCP47 regex validation']
      });
    } else {
      results.push({
        id: 'RGAA-8.6',
        rgaaCriterion: 'Critère 8.6',
        category: '8. Éléments obligatoires',
        title: 'Indication de la langue principale du document',
        description: 'La langue principale du document est-elle indiquée via l\'attribut lang de l\'élément <html> ?',
        observation: `Langue déclarée sur <html> : "${htmlLang}".`,
        analysis: 'Le code langue est syntaxiquement correct et reconnu.',
        decision: 'Conformité technique validée. Vérifier la correspondance avec la langue réelle de rédaction.',
        justification: 'L\'attribut lang est présent et respecte la norme BCP 47.',
        status: 'OK',
        confidence: 'FORTE',
        humanValidationRequired: true,
        recommendation: 'Confirmer que la page est bien rédigée dans cette langue (ex: pas un document en anglais marqué "fr").',
        evidence: [],
        signalsUsed: ['lang attribute validation']
      });
    }
  }

  // --- 3. RGAA 9.1 : Hiérarchie des titres (H1-H6) ---
  if (headings.length === 0) {
    results.push({
      id: 'RGAA-9.1',
      rgaaCriterion: 'Critère 9.1',
      category: '9. Structuration de l\'information',
      title: 'Structuration de l\'information par des titres hiérarchisés',
      description: 'L\'information est-elle structurée par l\'utilisation appropriée de titres (H1 à H6) ?',
      observation: 'Aucun titre (balises <h1> à <h6> ou role="heading") détecté dans la page.',
      analysis: 'Les personnes utilisant un lecteur d\'écran naviguent principalement en sautant de titre en titre (raccourci H). Une page sans titres est un bloc opaque.',
      decision: 'Non-conformité structurelle majeure.',
      justification: 'L\'absence de balisage de titres prive les utilisateurs de technologies d\'assistance du plan du document.',
      status: 'KO',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Structurer le contenu en commençant par un titre principal <h1> puis des <h2> pour les grandes sections.',
      evidence: [],
      signalsUsed: ['headings count: 0']
    });
  } else {
    const h1Count = headings.filter(h => h.level === 1).length;
    const jumps: ElementEvidence[] = [];

    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1];
      const curr = headings[i];
      if (curr.level - prev.level > 1) {
        jumps.push({
          selector: curr.selector,
          tagName: curr.tagName,
          htmlSnippet: curr.htmlSnippet,
          signals: { previousLevel: prev.level, currentLevel: curr.level },
          issueDescription: `Saut de niveau injustifié : passage d'un H${prev.level} ("${(prev.text || '').slice(0, 30)}") directement à un H${curr.level} ("${(curr.text || '').slice(0, 30)}").`
        });
      }
    }

    if (h1Count === 0) {
      results.push({
        id: 'RGAA-9.1',
        rgaaCriterion: 'Critère 9.1',
        category: '9. Structuration de l\'information',
        title: 'Structuration de l\'information par des titres hiérarchisés',
        description: 'L\'information est-elle structurée par l\'utilisation appropriée de titres (H1 à H6) ?',
        observation: `${headings.length} titre(s) détecté(s), mais aucun titre principal de niveau 1 (<h1>) n\'a été trouvé.`,
        analysis: 'Le titre H1 définit le thème central de la page et sert d\'ancrage initial.',
        decision: 'Non-conformité structurelle.',
        justification: 'Le plan du document doit débuter par un titre identifiant clairement le sujet de la page.',
        status: 'KO',
        confidence: 'FORTE',
        humanValidationRequired: false,
        recommendation: 'Ajouter un titre <h1> pertinent au début du contenu principal.',
        evidence: headings.slice(0, 5).map(h => ({
          selector: h.selector,
          tagName: h.tagName,
          htmlSnippet: h.htmlSnippet,
          signals: { level: h.level },
          issueDescription: `Titre présent de niveau H${h.level} alors qu'aucun H1 n'existe.`
        })),
        signalsUsed: ['H1 count check']
      });
    } else if (jumps.length > 0) {
      results.push({
        id: 'RGAA-9.1',
        rgaaCriterion: 'Critère 9.1',
        category: '9. Structuration de l\'information',
        title: 'Structuration de l\'information par des titres hiérarchisés',
        description: 'L\'information est-elle structurée par l\'utilisation appropriée de titres (H1 à H6) ?',
        observation: `${jumps.length} saut(s) de niveau hiérarchique détecté(s) dans l'arborescence des titres (ex: H2 vers H4).`,
        analysis: 'Les sauts de niveau désorientent l\'utilisateur qui cherche la subdivision logique du sujet.',
        decision: 'Non-conformité à la cohérence de hiérarchisation.',
        justification: 'Le critère 9.1 interdit de sauter des échelons hiérarchiques dans la subdivision d\'une section.',
        status: 'KO',
        confidence: 'FORTE',
        humanValidationRequired: false,
        recommendation: 'Ajuster les balises de titre pour ne pas sauter de niveau (un H2 doit être subdivisé en H3, pas en H4).',
        evidence: jumps,
        signalsUsed: ['heading sequential level diff check']
      });
    } else {
      results.push({
        id: 'RGAA-9.1',
        rgaaCriterion: 'Critère 9.1',
        category: '9. Structuration de l\'information',
        title: 'Structuration de l\'information par des titres hiérarchisés',
        description: 'L\'information est-elle structurée par l\'utilisation appropriée de titres (H1 à H6) ?',
        observation: `Hiérarchie cohérente sur ${headings.length} titre(s) (${h1Count} H1 présent(s), pas de saut de niveau). Séquence : ${headings.slice(0, 10).map(h => `H${h.level}`).join(' > ')}.`,
        analysis: 'La progression des niveaux est ordonnée.',
        decision: 'Conformité technique favorable. Pertinence éditoriale des intitulés à vérifier.',
        justification: 'L\'imbrication logique des titres respecte le modèle arborescent.',
        status: 'OK',
        confidence: 'MOYENNE',
        humanValidationRequired: true,
        recommendation: 'Confirmer que tous les passages mis en valeur visuellement correspondent bien à des titres réels.',
        evidence: [],
        signalsUsed: ['continuous hierarchy check without gap']
      });
    }
  }

  // --- 4. RGAA 9.2 : Régions principales / Landmarks ARIA ---
  const hasMain = landmarks.some(l => l.role === 'main' || l.tagName === 'main');
  const hasNav = landmarks.some(l => l.role === 'navigation' || l.tagName === 'nav');
  const hasHeader = landmarks.some(l => l.role === 'banner' || l.tagName === 'header');
  const hasFooter = landmarks.some(l => l.role === 'contentinfo' || l.tagName === 'footer');

  if (!hasMain) {
    results.push({
      id: 'RGAA-9.2',
      rgaaCriterion: 'Critère 9.2',
      category: '9. Structuration de l\'information',
      title: 'Présence d\'une zone de contenu principal (<main> ou role="main")',
      description: 'Le document comporte-t-il une région délimitant clairement le contenu principal de la page ?',
      observation: 'Aucune balise <main> ni conteneur avec role="main" n\'a été détecté dans le document.',
      analysis: 'La zone <main> permet aux utilisateurs d\'assistance de sauter directement au contenu principal en ignorant les en-têtes et menus répétitifs.',
      decision: 'Non-conformité aux règles de repérage structurel.',
      justification: 'Le balisage de la zone principale est indispensable pour la navigation rapide par régions.',
      status: 'KO',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Englober le corps principal de la page dans une balise <main> unique.',
      evidence: [{
        selector: 'body',
        tagName: 'body',
        htmlSnippet: '<body>...</body>',
        issueDescription: 'Absence de balise <main> dans le corps du document.',
        signals: { hasMain: false, hasNav, hasHeader, hasFooter }
      }],
      signalsUsed: ['query for main, [role="main"]']
    });
  } else {
    results.push({
      id: 'RGAA-9.2',
      rgaaCriterion: 'Critère 9.2',
      category: '9. Structuration de l\'information',
      title: 'Présence d\'une zone de contenu principal (<main> ou role="main")',
      description: 'Le document comporte-t-il une région délimitant clairement le contenu principal ?',
      observation: `Zone de contenu principal identifiée (<main> ou role="main"). Autres repères : ${hasNav ? 'Navigation ' : ''}${hasHeader ? 'En-tête ' : ''}${hasFooter ? 'Pied de page' : ''}.`,
      analysis: 'Les régions principales de la page sont balisées avec les éléments HTML5 ou rôles ARIA adaptés.',
      decision: 'Conformité structurelle validée.',
      justification: 'L\'utilisateur peut accéder directement au contenu principal via le sélecteur de repères.',
      status: 'OK',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Conserver cette structure en évitant d\'avoir plusieurs balises <main> actives en même temps.',
      evidence: [],
      signalsUsed: ['landmark queries']
    });
  }

  return results;
}
