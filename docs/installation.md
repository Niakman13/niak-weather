# Installer Niak Weather

## Avant de commencer

Le minimum obligatoire est **Home Assistant 2025.1.0 ou plus récent** et une
entité `weather.*`. [Météo-France](https://www.home-assistant.io/integrations/meteo_france/)
est le fournisseur recommandé et de référence pour les prévisions. Une autre
entité météo peut être choisie, mais les horizons disponibles dépendent de son fournisseur.

Pour suivre le parcours ci-dessous, [HACS](https://hacs.xyz/) doit être installé.
Ecowitt est facultatif pour démarrer, mais nécessaire pour les mesures locales ;
la carte calcule elle-même le ressenti avec l’humidité. Le Soleil, Atmo France
et Polleninformation sont des compléments facultatifs.
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

## Synthèse intelligente

La version stable est **v1.9.2**. Consulte les [notes de mise à jour](release-1.9.2.md) : animations plus visibles, vraie scène de brouillard, nuit étoilée, orages plus marqués et synthèse ordonnée. Les réglages déjà enregistrés sont conservés. Une mise à jour de la carte ne nécessite pas de redémarrer Home Assistant.

## Ajouter la carte

Dans un tableau de bord, clique **Ajouter une carte** puis recherche **Niak
Weather**. Commence par **Sources météo, soleil et vigilance** : seule la source météo est requise. Les deux catégories **Capteurs locaux / station météo locale** et **Atmo France** sont conseillées pour enrichir les mesures, le ressenti et la synthèse, sans être nécessaires pour démarrer. **Général** regroupe l’affichage et les animations. Chaque catégorie explique brièvement son rôle.

Chaque catégorie possède son bouton **Remplir automatiquement**. Il recherche les correspondances de cette catégorie seulement et consulte à nouveau les registres Home Assistant. Les listes manuelles proposent des mesures compatibles : températures pour la température, vitesses pour le vent, pression pour le baromètre. Choisis l’appareil de la station pour réduire les listes ; la sélection n’est pas limitée à l’intégration Ecowitt.

Le parcours des appareils locaux, les profils WS90/GW2000A et les compléments calculés depuis Recorder sont décrits dans [Profils et historiques locaux](station-profiles.md). Les compteurs dédiés restent prioritaires et les cumuls incomplets sont signalés.

Après une réinstallation, clique le bouton de la catégorie concernée pour réparer les références introuvables. Une correspondance ambiguë n’est pas choisie arbitrairement. Les choix valides, les entités `unavailable`/`unknown` et les champs volontairement vidés ne sont pas remplacés. Vérifie toujours les propositions avant d’enregistrer : notamment température/humidité extérieures et période des cumuls de pluie.

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
```

Les noms ci-dessus sont des exemples : sélectionne toujours tes propres
entités. Les trois interrupteurs de Général contrôlent les sections affichées.

## Si la ressource n’a pas été ajoutée automatiquement

Dans **Paramètres → Tableaux de bord → Ressources**, ajoute une ressource de
type **Module JavaScript** avec cette adresse :

```text
/hacsfiles/niak-weather/niak-weather-card.js
```

Puis recharge le navigateur.

## Installation manuelle sans HACS

1. Depuis la [release v1.2.0](https://github.com/Niakman13/niak-weather/releases/tag/v1.2.0), télécharge **niak-weather-card.js** dans les fichiers joints, pas l’archive du code source.
2. Copie ce fichier dans le dossier `www` de la configuration Home Assistant (le créer s’il n’existe pas).
3. Ajoute une ressource **Module JavaScript** dans **Paramètres → Tableaux de bord → Ressources**, à l’adresse `/local/niak-weather-card.js`.
4. Recharge le navigateur, puis ajoute la carte comme décrit plus haut.

Dans ce mode, les mises à jour sont manuelles : remplacer le fichier par celui de la nouvelle release et recharger le navigateur. Ne charge pas en même temps les ressources `/local/` et `/hacsfiles/` de cette carte.

## Installer ou mettre à jour vers v1.9.2 stable

La version stable réunit les mesures de la station, le ressenti expliqué, les prévisions et bilans, ainsi que les informations facultatives Atmo France. Une mise à jour conserve les entités et réglages enregistrés.

1. Ouvre **Niak Weather** dans HACS et utilise **Mettre à jour** si proposé, sinon **⋮ → Retélécharger / Redownload**.
2. Sélectionne **v1.9.2** si le choix d’une version est demandé. Il n’est pas nécessaire d’activer les préversions.
3. Télécharge, puis recharge le navigateur avec **Ctrl+F5**. Sur l’application mobile, ferme puis rouvre le tableau de bord et, si nécessaire, vide son cache frontend.
4. Les choix enregistrés sont conservés. Pour ajouter des mesures ou réparer des références introuvables, ouvre la catégorie concernée et clique **Remplir automatiquement** ; vérifie les propositions avant d’enregistrer.

Le choix Accueil / Complet a disparu. Les trois interrupteurs de Général contrôlent les sections. Une ancienne configuration compacte garde les prévisions masquées, sauf choix explicite contraire ; leur interrupteur permet de les réactiver. L’ancien champ `mode` est retiré lors de la sauvegarde dans l’éditeur.

### Atmo France : air extérieur et pollens

Dans **Atmo France — air extérieur et pollens**, sélectionne la commune/zone et la source **Atmo France**, puis préremplis les entités. Les indices et concentrations d’aujourd’hui et de demain ont des choix séparés et filtrés. Si l’intégration n’est pas encore configurée, le [guide Atmo France](atmo-france.md) détaille son installation, l’activation des pollens/prévisions et la migration depuis Polleninformation.

### Ressenti et humidité

Rien à installer : avec l’humidité extérieure de la station (ou, sans station, celle du bulletin), la carte calcule l’humidex, le point de rosée et le point de gelée. Si Thermal Comfort était configuré pour la carte, ses anciens réglages sont ignorés et retirés à l’enregistrement ; tu peux le garder pour tes automatisations.

### Comprendre ce que tu vois

La partie actuelle combine les observations de la station avec le bulletin de la zone. Le ressenti est une estimation expliquée ; la courbe horaire et les plages quotidiennes affichent les températures **prévues par le fournisseur**, pas ce ressenti. Les phrases sur la pluie et les orages interprètent les prévisions reçues. Pour les détails, consulte la [mécanique météo et prévisions](data-model.md).

La carte calcule son modèle météo et demande les prévisions directement au fournisseur météo choisi : aucun capteur de modèle ni template supplémentaire n’est nécessaire.

### Si un bloc manque

Un bloc ne s’affiche que si ses données existent. Le bilan demande notamment les compteurs semaine/mois et la rafale maximale du jour. Le point de rosée, l’UV et les pollens sont facultatifs. Les tendances vent/pression demandent que Recorder enregistre ces entités et que l’utilisateur ait accès à leur historique. Sans historique, le texte indique que la tendance est en cours de mesure.

La carte ne fournit pas de nouvelles entités pour des automatisations. Son rendu est autonome : elle n’a pas besoin de `button-card` ni d’une carte graphique supplémentaire.
