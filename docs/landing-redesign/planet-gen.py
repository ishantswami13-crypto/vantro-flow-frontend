import numpy as np
from PIL import Image, ImageFilter
rng=np.random.default_rng(7)
W,H=2400,1500
s=W/1672
R=913*s; cx=W/2; cy=55*s+R
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
dx=xx-cx; dy=yy-cy; d=np.sqrt(dx*dx+dy*dy)
inside=d<R
# fractal noise
def noise(scale,oct=6):
    acc=np.zeros((H,W),np.float32); amp=1; tot=0
    for o in range(oct):
        n=int(max(2,scale*(2**o)))
        g=rng.random((int(H/W*n)+2,n+2)).astype(np.float32)
        im=Image.fromarray((g*255).astype(np.uint8)).resize((W,H),Image.BICUBIC)
        acc+=np.asarray(im,np.float32)/255*amp; tot+=amp; amp*=0.55
    return acc/tot
n=noise(10,8)
# craters
cr=np.zeros((H,W),np.float32)
for _ in range(900):
    x=rng.uniform(0,W); y=rng.uniform(0,H); r=rng.uniform(2,28)
    m=((xx-x)**2+(yy-y)**2)/(r*r)
    cr+= np.where(m<1, -0.5*(1-m), 0) + np.where((m>=1)&(m<1.5), 0.35*(1.5-m)*2*0.5,0)
n2=noise(160,4)
surf=0.55*n+0.3*n2+0.06*cr
surf=(surf-surf.min())/(surf.max()-surf.min())
# sphere lighting: light from behind/top -> rim lit, fades inward
t=np.clip((R-d)/R,0,1)            # 0 at rim, 1 at center
ang=np.arctan2(dy,dx)             # -pi/2 = top
up=np.clip(-np.sin(ang),0,1)      # 1 at top
side=np.exp(-((np.abs(np.cos(ang))-0.93)**2)/0.004)  # near horizontal sides
rim=np.exp(-t*R/(90*s))           # thin bright rim band
broad=np.exp(-t*R/(230*s))        # broad falloff of lit surface
light=0.05+0.55*broad*(0.45+0.55*up)+0.35*rim
lum=light*(0.15+1.15*surf**1.3)
lum=np.where(inside,lum,0)
# limb highlight line
edge=np.exp(-((d-R)/(5*s))**2)*(0.55+0.45*up+0.9*side)
# atmosphere halo outside
halo=np.where(d>R, np.exp(-(d-R)/(38*s))*0.35*(0.6+0.4*up+1.2*side),0)
# horizon flares at sides
flare=np.exp(-((d-R)/(14*s))**2)*side*1.2
img=np.clip(lum*0.22+edge*0.32+halo*0.8+flare,0,1.4)
# warm tint
rgb=np.stack([img*1.00,img*0.965,img*0.91],-1)
# darken overall lower region smoothly to page bg
vfade=np.clip(1-(yy-H*0.55)/(H*0.45),0,1)[...,None]
rgb=rgb*(0.25+0.75*vfade)
bg=np.array([10,10,9],np.float32)/255
out=np.clip(bg+rgb*0.95,0,1)
im=Image.fromarray((out*255).astype(np.uint8))
im.save('/tmp/claude-0/planet/planet.webp','WEBP',quality=82,method=6)
im.resize((800,500)).save('/tmp/claude-0/planet/preview.jpg')
print('ok')
