# Affichage modulable et sources des conditions actuelles

Ces réglages sont disponibles dans la version stable **1.4.0**.

## Choisir les sections

Dans **Général**, trois interrupteurs permettent d’afficher ou de masquer indépendamment le bandeau **Synthèse / météo actuelle**, la section **Aujourd’hui** et la section **Prévisions**. Les trois sont activés par défaut.

Le choix Accueil (compact) / Complet est supprimé. Une ancienne configuration `mode: compact` est convertie en `show_predictions: false`, sauf si un choix explicite existe déjà pour cette section. Le réglage `mode` est retiré lors de la prochaine sauvegarde dans l’éditeur. Les prévisions peuvent ensuite être réactivées librement ; aucun ancien mode ne masque les mesures techniques ou les détails Atmo. Les configurations `mode: detailed` sont simplement nettoyées sans masquer de section.

Quand le brief intelligent est désactivé, le bandeau devient **Météo actuelle** : le résumé de gauche disparaît pour éviter de répéter la condition déjà affichée à droite. Le ciel animé reste disponible.

Lorsque le brief est activé, un petit **i** à côté du titre **Synthèse** ouvre les points à retenir, leurs sources et les limites des données dans un panneau superposé sur toute la largeur de la carte. L’ouverture ne change pas la hauteur du bandeau et ne déplace pas les sections suivantes. Fermé par défaut, le panneau se referme avec le bouton Fermer, le « i », Échap ou un clic à l’extérieur. Sur un écran trop petit pour tout afficher, seul le panneau fait défiler ses informations.

La ligne **À venir** apparaît seulement lorsqu’une évolution pertinente est détectée dans les prévisions. Une variation de pression d’au moins 1 hPa peut accompagner les autres informations de la synthèse : c’est une mesure de tendance sur les trois dernières heures, pas une prévision de pluie. L’historique reste affiché pendant le rechargement des données ; sa référence tient compte des changements enregistrés par Home Assistant, sans perdre une mesure simplement parce qu’elle passe la limite exacte des trois heures.

Options YAML correspondantes : `show_synthesis`, `show_today` et `show_predictions` (valeurs `true` ou `false`).

## Utiliser la carte sans station

Une entité météo suffit pour afficher les conditions du bulletin. La température reste dans le bandeau supérieur ; les cadres Pluie, Vent et Pression regroupent les autres lectures, sans rangée de petits cadres en double. Ils utilisent les attributs du bulletin lorsqu’ils sont disponibles. Une bulle indique leur source : **Météo-France**, ou le fournisseur du bulletin choisi.

Chaque cadre dispose d’un volet **Statistiques** replié par défaut pour ses graphiques. Les chiffres clés et la petite rose des vents restent visibles. Les historiques des capteurs ne sont jamais fabriqués à partir des prévisions météo.

La rose des vents accompagne les chiffres sur la même ligne ; le maximum journalier est réservé aux statistiques. Les commentaires répétant les chiffres disparaissent au profit des informations pertinentes du brief. Air extérieur et pollens ont chacun leur cadre, leur source et leurs détails repliables, aujourd’hui comme demain. La courbe horaire et le tableau de la semaine disposent également de deux cadres distincts.

Les mesures locales renseignées et disponibles sont prioritaires, cadre par cadre, avec une bulle **Station locale**. Si un capteur local devient indisponible et qu’un attribut météo peut le remplacer, la bulle indique explicitement **repli**. Un clic ouvre l’entité qui fournit la valeur affichée.

## Ne pas confondre pluie prévue et pluie mesurée

Avec une station, le cadre Pluie présente le cumul depuis minuit ou l’intensité mesurée, selon les capteurs disponibles. Sans station, il présente l’état du bulletin (par exemple « Pluie » ou « Temps sec ») et, si disponible, le cumul prévu sur le prochain créneau horaire. Il ne transforme jamais une prévision en cumul mesuré ni un ciel sec en zéro millimètre mesuré.

## Afficher un ressenti utile

Sans station, la jauge de ressenti s’appuie sur la température et l’humidité du bulletin, et sa bulle l’indique. Sans humidité du bulletin, elle est masquée : elle n’affiche jamais une simple copie de la température. L’humidex est calculé par la carte ; aucune intégration Thermal Comfort n’est nécessaire.

La synthèse ne traite pas les données de remplacement du bulletin comme des observations de la station locale.
