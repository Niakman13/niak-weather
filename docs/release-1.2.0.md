# Niak Weather v1.2.0 — synthèse intelligente et nouveau design

La v1.2.0 est la nouvelle version stable. Elle rassemble les améliorations testées dans les bêtas et les derniers ajustements du graphique.

## Nouveautés

- **Synthèse** : un résumé des observations et prévisions importantes, avec une priorité aux vigilances, au vent, aux pluies attendues et aux indices d’air et de pollens disponibles. Le cercle conserve son halo animé. « Les points à retenir » regroupe les explications et donne accès aux sources.
- **Aujourd’hui** : un ressenti affiché en grand au-dessus de la jauge, dans sa teinte, un cadre explicatif avec les contributions pertinentes, quatre cadres de mesures, les détails pluie/vent et les indices air/pollens encadrés en dégradé.
- **Prévisions** : sur grand écran, le graphique horaire occupe toute la hauteur disponible face à la liste des jours. Les repères « Maintenant » et « Demain » sont espacés du bord supérieur. Sur mobile, les graphiques restent empilés. Les indices disponibles de demain suivent les graphiques.
- Les cumuls de pluie sont nommés « Cette semaine » et « Ce mois » : ce sont les compteurs calendaires de la station, pas des périodes glissantes. La carte ne modifie pas leur remise à zéro.

La synthèse utilise des règles documentées, sans service d’IA externe. Sa couleur suit le point le plus préoccupant ; le rouge du bandeau est réservé à une vigilance rouge officielle Météo-France. Les indices Atmo utilisent une palette graphique Niak Weather, pas le nuancier officiel.

## Mise à jour

Dans **HACS → Niak Weather**, choisis **Mettre à jour** ou **⋮ → Retélécharger**, puis **v1.2.0**. Il n’est pas nécessaire d’activer les préversions. Recharge ensuite avec **Ctrl+F5** ou **Cmd+Shift+R** ; sur mobile, recharge le frontend ou vide son cache si l’ancien rendu persiste.

Les entités et réglages existants sont conservés. Aucun redémarrage de Home Assistant n’est nécessaire. Sauvegarde ton YAML avant la mise à jour. `smart_brief: false` désactive la synthèse intelligente sans annuler le nouveau design.

## Vérifications et limites

Les 158 tests automatisés et les contrôles navigateur passent : thèmes clair/sombre, largeurs 375/768/1440 px, hauteur des colonnes de prévisions, espacement des repères, entités manquantes, sources au clavier et réduction des mouvements.

Le ressenti reste une estimation, les prévisions dépendent du fournisseur et les indices d’air/pollens concernent une zone. Les contrastes peuvent dépendre du thème Home Assistant. Ces contrôles ne constituent pas une certification complète d’accessibilité ou une validation sur chaque installation.

[Sources et prérequis](https://github.com/Niakman13/niak-weather/blob/v1.2.0/docs/sources.md) · [Mécanique de la synthèse](https://github.com/Niakman13/niak-weather/blob/v1.2.0/docs/brief-intelligent.md).
