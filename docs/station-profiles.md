# Appareils locaux et profils de station

Dans **Capteurs locaux / station météo locale**, choisissez d’abord l’appareil. La carte identifie les profils **WS90 via MQTT** et **GW2000A / Ecowitt** à partir de leurs métadonnées et noms d’entités. Un profil n’est pas une promesse que toutes les mesures existent : seules les correspondances certaines sont préremplies. Le bilan distingue les mesures reconnues, absentes, ambiguës et les choix à vérifier.

**Autres capteurs / configuration manuelle** permet d’associer des capteurs indépendants ou des compteurs complémentaires. Les listes utilisent la fonction et le type physique : une rosée n’est pas proposée comme température réelle, une direction moyenne n’est pas une vitesse, un cumul générique n’est pas un compteur quotidien. Le canal `illuminance_raw` n’est pas un éclairement en lux.

Le bouton **Remplir automatiquement** de cette catégorie complète aussi les champs enregistrés vides ; il conserve les références existantes valides. Un choix retiré reste vide tant que ce bouton n’est pas utilisé. Les anciennes configurations restent lisibles, y compris un choix à corriger : elles ne sont pas supprimées automatiquement.

## Compléter les données avec l’historique

L’option **Compléter les mesures manquantes avec l’historique Home Assistant** est activée par défaut. Elle ne crée aucune entité et ne modifie ni Recorder ni la station.

Pour la pluie, renseignez **Compteur total de pluie** : un capteur en mm (ou pouces) avec `state_class: total_increasing`, qui représente une accumulation et non une fenêtre glissante. Les compteurs dédiés configurés restent prioritaires, même s’ils sont momentanément indisponibles. Un champ explicitement vide désactive le calcul de secours correspondant.

- Le compteur total et son historique récent permettent de calculer les augmentations sur la période.
- Les statistiques cumulées de Recorder complètent les périodes anciennes : semaine depuis lundi, mois et année civiles, selon le fuseau de Home Assistant.
- La fenêtre des 24 dernières heures est distincte du cumul depuis minuit.
- Le graphique des sept jours représente des augmentations par journée, pas une somme des valeurs du compteur ni le maximum d’un compteur total.
- Les remises à zéro sont gérées ; une petite baisse suspecte ou une coupure est signalée comme couverture partielle.
- Une année enregistrée seulement depuis quelques jours n’est jamais présentée comme complète. Les périodes sans référence exploitable restent absentes, pas à zéro.

Les chiffres calculés portent **calculé**, **historique** ou **partiel**. Les données sont mises en cache : une saisie de texte ne relance pas les requêtes. Le chargement des statistiques de pluie intervient au plus toutes les quinze minutes, avec agrégats journaliers pour la période longue et horaires pour les jours récents. Les résultats d’une ancienne source ne peuvent pas remplacer ceux de la nouvelle.

Sans capteur dédié, la tendance de température peut être calculée sur une fenêtre d’au plus une heure, après trente minutes de données utilisables. La rafale maximale du jour peut être tirée de l’historique récent ; elle est indiquée partielle si la journée n’est pas couverte. Ces calculs ne reconstituent pas les pics que Recorder n’a jamais enregistrés.

L’absence de rayonnement solaire en W/m² n’est pas compensée par une conversion arbitraire des lux. L’humidex demeure réservé à Thermal Comfort. Les conditions météo calculées, le statut d’humidité/pluie et les diagnostics électriques de la WS90 ne sont pas ajoutés automatiquement au brief par ce changement.

## Limites de vérification

Le parcours et les calculs sont testés avec des installations simulées, des réponses Recorder et les caractéristiques de l’export WS90 fourni, sans conserver ses identifiants privés. Il reste à confirmer le comportement avec le Recorder réel de votre installation : droits d’accès, exclusions, disponibilité et unité des statistiques. Si les statistiques sont absentes ou inaccessibles, la carte conserve les mesures disponibles et signale les périodes incomplètes.

Références : [WS90 Zigbee2MQTT](https://www.zigbee2mqtt.io/devices/WS90.html), [statistiques des capteurs Home Assistant](https://developers.home-assistant.io/docs/core/entity/sensor/#long-term-statistics), [API Recorder](https://github.com/home-assistant/core/blob/dev/homeassistant/components/recorder/websocket_api.py).
