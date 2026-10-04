# Niak Weather v1.0.0 — première version stable

Le tableau de bord météo validé et son support Atmo France passent en version stable. Le rendu et les fonctions de beta.7 sont conservés, sans modification des calculs ni des choix d’entités.

La source alternative de pollens s’appelle désormais simplement **Polleninformation** dans l’éditeur. La mention « ancienne liste YAML » est retirée. Sa valeur interne reste compatible avec les configurations existantes : aucune migration manuelle n’est nécessaire.

La carte inclut les mesures Ecowitt, les prévisions Météo-France, le ressenti Thermal Comfort, le graphique 18 h, les bilans pluie/vent et les entités Atmo France d’aujourd’hui/demain. Les données facultatives restent configurables et les choix automatiques ne remplacent pas les choix manuels.

La page principale du dépôt est désormais entièrement en **français**. Un guide explique chaque source, son utilité, les entités qu’elle apporte et les prérequis **obligatoires ou facultatifs**. Il distingue la carte minimale du rendu enrichi, l’air intérieur de l’air extérieur, et documente l’installation HACS comme le téléchargement manuel.

## Mise à jour depuis une beta

Dans **HACS → Niak Weather**, installer la mise à jour **v1.0.0**, ou utiliser **⋮ → Retélécharger** et sélectionner cette version. Recharger ensuite le navigateur avec **Ctrl+F5**. Sur mobile, fermer/rouvrir le tableau de bord et vider le cache frontend si nécessaire. Les préversions ne sont plus nécessaires pour installer cette version stable ; les entités et réglages actuels sont conservés.

## Vérifications

121 tests de calcul/données, comparaisons du rendu météo à trois largeurs en clair/sombre et contrôles du bloc Atmo, des interactions et du nouveau libellé. Les tests navigateur utilisent des composants hôtes Home Assistant simulés : ils ne constituent pas une validation de tous les thèmes externes ou de chaque installation.

[Installation](https://github.com/Niakman13/niak-weather/blob/main/docs/installation.md) · [Sources et prérequis](https://github.com/Niakman13/niak-weather/blob/main/docs/sources.md) · [Réglages Atmo France](https://github.com/Niakman13/niak-weather/blob/main/docs/atmo-france.md)
