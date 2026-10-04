# Mécanique météo, prévisions et configuration

[Sources et prérequis](sources.md) · [Installation](installation.md)

## Trois lectures complémentaires

Niak Weather distingue l’**observation à la maison**, la **prévision pour la zone** et l’**évolution des mesures**. L’entité météo fournit le bulletin et les prévisions ; la station apporte température, humidité, vent, pluie et capteurs complémentaires ; l’historique et les compteurs donnent du recul sur ces mesures. L’air et les pollens Atmo restent une lecture environnementale indépendante.

Le modèle est intégré à la carte : aucune installation de template n’est nécessaire. Les entités sont configurables et ne dépendent ni d’un modèle de passerelle, ni d’une ville ou d’un nom de capteur imposé. Les calculs d’affichage ne créent pas de nouveaux capteurs Home Assistant.

## Comment les prévisions sont utilisées

Pendant que la carte est affichée, elle demande les prévisions à `weather.get_forecasts`, séparément pour les heures et les jours, toutes les 15 minutes. La disponibilité des données dépend du fournisseur, pas de cette fréquence de lecture. Une prévision quotidienne non prise en charge ne masque pas les prévisions horaires. En cas d’échec, une nouvelle demande est possible après une minute ; une réponse reçue après un changement d’entité est ignorée.

La carte retient jusqu’à **18 points horaires** et **7 prévisions quotidiennes**, puis les repère dans le fuseau horaire Home Assistant. Ce sont les températures prévues du fournisseur, pas le ressenti estimé de la station. La courbe lisse les points pour faciliter la lecture, sans produire de nouvelles prévisions. Elle demande au moins trois températures valides. Elle affiche les extrema, les repères horaires, le passage à demain, les périodes nocturnes et les barres de précipitations prévues. Les plages quotidiennes comparent minimums et maximums sur une échelle commune ; un minimum absent n’est pas inventé.

Les premières heures alimentent aussi les phrases de synthèse. Le modèle repère la première précipitation annoncée d’au moins **0,3 mm** ; pendant une pluie mesurée, il recherche une accalmie dans les 12 premiers points et additionne les précipitations prévues sur les 6 premiers points. Les conditions orage/grêle des 6 premiers points peuvent déclencher un signal d’orage annoncé. Les délais sont exprimés à partir de la position du point dans la série **supposée horaire** : ils ne sont pas un calcul de probabilité, ni une garantie d’heure exacte.

Niak Weather **ne génère pas son propre bulletin météo**, ne corrige pas les prévisions futures à partir de la station et ne déduit pas une pluie certaine d’une tendance de pression. Les quantités et horizons ne sont fiables que dans la limite des données fournies.

## Entités

| Réglage | Mesure / rôle |
| --- | --- |
| `weather_entity` | Entité météo obligatoire : condition de la zone et prévisions, Météo-France recommandé |
| `temperature_entity`, `humidity_entity` | Température et humidité **extérieures** |
| `humidex_entity`, `humidex_perception_entity` | Humidex et qualification Thermal Comfort |
| `wind_speed_entity`, `wind_bearing_entity` | Moyenne du vent et direction moyenne sur 10 min si disponibles |
| `wind_gust_entity`, `max_daily_gust_entity` | Rafale actuelle et maximum du jour |
| `rain_rate_entity`, `daily_rain_entity` | Intensité instantanée et cumul depuis minuit |
| `rain_24h_entity`, `weekly_rain_entity`, `monthly_rain_entity`, `yearly_rain_entity`, `event_rain_entity` | Compteurs natifs de la station, jamais additionnés |
| `pressure_entity` | Pression relative, de préférence à la pression absolue |
| `solar_radiation_entity`, `uv_index_entity`, `illuminance_entity` | Rayonnement, UV et luminosité |
| `dew_point_entity` | Point de rosée Ecowitt |
| `temperature_trend_entity` | Dérivée extérieure en °C/h, si elle existe déjà |
| `sun_entity`, `sun_elevation_entity` | Soleil (`sun.sun` par défaut), ou élévation dédiée |
| `atmo_area` | Commune/zone Atmo France pour filtrer le préremplissage |
| `atmo_air_entity`, `atmo_pollen_entity` | Indices globaux extérieurs Atmo du jour, jamais des pourcentages |
| `atmo_pm25_entity`, `atmo_pm10_entity`, `atmo_no2_entity`, `atmo_o3_entity`, `atmo_so2_entity` | Sous-indices Atmo de pollution, jamais des µg/m³ |
| `atmo_grass_entity`, `atmo_ragweed_entity`, `atmo_mugwort_entity`, `atmo_alder_entity`, `atmo_birch_entity`, `atmo_olive_entity` | Six niveaux de pollens, échelle Atmo 1–6 |
| `atmo_<espèce>_concentration_entity` | Concentration du pollen, unité de l’intégration sans conversion |
| `atmo_<mesure>_tomorrow_entity` | Même mesure prévue à J+1, filtrée séparément |
| `pollen_source` | `atmo` (Atmo France), `legacy` (Polleninformation), ou `none` (masquer les pollens) |
| `show_atmo_details`, `show_atmo_tomorrow` | Détails et prévisions facultatifs (activés par défaut en complet) |

Les autres choix Thermal Comfort (`thermal_dew_point_entity`, `heat_index_entity`, `absolute_humidity_entity`, `thermal_perception_entity`) sont filtrés et préremplis par appareil. Le point de rosée Thermal Comfort sert de repli si celui de la station n’est pas choisi/disponible. **Indice de chaleur et humidité absolue ne sont pas additionnés à l’humidex** : ce serait compter plusieurs fois le même effet. Ces mesures ne sont pas affichées en pastilles supplémentaires.

`location` personnalise le lieu, sinon le nom de l’entité météo est utilisé. `forecast_source` personnalise le fournisseur. `weather_path` configure la navigation sur appui long (et sur le fond de la carte compacte).

Atmo France est désormais proposé en priorité. L’air extérieur, les polluants, les niveaux de pollens et leurs concentrations sont traités séparément du modèle météo : aucun indice Atmo n’entre dans le calcul du ressenti. La détection utilise le registre et les attributs géographiques ; un choix ambigu reste vide. Les 38 champs (19 mesures × aujourd’hui/demain) sont disponibles dans l’éditeur. [Contrat des données et guide](atmo-france.md).

La liste YAML de Polleninformation reste compatible, sans effacement lors de la migration. Elle n’est pas affichée en double quand Atmo est sélectionné. Pour la reprendre explicitement, utiliser `pollen_source: legacy` ; ses anciens niveaux 0–4 restent distincts de l’échelle Atmo 1–6. Son préremplissage ne se fait que dans ce mode. L’absence d’Atmo ne retire pas une ancienne configuration utilisant déjà cette liste.

```yaml
pollen_source: legacy
pollens:
  - id: sensor.pollen_grasses
    nom: Graminées
    ico: mdi:grass
```

## Estimation du ressenti et conditions observées

Le ressenti est l’humidex, ou à défaut le thermomètre, corrigé des effets du vent, du rayonnement, de la pluie et du ciel nocturne. La vitesse effective combine 75 % du vent moyen et 25 % du maximum entre vent moyen et rafales, puis retire une marge de 3 km/h, sans devenir négative. Le vent refroidit généralement, mais peut réchauffer dans une fournaise humide. Chaque effet est arrondi avant leur somme ; sans humidex, l’absence de correction d’humidité est annoncée explicitement.

La station passe devant la condition de la zone lorsqu’elle constate de la pluie, du brouillard dense ou un soleil fort contredisant le bulletin. Elle ne prétend pas constater de la foudre. Les orages à venir restent des prévisions. Les signaux de synthèse sont hiérarchisés : orage annoncé, pluie très forte, rafales, chaleur, froid ou UV selon les données disponibles. Ils attirent l’attention sur une situation, sans constituer une alerte officielle. La carte ne gère ni la détection de foudre ni les ouvrants.

Les unités de calcul et d’affichage sont °C, km/h, mm, hPa, W/m² et lx. Les capteurs exposés en °F, m/s, mph, pouces ou Pa sont convertis avant calcul. Une valeur `unknown`, `unavailable`, vide ou sentinelle ne devient jamais un zéro plausible.

Les tendances intégrées utilisent l’historique Recorder : pression sur 3 h avec au moins 20 min de données, vent sur 1 h avec au moins 15 min. Sans historique accessible, le texte reste « tendance en cours de mesure ». Les périodes pluie citent les compteurs **semaine et mois de la station**, pas des sommes glissantes recomposées. Depuis la v1.2.0-beta.3, les libellés « 7 jours » et « 30 jours » sont remplacés par « Cette semaine » et « Ce mois » ; les remises à zéro restent celles de la station.

Le modèle décrit un ressenti local estimé. Ses badges ne remplacent pas la vigilance officielle Météo-France ni les alertes de sécurité.
