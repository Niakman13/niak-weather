# Installer Niak Weather

## Avant de commencer

Il faut déjà avoir :

1. [HACS](https://hacs.xyz/) installé dans Home Assistant ;
2. l’intégration [Météo-France](https://www.home-assistant.io/integrations/meteo_france/) configurée, avec une entité `weather` ;
3. une station ou une passerelle Ecowitt qui publie ses mesures dans Home Assistant.

La carte fonctionne même avec peu de mesures Ecowitt. Chaque mesure
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

## Tester v0.2.0-beta.7

La version beta.7 conserve le rendu complet de la carte locale et ajoute Atmo France pour l’air extérieur et les pollens. La version stable 0.1.0 est plus ancienne ; sélectionne explicitement beta.7 pour tester ce rendu enrichi.

1. Ouvre **Niak Weather** dans HACS, puis **⋮ → Retélécharger / Redownload**.
2. Utilise le choix d’une autre version et sélectionne **v0.2.0-beta.7**. Si nécessaire, active l’accès aux préversions pour ce dépôt ([fonctionnement HACS](https://hacs.dev/docs/use/entities/switch/)).
3. Télécharge, puis recharge le navigateur avec **Ctrl+F5**. Sur l’application mobile, ferme puis rouvre le tableau de bord et, si nécessaire, vide son cache frontend.
4. Ouvre l’éditeur de la carte et clique **Préremplir les entités manquantes**. Vérifie le vent moyen, les cumuls pluie et la rafale maximale du jour.

### Atmo France : air extérieur et pollens

Dans **Atmo France — air extérieur et pollens**, sélectionne la commune/zone et la source **Atmo France**, puis préremplis les entités. Les indices et concentrations d’aujourd’hui et de demain ont des choix séparés et filtrés. Si l’intégration n’est pas encore configurée, le [guide Atmo France](atmo-france.md) détaille son installation, l’activation des pollens/prévisions et la migration depuis Polleninformation. L’indicateur d’air intérieur en % reste indépendant.

### Thermal Comfort

Installe [Thermal Comfort](https://github.com/dolezsa/thermal_comfort) via HACS si ce n’est pas déjà fait, puis configure un appareil avec la température et l’humidité **extérieures** de la station. Active les capteurs Humidex et Perception de l’humidex dans Home Assistant s’ils sont désactivés.

Dans **Entités Thermal Comfort**, sélectionne cet appareil. Les listes sont filtrées par type de mesure et appareil. La recherche automatique compare aussi ses lectures d’entrée à celles de la station pour éviter de prendre les capteurs d’une pièce intérieure. Si plusieurs choix sont équivalents, elle laisse le champ vide : il faut choisir manuellement. Sans humidex, la carte indique que l’humidité n’est pas comptée dans son estimation.

### Reprendre exactement un template local existant

Dans **Soleil, air et compatibilité locale**, choisis le capteur du modèle météo local et celui de ses prévisions. La détection les propose lorsque leurs sources correspondent à la station et à l’entité météo choisies. La carte lit alors les mêmes calculs, les mêmes tendances et les mêmes cumuls que la carte locale. Elle n’ajoute ni un nouveau package, ni une copie de ces capteurs.

```yaml
type: custom:niak-weather-card
weather_entity: weather.ma_commune
model_entity: sensor.meteo_maison
forecast_entity: sensor.meteo_previsions
mode: detailed
forecast_source: Météo-France
```

Ces noms sont des exemples ; ils doivent correspondre aux deux capteurs de ton template. Garde le même thème et le même zoom pour comparer les deux cartes. Modifier une mesure dans l’éditeur repasse au modèle intégré afin que ce choix soit pris en compte.

La distance de foudre et Confort/ouvrants sont retirés de cette version. Les orages **prévus** restent visibles. Le créneau d’aération et les alertes d’ouvrants ne sont plus affichés ; sans verdict local de bénéfice, une météo sans alerte utilise le bleu.

### Si un bloc manque

Un bloc ne s’affiche que si ses données existent. Le bilan demande notamment les compteurs semaine/mois et la rafale maximale du jour. Le point de rosée, l’UV, l’air intérieur et les pollens sont facultatifs. Dans le modèle intégré, les tendances vent/pression demandent que Recorder enregistre ces entités et que l’utilisateur ait accès à leur historique. Sans historique, le texte indique que la tendance est en cours de mesure. Dans le modèle local, les tendances existantes sont reprises directement.

La carte ne fournit pas de nouvelles entités pour des automatisations. Elle n’a pas besoin de `button-card` : le rendu original est désormais inclus dans la ressource Niak Weather.
