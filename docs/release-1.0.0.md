# Niak Weather v1.0.0 — première version stable

Niak Weather est une carte météo pour Home Assistant qui rassemble les observations de la station, un ressenti expliqué, les prévisions horaires/quotidiennes et les bilans pluie/vent. Atmo France complète ce tableau avec l’air extérieur et les pollens d’aujourd’hui et de demain.

L’éditeur propose le préremplissage et des filtres par station/appareil, mesure, zone et horizon. Les choix existants sont conservés ; un choix ambigu reste manuel. **Polleninformation** est une alternative facultative pour les pollens.

La carte inclut les mesures Ecowitt, les prévisions Météo-France, le ressenti Thermal Comfort, le graphique 18 h, les bilans pluie/vent et les entités Atmo France d’aujourd’hui/demain. Les données facultatives restent configurables et les choix automatiques ne remplacent pas les choix manuels.

La documentation principale est en **français** et présente l’intérêt de la carte ainsi que sa mécanique de lecture météo et de prévisions. Un guide explique chaque source, son utilité, les entités qu’elle apporte et les prérequis **obligatoires ou facultatifs**. Il distingue la carte minimale du rendu enrichi, l’air intérieur de l’air extérieur, et documente l’installation HACS comme le téléchargement manuel.

## Installation et mises à jour

Dans **HACS → Niak Weather**, installer la mise à jour **v1.0.0**, ou utiliser **⋮ → Retélécharger** et sélectionner cette version. Recharger ensuite le navigateur avec **Ctrl+F5**. Sur mobile, fermer/rouvrir le tableau de bord et vider le cache frontend si nécessaire. Les préversions ne sont plus nécessaires pour installer cette version stable ; les entités et réglages actuels sont conservés.

## Vérifications

121 tests de calcul/données, comparaisons du rendu météo à trois largeurs en clair/sombre et contrôles du bloc Atmo, des interactions et du nouveau libellé. Les tests navigateur utilisent des composants hôtes Home Assistant simulés : ils ne constituent pas une validation de tous les thèmes externes ou de chaque installation.

[Installation](https://github.com/Niakman13/niak-weather/blob/v1.20.3/docs/installation.md) · [Sources et prérequis](https://github.com/Niakman13/niak-weather/blob/v1.20.3/docs/sources.md) · [Réglages Atmo France](https://github.com/Niakman13/niak-weather/blob/v1.20.3/docs/atmo-france.md)
