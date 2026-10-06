# Parcours de configuration par modèle — validation

Demande : remplacer la reconnaissance implicite d’appareil par une liste GW2000A / WS90 / manuel, adapter les champs au modèle et organiser les mesures par sujet.

## Tests avant implémentation

`npm test -- test/station-models.test.ts` a exécuté deux tests en échec : absence du choix explicite avec reprise des anciennes sources GW2000A, et absence de groupes spécifiques au modèle. Checkpoint RED : `f8c0ba7`.

## Résultat

- Choix **Ecowitt GW2000A**, **Shelly / Ecowitt WS90 — Zigbee2MQTT**, **Autre station / configuration manuelle**.
- Anciennes sources GW2000A ou WS90 conservées à l’ouverture et modèle affiché sans exiger un appareil préalable.
- Rubriques **Température et humidité**, **Pluie**, **Vent**, **Soleil**, **Spécifiques**. WS90 : pas de compteurs natifs inexistants ni de rayonnement absent ; mode manuel : tous les champs et calcul historique.
- Choix manuel explicite non remplacé par une nouvelle déduction sur les noms. Passage au mode manuel conservant les capteurs ; changement vers un autre modèle connu réinitialisant les sources de station seulement.
- Inventaire complet supprimé de l’interface principale ; nombre de capteurs renseignés et seuls choix problématiques affichés.

`npm run validate` : 270 tests réussis, types vérifiés et compilation réussie. `npm run test:browser` : scénarios existants et parcours WS90/manuels réussis, vérifications à 375, 768 et 1440 px, aucun incident console/réseau. Les champs, filtres et événements sont vérifiés avec une simulation des composants Home Assistant, pas un éditeur de production.

`npm run test:station-coverage` : couverture agrégée ciblée des profils et calculs historiques, 98,86 % lignes, 97,20 % instructions, 92,85 % fonctions et 83,61 % branches. Ce n’est pas la couverture de toute la carte.

La clarification `impeccable` a privilégié un choix explicite, un texte d’action et des rubriques par sujet dans les composants natifs existants. Son détecteur mécanique sur l’éditeur n’a relevé aucune alerte. Aucune modification du rendu de la carte ou publication n’est incluse dans cette tâche.
