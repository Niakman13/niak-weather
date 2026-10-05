# Air extérieur et pollens — Atmo France

[Atmo France](https://github.com/sebcaps/atmofrance) enrichit Niak Weather avec une lecture de l’air **extérieur** et des pollens : indice global, détail des polluants, espèces et concentrations, aujourd’hui et demain. Ces données complètent les mesures météo, sans remplacer l’indice d’air **intérieur** ni mélanger leurs échelles.

## Configurer l’intégration

Si Atmo France est déjà présent dans Home Assistant, aucune nouvelle installation n’est nécessaire. Dans ses options, activer les **indicateurs de pollution**, les **indicateurs pollen** et, si souhaité, leurs **prévisions**.

Sinon, installer l’intégration Atmo France de `sebcaps/atmofrance` via HACS, suivre ses instructions de redémarrage puis l’ajouter dans **Paramètres → Appareils et services**. L’intégration demande un compte [Atmo Data](https://admindata.atmo-france.org), puis un code postal et la commune. Certains territoires sont regroupés par EPCI : la carte reprend le nom de zone fourni. Ne renseigner les identifiants que dans l’intégration Home Assistant ; Niak Weather n’appelle pas directement l’API et n’a besoin d’aucun mot de passe.

La source et son contrat ont été vérifiés dans [const.py](https://github.com/sebcaps/atmofrance/blob/da29265ed5f5dd5a59ab29937ce0ae6cdf3e1521/custom_components/atmofrance/const.py) et [sensor.py](https://github.com/sebcaps/atmofrance/blob/da29265ed5f5dd5a59ab29937ce0ae6cdf3e1521/custom_components/atmofrance/sensor.py). Le fournisseur collecte les données ; la carte les affiche, elle ne les fabrique pas.

## Choisir les entités dans Niak Weather

Ouvrir **Atmo France — air extérieur et pollens** dans l’éditeur. Choisir la commune/zone, sélectionner **Atmo France** comme source des pollens, puis cliquer **Préremplir les entités manquantes**. Si une seule zone est disponible, elle est proposée automatiquement ; avec plusieurs zones, une correspondance exacte avec le lieu météo peut être proposée. Sinon il faut choisir la zone.

Les listes distinguent le jour, la mesure et le type de capteur, même si son nom a été personnalisé. Un capteur de concentration ne remplit jamais un champ de niveau. Les choix manuels et les champs volontairement vidés sont conservés. Changer la zone réinitialise uniquement les 38 choix Atmo pour les remplacer par ceux de la nouvelle zone ; la météo et Thermal Comfort ne sont pas modifiés. Si le registre est inaccessible, la détection utilise l’attribution et les attributs géographiques disponibles.

Aujourd’hui et demain disposent chacun de **19 mesures** : indice global de l’air, cinq sous-indices de polluants (PM2.5, PM10, NO₂, O₃, SO₂), indice global pollen, six niveaux d’espèces et six concentrations. Les six espèces sont Graminées, Ambroisie, Armoise, Aulne, Bouleau et Olivier. Les noms des entités ci-dessous sont des exemples : utiliser ses propres capteurs dans l’éditeur.

```yaml
type: custom:niak-weather-card
weather_entity: weather.ma_commune
pollen_source: atmo
atmo_air_entity: sensor.qualite_globale_ma_commune
atmo_pollen_entity: sensor.qualite_globale_pollen_ma_commune
atmo_pm25_entity: sensor.pm25_ma_commune
atmo_grass_entity: sensor.niveau_gramine_ma_commune
atmo_grass_concentration_entity: sensor.concentration_gramine_ma_commune
atmo_air_tomorrow_entity: sensor.qualite_globale_ma_commune_j_1
atmo_grass_tomorrow_entity: sensor.niveau_gramine_ma_commune_j_1
show_atmo_details: true
show_atmo_tomorrow: true
```

## Lire les données correctement

Les deux cadres **Air extérieur** et **Pollens** reprennent les indices quotidiens prévus de la zone, pas des mesures de la station dans le jardin. Chacun porte une bulle **Atmo France**, son horizon et sa zone, conserve le cercle coloré et dispose de ses propres détails repliés par défaut. Les mêmes deux cadres présentent demain dans la section Prévisions, sans volet supplémentaire pour cacher les valeurs principales. Un sous-indice plus préoccupant que l’indice global reste visible sans ouvrir les détails. Un clic ou Entrée ouvre la fiche du capteur concerné, y compris une concentration. Les détails et les cadres de demain peuvent être masqués indépendamment dans les réglages.

L’air et les polluants ont une échelle de **1 (Bon) à 6 (Extrêmement mauvais)**. Le code **7 signifie Évènement**, pas une concentration ni un pourcentage. Les pollens vont de **1 (Très faible) à 6 (Extrêmement élevé)** : ces six niveaux ne sont pas ramenés aux quatre niveaux de Polleninformation. **0 signifie Indisponible**, et ne veut pas dire « aucun pollen » ou « air parfait ».

Les concentrations reprennent les valeurs et unités des entités, sans conversion ni seuil inventé. L’intégration actuelle expose une unité de masse (`µg/m³`) : la carte la cite, elle ne la transforme pas en grains/m³. Si le niveau associé est indisponible, la concentration n’est pas confirmée afin de ne pas afficher comme certaine une valeur de repli.

Les détails présentent les polluants et les espèces dans une grille centrée : chaque nom, cercle, niveau et concentration reste regroupé. Les détails ouverts commencent immédiatement après les valeurs principales, sans grand espace imposé pour aligner leur bas avec le cadre voisin.

La date affichée est celle de **publication Atmo**, pas l’heure d’une mesure en temps réel ni la date de validité d’une prévision. Les publications âgées de plus de 48 h sont signalées. L’intégration n’expose pas la date de validité précise sur chaque capteur : la carte conserve donc les horizons J/J+1 déclarés par l’intégration. Les prévisions J+1 dépendent de la disponibilité des données.

## Migrer depuis Polleninformation

Ouvrir l’éditeur et préremplir les capteurs Atmo si ce n’est pas déjà fait. La catégorie Atmo France configure directement ses indices, espèces et concentrations : aucun sélecteur supplémentaire de source des pollens n’est nécessaire. Les anciennes configurations restent prises en charge : `pollen_source: legacy` conserve la liste `pollens`, et `pollen_source: none` masque les pollens. Ces options restent disponibles dans l’éditeur YAML pour les cartes existantes. L’air extérieur reste indépendant de ce choix.

Il n’est pas nécessaire de désinstaller Polleninformation : d’autres tableaux de bord ou automatisations peuvent encore l’utiliser. Cette évolution ne modifie pas les intégrations, automatisations ou capteurs personnalisés existants.
