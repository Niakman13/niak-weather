# Niak Weather v0.2.0-beta.6

Portage du rendu original de la carte locale : icônes MDI et halo, jauge et phrase du ressenti, humidex/vent/soleil/pluie/nuit, rose des vents, cumul depuis minuit, baromètre, pastilles et pollens, graphique 18 h avec repères, semaine et bilan pluie/vent.

Le modèle reprend les règles et les arrondis du template Jinja. Les utilisateurs du template local peuvent sélectionner leurs deux capteurs météo/prévisions pour conserver exactement leurs calculs et historiques. Sans template local, les règles sont intégrées et les tendances utilisent l’historique Recorder.

L’éditeur affiche **Entités de la station** et une section **Entités Thermal Comfort** avec filtres par mesure/appareil et préremplissage. La détection tient compte du registre des entités, des entités renommées et des mesures d’entrée Thermal Comfort. Elle conserve les choix existants et ne tranche pas un choix ambigu.

Distance de foudre et Confort/ouvrants sont retirés, y compris les recommandations d’aération et les alertes d’ouvrants. Les orages prévus restent affichés.

Validation : 96 situations comparées au Jinja original, comparaisons pixel à pixel et géométrie à trois largeurs en clair/sombre, tests d’interaction et d’éditeur. Ce sont des contrôles en environnement de test, pas une validation de tous les thèmes ni de l’instance Home Assistant de chaque utilisateur.

## Mettre à jour

Dans HACS, ouvrir Niak Weather puis **⋮ → Retélécharger / Redownload**, choisir **v0.2.0-beta.6**, télécharger et recharger le navigateur (**Ctrl+F5**). Activer les préversions pour ce dépôt si nécessaire.

Dans l’éditeur, **Préremplir les entités manquantes**, puis vérifier les choix. Pour reprendre un template local existant, renseigner ses capteurs dans **Soleil, air et compatibilité locale**. Comparer avec le même thème et le même zoom.

[Guide d’installation](https://github.com/Niakman13/niak-weather/blob/main/docs/installation.md) · [Fidélité et limites des tests](https://github.com/Niakman13/niak-weather/blob/main/docs/parity.md)
