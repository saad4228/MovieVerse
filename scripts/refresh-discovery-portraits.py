"""Refresh portraits from the same District cast records used to import films.
Never map District cast IDs into TMDB's separate numeric ID namespace.
"""
import concurrent.futures, datetime, json, pathlib, re, urllib.request

root = pathlib.Path(__file__).resolve().parents[1]
path = root / 'data/discovery-movies.json'
films = json.loads(path.read_text(encoding='utf-8'))
def refresh(movie):
    source = movie.get('mediaSource', '')
    if not source.startswith('https://www.district.in/movies/'): return
    try:
        html = urllib.request.urlopen(source, timeout=25).read().decode()
        match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
        data = json.loads(match.group(1))
        portraits = {}
        def visit(value):
            if isinstance(value, dict):
                name, image = value.get('cast_name'), value.get('cast_image')
                if name and image and image.startswith('https://cdn.district.in/'):
                    portraits[name.casefold()] = image
                for child in value.values(): visit(child)
            elif isinstance(value, list):
                for child in value: visit(child)
        visit(data)
        count = 0
        for person in movie['metadata']['cast']:
            image = portraits.get(person['name'].casefold())
            if image:
                person['profilePath'] = image
                count += 1
        print(movie['id'], count, 'sourced portraits')
    except Exception as error:
        print(movie['id'], 'unchanged:', str(error))
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    list(pool.map(refresh, films))
path.write_text(json.dumps(films, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
