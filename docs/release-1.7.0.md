# Niak Weather v1.7.0 — cadres compacts et affichage harmonisé

Version stable, sans migration de configuration nécessaire.

## Nouveautés

- Les trois cadres Pluie, Vent et Pression gagnent en hauteur utile : suppression des commentaires répétant les chiffres et des pastilles systématiques de tendance. Ils conservent une hauteur identique sur une même rangée et leurs statistiques repliées par défaut.
- La rose des vents est placée à côté du vent moyen et des rafales actuelles. Le maximum journalier reste disponible dans Statistiques.
- Le brief reprend la pluie mesurée et les variations pertinentes de pression, sans augmenter artificiellement le niveau d’attention ni annoncer une pluie à partir de la seule pression. Les signaux de vent soutenu sont conservés.
- Air extérieur et Pollens ont deux cadres distincts, chacun avec une bulle Atmo France, l’horizon, la zone, les cercles colorés et les détails repliables. Même présentation pour demain.
- Les sous-indices plus préoccupants restent visibles sans ouvrir les détails ; les données absentes ou anciennes ne deviennent pas des valeurs à zéro.
- Les prévisions horaires et la semaine sont entourées de deux cadres harmonisés avec le reste de la carte.

## Vérifications

249 tests unitaires, compilation et contrôles navigateur sur mobile, tablette et grand écran, en thèmes clair et sombre. Vérifications des hauteurs, des détails repliables, des sources, des données indisponibles et des interactions clavier.

## Mise à jour

Dans HACS → Niak Weather, choisir Mettre à jour ou Retélécharger et sélectionner **v1.7.0**. Les préversions ne sont pas nécessaires. Recharger ensuite le navigateur (Ctrl+F5), ou vider le cache frontend sur mobile si l’ancien affichage persiste. Aucun redémarrage de Home Assistant n’est requis.
