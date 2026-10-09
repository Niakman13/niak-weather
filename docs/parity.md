# Vérifications et limites

Cette page décrit les contrôles de qualité de Niak Weather.

## Les calculs

Les règles météo sont dans `src/engine` (`weather-model.ts`, `local-model.ts`). Les 96 jeux météo de `reference/model-fixtures.json` contiennent des résultats de référence produits indépendamment du modèle TypeScript testé. Les tests comparent ressenti, effets, condition, priorité d’alerte, textes, direction, Beaufort, prochaine pluie, UV et narration des cumuls. Ils couvrent pluie, neige, brouillard, fournaise humide, rafales, gel, absence d’humidex et ciel nocturne.

D’autres tests vérifient le brief, le bulletin, les alertes (vigilance et alerte mesurée affichées ensemble), les historiques de la station, Atmo France, les saisons, la détection des capteurs et le modèle de vue que lisent les écrans.

## Dans un navigateur

`npm run test:browser` charge la carte compilée avec les données de démonstration et vérifie :

- chaque format à 375, 768 et 1180 px, en clair et en sombre, par beau temps et sous l’orage : rien ne dépasse de la carte ;
- l’accessibilité (aucun problème sérieux relevé par axe) ;
- la tuile : appui pour déplier, mémoire de l’état, sélecteur Heures / Jours, appui long, clavier (Entrée, Maj + Entrée, Échap), page météo personnelle ;
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

## Références des calculs

```sh
# Python avec Jinja2, uniquement pour fabriquer les fixtures de référence.
node scripts/generate-fixtures.mjs
npm run validate
```

La CI utilise les fixtures commitées, sans installation Python. Il faut vérifier les changements de référence avant de les approuver : une référence ne doit pas être régénérée depuis le nouveau code pour masquer un écart.
