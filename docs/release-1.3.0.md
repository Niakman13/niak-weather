# Niak Weather v1.3.0 — météo actuelle et ciel animé

La Synthèse accueille la météo actuelle à droite : état du ciel, température et source du thermomètre. Son halo et ses couleurs d’attention conservent leur signification.

Le ciel animé couvre tout le bandeau, même lorsque les points à retenir sont dépliés. Un voile dégradé protège la lisibilité du texte. Nuages bicolores, pluie et fortes pluies, éclairs ramifiés, neige, brouillard et rafales donnent vie aux conditions actuelles. Le ressenti reste dans la synthèse et sa jauge, sans répétition dans le bloc météo.

Le décor suit l’état actuel du fournisseur météo, avec confirmation de la pluie par le capteur configuré ; les prévisions et vigilances ne changent pas le ciel actuel. Le jour et la nuit suivent les informations solaires disponibles. [Sources, règles et limites](https://github.com/Niakman13/niak-weather/blob/v1.20.3/docs/current-weather.md).

Les animations peuvent être désactivées ou allégées dans l’éditeur. Elles se mettent en pause hors écran et dans les onglets masqués, et respectent la préférence système de réduction des mouvements.

## Installation et mise à jour

Dans **HACS → Niak Weather**, choisissez **Mettre à jour** ou **⋮ → Retélécharger → v1.3.0**, puis rechargez le navigateur avec **Ctrl+F5**. Aucune préversion ni nouvelle dépendance n’est nécessaire. Vos entités et réglages sont conservés.

## Vérifications

194 tests automatisés et contrôles navigateur : thèmes clair/sombre, largeurs 375/768/1440 px, bandeau déplié, conditions météo et animations. Le rendu propre à votre thème et les performances sur votre tablette restent à vérifier en situation.
