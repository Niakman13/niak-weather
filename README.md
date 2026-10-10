# Niak Weather

[![release](https://img.shields.io/github/v/release/Niakman13/niak-weather)](https://github.com/Niakman13/niak-weather/releases)
[![Validate](https://github.com/Niakman13/niak-weather/actions/workflows/validate.yml/badge.svg)](https://github.com/Niakman13/niak-weather/actions/workflows/validate.yml)
[![HACS](https://img.shields.io/badge/HACS-Custom-orange)](https://hacs.xyz)
[![License](https://img.shields.io/github/license/Niakman13/niak-weather)](LICENSE)

[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/Niakman13)
[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-frankblemont-FFDD00?logo=buymeacoffee&logoColor=black)](https://www.buymeacoffee.com/frankblemont)
[![PayPal](https://img.shields.io/badge/PayPal-Donate-00457C?logo=paypal&logoColor=white)](https://paypal.me/frankblemont)

**La météo chez vous, expliquée et mise en perspective.** Niak Weather rassemble les prévisions de votre commune et, si vous le souhaitez, les mesures d’une station locale, le ressenti, la qualité de l’air et les pollens. Il lit les intégrations déjà configurées dans Home Assistant : il ne vous demande pas d’ajouter toutes ces sources.

> **Niak Weather 2.0 est en bêta.** Cette page la décrit. La version stable reste la **v1.20.3**, qui calcule tout dans la carte : [sa documentation](docs/readme-1.20.3.md).
> Rien ne change tant que vous ne choisissez pas la bêta. [Guide de la bêta](docs/v2-beta.md).

![Niak Weather — votre station météo et les prévisions, réunies en une carte qui parle](docs/images/niak-weather-banner.png)

Illustration de présentation avec des données d’exemple ; le rendu réel dépend de votre météo, de vos capteurs et du thème Home Assistant.

## Deux pièces : un cerveau et un écran

| Pièce | Rôle |
| --- | --- |
| **[L’intégration Niak Weather](https://github.com/Niakman13/niak-weather-integration)** | Elle lit vos sources et calcule tout : ressenti, alertes, bulletin du jour, tendances, bilans de pluie. Elle crée aussi des capteurs pour vos automatisations. Vos sources se règlent dans ses réglages, et elle peut reprendre ceux de vos cartes existantes. |
| **La carte Niak Weather** (ce dépôt) | Elle affiche ce que l’intégration lui envoie, sur un ciel animé. Elle ne garde que ses réglages d’affichage : format, sections, bulletin, animations, page météo. |

Les deux sont nécessaires. Il faut Home Assistant **2025.1 ou plus récent** et une entité météo `weather.*` ; **Météo-France est la source recommandée**.

| Source | Statut | Ce qu’elle apporte |
| --- | --- | --- |
| Entité météo `weather.*` | **Obligatoire** | Conditions et prévisions de votre zone. Les données disponibles dépendent du fournisseur. |
| Station météo locale | **Conseillée** | Mesures prises chez vous : température, humidité, pluie, vent, pression, rayonnement. Chaque capteur se règle séparément : vous n’avez pas besoin de tous les instruments. |
| Vigilance Météo-France | Facultative | La vigilance officielle de votre département, en haut du bandeau. |
| Atmo France | Facultative | Indices d’air extérieur et de pollens, aujourd’hui et demain. |
| Historique Home Assistant (Recorder) | Facultatif | Tendances de pression et de vent, bilans de pluie quand la station ne les fournit pas. |

**En pratique :** l’entité météo seule suffit. Ajoutez une station pour suivre les observations chez vous, et Atmo France pour l’air et les pollens. Niak Weather indique la source de chaque valeur et distingue toujours une prévision d’une mesure réelle.

[![Ouvrir Niak Weather dans HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Niakman13&repository=niak-weather&category=plugin)

## Le bandeau : vigilance, bulletin et frise

![Niak Weather — bandeau avec vigilance, bulletin du jour et frise, puis Aujourd’hui : ressenti, pluie, vent, pression, air et pollens](docs/images/1.png)

Le bandeau dit l’essentiel, du plus officiel au plus détaillé.

- **La vigilance officielle**, quand il y en a une : une pastille compacte, avec l’icône du phénomène et un halo à la couleur du niveau.
- **Le bulletin du jour**, rédigé comme une prévision : ce soir et cette nuit, puis demain, avec les heures et les quantités de pluie, l’évolution du ciel, la température utile et le vent notable.
- **La frise des heures à venir**, dans un verre dépoli :
  - une phrase qui défile parcourt les points à surveiller, un à un ;
  - chaque point est une étiquette posée à son heure ; ceux du moment sont réunis dans une seule étiquette **« Maintenant »** ;
  - l’alerte mesurée chez vous (pluie forte, vent fort, verglas…) ouvre cette étiquette, avec son halo ;
  - la piste suit le ciel prévu heure par heure, et une vigilance l’entoure d’un anneau lumineux.

Un appui sur une étiquette affiche son point. Le défilement se met en pause au survol.

Derrière, **le ciel animé** montre le temps du moment : grand soleil à rayons, lune à cratères, nuages, orages avec éclairs, rafales. La neige tombe et tient au sol, la grêle rebondit, la pluie laisse des éclaboussures. Les saisons s’y devinent par petites touches : pétales au printemps, chaleur qui monte l’été, feuilles rousses en automne, flocons dans l’angle en hiver.

## Une tuile qui se déplie, une page complète

Sur la page d’accueil, la **tuile** (pleine ou demi-largeur) montre le lieu, la vigilance s’il y en a une, la bulle qui défile et la météo du moment.

- **Un appui** la déplie sur place : le bulletin du jour et la frise. Elle se souvient d’être dépliée, sur chaque appareil.
- **Un appui long** ouvre la carte complète par-dessus la page, en plein écran sur téléphone. Si vous préférez votre propre page météo, indiquez-la dans les réglages : l’appui long y mènera.

![Niak Weather — tuile pleine et demi-largeur repliées, puis tuile dépliée, par temps d’orage avec vigilance jaune](docs/images/niak-weather-formats.png)

La carte **complète** est faite pour une page météo dédiée. Sous le bandeau, ses sections **Aujourd’hui** et **Prévisions** se replient d’un appui sur leur titre. Tous les formats partagent [une seule charte](docs/charte.md) : mêmes bulles, mêmes pastilles, mêmes cadres et une palette de couleurs douces, accordées entre elles.

## Aujourd’hui et prévisions

Dans **Aujourd’hui**, le cadre **Ressenti** explique l’écart avec le thermomètre. Il montre en pastilles ce qui le fait monter ou baisser (humidité, soleil, vent…), et un bouton **i** détaille le calcul du moment. Trois cadres sur le même modèle regroupent **Pluie**, **Vent** et **Pression** : la valeur du moment, un petit graphique (7 jours de pluie, 6 heures de vent et de pression) et trois chiffres utiles. Avec Atmo France, **Air extérieur** et **Pollens** ont chacun leur cadre.

![Cadres Pluie, Vent et Pression — données de démonstration](docs/images/3.png)

Dans **Prévisions**, la courbe des 18 prochaines heures et le tableau des 7 prochains jours, avec l’air et les pollens de demain.

![Niak Weather — prévisions des 18 prochaines heures et des 7 prochains jours, air et pollens de demain](docs/images/2.png)

Aperçus réalisés avec des données de démonstration ; les sources et valeurs peuvent différer de votre installation.

> **Un ressenti complet, sans intégration supplémentaire.** Niak Weather calcule l’humidex, le point de rosée et le point de gelée à partir de la température et de l’humidité : celles de votre station, ou à défaut celles de Météo-France. Pas besoin de Thermal Comfort. Il en tire un mot simple (« Agréable », « Chaud », « Froid »…), précise quand l’air est lourd ou sec, et prévient d’une **gelée** ou d’un **brouillard** au petit matin.

## Comment Niak Weather interprète la météo

### Observer chez vous, prévoir pour votre zone

Météo-France fournit les conditions et prévisions de votre commune ; votre station apporte les observations à la maison. Pour l’état actuel, une pluie mesurée, un brouillard probable ou un fort rayonnement solaire peuvent prendre le pas sur le bulletin de la zone. **Cela ajuste la présentation du temps actuel, pas les prévisions du fournisseur.**

### Expliquer le ressenti

Le calcul part de l’**humidex**, que l’intégration calcule à partir de la température et de l’humidité extérieures (formule d’Environnement Canada, identique à celle de Thermal Comfort). Il ajoute les contributions estimées du vent, du rayonnement solaire, de la pluie et du ciel nocturne lorsque leurs données sont disponibles. La carte affiche le résultat, l’écart avec le thermomètre et les contributions, pour comprendre pourquoi l’atmosphère paraît plus chaude ou plus froide.

L’humidex ne mesure que la gêne due à la chaleur : par temps frais ou sec, il descend sous le thermomètre. Le calcul part alors du thermomètre. Sans aucune mesure d’humidité, elle le précise.

Au-dessus de la jauge, un mot résume la sensation, selon les seuils de l’échelle de stress thermique **UTCI** : Froid intense, Froid, Frais, **Agréable** (9 à 26 °C), Chaud, Très chaud, Chaleur intense, Chaleur extrême. Le point de rosée ajoute une nuance quand elle compte : *air sec*, *un peu humide*, *lourd*, *très lourd* ou *étouffant*.

> **Comment lire le ressenti ?** C’est une estimation de l’ambiance extérieure propre à Niak Weather, pas un indice météorologique officiel ni une mesure physiologique. La base est l’humidex calculé par l’intégration (température et humidité combinées), ou la température réelle quand l’humidité ne joue pas. L’intégration y ajoute les effets estimés du vent, du soleil, de la pluie et d’une nuit claire. Le petit « i » à côté de Ressenti rappelle ce principe et renvoie à cette explication.

**Formule : ressenti = humidex (ou température) + vent + soleil + pluie + nuit.** L’humidité n’est pas ajoutée une seconde fois à l’humidex. Les corrections dont les données nécessaires manquent restent nulles. Chaque correction et le résultat final sont arrondis au dixième.

| Effet | Règle utilisée |
| --- | --- |
| Vent | Vent effectif = maximum entre zéro et 75 % du vent moyen + 25 % du maximum entre vent moyen et rafale − 3 km/h, arrondi au dixième. Correction de −0,25 °C par km/h, ou −0,15 lorsque la base dépasse 27 °C. Au-dessus de 32 °C réels, transition progressive sur 3 °C vers un coefficient dépendant de l’humidité, compris entre −0,08 et +0,06. Correction totale limitée entre −6 et +1,5 °C. |
| Soleil | Si l’élévation solaire dépasse 5° et le rayonnement mesuré dépasse 50 W/m² : rayonnement ÷ 300, arrondi au dixième, jusqu’à +3,5 °C. Les UV et la luminosité ne remplacent pas le rayonnement. |
| Pluie | À partir de 0,3 mm/h mesurés : −1,5 × min(intensité ÷ 2, 1) × (1 + min(vent effectif, 30) ÷ 60), jusqu’à −2,25 °C avant arrondi. |
| Nuit | Si l’élévation solaire est au plus −3° et la couverture nuageuse inférieure à 40 % : −1 × (1 − couverture ÷ 40), jusqu’à −1 °C. |

Par exemple : un humidex de **29 °C**, un effet du vent de **−0,4 °C** et du soleil de **+1 °C**, sans autre correction, donnent **29,6 °C ressentis**. La pression, les UV, la pollution et les pollens ne sont pas additionnés à ce chiffre ; ils peuvent en revanche enrichir la synthèse.

Ces coefficients sont des règles d’estimation de Niak Weather, pas une formule standard validée. Niak Weather ne connaît pas vos vêtements, votre activité ni votre exposition réelle : l’effet solaire représente une ambiance exposée, pas forcément le ressenti à l’ombre. Sans station, la jauge s’appuie sur la température et l’humidité du bulletin et l’indique ; sans humidité du bulletin non plus, elle est masquée. [Calcul détaillé dans le code](https://github.com/Niakman13/niak-weather-integration/blob/main/custom_components/niak_weather/engine/feel.py).

### Anticiper les prochaines heures

L’intégration lit les prévisions horaires et quotidiennes de votre entité météo et les renouvelle toutes les 15 minutes. Elle en tire le bulletin du jour et les points de la frise : première pluie annoncée et son cumul, orage prévu, **gel ou gelée blanche** cette nuit (dès 3 °C prévus, car le sol se refroidit plus que l’abri), **brouillard** possible au petit matin (quand la minimale rejoint le point de rosée). Ce sont des lectures des données reçues, pas de nouvelles prévisions. **Niak Weather n’est pas un modèle de prévision météorologique indépendant.**

## Installer la bêta avec HACS

1. Installez l’**intégration** : dans HACS, ⋮ → **Dépôts personnalisés**, ajoutez `https://github.com/Niakman13/niak-weather-integration` (type **Intégration**), téléchargez sa dernière bêta, puis redémarrez Home Assistant.
2. Ajoutez-la dans **Paramètres → Appareils et services → Ajouter une intégration → Niak Weather**. Une carte Niak Weather existe déjà ? Choisissez **Reprendre les réglages d’une carte**.
3. Installez la **carte** : ouvrez le bouton HACS plus haut (ou ajoutez `https://github.com/Niakman13/niak-weather`, type **Tableau de bord**), téléchargez sa dernière bêta, puis rechargez le navigateur (**Ctrl+F5**).
4. Ajoutez la carte : **Ajouter une carte → Niak Weather**.

La bêta n’est pas proposée ? Activez d’abord l’entité **Pre-release** du dépôt dans Home Assistant. Tout est détaillé dans le [guide de la bêta](docs/v2-beta.md), avec le retour à la version stable.

Configuration minimale :

```yaml
type: custom:niak-weather-card
```

Avec plusieurs lieux, choisissez le **Lieu** dans l’éditeur (`entry_id` en YAML). Les réglages d’affichage sont décrits dans [Affichage modulable](docs/display-options.md).

## Limites et transparence

Le ressenti est une **estimation locale**, pas une mesure physiologique ni une vigilance officielle. Les données Atmo décrivent la zone et ne remplacent pas un capteur dans le jardin.

Niak Weather ne détecte pas la foudre et ne pilote pas vos ouvrants. Les orages du ciel animé viennent de l’état actuel du fournisseur météo ; ceux de la frise, des prévisions. Ses indicateurs ne remplacent ni la vigilance officielle ni les alertes de sécurité.

## Développement et vérifications

```sh
npm ci
npm run validate
npx playwright install chromium
npm run test:browser
```

`npm run build` produit `dist/niak-weather-card.js`. Les calculs sont dans l’[intégration Niak Weather](https://github.com/Niakman13/niak-weather-integration) : `src/view.ts` décrit ce qu’elle envoie, `src/ui/charter.ts` décide de l’apparence de toute la carte, `src/views` assemble les écrans. Les contrôles navigateur demandent le dépôt de l’intégration à côté de celui de la carte (ou son chemin dans `NIAK_INTEGRATION`) et Python 3.13. [Charte et organisation du code](docs/charte.md) · [Vérifications et limites](docs/parity.md).

Licence MIT — [LICENSE](LICENSE).
