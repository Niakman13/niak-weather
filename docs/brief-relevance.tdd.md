# Pertinence du bandeau — preuves de validation

Demande : supprimer les répétitions neutres, ne pas recopier le ressenti, expliquer seulement un écart supérieur à 4 °C, reformuler la température prévue et inspecter les informations actuelles dans le navigateur.

## Inspection de l’installation

Le dashboard météo ouvert a été lu avec le navigateur, puis son aide consultée et refermée sans modifier la configuration. La situation actuelle n’avait pas de pluie mesurée, de vent soutenu ni de grand écart de ressenti. Le tableau journalier affichait un cumul de pluie notable le lendemain : cela a motivé l’exploitation du bulletin journalier déjà chargé. Aucune donnée privée ni capture du dashboard complet n’est conservée dans ce dépôt.

## RED / GREEN

`npm test -- test/brief-relevance.test.ts` : sept scénarios exécutés, six échecs reproduisant les messages neutres, le dernier point utilisé plutôt que le maximum, l’absence du signal d’écart, la température secondaire non pertinente et l’absence de priorité pour la pluie de demain. Checkpoint RED `430639c`.

Après correction : scénario ordinaire sans titre, pic depuis le maximum disponible, seuil strict supérieur à 4 °C dans les deux sens, priorité actuelle conservée et cumul journalier de demain informatif sans relever la vigilance. Les cas de pluie faible, bulletin du jour ou date invalide n’ajoutent pas de signal pour demain.

`npm run validate` : 278 tests, vérification des types et compilation. `npm run test:browser` : contrôles existants et scénarios sans signal, grand écart et pluie demain réussis ; rendu examiné à 375 et 1440 px dans une simulation locale. La page de production n’a pas reçu le nouveau module.

Couverture ciblée : `npm test -- --coverage --coverage.include=src/engine/brief-preview.ts --coverage.include=src/engine/weather-brief.ts` : 100 % des lignes et fonctions, plus de 88 % des branches. Ces mesures concernent les deux modules, pas toute la carte.

La clarification de l’interface conserve le ciel animé et les niveaux d’attention existants. Les messages d’absence de point ou les limites restent dans l’aide, pas dans le résumé principal. Aucun changement de station ni publication supplémentaire n’est effectué dans ce travail.
