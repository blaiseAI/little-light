"""Build exact-palette, transparent web scenery from preserved ImageGen originals.
Run: .venv/Scripts/python.exe tools/prepare_scenery.py
Requires Pillow and NumPy. No remote calls; originals are never changed.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
PALETTE = ['#2b2250', '#221a48', '#322a6b', '#463d8a', '#3bb3a6', '#d4f3ee', '#f2c48a', '#e8a24a', '#fff8ec', '#ffc94a', '#ff7a45', '#b9a6ff']
RGB = np.array([tuple(bytes.fromhex(c[1:])) for c in PALETTE], dtype=np.int32)
NAMES = ['hills-far', 'hills-mid', 'ground-near', 'moon', 'clouds']
manifest = {'palette': PALETTE, 'assets': {}}
for name in NAMES:
    source = ROOT / 'assets' / 'raw' / (name + '.png')
    if not source.exists():
        raise FileNotFoundError(source)
    im = Image.open(source).convert('RGBA')
    a = np.array(im)
    # Discard only translucent generation fringes; preserve solid ink contours.
    a[:,:,3] = np.where(a[:,:,3] >= 240, 255, 0)
    # Off-palette olive foliage belongs to the brief's teal family.
    if name == 'hills-mid':
        rgb = a[:,:,:3].astype(float)
        green = (rgb[:,:,1] > rgb[:,:,2]*1.35) & (rgb[:,:,0] > rgb[:,:,2]*1.25) & (rgb[:,:,1] >= rgb[:,:,0]*.9) & (rgb[:,:,0] < 190)
        a[green,:3] = RGB[4]
    im = Image.fromarray(a)
    bounds = im.getchannel('A').getbbox()
    im = im.crop(bounds)
    variants = {}
    for variant, width in [('phone', 768), ('desktop', 1536)]:
        if name == 'moon': width = 160 if variant == 'phone' else 256
        if name == 'clouds': width = 512 if variant == 'phone' else 960
        width = min(width, im.width)
        resized = im.resize((width, round(im.height * width / im.width)), Image.Resampling.LANCZOS)
        data = np.array(resized)
        rgb = data[:,:,:3].astype(np.int32)
        # Indexed output guarantees exact RGB fills; a hard alpha keeps the sticker edge clean.
        distance = ((rgb[:,:,None,:] - RGB[None,None,:,:]) ** 2).sum(axis=3)
        indices = distance.argmin(axis=2).astype(np.uint8) + 1
        indices[data[:,:,3] < 128] = 0
        out = Image.fromarray(indices, mode='P')
        out.putpalette([0,0,0] + RGB.astype(np.uint8).flatten().tolist() + [0]* (768 - 3 - RGB.size))
        out.info['transparency'] = 0
        dest = ROOT / 'assets' / 'scene' / variant / (name + '.png')
        dest.parent.mkdir(parents=True, exist_ok=True)
        out.save(dest, optimize=True)
        assert dest.stat().st_size < 150_000, dest
        variants[variant] = {'width': out.width, 'height': out.height, 'bytes': dest.stat().st_size}
    manifest['assets'][name] = {'original': [a.shape[1], a.shape[0]], 'crop': bounds, 'variants': variants}
for variant in ['phone','desktop']:
    total = sum(v['variants'][variant]['bytes'] for v in manifest['assets'].values())
    print(variant, total, 'bytes')
    assert total < 500_000
(ROOT / 'assets' / 'scene' / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2))
