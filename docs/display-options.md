# Affichage modulable et sources des conditions actuelles

Ces réglages sont disponibles dans la version stable **1.4.0**.

## Choisir les sections

Dans **Général**, trois interrupteurs permettent d’afficher ou de masquer indépendamment le bandeau **Synthèse / météo actuelle**, la section **Aujourd’hui** et la section **Prévisions**. Les trois sont activés par défaut.

Le choix Accueil (compact) / Complet est supprimé. Une ancienne configuration `mode: compact` est convertie en `show_predictions: false`, sauf si un choix explicite existe déjà pour cette section. Le réglage `mode` est retiré lors de la prochaine sauvegarde dans l’éditeur. Les prévisions peuvent ensuite être réactivées librement ; aucun ancien mode ne masque les mesures techniques ou les détails Atmo. Les configurations `mode: detailed` sont simplement nettoyées sans masquer de section.

Quand le brief intelligent est désactivé, le bandeau devient **Météo actuelle** : le résumé de gauche disparaît pour éviter de répéter la condition déjà affichée à droite. Le ciel animé reste disponible.

Options YAML correspondantes : `show_synthesis`, `show_today` et `show_predictions` (valeurs `true` ou `false`).

## Utiliser la carte sans station

Une entité météo suffit pour afficher les conditions du bulletin. La température reste dans le bandeau supérieur ; les cadres Pluie, Vent et Pression regroupent les autres lectures, sans rangée de petits cadres en double. Ils utilisent les attributs du bulletin lorsqu’ils sont disponibles. Une bulle indique leur source : **Météo-France**, ou le fournisseur du bulletin choisi.

Chaque cadre dispose d’un volet **Statistiques** replié par défaut pour ses graphiques. Les chiffres clés et la petite rose des vents restent visibles. Les historiques des capteurs ne sont jamais fabriqués à partir des prévisions météo.

La rose des vents accompagne les chiffres sur la même ligne ; le maximum journalier est réservé aux statistiques. Les commentaires répétant les chiffres disparaissent au profit des informations pertinentes du brief. Air extérieur et pollens ont chacun leur cadre, leur source et leurs détails repliables, aujourd’hui comme demain. La courbe horaire et le tableau de la semaine disposent également de deux cadres distincts.

Les mesures locales renseignées et disponibles sont prioritaires, cadre par cadre, avec une bulle **Station locale**. Si un capteur local devient indisponible et qu’un attribut météo peut le remplacer, la bulle indique explicitement **repli**. Un clic ouvre l’entité qui fournit la valeur affichée.

## Ne pas confondre pluie prévue et pluie mesurée

Avec une station, le cadre Pluie présente le cumul depuis minuit ou l’intensité mesurée, selon les capteurs disponibles. Sans station, il présente l’état du bulletin (par exemple « Pluie » ou « Temps sec ») et, si disponible, le cumul prévu sur le prochain créneau horaire. Il ne transforme jamais une prévision en cumul mesuré ni un ciel sec en zéro millimètre mesuré.

## Afficher un ressenti utile

La jauge de ressenti est masquée en configuration minimale, sans température locale utilisable ni humidex Thermal Comfort utilisable. Elle n’affiche donc pas une simple copie de la température du bulletin. Thermal Comfort reste la source de l’humidex ; le capteur d’une station n’est pas choisi à sa place.

La synthèse ne traite pas les données de remplacement du bulletin comme des observations de la station locale.
