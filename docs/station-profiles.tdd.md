# Preuves de validation — profils et historiques locaux

Parcours issus des demandes de l’utilisateur : choisir un appareil et préremplir sans ambiguïté, corriger WS90 brut/lux et GW2000 direction/vitesse, garder des filtres manuels cohérents, compléter les données manquantes sans remplacer les compteurs existants.

## RED / GREEN

- `npm test -- test/station-profiles.test.ts` : cinq tests en échec initialement, dont quatre reproductions exécutées des erreurs de fonction, luminosité et périodes de pluie. Commit RED `fbff21d`.
- `npm test -- test/station-profiles.test.ts test/config-sources.test.ts test/format.test.ts` : 34 tests réussis après correction. Commit GREEN `b210a2f`.
- `npm test -- test/station-history.test.ts` : trois scénarios exécutés échouaient pour le module historique non encore implémenté. Commit RED `77b57f4`.
- Après implémentation, les mêmes scénarios réussissent ; la suite inclut également remises à zéro, petites baisses, périodes incomplètes, changements d’heure, unités, raccordement aux valeurs actuelles et priorités natives.

## Garanties et limites

| Garantie | Preuve |
|---|---|
| Lux calibrés plutôt que canal brut ; direction moyenne jamais vitesse | `test/station-profiles.test.ts` |
| Aucun préremplissage arbitraire d’une ambiguïté ; mode manuel conservé | Même suite + parcours navigateur |
| Progression des compteurs, pas addition des lectures ; remises à zéro et coupures | `test/station-history.test.ts` |
| Fuseau Home Assistant et changement d’heure | Même suite |
| Un compteur natif reste prioritaire ; saisie sans rechargement inutile | `scripts/browser-qa.mjs`, scénario `stationJourney` |
| Affichage à 375, 768 et 1440 px | Captures et assertions du même scénario |

Commandes : `npm run validate` (266 tests réussis et compilation), `npm run test:browser` (parcours existants et garanties du scénario station réussis, aucun incident console/réseau), `npm run test:station-coverage` (98,71 % lignes, 97,51 % instructions, 93,61 % fonctions, 82,11 % branches sur les nouveaux modules).

La couverture agrégée ciblée des nouveaux modules dépasse 80 % sur lignes, instructions, fonctions et branches. Ce n’est pas une mesure de couverture de toute la carte. Le navigateur utilise une simulation Home Assistant ; les contrôles de sélection vérifient schémas et événements, pas le rendu des composants internes d’une installation réelle. Aucune validation Recorder de production ni publication n’a été réalisée dans cette tâche.

## Revue finale

Évaluation `agent-self-evaluation` : exactitude 4/5 (API consultée, tests réussis ; Recorder réel à vérifier), complétude 4/5 (profils, filtres et secours demandés présents ; les mesures physiques absentes ne sont pas inventées), clarté 4/5 (libellés et documentation ; composants natifs à revoir chez l’utilisateur), utilisabilité 4/5 (version locale prête à tester, non publiée), concision 4/5 (logique partagée, documentation dédiée). Moyenne 4/5. Amélioration prioritaire : essai sur la WS90 réelle avec vérification des périodes partielles et des sélecteurs Home Assistant. L’utilisateur devrait reconnaître cette limite : son export décrit les entités, pas la base Recorder.
