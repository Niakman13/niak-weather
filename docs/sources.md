# Sources de données et prérequis

[Accueil](../README.md) · [Installer la carte](installation.md) · [Réglages détaillés](data-model.md)

Niak Weather assemble des données déjà présentes dans Home Assistant. La carte ne remplace pas les intégrations : elle lit leurs entités et prévisions, calcule son modèle d’affichage et propose les bonnes correspondances dans l’éditeur.

## Choisir son niveau d’équipement

Pour démarrer, il suffit de Home Assistant **2025.1.0 ou plus récent**, d’une entité `weather.*` et de la carte installée. HACS est nécessaire pour le parcours recommandé et ses mises à jour, pas pour un téléchargement manuel. Météo-France est la source de référence ; une autre entité météo peut être sélectionnée, mais ses prévisions horaires/quotidiennes doivent être prises en charge par son fournisseur. Tous les fournisseurs ne sont pas validés.

Pour la météo **mesurée chez vous**, ajoutez Ecowitt. Pour le **ressenti tenant compte de l’humidité**, ajoutez Thermal Comfort avec les mesures extérieures. Pour **l’air extérieur et les allergies**, ajoutez Atmo France. L’indice d’air **intérieur** reste un capteur distinct et facultatif. Aucun de ces ajouts n’est nécessaire pour installer la carte de base.

## Météo-France — conditions et prévisions

**Statut :** une entité météo est obligatoire ; Météo-France est le fournisseur recommandé et utilisé comme référence par cette carte.

**Prérequis :** configurer [l’intégration Météo-France de Home Assistant](https://www.home-assistant.io/integrations/meteo_france/) pour votre commune. Dans la carte, sélectionner son entité `weather.*` dans **Entité météo**. Ne pas y placer un simple capteur de température.

**Apport à la carte :** condition de la zone, couverture nuageuse lorsqu’elle est exposée, prévisions horaires et quotidiennes. La température météo sert de repli seulement si aucun thermomètre local n’est configuré. La courbe montre jusqu’à 18 heures et la semaine jusqu’à 7 jours, selon les points réellement disponibles ; 7 jours ne sont pas garantis par chaque fournisseur.

Sans les prévisions d’un horizon donné, cet horizon n’est pas inventé. Les conditions Ecowitt peuvent contredire le bulletin, par exemple si de la pluie est réellement mesurée. Les orages affichés à partir du bulletin restent des **prévisions**, pas une détection de foudre. La carte n’ajoute pas automatiquement les autres capteurs de l’intégration, tels que la vigilance officielle.

## Ecowitt — mesures de la station

**Statut :** facultatif pour installer la carte ; nécessaire pour afficher les mesures de votre station et leurs bilans.

**Prérequis :** une station/passerelle prise en charge par [l’intégration Ecowitt de Home Assistant](https://www.home-assistant.io/integrations/ecowitt/), configurée pour transmettre ses mesures à Home Assistant. La carte n’est **pas réservée à la GW2000** : elle utilise les entités, pas un nom de modèle imposé. Les capteurs disponibles varient avec le matériel ; cela ne signifie pas que tout matériel portant la marque est compatible avec l’intégration.

Dans **Entités de la station**, choisissez votre station et utilisez **Préremplir les entités manquantes**. Vérifiez notamment que température et humidité sont celles de l’**extérieur**, et privilégiez la pression relative.

| Mesures disponibles | Utilité dans la carte |
| --- | --- |
| Température et humidité extérieures | Thermomètre local, humidité, règles météo locales et entrées pour Thermal Comfort. |
| Vent moyen, direction, rafales, rafale maximale du jour | Boussole, force/direction, contribution au ressenti et bilan vent. |
| Intensité de pluie et cumul depuis minuit | Pluie en cours, cumul du jour et condition locale observée. |
| Cumuls 24 h, semaine, mois, année, épisode | Bilan pluie, sans addition artificielle de compteurs. |
| Pression relative | Baromètre et tendance, si l’historique est accessible. |
| Rayonnement solaire, UV, luminosité | Contribution solaire au ressenti et indicateurs complémentaires. |
| Point de rosée | Pastille rosée et règles de brouillard. |

Chaque mesure est facultative individuellement. Sans capteur, elle reste absente ou indisponible ; un thermomètre configuré mais indisponible n’est pas remplacé silencieusement par la température du bulletin. Les compteurs **semaine et mois de la station** ne sont pas des sommes glissantes calculées par la carte. Depuis la v1.2.0-beta.3, ils sont nommés « Cette semaine » et « Ce mois », à la place de « 7 jours » et « 30 jours ». Leur date de remise à zéro dépend des réglages de la station.

## Thermal Comfort — humidex et ressenti

**Statut :** facultatif ; recommandé pour un ressenti tenant compte de l’humidité.

**Prérequis :** installer [Thermal Comfort](https://github.com/dolezsa/thermal_comfort) dans les intégrations HACS, suivre ses instructions de redémarrage, puis créer un appareil utilisant la **température extérieure et l’humidité extérieure**. Ne pas sélectionner l’appareil d’une chambre ou d’un salon. Activer les entités Humidex et Perception de l’humidex si elles sont désactivées.

Dans **Entités Thermal Comfort**, choisissez cet appareil et préremplissez les champs. Les listes sont filtrées par appareil et mesure ; la recherche compare aussi les entrées à celles de la station. En cas d’ambiguïté, choisissez manuellement.

**Apport à la carte :** l’humidex devient la base du ressenti, auquel la carte applique ses contributions de vent, soleil, pluie et ciel nocturne lorsque les données nécessaires existent. La perception qualifie l’humidex. Le point de rosée Thermal Comfort sert de repli si celui de la station est absent.

Sans humidex, le thermomètre sert de base et la carte annonce explicitement que **l’humidité n’est pas comptée**. L’indice de chaleur, l’humidité absolue et les perceptions supplémentaires restent sélectionnables, mais ne sont pas additionnés à l’humidex ni affichés comme de nouvelles pastilles : cela compterait plusieurs fois les mêmes effets.

## Soleil — position et repères jour/nuit

**Statut :** facultatif pour démarrer ; recommandé pour des corrections et repères adaptés au lieu.

**Prérequis :** [l’intégration Soleil](https://www.home-assistant.io/integrations/sun/), généralement présente dans la configuration Home Assistant par défaut, et un emplacement correct de la maison. Niak Weather utilise `sun.sun` automatiquement. Un autre Soleil ou un capteur d’élévation peut être choisi dans la section des options Soleil et air.

**Apport à la carte :** élévation solaire pour les contributions soleil/nuit au ressenti et heures de lever/coucher pour le fond nocturne du graphique. Le réchauffement solaire demande aussi le rayonnement mesuré par la station ; la correction nocturne utilise aussi la couverture nuageuse.

Sans ces données, le modèle intégré utilise des valeurs de repli (élévation 0°, lever 6 h 30 et coucher 21 h) : les repères ne représentent alors pas les horaires réels du lieu et les contributions soleil/nuit sont réduites. Renseigner le Soleil est préférable à se fier à ces valeurs.

## Atmo France — air extérieur et pollens

**Statut :** facultatif, indépendant de la station et du ressenti.

**Prérequis :** [l’intégration Atmo France de sebcaps](https://github.com/sebcaps/atmofrance), son compte Atmo Data et une commune/zone configurée. Activer dans l’intégration les indicateurs de pollution et de pollens, ainsi que les prévisions si souhaité. Les identifiants restent dans Home Assistant : aucun mot de passe n’est à ajouter à la carte.

Dans **Atmo France — air extérieur et pollens**, choisissez la zone et préremplissez les entités. Les champs sont séparés par mesure, unité/type et horizon aujourd’hui/demain. La source des pollens doit être **Atmo France** pour afficher ses pollens.

**Apport à la carte :** indice global d’air extérieur, cinq sous-indices de polluants (PM2.5, PM10, NO₂, O₃, SO₂), indice global pollen, niveaux et concentrations de six espèces : Graminées, Ambroisie, Armoise, Aulne, Bouleau et Olivier. Jusqu’à 38 entités sont configurables : 19 mesures pour aujourd’hui et 19 pour demain. Le mode complet permet de déplier demain ; le compact montre seulement les indices globaux du jour.

Ce sont des données de **zone**, pas des mesures du jardin. Les indices, concentrations et pourcentages intérieurs ne sont pas interchangeables. Une donnée absente n’est pas interprétée comme « aucun pollen ». Les prévisions de demain dépendent de leur disponibilité. [Installation, échelles et migration détaillées](atmo-france.md).

## Polleninformation EU — alternative pour les pollens

**Statut :** facultatif ; alternative à Atmo pour la ligne de pollens, pas un prérequis supplémentaire.

**Prérequis :** des entités Polleninformation EU déjà configurées dans Home Assistant. Choisir **Polleninformation** dans **Source des pollens**. La liste `pollens` se configure en YAML ; le préremplissage peut proposer les entités reconnues dans ce mode. Voir [l’exemple de configuration](data-model.md).

**Apport à la carte :** noms d’espèces et niveaux de pollens dans la ligne de pollens de la carte. Cette voie garde son échelle d’origine 0–4 et ne fournit pas le nouveau bloc de pollution extérieure Atmo. Quand Atmo est sélectionné, la liste Polleninformation n’est pas affichée en double, mais reste conservée dans la configuration. L’air extérieur Atmo peut rester affiché indépendamment de ce choix.

Pour une nouvelle installation souhaitant les données extérieures détaillées, le parcours Atmo est documenté dans le guide dédié. Il n’est pas nécessaire de désinstaller Polleninformation si d’autres cartes l’utilisent.

## Air intérieur — indice existant en pourcentage

**Statut :** facultatif et indépendant d’Atmo France.

**Prérequis :** un capteur de votre installation qui fournit déjà un **indice global d’air intérieur en %**. Sélectionnez-le dans le champ **Indice de qualité de l’air intérieur (%)** des options Soleil et air. Ne choisissez pas un capteur brut de CO₂ en ppm, ni un capteur PM2.5 en µg/m³, ni l’indice Atmo extérieur.

**Apport à la carte :** pastille « air intérieur » reprenant cet indice, sans nouveau calcul. Un clic ouvre l’entité ; une page dédiée peut être définie dans **Page qualité de l’air intérieur**. Niak Weather ne crée pas l’indice à partir des capteurs de CO₂, particules ou composés organiques : cette agrégation reste à réaliser en amont si vous la souhaitez. Sans indice compatible, laissez le champ vide.

## Recorder et capteurs de tendance — évolution des mesures

**Statut :** facultatif pour afficher les valeurs ; nécessaire aux tendances calculées par le modèle intégré.

**Prérequis :** les entités de pression et de vent doivent être enregistrées par l’historique Home Assistant (Recorder), et cet historique doit être accessible à l’utilisateur. Un capteur extérieur de dérivée en °C/h peut aussi être renseigné pour la tendance de température ; la carte ne le crée pas.

**Apport à la carte :** tendance de pression sur 3 h (au moins 20 min de données) et de vent sur 1 h (au moins 15 min). La carte affiche la fenêtre réellement disponible, pas une évolution déduite de quelques secondes d’ouverture du navigateur. Sans historique suffisant, elle indique que la tendance est en cours de mesure. Les tendances de température demandent leur propre entité.

## Sources personnalisées — usage avancé

**Statut :** facultatif ; aucune source personnalisée n’est nécessaire pour installer Niak Weather.

**Prérequis :** des capteurs respectant le contrat de données de la carte : `model_entity` pour un modèle pré-calculé et `forecast_entity` pour des prévisions structurées en `heures` et `jours`. Un capteur quelconque appelé « météo » ne suffit pas.

**Apport à la carte :** possibilité d’utiliser des calculs ou prévisions préparés en amont. Par défaut, Niak Weather utilise son modèle intégré et votre entité météo. Modifier une mesure dans l’éditeur désactive le modèle pré-calculé pour que ce choix soit utilisé. [Contrat et réglages](data-model.md).

## Ce qui n’est pas nécessaire

La carte autonome inclut son rendu : pas besoin de `button-card`, de chart-card, de card-mod, d’un package météo supplémentaire ou d’outils de développement. La distance de foudre et Confort/ouvrants sont exclus de cette version. Les estimations météo et indices environnementaux ne remplacent ni les alertes officielles ni un avis médical.
