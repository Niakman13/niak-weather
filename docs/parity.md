# Fidélité au rendu local — v1.0.0

La carte locale et son template ont été analysés intégralement avant ce portage. Les références conservées dans `reference/` portent l’empreinte des fichiers d’origine ; les identifiants personnels du bloc de configuration ne sont pas publiés.

`reference/local-renderer.json` contient les fonctions et styles extraits du YAML. `scripts/port-local.mjs` les transforme mécaniquement en modules compilés. Les différences intentionnelles sont limitées aux gestionnaires d’événements (isolés par carte, sans code en ligne ni variables globales), à l’accès clavier et au retrait des recommandations Confort/ouvrants. Le rendu, les styles, textes, icônes, arrondis visuels et paliers de largeur sont conservés.

Les règles du template sont portées séparément dans `weather-model.ts` et `local-model.ts`. Les 96 jeux météo de `model-fixtures.json` sont produits par le **Jinja original**, et non par le nouveau modèle. Les tests comparent ressenti, effets, condition, priorité d’alerte, textes, direction, Beaufort, prochaine pluie, UV et narration des cumuls. Ils comprennent pluie, neige, brouillard, fournaise humide, rafales, gel, absence d’humidex et ciel nocturne. Les branches Foudre et Confort retirées ne font pas partie du contrat de cette version.

La vérification navigateur compare, dans le même navigateur, le rendu d’origine et le module compilé avec exactement les mêmes attributs, icônes MDI et thème de test. Résultat local : **0 pixel différent** et géométrie identique à 375, 768 et 1440 px, en clair et en sombre. Les tests vérifient aussi les clics, le clavier, le rejet d’un défilement, l’appui long, les prévisions partiellement disponibles, les réponses retardées d’une ancienne configuration, les filtres Thermal Comfort, les choix automatiques, les champs retirés et la conservation d’un champ volontairement vidé.

Ces contrôles portent sur un environnement de test avec composants hôtes Home Assistant simulés. Ils ne valident pas une installation Home Assistant réelle, tous les thèmes externes, ni les performances du tableau de bord complet. Le scan automatique de structure/accessibilité ne constitue pas un audit WCAG complet ; les contrastes du thème, les performances et la lecture par un lecteur d’écran restent à vérifier dans l’instance. Le fond et la bordure continuent d’être fournis par le thème Home Assistant, comme dans la carte locale.

## Extension Atmo France

L’extension ajoute un bloc facultatif, distinct du rendu de référence : la comparaison originale reste pixel-identique **sans ce bloc**. Les tests Atmo vérifient les 38 mesures, les communes multiples, les entités renommées, les filtres niveaux/concentrations/J+1, la conservation des choix, le changement de zone sans perte du modèle météo, le retrait du double affichage Polleninformation, les états indisponibles, les fiches entités au clic/clavier et le dépliage natif de demain. Six captures supplémentaires contrôlent les débordements et la structure en clair/sombre aux trois largeurs. Elles ne sont pas une comparaison pixel-identique du nouveau contenu avec l’ancien YAML, qui ne contenait pas ces informations.

## Relancer

```sh
npm ci
npm run validate
npx playwright install chromium
npm run test:browser
```

Les captures et le rapport sont produits dans `test-results/` et joints aux validations GitHub. La publication bloque si la comparaison échoue.

## Régénérer une référence après une évolution du modèle original

```sh
# Import explicite des sources d'origine ; ne modifie pas ces sources.
node scripts/port-local.mjs /chemin/carte-meteo.yaml /chemin/meteo-template.yaml
# Python avec Jinja2, uniquement pour fabriquer les fixtures de référence.
node scripts/generate-fixtures.mjs
npm run validate
npm run test:browser
```

La CI utilise les références et fixtures commitées, sans installation Python. Il faut vérifier les changements de référence avant de les approuver : une référence ne doit pas être régénérée depuis le nouveau code pour masquer un écart.
