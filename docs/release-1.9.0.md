# Niak Weather v1.9.0 — stations guidées et synthèse utile

Version stable. Les mesures déjà configurées et les autres catégories de réglages sont conservées.

- Le choix de station est explicite : **Ecowitt GW2000A**, **WS90 via Zigbee2MQTT** ou **Autre station / configuration manuelle**.
- Les champs se réorganisent selon la station choisie : température et humidité, pluie, vent, soleil et mesures spécifiques. Le mode manuel propose l’ensemble des capteurs pris en charge.
- Le préremplissage se limite aux mesures disponibles pour le profil sélectionné. Une station reconnue sans appareil Home Assistant associé demande de choisir l’appareil, sans mélanger les capteurs de plusieurs profils.
- Le brief n’affiche plus de titre ni de pastille « Synthèse » en double. Il reste vide lorsqu’aucune information utile n’est à signaler.
- Les phrases ordinaires sur la température prévue ont été retirées au profit des signaux plus pertinents. Une pluie prévue d’au moins 20 mm demain est signalée avec son cumul ; un écart de ressenti supérieur à 4 °C est expliqué simplement.
- Le ressenti habituel n’est plus répété dans le bandeau. Les prévisions restent distinctes des mesures prises à la station.

## Vérifications et limites

278 tests unitaires et contrôles navigateur réussis, avec vérification du parcours des stations et du brief en simulation Home Assistant à 375, 768 et 1440 px, en thème clair et sombre. L’inspection en lecture seule de la carte active a permis de confirmer que les précipitations importantes du lendemain étaient plus utiles que le réchauffement banal à court terme. Les seuils du brief sont des choix d’affichage ; les prévisions restent celles du fournisseur météo.

## Mise à jour

Dans **HACS → Niak Weather**, choisir **Mettre à jour** ou **Retélécharger**, puis sélectionner **v1.9.0**. Rechargez ensuite le navigateur avec **Ctrl+F5** ; aucun redémarrage de Home Assistant ni activation des préversions n’est nécessaire.
