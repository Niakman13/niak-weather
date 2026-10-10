# Niak Weather v1.6.0 — trois cadres essentiels

La section Aujourd’hui remplace la rangée des quatre petits cadres et les détails en double par trois cadres **Pluie, Vent et Pression**. Sur grand écran, ils occupent trois colonnes de même hauteur, y compris lorsqu’un seul graphique est déplié. Les notes sont alignées en bas. Sur tablette, ils passent à deux colonnes ; sur mobile, ils s’empilent.

Les chiffres clés restent directement visibles. Chaque cadre possède son propre volet **Statistiques**, fermé par défaut, pour gagner de la place. Les graphiques de pluie, de vent et de pression sont consultables indépendamment. Le cadre Vent conserve sa petite rose des vents, la direction et les lectures séparées de vent moyen et de rafales hors du volet.

Le nouveau cadre Pression affiche la valeur actuelle en hPa, sa source et la variation mesurée. Son graphique montre six heures d’historique local, regroupé en moyennes de dix minutes. L’échelle verticale est ajustée à la période et les interruptions restent des coupures. La pression seule n’est pas transformée en prévision de pluie.

La température actuelle reste dans le bandeau supérieur, accompagnée d’une bulle **Station locale** ou du fournisseur météo, par exemple **Météo-France**, à la place du libellé Thermomètre. La jauge de ressenti et les mesures techniques en bulles sont conservées.

Sans station, les cadres utilisent les données disponibles du bulletin, avec une source explicite. La pluie annoncée n’est jamais présentée comme un cumul mesuré et les graphiques locaux ne sont pas inventés en l’absence d’historique. [Lecture des cadres et limites](https://github.com/Niakman13/niak-weather/blob/v1.20.3/docs/recent-details.md).

248 tests unitaires et les contrôles navigateur à 375/768/1440 px, en clair et sombre, vérifient les sources, la rose des vents, les statistiques fermées initialement, leur ouverture indépendante et l’égalité des hauteurs sur une même rangée. Les interfaces Home Assistant des tests sont simulées.

Dans HACS, sélectionnez **v1.6.0**, puis rechargez le navigateur. Vos entités et réglages sont conservés ; aucun redémarrage Home Assistant n’est nécessaire.
