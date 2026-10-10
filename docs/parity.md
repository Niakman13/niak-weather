# Vérifications et limites

Cette page décrit les contrôles de qualité de Niak Weather.

## Les calculs

Depuis la 2.0, les règles météo sont dans l’[intégration Niak Weather](https://github.com/Niakman13/niak-weather-integration), avec leurs tests (`python -m pytest`). Les 96 jeux météo de `tests/fixtures/model-fixtures.json` contiennent des résultats de référence produits indépendamment du moteur testé. Les tests comparent ressenti, effets, condition, priorité d’alerte, textes, direction, Beaufort, prochaine pluie, UV et narration des cumuls. Ils couvrent pluie, neige, brouillard, fournaise humide, rafales, gel, absence d’humidex et ciel nocturne.

D’autres tests vérifient le brief (et l’heure de chaque point à venir), le bulletin, les alertes (vigilance et alerte mesurée affichées ensemble), les historiques de la station, Atmo France, les saisons, la détection des capteurs et le modèle de vue que lisent les écrans. Côté carte, `npm test` vérifie la frise : regroupement des points du moment, ordre des points à venir, segments du ciel, repères d’heures.

## Dans un navigateur

`npm run test:browser` charge la carte compilée avec les données de démonstration et vérifie ce qu’elle affiche de la vue calculée par l’intégration. Le dépôt de l’intégration doit se trouver à côté de celui de la carte (ou son chemin dans `NIAK_INTEGRATION`), avec Python 3.13. Le banc vérifie :

- chaque format à 375, 768 et 1180 px, en clair et en sombre, par beau temps et sous l’orage : rien ne dépasse de la carte ;
- l’accessibilité (aucun problème sérieux relevé par axe) ;
- chaque format à 375, 768 et 1180 px : les étiquettes et les heures de la frise restent dans la carte ;
- la tuile : appui pour déplier, mémoire de l’état, vigilance en haut et alerte mesurée en tête de la bulle, frise une fois dépliée (alerte mesurée dans l’étiquette « Maintenant », anneau de vigilance, ciel prévu), étiquette de la frise sans repli de la tuile, appui long, clavier (Entrée, Maj + Entrée, Échap), page météo personnelle ;
- la carte complète : sections repliables et leur état de départ, valeurs qui ouvrent la fiche du capteur ;
- les bulles « i » : elles s’ouvrent dans l’écran, sur téléphone comme sur ordinateur ;
- la charte : un seul style de pastille de source, un seul arrondi, six tailles de texte, couleurs remplaçables par le thème ;
- l’éditeur : les réglages proposés selon le format.

## Le banc visuel

`npm run visual:capture` photographie 94 scènes à heure fixe (8 octobre 2026, 17 h 40, animations figées) ; `npm run visual:compare` compare deux séries pixel par pixel et `npm run visual:sheet` en fait des planches. Il sert à vérifier qu’un changement ne touche que ce qu’il doit toucher.

## Limites

Ces contrôles utilisent des composants Home Assistant simulés. Ils ne valident pas une installation réelle, tous les thèmes externes, ni les performances d’un tableau de bord complet. Le scan d’accessibilité ne remplace pas un audit complet ni la lecture par un lecteur d’écran. Chaque version est aussi essayée dans une instance Home Assistant de test.

## Relancer

```sh
npm ci
npm run validate
npx playwright install chromium
npm run test:browser
```

Les captures et le rapport sont produits dans `test-results/`.
