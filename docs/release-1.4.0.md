# Niak Weather v1.4.0 — configuration flexible et affichage modulable

Cette version stable intègre les améliorations des deux bêtas 1.4.0 et supprime le choix Accueil / Complet. La carte reste utilisable avec une simple entité météo, puis s’enrichit avec une station locale, Thermal Comfort et Atmo France.

## Un paramétrage par source

Cinq catégories organisent les réglages : Général ; Météo, soleil et vigilance ; Station météo locale ; Thermal Comfort ; Atmo France. Chacune possède son propre remplissage automatique. Les choix manuels sont filtrés par type de mesure et, si choisi, par appareil. Le choix d’une station n’est pas limité à l’intégration Ecowitt.

Le remplissage peut réparer les références introuvables après un renommage ou une réinstallation. Les choix valides, les capteurs momentanément indisponibles et les champs volontairement vidés sont conservés. Les correspondances ambiguës restent à choisir manuellement. L’humidex reste lié à Thermal Comfort.

L’éditeur charge les catégories facultatives à leur ouverture et évite les reconstructions pour les mises à jour sans rapport avec la carte. Les changements de présentation ne relancent pas inutilement les demandes de prévisions et d’historique.

## Un seul affichage, trois sections indépendantes

Les interrupteurs de Général contrôlent Synthèse / météo actuelle, Aujourd’hui et Prévisions. Il n’existe plus de mode compact qui masque implicitement les prévisions, les mesures techniques ou les détails Atmo.

Une ancienne configuration compacte garde les prévisions masquées, sauf choix explicite contraire. Elles peuvent être réactivées librement. L’ancienne option `mode` disparaît à la prochaine sauvegarde dans l’éditeur. Les autres choix d’entités sont conservés. Les détails pluie/vent et Atmo auparavant masqués par le mode compact suivent désormais leurs propres réglages.

Sans brief intelligent, le résumé de gauche disparaît pour éviter de répéter la météo actuelle à droite. Le ciel animé reste disponible.

## Une carte utile sans station

Les cadres Température, Vent et Pression utilisent les attributs du bulletin disponibles lorsque les mesures locales ne sont pas utilisables. Chaque cadre indique sa source ; une mesure locale disponible reste prioritaire et un remplacement d’un capteur configuré indisponible est explicitement signalé comme repli. Le clic ouvre l’entité qui fournit la donnée affichée.

Sans capteur de pluie, le cadre présente l’état du bulletin et, si disponible, le cumul prévu sur le prochain créneau. Une prévision n’est jamais transformée en cumul mesuré depuis minuit.

La jauge de ressenti est masquée sans température locale utilisable ni humidex Thermal Comfort utilisable, pour éviter une simple copie de la température du bulletin.

## Mise à jour et vérifications

Dans HACS, utilisez Mettre à jour ou Télécharger / Retélécharger et sélectionnez **v1.4.0**. Les préversions ne sont pas nécessaires. Rechargez le navigateur puis rouvrez l’éditeur. Aucun redémarrage de Home Assistant n’est nécessaire.

229 tests unitaires passent, ainsi que les contrôles navigateur mobile/desktop en thèmes clair et sombre, les combinaisons de sections, la migration de l’ancien mode et les contrôles de performance. Les interfaces Home Assistant des tests sont simulées ; le comportement réel dépend de votre installation et des données de vos intégrations.

Conservez une copie de votre configuration avant la mise à jour si vous souhaitez un retour strictement identique à la version précédente.
