# Vérifications et limites — Niak Weather v1.0.0

Cette page décrit les contrôles de qualité de Niak Weather. Les tests utilisent des jeux de données et un rendu de référence versionnés pour détecter les régressions de calcul, de présentation et d’interaction.

Les références de rendu sont conservées dans `reference/`. Les comparaisons utilisent les mêmes données, icônes et thèmes de test pour distinguer une régression d’un changement de données ou de thème.

Les règles météo sont implémentées dans `weather-model.ts` et `local-model.ts`. Les 96 jeux météo de `model-fixtures.json` contiennent des résultats de référence produits indépendamment du modèle TypeScript testé. Les tests comparent ressenti, effets, condition, priorité d’alerte, textes, direction, Beaufort, prochaine pluie, UV et narration des cumuls. Ils comprennent pluie, neige, brouillard, fournaise humide, rafales, gel, absence d’humidex et ciel nocturne. La détection de foudre et la gestion des ouvrants ne font pas partie des fonctions de la carte.

La vérification navigateur compare, dans le même navigateur, le rendu de référence et le module compilé avec exactement les mêmes attributs, icônes MDI et thème de test. Résultat local : **0 pixel différent** et géométrie identique à 375, 768 et 1440 px, en clair et en sombre. Les tests vérifient aussi les clics, le clavier, le rejet d’un défilement, l’appui long, les prévisions partiellement disponibles, les réponses retardées d’une ancienne configuration, l’exclusion des capteurs Thermal Comfort, les choix automatiques, les champs retirés et la conservation d’un champ volontairement vidé.

Ces contrôles portent sur un environnement de test avec composants hôtes Home Assistant simulés. Ils ne valident pas une installation Home Assistant réelle, tous les thèmes externes, ni les performances du tableau de bord complet. Le scan automatique de structure/accessibilité ne constitue pas un audit WCAG complet ; les contrastes du thème, les performances et la lecture par un lecteur d’écran restent à vérifier dans l’instance. Le fond et la bordure continuent d’être fournis par le thème Home Assistant, comme le prévoit le contrat de présentation de la carte.

## Extension Atmo France

L’extension ajoute un bloc facultatif, distinct du rendu de référence : la comparaison météo reste pixel-identique **sans ce bloc**. Les tests Atmo vérifient les 38 mesures, les communes multiples, les entités renommées, les filtres niveaux/concentrations/J+1, la conservation des choix, le changement de zone sans perte du modèle météo, le retrait du double affichage Polleninformation, les états indisponibles, les fiches entités au clic/clavier et le dépliage natif de demain. Six captures supplémentaires contrôlent les débordements et la structure en clair/sombre aux trois largeurs. Ces captures vérifient le bloc Atmo lui-même ; elles ne mesurent pas sa parité pixel avec le rendu de référence météo, qui n’inclut pas ce bloc.

## Relancer

```sh
npm ci
npm run validate
npx playwright install chromium
npm run test:browser
```

Les captures et le rapport sont produits dans `test-results/` et joints aux validations GitHub. La publication bloque si la comparaison échoue.

## Maintenance des références de test

```sh
# Import explicite d'une source de référence ; ne modifie pas cette source.
node scripts/port-local.mjs /chemin/reference-rendu.yaml /chemin/reference-modele.yaml
# Python avec Jinja2, uniquement pour fabriquer les fixtures de référence.
node scripts/generate-fixtures.mjs
npm run validate
npm run test:browser
```

La CI utilise les références et fixtures commitées, sans installation Python. Il faut vérifier les changements de référence avant de les approuver : une référence ne doit pas être régénérée depuis le nouveau code pour masquer un écart.
