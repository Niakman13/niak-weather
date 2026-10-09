# Charte et organisation du code

Cette page s’adresse à qui veut modifier la carte. Elle explique où se décide chaque chose, pour qu’un changement se fasse à un seul endroit et s’applique partout : tuile, tuile dépliée et carte complète.

## Trois étages

| Dossier | Rôle | Ce qu’on y trouve |
| --- | --- | --- |
| [Intégration](https://github.com/Niakman13/niak-weather-integration) | **Calculer**, sans rien afficher | Ressenti, conditions, brief, bulletin, alertes, historiques de la station, Atmo, saisons. Elle envoie à la carte tout ce qu’elle montre, en français clair ; `src/view.ts` décrit cet envoi. |
| `src/ui` | **Les pièces** de la charte | `charter.ts` (jetons et pièces de base), `parts.ts` (bulles, pastilles, tuiles, en-têtes de cadre, bouton « i »), `ticker.ts` (la bulle qui défile), `weather-sky.ts` (le ciel animé). |
| `src/views` | **Assembler** les écrans | `tile.ts` (tuile qui se déplie), `hero.ts` (bandeau de la carte complète), `today.ts`, `forecasts.ts`, `air.ts`, `full.ts` (la carte complète et ses sections repliables). |

`src/niak-weather-card.ts` s’abonne à l’intégration, choisit le format et gère les gestes (appui, appui long, clavier, fenêtre complète). `src/display.ts` applique les réglages d’affichage, `src/ui/charts.ts` dessine les courbes à partir des points reçus. `src/editor` contient l’éditeur des réglages d’affichage.

Les vues ne lisent que le modèle de vue : elles ne connaissent ni les identifiants des capteurs, ni les unités à convertir, ni les noms internes du moteur. Ajouter une information, c’est l’ajouter au modèle de vue de l’intégration (`engine/view.py`, avec un test dans `tests/test_view.py`) et à `src/view.ts`, puis l’afficher avec les pièces existantes.

## La charte : un seul fichier

Toute l’apparence se décide dans `src/ui/charter.ts`. Les vues n’écrivent jamais une couleur, un arrondi ou une taille de texte en dur : elles utilisent ces jetons.

| Jeton | Rôle |
| --- | --- |
| `--nw-line` | Le contour de toutes les bulles, tuiles, pastilles et cadres |
| `--nw-radius` | L’arrondi unique des boîtes (14 px) ; `--nw-radius-pill` pour les pastilles |
| `--nw-glass`, `--nw-glass-strong`, `--nw-blur` | Le verre posé sur le ciel : léger pour les tuiles, plus blanc pour la bulle du brief |
| `--nw-fs-label` … `--nw-fs-temp` | Les six tailles de texte : étiquette 10, secondaire 12, texte 13, titre 17, valeur 30, température 42 |
| `--nw-rain`, `--nw-wind`, `--nw-heat`, `--nw-cold`, `--nw-calm`, `--nw-pressure` | Les couleurs de sens, palette « Aube » (pastel, OKLCH, même clarté et même saturation) |
| `--nw-level1` à `--nw-level3` | Les niveaux d’alerte : jaune, orange, rouge |
| `--nw-ink` | La part de couleur dans un texte coloré : 34 % garde même le jaune lisible (contraste 4,5:1) |
| `--nw-expand`, `--nw-ease` | La durée et l’allure du dépliage |

Exemple : changer `--nw-line` change le contour de toute la carte, dans les trois formats. Changer `--nw-radius` arrondit toutes les boîtes de la même façon.

Les couleurs de fond, de texte et d’accent suivent le thème Home Assistant. Les couleurs de sens appartiennent à la carte, pour que leur sens ne change pas d’un thème à l’autre. Un thème peut néanmoins les remplacer :

```yaml
# Dans un thème Home Assistant
niak-rain-color: "#4fb3bf"
niak-level1-color: "#f2c94c"
```

Variables disponibles : `niak-rain-color`, `niak-wind-color`, `niak-heat-color`, `niak-cold-color`, `niak-calm-color`, `niak-pressure-color`, `niak-level1-color`, `niak-level2-color`, `niak-level3-color`.

## Les pièces

| Pièce | Classe | Où |
| --- | --- | --- |
| Étiquette en petites capitales | `.nw-label` | Partout |
| Bulle du brief, bulle d’alerte | `.nw-bubble`, `.nw-bubble--alert` | Tuile, bandeau, bulle qui défile |
| Tuile de moment, d’heure ou de jour | `.nw-tile` | Bulletin, prévisions de la tuile dépliée |
| Pastille de source | `.nw-badge` | Un seul style pour toutes les sources |
| Pastille d’info teintée | `.nw-chip` | Facteurs du ressenti, tendances, mesures en plus |
| Cadre | `.nw-panel` avec `panelHead()` | Toute la carte complète |
| Légende | `.nw-legend` | Toujours centrée sous son graphique |
| Bouton « i » et bulle d’explication | `info()` | Synthèse, Ressenti |

Règles de la charte : seule l’icône d’une bulle prend la couleur de son thème, le contour coloré et le halo sont réservés aux alertes. Un graphique a un titre « période · unité » au-dessus, sa légende centrée en dessous et ses valeurs posées dessus.

## Vérifier un changement

```sh
npm run validate           # types, tests, compilation
npm run test:browser       # contrôles dans un vrai navigateur
npm run visual:capture -- --out apres
npm run visual:compare reference apres
npm run visual:sheet apres
```

Le banc visuel photographie 94 scènes (météos, saisons, alertes, données manquantes, thèmes et largeurs) à heure fixe : la même scène donne toujours la même image. `npm run visual:docs` refait les images du README.
