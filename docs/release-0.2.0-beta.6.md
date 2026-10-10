# Niak Weather v0.2.0-beta.6

Tableau de bord météo complet : icônes MDI et halo, jauge et phrase du ressenti, humidex/vent/soleil/pluie/nuit, rose des vents, cumul depuis minuit, baromètre, pastilles et pollens, graphique 18 h avec repères, semaine et bilan pluie/vent.

Le modèle météo intégré calcule le ressenti et les conditions observées ; les tendances utilisent l’historique Recorder. Des capteurs pré-calculés compatibles peuvent être configurés pour les usages avancés.

L’éditeur affiche **Entités de la station** et une section **Entités Thermal Comfort** avec filtres par mesure/appareil et préremplissage. La détection tient compte du registre des entités, des entités renommées et des mesures d’entrée Thermal Comfort. Elle conserve les choix existants et ne tranche pas un choix ambigu.

Distance de foudre et Confort/ouvrants sont retirés, y compris les recommandations d’aération et les alertes d’ouvrants. Les orages prévus restent affichés.

Validation : 96 situations comparées à des résultats de référence, comparaisons pixel à pixel et géométrie à trois largeurs en clair/sombre, tests d’interaction et d’éditeur. Ce sont des contrôles en environnement de test, pas une validation de tous les thèmes ni de l’instance Home Assistant de chaque utilisateur.

## Mettre à jour

Dans HACS, ouvrir Niak Weather puis **⋮ → Retélécharger / Redownload**, choisir **v0.2.0-beta.6**, télécharger et recharger le navigateur (**Ctrl+F5**). Activer les préversions pour ce dépôt si nécessaire.

Dans l’éditeur, **Préremplir les entités manquantes**, puis vérifier les choix. Les sources pré-calculées sont facultatives ; le modèle intégré fonctionne sans template supplémentaire.

[Guide d’installation](https://github.com/Niakman13/niak-weather/blob/v1.20.3/docs/installation.md) · [Vérifications et limites](https://github.com/Niakman13/niak-weather/blob/main/docs/parity.md)
