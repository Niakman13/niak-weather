"""Read the canonical Jinja reference and print deterministic golden results. No HA credentials/files."""
import json, math, random, sys, re, ast
from datetime import datetime, timezone
from jinja2 import Environment

reference = json.load(open('reference/local-template.json'))
env = Environment()
env.filters['regex_replace'] = lambda value, pattern, replacement: re.sub(pattern, replacement, str(value))
env.filters['as_datetime'] = lambda value: datetime.fromisoformat(value.replace('Z', '+00:00'))
def render(template, context):
    if not isinstance(template, str): return template
    value = env.from_string(template).render(**context)
    if isinstance(value, str):
        value = value.strip()
        if ',' in value and not value.startswith(('[', '{', '(')): return value
        try: return ast.literal_eval(value)
        except (ValueError, SyntaxError): pass
    return value
fixed = datetime(2026, 10, 4, 10, tzinfo=timezone.utc)
random.seed(42)
cases = []
for index in range(96):
    values = {'t_ext': round(random.uniform(-8, 42), 1), 'hr_ext': random.randint(20, 100),
              'humidex': round(random.uniform(-5, 50), 1), 'vent': round(random.uniform(0, 65), 1),
              'rafales': round(random.uniform(0, 110), 1), 'solaire': random.choice([0, 40, 71, 351, 1000]),
              'elevation': random.choice([-10, 0, 5, 35]), 'pluie_taux': random.choice([0, .2, .3, .9, 1, 4, 12, 26]),
              'pluie_jour': round(random.uniform(0, 20), 1), 'pluie_24h': 1, 'pluie_semaine': 0,
              'pluie_mois': 20.8, 'pluie_an': 536.9, 'pluie_evenement': 0, 'rafale_max_jour': 33,
              'tend_temp': 2.2, 'uv': random.choice([0, 3, 6, 8, 11]), 'lux': 8973.4, 'pression': 1001.1,
              'rosee': 11.7, 'vent_dir': random.choice([0, 45, 225, 359]), 'perception': 'comfortable'}
    if index == 0: values.update(t_ext=20.8, hr_ext=56, humidex=22.9, vent=6.54, rafales=22.3, solaire=70.89, elevation=35, pluie_taux=0, pluie_jour=0, uv=0)
    if index == 1: values.update(t_ext=4, hr_ext=99, rosee=3.8, pluie_taux=0)
    if index == 2: values.update(t_ext=36, hr_ext=75, humidex=42, vent=30, rafales=50, solaire=0, pluie_taux=0)
    if index == 3: values['humidex'] = -999
    cond = random.choice(['cloudy', 'partlycloudy', 'rainy', 'snowy', 'clear-night'])
    hours = [{'h': (10 + i) % 24, 'j': (10 + i) // 24, 't': 20 + i / 10,
              'p': random.choice([0, 0, 0, .4, 1.6]), 'c': 'lightning' if index % 7 == 0 and i == 2 else 'cloudy'} for i in range(18)]
    cloud = random.choice([0, 20, 100])
    E = reference['variables']['E']
    entities = {E[k]: v for k, v in values.items() if k in E}
    entities[E['meteo']] = cond
    def states(entity): return str(entities.get(entity, 'unknown'))
    def attr(entity, key):
        if entity == E['prev'] and key == 'heures': return hours
        if entity == E['meteo'] and key == 'cloud_coverage': return cloud
        if entity == 'sun.sun' and key == 'elevation': return values['elevation']
        return None
    context = dict(states=states, state_attr=attr, has_value=lambda e: states(e) not in ['unknown', 'unavailable'],
                   now=lambda: fixed, as_local=lambda d: d, sin=math.sin, pi=math.pi)
    for key, template in reference['variables'].items():
        try: context[key] = render(template, context)
        except Exception as error: raise RuntimeError('variable ' + key) from error
    attrs = {}
    for key, template in reference['attributes'].items():
        attrs[key] = render(template, context)
    cases.append(dict(values=values, condition=cond, cloud=cloud, hours=hours, expected=attrs))
json.dump(cases, sys.stdout, ensure_ascii=False)
