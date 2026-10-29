import json

sizes = json.load(open('sotu-app/data/sizes.json'))
low_main = json.load(open('sotu-app/img/textures/quarter_items-0-main.json'))['frames']
low_cust = json.load(open('sotu-app/img/textures/quarter_items_custom.json'))['frames']
low_all = {**low_main, **low_cust}

high_all = {}
for i in range(6):
    high_all.update(json.load(open(f'sotu-app/img/textures/new_items_{i}.json'))['frames'])
high_cust = json.load(open('sotu-app/img/textures/new_items_custom.json'))['frames']
high_all.update(high_cust)

for idx in [327, 328]:
    s = sizes[idx]
    oid = s['objectID']
    padded = f'{idx+1:03d}'
    print(f'idx={idx}, oid={oid}: low={padded}_quarter in low_all? {padded+"_quarter" in low_all}, high={oid} in high_all? {f"{oid:03d}" in high_all}')
