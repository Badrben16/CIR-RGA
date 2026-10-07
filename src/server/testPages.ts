export const testPages: Record<string, { title: string; description: string; html: string }> = {
  'good-vs-bad-images': {
    title: 'Laboratoire Test : Images & Alternatives Textuelles',
    description: 'Comporte des images avec alt descriptif, alt vide décoratif, alt manquant (KO), nom de fichier en alt (À vérifier), et infographie complexe.',
    html: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Laboratoire Test - Images RGAA</title>
  <style>
    body { font-family: sans-serif; padding: 20px; line-height: 1.5; }
    .card { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <main>
    <h1>Page de Test RGAA : Alternatives Textuelles</h1>

    <div class="card">
      <h2>1. Image correctement alternative (Conforme)</h2>
      <img src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300" alt="Dégradé de couleurs chaudes allant du violet au jaune orangé" width="300" height="200">
    </div>

    <div class="card">
      <h2>2. Image purement décorative avec alt vide (Conforme)</h2>
      <img src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300" alt="" width="300" height="200">
    </div>

    <div class="card">
      <h2>3. Image informative SANS alt (Non-Conforme KO)</h2>
      <img src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300" width="300" height="200">
    </div>

    <div class="card">
      <h2>4. Image avec nom de fichier technique en alt (À Vérifier)</h2>
      <img src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300" alt="IMG_20240901_1430.jpg" width="300" height="200">
    </div>

    <div class="card">
      <h2>5. Image-lien avec alt manquant (Non-Conforme KO)</h2>
      <a href="#test">
        <img src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=80" width="80" height="80">
      </a>
    </div>

    <div class="card">
      <h2>6. Image complexe de grand format avec légende figcaption (À Vérifier)</h2>
      <figure>
        <img src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500" alt="Diagramme de répartition des flux économiques régionaux" width="500" height="300">
        <figcaption>Figure 1 : Graphique détaillé des flux budgétaires annuels (description complète disponible en annexe).</figcaption>
      </figure>
    </div>
  </main>
</body>
</html>`
  },

  'keyboard-trap-and-focus': {
    title: 'Laboratoire Test : Navigation Clavier & Focus',
    description: 'Comporte un bouton avec focus invisible (outline:none), un lien normal, un composant avec piège clavier, et des div cliquables sans tabindex.',
    html: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Laboratoire Test - Navigation Clavier RGAA</title>
  <style>
    body { font-family: sans-serif; padding: 24px; }
    .btn { padding: 8px 16px; margin: 8px; display: inline-block; cursor: pointer; }
    /* Focus délibérément supprimé sans alternative (KO) */
    .no-focus-ring:focus { outline: none !important; box-shadow: none !important; }
    /* Focus exemplaire conforme */
    .good-focus:focus-visible { outline: 3px solid #0284c7; outline-offset: 2px; }
  </style>
</head>
<body>
  <main>
    <h1>Test Navigation Clavier et Focus RGAA</h1>

    <section>
      <h2>Boutons avec indicateur de focus</h2>
      <button class="btn good-focus">Bouton 1 : Focus visible conforme</button>
      <button class="btn no-focus-ring">Bouton 2 : Focus masqué (outline: none KO)</button>
      <a href="#test3" class="good-focus">Lien accessible au clavier</a>
    </section>

    <section>
      <h2>Faux bouton cliquable (div sans tabindex ni role)</h2>
      <div onclick="alert('clic')" style="background:#e2e8f0; padding:10px; display:inline-block; border-radius:4px;">
        Faux bouton DIV (inaccessible au clavier KO)
      </div>
    </section>

    <section>
      <h2>Bouton natif exclu par tabindex="-1"</h2>
      <button tabindex="-1" class="btn">Bouton natif avec tabindex="-1" (exclu KO)</button>
    </section>
  </main>
</body>
</html>`
  },

  'forms-and-errors': {
    title: 'Laboratoire Test : Formulaires & Validation d\'Erreurs',
    description: 'Comporte des champs avec label for, un champ sans label, un champ avec placeholder seul (KO), et un champ de données personnelles sans autocomplete.',
    html: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Laboratoire Test - Formulaires RGAA</title>
  <style>
    body { font-family: sans-serif; padding: 24px; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-weight: bold; margin-bottom: 4px; }
    input { padding: 8px; width: 300px; }
    .error-msg { color: #dc2626; font-size: 13px; margin-top: 4px; }
  </style>
</head>
<body>
  <main>
    <h1>Test d'Accessibilité des Formulaires</h1>

    <form action="#submit" method="GET" novalidate id="testForm">
      <div class="form-group">
        <label for="nameField">Nom complet (Obligatoire) *</label>
        <input type="text" id="nameField" name="name" required aria-required="true" autocomplete="name">
      </div>

      <div class="form-group">
        <!-- Manque autocomplete email -->
        <label for="emailField">Adresse électronique *</label>
        <input type="email" id="emailField" name="email" required>
      </div>

      <div class="form-group">
        <!-- Champ SANS label, uniquement un placeholder (KO RGAA) -->
        <input type="text" name="company" placeholder="Nom de votre entreprise (sans label visible)">
      </div>

      <div class="form-group">
        <!-- Boutons radios sans fieldset / legend (KO RGAA 11.9) -->
        <p>Civilité (sans fieldset) :</p>
        <label><input type="radio" name="civility" value="mme"> Mme</label>
        <label><input type="radio" name="civility" value="m"> M.</label>
      </div>

      <button type="submit" id="submitBtn">Envoyer la demande</button>

      <div id="errorSummary" role="alert" style="display:none; color:red; margin-top:15px;">
        Veuillez corriger les champs obligatoires avant de soumettre.
      </div>
    </form>

    <script>
      document.getElementById('testForm').addEventListener('submit', function(e) {
        e.preventDefault();
        document.getElementById('errorSummary').style.display = 'block';
        document.getElementById('nameField').setAttribute('aria-invalid', 'true');
      });
    </script>
  </main>
</body>
</html>`
  },

  'contrast-and-colors': {
    title: 'Laboratoire Test : Contrastes & Information par la Couleur',
    description: 'Comporte des textes à fort contraste (conforme), à faible contraste (KO), un arrière-plan avec dégradé (À vérifier), et des liens non soulignés dans du texte.',
    html: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Laboratoire Test - Couleurs et Contrastes RGAA</title>
  <style>
    body { font-family: sans-serif; padding: 24px; background-color: #ffffff; color: #111827; }
    /* Contraste KO : gris clair #9ca3af sur blanc = 2.4:1 (attendu 4.5:1) */
    .bad-contrast { color: #9ca3af; font-size: 15px; }
    /* Grand texte OK : #4b5563 sur blanc = 4.6:1 (attendu 3:1 pour grand texte) */
    .large-text-ok { font-size: 26px; font-weight: bold; color: #4b5563; }
    /* Fond dégradé complexe */
    .gradient-bg { background: linear-gradient(90deg, #1e3a8a, #3b82f6); color: #ffffff; padding: 16px; border-radius: 6px; }
    /* Lien non souligné dans paragraphe (KO RGAA 3.3) */
    .ununderlined-link { text-decoration: none; color: #2563eb; }
  </style>
</head>
<body>
  <main>
    <h1>Test Couleurs et Contrastes</h1>

    <p class="large-text-ok">Titre Grand Format : Contraste suffisant (≥3:1)</p>
    
    <p class="bad-contrast">
      Ce paragraphe utilise un gris trop clair (#9ca3af sur fond blanc), produisant un contraste mesuré de 2.4:1, très en-deçà du seuil obligatoire de 4.5:1 (KO RGAA 3.2).
    </p>

    <div class="gradient-bg">
      <p>Texte posé sur un arrière-plan en dégradé CSS linéaire (À VÉRIFIER avec outil pipette).</p>
    </div>

    <p>
      Voici un paragraphe contenant un <a href="#info" class="ununderlined-link">lien dans le texte qui n'est pas souligné</a>, ce qui le rend indiscernable pour une personne daltonienne sans survol (KO / À Vérifier RGAA 3.3).
    </p>

    <div style="margin-top: 20px;">
      <span style="background-color: #fee2e2; color: #b91c1c; padding: 4px 8px; border-radius: 4px;">
        Erreur de paiement (Signalement uniquement coloré sans icône)
      </span>
    </div>
  </main>
</body>
</html>`
  }
};
