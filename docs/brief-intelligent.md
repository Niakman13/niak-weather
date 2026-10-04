# Brief intelligent — préparation de la v1.2

Cette fonction est en développement et n’est pas incluse dans la release stable v1.0.0. Son objectif est de transformer les mesures et prévisions en un résumé compréhensible : **ce que l’on ressent maintenant, ce qui arrive et ce qui mérite de l’attention**.

## Un bandeau, trois lectures

**Maintenant** explique le ressenti, son écart avec la température et la contribution dominante du vent, du soleil, de la pluie ou de l’humidité. Il ajoute les phénomènes observés importants : vent, fortes pluies, brouillard déduit, UV, chaleur ou froid. La tendance de pression apporte du contexte, sans être transformée en prévision de pluie.

**À venir** lit les six prochaines heures : première pluie annoncée, cumul des quantités disponibles, orage/grêle, température prévue négative ou changement de température marqué. Les délais utilisent les dates des prévisions, pas la position d’un point dans une liste. Pour une source structurée personnalisée, ils utilisent ses repères jour/heure dans le fuseau Home Assistant. Les valeurs restent celles du fournisseur : le brief n’invente pas un modèle de prévision.

**Air et pollens** retient le plus défavorable des indices Atmo disponibles, sans moyenner un polluant préoccupant avec des indices favorables. Aujourd’hui et demain sont distingués. Les concentrations ne sont pas converties en risques et le code 7 reste un évènement. L’indice d’air intérieur personnalisé peut être cité en %, sans lui attribuer un seuil sanitaire universel. Polleninformation reste une alternative, sans double affichage.

Le bandeau limite les phrases par rubrique. S’il reste d’autres points importants, il le signale et les conserve dans **Comprendre le brief et ses limites**, avec le raisonnement, les limites et un bouton pour ouvrir l’entité source. Un phénomène important ne disparaît pas dans une moyenne.

## Couleurs et vigilance officielle

| Couleur du bandeau | Lecture |
| --- | --- |
| Bleu | Synthèse, sans signal renforcé parmi les données disponibles ; ce n’est pas une garantie de sécurité. |
| Jaune | À surveiller. |
| Orange | Attention renforcée. |
| Rouge | Réservé à une vigilance rouge officiellement fournie par Météo-France. |
| Gris | Données insuffisantes. |

La couleur prend le niveau le plus élevé, jamais une moyenne. Les mots restent affichés pour ne pas dépendre uniquement de la couleur. Les données manquantes ou dont la fraîcheur n’est pas vérifiable sont expliquées ; un brief sans signal renforcé peut être marqué **Synthèse partielle**.

Dans **Brief intelligent et vigilance**, le capteur de vigilance départementale Météo-France est facultatif. Le choisir explicitement : le département peut ne pas être celui déduit intuitivement du nom d’une commune. Les listes filtrent les entités de vigilance identifiées ; un simple capteur nommé « rouge » n’est pas une vigilance officielle. Les niveaux jaune/orange/rouge imposent un minimum d’attention, sans faire disparaître la pollution ou les observations de la station. Une vigilance verte ne signifie pas que l’air est bon.

Le [dispositif officiel Météo-France](https://vigilance.meteofrance.fr/fr/guide-vigilance-meteo) et le [capteur Home Assistant](https://www.home-assistant.io/integrations/meteo_france/#about-weather_alert-sensor) restent les références. Les seuils ci-dessous sont **des règles éditoriales de synthèse**, pas des seuils départementaux officiels ni des recommandations médicales.

## Règles initiales à éprouver

| Signal | À surveiller | Attention renforcée |
| --- | --- | --- |
| Vent actuel | Vent moyen ≥ 30 km/h ou rafales ≥ 40 km/h | Vent moyen ≥ 50 km/h ou rafales ≥ 60 km/h |
| Pluie mesurée | ≥ 1 mm/h | ≥ 4 mm/h |
| Pluie prévue, dans les 6 h disponibles | Cumul ≥ 5 mm | ≥ 5 mm sur un point horaire ou cumul ≥ 20 mm |
| Pluie et vent simultanés | — | Pluie mesurée ≥ 1 mm/h et vent moyen ≥ 30 km/h |
| Ressenti actuel | ≥ 34 °C ou ≤ 2 °C | ≥ 38 °C ou ≤ −3 °C |
| UV | ≥ 6 | ≥ 8 |
| Air extérieur Atmo | Indice 3/6 | Indice ≥ 4/6 |
| Pollens Atmo | Indice 4/6 | Indice ≥ 5/6 |

L’orage/grêle prévu déclenche une attention renforcée. Une température prévue ≤ 0 °C et les conditions déduites de brouillard méritent une surveillance, sans prétendre mesurer le gel du sol ou la visibilité. Une petite pluie peut être citée sans augmenter la couleur.

Ces réglages sont actuellement définis dans le moteur, pas éditables individuellement. Ils devront être confrontés à des épisodes réels avant de figer la v1.2. Aucune alerte de la carte ne remplace les consignes officielles.

## Données manquantes et anciennes

Les points horaires passés ou au-delà de six heures sont exclus du brief à venir. Une quantité de pluie manquante n’est pas présentée comme un zéro connu ; le cumul peut être partiel. Les niveaux Atmo publiés depuis plus de 48 h ne sont pas utilisés pour qualifier la situation ; sans date, la fraîcheur est indiquée comme non vérifiable. Une vigilance dont la dernière mise à jour connue dépasse 48 h n’est pas présentée comme actuelle. Un modèle personnalisé indisponible ne réutilise pas ses anciens attributs.

Le brief fonctionne sans API d’IA, abonnement ou clé supplémentaire. Ses règles sont explicables et testables. Il ne crée ni automatisations ni notifications hors de la carte.

## Réglages

```yaml
smart_brief: true
vigilance_entity: sensor.mon_departement_weather_alert
```

Le nom du capteur est un exemple. Le brief est activé par défaut dans la version de développement ; `smart_brief: false` conserve le bandeau simple. La v1.0.0 installée n’est pas modifiée tant qu’une nouvelle version n’est pas téléchargée.

## Vérification du prototype

Des tests dédiés couvrent les cumuls de signaux, les seuils, les horaires, les indices Atmo, les données anciennes/manquantes et la priorité de la vigilance officielle. Les contrôles navigateur vérifient le bandeau à 375/768/1440 px en clair/sombre, l’ouverture des explications et les sources au clavier. Le nouveau bandeau n’a pas encore de référence visuelle approuvée ; le comportement sur une vraie installation et les contrastes de tous les thèmes restent à valider avant publication stable.
