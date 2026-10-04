# Installer Niak Weather

## Avant de commencer

Le minimum obligatoire est **Home Assistant 2025.1.0 ou plus récent** et une
entité `weather.*`. [Météo-France](https://www.home-assistant.io/integrations/meteo_france/)
est le fournisseur recommandé et de référence pour les prévisions. Une autre
entité météo peut être choisie, mais les horizons disponibles dépendent de son fournisseur.

Pour suivre le parcours ci-dessous, [HACS](https://hacs.xyz/) doit être installé.
Ecowitt est facultatif pour démarrer, mais nécessaire pour les mesures locales ;
Thermal Comfort enrichit le ressenti avec l’humidité. Le Soleil, Atmo France,
Polleninformation et l’indice d’air intérieur sont des compléments facultatifs.
Consulte le [guide des sources et prérequis](sources.md) pour choisir ce que tu souhaites afficher.

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

## Tester le brief intelligent en bêta

La version stable reste **v1.0.0**. Pour essayer volontairement **v1.2.0-beta.1**, consulte le [guide de la bêta](release-1.2.0-beta.1.md) : choix de la version dans HACS, nouveau bandeau, limites et retour à la stable. Une mise à jour de la carte ne nécessite pas de redémarrer Home Assistant.

## Ajouter la carte

Dans un tableau de bord, clique **Ajouter une carte** puis recherche **Niak
Weather**. L’éditeur permet de choisir l’entité météo et les capteurs
Ecowitt que tu souhaites afficher. Dès qu’une entité météo est choisie,
Niak Weather tente de préremplir les capteurs extérieurs de la même station.
Le bloc **Entités de la station** regroupe ces choix. Le bouton **Préremplir les entités manquantes** relance cette recherche sans écraser les choix existants. Vérifie les
résultats et modifie librement un champ si ton installation emploie un nom ou
une unité inhabituels.

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

## Installation manuelle sans HACS

1. Depuis la [release v1.0.0](https://github.com/Niakman13/niak-weather/releases/tag/v1.0.0), télécharge **niak-weather-card.js** dans les fichiers joints, pas l’archive du code source.
2. Copie ce fichier dans le dossier `www` de la configuration Home Assistant (le créer s’il n’existe pas).
3. Ajoute une ressource **Module JavaScript** dans **Paramètres → Tableaux de bord → Ressources**, à l’adresse `/local/niak-weather-card.js`.
4. Recharge le navigateur, puis ajoute la carte comme décrit plus haut.

Dans ce mode, les mises à jour sont manuelles : remplacer le fichier par celui de la nouvelle release et recharger le navigateur. Ne charge pas en même temps les ressources `/local/` et `/hacsfiles/` de cette carte.

## Installer ou mettre à jour vers v1.0.0 stable

La version stable réunit les mesures de la station, le ressenti expliqué, les prévisions et bilans, ainsi que les informations facultatives Atmo France. Une mise à jour conserve les entités et réglages enregistrés.

1. Ouvre **Niak Weather** dans HACS et utilise **Mettre à jour** si proposé, sinon **⋮ → Retélécharger / Redownload**.
2. Sélectionne **v1.0.0** si le choix d’une version est demandé. Il n’est plus nécessaire d’activer les préversions.
3. Télécharge, puis recharge le navigateur avec **Ctrl+F5**. Sur l’application mobile, ferme puis rouvre le tableau de bord et, si nécessaire, vide son cache frontend.
4. Les choix enregistrés sont conservés. Pour ajouter des mesures, ouvre l’éditeur et clique **Préremplir les entités manquantes** ; vérifie les nouvelles propositions avant d’enregistrer.

### Atmo France : air extérieur et pollens

Dans **Atmo France — air extérieur et pollens**, sélectionne la commune/zone et la source **Atmo France**, puis préremplis les entités. Les indices et concentrations d’aujourd’hui et de demain ont des choix séparés et filtrés. Si l’intégration n’est pas encore configurée, le [guide Atmo France](atmo-france.md) détaille son installation, l’activation des pollens/prévisions et la migration depuis Polleninformation. L’indicateur d’air intérieur en % reste indépendant.

### Thermal Comfort

Installe [Thermal Comfort](https://github.com/dolezsa/thermal_comfort) via HACS si ce n’est pas déjà fait, puis configure un appareil avec la température et l’humidité **extérieures** de la station. Active les capteurs Humidex et Perception de l’humidex dans Home Assistant s’ils sont désactivés.

Dans **Entités Thermal Comfort**, sélectionne cet appareil. Les listes sont filtrées par type de mesure et appareil. La recherche automatique compare aussi ses lectures d’entrée à celles de la station pour éviter de prendre les capteurs d’une pièce intérieure. Si plusieurs choix sont équivalents, elle laisse le champ vide : il faut choisir manuellement. Sans humidex, la carte indique que l’humidité n’est pas comptée dans son estimation.

### Comprendre ce que tu vois

La partie actuelle combine les observations de la station avec le bulletin de la zone. Le ressenti est une estimation expliquée ; la courbe horaire et les plages quotidiennes affichent les températures **prévues par le fournisseur**, pas ce ressenti. Les phrases sur la pluie et les orages interprètent les prévisions reçues. Pour les détails, consulte la [mécanique météo et prévisions](data-model.md).

Aucun capteur de modèle ni template supplémentaire n’est nécessaire. Les champs avancés `model_entity` et `forecast_entity` servent uniquement aux sources personnalisées respectant le contrat de la carte.

### Si un bloc manque

Un bloc ne s’affiche que si ses données existent. Le bilan demande notamment les compteurs semaine/mois et la rafale maximale du jour. Le point de rosée, l’UV, l’air intérieur et les pollens sont facultatifs. Dans le modèle intégré, les tendances vent/pression demandent que Recorder enregistre ces entités et que l’utilisateur ait accès à leur historique. Sans historique, le texte indique que la tendance est en cours de mesure.

La carte ne fournit pas de nouvelles entités pour des automatisations. Son rendu est autonome : elle n’a pas besoin de `button-card` ni d’une carte graphique supplémentaire.
