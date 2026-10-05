# Lire les détails Pluie et Vent

Les deux cadres sont des bilans **mesurés par la station**, pas des prévisions. Ils restent côte à côte sur desktop et s’empilent sur les écrans étroits. Le volet Détails pluie et vent est repliable.

## Pluie : compteurs et jours enregistrés

Le chiffre principal utilise `rain_24h_entity` s’il est disponible : il correspond aux dernières 24 h. Sinon, `daily_rain_entity` affiche explicitement « Depuis minuit ». Ces deux périodes ne sont pas interchangeables. Les compteurs semaine, mois et année gardent les périodes et remises à zéro de votre station.

Le graphique des sept derniers jours utilise **uniquement l’historique de `daily_rain_entity`**, le compteur quotidien remis à zéro. Chaque colonne représente son maximum enregistré pour le jour du fuseau horaire Home Assistant. Le jour actuel est en cours et sa dernière lecture est incluse quand un historique existe. Les compteurs glissants de 24 h et les compteurs de semaine/mois ne servent jamais à reconstituer les colonnes.

Une journée connue à zéro n’a pas de barre. Un jour sans données est indiqué par un tiret, pas par zéro. Une interruption `unknown`/`unavailable` rend le jour indisponible. Le début incomplet d’un historique ou une diminution du compteur au cours d’une journée est signalé par **≥**, c’est-à-dire un maximum enregistré partiel, et non un total journalier complet.

Pour des jours cohérents, la remise à zéro du compteur quotidien doit correspondre au fuseau horaire Home Assistant. Une remise à zéro décalée, une calibration ou un changement d’unité peut limiter la comparaison. Les valeurs affichées restent des maxima du compteur enregistrés ; la carte ne reconstitue pas les précipitations perdues pendant un arrêt de Home Assistant.

## Vent : valeurs et échelle explicites

Le chiffre principal présente `wind_gust_entity` (rafales actuelles), ou `wind_speed_entity` (vent moyen) si aucun capteur de rafales n’est configuré. Le maximum du jour utilise exclusivement `max_daily_gust_entity`, lorsqu’il est renseigné. Le maximum du jour n’est pas déduit de la courbe des six dernières heures.

Les deux repères utilisent une échelle graduée en km/h, allant au moins de 0 à 80 et étendue par pas de 20 si les valeurs dépassent cette plage. Il ne s’agit ni d’un pourcentage de danger ni d’une vigilance officielle. La couleur bleu/noir distingue les repères actuel et maximum, pas un niveau d’alerte.

La courbe suit six heures du même capteur que le chiffre principal. Elle utilise des segments en escalier pour respecter les changements d’état enregistrés, sans fabriquer des valeurs intermédiaires. Les interruptions de disponibilité restent des coupures. Les séries denses sont réduites par fenêtres de trois minutes, en conservant les pics et les coupures. La tendance compare cette même mesure sur la dernière heure, ou la période effectivement disponible si elle est suffisante.

## Historique facultatif

Le graphique demande que les capteurs concernés soient enregistrés dans Recorder. Sans historique accessible, les chiffres restent affichés et un message discret remplace le graphique. Aucune courbe n’est créée à partir de la seule lecture actuelle. Les conversions en mm et km/h supposent une unité de capteur cohérente sur la période.

La lecture du compteur quotidien porte sur huit jours pour disposer d’un état antérieur aux sept jours affichés ; elle est renouvelée au plus toutes les quinze minutes. La lecture vent/pression porte sur six heures et est renouvelée au plus toutes les cinq minutes. Les changements purement visuels ne relancent pas ces lectures.
