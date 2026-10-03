# Installer Niak Weather

## Avant de commencer

Il faut déjà avoir :

1. [HACS](https://hacs.xyz/) installé dans Home Assistant ;
2. l’intégration [Météo-France](https://www.home-assistant.io/integrations/meteo_france/) configurée, avec une entité `weather` ;
3. une station ou une passerelle Ecowitt qui publie ses mesures dans Home Assistant.

La première version fonctionne même avec peu de mesures Ecowitt. Chaque mesure
facultative est ajoutée dans l’éditeur de la carte seulement si elle existe
chez toi.

## Installation par HACS

[![Ouvrir Niak Weather dans HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Niakman13&repository=niak-weather&category=plugin)

1. Clique le bouton ci-dessus depuis l’appareil qui accède à ton Home Assistant.
2. Home Assistant demande l’autorisation d’ouvrir le lien : choisis **Ouvrir le lien**.
3. Dans HACS, clique **Télécharger** / **Download** pour Niak Weather.
4. À la fin de l’installation, recharge le tableau de bord. Si la carte n’apparaît pas tout de suite dans le sélecteur, fais un rechargement forcé du navigateur (`Ctrl+F5` ou `Cmd+Shift+R`).

HACS enregistre normalement la ressource JavaScript automatiquement. Une mise à
jour future apparaîtra dans HACS et se fera avec le même bouton de téléchargement.

### Si le bouton ne fonctionne pas

1. Dans Home Assistant, ouvre **HACS → Tableaux de bord**.
2. Ouvre le menu **⋮**, puis **Dépôts personnalisés**.
3. Ajoute cette adresse : `https://github.com/Niakman13/niak-weather`.
4. Choisis le type **Tableau de bord** / **Dashboard**, puis valide.
5. Ouvre Niak Weather dans HACS et clique **Télécharger**.

## Ajouter la carte

Dans un tableau de bord, clique **Ajouter une carte** puis recherche **Niak
Weather**. L’éditeur permet de choisir l’entité Météo-France et les capteurs
Ecowitt que tu souhaites afficher.

Voici l’équivalent YAML minimal :

```yaml
type: custom:niak-weather-card
weather_entity: weather.ma_meteo_france
```

Exemple enrichi :

```yaml
type: custom:niak-weather-card
weather_entity: weather.ma_meteo_france
temperature_entity: sensor.temperature_exterieure
humidity_entity: sensor.humidite_exterieure
wind_speed_entity: sensor.vitesse_vent
rain_rate_entity: sensor.intensite_pluie
mode: detailed
```

Les noms ci-dessus sont des exemples : sélectionne toujours tes propres
entités. `mode: compact` retire les prévisions pour une carte d’accueil.

## Si la ressource n’a pas été ajoutée automatiquement

Dans **Paramètres → Tableaux de bord → Ressources**, ajoute une ressource de
type **Module JavaScript** avec cette adresse :

```text
/hacsfiles/niak-weather/niak-weather-card.js
```

Puis recharge le navigateur.

## Ce qui est disponible dans v0.1.0

- condition et température courantes ;
- prévisions horaires et quotidiennes Météo-France ;
- température, humidité, vent et intensité de pluie Ecowitt facultatifs ;
- interface française ou anglaise suivant Home Assistant.

Le modèle complet de la station — ressenti, soleil, rosée, foudre, tendances
vent/baromètre, cumuls et courbes détaillées — sera ajouté dans les versions
suivantes avec son package de templates versionné.
