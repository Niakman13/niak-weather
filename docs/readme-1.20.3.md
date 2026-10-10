# Niak Weather v1.20.3 (version stable)

> Cette page décrit la **version stable v1.20.3**, qui calcule tout dans la carte. La version 2.0, en bêta, s’appuie sur l’intégration Niak Weather : [README principal](../README.md).

**La météo chez vous, expliquée et mise en perspective.** Niak Weather rassemble les prévisions de votre commune et, si vous le souhaitez, les mesures d’une station locale, le ressenti, la qualité de l’air et les pollens. La carte lit les intégrations déjà configurées dans Home Assistant : elle ne nécessite pas que vous ajoutiez toutes ces sources.

Pour commencer, il faut seulement Home Assistant **2025.1 ou plus récent** et une entité météo `weather.*`. **Météo-France est la source recommandée**, mais une autre intégration météo peut convenir si elle fournit les prévisions utilisées par la carte. Les autres sources sont des enrichissements, pas des prérequis.

![Niak Weather — votre station météo et les prévisions, réunies en une carte qui parle](images/v1/niak-weather-banner.png)

Illustration de présentation avec des données d’exemple ; le rendu réel du bandeau dépend de votre météo, de vos capteurs et du thème Home Assistant.

## Les sources : du minimum aux enrichissements

| Source | Statut | Ce qu’elle apporte |
| --- | --- | --- |
| Entité météo `weather.*` | **Obligatoire** | Conditions et prévisions de votre zone. Météo-France est recommandée ; les données disponibles dépendent du fournisseur. |
| Capteurs locaux / station météo | **Conseillé** | Mesures prises chez vous : température, humidité, pluie, vent et pression. Profils guidés GW2000A et WS90 via Zigbee2MQTT, ou sélection manuelle. Chaque capteur se configure séparément : vous n’avez pas besoin de tous les instruments. |
| Soleil (`sun.sun`) | **Conseillé**, généralement déjà présent | Lever, coucher et position du soleil. L’effet du rayonnement sur le ressenti demande aussi un capteur de rayonnement solaire local. |
| Atmo France | Facultative | Indices d’air extérieur et de pollens pour aujourd’hui et demain, selon les données activées dans l’intégration. |
| Historique Home Assistant (Recorder) | Facultatif | Tendances de pression et de vent ; peut compléter certains bilans de pluie lorsque la station ne fournit pas les compteurs nécessaires. |

**En pratique :** l’entité météo seule suffit pour afficher la carte et ses prévisions. Ajoutez une station pour suivre les observations chez vous, et Atmo France si vous souhaitez les informations sur l’air et les pollens. La carte indique la source de chaque valeur et distingue toujours une prévision d’une mesure réelle. [Détails des sources et de leurs limites](sources.md).

**Version stable : v1.20.3.** Une carte redessinée de bout en bout : une tuile qui se déplie d’un appui, la carte complète d’un appui long, un seul style partout. [Nouveautés de la version 1.20.0](release-1.20.0.md) · [brouillard plus fiable 1.20.1](release-1.20.1.md) · [plus fluide sur téléphone 1.20.2](release-1.20.2.md) · [plus fluide 1.16.3](release-1.16.3.md) · [1.16.1](release-1.16.1.md) · [Installation et mise à jour](installation.md).

[![Ouvrir Niak Weather dans HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Niakman13&repository=niak-weather&category=plugin)

![Niak Weather — synthèse avec bulletin du jour, ressenti, pluie, vent, pression, air extérieur et pollens](images/v1/1.png)
![Niak Weather — prévisions des 18 prochaines heures et des 7 prochains jours, air et pollens de demain](images/v1/2.png)
Illustration de présentation avec des données d’exemple ; le rendu réel du bandeau dépend de votre météo, de vos capteurs et du thème Home Assistant.
[Installation et mise à jour](installation.md) · [Sources et prérequis](sources.md) · [Atmo France : air et pollens](atmo-france.md) · [Tous les réglages](data-model.md) · [Comprendre le brief](brief-intelligent.md)


Aperçus réalisés avec des données de démonstration dans le navigateur de test. La carte suit le thème Home Assistant ; les sources et valeurs illustrées peuvent différer de votre installation.

## Une tuile qui se déplie, une page complète

Sur la page d’accueil, la **tuile** (pleine ou demi-largeur) montre le lieu, l’alerte s’il y en a une, la bulle du brief qui défile et la météo du moment, sur le ciel animé.

- **Un appui** déplie la tuile sur place : la phrase du bulletin, les quatre moments de la journée et les prévisions, par heures ou par jours. Elle se souvient d’être dépliée, sur chaque appareil.
- **Un appui long** ouvre la carte complète par-dessus la page, en plein écran sur téléphone. Si vous préférez votre propre page météo, indiquez-la dans les réglages : l’appui long y mènera.

La carte **complète** reste un format à part entière pour une page météo dédiée. Ses sections **Aujourd’hui** et **Prévisions** se replient d’un appui sur leur titre ; leur état de départ se règle dans **Général**. [Détails](display-options.md#choisir-le-format).

![Niak Weather — tuile pleine et demi-largeur repliées, puis tuile dépliée, par temps d’orage avec vigilance jaune](images/v1/niak-weather-formats.png)

Tous les formats partagent **une seule charte** : mêmes bulles, mêmes pastilles, mêmes cadres et une palette de couleurs douces, accordées entre elles. La vigilance officielle et l’alerte mesurée chez vous s’affichent ensemble, sans que l’une efface l’autre.

## Ce que la carte apporte

> **Un ressenti complet, sans intégration supplémentaire.** La carte calcule elle-même l’humidex, le point de rosée et le point de gelée à partir de la température et de l’humidité : celles de votre station, ou à défaut celles de Météo-France. Pas besoin d’installer Thermal Comfort. Elle en tire un mot simple (« Agréable », « Chaud », « Froid »…), précise quand l’air est lourd ou sec, et prévient la veille d’une **gelée** ou d’un **brouillard** au petit matin.

La carte s’organise en trois temps : **maintenant**, **ensuite** et **les relevés**. La synthèse du bandeau attire l’attention sur une alerte ou un changement utile ; si rien ne ressort, elle ne remplit pas l’espace avec un message banal. Le ciel animé montre les conditions actuelles fournies par la météo. Les mesures de la station restent des observations locales et les prévisions gardent leur source météo.

Dans **Aujourd’hui**, le cadre **Ressenti** explique l’écart avec le thermomètre : ce qui le fait monter ou baisser (humidité, soleil, vent…) en pastilles, et un bouton **i** qui détaille le calcul du moment. Trois cadres sur le même modèle regroupent **Pluie**, **Vent** et **Pression** : la valeur du moment, un petit graphique (les 7 derniers jours de pluie, les 6 dernières heures de vent et de pression, avec les valeurs posées dessus) et trois chiffres utiles en bas. Chaque cadre indique d’où vient sa lecture.

![Cadres Pluie, Vent et Pression — données de démonstration](images/v1/3.png)
Quand Atmo France est configuré, **Air extérieur** et **Pollens** sont présentés dans deux cadres distincts, avec une source et un disque à six crans. Les données du jour et les prévisions de demain restent distinctes ; les détails des polluants et des espèces de pollens sont repliés. [Sources des graphiques et limites](recent-details.md).

Dans **Prévisions**, deux cadres séparent la courbe des prochaines heures du tableau de la semaine. Les unités **Min °C**, **Max °C** et **Pluie mm** sont rappelées en tête du tableau. Les statistiques historiques des capteurs locaux ne se confondent pas avec ces prévisions. [Sources des graphiques et limites](recent-details.md).

**Les saisons** se devinent dans le ciel animé, par petites touches qui ne contredisent jamais la météo : pétales au printemps, chaleur qui monte l’été, feuilles rousses en automne, flocons dans l’angle en hiver. Pendant la première semaine d’une nouvelle saison, une pastille l’annonce ; au survol, elle donne la durée du jour et son évolution. La saison vient de l’intégration **Saison** de Home Assistant si un capteur est choisi, sinon de la date et de l’hémisphère.

Le rendu s’adapte à la largeur disponible et au thème Home Assistant. Les colonnes se réorganisent sur mobile et les interrupteurs des sections permettent de choisir les informations affichées.

Les sections Synthèse / météo actuelle, Aujourd’hui et Prévisions peuvent être activées séparément, et Aujourd’hui et Prévisions peuvent démarrer repliées. Le **bulletin du jour** du bandeau (une phrase et quatre tuiles : matin, après-midi, soir, nuit, avec températures, pluie et vent) a aussi son interrupteur dans **Général**. Sans station, les cadres s’appuient sur les données météo disponibles et indiquent leur source. Si un capteur local configuré devient indisponible et que la météo fournit une valeur de remplacement, ce repli est signalé. La jauge du ressenti s’appuie sur la température locale ou, sans station, sur la température et l’humidité du bulletin, en le signalant. [Affichage et priorité des sources](display-options.md).

Les prévisions affichent jusqu’à **18 heures et 7 jours**, selon les données réellement fournies. La carte distingue les conditions prévues pour la zone des mesures prises chez vous. Une mesure de station indisponible n’est pas remplacée par un zéro, et un orage prévu n’est pas présenté comme de la foudre détectée par la station.

Dans l’éditeur, choisissez **GW2000A**, **WS90 via Zigbee2MQTT** ou **Autre station / configuration manuelle**. Les champs adaptés apparaissent par catégories simples ; le préremplissage est proposé pour chaque source. Les choix manuels sont filtrés par fonction, et les sélections ambiguës restent à confirmer. [Guide des sources](sources.md) · [Installation](installation.md).

## Comment la carte interprète la météo

### Observer chez vous, prévoir pour votre zone

Météo-France fournit les conditions et prévisions de votre commune. Ecowitt apporte les observations à la maison. Pour l’état actuel, une pluie mesurée, des conditions compatibles avec un brouillard dense ou un fort rayonnement solaire peuvent prendre le pas sur le bulletin de la zone. **Cela ajuste la présentation du temps actuel, pas les prévisions du fournisseur.**

### Expliquer le ressenti

Le calcul part de l’**humidex**, que la carte calcule à partir de la température et de l’humidité extérieures (formule d’Environnement Canada, identique à celle de Thermal Comfort). Il ajoute les contributions estimées du vent, du rayonnement solaire, de la pluie et du ciel nocturne lorsque leurs données sont disponibles. La carte affiche le résultat, l’écart avec le thermomètre et les contributions, pour comprendre pourquoi l’atmosphère paraît plus chaude ou plus froide.

L’humidex ne mesure que la gêne due à la chaleur : par temps frais ou sec, il descend sous le thermomètre. La carte part alors du thermomètre. Sans aucune mesure d’humidité, elle le précise.

Au-dessus de la jauge, un mot résume la sensation, selon les seuils de l’échelle de stress thermique **UTCI** : Froid intense, Froid, Frais, **Agréable** (9 à 26 °C), Chaud, Très chaud, Chaleur intense, Chaleur extrême. Le point de rosée ajoute une nuance quand elle compte : *air sec*, *un peu humide*, *lourd*, *très lourd* ou *étouffant*.

> **Comment lire le ressenti ?** C’est une estimation de l’ambiance extérieure propre à Niak Weather, pas un indice météorologique officiel ni une mesure physiologique. La base est l’humidex calculé par la carte (température et humidité combinées), ou la température réelle quand l’humidité ne joue pas. La carte y ajoute les effets estimés du vent, du soleil, de la pluie et d’une nuit claire. Le petit « i » à côté de Ressenti rappelle ce principe et renvoie à cette explication.

**Formule : ressenti = humidex (ou température) + vent + soleil + pluie + nuit.** L’humidité n’est pas ajoutée une seconde fois à l’humidex. Les corrections dont les données nécessaires manquent restent nulles. Chaque correction et le résultat final sont arrondis au dixième.

| Effet | Règle utilisée |
| --- | --- |
| Vent | Vent effectif = maximum entre zéro et 75 % du vent moyen + 25 % du maximum entre vent moyen et rafale − 3 km/h, arrondi au dixième. Correction de −0,25 °C par km/h, ou −0,15 lorsque la base dépasse 27 °C. Au-dessus de 32 °C réels, transition progressive sur 3 °C vers un coefficient dépendant de l’humidité, compris entre −0,08 et +0,06. Correction totale limitée entre −6 et +1,5 °C. |
| Soleil | Si l’élévation solaire dépasse 5° et le rayonnement mesuré dépasse 50 W/m² : rayonnement ÷ 300, arrondi au dixième, jusqu’à +3,5 °C. Les UV et la luminosité ne remplacent pas le rayonnement. |
| Pluie | À partir de 0,3 mm/h mesurés : −1,5 × min(intensité ÷ 2, 1) × (1 + min(vent effectif, 30) ÷ 60), jusqu’à −2,25 °C avant arrondi. |
| Nuit | Si l’élévation solaire est au plus −3° et la couverture nuageuse inférieure à 40 % : −1 × (1 − couverture ÷ 40), jusqu’à −1 °C. |

Par exemple : un humidex de **29 °C**, un effet du vent de **−0,4 °C** et du soleil de **+1 °C**, sans autre correction, donnent **29,6 °C ressentis**. La pression, les UV, la pollution et les pollens ne sont pas additionnés à ce chiffre ; ils peuvent en revanche enrichir la synthèse.

Ces coefficients sont des règles d’estimation de la carte, pas une formule standard validée. La carte ne connaît pas vos vêtements, votre activité ni votre exposition réelle : l’effet solaire représente une ambiance exposée, pas forcément le ressenti à l’ombre. Sans station, la jauge s’appuie sur la température et l’humidité du bulletin et l’indique ; sans humidité du bulletin non plus, elle est masquée. [Calcul détaillé dans le code](https://github.com/Niakman13/niak-weather-integration/blob/main/custom_components/niak_weather/engine/feel.py).

### Anticiper les prochaines heures et les prochains jours

La carte demande séparément les prévisions horaires et quotidiennes à votre entité météo, avec un renouvellement toutes les 15 minutes pendant qu’elle est affichée. Elle montre jusqu’à 18 points horaires et 7 jours, selon le fournisseur. La courbe représente les **températures prévues**, et non le ressenti calculé de la station ; elle comporte les extrema, les repères horaires, les périodes nocturnes et les précipitations annoncées. Les plages quotidiennes utilisent une échelle commune pour comparer les minimums et maximums d’un jour à l’autre.

La lecture horaire alimente aussi des phrases de synthèse : première pluie annoncée, accalmie pendant un épisode pluvieux, cumul attendu sur les prochaines heures, orage prévu à court terme, **gel ou gelée blanche** cette nuit (dès 3 °C prévus, car le sol se refroidit davantage que l’abri) et **brouillard** possible au petit matin (quand la minimale prévue rejoint le point de rosée). Ces indications sont des interprétations des données reçues, pas de nouvelles prévisions ni une garantie d’heure exacte. **Niak Weather n’est pas un modèle de prévision météorologique indépendant.**

### Mettre les mesures en perspective

L’historique Home Assistant permet de qualifier l’évolution de la pression et du vent. Les compteurs de la station mettent la pluie du jour en perspective avec la semaine, le mois et l’année. Atmo France complète cette lecture avec ses indices quotidiens de zone et, si disponibles, ceux de demain. [Mécanique et réglages détaillés](data-model.md).

**Aucun `button-card`, chart-card, card-mod ou package de templates supplémentaire n’est nécessaire.** Node.js et les outils de développement ne sont pas requis chez les utilisateurs. Niak Weather ne configure pas les intégrations à votre place et ne demande aucun identifiant Atmo dans ses réglages.

## Installer avec HACS

1. Ouvrez le bouton HACS en haut de cette page. Il ouvre le dépôt, sans installer automatiquement la carte.
2. Si le dépôt n’est pas trouvé, ajoutez `https://github.com/Niakman13/niak-weather` dans **HACS → ⋮ → Dépôts personnalisés**, catégorie **Tableau de bord / Dashboard**. Il s’agit d’un dépôt personnalisé, pas d’un référencement dans le catalogue HACS par défaut.
3. Téléchargez **Niak Weather v1.20.3**, puis rechargez le navigateur.
4. Dans votre tableau de bord, choisissez **Ajouter une carte → Niak Weather** et sélectionnez votre entité météo.
5. Ajoutez si souhaité les sources **Station météo locale** et **Atmo France**. Utilisez **Remplir automatiquement** dans chaque catégorie, puis vérifiez les propositions avant d’enregistrer. Sans station, les cadres utilisent les attributs du bulletin disponibles, avec une bulle de source ; la pluie prévue reste distinguée de la pluie mesurée.

Configuration minimale, sans station :

```yaml
type: custom:niak-weather-card
weather_entity: weather.ma_commune
```

Exemple enrichi avec des mesures locales :

```yaml
type: custom:niak-weather-card
weather_entity: weather.ma_commune
temperature_entity: sensor.station_outdoor_temperature
humidity_entity: sensor.station_outdoor_humidity
wind_speed_entity: sensor.station_wind_speed
rain_rate_entity: sensor.station_rain_rate
daily_rain_entity: sensor.station_daily_rain
```

Ces identifiants sont des **exemples**, pas des noms imposés. Privilégiez vos entités réelles dans l’éditeur. Le [tutoriel d’installation](installation.md) détaille les ressources, les réglages et le dépannage.

## Mettre à jour vers v1.20.3

Dans **HACS → Niak Weather**, utilisez **Mettre à jour** ou **⋮ → Retélécharger** et sélectionnez **v1.20.3**. Il n’est pas nécessaire d’activer les préversions. Rechargez ensuite le navigateur avec **Ctrl+F5** ; sur mobile, videz le cache frontend si l’ancienne version reste affichée.

Les mises à jour utilisent la même ressource et conservent vos entités. Les anciens modes sont convertis en réglages de sections : les prévisions d’une ancienne configuration compacte restent masquées sauf choix explicite contraire. Vous pouvez enrichir la configuration progressivement, sans recommencer l’installation. [Notes de version](release-1.4.0.md).

## Limites et transparence

Le ressenti est une **estimation locale**, pas une mesure physiologique ni une vigilance officielle. Sans mesure d’humidité, la carte signale qu’elle n’est pas comptée. Si vous utilisiez Thermal Comfort pour la carte, vous pouvez le garder pour vos automatisations : la carte n’en a plus besoin et ignore les anciens réglages. Les données Atmo décrivent la zone et ne remplacent pas un capteur dans le jardin. Les indices et concentrations Atmo ne sont pas mélangés.

La carte n’effectue pas de détection de foudre et ne pilote pas vos ouvrants. Les orages du ciel animé viennent de l’état actuel du fournisseur météo ; ceux du brief peuvent être annoncés par les prévisions. Ce ne sont pas des éclairs détectés sur place. Ses indicateurs ne remplacent ni la vigilance officielle ni les alertes de sécurité. Les calculs dans le navigateur ne créent pas d’entités Home Assistant pour les automatisations.

## Développement et vérifications

```sh
npm ci
npm run validate
npx playwright install chromium
npm run test:browser
```

`npm run build` produit `dist/niak-weather-card.js`. Depuis la 2.0, les calculs sont dans l’[intégration Niak Weather](https://github.com/Niakman13/niak-weather-integration) : `src/view.ts` décrit ce qu’elle envoie, `src/ui/charter.ts` décide de l’apparence de toute la carte, `src/views` assemble les écrans. Les contrôles navigateur demandent le dépôt de l’intégration à côté de celui de la carte (ou son chemin dans `NIAK_INTEGRATION`) et Python 3.13. [Charte et organisation du code](charte.md). Les releases GitHub vérifient le code et le rendu, puis joignent le fichier installable et sa carte de sources. Les utilisateurs reçoivent les mises à jour par HACS sans compilation.

Les tests de l’intégration couvrent le ressenti, les conditions observées, les prévisions, les données manquantes et le préremplissage ; ceux de la carte, l’affichage et les interactions. Les contrôles navigateur vérifient chaque format à 375, 768 et 1180 px en clair et en sombre, l’accessibilité, les gestes, la fenêtre complète, les sections repliables et le respect de la charte. Le banc visuel (`npm run visual:capture`) photographie 94 scènes à heure fixe pour comparer deux versions ; `npm run visual:docs` refait les images de ce README. Ils utilisent des composants hôtes Home Assistant simulés : ils ne garantissent pas tous les thèmes tiers ni la disponibilité des capteurs de chaque installation. [Vérifications et limites](parity.md).

Licence MIT — [LICENSE](../LICENSE).
