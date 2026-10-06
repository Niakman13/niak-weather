# Niak Weather v1.8.0 — profils de station et historiques

Version stable. Les configurations existantes sont conservées.

- Choix de l’appareil local avant les mesures, identification des profils WS90 via MQTT et GW2000A / Ecowitt, bilan des correspondances reconnues, absentes, ambiguës ou à vérifier.
- Mode **Autres capteurs / configuration manuelle** et listes filtrées par fonction et unité. Le canal WS90 `illuminance_raw` ne bloque plus l’éclairement en lux. La direction `wind_direction_10m_avg` n’est plus confondue avec une vitesse.
- Le préremplissage de la station complète les champs vides sans remplacer les choix existants valides. Les mesures actuelles, compteurs de pluie et compléments sont regroupés.
- Un nouveau **Compteur total de pluie** permet de compléter les bilans manquants et le graphique journalier à partir de l’historique et des statistiques Recorder, sans créer d’entités. Les compteurs dédiés restent prioritaires et un champ explicitement vide désactive le calcul correspondant.
- Les périodes utilisent le fuseau Home Assistant. Remises à zéro, historique incomplet et petites baisses suspectes sont pris en compte. Aucune année complète ni zéro de pluie n’est inventé sans référence exploitable.
- La tendance de température et la rafale maximale du jour peuvent être calculées depuis l’historique lorsqu’aucun capteur dédié n’est configuré. Une rafale sur journée incomplète est signalée comme partielle.
- Les données historiques sont mises en cache ; les modifications de texte ne relancent pas les requêtes. Le rayonnement solaire absent n’est pas remplacé par une conversion arbitraire des lux et l’humidex reste réservé à Thermal Comfort.

## Vérifications et limites

266 tests unitaires, compilation et parcours navigateur à 375, 768 et 1440 px. Vérifications du préremplissage, des filtres, de la priorité native, des périodes partielles et de l’absence de requêtes supplémentaires lors d’une saisie. Couverture agrégée des nouveaux modules : 98,71 % lignes et 82,11 % branches.

Le parcours est vérifié avec une simulation Home Assistant et les caractéristiques de l’export WS90 fourni. La disponibilité des statistiques dépend de votre Recorder : exclusions, unités et droits d’accès. Les données historiques calculées restent à confirmer sur les installations réelles ; la carte signale les périodes partielles ou conserve les données indisponibles.

[Guide des profils et historiques](station-profiles.md).

## Mise à jour

Dans **HACS → Niak Weather**, choisir **Mettre à jour** ou **Retélécharger**, sélectionner **v1.8.0**, puis recharger le navigateur (Ctrl+F5). Aucun redémarrage ni activation des préversions n’est nécessaire. Pour compléter une WS90, ouvrir **Capteurs locaux / station météo locale**, choisir l’appareil puis utiliser **Remplir automatiquement**.
