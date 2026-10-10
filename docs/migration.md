# Passer de la 1.20 à la 2.0

[Accueil](../README.md) · [Intégration Niak Weather](https://github.com/Niakman13/niak-weather-integration)

En 2.0, Niak Weather se compose de deux pièces :

- **l’intégration Niak Weather** lit vos sources (météo, station, air et pollens) et calcule tout : ressenti, alertes, bulletin, tendances, bilans. Elle crée aussi des capteurs pour vos automatisations ;
- **la carte** affiche ce que l’intégration lui envoie. Elle ne garde que ses réglages d’affichage.

Les deux sont nécessaires : la carte 2.0 ne calcule plus rien seule. Sans l’intégration, elle le dit et donne le lien pour l’installer.

## 1. Installer l’intégration

1. Dans HACS, ⋮ → **Dépôts personnalisés** : ajoutez `https://github.com/Niakman13/niak-weather-integration`, catégorie **Intégration**.
2. Téléchargez **Niak Weather (intégration)**, puis redémarrez Home Assistant.

## 2. La configurer en reprenant vos cartes

**Paramètres → Appareils et services → Ajouter une intégration → Niak Weather**, puis **Reprendre les réglages d’une carte**.

Météo, station, vigilance, air et pollens sont repris de la carte choisie, et affichés à chaque étape pour vérification. Plusieurs lieux ? Ajoutez l’intégration une fois par lieu.

## 3. Mettre la carte à jour

Dans HACS, mettez **Niak Weather** à jour, puis rechargez le navigateur (**Ctrl+F5**). Avec un seul lieu, vos cartes s’affichent sans rien modifier.

## Ce qui change

- Les sources ne se règlent plus dans la carte. Son éditeur garde l’affichage : format, sections, bulletin, animations, page météo.
- Avec plusieurs lieux, l’éditeur demande le **Lieu** (`entry_id` en YAML).
- Les anciens réglages de sources restent dans le YAML des cartes : ils ne servent plus, mais permettent de revenir à la v1.20.3.
- Le bandeau change : vigilance en pastille, bulletin du jour rédigé comme une prévision, frise des heures à venir. Les quatre tuiles soir, nuit, matin, après-midi et les onglets Heures/Jours de la tuile disparaissent ; les prévisions détaillées restent dans la carte complète.
- Onze capteurs apparaissent : `sensor.niak_weather_ressenti`, `sensor.niak_weather_pluie_24h`… [Leur description](https://github.com/Niakman13/niak-weather-integration#les-capteurs).

## Revenir à la 1.20.3

Dans HACS, ⋮ → **Retélécharger**, choisissez **v1.20.3**, puis rechargez le navigateur. La carte retrouve ses sources dans le YAML. L’intégration peut rester installée.

## Un souci ?

Signalez-le dans les issues de [la carte](https://github.com/Niakman13/niak-weather/issues) ou de [l’intégration](https://github.com/Niakman13/niak-weather-integration/issues).
