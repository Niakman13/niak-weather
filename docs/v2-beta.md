# Essayer Niak Weather 2.0 (bêta)

[Accueil](../README.md) · [Intégration Niak Weather](https://github.com/Niakman13/niak-weather-integration)

En 2.0, Niak Weather se compose de deux pièces :

- **l’intégration Niak Weather** lit vos sources (météo, station, air et pollens) et calcule tout : ressenti, alertes, bulletin, tendances, bilans ;
- **la carte** affiche ce que l’intégration lui envoie. Elle ne garde que ses réglages d’affichage.

Les deux sont nécessaires, en version bêta : la carte 2.0 ne calcule plus rien seule.
La version stable reste la v1.20.3 : rien ne change tant que vous ne choisissez pas la bêta.

## 1. Installer l’intégration

1. Dans HACS, menu ⋮ → **Dépôts personnalisés** : ajoutez `https://github.com/Niakman13/niak-weather-integration`, type **Intégration**.
2. Ouvrez **Niak Weather** (intégration) et téléchargez la dernière version bêta (**2.0.0b4**).
3. Redémarrez Home Assistant.

## 2. La configurer

**Paramètres → Appareils et services → Ajouter une intégration → Niak Weather.**

Une carte Niak Weather existe déjà ? Choisissez **Reprendre les réglages d’une carte** : météo, station, air et pollens sont repris, et affichés à chaque étape pour vérification.
Sinon, chaque étape est préremplie avec ce que Home Assistant connaît : vérifiez, corrigez, validez.

Tout se modifie ensuite dans **Configurer**, une partie à la fois. Plusieurs lieux ? Ajoutez l’intégration une fois par lieu.

## 3. Passer la carte en 2.0

1. Dans HACS, ouvrez **Niak Weather** (tableau de bord), menu ⋮ → **Retélécharger**, puis choisissez la dernière bêta (**v2.0.0-beta.3**).
2. Rechargez le navigateur (**Ctrl+F5**).

La bêta n’est pas proposée ? Activez d’abord l’entité **Pre-release** de Niak Weather : **Paramètres → Appareils et services → Entités**, filtre **Désactivées**, puis recherchez « Niak Weather ».

Avec un seul lieu, vos cartes s’affichent comme avant, sans rien modifier.

## Ce qui change dans la carte

- Les sources ne se règlent plus dans la carte. Son éditeur garde l’affichage : format, sections, bulletin, animations, page météo.
- Avec plusieurs lieux, l’éditeur demande le **Lieu** à afficher (`entry_id` en YAML).
- Les anciens réglages de sources restent dans le YAML des cartes : ils ne servent plus, mais permettent de revenir à la v1.20.3.
- Sans l’intégration, la carte le dit et donne le lien pour l’installer.

Configuration minimale :

```yaml
type: custom:niak-weather-card
```

Les réglages d’affichage restent ceux décrits dans [Affichage modulable](display-options.md).

## En plus : des capteurs

L’intégration crée onze capteurs pour vos automatisations : ressenti, point de rosée, point de givre, humidex, alerte de la station, en bref, pluie dans, tendance de la pression, tendance de la température, pluie sur 24 h et rafale maximale du jour. [Leur description](https://github.com/Niakman13/niak-weather-integration#les-capteurs).

## Revenir à la version stable

Dans HACS, retéléchargez la carte en **v1.20.3**, puis rechargez le navigateur. Elle retrouve ses sources dans le YAML des cartes. L’intégration peut rester installée.

## Un souci ?

Signalez-le dans les issues de [la carte](https://github.com/Niakman13/niak-weather/issues) ou de [l’intégration](https://github.com/Niakman13/niak-weather-integration/issues).
