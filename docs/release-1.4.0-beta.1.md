# Niak Weather v1.4.0-beta.1

Cette préversion refond le paramétrage de la carte et réduit les recalculs inutiles de l’éditeur et de son aperçu. La version stable reste v1.3.7.

## Un parcours par source

Les réglages sont répartis en cinq catégories : Général ; Météo, soleil et vigilance ; Station météo locale ; Thermal Comfort ; Atmo France. Chaque catégorie possède son propre bouton de remplissage, sans modifier les sources des autres catégories. Les champs des catégories facultatives sont chargés à leur ouverture.

Les choix manuels sont filtrés par mesure et unité. Le choix d’une station n’est plus limité à l’intégration Ecowitt : les appareils MQTT, dont la WS90 via Zigbee2MQTT, peuvent être sélectionnés. Les cumuls de pluie restent distingués pendant la détection automatique. L’humidex reste exclusivement associé à Thermal Comfort.

## Réparer les références devenues introuvables

Chaque remplissage consulte de nouveau les registres Home Assistant et peut remplacer une ancienne référence lorsqu’une correspondance certaine existe. Atmo France est identifié par zone, mesure et jour. Les choix valides, les entités momentanément indisponibles et les champs volontairement vidés sont conservés. Une ambiguïté reste à résoudre manuellement.

## Une base utilisable sans station

Seule une entité météo est requise. Sans station, la carte conserve les prévisions et la synthèse ; la température du bulletin est identifiée comme telle. Les cadres de vent, pluie et pression non configurés ne sont pas affichés. Thermal Comfort et Atmo enrichissent la synthèse mais ne sont pas nécessaires pour l’activer.

## Fluidité

Les listes de choix sont mises en cache. Une mise à jour d’une entité sans rapport avec la carte ne reconstruit plus son aperçu. Les changements de présentation ne vident plus les graphiques et ne relancent plus les demandes de prévisions et d’historique. Les animations sont conservées.

Les tests automatisés comprennent 214 tests unitaires, des contrôles navigateur mobile/desktop et un scénario de 3 000 entités avec 100 mises à jour sans rapport avec la carte. Ces contrôles utilisent des interfaces Home Assistant simulées : le gain réel et les sélecteurs natifs restent à vérifier dans votre installation.

## Installer et tester

Dans HACS, autorisez les préversions pour Niak Weather, puis utilisez **Télécharger / Retélécharger** et sélectionnez **v1.4.0-beta.1**. Rechargez le navigateur, puis rouvrez l’éditeur. Les configurations existantes sont conservées ; aucune réinstallation des intégrations n’est nécessaire.

Vérifiez le filtrage des températures et des autres mesures, le remplissage par catégorie, la réparation des références Atmo après renommage, la conservation des champs vidés et la fluidité avec l’éditeur ouvert. Vérifiez aussi la carte avec une simple source météo, sans station.

Pour revenir à la stable, retéléchargez **v1.3.7** dans HACS et rechargez le navigateur. Les champs volontairement changés pendant vos essais restent ceux de votre configuration : conservez une copie de celle-ci avant les tests si vous souhaitez un retour strictement identique.
