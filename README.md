# Niak Weather

Une carte météo pour Home Assistant qui réunit les **mesures de votre station Ecowitt**, les **prévisions Météo-France**, le **ressenti enrichi par Thermal Comfort** et, en option, **l’air extérieur et les pollens Atmo France**.

**Version stable : v1.0.0.** La documentation principale et les textes de la carte sont en français.

[![Ouvrir Niak Weather dans HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Niakman13&repository=niak-weather&category=plugin)

[Installation et mise à jour](docs/installation.md) · [Sources et prérequis](docs/sources.md) · [Atmo France : air et pollens](docs/atmo-france.md) · [Tous les réglages](docs/data-model.md)

![Niak Weather avec les données facultatives Atmo France](docs/images/niak-weather-atmo.png)

Aperçu avec des données de démonstration ; le volet de demain est ouvert. La carte suit votre thème Home Assistant. [Aperçu météo en thème clair](docs/images/niak-weather-light.png) · [Aperçu en thème sombre](docs/images/niak-weather-dark.png).

## Ce que la carte apporte

Le rendu reprend celui de la carte locale d’origine : icônes MDI, halo animé, jauge de ressenti, détail des contributions météo, boussole, pluie depuis minuit, tendance barométrique, indicateurs de la station, courbe des prochaines heures, plages de températures par jour et bilan pluie/vent. Le mode **Complet** affiche les prévisions et bilans ; le mode **Accueil (compact)** utilise le même rendu pour une vue synthétique.

Les prévisions affichent jusqu’à **18 heures et 7 jours**, selon les données réellement fournies. La carte distingue les conditions prévues pour la zone des mesures prises chez vous. Elle ne transforme pas une donnée absente en zéro et ne présente pas un orage prévu comme de la foudre détectée par la station.

L’éditeur peut préremplir les entités Ecowitt, Thermal Comfort et Atmo France. Il filtre les choix par station/appareil et par mesure ; Atmo est aussi filtré par commune et par jour. Les choix existants sont conservés et les correspondances ambiguës restent à choisir manuellement.

## Prérequis : obligatoire ou facultatif ?

Le minimum est **Home Assistant 2025.1.0 ou plus récent** et une **entité `weather.*`**. Pour l’installation et les mises à jour recommandées, il faut également [HACS](https://www.hacs.xyz/). Le téléchargement manuel reste possible.

| Source ou composant | Statut | Ce qu’il apporte à la carte |
| --- | --- | --- |
| Entité météo, de préférence **Météo-France** | **Obligatoire** | Conditions de la zone, température de repli et prévisions disponibles. Météo-France est le fournisseur de référence. |
| **Ecowitt** | Facultatif pour démarrer ; nécessaire pour les mesures locales | Température et humidité extérieures, vent, pluie, pression et capteurs complémentaires. Pas de limitation à la GW2000 : station/passerelle prise en charge par l’intégration Home Assistant. |
| **Thermal Comfort** | Facultatif ; recommandé pour le ressenti complet | Humidex extérieur, perception et point de rosée de repli. Demande une température et une humidité extérieures. |
| **Soleil / `sun.sun`** | Facultatif ; recommandé, généralement déjà présent | Élévation solaire et lever/coucher pour les corrections de ressenti et les repères jour/nuit. |
| **Atmo France** | Facultatif | Air extérieur, sous-indices de polluants, niveaux et concentrations de pollens, aujourd’hui et demain. |
| **Polleninformation EU** | Facultatif ; alternative pour les pollens | Ligne d’espèces de pollens. Non affichée en double lorsque la source Atmo est sélectionnée. |
| **Indice d’air intérieur existant** | Facultatif | Pastille en %, indépendante d’Atmo. Il doit déjà être calculé par votre installation. |
| **Historique Recorder** | Facultatif ; nécessaire aux tendances intégrées | Évolution de la pression et du vent, sans créer de nouveaux capteurs. |
| **Templates météo locaux existants** | Facultatif ; compatibilité | Reprise directe du modèle et des prévisions de la carte locale d’origine. Inutile pour une nouvelle installation. |

Le [guide des sources](docs/sources.md) explique pour chacune sa configuration, les entités utiles, ce qui apparaît à l’écran et ce qui manque lorsqu’elle n’est pas présente. Pour retrouver toutes les informations du rendu local, renseignez les mesures Ecowitt disponibles, l’humidex extérieur et le Soleil ; ajoutez Atmo et l’air intérieur seulement si vous les souhaitez.

**Aucun `button-card`, chart-card, card-mod ou package de templates supplémentaire n’est nécessaire.** Node.js et les outils de développement ne sont pas requis chez les utilisateurs. Niak Weather ne configure pas les intégrations à votre place et ne demande aucun identifiant Atmo dans ses réglages.

## Installer avec HACS

1. Ouvrez le bouton HACS en haut de cette page. Il ouvre le dépôt, sans installer automatiquement la carte.
2. Si le dépôt n’est pas trouvé, ajoutez `https://github.com/Niakman13/niak-weather` dans **HACS → ⋮ → Dépôts personnalisés**, catégorie **Tableau de bord / Dashboard**. Il s’agit d’un dépôt personnalisé, pas d’un référencement dans le catalogue HACS par défaut.
3. Téléchargez **Niak Weather v1.0.0**, puis rechargez le navigateur.
4. Dans votre tableau de bord, choisissez **Ajouter une carte → Niak Weather** et sélectionnez votre entité météo.
5. Complétez **Entités de la station**, **Entités Thermal Comfort** et, si souhaité, **Atmo France — air extérieur et pollens**. Utilisez **Préremplir les entités manquantes**, puis vérifiez les propositions avant d’enregistrer.

Configuration minimale, sans station :

```yaml
type: custom:niak-weather-card
weather_entity: weather.ma_commune
mode: detailed
```

Exemple enrichi avec des mesures locales et l’humidex :

```yaml
type: custom:niak-weather-card
weather_entity: weather.ma_commune
temperature_entity: sensor.station_outdoor_temperature
humidity_entity: sensor.station_outdoor_humidity
humidex_entity: sensor.exterieur_humidex
wind_speed_entity: sensor.station_wind_speed
rain_rate_entity: sensor.station_rain_rate
daily_rain_entity: sensor.station_daily_rain
mode: detailed
```

Ces identifiants sont des **exemples**, pas des noms imposés. Privilégiez vos entités réelles dans l’éditeur. Le [tutoriel d’installation](docs/installation.md) détaille les ressources, les réglages et le dépannage.

## Mettre à jour vers v1.0.0

Dans **HACS → Niak Weather**, utilisez **Mettre à jour** ou **⋮ → Retélécharger** et sélectionnez **v1.0.0**. Il n’est plus nécessaire d’activer les préversions. Rechargez ensuite le navigateur avec **Ctrl+F5** ; sur mobile, videz le cache frontend si l’ancienne version reste affichée.

Vos entités et réglages sont conservés. Le rendu et les calculs validés de beta.7 restent les mêmes ; le choix alternatif des pollens s’appelle simplement **Polleninformation**. La documentation française précise désormais les sources et leurs prérequis. [Notes de version](docs/release-1.0.0.md).

## Limites et transparence

Le ressenti est une **estimation locale**, pas une mesure physiologique ni une vigilance officielle. Sans humidex, la carte signale que l’humidité n’est pas comptée. Les données Atmo décrivent la zone et ne remplacent ni une mesure d’air intérieur, ni un capteur dans le jardin. Les échelles Atmo, concentrations et pourcentages intérieurs ne sont pas mélangés.

La distance de foudre et Confort/ouvrants ne sont pas utilisés dans cette version ; les alertes d’ouvrants et le créneau d’aération ne sont donc pas affichés. Les orages prévus restent visibles. Les calculs dans le navigateur ne créent pas d’entités Home Assistant pour les automatisations.

## Développement et vérifications

```sh
npm ci
npm run validate
npx playwright install chromium
npm run test:browser
```

`npm run build` produit `dist/niak-weather-card.js`. Les releases GitHub vérifient le code et le rendu, puis joignent le fichier installable et sa carte de sources. Les utilisateurs reçoivent les mises à jour par HACS sans compilation.

Les règles du modèle sont comparées aux résultats de référence du template Jinja d’origine. Six comparaisons visuelles (375, 768 et 1440 px, clair/sombre) vérifient le rendu météo à données et thème identiques ; six autres contrôlent le bloc Atmo. Ces tests utilisent des composants hôtes Home Assistant simulés : ils ne garantissent pas tous les thèmes tiers ni la disponibilité des capteurs de chaque installation. [Rapport de fidélité et références](docs/parity.md).

Licence MIT — [LICENSE](LICENSE).
