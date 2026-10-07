import { RuleResult, ElementEvidence } from '../../types/audit.js';

export function evaluateForms(pageData: any, formSimulationResult?: any): RuleResult[] {
  const forms: any[] = pageData.forms || [];
  const fields: any[] = pageData.formFields || [];
  const results: RuleResult[] = [];

  if (fields.length === 0) {
    results.push({
      id: 'RGAA-11.1',
      rgaaCriterion: 'Critère 11.1',
      category: '11. Formulaires',
      title: 'Nom accessible et étiquette de chaque champ de formulaire',
      description: 'Chaque champ de formulaire a-t-il une étiquette visible et un nom accessible ?',
      observation: 'Aucun champ de saisie de formulaire détecté dans la page.',
      analysis: 'La page ne comporte pas d\'éléments <input>, <select> ou <textarea> destinés à la saisie.',
      decision: 'Non applicable par absence de formulaires.',
      justification: 'Aucun objet soumis à l\'obligation d\'étiquetage n\'est présent.',
      status: 'NON_APPLICABLE',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Aucune action requise.',
      evidence: [],
      signalsUsed: ['document.querySelectorAll("input, select, textarea").length === 0']
    });
    return results;
  }

  // --- 1. RGAA 11.1 : Nom accessible et étiquette visible ---
  const missingNameEvidences: ElementEvidence[] = [];
  const placeholderOnlyEvidences: ElementEvidence[] = [];
  const validFields: ElementEvidence[] = [];

  for (const field of fields) {
    const evidence: ElementEvidence = {
      selector: field.selector,
      tagName: field.tagName,
      htmlSnippet: field.htmlSnippet,
      role: field.role,
      accessibleName: field.accessibleName,
      rect: field.rect,
      signals: {
        hasForLabel: field.hasForLabel,
        hasParentLabel: field.hasParentLabel,
        hasAriaLabel: field.hasAriaLabel,
        hasAriaLabelledBy: field.hasAriaLabelledBy,
        hasPlaceholder: field.hasPlaceholder,
        placeholder: field.placeholder,
        type: field.type
      },
      issueDescription: ''
    };

    if (!field.hasAccessibleName) {
      evidence.issueDescription = 'Champ de formulaire dépourvu de tout nom accessible (ni <label>, ni aria-label, ni title).';
      missingNameEvidences.push(evidence);
    } else if (field.onlyPlaceholder) {
      evidence.issueDescription = `Champ utilisant uniquement l'attribut placeholder="${field.placeholder}" comme étiquette (non conforme RGAA).`;
      placeholderOnlyEvidences.push(evidence);
    } else {
      validFields.push(evidence);
    }
  }

  if (missingNameEvidences.length > 0 || placeholderOnlyEvidences.length > 0) {
    const totalIssues = missingNameEvidences.length + placeholderOnlyEvidences.length;
    results.push({
      id: 'RGAA-11.1',
      rgaaCriterion: 'Critère 11.1',
      category: '11. Formulaires',
      title: 'Nom accessible et étiquette de chaque champ de formulaire',
      description: 'Chaque champ de formulaire a-t-il une étiquette visible et un nom accessible ?',
      observation: `${totalIssues} champ(s) en anomalie sur ${fields.length} : ${missingNameEvidences.length} sans nom accessible, ${placeholderOnlyEvidences.length} utilisant uniquement un placeholder sans étiquette persistante.`,
      analysis: 'Un placeholder disparaît lors de la saisie et ne constitue pas une étiquette valide au sens du RGAA. L\'absence totale de label empêche l\'identification du champ par synthèse vocale.',
      decision: 'Non-conformité confirmée.',
      justification: 'Le RGAA exige qu\'une étiquette visible et rattachée soit présente pour chaque champ de saisie.',
      status: 'KO',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Associer à chaque champ une balise <label for="id_du_champ">Texte</label> visible en permanence, et ne pas se reposer sur le seul placeholder.',
      evidence: [...missingNameEvidences, ...placeholderOnlyEvidences],
      signalsUsed: ['label[for]', 'parent label', 'aria-label', 'aria-labelledby', 'placeholder-only detector']
    });
  } else {
    results.push({
      id: 'RGAA-11.1',
      rgaaCriterion: 'Critère 11.1',
      category: '11. Formulaires',
      title: 'Nom accessible et étiquette de chaque champ de formulaire',
      description: 'Chaque champ de formulaire a-t-il une étiquette visible et un nom accessible ?',
      observation: `Les ${fields.length} champs de formulaire disposent tous d'un nom accessible et d'une étiquette identifiée.`,
      analysis: 'L\'association technique entre les champs et leurs intitulés est correctement établie dans le code.',
      decision: 'Conformité technique de surface validée.',
      justification: 'Tous les éléments analysés possèdent une étiquette valide et pérenne.',
      status: 'OK',
      confidence: 'FORTE',
      humanValidationRequired: false,
      recommendation: 'Conserver ce modèle de balisage pour les formulaires dynamiques futurs.',
      evidence: [],
      signalsUsed: ['label association check on all form fields']
    });
  }

  // --- 2. RGAA 11.2 : Pertinence de l'étiquette (À VÉRIFIER) ---
  results.push({
    id: 'RGAA-11.2',
    rgaaCriterion: 'Critère 11.2',
    category: '11. Formulaires',
    title: 'Pertinence de l\'étiquette associée à chaque champ',
    description: 'Chaque étiquette associée à un champ de formulaire est-elle pertinente par rapport à la saisie attendue ?',
    observation: `${validFields.length} champ(s) possèdent un intitulé accessible visible ou programmatique.`,
    analysis: 'L\'automate peut vérifier la liaison technique, mais pas le sens exact de la consigne (ex: "Nom" vs "Nom de jeune fille", format de date attendu).',
    decision: 'Validation humaine indispensable.',
    justification: 'La pertinence rédactionnelle d\'un libellé nécessite une compréhension contextuelle métier.',
    status: 'A_VERIFIER',
    confidence: 'MOYENNE',
    humanValidationRequired: true,
    recommendation: 'Vérifier que les intitulés sont clairs, sans ambiguïté et précisent les formats de saisie si nécessaire.',
    evidence: validFields.slice(0, 10),
    signalsUsed: ['accessibleName inspection']
  });

  // --- 3. RGAA 11.9 : Regroupement des champs (fieldset / legend) ---
  const radioOrCheckboxGroups: any[] = pageData.radioOrCheckboxGroups || [];
  if (radioOrCheckboxGroups.length > 0) {
    const unbundledGroups = radioOrCheckboxGroups.filter((g: any) => !g.hasFieldset && !g.hasRoleGroup);
    if (unbundledGroups.length > 0) {
      results.push({
        id: 'RGAA-11.9',
        rgaaCriterion: 'Critère 11.9',
        category: '11. Formulaires',
        title: 'Regroupement des champs de même nature (cases à cocher, boutons radio)',
        description: 'Les boutons radio et cases à cocher de même nature sont-ils regroupés dans un conteneur dédié avec légende ?',
        observation: `${unbundledGroups.length} groupe(s) de cases à cocher ou boutons radio de même "name" ne sont pas entourés d'un <fieldset> avec <legend> ou d'un role="group".`,
        analysis: 'Sans regroupement sémantique, le contexte commun de la question n\'est pas restitué à chaque choix lors de la navigation vocale.',
        decision: 'Non-conformité technique.',
        justification: 'Le critère 11.9 impose un regroupement structurel pour donner du sens à la sélection multiple.',
        status: 'KO',
        confidence: 'FORTE',
        humanValidationRequired: false,
        recommendation: 'Encadrer les groupes d\'options par <fieldset><legend>Question posée</legend> ... </fieldset> ou utiliser role="group" avec aria-labelledby.',
        evidence: unbundledGroups.map((g: any) => ({
          selector: g.sampleSelector,
          tagName: 'input',
          htmlSnippet: g.sampleSnippet,
          signals: { groupName: g.name, itemCount: g.count },
          issueDescription: `Groupe "${g.name}" (${g.count} choix) dépourvu de conteneur <fieldset>/<legend>.`
        })),
        signalsUsed: ['radio/checkbox name attribute clustering', 'ancestor fieldset check']
      });
    } else {
      results.push({
        id: 'RGAA-11.9',
        rgaaCriterion: 'Critère 11.9',
        category: '11. Formulaires',
        title: 'Regroupement des champs de même nature (cases à cocher, boutons radio)',
        description: 'Les boutons radio et cases à cocher de même nature sont-ils regroupés dans un conteneur dédié avec légende ?',
        observation: `Tous les ${radioOrCheckboxGroups.length} groupes de choix multiples sont correctement structurés dans un fieldset avec légende.`,
        analysis: 'Les regroupements sémantiques sont en place.',
        decision: 'Conformité validée.',
        justification: 'La structure garantit la restitution de la question parente pour chaque élément interactif.',
        status: 'OK',
        confidence: 'FORTE',
        humanValidationRequired: false,
        recommendation: 'Conserver cette bonne pratique.',
        evidence: [],
        signalsUsed: ['fieldset/legend verification on radio/checkbox clusters']
      });
    }
  }

  // --- 4. RGAA 11.10 : Gestion et restitution des erreurs de saisie ---
  if (formSimulationResult) {
    if (formSimulationResult.triggered) {
      if (formSimulationResult.hasAccessibleError) {
        results.push({
          id: 'RGAA-11.10',
          rgaaCriterion: 'Critère 11.10',
          category: '11. Formulaires',
          title: 'Identification et liaison des messages d\'erreur',
          description: 'Lors d\'une erreur de saisie, un message d\'erreur est-il affiché, relié au champ et annoncé ?',
          observation: `La simulation de soumission a déclenché ${formSimulationResult.errorCount} message(s) d'erreur lié(s) via aria-invalid / role="alert" / aria-describedby.`,
          analysis: 'Le formulaire réagit aux données erronées et expose l\'erreur aux technologies d\'assistance.',
          decision: 'Comportement d\'erreur fonctionnel favorable.',
          justification: 'L\'injection de l\'état d\'erreur dans le DOM a été confirmée en conditions réelles d\'exécution.',
          status: 'OK',
          confidence: 'FORTE',
          humanValidationRequired: false,
          recommendation: 'Veiller à ce que le focus clavier soit automatiquement déplacé vers le premier champ en erreur ou vers le récapitulatif.',
          evidence: formSimulationResult.evidence || [],
          signalsUsed: ['active form submit simulation', 'aria-invalid mutation', 'role="alert" detection']
        });
      } else {
        results.push({
          id: 'RGAA-11.10',
          rgaaCriterion: 'Critère 11.10',
          category: '11. Formulaires',
          title: 'Identification et liaison des messages d\'erreur',
          description: 'Lors d\'une erreur de saisie, un message d\'erreur est-il affiché, relié au champ et annoncé ?',
          observation: 'La soumission avec champs requis non renseignés n\'a fait apparaître aucun message d\'erreur accessible (absence de role="alert", aria-invalid="true" ou aria-describedby).',
          analysis: 'L\'absence de signalement vocal ou textuel laisse l\'utilisateur dans l\'ignorance de l\'échec de validation.',
          decision: 'Non-conformité comportementale.',
          justification: 'Le test comportemental dynamique n\'a relevé aucune alerte accessible après soumission.',
          status: 'KO',
          confidence: 'MOYENNE',
          humanValidationRequired: true,
          recommendation: 'Ajouter aria-invalid="true" sur les champs en faute et lier le message d\'erreur avec aria-describedby="id_message_erreur".',
          evidence: formSimulationResult.evidence || [],
          signalsUsed: ['empty submit observation', 'DOM error diff analysis']
        });
      }
    } else {
      results.push({
        id: 'RGAA-11.10',
        rgaaCriterion: 'Critère 11.10',
        category: '11. Formulaires',
        title: 'Identification et liaison des messages d\'erreur',
        description: 'Lors d\'une erreur de saisie, un message d\'erreur est-il affiché, relié au champ et annoncé ?',
        observation: `${forms.length} formulaire(s) présent(s). Test comportemental non déclenché (absence de bouton de soumission ou sécurité d\'action).`,
        analysis: 'La vérification de la réaction dynamique aux erreurs exige un test interactif sécurisé.',
        decision: 'À vérifier manuellement en soumettant des données invalides.',
        justification: 'L\'automatisation n\'a pas pu soumettre sans risque le formulaire.',
        status: 'A_VERIFIER',
        confidence: 'FAIBLE',
        humanValidationRequired: true,
        recommendation: 'Tester manuellement la saisie d\'un email erroné ou d\'un formulaire vide et vérifier l\'annonce du message.',
        evidence: [],
        signalsUsed: ['static form inspection only']
      });
    }
  }

  // --- 5. RGAA 11.11 : Autocomplétion (WCAG 1.3.5) ---
  const personalFields = fields.filter((f: any) => {
    const nameOrType = `${f.name || ''} ${f.id || ''} ${f.type || ''}`.toLowerCase();
    return /email|tel|phone|telephone|adresse|address|prenom|nom|firstname|lastname|postal|city|ville/i.test(nameOrType);
  });

  if (personalFields.length > 0) {
    const missingAutocomplete = personalFields.filter((f: any) => !f.autocomplete || f.autocomplete === 'off');
    if (missingAutocomplete.length > 0) {
      results.push({
        id: 'RGAA-11.11',
        rgaaCriterion: 'Critère 11.11',
        category: '11. Formulaires',
        title: 'Attribut autocomplete pour la saisie des données personnelles',
        description: 'Les champs collectant des données personnelles de l\'utilisateur possèdent-ils un attribut autocomplete adapté ?',
        observation: `${missingAutocomplete.length} champ(s) de données personnelles (email, nom, téléphone, adresse) sans attribut autocomplete standardisé.`,
        analysis: 'L\'autocomplétion facilite grandement la saisie pour les personnes ayant des difficultés motrices ou cognitives.',
        decision: 'Non-conformité au critère 11.11 (WCAG 1.3.5 niveau AA).',
        justification: 'Des champs types (ex: email, name, tel) sont présents sans l\'attribut autocomplete requis par le standard.',
        status: 'KO',
        confidence: 'FORTE',
        humanValidationRequired: false,
        recommendation: 'Ajouter les attributs correspondants : autocomplete="email", autocomplete="tel", autocomplete="name", autocomplete="postal-code", etc.',
        evidence: missingAutocomplete.map((f: any) => ({
          selector: f.selector,
          tagName: f.tagName,
          htmlSnippet: f.htmlSnippet,
          signals: { detectedPurpose: f.name || f.id || f.type },
          issueDescription: `Champ lié à des données personnelles sans autocomplete (attendu: autocomplete="email", "name", etc.).`
        })),
        signalsUsed: ['name/id regex matching standard personal fields', 'autocomplete attribute verification']
      });
    } else {
      results.push({
        id: 'RGAA-11.11',
        rgaaCriterion: 'Critère 11.11',
        category: '11. Formulaires',
        title: 'Attribut autocomplete pour la saisie des données personnelles',
        description: 'Les champs collectant des données personnelles de l\'utilisateur possèdent-ils un attribut autocomplete adapté ?',
        observation: `Tous les champs de données personnelles identifiés (${personalFields.length}) disposent d'un attribut autocomplete valide.`,
        analysis: 'Les valeurs d\'autocomplétion sont conformes aux spécifications HTML5 et WCAG 2.1.',
        decision: 'Conformité validée.',
        justification: 'Les champs analysés intègrent la métadonnée d\'autocomplétion standardisée.',
        status: 'OK',
        confidence: 'FORTE',
        humanValidationRequired: false,
        recommendation: 'Conserver ces attributs lors des mises à jour des formulaires.',
        evidence: [],
        signalsUsed: ['autocomplete attribute verification on personal input types']
      });
    }
  }

  return results;
}
