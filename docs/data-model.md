# Modèle et configuration

## Un rendu, deux chemins de données

Le rendu reprend le JavaScript et les styles de la carte YAML locale. Les entités sont configurables et ne dépendent ni d’un modèle de passerelle, ni d’une ville ou d’un nom de capteur particulier.

Sans `model_entity`, les règles du template local sont portées dans la carte. Avec `model_entity`, la carte cite directement les attributs du capteur local existant. Ce second chemin conserve ses historiques et ses calculs indépendamment du navigateur ; le premier ne crée pas de nouveaux capteurs dans Home Assistant. Modifier une mesure dans l’éditeur désactive la reprise du modèle local pour que ce choix soit effectivement utilisé.

`forecast_entity` permet de reprendre un capteur existant publiant `heures` et `jours`. Sans lui, les prévisions sont demandées à `weather.get_forecasts`, séparément pour les heures et les jours, toutes les 15 minutes. Une prévision quotidienne non prise en charge ne masque pas les prévisions horaires.

## Entités

| Réglage | Mesure / rôle |
| --- | --- |
| `weather_entity` | Météo-France : condition de la zone et prévisions |
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
| `air_quality_entity` | Indice intérieur existant en %, cité sans nouveau calcul |
| `atmo_area` | Commune/zone Atmo France pour filtrer le préremplissage |
| `atmo_air_entity`, `atmo_pollen_entity` | Indices globaux extérieurs Atmo du jour, jamais des pourcentages |
| `atmo_pm25_entity`, `atmo_pm10_entity`, `atmo_no2_entity`, `atmo_o3_entity`, `atmo_so2_entity` | Sous-indices Atmo de pollution, jamais des µg/m³ |
| `atmo_grass_entity`, `atmo_ragweed_entity`, `atmo_mugwort_entity`, `atmo_alder_entity`, `atmo_birch_entity`, `atmo_olive_entity` | Six niveaux de pollens, échelle Atmo 1–6 |
| `atmo_<espèce>_concentration_entity` | Concentration du pollen, unité de l’intégration sans conversion |
| `atmo_<mesure>_tomorrow_entity` | Même mesure prévue à J+1, filtrée séparément |
| `pollen_source` | `atmo` (nouveau préremplissage), `legacy` (ancienne liste), ou `none` |
| `show_atmo_details`, `show_atmo_tomorrow` | Détails et prévisions facultatifs (activés par défaut en complet) |
| `model_entity`, `forecast_entity` | Compatibilité avec les deux capteurs du template local |

Les autres choix Thermal Comfort (`thermal_dew_point_entity`, `heat_index_entity`, `absolute_humidity_entity`, `thermal_perception_entity`) sont filtrés et préremplis par appareil. Le point de rosée Thermal Comfort sert de repli si celui de la station n’est pas choisi/disponible. **Indice de chaleur et humidité absolue ne sont pas additionnés à l’humidex** : ce serait compter plusieurs fois le même effet. La carte locale ne les affiche pas en pastilles supplémentaires.

`location` personnalise le lieu, sinon le nom de l’entité météo est utilisé. `forecast_source` personnalise le fournisseur. `weather_path` configure la navigation sur appui long (et sur le fond de la carte compacte). `air_path` configure la destination de la pastille d’air intérieur ; sans lui, elle ouvre son entité.

Atmo France est désormais proposé en priorité. L’air extérieur, les polluants, les niveaux de pollens et leurs concentrations sont traités séparément du modèle météo : aucun indice Atmo n’entre dans le calcul du ressenti. La détection utilise le registre et les attributs géographiques ; un choix ambigu reste vide. Les 38 champs (19 mesures × aujourd’hui/demain) sont disponibles dans l’éditeur. [Contrat des données et guide](atmo-france.md).

La liste YAML de Polleninformation reste compatible, sans effacement lors de la migration. Elle n’est pas affichée en double quand Atmo est sélectionné. Pour la reprendre explicitement, utiliser `pollen_source: legacy` ; ses anciens niveaux 0–4 restent distincts de l’échelle Atmo 1–6. Son préremplissage ne se fait que dans ce mode. L’absence d’Atmo ne retire pas une ancienne configuration utilisant déjà cette liste.

```yaml
pollen_source: legacy
pollens:
  - id: sensor.pollen_grasses
    nom: Graminées
    ico: mdi:grass
```

## Règles conservées du template

Le ressenti est l’humidex, ou à défaut le thermomètre, corrigé des effets du vent, du rayonnement, de la pluie et du ciel nocturne. La vitesse effective tient compte de 25 % des rafales et d’un socle de 3 km/h. Le vent refroidit généralement, mais peut réchauffer dans une fournaise humide. Chaque effet est arrondi avant leur somme, comme dans le template Jinja ; sans humidex, l’absence de correction d’humidité est annoncée explicitement.

La station passe devant la condition de la zone lorsqu’elle constate de la pluie, du brouillard dense ou un soleil fort contredisant le bulletin. Elle ne prétend pas constater de la foudre. Les orages à venir restent des prévisions. Les seuils et l’ordre des verdicts du template sont conservés, à l’exception des règles dépendant de Foudre et Confort/ouvrants, retirées à la demande.

Les unités de calcul et d’affichage restent °C, km/h, mm, hPa, W/m² et lx, comme la carte locale. Les capteurs exposés en °F, m/s, mph, pouces ou Pa sont convertis avant calcul. Une valeur `unknown`, `unavailable`, vide ou sentinelle ne devient jamais un zéro plausible.

Les tendances intégrées utilisent l’historique Recorder : pression sur 3 h avec au moins 20 min de données, vent sur 1 h avec au moins 15 min. Sans historique accessible, le texte reste « tendance en cours de mesure ». Avec le capteur local, ses propres tendances sont reprises sans recalcul. Les périodes pluie « 7 jours » et « 30 jours » gardent les libellés du rendu original, mais citent les compteurs **semaine et mois de la station**, pas des sommes glissantes recomposées.

Le graphique garde une hauteur fixe par palier, une courbe Catmull-Rom, un fond nocturne, des barres de pluie, les extrema et les repères maintenant/demain. Texte et repères sont en HTML pour ne pas être étirés avec le SVG. Les jours ont une échelle commune et un minimum absent n’est jamais inventé.

Le modèle décrit un ressenti local estimé. Ses badges ne remplacent pas la vigilance officielle Météo-France ni les alertes de sécurité.
