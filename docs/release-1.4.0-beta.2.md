# Niak Weather v1.4.0-beta.2

Cette bêta améliore l’affichage minimal et le choix des sections. Elle conserve le parcours de configuration et les optimisations de la bêta précédente. La version stable reste **v1.3.7**.

## Un bandeau sans doublon

Lorsque le brief intelligent est désactivé, le résumé de gauche disparaît. Le bandeau devient « Météo actuelle » et conserve la condition, la température et le ciel animé à droite.

## Des sections indépendantes

Dans Général, trois interrupteurs contrôlent Synthèse / météo actuelle, Aujourd’hui et Prévisions. Ils sont activés par défaut ; le mode compact continue de masquer les prévisions.

## Des cadres utiles sans station

Température, vent et pression utilisent les données disponibles du bulletin météo lorsqu’aucune mesure locale n’est utilisable. Chaque cadre porte une bulle de source. Les mesures locales restent prioritaires ; un capteur configuré devenu indisponible entraîne un repli explicitement signalé lorsque le bulletin peut le remplacer. Le clic ouvre l’entité de la donnée affichée.

Pour la pluie, une condition du bulletin et un cumul prévu sont distingués des mesures de station. Aucun cumul depuis minuit ni zéro millimètre mesuré n’est inventé sans capteur.

La jauge de ressenti est masquée sans température locale utilisable ni humidex Thermal Comfort utilisable. L’humidex reste associé à Thermal Comfort.

## Vérifications et installation

224 tests unitaires passent, ainsi que les contrôles navigateur mobile/desktop en thèmes clair et sombre, les huit combinaisons de sections et les contrôles de performance de l’éditeur. Les interfaces Home Assistant des tests sont simulées : ces contrôles ne remplacent pas une validation dans votre installation.

Dans HACS, activez les préversions, puis sélectionnez **v1.4.0-beta.2** avec Télécharger / Retélécharger. Rechargez le navigateur et rouvrez l’éditeur. Les configurations existantes sont conservées.

Vérifiez le mode météo seule, les sources des quatre cadres et les interrupteurs des sections. Pour revenir à la stable, retéléchargez **v1.3.7**. Conservez une copie de votre configuration si vous souhaitez revenir aux choix antérieurs à vos essais.
