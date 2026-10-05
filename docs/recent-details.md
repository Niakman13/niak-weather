# Lire les cadres Pluie, Vent et Pression

Les trois cadres remplacent la rangée de petits cadres en double. Ils utilisent les mesures locales en priorité et les attributs du bulletin météo disponibles en complément, avec une source explicite. Les historiques restent exclusivement des données enregistrées de capteurs : ils ne sont jamais reconstitués à partir des prévisions. Les cadres sont disposés en trois colonnes sur grand écran, deux sur tablette et une sur mobile. Les chiffres restent visibles ; la partie graphique de chaque cadre se déplie indépendamment avec **Statistiques**, fermé par défaut.

Les cadres d’une même rangée gardent la même hauteur et leurs boutons Statistiques sont alignés en bas, même si un seul volet est ouvert. Sur mobile, ils s’empilent sans imposer une hauteur commune artificielle. Les commentaires répétant les chiffres (absence de pluie, vent stable) ne sont plus affichés. Le brief signale la pluie mesurée à partir de 0,3 mm/h, le vent soutenu et les variations de pression pertinentes, sans transformer ces dernières en prévisions de pluie.

La température actuelle reste dans le bandeau supérieur, avec une bulle **Station locale** ou le nom du fournisseur météo, par exemple **Météo-France**. La jauge du ressenti est conservée lorsqu’elle est pertinente.

## Pluie : compteurs et jours enregistrés

Le chiffre principal utilise `rain_24h_entity` s’il est disponible : il correspond aux dernières 24 h. Sinon, `daily_rain_entity` affiche explicitement « Depuis minuit ». Ces deux périodes ne sont pas interchangeables. Les compteurs semaine, mois et année gardent les périodes et remises à zéro de votre station.

Le graphique des sept derniers jours utilise **uniquement l’historique de `daily_rain_entity`**, le compteur quotidien remis à zéro. Chaque colonne représente son maximum enregistré pour le jour du fuseau horaire Home Assistant. Le jour actuel est en cours et sa dernière lecture est incluse quand un historique existe. Les compteurs glissants de 24 h et les compteurs de semaine/mois ne servent jamais à reconstituer les colonnes.

Une journée connue à zéro n’a pas de barre. Un jour sans données est indiqué par un tiret, pas par zéro. Une interruption `unknown`/`unavailable` rend le jour indisponible. Le début incomplet d’un historique ou une diminution du compteur au cours d’une journée est signalé par **≥**, c’est-à-dire un maximum enregistré partiel, et non un total journalier complet.

Pour des jours cohérents, la remise à zéro du compteur quotidien doit correspondre au fuseau horaire Home Assistant. Une remise à zéro décalée, une calibration ou un changement d’unité peut limiter la comparaison. Les valeurs affichées restent des maxima du compteur enregistrés ; la carte ne reconstitue pas les précipitations perdues pendant un arrêt de Home Assistant.

## Vent : valeurs et échelle explicites

Le chiffre principal présente le vent moyen actuel, local ou fourni par le bulletin. Les rafales actuelles sont affichées à côté : elles décrivent les pointes de vent, pas la même mesure. Si aucun vent moyen utilisable n’est disponible ni configuré, les rafales locales deviennent le chiffre principal. Le maximum du jour utilise exclusivement `max_daily_gust_entity`, lorsqu’il est renseigné ; il n’est pas déduit de la courbe des six dernières heures.

Le vent moyen et les rafales du bulletin peuvent compléter les capteurs manquants, sans devenir des mesures locales. La petite rose des vents et la direction restent visibles sur la même ligne que les chiffres, hors des statistiques. Le maximum du jour reste accessible dans Statistiques. Le nord est repéré et la flèche montre l’orientation fournie par l’entité de direction ; une direction absente n’est pas remplacée par zéro degré.

Les deux repères utilisent une échelle graduée en km/h, allant au moins de 0 à 80 et étendue par pas de 20 si les valeurs dépassent cette plage. Il ne s’agit ni d’un pourcentage de danger ni d’une vigilance officielle. La couleur bleu/noir distingue les repères actuel et maximum, pas un niveau d’alerte.

Le graphique compare six heures de vent moyen (trait bleu avec un dégradé discret) et de rafales (trait bleu clair discontinu), si leurs historiques sont disponibles. Pour rester lisible, il regroupe les données par dix minutes : moyenne pondérée par la durée des états pour le vent moyen, maximum enregistré pour les rafales. Les chiffres au-dessus restent les lectures actuelles, sans ce regroupement. Le dernier point de chaque série représente cette lecture actuelle.

Les courbes sont arrondies pour la lecture, sans dépasser les valeurs des points voisins : leur forme intermédiaire n’est ni une mesure supplémentaire ni une prévision. Les périodes inconnues ou incomplètes restent des coupures.

## Pression : lecture actuelle et variation

Le cadre Pression affiche la mesure en hPa et sa source. Les hausses ou baisses d’au moins 1 hPa sont décrites dans le brief, pas par une pastille systématique sous le chiffre. La variation compare la dernière lecture aux états enregistrés sur les trois dernières heures, ou la période effectivement disponible si elle est suffisante. Elle n’annonce pas une pluie ou une amélioration certaine.

Le graphique couvre six heures de pression locale, regroupée en moyennes de dix minutes pondérées par la durée des états. Son échelle verticale est ajustée aux valeurs de la période, avec les valeurs absolues en hPa sur l’axe. Les interruptions restent des coupures. Sans historique accessible, aucune variation ni courbe n’est inventée ; la valeur actuelle reste disponible.

## Historique facultatif

Le graphique demande que les capteurs concernés soient enregistrés dans Recorder. Sans historique accessible, les chiffres restent affichés et un message discret remplace le graphique dans Statistiques. Aucune courbe n’est créée à partir de la seule lecture actuelle. Les conversions en mm, km/h et hPa supposent une unité de capteur cohérente sur la période.

La lecture du compteur quotidien porte sur huit jours pour disposer d’un état antérieur aux sept jours affichés ; elle est renouvelée au plus toutes les quinze minutes. La lecture vent/pression porte sur six heures et est renouvelée au plus toutes les cinq minutes. Les changements purement visuels ne relancent pas ces lectures.
