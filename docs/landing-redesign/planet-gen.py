import numpy as np, sys
from PIL import Image
rng=np.random.default_rng(11)
def make(W,H,R,top,tex,out,q=80):
    cx=W/2; cy=top+R
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    dx=xx-cx; dy=yy-cy; d=np.sqrt(dx*dx+dy*dy)
    inside=d<R
    def noise(scale,octs):
        acc=np.zeros((H,W),np.float32); amp=1; tot=0
        for o in range(octs):
            n=int(max(2,scale*(2**o)))
            g=rng.random((int(H/W*n)+2,n+2)).astype(np.float32)
            im=Image.fromarray((g*255).astype(np.uint8)).resize((W,H),Image.BICUBIC)
            acc+=np.asarray(im,np.float32)/255*amp; tot+=amp; amp*=0.5
        return acc/tot
    surf=0.7*noise(6,5)+0.3*noise(220,2)
    surf=(surf-surf.min())/(surf.max()-surf.min())
    t=np.clip((R-d)/R,0,1)
    ang=np.arctan2(dy,dx); up=np.clip(-np.sin(ang),0,1)
    side=np.exp(-((np.abs(np.cos(ang))-0.9)**2)/0.01)
    k=W/2400
    broad=np.exp(-t*R/(150*k))
    lum=(0.03+0.22*broad*(0.5+0.5*up))*(0.6+tex*surf)
    lum=np.where(inside,lum,0)
    edge=np.exp(-((d-R)/(2.2*k))**2)*(0.35+0.4*up+0.25*side)
    halo=np.where(d>R,np.exp(-(d-R)/(26*k))*0.10*(0.5+0.5*up),0)
    img=lum+edge*0.5+halo
    rgb=np.stack([img*0.98,img*0.99,img*1.0],-1)   # neutral, faintly cool
    vfade=np.clip(1-(yy-H*0.45)/(H*0.55),0,1)[...,None]
    rgb=rgb*(0.15+0.85*vfade)
    bg=np.array([11,11,10],np.float32)/255
    o=np.clip(bg+rgb,0,1)
    Image.fromarray((o*255).astype(np.uint8)).save(out,'WEBP',quality=q,method=6)
make(2400,1300,1500,60,0.9,'/home/user/vantro-flow-frontend/public/brand/planet.webp')
make(900,700,620,40,0.5,'/home/user/vantro-flow-frontend/public/brand/planet-sm.webp',q=78)
Image.open('/home/user/vantro-flow-frontend/public/brand/planet.webp').resize((960,520)).save('/tmp/claude-0/planet/p2.jpg')
