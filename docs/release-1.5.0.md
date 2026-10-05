# Niak Weather v1.5.0 — nouveaux cadres Pluie et Vent

Les détails de station remplacent les barres relatives par deux cadres modernes associant chiffres clés et historiques. Ils gardent deux colonnes sur desktop et s’empilent sur mobile.

**Pluie** : cumul des dernières 24 h, ou depuis minuit avec un libellé explicite ; compteurs semaine, mois et année ; histogramme des maxima quotidiens enregistrés sur sept jours. Les zéros ne sont pas dessinés comme de petites barres, les données absentes ne deviennent pas des zéros et les historiques partiels sont signalés.

**Vent** : rafales actuelles, ou vent moyen si aucun capteur de rafales n’est configuré ; maximum du jour ; échelle graduée avec deux repères ; historique des six dernières heures et tendance de la même mesure. Le maximum du jour n’est plus une barre toujours remplie à 100 %.

Les historiques utilisent les capteurs de station et Recorder, jamais les prévisions météo. Sans historique accessible, les chiffres disponibles sont conservés et un message remplace le graphique. Les conversions d’unités et les interruptions de disponibilité sont prises en compte. [Mécanique et limites](recent-details.md).

240 tests unitaires passent, ainsi que les contrôles navigateur mobile/tablette/desktop en thèmes clair et sombre : graphiques, échelle, données manquantes, mise en cache des demandes et clic sur la bonne source. Les interfaces Home Assistant des tests sont simulées.

Dans HACS, sélectionnez **v1.5.0** puis rechargez le navigateur. Les configurations existantes sont conservées ; aucun nouveau composant à installer. Renseignez le compteur quotidien « Depuis minuit » et les capteurs de rafales/max du jour si vous souhaitez enrichir les nouveaux cadres.
