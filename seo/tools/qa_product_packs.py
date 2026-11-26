# QA for product SEO packs (pakclay-product-seo skill). Run: python3 seo/tools/qa_product_packs.py
# Refresh seo/catalogue-snapshot.txt when products are added (slug|..|category_slug|...).
import json,glob,re,sys,os
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
live=[l.split('|') for l in open(root+'/seo/catalogue-snapshot.txt').read().split('\n') if l and not l.startswith('#')]
slugs={r[0] for r in live}; cats={r[5] for r in live}
blogs={os.path.basename(f)[:-5] for f in glob.glob(root+'/khaprail-website/content/blog/queue/*.json')}
BAN=['game-changing','revolutionary','cutting-edge','delve','leverage',"fast-paced world"]
km=json.load(open(root+'/seo/keyword-map.json'))
other_primary={r['keyword'].lower():r for r in km['rows'] if r['target_type']!='product'}
bad=0; fk=set()
for f in sorted(glob.glob(root+'/khaprail-website/content/products/seo/*.json')):
    p=json.load(open(f)); e=[]
    if p['slug'] not in slugs: e.append('slug not live')
    if len(p['seo_title'])>45: e.append(f"title {len(p['seo_title'])}")
    if len(p['meta_description'])>155: e.append(f"meta {len(p['meta_description'])}")
    if len(p['image_alt'])>125: e.append('alt')
    w=len(re.sub(r'[#*\[\]()]',' ',p['description']).split())
    if not 220<=w<=350: e.append(f'words {w}')
    if not 3<=len(p['faqs'])<=5: e.append('faqs')
    txt=json.dumps(p).lower()
    for b in BAN:
        if b in txt: e.append('banned '+b)
    if re.search(r'(rs\.?|pkr)\s*\d',txt): e.append('price!')
    links=set(p['internal_links'])|set(re.findall(r'\]\((/[^)]+)\)',p['description']))
    for l in links:
        m=re.match(r'/(products|categories|blog)/(.+)',l)
        if m:
            k,s=m.groups()
            ok={'products':slugs,'categories':cats,'blog':blogs}[k]
            if s not in ok: e.append('bad link '+l)
        elif l not in ('/contact','/products','/categories'): e.append('bad link '+l)
    if p['focus_keyword'].lower() in fk: e.append('dup focus')
    fk.add(p['focus_keyword'].lower())
    if p['focus_keyword'].lower() in other_primary: e.append('cannibal: '+other_primary[p['focus_keyword'].lower()]['target_slug'])
    if p['focus_keyword'].lower() not in p['description'][:300].lower(): e.append('fk not in opening')
    print(('OK  ' if not e else 'ERR ')+p['slug'][:60], w, e)
    bad+=bool(e)
sys.exit(1 if bad else 0)
