"""Renders the homepage hero scene: dawn over hazy ridges, procedurally.

Usage: python3 scripts/make-hero-scene.py 2560 1440 out.png
Then export public/brand/hero-dawn-{2560,1600}.webp from it (WebP, q88).
Phones do not load the scene.
"""
import numpy as np, sys
from PIL import Image, ImageFilter
W,H = int(sys.argv[1]), int(sys.argv[2]); out=sys.argv[3]
rng = np.random.default_rng(7)
x = np.linspace(0,1,W); y = np.linspace(0,1,H)[:,None]

def fbm1d(n, octaves=7, seed=0, base=3.0):
    r = np.random.default_rng(seed); t = np.linspace(0,1,n); v = np.zeros(n); amp=1; f=base
    for o in range(octaves):
        k = int(f)+2; pts = r.standard_normal(k)
        v += amp*np.interp(t*(k-1), np.arange(k), pts)
        # smooth via cosine interp substitute
        amp*=0.5; f*=2.1
    return v

def lerp(a,b,t): return a+(b-a)*t
c = lambda h: np.array([int(h[i:i+2],16) for i in (1,3,5)],float)/255

# sky: deep night top -> warm dawn at horizon
hz = 0.58  # horizon line
t = np.clip(y/hz,0,1)
top, mid, low = c('#07080b'), c('#1a1d24'), c('#b98d5e')
T=t[...,None]
sky = np.where(T<0.6, lerp(top,mid,np.clip(T/0.6,0,1)**1.2), lerp(mid,low,np.clip((T-0.6)/0.4,0,1)**2.2)) * np.ones((1,W,1))
# sun glow, low and off-center right
sx, sy = 0.66, 0.565
d = np.sqrt(((x[None,:]-sx)*W/H)**2 + (y-sy)**2)
glow = np.exp(-(d/0.22)**2)[...,None]*c('#f3d3a1')*0.55 + np.exp(-(d/0.035)**2)[...,None]*c('#fff4e0')*0.8
sky = sky + glow
img = sky.copy()

# ridges: far -> near
layers = [
  (0.575, 0.060, '#8a7a66', 0.80, 11),
  (0.600, 0.055, '#5c544b', 0.55, 23),
  (0.615, 0.060, '#3a3733', 0.35, 31),
  (0.665, 0.075, '#23221f', 0.20, 47),
  (0.735, 0.090, '#141413', 0.08, 53),
  (0.830, 0.110, '#0a0a0a', 0.00, 61),
]
for i,(base,amp,col,haze,seed) in enumerate(layers):
    prof = fbm1d(W, seed=seed, base=2.0+i*0.6)
    prof = (prof-prof.min())/(prof.max()-prof.min())
    ridge = base - amp*prof
    mask = (y >= ridge[None,:]).astype(float)
    # soft edge
    mask = np.clip((y - ridge[None,:])*H/(1.5+max(0,2-i)*6), 0, 1)
    # vertical shading: lighter at top of ridge (rim light from sun)
    depth = np.clip((y-ridge[None,:])/0.25,0,1)
    rim = np.exp(-((y-ridge[None,:])*H/(3+i*2))) * np.exp(-((x[None,:]-sx)/0.35)**2) * (0.55 - i*0.08)
    rock = c(col)[None,None,:]*(1-0.35*depth[...,None]) + rim[...,None]*c('#f0c991')*0.6
    # aerial haze toward sky colour at horizon
    hazecol = lerp(c('#a98a68'), c('#d9b98c'), np.exp(-((x-sx)/0.3)**2)[:,None])[None,:,:]
    rock = lerp(rock, hazecol*np.ones((H,1,1)), haze*(1-depth[...,None])*0.9)
    img = img*(1-mask[...,None]) + rock*mask[...,None]
    # mist band above next layer
    if i < len(layers)-1:
        nb = layers[i+1][0]
        mist = np.exp(-((y-nb+0.01)/0.018)**2) * (0.22 - i*0.03)
        mist = mist * (0.7+0.3*np.sin(x[None,:]*9+i))
        img = lerp(img, c('#cdb48f')[None,None,:], np.clip(mist,0,1)[...,None]*1.0)

# darken lower-left for text legibility + vignette
vx = (x[None,:]-0.5); vy=(y-0.5)
vig = 1 - 0.55*np.clip((vx**2*1.2+vy**2*1.6)*1.6,0,1)
img *= vig[...,None]
ll = np.clip(1 - 0.5*np.exp(-(((x[None,:]-0.0)/0.6)**2 + ((y-1.0)/0.45)**2)),0,1)
img *= ll[...,None]
# top fade into page bg for nav
img = lerp(img, c('#07080a')[None,None,:], np.clip(1-y/0.18,0,1)[...,None]**1.5)
# subtle color grade: lift blacks slightly teal, warm highlights
img = np.clip(img,0,1)
img = img**0.95
# grain
g = rng.normal(0,0.012,(H,W,1))
img = np.clip(img+g,0,1)
im = Image.fromarray((img*255).astype(np.uint8))
im = im.filter(ImageFilter.GaussianBlur(0.6))
im.save(out, quality=82)
